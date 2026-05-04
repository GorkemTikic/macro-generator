import { describe, it, expect } from "vitest";
import {
  parseText,
  parseGrid,
  textToGrid,
  classifyType,
  decideScope,
  reconcileUsdMFuturesBalance,
  decimal,
  type ParsedRow
} from "./balanceLog";

const HEADER = ["id", "uid", "asset", "type", "amount", "time", "symbol"];

function row(cells: string[]) {
  return cells.join("\t");
}

const SAMPLE_TSV = [
  HEADER.join("\t"),
  row(["10001", "555", "USDT", "TRANSFER", "1000", "2026-01-01 00:00:00", ""]),
  row(["10002", "555", "USDT", "REALIZED_PNL", "-25.5", "2026-01-01 01:00:00", "BTCUSDT"]),
  row(["10003", "555", "USDT", "FUNDING_FEE", "0.123", "2026-01-01 02:00:00", "BTCUSDT"]),
  row(["10004", "555", "BNB", "COMMISSION", "-0.0005", "2026-01-01 03:00:00", "BTCUSDT"])
].join("\n");

describe("parseText – TSV with full header", () => {
  const r = parseText(SAMPLE_TSV);
  it("includes all USDⓈ-M rows", () => {
    expect(r.included).toHaveLength(4);
    expect(r.invalid).toHaveLength(0);
    expect(r.excluded).toHaveLength(0);
  });
  it("preserves raw type strings", () => {
    expect(r.included.map((x) => x.type)).toEqual([
      "TRANSFER",
      "REALIZED_PNL",
      "FUNDING_FEE",
      "COMMISSION"
    ]);
  });
  it("captures rawTypes counts", () => {
    expect(r.rawTypes.TRANSFER).toBe(1);
    expect(r.rawTypes.REALIZED_PNL).toBe(1);
  });
  it("parses timestamps", () => {
    expect(r.included[0].ts).toBe(Date.UTC(2026, 0, 1, 0, 0, 0));
  });
});

describe("Header reorder", () => {
  it("works regardless of column order", () => {
    const tsv = [
      ["amount", "type", "asset", "time", "id"].join("\t"),
      ["500", "TRANSFER", "USDT", "2026-01-01 00:00:00", "1"].join("\t")
    ].join("\n");
    const r = parseText(tsv);
    expect(r.included).toHaveLength(1);
    expect(r.included[0].type).toBe("TRANSFER");
    expect(r.included[0].amount).toBe(500);
  });
});

describe("Unknown / new type", () => {
  it("does not break parsing and surfaces the raw type", () => {
    const tsv = [
      HEADER.join("\t"),
      row(["1", "u", "USDT", "BRAND_NEW_TYPE_2026", "1.5", "2026-01-02 12:00:00", ""])
    ].join("\n");
    const r = parseText(tsv);
    expect(r.included).toHaveLength(1);
    expect(r.rawTypes.BRAND_NEW_TYPE_2026).toBe(1);
    expect(r.unknownTypes).toContain("BRAND_NEW_TYPE_2026");
    expect(r.included[0].category).toBe("OTHER");
  });
});

describe("Missing optional columns", () => {
  it("works without symbol/uid/id columns", () => {
    const tsv = [
      ["asset", "type", "amount", "time"].join("\t"),
      ["USDT", "FUNDING_FEE", "-0.01", "2026-01-01 00:00:00"].join("\t")
    ].join("\n");
    const r = parseText(tsv);
    expect(r.included).toHaveLength(1);
    expect(r.included[0].symbol).toBe("");
  });
});

describe("HTML table paste path → textToGrid (TSV form)", () => {
  // Simulating paste-to-grid output: GridPasteBox already produces a 2D grid.
  it("parseGrid handles a header-bearing grid", () => {
    const grid = [
      HEADER,
      ["1", "1", "USDT", "TRANSFER", "100", "2026-01-01 00:00:00", ""]
    ];
    const r = parseGrid(grid, "html");
    expect(r.included).toHaveLength(1);
    expect(r.headerUsed).toEqual(HEADER);
  });
});

describe("Date/time parsing", () => {
  it("handles split date and time cells via row join", () => {
    // No header → heuristic must recover the timestamp from adjacent cells.
    const tsv = ["10001\t555\tUSDT\tTRANSFER\t100\t2026-03-04\t12:34:56\tBTCUSDT"].join("\n");
    const r = parseText(tsv);
    expect(r.included).toHaveLength(1);
    expect(r.included[0].time).toBe("2026-03-04 12:34:56");
    expect(r.included[0].type).toBe("TRANSFER");
    expect(r.included[0].symbol).toBe("BTCUSDT");
  });
});

describe("USDⓈ-M scope decisions", () => {
  it("excludes Coin-M rows (BTC settlement)", () => {
    const r = parseText(
      [
        HEADER.join("\t"),
        row(["1", "1", "BTC", "REALIZED_PNL", "-0.001", "2026-01-01 00:00:00", "BTCUSD_PERP"])
      ].join("\n")
    );
    expect(r.excluded).toHaveLength(1);
    expect(r.included).toHaveLength(0);
    expect(r.excluded[0].excludeReason.toLowerCase()).toContain("coin-m");
  });
  it("includes BNB (used as fee asset on USDⓈ-M)", () => {
    expect(decideScope({ asset: "BNB", type: "COMMISSION", symbol: "BTCUSDT", raw: "" }).scope).toBe("USDM");
  });
  it("does not exclude stable-asset delivery rows just because the type says delivered", () => {
    expect(decideScope({ asset: "USDT", type: "DELIVERED_SETTELMENT", symbol: "BTCUSDT", raw: "" }).scope).toBe("USDM");
  });
});

describe("Reconciliation – full flow", () => {
  const tsv = [
    HEADER.join("\t"),
    row(["1", "1", "USDT", "REALIZED_PNL", "100", "2026-01-01 12:00:00", "BTCUSDT"]),
    row(["2", "1", "USDT", "COMMISSION", "-0.5", "2026-01-01 13:00:00", "BTCUSDT"])
  ].join("\n");
  const parsed = parseText(tsv);

  it("baseline + activity → expected", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0),
      baseline: { USDT: 1000 }
    });
    expect(r.perAsset.USDT.expected).toBe("1099.5");
  });

  it("transfer-at-start adds to expected", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0),
      baseline: { USDT: 1000 },
      transferAtStart: { asset: "USDT", amount: 500 }
    });
    expect(r.perAsset.USDT.expected).toBe("1599.5");
  });

  it("works with empty baseline (rolling-from-zero)", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0)
    });
    expect(r.perAsset.USDT.expected).toBe("99.5");
  });

  it("compares to current wallet and flags mismatch", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0),
      baseline: { USDT: 1000 },
      currentWallet: { USDT: 1099.5 }
    });
    expect(r.perAsset.USDT.status).toBe("match");

    const r2 = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0),
      baseline: { USDT: 1000 },
      currentWallet: { USDT: 1100 }
    });
    expect(r2.perAsset.USDT.status).toBe("mismatch");
  });
});

describe("Duplicate-transfer warning", () => {
  it("warns when transfer-at-start overlaps an existing TRANSFER row", () => {
    const tsv = [
      HEADER.join("\t"),
      row(["1", "1", "USDT", "TRANSFER", "500", "2026-01-01 00:00:00", ""])
    ].join("\n");
    const parsed = parseText(tsv);
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0),
      transferAtStart: { asset: "USDT", amount: 500 }
    });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0].message.toLowerCase()).toContain("transfer");
  });
});

describe("classifyType", () => {
  it("maps known types", () => {
    expect(classifyType("FUNDING_FEE")).toBe("FUNDING_FEE");
    expect(classifyType("COIN_SWAP_DEPOSIT")).toBe("COIN_SWAP");
    expect(classifyType("EVENT_CONTRACTS_PAYOUT")).toBe("EVENT_CONTRACTS");
  });
  it("unknown types fall back to OTHER", () => {
    expect(classifyType("MYSTERIOUS_NEW")).toBe("OTHER");
  });
});

describe("decimal.add", () => {
  it("avoids float drift", () => {
    let acc = "0";
    for (let i = 0; i < 10; i++) acc = decimal.add(acc, "0.1");
    expect(acc).toBe("1");
  });
  it("handles negatives and tiny numbers", () => {
    expect(decimal.add("0.0000001", "-0.0000001")).toBe("0");
    expect(decimal.add("100", "-25.5")).toBe("74.5");
  });
});

describe("Reconciliation difference precision", () => {
  it("keeps actual-minus-expected decimal-safe", () => {
    const parsed = parseText(
      [
        HEADER.join("\t"),
        row(["1", "1", "USDT", "FUNDING_FEE", "0.1", "2026-01-01 00:00:00", "BTCUSDT"]),
        row(["2", "1", "USDT", "FUNDING_FEE", "0.2", "2026-01-01 00:01:00", "BTCUSDT"])
      ].join("\n")
    );
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: Date.UTC(2026, 0, 1, 0, 0, 0),
      currentWallet: { USDT: "0.300000000000000001" },
      tolerance: 0
    });
    expect(r.perAsset.USDT.expected).toBe("0.3");
    expect(r.perAsset.USDT.difference).toBe("0.000000000000000001");
  });
});

describe("textToGrid", () => {
  it("detects TSV", () => {
    expect(textToGrid("a\tb\nc\td").format).toBe("tsv");
  });
  it("detects whitespace fallback", () => {
    expect(textToGrid("a   b   c").format).toBe("whitespace");
  });
});

describe("Invalid rows are not silently dropped", () => {
  it("returns invalid entries with reasons", () => {
    const tsv = [
      HEADER.join("\t"),
      row(["1", "u", "USDT", "TRANSFER", "not-a-number", "2026-01-01 00:00:00", ""])
    ].join("\n");
    const r = parseText(tsv);
    expect(r.included).toHaveLength(0);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].reason.toLowerCase()).toContain("amount");
  });
});

// Type-only sanity: ParsedRow has the documented shape.
const _typeCheck: ParsedRow | undefined = undefined;
void _typeCheck;

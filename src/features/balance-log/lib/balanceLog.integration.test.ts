// End-to-end style test: paste a realistic, messy Binance USDⓈ-M Futures
// Balance Log page, then walk through the same flow the UI uses.
//
// Covers the manual-verification checklist:
//   - expected = baseline + transfer-at-start + activity
//   - activity equals all included parsed rows in [start, end]
//   - current-wallet comparison produces correct difference/status
//   - duplicate-transfer warning fires when applicable
//   - Coin-M / out-of-scope rows are excluded with reasons
//   - unknown / new types appear and do not break parsing
import { describe, it, expect } from "vitest";
import { parseText, reconcileUsdMFuturesBalance, decimal } from "./balanceLog";

// A realistic, intentionally messy paste:
//   - Real Binance header (tab-separated)
//   - Mixed row types incl. one brand-new type Binance hasn't shipped
//   - One Coin-M row that must be quarantined
//   - One TRANSFER at the anchor time that should trigger the duplicate warning
//   - One row outside the [start, end] window that must NOT contribute
const PASTED_LOG = [
  ["Id", "UID", "Asset", "Type", "Amount", "Time", "Symbol"].join("\t"),

  // BEFORE start time — must be ignored by reconciliation.
  ["100", "42", "USDT", "REALIZED_PNL", "9999.99", "2026-04-30 23:00:00", "BTCUSDT"].join("\t"),

  // anchor moment: TRANSFER row that overlaps the user-entered transfer-at-start
  ["101", "42", "USDT", "TRANSFER", "1000", "2026-05-01 00:00:00", ""].join("\t"),

  // included activity
  ["102", "42", "USDT", "REALIZED_PNL", "250.5", "2026-05-01 02:15:00", "BTCUSDT"].join("\t"),
  ["103", "42", "USDT", "COMMISSION", "-0.875", "2026-05-01 02:15:00", "BTCUSDT"].join("\t"),
  ["104", "42", "USDT", "FUNDING_FEE", "-1.234", "2026-05-01 04:00:00", "BTCUSDT"].join("\t"),
  ["105", "42", "USDT", "FUNDING_FEE", "0.456", "2026-05-01 12:00:00", "ETHUSDT"].join("\t"),
  ["106", "42", "BNB", "COMMISSION", "-0.0012", "2026-05-01 12:00:01", "ETHUSDT"].join("\t"),
  ["107", "42", "USDT", "REFERRAL_KICKBACK", "0.05", "2026-05-01 13:00:00", ""].join("\t"),

  // brand new types Binance just rolled out — must NOT break parsing.
  // First one contains "REWARD" so the broad classifier maps it to BONUS;
  // second one has no classifier hint and must show up in unknownTypes.
  ["108", "42", "USDT", "NEW_2026_REWARD", "2.5", "2026-05-01 14:00:00", ""].join("\t"),
  ["108b", "42", "USDT", "FOOBAR_QUUX_2026", "0.0", "2026-05-01 14:00:00", ""].join("\t"),

  // Coin-M row — must be excluded.
  ["109", "42", "BTC", "REALIZED_PNL", "-0.0005", "2026-05-01 15:00:00", "BTCUSD_PERP"].join("\t"),

  // AFTER end time — must be ignored.
  ["110", "42", "USDT", "REALIZED_PNL", "100", "2026-05-02 06:00:00", "BTCUSDT"].join("\t")
].join("\n");

const START = Date.UTC(2026, 4, 1, 0, 0, 0);
const END = Date.UTC(2026, 4, 2, 0, 0, 0);

describe("End-to-end paste → parse → reconcile", () => {
  const parsed = parseText(PASTED_LOG);

  it("parses the header", () => {
    expect(parsed.headerUsed).not.toBeNull();
    expect(parsed.inputFormat).toBe("tsv");
  });

  it("includes all USDⓈ-M rows and excludes the Coin-M row", () => {
    const includedTypes = parsed.included.map((r) => r.type).sort();
    expect(includedTypes).toContain("TRANSFER");
    expect(includedTypes).toContain("REALIZED_PNL");
    expect(includedTypes).toContain("COMMISSION");
    expect(includedTypes).toContain("FUNDING_FEE");
    expect(includedTypes).toContain("NEW_2026_REWARD");
    expect(parsed.excluded).toHaveLength(1);
    expect(parsed.excluded[0].asset).toBe("BTC");
    expect(parsed.excluded[0].excludeReason.toLowerCase()).toContain("coin-m");
  });

  it("preserves new raw types in diagnostics", () => {
    // Both new types appear in rawTypes counts (the dynamic Type filter and
    // Diagnostics tab read from this map).
    expect(parsed.rawTypes.NEW_2026_REWARD).toBe(1);
    expect(parsed.rawTypes.FOOBAR_QUUX_2026).toBe(1);
    // The truly uncategorisable one is also flagged as unknown.
    expect(parsed.unknownTypes).toContain("FOOBAR_QUUX_2026");
  });

  it("never silently drops anything", () => {
    // 12 data rows in the paste; 1 Coin-M excluded; the rest included.
    expect(parsed.invalid).toHaveLength(0);
    expect(parsed.included.length + parsed.excluded.length).toBe(12);
  });

  // expected = baseline + transferAtStart + activity (within [start, end])
  it("reconciles wallet correctly with baseline + transfer-at-start", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: START,
      endTs: END,
      baseline: { USDT: "500" },
      transferAtStart: { asset: "USDT", amount: "1000" },
      currentWallet: { USDT: "1751.397", BNB: "-0.0012" }
    });

    // USDT activity (in window):
    //   1000 (the TRANSFER at anchor — note: this *is* counted as activity,
    //         and the duplicate-detector should warn)
    // + 250.5 - 0.875 - 1.234 + 0.456 + 0.05 + 2.5
    // = 1251.397
    // expected = 500 + 1000 + 1251.397 = 2751.397
    expect(r.perAsset.USDT.activity).toBe("1251.397");
    expect(r.perAsset.USDT.expected).toBe("2751.397");
    expect(r.perAsset.USDT.actual).toBe("1751.397");
    expect(r.perAsset.USDT.status).toBe("mismatch");
    // diff = actual - expected = 1751.397 - 2751.397 = -1000
    expect(r.perAsset.USDT.difference).toBe("-1000");

    // BNB only has a -0.0012 commission row.
    expect(r.perAsset.BNB.activity).toBe("-0.0012");
    expect(r.perAsset.BNB.expected).toBe("-0.0012");
    expect(r.perAsset.BNB.actual).toBe("-0.0012");
    expect(r.perAsset.BNB.status).toBe("match");
  });

  it("flags the duplicate transfer-at-start", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: START,
      endTs: END,
      transferAtStart: { asset: "USDT", amount: 1000 }
    });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.map((w) => w.message).join(" ").toLowerCase()).toContain("transfer");
  });

  it("respects the [start, end] window", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: START,
      endTs: END
    });
    // The pre-anchor REALIZED_PNL of 9999.99 and post-end 100 must NOT count.
    expect(Number(r.perAsset.USDT.activity)).toBeCloseTo(1251.397, 6);
    // and the pre-anchor 9999.99 should not appear anywhere in considered.
    expect(r.consideredRowCount).toBe(parsed.included.filter((p) => p.ts >= START && p.ts <= END).length);
  });

  it("rolls from zero when no baseline is given", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: START,
      endTs: END
    });
    expect(r.perAsset.USDT.expected).toBe("1251.397");
  });

  it("activity equals the per-asset sum of every included row in window", () => {
    const r = reconcileUsdMFuturesBalance({
      rows: parsed.included,
      startTs: START,
      endTs: END
    });
    // recompute independently
    const independent: Record<string, string> = {};
    for (const row of parsed.included) {
      if (row.ts < START || row.ts > END) continue;
      independent[row.asset] = decimal.add(independent[row.asset] || "0", row.amountStr);
    }
    for (const asset of Object.keys(independent)) {
      expect(r.perAsset[asset].activity).toBe(independent[asset]);
    }
  });
});

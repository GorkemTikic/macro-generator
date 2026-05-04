// Regression: row 932 from a real diagnostic.
// BFUSD_REWARD contains the substring "USD_" which a symbol-detection
// regex used to mistake for a delivery contract suffix, causing the type
// column to be skipped and the row reported as invalid.
import { describe, it, expect } from "vitest";
import { parseText } from "./balanceLog";

describe("Headerless rows with type tokens that contain USD-like substrings", () => {
  it("BFUSD_REWARD with USDC asset parses cleanly", () => {
    const tsv =
      "1002804349180636160\t1059874281\tUSDC\tBFUSD_REWARD\t0.01370506\t2025-07-30 5:06:28";
    const r = parseText(tsv);
    expect(r.invalid).toHaveLength(0);
    expect(r.included).toHaveLength(1);
    const row = r.included[0];
    expect(row.asset).toBe("USDC");
    expect(row.type).toBe("BFUSD_REWARD");
    expect(row.amountStr).toBe("0.01370506");
    expect(row.ts).toBe(Date.UTC(2025, 6, 30, 5, 6, 28));
  });

  it("FDUSD_REWARD-shaped types also parse", () => {
    const tsv = "100\t200\tUSDT\tFDUSD_REWARD\t1.5\t2025-08-01 10:00:00";
    const r = parseText(tsv);
    expect(r.included).toHaveLength(1);
    expect(r.included[0].type).toBe("FDUSD_REWARD");
  });

  it("genuine perpetual symbols still get treated as symbols, not types", () => {
    // header-less row with BTCUSDT (USDT-perpetual)
    const tsv =
      "100\t200\tUSDT\tREALIZED_PNL\t-1.5\t2025-08-01 10:00:00\tBTCUSDT";
    const r = parseText(tsv);
    expect(r.included).toHaveLength(1);
    expect(r.included[0].type).toBe("REALIZED_PNL");
    expect(r.included[0].symbol).toBe("BTCUSDT");
  });

  it("Coin-M delivery symbol BTCUSD_240329 is excluded, not misparsed as a type", () => {
    // BTCUSD_240329 is a Coin-M delivery contract — the row must end up in
    // excluded with a Coin-M reason, NOT in invalid for "could not locate type".
    const tsv =
      "100\t200\tBTC\tREALIZED_PNL\t-0.001\t2025-08-01 10:00:00\tBTCUSD_240329";
    const r = parseText(tsv);
    expect(r.invalid).toHaveLength(0);
    expect(r.excluded).toHaveLength(1);
    expect(r.excluded[0].excludeReason.toLowerCase()).toContain("coin-m");
  });
});

import { describe, expect, it } from "vitest";
import { buildExchangeEvents } from "./exchangeEvents";
import type { Row } from "./story";

const makeRow = (overrides: Partial<Row>): Row => ({
  id: "1",
  uid: "u",
  asset: "USDT",
  type: "AUTO_EXCHANGE",
  amount: 0,
  amountStr: "0",
  time: "2026-01-01 00:00:00",
  ts: Date.UTC(2026, 0, 1, 0, 0, 0),
  symbol: "",
  extra: "",
  raw: "",
  ...overrides
});

describe("buildExchangeEvents", () => {
  it("groups auto-exchange rows into an agent-readable exchange", () => {
    const events = buildExchangeEvents(
      [
        makeRow({ asset: "USDT", amount: -100, amountStr: "-100" }),
        makeRow({ asset: "USDC", amount: 99.9, amountStr: "99.9" })
      ],
      "autoExchange"
    );

    expect(events).toHaveLength(1);
    expect(events[0].outLegs).toEqual([{ asset: "USDT", amount: -100 }]);
    expect(events[0].inLegs).toEqual([{ asset: "USDC", amount: 99.9 }]);
    expect(events[0].rateText).toBe("Rate: 1 USDT = 0.999 USDC");
    expect(events[0].pegDiff).toBeCloseTo(-0.1);
    expect(events[0].summary).toBe("On 2026-01-01 00:00:00, 100 USDT was auto-exchanged to 99.9 USDC.");
    expect(events[0].summary).not.toContain("Binance");
    expect(events[0].summary).not.toContain("peg");
  });

  it("calculates a stablecoin peg gain", () => {
    const events = buildExchangeEvents(
      [
        makeRow({ asset: "USDC", amount: -100, amountStr: "-100" }),
        makeRow({ asset: "USDT", amount: 100.02, amountStr: "100.02" })
      ],
      "autoExchange"
    );

    expect(events[0].pegDiff).toBeCloseTo(0.02);
    expect(events[0].summary).toContain("was auto-exchanged to 100.02 USDT");
  });

  it("pairs legs by timestamp even when extra columns differ", () => {
    const events = buildExchangeEvents(
      [
        makeRow({ asset: "USDT", amount: -25, amountStr: "-25", extra: "withdraw leg" }),
        makeRow({ asset: "USDC", amount: 24.99, amountStr: "24.99", extra: "deposit leg" })
      ],
      "autoExchange"
    );

    expect(events).toHaveLength(1);
    expect(events[0].summary).toContain("25 USDT was auto-exchanged to 24.99 USDC");
  });

  it("does not claim USD PnL when one side is not USD-pegged", () => {
    const events = buildExchangeEvents(
      [
        makeRow({ type: "COIN_SWAP_WITHDRAW", asset: "BNB", amount: -1, amountStr: "-1" }),
        makeRow({ type: "COIN_SWAP_DEPOSIT", asset: "USDT", amount: 600, amountStr: "600" })
      ],
      "coinSwap"
    );

    expect(events).toHaveLength(1);
    expect(events[0].pegDiff).toBeUndefined();
    expect(events[0].summary).toBe("On 2026-01-01 00:00:00, 1 BNB was swapped to 600 USDT.");
  });
});

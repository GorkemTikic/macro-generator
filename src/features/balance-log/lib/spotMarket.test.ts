import { describe, expect, it } from "vitest";
import { buildExchangeEvents } from "./exchangeEvents";
import { spotMarketPlansForEvent } from "./spotMarket";
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

describe("spotMarketPlansForEvent", () => {
  it("uses the received stablecoin as quote when checking a coin-to-stable swap", () => {
    const [event] = buildExchangeEvents(
      [
        makeRow({ type: "COIN_SWAP_WITHDRAW", asset: "BNB", amount: -1, amountStr: "-1" }),
        makeRow({ type: "COIN_SWAP_DEPOSIT", asset: "USDC", amount: 700, amountStr: "700" })
      ],
      "coinSwap"
    );

    expect(spotMarketPlansForEvent(event).map((plan) => plan.symbol)).toEqual(["BNBUSDC", "BNBUSDT"]);
  });

  it("checks the received asset quoted by the given stablecoin for stable swaps", () => {
    const [event] = buildExchangeEvents(
      [
        makeRow({ asset: "USDT", amount: -100, amountStr: "-100" }),
        makeRow({ asset: "USDC", amount: 99.9, amountStr: "99.9" })
      ],
      "autoExchange"
    );

    expect(spotMarketPlansForEvent(event).map((plan) => plan.symbol)).toEqual(["USDCUSDT", "USDTUSDC"]);
  });
});

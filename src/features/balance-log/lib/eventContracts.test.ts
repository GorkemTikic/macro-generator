import { describe, expect, it } from "vitest";
import { buildEventContractLedger } from "./eventContracts";

describe("buildEventContractLedger", () => {
  it("renders orders as negative outflows", () => {
    const rows = buildEventContractLedger({ USDT: { pos: 0, neg: 25, net: -25 } }, "orders");
    expect(rows).toEqual([{ asset: "USDT", amount: -25, normalized: false }]);
  });

  it("renders payouts as positive inflows", () => {
    const rows = buildEventContractLedger({ USDT: { pos: 12.5, neg: 0, net: 12.5 } }, "payouts");
    expect(rows).toEqual([{ asset: "USDT", amount: 12.5, normalized: false }]);
  });

  it("normalizes unexpected source signs without showing positive orders or negative payouts", () => {
    expect(buildEventContractLedger({ USDT: { pos: 3, neg: 0, net: 3 } }, "orders")).toEqual([
      { asset: "USDT", amount: -3, normalized: true }
    ]);
    expect(buildEventContractLedger({ USDT: { pos: 0, neg: 2, net: -2 } }, "payouts")).toEqual([
      { asset: "USDT", amount: 2, normalized: true }
    ]);
  });
});

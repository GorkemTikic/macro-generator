export type EventContractTotals = { pos: number; neg: number; net: number };
export type EventContractTotalsMap = Record<string, EventContractTotals>;
export type EventContractKind = "orders" | "payouts";

export type EventContractLedgerRow = {
  asset: string;
  amount: number;
  normalized: boolean;
};

export function buildEventContractLedger(map: EventContractTotalsMap, kind: EventContractKind): EventContractLedgerRow[] {
  return Object.entries(map)
    .map(([asset, totals]) => {
      const magnitude = Math.abs(totals.pos || 0) + Math.abs(totals.neg || 0);
      const normalized = kind === "orders" ? totals.pos > 0 : totals.neg > 0;
      return {
        asset,
        amount: kind === "orders" ? -magnitude : magnitude,
        normalized
      };
    })
    .filter((row) => row.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.asset.localeCompare(b.asset));
}

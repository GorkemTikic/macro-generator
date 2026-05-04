import type { Row } from "./story";
import { fmtTrim } from "./format";

export type ExchangeKind = "coinSwap" | "autoExchange";

export type ExchangeLeg = {
  asset: string;
  amount: number;
};

export type ExchangeEvent = {
  id: string;
  kind: ExchangeKind;
  time: string;
  ts: number;
  outLegs: ExchangeLeg[];
  inLegs: ExchangeLeg[];
  rateText: string;
  pegDiff?: number;
  pegDiffPct?: number;
  pegNote: string;
  summary: string;
};

export const USD_PEGGED_ASSETS = new Set(["USDT", "USDC", "BUSD", "FDUSD", "BFUSD", "TUSD", "USDP", "DAI", "USDE", "USD1"]);

export function isUsdPegged(asset: string) {
  return USD_PEGGED_ASSETS.has(asset.toUpperCase());
}

export function legText(leg: ExchangeLeg, sign: "in" | "out" = "in") {
  const prefix = sign === "out" ? "-" : "+";
  return `${prefix}${fmtTrim(Math.abs(leg.amount))} ${leg.asset}`;
}

export function legHumanText(leg: ExchangeLeg) {
  return `${fmtTrim(Math.abs(leg.amount))} ${leg.asset}`;
}

function legsText(legs: ExchangeLeg[], sign: "in" | "out") {
  return legs.length ? legs.map((leg) => legText(leg, sign)).join(", ") : "-";
}

function legsHumanText(legs: ExchangeLeg[]) {
  return legs.length ? legs.map(legHumanText).join(", ") : "an unknown amount";
}

function sumAbs(legs: ExchangeLeg[]) {
  return legs.reduce((acc, leg) => acc + Math.abs(leg.amount), 0);
}

function cleanNumber(value: number, decimals = 12) {
  return Number(value.toFixed(decimals));
}

function fmtClean(value: number, decimals = 12) {
  return fmtTrim(cleanNumber(value, decimals));
}

function stableValue(legs: ExchangeLeg[]) {
  return legs.filter((leg) => isUsdPegged(leg.asset)).reduce((acc, leg) => acc + Math.abs(leg.amount), 0);
}

function buildRateText(outLegs: ExchangeLeg[], inLegs: ExchangeLeg[]) {
  if (outLegs.length === 1 && inLegs.length === 1) {
    const out = outLegs[0];
    const inn = inLegs[0];
    const outAbs = Math.abs(out.amount);
    const inAbs = Math.abs(inn.amount);
    if (outAbs > 0 && inAbs > 0) {
      return `Rate: 1 ${out.asset} = ${fmtClean(inAbs / outAbs)} ${inn.asset}`;
    }
  }
  const outTotal = sumAbs(outLegs);
  const inTotal = sumAbs(inLegs);
  if (outTotal > 0 && inTotal > 0) return `Total in/out ratio: ${fmtClean(inTotal / outTotal)}`;
  return "Rate: not available from this grouped event";
}

function buildPegMath(outLegs: ExchangeLeg[], inLegs: ExchangeLeg[]) {
  const allLegs = [...outLegs, ...inLegs];
  const allUsdPegged = allLegs.length > 0 && allLegs.every((leg) => isUsdPegged(leg.asset));
  if (!allUsdPegged) {
    return {
      pegNote:
        "USD peg difference is not calculated because at least one side is not a USD-pegged asset in the balance log."
    };
  }

  const outUsd = stableValue(outLegs);
  const inUsd = stableValue(inLegs);
  const pegDiff = cleanNumber(inUsd - outUsd);
  const pegDiffPct = outUsd ? cleanNumber((pegDiff / outUsd) * 100) : undefined;
  const direction = pegDiff < 0 ? "loss" : pegDiff > 0 ? "gain" : "no difference";
  return {
    pegDiff,
    pegDiffPct,
    pegNote:
      direction === "no difference"
        ? "USD peg difference: 0. The stablecoin amounts are equal at a 1 USD peg."
        : `USD peg ${direction}: ${pegDiff >= 0 ? "+" : ""}${fmtTrim(pegDiff)} USD${
            pegDiffPct === undefined ? "" : ` (${pegDiffPct >= 0 ? "+" : ""}${fmtTrim(pegDiffPct)}%)`
          }. This compares USD-pegged assets as 1 asset = 1 USD; Binance conversion ratios can still produce a small difference.`
  };
}

function buildSummary(kind: ExchangeKind, time: string, outLegs: ExchangeLeg[], inLegs: ExchangeLeg[]) {
  const label = kind === "autoExchange" ? "auto-exchanged" : "swapped";
  const verb = outLegs.length === 1 ? "was" : "were";
  return `On ${time}, ${legsHumanText(outLegs)} ${verb} ${label} to ${legsHumanText(inLegs)}.`;
}

function mergeLegs(rows: Row[], positive: boolean): ExchangeLeg[] {
  const byAsset = new Map<string, number>();
  for (const row of rows) {
    if (positive ? row.amount <= 0 : row.amount >= 0) continue;
    const asset = row.asset.toUpperCase();
    byAsset.set(asset, (byAsset.get(asset) || 0) + row.amount);
  }
  return Array.from(byAsset.entries())
    .map(([asset, amount]) => ({ asset, amount }))
    .filter((leg) => Math.abs(leg.amount) > 1e-12)
    .sort((a, b) => a.asset.localeCompare(b.asset));
}

export function buildExchangeEvents(rows: Row[], kind: ExchangeKind): ExchangeEvent[] {
  const matcher =
    kind === "coinSwap" ? (type: string) => type.includes("COIN_SWAP") : (type: string) => type === "AUTO_EXCHANGE";
  const relevant = rows.filter((row) => matcher(row.type));
  const groups = new Map<string, Row[]>();

  for (const row of relevant) {
    // Binance records the debit and credit legs of a conversion at the same
    // timestamp. Group by time so paired rows become one explainable event.
    const key = row.time;
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push(row);
  }

  const events: ExchangeEvent[] = [];
  for (const [id, group] of groups.entries()) {
    const outLegs = mergeLegs(group, false);
    const inLegs = mergeLegs(group, true);
    if (!outLegs.length && !inLegs.length) continue;

    const time = group[0].time;
    const ts = group[0].ts;
    const rateText = buildRateText(outLegs, inLegs);
    const peg = buildPegMath(outLegs, inLegs);
    events.push({
      id,
      kind,
      time,
      ts,
      outLegs,
      inLegs,
      rateText,
      pegDiff: peg.pegDiff,
      pegDiffPct: peg.pegDiffPct,
      pegNote: peg.pegNote,
      summary: buildSummary(kind, time, outLegs, inLegs)
    });
  }

  return events.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

export function exchangeEventToTsvRow(event: ExchangeEvent): [string, string, string, string] {
  return [
    event.time,
    legsText(event.outLegs, "out"),
    legsText(event.inLegs, "in"),
    event.summary
  ];
}

export function exchangeEventText(event: ExchangeEvent) {
  return event.summary;
}

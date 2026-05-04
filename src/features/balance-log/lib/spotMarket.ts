import { fmtTrim } from "./format";
import { isUsdPegged, type ExchangeEvent, type ExchangeLeg } from "./exchangeEvents";

export type SpotMarketPlan = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  note?: string;
};

export type SpotMarketCheck = SpotMarketPlan & {
  highPrice: number;
  highPriceText: string;
  givenValue: number;
  receivedValue: number;
  difference: number;
  explanation: string;
  sourceUrl: string;
};

const BINANCE_MARKET_DATA_BASE = "https://data-api.binance.vision";
const BINANCE_REST_FALLBACK_BASE = "https://api.binance.com";

function absAmount(leg: ExchangeLeg) {
  return Math.abs(leg.amount);
}

function firstSingleLeg(event: ExchangeEvent) {
  if (event.outLegs.length !== 1 || event.inLegs.length !== 1) return undefined;
  return { given: event.outLegs[0], received: event.inLegs[0] };
}

function pairPlan(baseAsset: string, quoteAsset: string, note?: string): SpotMarketPlan {
  return {
    symbol: `${baseAsset}${quoteAsset}`.toUpperCase(),
    baseAsset: baseAsset.toUpperCase(),
    quoteAsset: quoteAsset.toUpperCase(),
    note
  };
}

export function spotMarketPlansForEvent(event: ExchangeEvent): SpotMarketPlan[] {
  const legs = firstSingleLeg(event);
  if (!legs) return [];

  const given = legs.given.asset.toUpperCase();
  const received = legs.received.asset.toUpperCase();
  const givenStable = isUsdPegged(given);
  const receivedStable = isUsdPegged(received);

  if (givenStable && receivedStable) {
    return [pairPlan(received, given), pairPlan(given, received, "Reverse stablecoin market; values are inverted.")];
  }

  if (!givenStable && receivedStable) {
    const plans = [pairPlan(given, received)];
    if (received !== "USDT") plans.push(pairPlan(given, "USDT", `Using ${given}USDT because ${given}${received} may not trade on spot.`));
    return plans;
  }

  if (givenStable && !receivedStable) {
    const plans = [pairPlan(received, given)];
    if (given !== "USDT") plans.push(pairPlan(received, "USDT", `Using ${received}USDT because ${received}${given} may not trade on spot.`));
    return plans;
  }

  return [pairPlan(received, "USDT"), pairPlan(given, "USDT")];
}

function valueInQuote(leg: ExchangeLeg, plan: SpotMarketPlan, highPrice: number) {
  const asset = leg.asset.toUpperCase();
  if (asset === plan.quoteAsset) return absAmount(leg);
  if (asset === plan.baseAsset) return absAmount(leg) * highPrice;
  return undefined;
}

function buildExplanation(event: ExchangeEvent, plan: SpotMarketPlan, highPrice: number, sourceUrl: string): SpotMarketCheck | undefined {
  const legs = firstSingleLeg(event);
  if (!legs) return undefined;

  const givenValue = valueInQuote(legs.given, plan, highPrice);
  const receivedValue = valueInQuote(legs.received, plan, highPrice);
  if (givenValue === undefined || receivedValue === undefined) return undefined;

  const difference = Number((receivedValue - givenValue).toFixed(12));
  const highPriceText = `${fmtTrim(highPrice)} ${plan.quoteAsset} per ${plan.baseAsset}`;
  const direction = difference < 0 ? "lower" : difference > 0 ? "higher" : "equal";
  const explanation = `Agent market check: Binance Spot ${plan.symbol} 1-second candle high at ${event.time} was ${highPriceText}. At that high price, the received amount was worth ${fmtTrim(receivedValue)} ${plan.quoteAsset}, while the given amount was worth ${fmtTrim(givenValue)} ${plan.quoteAsset}; received value was ${direction} by ${difference >= 0 ? "+" : ""}${fmtTrim(difference)} ${plan.quoteAsset}.${plan.note ? ` ${plan.note}` : ""}`;

  return {
    ...plan,
    highPrice,
    highPriceText,
    givenValue,
    receivedValue,
    difference,
    explanation,
    sourceUrl
  };
}

async function fetchOneSecondHighFromBase(baseUrl: string, symbol: string, ts: number) {
  const startTime = Math.floor(ts / 1000) * 1000;
  const url = `${baseUrl}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1s&startTime=${startTime}&endTime=${startTime + 999}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error(`${symbol}: no 1-second candle found`);
  const high = Number(data[0][2]);
  if (!Number.isFinite(high)) throw new Error(`${symbol}: invalid high price`);
  return { high, url };
}

async function fetchOneSecondHigh(symbol: string, ts: number) {
  try {
    return await fetchOneSecondHighFromBase(BINANCE_MARKET_DATA_BASE, symbol, ts);
  } catch {
    return fetchOneSecondHighFromBase(BINANCE_REST_FALLBACK_BASE, symbol, ts);
  }
}

export async function loadSpotMarketCheck(event: ExchangeEvent): Promise<SpotMarketCheck> {
  const plans = spotMarketPlansForEvent(event);
  if (!plans.length) throw new Error("Spot market check supports one given asset and one received asset at a time.");

  const errors: string[] = [];
  for (const plan of plans) {
    try {
      const { high, url } = await fetchOneSecondHigh(plan.symbol, event.ts);
      const check = buildExplanation(event, plan, high, url);
      if (check) return check;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`No usable Binance Spot 1-second market found. Tried: ${plans.map((p) => p.symbol).join(", ")}. ${errors.join(" | ")}`);
}

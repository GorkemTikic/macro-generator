// src/pricing.js

// CORS proxy for Binance API calls.
//
// Production: VITE_BINANCE_PROXY is unset, so we default to the deployed Worker,
// which has its own ALLOWED_ORIGIN allowlist + server-side multi-base fallback.
//
// Local dev: the Worker rejects http://localhost:5173 with
// `Access-Control-Allow-Origin: null`, so requests CORS-fail in the browser.
// We default to empty string in dev mode, which makes URL construction below
// produce relative paths (e.g. `/fapi/v1/klines?...`) that Vite's dev server
// proxies straight to Binance — no CORS problem because the browser sees a
// same-origin response. See vite.config.ts for the proxy table.
//
// Explicit empty string from .env.local also forces the relative-path mode
// (in either dev or prod), in case someone wants to host their own proxy.
// `import.meta.env` is injected by Vite at bundle time. The `test:trailing`
// CLI script imports this module under plain Node via tsx, where import.meta
// has no `env`, so we read through a single any-cast at this boundary. Inside
// the bundle the values are still typed via `src/vite-env.d.ts`.
const _ENV = ((import.meta as unknown as { env?: ImportMetaEnv }).env) ?? ({} as ImportMetaEnv);
const _RAW_PROXY = _ENV.VITE_BINANCE_PROXY;
const _DEFAULT_PROXY = _ENV.DEV ? "" : "https://macro-analytics.grkmtkc94.workers.dev";
export const PROXY = (_RAW_PROXY ?? _DEFAULT_PROXY).trim().replace(/\/$/, "");
// PROXY is always set (deployed worker URL in prod, "" for the dev relative-path
// mode, or whatever the user configured via env). The "iterate F_BASES/S_BASES
// directly" fallback below is dead — Binance rejects browser requests with
// CORS, so any attempt to bypass the proxy fails in practice. We keep the loop
// scaffolding for shape but always feed it a single target.
const _PROXY_CONFIGURED = true;

// Alternative Binance API Base URLs for fallback
const F_BASES = [
  "https://fapi.binance.com",
  "https://fapi1.binance.com",
  "https://fapi2.binance.com",
  "https://fapi3.binance.com"
];

const S_BASES = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com"
];

/**
 * Helper: Dakika başlangıcı UTC ms
 */
export function msMinuteStartUTC(tsStr) {
  const d = new Date(tsStr + "Z");
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    0,
    0
  );
}

/**
 * Helper: Format UTC datetime as YYYY-MM-DD HH:mm:ss UTC+0
 */
function fmtUTC(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC+0`
  );
}

/**
 * Helper: Format MS as HH:mm:ss for short display
 */
function fmtFreq(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * Helper: Fetch with fallback across multiple base URLs
 */
async function fetchWithFallback(bases, path, kind = "") {
  let lastError = null;
  // When the proxy is configured (Worker URL, custom URL, or empty=relative for
  // dev), all bases collapse into one URL. The Worker performs its own
  // multi-base fallback server-side; the dev proxy talks to a single Binance
  // host. Only the legacy "no proxy" branch iterates bases for direct calls.
  const targets = _PROXY_CONFIGURED ? [PROXY] : bases;
  for (const base of targets) {
    try {
      const url = _PROXY_CONFIGURED ? `${PROXY}${path}` : `${base}${path}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();

      if (res.status === 429) throw new Error("Binance Rate Limit (429). Please wait a moment.");
      if (res.status === 418) throw new Error("Binance proxy temporarily blocked (418). The shared proxy IP got rate-limited. Try again in a few minutes.");
      if (res.status === 451) throw new Error("Regional Block (451). This API is restricted in your region.");
      if (res.status >= 500) throw new Error(`Binance temporarily unavailable (HTTP ${res.status}). Please retry in a moment.`);

      lastError = new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err;
      // Continue to next base if it's a network error or transient failure
      if (err.message.includes("Rate Limit") || err.message.includes("proxy temporarily blocked") || err.message.includes("Regional Block")) {
        throw err; // Stop if it's a hard limit
      }
    }
  }
  throw lastError || new Error(`Failed to fetch ${kind} data from all available Binance endpoints.`);
}

/**
 * İç kullanım: Büyük tarih aralıklarında kline'ları sayfalı (paginated) çeker.
 */
async function fetchAllKlines(kind, symbol, startMs, endMs, market = "futures", interval = "1m") {
  const MAX_LIMIT = 1500;
  let cur = startMs;
  const out = [];
  let guard = 0;

  // Interval duration in ms
  let stepMs = 60_000;
  if (interval === "1s") stepMs = 1_000;
  if (interval === "1h") stepMs = 3600_000;
  if (interval === "1d") stepMs = 86400_000;

  while (cur < endMs && guard++ < 1000) {
    const bases = market === "futures" ? F_BASES : S_BASES;
    const path = market === "futures"
      ? (kind === "mark" ? `/fapi/v1/markPriceKlines` : `/fapi/v1/klines`)
      : `/api/v3/klines`;

    const fullPath = `${path}?symbol=${encodeURIComponent(symbol)}&interval=${interval}&startTime=${cur}&endTime=${endMs}&limit=${MAX_LIMIT}`;

    const chunk = await fetchWithFallback(bases, fullPath, kind);

    if (!Array.isArray(chunk) || !chunk.length) break;

    out.push(...chunk);

    const lastOpen = Number(chunk[chunk.length - 1][0]);
    const next = lastOpen + stepMs;
    if (next <= cur) break;
    cur = next;
  }

  return out;
}

/**
 * Find the index of the max/min value in a numeric array without spreading it
 * into Math.max/Math.min — those throw RangeError on ~125k+ items.
 */
function argMax(arr: number[]): { value: number; index: number } {
  let v = -Infinity, i = -1;
  for (let k = 0; k < arr.length; k++) { if (arr[k] > v) { v = arr[k]; i = k; } }
  return { value: v, index: i };
}
function argMin(arr: number[]): { value: number; index: number } {
  let v = Infinity, i = -1;
  for (let k = 0; k < arr.length; k++) { if (arr[k] < v) { v = arr[k]; i = k; } }
  return { value: v, index: i };
}

/**
 * Tek bir dakikanın hem Mark hem de Last Price 1m mumunu çek
 * @param {string} symbol
 * @param {string} triggeredAtStr YYYY-MM-DD HH:MM:SS
 * @param {"futures"|"spot"} market
 */
export async function getTriggerMinuteCandles(symbol, triggeredAtStr, market = "futures") {
  const start = msMinuteStartUTC(triggeredAtStr);
  // Binance treats `endTime` inclusively, so subtract 1 ms to get exactly one
  // candle. Without this, requests can return both the trigger minute and the
  // following minute, and downstream code only reads `[0]`, hiding the bug.
  const end = start + 60 * 1000 - 1;

  const parseCandle = (c) =>
    !c
      ? null
      : {
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
      };

  // SPOT Handling
  if (market === "spot") {
    const path = `/api/v3/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`;
    const spotJson = await fetchWithFallback(S_BASES, path, "Spot");
    return {
      mark: null,
      last: spotJson.length ? parseCandle(spotJson[0]) : null
    };
  }

  // FUTURES Handling (Standard)
  const markPath = `/fapi/v1/markPriceKlines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`;
  const markJson = await fetchWithFallback(F_BASES, markPath, "Mark Price");

  const lastPath = `/fapi/v1/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`;
  const lastJson = await fetchWithFallback(F_BASES, lastPath, "Last Price");

  return {
    mark: markJson.length ? parseCandle(markJson[0]) : null,
    last: lastJson.length ? parseCandle(lastJson[0]) : null,
  };
}

/**
 * Belirli aralıkta high/low (Mark + Last)
 * ⚠️ Büyük aralıklarda tüm veriyi sayfalı çeker (paginate).
 * @param {string} symbol
 * @param {string} fromStr
 * @param {string} toStr
 * @param {"futures"|"spot"} market
 */
export async function getRangeHighLow(symbol, fromStr, toStr, market = "futures") {
  const start = Date.parse(fromStr + "Z");
  const end = Date.parse(toStr + "Z");
  if (isNaN(start) || isNaN(end)) throw new Error("Invalid date format.");
  if (end <= start) throw new Error("End time must be after start time.");

  // Spotta sadece Last (klines) verisi var.
  if (market === "spot") {
    const lastCandles = await fetchAllKlines("last", symbol, start, end, "spot", "1m");

    let lastHigh, lastLow, lastHighTime, lastLowTime, lastOpen, lastClose;
    const isNum = (v) => typeof v === "number" && !isNaN(v);

    if (lastCandles.length) {
      const highs = lastCandles.map((c) => parseFloat(c[2]));
      const lows = lastCandles.map((c) => parseFloat(c[3]));
      const h = argMax(highs);
      const l = argMin(lows);
      lastHigh = h.value;
      lastLow = l.value;
      lastHighTime = fmtUTC(Number(lastCandles[h.index][0]));
      lastLowTime = fmtUTC(Number(lastCandles[l.index][0]));
      lastOpen = parseFloat(lastCandles[0][1]);
      lastClose = parseFloat(lastCandles[lastCandles.length - 1][4]);
    }

    return {
      mark: { open: "N/A", high: "N/A", low: "N/A", close: "N/A", highTime: "N/A", lowTime: "N/A", changePct: "N/A" }, // Consistency
      last: {
        open: lastOpen ?? "N/A",
        high: lastHigh ?? "N/A",
        low: lastLow ?? "N/A",
        close: lastClose ?? "N/A",
        highTime: lastHighTime ?? "N/A",
        lowTime: lastLowTime ?? "N/A",
        changePct:
          (isNum(lastHigh) && isNum(lastLow) && lastLow !== 0)
            ? (((lastHigh - lastLow) / lastLow) * 100).toFixed(2) + "%"
            : "N/A",
      }
    };
  }

  // FUTURES
  const [markCandles, lastCandles] = await Promise.all([
    fetchAllKlines("mark", symbol, start, end, "futures", "1m"),
    fetchAllKlines("last", symbol, start, end, "futures", "1m"),
  ]);

  if (!markCandles.length && !lastCandles.length) {
    return {
      mark: { open: "N/A", high: "N/A", low: "N/A", close: "N/A", highTime: "N/A", lowTime: "N/A", changePct: "N/A" },
      last: { open: "N/A", high: "N/A", low: "N/A", close: "N/A", highTime: "N/A", lowTime: "N/A", changePct: "N/A" },
    };
  }

  let markHigh, markLow, markHighTime, markLowTime, markOpen, markClose;
  if (markCandles.length) {
    const highs = markCandles.map((c) => parseFloat(c[2]));
    const lows = markCandles.map((c) => parseFloat(c[3]));
    const h = argMax(highs);
    const l = argMin(lows);
    markHigh = h.value;
    markLow = l.value;
    markHighTime = fmtUTC(Number(markCandles[h.index][0]));
    markLowTime = fmtUTC(Number(markCandles[l.index][0]));
    markOpen = parseFloat(markCandles[0][1]);
    markClose = parseFloat(markCandles[markCandles.length - 1][4]);
  }

  let lastHigh, lastLow, lastHighTime, lastLowTime, lastOpen, lastClose;
  if (lastCandles.length) {
    const highs = lastCandles.map((c) => parseFloat(c[2]));
    const lows = lastCandles.map((c) => parseFloat(c[3]));
    const h = argMax(highs);
    const l = argMin(lows);
    lastHigh = h.value;
    lastLow = l.value;
    lastHighTime = fmtUTC(Number(lastCandles[h.index][0]));
    lastLowTime = fmtUTC(Number(lastCandles[l.index][0]));
    lastOpen = parseFloat(lastCandles[0][1]);
    lastClose = parseFloat(lastCandles[lastCandles.length - 1][4]);
  }

  const isNum = (v) => typeof v === "number" && !isNaN(v);

  return {
    mark: {
      open: markOpen ?? "N/A",
      high: markHigh ?? "N/A",
      low: markLow ?? "N/A",
      close: markClose ?? "N/A",
      highTime: markHighTime ?? "N/A",
      lowTime: markLowTime ?? "N/A",
      changePct:
        (isNum(markHigh) && isNum(markLow) && markLow !== 0)
          ? (((markHigh - markLow) / markLow) * 100).toFixed(2) + "%"
          : "N/A",
    },
    last: {
      open: lastOpen ?? "N/A",
      high: lastHigh ?? "N/A",
      low: lastLow ?? "N/A",
      close: lastClose ?? "N/A",
      highTime: lastHighTime ?? "N/A",
      lowTime: lastLowTime ?? "N/A",
      changePct:
        (isNum(lastHigh) && isNum(lastLow) && lastLow !== 0)
          ? (((lastHigh - lastLow) / lastLow) * 100).toFixed(2) + "%"
          : "N/A",
    },
  };
}

/**
 * Last Price OHLC for a single second (via aggTrades, max 7 gün)
 * @param {string} symbol
 * @param {string} atStr
 * @param {"futures"|"spot"} market
 */
export async function getLastPriceAtSecond(symbol, atStr, market = "futures") {
  const start = Date.parse(atStr + "Z");
  if (isNaN(start)) throw new Error("Invalid date format.");
  const end = start + 1000;

  // URL Config
  const bases = market === "futures" ? F_BASES : S_BASES;
  const path = market === "futures"
    ? `/fapi/v1/aggTrades?symbol=${symbol}&startTime=${start}&endTime=${end}&limit=1000`
    : `/api/v3/aggTrades?symbol=${symbol}&startTime=${start}&endTime=${end}&limit=1000`;

  const trades = await fetchWithFallback(bases, path, "aggTrades");
  if (!Array.isArray(trades) || !trades.length) return null;

  const prices = trades.map((t) => parseFloat(t.p));
  return {
    open: prices[0],
    high: argMax(prices).value,
    low: argMin(prices).value,
    close: prices[prices.length - 1],
    count: trades.length,
  };
}

/**
 * 📌 Funding Rate & Mark Price (yakın funding kaydı)
 */
export async function getNearestFunding(symbol, targetUtcStr) {
  const targetMs = Date.parse(targetUtcStr + "Z");
  if (isNaN(targetMs)) throw new Error("Invalid date format.");

  for (const windowMin of [10, 30, 90]) {
    const path = `/fapi/v1/fundingRate?symbol=${symbol.toUpperCase()}&startTime=${targetMs - windowMin * 60_000}&endTime=${targetMs + windowMin * 60_000}&limit=1000`;
    try {
      const rows = await fetchWithFallback(F_BASES, path, "fundingRate");
      if (rows && rows.length) {
        rows.sort(
          (a, b) =>
            Math.abs(parseInt(a.fundingTime) - targetMs) -
            Math.abs(parseInt(b.fundingTime) - targetMs)
        );
        const rec = rows[0];
        return {
          funding_time: fmtUTC(Number(rec.fundingTime)),
          funding_rate: parseFloat(rec.fundingRate),
          mark_price: rec.markPrice || null,
          funding_time_ms: Number(rec.fundingTime)
        };
      }
    } catch (e) {
      if (windowMin === 90) throw e; // Only throw on final attempt
    }
  }
  return null;
}

/**
 * 📌 Eğer funding kaydında markPrice yoksa 1m kapanışı al (fallback)
 */
export async function getMarkPriceClose1m(symbol, fundingTimeMs) {
  const startMinute = fundingTimeMs - (fundingTimeMs % 60_000);
  const candidates = [startMinute, startMinute - 60_000];
  for (const start of candidates) {
    const path = `/fapi/v1/markPriceKlines?symbol=${symbol.toUpperCase()}&interval=1m&startTime=${start}&limit=1`;
    try {
      const data = await fetchWithFallback(F_BASES, path, "Mark Price fallback");
      if (Array.isArray(data) && data.length) {
        return {
          mark_price: parseFloat(data[0][4]),
          close_time: fmtUTC(Number(data[0][6]))
        };
      }
    } catch (e) {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * 📌 Get ALL symbol → pricePrecision map
 */
let symbolPrecisionCache = null;

export async function getAllSymbolPrecisions() {
  if (symbolPrecisionCache) return symbolPrecisionCache;

  const path = `/fapi/v1/exchangeInfo`;
  const data = await fetchWithFallback(F_BASES, path, "exchangeInfo");

  const map = {};
  for (const s of data.symbols) {
    map[s.symbol] = s.pricePrecision;
  }
  symbolPrecisionCache = map;
  return map;
}

export async function findPriceOccurrences(symbol, fromStr, toStr, targetPrice, market = "futures", priceType = "last") {
  const startMs = Date.parse(fromStr + "Z");
  const endMs = Date.parse(toStr + "Z");
  if (isNaN(startMs) || isNaN(endMs)) throw new Error("Invalid date format.");

  let fetchKind = "last";
  if (market === "futures" && priceType === "mark") fetchKind = "mark";

  // --- Hierarchical Search Optimized ---
  const isLargeRange = (endMs - startMs) > 172800_000; // > 2 Days
  let candles = [];

  if (isLargeRange) {
    // Phase 1: Scan Daily Candles (Fast, 1 request per 1500 days)
    const dayCandles = await fetchAllKlines(fetchKind, symbol, startMs, endMs, market, "1d");
    const matchingDays = dayCandles.filter(c => targetPrice >= parseFloat(c[3]) && targetPrice <= parseFloat(c[2]));

    // Phase 2: Fetch 1m Candles for matching days ONLY
    // Limit to prevent accidental spam if price stayed at target for months
    const maxDaysToScan = 30;
    let daysScanned = 0;

    for (const day of matchingDays) {
      const dStart = Number(day[0]);
      const dEnd = dStart + 86400_000;

      // Ensure we don't scan outside requested range
      const scanStart = Math.max(dStart, startMs);
      const scanEnd = Math.min(dEnd, endMs);

      const dayMinuteCandles = await fetchAllKlines(fetchKind, symbol, scanStart, scanEnd, market, "1m");
      candles.push(...dayMinuteCandles.filter(c => targetPrice >= parseFloat(c[3]) && targetPrice <= parseFloat(c[2])));

      daysScanned++;
      if (daysScanned >= maxDaysToScan) break;
      if (candles.length > 500) break; // Common sense limit
    }
  } else {
    // Small range: Fetch 1m directly
    const directCandles = await fetchAllKlines(fetchKind, symbol, startMs, endMs, market, "1m");
    candles = directCandles.filter(c => targetPrice >= parseFloat(c[3]) && targetPrice <= parseFloat(c[2]));
  }

  if (!candles.length) return null;

  // 3. Precision Lookup (AggTrades for Last Price only)
  // We identify the absolute first occurrence across all scanned intervals
  const firstMatch = candles[0];
  let exactTime = null;

  if (fetchKind === "last") {
    exactTime = await findMatchInAggTrades(symbol, Number(firstMatch[0]), targetPrice, market);
  }

  const result = {
    first: {
      timestamp: exactTime ? exactTime.ts : Number(firstMatch[0]),
      fmt: exactTime ? fmtUTC(exactTime.ts) : fmtUTC(Number(firstMatch[0])) + (priceType === 'mark' ? "" : " (approx minute)"),
      price: exactTime ? exactTime.price : targetPrice,
      isExact: !!exactTime
    },
    others: candles.slice(1, 21).map(c => fmtUTC(Number(c[0])).slice(0, 16)) // Limit to top 20
  };

  return result;
}

/**
 * 🔍 Helper: Download aggTrades for a minute and find the FIRST trade that crossed/touched the price
 */
async function findMatchInAggTrades(symbol, minuteMs, target, market) {
  // We need to fetch trades. AggTrades limit is 1000. 
  // A busy minute might have > 1000 trades. We might need to page, but usually 1000 covers start of minute.
  // Actually, for High Volatility, 1000 trades might cover only 5 seconds.
  // We'll try to fetch a few pages if needed, up to 1 minute.

  let fromId = null;
  let startTime = minuteMs;
  const endTime = minuteMs + 60_000;

  // Safety break
  let pages = 0;
  while (startTime < endTime && pages < 10) {
    const bases = market === "futures" ? F_BASES : S_BASES;
    const path = market === "futures"
      ? `/fapi/v1/aggTrades?symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&limit=1000`
      : `/api/v3/aggTrades?symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&limit=1000`;

    const trades = await fetchWithFallback(bases, path, "aggTrades search");

    if (!trades.length) break;

    // Sort by time just in case
    // trades.sort((a, b) => a.T - b.T); // API usually returns sorted

    // Find cross
    // We don't verify "previous price" perfect cross because we jumped into a stream.
    // We just check if any trade hits the price. 
    // Ideally check if (prev < target <= curr) or (prev > target >= curr).
    // But exact match or range inclusion is good enough.

    for (const t of trades) {
      const p = parseFloat(t.p);
      // Simplify: if matches strictly? Hard with floats.
      // Let's assume user wants "when did it cross".
      // But we need state. Let's strictly check deviation or just basic "== approx".
      // Users enter specific numbers usually. 
      // Let's check a small epsilon or if we have history.
      // BETTER: Check if this trade makes the price "cross" the target from previous trade?
      // Since we don't have "previous" of the minute start easily (without prev candle close), 
      // let's just return the first trade that is "close enough" or exactly matches if simple.
      // Actually, simplest definition: First trade where (Low <= Target <= High) of the trade? 
      // AggTrade has only 'p' (price).
      // So we just iterate.

      // We need to know the trend. 
      // Let's just return the first trade price that is extremely close (0.01%?) or 
      // if we see a flip from below to above.

      // Let's use < 0.000001 diff
      if (Math.abs(p - target) < (target * 0.000001)) {
        return { ts: t.T, price: p };
      }

      // Detect Crossing?
      // We need 'prevP'.
    }

    // If not found exact, maybe it crossed between two trades?
    // Let's do a second pass with logic:
    // If trade[i] < target and trade[i+1] > target, then it happened between i and i+1.
    // We return trade[i+1] as the moment it covered it.
    for (let i = 0; i < trades.length - 1; i++) {
      const p1 = parseFloat(trades[i].p);
      const p2 = parseFloat(trades[i + 1].p);
      if ((p1 < target && p2 >= target) || (p1 > target && p2 <= target)) {
        return { ts: trades[i + 1].T, price: parseFloat(trades[i + 1].p) };
      }
    }

    // Check first trade against Start of Minute Open?
    // This is getting complex.
    // Fallback: If we found NO cross in trades, but candle said Low <= Target <= High,
    // then it must be that the *candle* data is reliable and maybe we missed a trade or 
    // the High/Low happened in a trade we didn't fetch (unlikely if we fetch all).
    // Or maybe the first trade IS the match (Gap).

    // Let's just return the first trade of the minute if candle says yes?
    // No, that's inaccurate.

    // Update cursors
    const lastT = trades[trades.length - 1].T;
    if (lastT >= endTime - 1) break;
    startTime = lastT + 1;
    pages++;
  }

  return null; // Fallback to Minute resolution
}

/**
 * 🎯 Closest Miss analysis for the Find Price flow.
 * When the target price was NOT reached, returns the closest observed
 * value (high-side or low-side) along with timing and miss size.
 *
 * Reuses getRangeHighLow so no fetch logic is duplicated.
 */
export async function findClosestMiss(symbol, fromStr, toStr, targetPrice, market = "futures", priceType = "last") {
  const range = await getRangeHighLow(symbol, fromStr, toStr, market);
  if (!range) return null;

  const useMark = market === "futures" && priceType === "mark";
  const series = useMark ? range.mark : range.last;
  const isNum = (v) => typeof v === "number" && !isNaN(v);
  if (!series || !isNum(series.high) || !isNum(series.low)) return null;

  // If target actually fell within the range, it WAS reached — caller should
  // not show Closest Miss as the main result.
  const reached = targetPrice >= series.low && targetPrice <= series.high;

  const distHigh = Math.abs(series.high - targetPrice);
  const distLow = Math.abs(series.low - targetPrice);
  const useHigh = distHigh <= distLow;

  const closestPrice = useHigh ? series.high : series.low;
  const closestTime = useHigh ? series.highTime : series.lowTime;
  const side = useHigh ? "high" : "low";
  const missDistance = Math.abs(closestPrice - targetPrice);
  const missPct = targetPrice !== 0 ? (missDistance / Math.abs(targetPrice)) * 100 : 0;

  return {
    reached,
    side,
    closestPrice,
    closestTime,
    missDistance,
    missPct,
    priceTypeUsed: useMark ? "mark" : "last",
  };
}

/**
 * 🎯 Mark vs Last Gap analysis (Futures only).
 * Compares Mark Price and Last Price 1m series in a range so an agent
 * can explain "the chart touched the level but my order didn't trigger".
 *
 * - target optional: when provided, reports first touch on each side.
 * - Computes per-minute gap (|lastHigh - markHigh| + |lastLow - markLow|)
 *   and returns the single largest gap minute.
 */
export async function analyzeMarkVsLastGap(symbol, fromStr, toStr, targetPrice = null) {
  const startMs = Date.parse(fromStr + "Z");
  const endMs = Date.parse(toStr + "Z");
  if (isNaN(startMs) || isNaN(endMs)) throw new Error("Invalid date format.");
  if (endMs <= startMs) throw new Error("End time must be after start time.");

  const [markCandles, lastCandles] = await Promise.all([
    fetchAllKlines("mark", symbol, startMs, endMs, "futures", "1m"),
    fetchAllKlines("last", symbol, startMs, endMs, "futures", "1m"),
  ]);

  if (!markCandles.length && !lastCandles.length) return null;

  const summarize = (candles) => {
    if (!candles.length) return null;
    const highs = candles.map((c) => parseFloat(c[2]));
    const lows = candles.map((c) => parseFloat(c[3]));
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const idxH = highs.indexOf(high);
    const idxL = lows.indexOf(low);
    return {
      high,
      low,
      highTime: fmtUTC(Number(candles[idxH][0])),
      lowTime: fmtUTC(Number(candles[idxL][0])),
    };
  };

  const firstTouch = (candles, target) => {
    if (target == null) return null;
    for (const c of candles) {
      const h = parseFloat(c[2]);
      const l = parseFloat(c[3]);
      if (target >= l && target <= h) {
        return { ts: Number(c[0]), fmt: fmtUTC(Number(c[0])) };
      }
    }
    return null;
  };

  const lastSummary = summarize(lastCandles);
  const markSummary = summarize(markCandles);

  const lastTouch = firstTouch(lastCandles, targetPrice);
  const markTouch = firstTouch(markCandles, targetPrice);

  // Align candles by open time and find largest gap.
  const byTimeMark = new Map();
  for (const c of markCandles) byTimeMark.set(Number(c[0]), c);

  let largestGap = null;
  for (const lc of lastCandles) {
    const t = Number(lc[0]);
    const mc = byTimeMark.get(t);
    if (!mc) continue;
    const lastHigh = parseFloat(lc[2]);
    const lastLow = parseFloat(lc[3]);
    const markHigh = parseFloat(mc[2]);
    const markLow = parseFloat(mc[3]);
    const highGap = Math.abs(lastHigh - markHigh);
    const lowGap = Math.abs(lastLow - markLow);
    const gap = Math.max(highGap, lowGap);
    if (!largestGap || gap > largestGap.gap) {
      largestGap = {
        ts: t,
        fmt: fmtUTC(t),
        lastHigh, lastLow, markHigh, markLow,
        gap,
      };
    }
  }

  // Closest miss numbers (high-side / low-side) per series, when target provided
  const closestMiss = (summary, target) => {
    if (!summary || target == null) return null;
    const reached = target >= summary.low && target <= summary.high;
    if (reached) return { reached: true };
    const distHigh = Math.abs(summary.high - target);
    const distLow = Math.abs(summary.low - target);
    const useHigh = distHigh <= distLow;
    return {
      reached: false,
      side: useHigh ? "high" : "low",
      closestPrice: useHigh ? summary.high : summary.low,
      closestTime: useHigh ? summary.highTime : summary.lowTime,
      missDistance: useHigh ? distHigh : distLow,
    };
  };

  return {
    last: {
      summary: lastSummary,
      reached: !!lastTouch,
      firstTouch: lastTouch,
      miss: closestMiss(lastSummary, targetPrice),
    },
    mark: {
      summary: markSummary,
      reached: !!markTouch,
      firstTouch: markTouch,
      miss: closestMiss(markSummary, targetPrice),
    },
    largestGap,
  };
}

const MARK_PRICE_TRAILING_WARNING =
  "Mark Price analysis uses 1-minute candles (Binance does not provide Mark Price data below 1m). Timestamps are approximate to the minute, but trough/peak/trigger prices are calculated correctly from candle extremes.";

function trailingSecondInclusiveEnd(endMs) {
  return Math.floor(endMs / 1000) * 1000 + 999;
}

function trailingCandleInfo(c) {
  return {
    openTime: Number(c[0]),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
  };
}

function trailingSourceLabel(priceType, granularity) {
  if (priceType === "mark") return "Mark Price (1m markPriceKlines)";
  if (granularity === "aggTrades") return "Last Price (aggTrades, tick precision)";
  // Spot only — Binance Futures klines does not support interval=1s.
  return "Last Price (1s klines)";
}

function buildTrailingStopResult({
  symbol,
  fromStr,
  toStr,
  direction,
  priceType,
  granularity,
  activationPrice,
  callbackRate,
  startMs,
  endMs,
  isActivated,
  activationTs,
  activationPriceObserved,
  referencePrice,
  referenceTs,
  triggerTs,
  triggerPrice,
  triggerObservedPrice,
  maxObservedCallback,
  markDetails = null,
}) {
  const isApproximate = priceType === "mark";
  const isSellTrailing = direction === "short";
  const callbackDecimal = callbackRate / 100;
  const requiredMovePrice = referencePrice == null
    ? null
    : isSellTrailing
      ? referencePrice * (1 - callbackDecimal)
      : referencePrice * (1 + callbackDecimal);

  return {
    status: triggerTs ? "triggered" : (isActivated ? "activated_no_trigger" : "not_activated"),
    isActivated,
    activationTime: activationTs == null ? null : fmtUTC(activationTs),
    activationTs,
    activationPrice,
    activationPriceObserved,
    peakPrice: referencePrice,
    peakTime: referenceTs == null ? null : fmtUTC(referenceTs),
    peakTs: referenceTs,
    referencePrice,
    referenceTime: referenceTs == null ? null : fmtUTC(referenceTs),
    referenceTs,
    referenceLabel: isSellTrailing ? "Peak (highest)" : "Trough (lowest)",
    triggerTime: triggerTs == null ? null : fmtUTC(triggerTs),
    triggerTs,
    triggerPrice: triggerPrice ?? requiredMovePrice,
    triggerObservedPrice,
    maxObservedCallback,
    reboundPct: triggerTs ? maxObservedCallback : null,
    dataSource: priceType,
    dataSourceLabel: trailingSourceLabel(priceType, granularity),
    granularity,
    isApproximate,
    fellBackTo1m: false,
    isEstimated: isApproximate,
    markWarning: priceType === "mark" ? MARK_PRICE_TRAILING_WARNING : null,
    markDetails,
    direction,
    trailingSide: isSellTrailing ? "SELL" : "BUY",
    requestStartTs: startMs,
    requestEndTs: endMs,
    symbol,
    period: `${fromStr} -> ${toStr}`,
  };
}

function analyzeTrailingStopPoints(points, opts) {
  const {
    symbol,
    fromStr,
    toStr,
    direction,
    priceType,
    granularity,
    activationPrice,
    callbackRate,
    startMs,
    endMs,
  } = opts;

  const callbackDecimal = callbackRate / 100;
  const isSellTrailing = direction === "short";
  const endInclusiveMs = trailingSecondInclusiveEnd(endMs);
  let isActivated = !Number.isFinite(activationPrice);
  let activationTs = isActivated && points.length ? points[0].ts : null;
  let activationPriceObserved = isActivated && points.length ? points[0].price : null;
  let referencePrice = isSellTrailing ? -Infinity : Infinity;
  let referenceTs = null;
  let triggerTs = null;
  let triggerPrice = null;
  let triggerObservedPrice = null;
  let maxObservedCallback = 0;

  for (const point of points) {
    if (point.ts < startMs || point.ts > endInclusiveMs) continue;
    const p = point.price;
    if (!Number.isFinite(p)) continue;

    if (!isActivated) {
      const activated = isSellTrailing ? p >= activationPrice : p <= activationPrice;
      if (!activated) continue;

      isActivated = true;
      activationTs = point.ts;
      activationPriceObserved = p;
      referencePrice = p;
      referenceTs = point.ts;
    }

    if (isSellTrailing) {
      if (p > referencePrice) {
        referencePrice = p;
        referenceTs = point.ts;
      }
    } else if (p < referencePrice) {
      referencePrice = p;
      referenceTs = point.ts;
    }

    const currentDev = isSellTrailing
      ? ((referencePrice - p) / referencePrice) * 100
      : ((p - referencePrice) / referencePrice) * 100;

    if (currentDev > maxObservedCallback) maxObservedCallback = currentDev;

    if (currentDev >= callbackRate) {
      triggerTs = point.ts;
      triggerObservedPrice = p;
      triggerPrice = isSellTrailing
        ? referencePrice * (1 - callbackDecimal)
        : referencePrice * (1 + callbackDecimal);
      break;
    }
  }

  return buildTrailingStopResult({
    symbol,
    fromStr,
    toStr,
    direction,
    priceType,
    granularity,
    activationPrice,
    callbackRate,
    startMs,
    endMs,
    isActivated,
    activationTs,
    activationPriceObserved,
    referencePrice: referencePrice === -Infinity || referencePrice === Infinity ? null : referencePrice,
    referenceTs,
    triggerTs,
    triggerPrice,
    triggerObservedPrice,
    maxObservedCallback,
  });
}

function buildLastKlineTrailingPoints(candles, direction, startMs, endMs) {
  const startSecond = Math.floor(startMs / 1000) * 1000;
  const endSecond = Math.floor(endMs / 1000) * 1000;
  const isSellTrailing = direction === "short";
  const points = [];

  for (const raw of candles) {
    const c = trailingCandleInfo(raw);
    if (c.openTime < startSecond || c.openTime > endSecond) continue;
    const seq = isSellTrailing
      ? [
        { price: c.open, kind: "open" },
        { price: c.high, kind: "high" },
        { price: c.low, kind: "low" },
        { price: c.close, kind: "close" },
      ]
      : [
        { price: c.open, kind: "open" },
        { price: c.low, kind: "low" },
        { price: c.high, kind: "high" },
        { price: c.close, kind: "close" },
      ];

    for (const item of seq) {
      points.push({
        ts: c.openTime,
        price: item.price,
        kind: item.kind,
        candle: c,
      });
    }
  }

  return points.sort((a, b) => a.ts - b.ts);
}

async function fetchTrailingAggTradePoints(symbol, startMs, endMs, market = "futures") {
  const bases = market === "futures" ? F_BASES : S_BASES;
  const pathBase = market === "futures" ? "/fapi/v1/aggTrades" : "/api/v3/aggTrades";
  const endInclusiveMs = trailingSecondInclusiveEnd(endMs);
  let cur = startMs;
  let guard = 0;
  const out = [];

  while (cur <= endInclusiveMs && guard++ < 1000) {
    const path = `${pathBase}?symbol=${encodeURIComponent(symbol)}&startTime=${cur}&endTime=${endInclusiveMs}&limit=1000`;
    const chunk = await fetchWithFallback(bases, path, "aggTrades");
    if (!Array.isArray(chunk) || !chunk.length) break;

    for (const tr of chunk) {
      const ts = Number(tr.T);
      const price = parseFloat(tr.p);
      if (ts >= startMs && ts <= endInclusiveMs && Number.isFinite(price)) {
        out.push({ ts, price, kind: "trade", trade: tr });
      }
    }

    const lastTs = Number(chunk[chunk.length - 1].T);
    if (!Number.isFinite(lastTs) || lastTs < cur || lastTs >= endInclusiveMs) break;
    cur = lastTs + 1;
  }

  return out.sort((a, b) => a.ts - b.ts);
}

function analyzeMarkTrailingStopCandles(candles, opts) {
  const {
    symbol,
    fromStr,
    toStr,
    direction,
    activationPrice,
    callbackRate,
    startMs,
    endMs,
  } = opts;

  const callbackDecimal = callbackRate / 100;
  const isSellTrailing = direction === "short";
  const endInclusiveMs = trailingSecondInclusiveEnd(endMs);
  let isActivated = !Number.isFinite(activationPrice);
  let activationTs = null;
  let activationPriceObserved = null;
  let referencePrice = isSellTrailing ? -Infinity : Infinity;
  let referenceTs = null;
  let triggerTs = null;
  let triggerPrice = null;
  let triggerObservedPrice = null;
  let maxObservedCallback = 0;
  const markDetails = {
    activationCandle: null,
    referenceCandle: null,
    triggerCandle: null,
    referenceExtreme: isSellTrailing ? "high" : "low",
    triggerExtreme: isSellTrailing ? "low" : "high",
  };

  for (const raw of candles) {
    const c = trailingCandleInfo(raw);
    const candleEnd = c.openTime + 59_999;
    if (candleEnd < startMs || c.openTime > endInclusiveMs) continue;

    const eventTs = Math.min(Math.max(c.openTime, startMs), endInclusiveMs);
    const activationProbe = isSellTrailing ? c.high : c.low;
    const referenceCandidate = isSellTrailing ? c.high : c.low;
    const triggerProbe = isSellTrailing ? c.low : c.high;

    if (!isActivated) {
      const activated = isSellTrailing
        ? activationProbe >= activationPrice
        : activationProbe <= activationPrice;
      if (!activated) continue;

      isActivated = true;
      activationTs = eventTs;
      activationPriceObserved = activationProbe;
      referencePrice = referenceCandidate;
      referenceTs = eventTs;
      markDetails.activationCandle = c;
      markDetails.referenceCandle = c;
    }

    if (isSellTrailing) {
      if (referenceCandidate > referencePrice) {
        referencePrice = referenceCandidate;
        referenceTs = eventTs;
        markDetails.referenceCandle = c;
      }
    } else if (referenceCandidate < referencePrice) {
      referencePrice = referenceCandidate;
      referenceTs = eventTs;
      markDetails.referenceCandle = c;
    }

    const currentDev = isSellTrailing
      ? ((referencePrice - triggerProbe) / referencePrice) * 100
      : ((triggerProbe - referencePrice) / referencePrice) * 100;

    if (currentDev > maxObservedCallback) maxObservedCallback = currentDev;

    if (currentDev >= callbackRate) {
      triggerTs = eventTs;
      triggerObservedPrice = triggerProbe;
      triggerPrice = isSellTrailing
        ? referencePrice * (1 - callbackDecimal)
        : referencePrice * (1 + callbackDecimal);
      markDetails.triggerCandle = c;
      break;
    }
  }

  return buildTrailingStopResult({
    symbol,
    fromStr,
    toStr,
    direction,
    priceType: "mark",
    granularity: "1m",
    activationPrice,
    callbackRate,
    startMs,
    endMs,
    isActivated,
    activationTs,
    activationPriceObserved,
    referencePrice: referencePrice === -Infinity || referencePrice === Infinity ? null : referencePrice,
    referenceTs,
    triggerTs,
    triggerPrice,
    triggerObservedPrice,
    maxObservedCallback,
    markDetails,
  });
}

/**
 * Trailing Stop Simulation (Binance Futures logic)
 *
 * Futures Last Price orders are analyzed directly from /fapi/v1/aggTrades
 * (tick precision). Binance Futures klines does not support interval=1s
 * (returns code -1120 "Invalid interval."), so we never attempt that call.
 *
 * Spot Last Price orders try /api/v3/klines interval=1s first (which Spot
 * supports) and fall back to /api/v3/aggTrades if 1s klines are empty.
 *
 * Mark Price orders use /fapi/v1/markPriceKlines interval=1m because Binance
 * does not expose sub-minute historical Mark Price data. For BUY trailing,
 * each candle low updates the trough and its high probes the rebound. For
 * SELL trailing, each candle high updates the peak and its low probes the
 * pullback.
 */
export async function checkTrailingStop(symbol, fromStr, toStr, activationPrice, callbackRate, direction, market = "futures", priceType = "last") {
  const startMs = Date.parse(fromStr + "Z");
  const endMs = Date.parse(toStr + "Z");
  if (isNaN(startMs) || isNaN(endMs)) throw new Error("Invalid date format.");
  if (endMs < startMs) throw new Error("End time must be after start time.");

  const normalizedSymbol = symbol.toUpperCase();
  const finalType = market === "futures" && priceType === "mark" ? "mark" : "last";

  if (finalType === "mark") {
    const fetchStart = Math.floor(startMs / 60_000) * 60_000;
    const fetchEnd = Math.floor(endMs / 60_000) * 60_000 + 60_000;
    const candles = await fetchAllKlines("mark", normalizedSymbol, fetchStart, fetchEnd, "futures", "1m");

    if (!candles.length) {
      return {
        status: "not_found",
        dataSource: "mark",
        dataSourceLabel: trailingSourceLabel("mark", "1m"),
        granularity: "1m",
        isApproximate: true,
        fellBackTo1m: false,
        isEstimated: true,
        markWarning: MARK_PRICE_TRAILING_WARNING,
        symbol: normalizedSymbol,
        period: `${fromStr} -> ${toStr}`,
        requestStartTs: startMs,
        requestEndTs: endMs,
      };
    }

    return analyzeMarkTrailingStopCandles(candles, {
      symbol: normalizedSymbol,
      fromStr,
      toStr,
      direction,
      activationPrice,
      callbackRate,
      startMs,
      endMs,
    });
  }

  const fetchStart = Math.floor(startMs / 1000) * 1000;
  const fetchEnd = Math.floor(endMs / 1000) * 1000 + 1000;

  // Spot supports interval=1s on klines; Futures does not (Binance returns
  // -1120 "Invalid interval"). For Futures we go straight to aggTrades, which
  // is the correct tick-precision source for Last Price anyway.
  if (market !== "futures") {
    let candles = [];
    try {
      candles = await fetchAllKlines("last", normalizedSymbol, fetchStart, fetchEnd, market, "1s");
    } catch (_e) {
      candles = [];
    }

    if (candles.length) {
      const points = buildLastKlineTrailingPoints(candles, direction, startMs, endMs);
      if (points.length) {
        return analyzeTrailingStopPoints(points, {
          symbol: normalizedSymbol,
          fromStr,
          toStr,
          direction,
          priceType: "last",
          granularity: "1s",
          activationPrice,
          callbackRate,
          startMs,
          endMs,
        });
      }
    }
  }

  const tradePoints = await fetchTrailingAggTradePoints(normalizedSymbol, startMs, endMs, market);
  if (!tradePoints.length) {
    return {
      status: "not_found",
      dataSource: "last",
      dataSourceLabel: trailingSourceLabel("last", "aggTrades"),
      granularity: "aggTrades",
      isApproximate: false,
      fellBackTo1m: false,
      isEstimated: false,
      symbol: normalizedSymbol,
      period: `${fromStr} -> ${toStr}`,
      requestStartTs: startMs,
      requestEndTs: endMs,
    };
  }

  return analyzeTrailingStopPoints(tradePoints, {
    symbol: normalizedSymbol,
    fromStr,
    toStr,
    direction,
    priceType: "last",
    granularity: "aggTrades",
    activationPrice,
    callbackRate,
    startMs,
    endMs,
  });
}

// src/pricing.js

// Eğer CORS hatası alırsan buraya kendi proxy adresini yazabilirsin
export const PROXY = "";

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
 * Helper: Fetch with fallback across multiple base URLs
 */
async function fetchWithFallback(bases, path, kind = "") {
  let lastError = null;
  for (const base of bases) {
    try {
      const url = `${PROXY}${base}${path}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();

      if (res.status === 429) throw new Error("Binance Rate Limit (429). Please wait a moment.");
      if (res.status === 418) throw new Error("IP Banned (418). Please use a VPN or Proxy.");
      if (res.status === 451) throw new Error("Regional Block (451). This API is restricted in your region. Use a Proxy.");

      lastError = new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err;
      // Continue to next base if it's a network error or transient failure
      if (err.message.includes("Rate Limit") || err.message.includes("IP Banned") || err.message.includes("Regional Block")) {
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
 * Tek bir dakikanın hem Mark hem de Last Price 1m mumunu çek
 * @param {string} symbol
 * @param {string} triggeredAtStr YYYY-MM-DD HH:MM:SS
 * @param {"futures"|"spot"} market
 */
export async function getTriggerMinuteCandles(symbol, triggeredAtStr, market = "futures") {
  const start = msMinuteStartUTC(triggeredAtStr);
  const end = start + 60 * 1000;

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

    let lastHigh, lastLow, lastHighTime, lastLowTime;
    const isNum = (v) => typeof v === "number" && !isNaN(v);

    if (lastCandles.length) {
      const highs = lastCandles.map((c) => parseFloat(c[2]));
      const lows = lastCandles.map((c) => parseFloat(c[3]));
      lastHigh = Math.max(...highs);
      lastLow = Math.min(...lows);
      const idxH = highs.indexOf(lastHigh);
      const idxL = lows.indexOf(lastLow);
      lastHighTime = fmtUTC(Number(lastCandles[idxH][0]));
      lastLowTime = fmtUTC(Number(lastCandles[idxL][0]));
    }

    return {
      mark: null, // Spot için Mark yok
      last: {
        high: lastHigh ?? "N/A",
        low: lastLow ?? "N/A",
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
      mark: { high: "N/A", low: "N/A", highTime: "N/A", lowTime: "N/A", changePct: "N/A" },
      last: { high: "N/A", low: "N/A", highTime: "N/A", lowTime: "N/A", changePct: "N/A" },
    };
  }

  let markHigh, markLow, markHighTime, markLowTime;
  if (markCandles.length) {
    const highs = markCandles.map((c) => parseFloat(c[2]));
    const lows = markCandles.map((c) => parseFloat(c[3]));
    markHigh = Math.max(...highs);
    markLow = Math.min(...lows);
    const idxH = highs.indexOf(markHigh);
    const idxL = lows.indexOf(markLow);
    markHighTime = fmtUTC(Number(markCandles[idxH][0]));
    markLowTime = fmtUTC(Number(markCandles[idxL][0]));
  }

  let lastHigh, lastLow, lastHighTime, lastLowTime;
  if (lastCandles.length) {
    const highs = lastCandles.map((c) => parseFloat(c[2]));
    const lows = lastCandles.map((c) => parseFloat(c[3]));
    lastHigh = Math.max(...highs);
    lastLow = Math.min(...lows);
    const idxH = highs.indexOf(lastHigh);
    const idxL = lows.indexOf(lastLow);
    lastHighTime = fmtUTC(Number(lastCandles[idxH][0]));
    lastLowTime = fmtUTC(Number(lastCandles[idxL][0]));
  }

  const isNum = (v) => typeof v === "number" && !isNaN(v);

  return {
    mark: {
      high: markHigh ?? "N/A",
      low: markLow ?? "N/A",
      highTime: markHighTime ?? "N/A",
      lowTime: markLowTime ?? "N/A",
      changePct:
        (isNum(markHigh) && isNum(markLow) && markLow !== 0)
          ? (((markHigh - markLow) / markLow) * 100).toFixed(2) + "%"
          : "N/A",
    },
    last: {
      high: lastHigh ?? "N/A",
      low: lastLow ?? "N/A",
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
  if (!trades.length) return null;

  const prices = trades.map((t) => parseFloat(t.p));
  return {
    open: prices[0],
    high: Math.max(...prices),
    low: Math.min(...prices),
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
      const data = await fetchWithFallback(F_BASES, path, "Mark Price fallack");
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
  console.log("[getAllSymbolPrecisions] loaded", Object.keys(map).length, "symbols");
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


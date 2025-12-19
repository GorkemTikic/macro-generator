// src/pricing.js

// Eğer CORS hatası alırsan buraya kendi proxy adresini yazabilirsin
export const PROXY = "";

/**
 * Helper: dakika başlangıcı UTC ms
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
 * Helper: format UTC datetime as YYYY-MM-DD HH:mm:ss UTC+0
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
 * İç kullanım: Büyük tarih aralıklarında 1m mumları sayfalı (paginated) çeker.
 * Binance API 1 istekte en fazla ~1500 kline döndürür (≈ 25 saat @1m).
 * Bu yüzden aralığı parçalayarak tüm veriyi topluyoruz.
 *
 * @param {"mark"|"last"} kind
 * @param {string} symbol
 * @param {number} startMs UTC ms
 * @param {number} endMs UTC ms (exclusive önerilir)
 * @param {"futures"|"spot"} market (default "futures")
 * @returns {Promise<Array>} Kline dizisi (ham API formatı)
 */
async function fetchAll1mKlines(kind, symbol, startMs, endMs, market = "futures") {
  const MAX_LIMIT = 1500; // güvenli üst sınır
  let cur = startMs;
  const out = [];
  let guard = 0;

  while (cur < endMs && guard++ < 10000) {
    let base = "";
    // FUTURES
    if (market === "futures") {
      base =
        kind === "mark"
          ? "https://fapi.binance.com/fapi/v1/markPriceKlines"
          : "https://fapi.binance.com/fapi/v1/klines";
    }
    // SPOT
    else {
      // Spotta Mark Price yok, sadece Last (klines) var.
      // Eğer yanlışlıkla mark istenirse boş dön (veya klines'a yönlendirme yapılabilir ama UI ayırıyor).
      if (kind === "mark") return [];
      base = "https://api.binance.com/api/v3/klines";
    }

    const url =
      `${PROXY}${base}?symbol=${encodeURIComponent(symbol)}` +
      `&interval=1m&startTime=${cur}&endTime=${endMs}&limit=${MAX_LIMIT}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${kind} price data (${market})`);
    const chunk = await res.json();

    if (!Array.isArray(chunk) || !chunk.length) break;

    out.push(...chunk);

    const lastOpen = Number(chunk[chunk.length - 1][0]);
    const next = lastOpen + 60_000;
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
    // Spotta Mark Price yok
    const spotUrl = `${PROXY}https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`;
    const spotRes = await fetch(spotUrl);
    if (!spotRes.ok) throw new Error(`Failed to fetch Spot candle`);
    const spotJson = await spotRes.json();

    return {
      mark: null, // Spotta mark yok
      last: spotJson.length ? parseCandle(spotJson[0]) : null
    };
  }

  // FUTURES Handling (Standard)
  const markUrl = `${PROXY}https://fapi.binance.com/fapi/v1/markPriceKlines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`;
  const markRes = await fetch(markUrl);
  if (!markRes.ok) throw new Error(`Failed to fetch Mark Price candle`);
  const markJson = await markRes.json();

  const lastUrl = `${PROXY}https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`;
  const lastRes = await fetch(lastUrl);
  if (!lastRes.ok) throw new Error(`Failed to fetch Last Price candle`);
  const lastJson = await lastRes.json();

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
    const lastCandles = await fetchAll1mKlines("last", symbol, start, end, "spot");

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
    fetchAll1mKlines("mark", symbol, start, end, "futures"),
    fetchAll1mKlines("last", symbol, start, end, "futures"),
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
  let url = "";
  if (market === "futures") {
    url = `${PROXY}https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}&startTime=${start}&endTime=${end}&limit=1000`;
  } else {
    url = `${PROXY}https://api.binance.com/api/v3/aggTrades?symbol=${symbol}&startTime=${start}&endTime=${end}&limit=1000`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch aggTrades for that second");
  const trades = await res.json();
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
    const url = `${PROXY}https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol.toUpperCase()}&startTime=${targetMs - windowMin * 60_000}&endTime=${targetMs + windowMin * 60_000}&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch fundingRate");
    const rows = await res.json();
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
    const url = `${PROXY}https://fapi.binance.com/fapi/v1/markPriceKlines?symbol=${symbol.toUpperCase()}&interval=1m&startTime=${start}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      return {
        mark_price: parseFloat(data[0][4]),
        close_time: fmtUTC(Number(data[0][6]))
      };
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

  const url = `${PROXY}https://fapi.binance.com/fapi/v1/exchangeInfo`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch exchangeInfo");
  const data = await res.json();

  const map = {};
  for (const s of data.symbols) {
    map[s.symbol] = s.pricePrecision;
  }
  console.log("[getAllSymbolPrecisions] loaded", Object.keys(map).length, "symbols");
  symbolPrecisionCache = map;
  return map;
}

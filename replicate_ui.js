const https = require('https');

// Mocking the environment
const F_BASES = ["https://fapi.binance.com"];
const PROXY = "";

async function fetchWithFallback(bases, path, kind = "") {
    for (const base of bases) {
        const url = `${PROXY}${base}${path}`;
        const res = await new Promise((resolve, reject) => {
            https.get(url, (r) => {
                let d = ''; r.on('data', c => d += c); r.on('end', () => resolve({ ok: r.statusCode === 200, json: () => JSON.parse(d) }));
            }).on('error', reject);
        });
        if (res.ok) return await res.json();
    }
    return [];
}

async function fetchAllKlines(kind, symbol, startMs, endMs, market = "futures", interval = "1m") {
    const MAX_LIMIT = 1500;
    let cur = startMs;
    const out = [];
    let stepMs = 60000;
    while (cur < endMs) {
        const path = kind === "mark" ? "/fapi/v1/markPriceKlines" : "/fapi/v1/klines";
        const fullPath = `${path}?symbol=${symbol}&interval=${interval}&startTime=${cur}&endTime=${endMs}&limit=${MAX_LIMIT}`;
        const chunk = await fetchWithFallback(F_BASES, fullPath, kind);
        if (!Array.isArray(chunk) || !chunk.length) break;
        out.push(...chunk);
        const lastOpen = Number(chunk[chunk.length - 1][0]);
        cur = lastOpen + stepMs;
    }
    return out;
}

function fmtUTC(ms) {
    return new Date(ms).toISOString();
}

async function run() {
    const symbol = 'TAGUSDT';
    const fromStr = '2025-11-06 08:34:13';
    const toStr = '2025-11-06 08:34:45';
    const activationPrice = 0.00054550;
    const callbackRate = 1.0;
    const direction = 'short';
    const priceType = 'mark';

    let startMs = Date.parse(fromStr + "Z");
    let endMs = Date.parse(toStr + "Z");

    const fetchStart = Math.floor(startMs / 60000) * 60000;
    const fetchEnd = Math.ceil(endMs / 60000) * 60000;

    console.log(`Fetching from ${fetchStart} to ${fetchEnd}`);
    const candles = await fetchAllKlines(priceType, symbol, fetchStart, fetchEnd);
    console.log(`Found ${candles.length} candles.`);

    if (candles.length > 0) {
        const c = candles[0];
        const high = parseFloat(c[2]);
        const low = parseFloat(c[3]);
        console.log(`Candle Open Time: ${new Date(c[0]).toISOString()}`);
        console.log(`Candle High: ${high}, Low: ${low}`);
        console.log(`Activation Price: ${activationPrice}`);
        if (high >= activationPrice) {
            console.log("Activation Condition MET");
            const peak = high;
            const triggerP = peak * (1 - callbackRate / 100);
            console.log(`Trigger Price: ${triggerP}`);
            if (low <= triggerP) {
                console.log("Trigger Condition MET");
            }
        }
    }
}

run();

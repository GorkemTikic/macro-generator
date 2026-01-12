const https = require('https');

async function fetchWithFallback(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function check() {
    const symbol = 'TAGUSDT';
    const start = Date.parse('2025-11-06 08:34:00Z');
    const end = start + 60000;

    try {
        const markKlines = await fetchWithFallback(`https://fapi.binance.com/fapi/v1/markPriceKlines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`);
        const lastKlines = await fetchWithFallback(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${end}`);

        console.log('--- 08:34 Candle Data ---');
        console.log('Mark Klines:', markKlines[0]);
        console.log('Last Klines:', lastKlines[0]);

        // Check AggTrades for high precision
        const trades = await fetchWithFallback(`https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}&startTime=${start}&endTime=${end}`);
        console.log(`Total trades in that minute: ${trades.length}`);

        if (trades.length > 0) {
            const high = Math.max(...trades.map(t => parseFloat(t.p)));
            const low = Math.min(...trades.map(t => parseFloat(t.p)));
            console.log(`Last Price Range (Agg): High ${high}, Low ${low}`);
        }
    } catch (e) {
        console.error(e);
    }
}

check();

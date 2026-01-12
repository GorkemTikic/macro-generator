const https = require('https');

async function check() {
    const symbol = 'BTCUSDT';
    // A known historical minute
    const start = 1736704800000; // 2025-01-12 18:00:00 UTC
    const endMid = start + 30000; // 18:00:30
    const endFull = start + 60000; // 18:01:00

    const fetch = (url) => new Promise(r => https.get(url, (res) => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));

    const resMid = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${endMid}`);
    const resFull = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&startTime=${start}&endTime=${endFull}`);

    console.log(`Range to :30 returned ${resMid.length} klines`);
    console.log(`Range to :60 returned ${resFull.length} klines`);
}

check();

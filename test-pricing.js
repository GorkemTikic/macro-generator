import { getTriggerMinuteCandles, getLastPriceAtSecond, getRangeHighLow } from './src/pricing.js';

async function run() {
    try {
        console.log("Testing getRangeHighLow (Added open/close prices):");
        const res3 = await getRangeHighLow("BTCUSDT", "2026-03-21 16:00:00", "2026-03-21 16:05:00", "futures");
        console.log(JSON.stringify(res3, null, 2));

        console.log("\nTesting getLastPriceAtSecond:");
        const res2 = await getLastPriceAtSecond("BTCUSDT", "2026-03-21 16:00:00", "futures");
        console.log(JSON.stringify(res2, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

run();

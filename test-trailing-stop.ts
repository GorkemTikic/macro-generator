// test-trailing-stop.ts
//
// Run with:  npm run test:trailing  (or)  npx tsx test-trailing-stop.ts
//
// Self-contained verification for src/pricing.ts → checkTrailingStop.
// We monkey-patch globalThis.fetch so the test never touches the real
// Binance API. The Last Price BUY test (Test 1) is fed REAL Binance Futures
// aggTrades captured into test-fixtures/aggtrades_clusdt.json — no synthetic
// numbers like 103.58560 or 103.83966 (neither value ever traded).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { checkTrailingStop } from "./src/pricing";

type Kline = [number, string, string, string, string, ...unknown[]]; // [openTime, o, h, l, c, ...]
type AggTrade = { p: string; T: number; q?: string; m?: boolean };

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_CLUSDT_TRADES: AggTrade[] = JSON.parse(
  readFileSync(resolve(HERE, "test-fixtures/aggtrades_clusdt.json"), "utf8"),
);

// ---------------------------------------------------------------------------
// Tiny assertion helpers
// ---------------------------------------------------------------------------
let failures = 0;
function assertEq<T>(actual: T, expected: T, label: string) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✅" : "❌"} ${label}: ${ok ? "ok" : `expected ${expected!}, got ${actual!}`}`);
  if (!ok) failures++;
}
function assertClose(actual: number, expected: number, eps: number, label: string) {
  const ok = Math.abs(actual - expected) <= eps;
  console.log(`  ${ok ? "✅" : "❌"} ${label}: ${ok ? `ok (${actual} ≈ ${expected})` : `expected ≈${expected} ±${eps}, got ${actual}`}`);
  if (!ok) failures++;
}
function assertMatch(actual: string | null, regex: RegExp, label: string) {
  const ok = actual != null && regex.test(actual);
  console.log(`  ${ok ? "✅" : "❌"} ${label}: ${ok ? `ok (${actual})` : `expected ${regex}, got ${actual}`}`);
  if (!ok) failures++;
}
function assertTrue(actual: boolean, label: string) {
  console.log(`  ${actual ? "✅" : "❌"} ${label}: ${actual ? "ok" : "expected true, got false"}`);
  if (!actual) failures++;
}
function assertFalse(actual: boolean, label: string) {
  console.log(`  ${!actual ? "✅" : "❌"} ${label}: ${!actual ? "ok" : "expected false, got true"}`);
  if (actual) failures++;
}

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------
function ts(s: string): number {
  return Date.parse(s + "Z");
}
function k1m(openTimeMs: number, o: number, h: number, l: number, c: number): Kline {
  return [openTimeMs, String(o), String(h), String(l), String(c)];
}

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------
type Route = (url: URL) => unknown | undefined;
function installFetch(routes: Route[]) {
  (globalThis as any).fetch = async (input: any) => {
    const u = new URL(typeof input === "string" ? input : input.url);
    for (const r of routes) {
      const out = r(u);
      if (out !== undefined) {
        return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ error: "no_route_match", path: u.pathname + u.search }), { status: 404 });
  };
}

// ---------------------------------------------------------------------------
// Test 1 — Last Price BUY (CLUSDT, REAL aggTrades from Binance)
// ---------------------------------------------------------------------------
async function testLastPriceBuyReal() {
  console.log("\nTEST 1: Last Price BUY trailing — CLUSDT real aggTrades fixture");

  let oneSecondKlineCalls = 0;
  let aggTradeCalls = 0;

  installFetch([
    (u) => {
      // For Futures Last Price the new code path MUST NOT call /fapi/v1/klines
      // (Binance Futures does not support interval=1s). If this route ever
      // matches, the assertion at the end will fail.
      if (u.pathname === "/fapi/v1/klines") {
        oneSecondKlineCalls++;
        return [];
      }
      return undefined;
    },
    (u) => {
      if (u.pathname === "/fapi/v1/aggTrades") {
        aggTradeCalls++;
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return REAL_CLUSDT_TRADES.filter(t => t.T >= s && t.T <= e);
      }
      return undefined;
    },
  ]);

  // Real CLUSDT trailing stop case:
  //   activation 103.86, callback 0.25%, BUY trailing (closes a SHORT)
  //   user window: 2026-05-01 12:12:17 → 12:13:07 UTC (the bug-report window)
  const fromStr = "2026-05-01 12:12:17";
  const toStr = "2026-05-01 12:13:07";
  const fromMs = ts(fromStr);
  const toMs = ts(toStr);
  const toInclusiveMs = Math.floor(toMs / 1000) * 1000 + 999;

  const data = await checkTrailingStop("CLUSDT", fromStr, toStr, 103.86, 0.25, "long", "futures", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "last", "dataSource === last");
  assertEq(data.granularity, "aggTrades", "granularity === aggTrades (Futures Last Price)");
  assertEq(data.fellBackTo1m, false, "fellBackTo1m === false");
  assertEq(data.isApproximate, false, "isApproximate === false (tick precision)");
  assertMatch(data.dataSourceLabel, /aggTrades, tick precision/, "dataSourceLabel mentions tick precision");

  // The new path skips 1s klines entirely on Futures; aggTrades MUST be the
  // only price source the algorithm hits.
  assertEq(oneSecondKlineCalls, 0, "Futures Last Price never calls /fapi/v1/klines");
  assertTrue(aggTradeCalls > 0, "aggTrades was queried at least once");

  // Activation: first tick whose price ≤ 103.86 after `from`. In the captured
  // tape that is 2026-05-01 12:12:26.062 at 103.86.
  assertMatch(data.activationTime, /2026-05-01 12:12:26/, "activationTime is 12:12:26");
  assertClose(data.activationPriceObserved as number, 103.86, 1e-6, "activation observed price = 103.86");

  // True trough = 103.58 flat at 12:13:07.615 UTC. Note: 103.58560 NEVER
  // appears in the tape and must not be asserted anywhere.
  assertClose(data.peakPrice as number, 103.58, 1e-6, "True trough = 103.58 (flat, not 103.58560)");
  assertMatch(data.peakTime, /2026-05-01 12:13:07/, "trough timestamp is 12:13:07 (real tick at .615)");
  assertEq(data.peakTs, ts("2026-05-01 12:13:07") + 615, "trough ms timestamp = 12:13:07.615");

  // Required threshold = 103.58 × 1.0025 = 103.83895.
  assertClose(data.triggerPrice as number, 103.58 * 1.0025, 1e-6, "trigger threshold = 103.58 × 1.0025 = 103.83895");

  // First trade ≥ threshold = 103.84 at 12:13:07.660 UTC (a real aggTrade).
  // 103.83966 NEVER traded and must not appear.
  assertClose(data.triggerObservedPrice as number, 103.84, 1e-6, "first crossing trade = 103.84 (real tick)");
  assertMatch(data.triggerTime, /2026-05-01 12:13:07/, "trigger timestamp is 12:13:07");
  assertEq(data.triggerTs, ts("2026-05-01 12:13:07") + 660, "trigger ms timestamp = 12:13:07.660");

  // Window-boundary safety: every result timestamp must fall inside [from, to].
  assertTrue((data.activationTs as number) >= fromMs, "activationTs >= From");
  assertTrue((data.activationTs as number) <= toInclusiveMs, "activationTs <= To (inclusive of second)");
  assertTrue((data.peakTs as number) <= toInclusiveMs, "peakTs <= To");
  assertTrue((data.triggerTs as number) <= toInclusiveMs, "triggerTs <= To");
}

// ---------------------------------------------------------------------------
// Test 2 — Mark Price BUY (only 1m available, must flag approximate)
// ---------------------------------------------------------------------------
async function testMarkPriceBuy() {
  console.log("\nTEST 2: Mark Price BUY trailing — granularity must be 1m + approximate flag");

  const candles: Kline[] = [
    // 12:11 — high 104.05, low 103.95 (no activation yet)
    k1m(ts("2026-05-01 12:11:00"), 104.00, 104.05, 103.95, 104.00),
    // 12:12 — low touches 103.85 (activates, since 103.85 ≤ 103.86). Trough = 103.85.
    k1m(ts("2026-05-01 12:12:00"), 104.00, 104.05, 103.85, 103.90),
    // 12:13 — trough drops to 103.58. High inside this candle is 103.83 (just under
    //         103.58 × 1.0025 = 103.83895), so rebound 0.241% < 0.25% → no trigger.
    k1m(ts("2026-05-01 12:13:00"), 103.83, 103.83, 103.58, 103.83),
    // 12:14 — trough still 103.58 but high reaches 103.97 (rebound 0.376% → trigger).
    k1m(ts("2026-05-01 12:14:00"), 103.83, 103.97, 103.58, 103.95),
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/markPriceKlines") {
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return candles.filter(c => c[0] >= s && c[0] < e);
      }
      return undefined;
    },
  ]);

  const data = await checkTrailingStop("CLUSDT", "2026-05-01 12:10:00", "2026-05-01 12:15:00", 103.86, 0.25, "long", "futures", "mark");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "mark", "dataSource === mark");
  assertEq(data.granularity, "1m", "granularity === 1m");
  assertEq(data.isApproximate, true, "isApproximate === true (Mark always approx)");
  assertEq(data.fellBackTo1m, false, "fellBackTo1m === false (Mark, not a fallback)");
  // CONSERVATIVE ordering for BUY: trough updates from candle low first,
  // then trigger probe uses candle high. 12:14 high (103.97) crosses
  // threshold 103.58 × 1.0025 = 103.83895.
  assertClose(data.peakPrice as number, 103.58, 1e-6, "trough = 103.58");
  assertMatch(data.peakTime, /2026-05-01 12:1(3|4):00/, "peakTime is 12:13 or 12:14");
  assertMatch(data.triggerTime, /2026-05-01 12:14:00/, "triggerTime is 12:14:00 (1m resolution)");
  assertClose(data.triggerPrice as number, 103.58 * 1.0025, 1e-4, "triggerPrice = 103.58 × 1.0025");
}

// ---------------------------------------------------------------------------
// Test 3 — Last Price SELL (futures, aggTrades — track peak, trigger on drop)
// ---------------------------------------------------------------------------
async function testLastPriceSellAggTrades() {
  console.log("\nTEST 3: Last Price SELL trailing (Futures, aggTrades)");

  // Activation 100.00, callback 0.30%, direction SHORT (sell trailing).
  // Trigger threshold = peak × (1 − 0.003).
  const trades: AggTrade[] = [
    // Pre-activation
    { p: "99.50", T: ts("2026-05-01 10:00:00") + 100 },
    { p: "99.80", T: ts("2026-05-01 10:04:50") + 200 },
    // Activation: first trade ≥ 100.00
    { p: "100.00", T: ts("2026-05-01 10:05:00") + 50 },
    // Climb to peak 101.00
    { p: "100.50", T: ts("2026-05-01 10:05:10") + 100 },
    { p: "100.85", T: ts("2026-05-01 10:05:20") + 100 },
    { p: "101.00", T: ts("2026-05-01 10:05:30") + 250 }, // peak
    // Pull back; threshold = 101.00 × 0.997 = 100.697
    { p: "100.85", T: ts("2026-05-01 10:05:31") + 100 },
    { p: "100.75", T: ts("2026-05-01 10:05:32") + 100 },
    { p: "100.69", T: ts("2026-05-01 10:05:33") + 400 }, // first trade ≤ 100.697
    { p: "100.55", T: ts("2026-05-01 10:05:34") + 100 },
  ];

  let oneSecondKlineCalls = 0;
  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/klines") {
        oneSecondKlineCalls++;
        return [];
      }
      return undefined;
    },
    (u) => {
      if (u.pathname === "/fapi/v1/aggTrades") {
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return trades.filter(t => t.T >= s && t.T <= e);
      }
      return undefined;
    },
  ]);

  const data = await checkTrailingStop("XYZUSDT", "2026-05-01 10:00:00", "2026-05-01 10:06:00", 100.00, 0.30, "short", "futures", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "last", "dataSource === last");
  assertEq(data.granularity, "aggTrades", "granularity === aggTrades");
  assertEq(oneSecondKlineCalls, 0, "Futures SELL never calls /fapi/v1/klines");
  assertClose(data.peakPrice as number, 101.00, 1e-6, "True peak = 101.00");
  assertMatch(data.activationTime, /2026-05-01 10:05:00/, "activationTime is 10:05:00");
  assertMatch(data.triggerTime, /2026-05-01 10:05:33/, "triggerTime is 10:05:33");
  assertClose(data.triggerPrice as number, 101.00 * 0.997, 1e-6, "triggerPrice = 101.00 × 0.997 = 100.697");
  assertClose(data.triggerObservedPrice as number, 100.69, 1e-6, "first crossing tick = 100.69");
}

// ---------------------------------------------------------------------------
// Test 4 — Mark Price SELL (1m only)
// ---------------------------------------------------------------------------
async function testMarkPriceSell() {
  console.log("\nTEST 4: Mark Price SELL trailing — 1m only, approximate flag");

  // peak=101.00 → trigger threshold = 101.00 × 0.997 = 100.697. Build candles
  // so the peak settles in 10:05 but the drop below 100.697 only happens in 10:07.
  const candles: Kline[] = [
    k1m(ts("2026-05-01 10:04:00"), 99.50, 99.60, 99.40, 99.50),
    // 10:05 — activation (open ≥ 100). Peak rises to 101.00. Low within the candle
    //         is 100.70 (still > 100.697), so no trigger inside this candle.
    k1m(ts("2026-05-01 10:05:00"), 100.70, 101.00, 100.70, 100.95),
    // 10:06 — drifts inside the safe band (low 100.80 still > 100.697).
    k1m(ts("2026-05-01 10:06:00"), 100.95, 100.95, 100.80, 100.85),
    // 10:07 — low 100.50 < 100.697 → trigger.
    k1m(ts("2026-05-01 10:07:00"), 100.85, 100.85, 100.50, 100.55),
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/markPriceKlines") {
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return candles.filter(c => c[0] >= s && c[0] < e);
      }
      return undefined;
    },
  ]);

  const data = await checkTrailingStop("XYZUSDT", "2026-05-01 10:03:00", "2026-05-01 10:08:00", 100.00, 0.30, "short", "futures", "mark");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.granularity, "1m", "granularity === 1m");
  assertEq(data.isApproximate, true, "isApproximate === true");
  assertClose(data.peakPrice as number, 101.00, 1e-6, "peak = 101.00 (from 10:05 candle high)");
  assertMatch(data.triggerTime, /2026-05-01 10:07:00/, "triggerTime is 10:07:00 (1m bucket)");
  assertClose(data.triggerPrice as number, 101.00 * 0.997, 1e-4, "triggerPrice = 101.00 × 0.997");
}

// ---------------------------------------------------------------------------
// Test 5 — Futures Last Price MUST NOT call /fapi/v1/klines (any interval)
// ---------------------------------------------------------------------------
async function testFuturesNeverCallsKlines() {
  console.log("\nTEST 5: Futures Last Price never calls /fapi/v1/klines (1s is unsupported)");

  let klineCalls = 0;
  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/klines") {
        klineCalls++;
        return [];
      }
      return undefined;
    },
    (u) => {
      if (u.pathname === "/fapi/v1/aggTrades") {
        // Cheap synthetic tape: just enough to activate + trigger.
        return [
          { p: "104.00", T: ts("2026-05-01 12:12:25") + 0 },
          { p: "103.86", T: ts("2026-05-01 12:12:26") + 0 },
          { p: "103.58", T: ts("2026-05-01 12:13:03") + 0 },
          { p: "103.84", T: ts("2026-05-01 12:13:07") + 0 },
        ];
      }
      return undefined;
    },
  ]);

  const data = await checkTrailingStop("CLUSDT", "2026-05-01 12:12:17", "2026-05-01 12:13:07", 103.86, 0.25, "long", "futures", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "last", "dataSource === last");
  assertEq(data.granularity, "aggTrades", "granularity === aggTrades");
  assertEq(klineCalls, 0, "ZERO klines calls for Futures Last Price (no dead 1s round-trip)");
  assertEq(data.fellBackTo1m, false, "fellBackTo1m === false");
}

// ---------------------------------------------------------------------------
// Test 6 — Last Price strict To boundary (Futures, aggTrades)
// ---------------------------------------------------------------------------
async function testLastWindowBoundary() {
  console.log("\nTEST 6: Last Price boundary — ignore ticks after user-supplied To");

  const trades: AggTrade[] = [
    { p: "104.00", T: ts("2026-05-01 12:12:26") + 0 },
    { p: "103.86", T: ts("2026-05-01 12:12:26") + 50 }, // activation
    { p: "103.80", T: ts("2026-05-01 12:13:00") + 100 },
    { p: "103.70", T: ts("2026-05-01 12:13:00") + 500 }, // trough inside window
    { p: "103.78", T: ts("2026-05-01 12:13:07") + 100 },
    // The route below would normally be ignored (after To). The mock would
    // include it if the algorithm asked for trades past the boundary; the mock
    // filters by startTime/endTime so it should never get returned anyway.
    { p: "102.60", T: ts("2026-05-01 12:14:00") + 100 },
    { p: "104.00", T: ts("2026-05-01 12:14:30") + 100 },
  ];

  installFetch([
    (u) => (u.pathname === "/fapi/v1/klines" ? [] : undefined),
    (u) => {
      if (u.pathname === "/fapi/v1/aggTrades") {
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return trades.filter(t => t.T >= s && t.T <= e);
      }
      return undefined;
    },
  ]);

  const fromStr = "2026-05-01 12:12:17";
  const toStr = "2026-05-01 12:13:07";
  const toMs = ts(toStr);
  const toInclusiveMs = Math.floor(toMs / 1000) * 1000 + 999;
  const data = await checkTrailingStop("CLUSDT", fromStr, toStr, 103.86, 0.25, "long", "futures", "last");

  assertEq(data.status, "activated_no_trigger", "status === activated_no_trigger (rebound 0.077% < 0.25%)");
  assertClose(data.peakPrice as number, 103.70, 1e-6, "trough = 103.70 (the post-To 102.60 must be ignored)");
  assertTrue((data.activationTs as number) <= toInclusiveMs, "activation timestamp is inside window");
  assertTrue((data.peakTs as number) <= toInclusiveMs, "trough timestamp is inside window");
  assertTrue(data.triggerTs == null, "no trigger timestamp outside To");
}

// ---------------------------------------------------------------------------
// Test 7 — Mark Price strict To boundary
// ---------------------------------------------------------------------------
async function testMarkWindowBoundary() {
  console.log("\nTEST 7: Mark Price boundary — ignore 1m candles after To");

  const candles: Kline[] = [
    k1m(ts("2026-05-01 12:12:00"), 104.00, 104.00, 103.86, 103.90),
    k1m(ts("2026-05-01 12:13:00"), 103.90, 103.80, 103.70, 103.78),
    // If this leaks in, the old code would report a 12:14 trough/trigger.
    k1m(ts("2026-05-01 12:14:00"), 103.78, 102.90, 102.60, 102.85),
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/markPriceKlines") {
        return candles; // Intentionally return out-of-window data.
      }
      return undefined;
    },
  ]);

  const toMs = ts("2026-05-01 12:13:07");
  const data = await checkTrailingStop("CLUSDT", "2026-05-01 12:12:17", "2026-05-01 12:13:07", 103.86, 0.25, "long", "futures", "mark");

  assertEq(data.status, "activated_no_trigger", "status === activated_no_trigger");
  assertEq(data.granularity, "1m", "granularity === 1m");
  assertTrue(!!data.markWarning, "Mark Price warning is present");
  assertClose(data.peakPrice as number, 103.70, 1e-6, "trough ignores 12:14 mark candle");
  assertTrue((data.activationTs as number) <= toMs + 999, "activation timestamp is inside window");
  assertTrue(data.triggerTs == null, "no trigger timestamp outside To");
}

// ---------------------------------------------------------------------------
// Test 8 — Spot Last Price still uses 1s klines (Spot supports interval=1s)
// ---------------------------------------------------------------------------
async function testSpotStillUses1sKlines() {
  console.log("\nTEST 8: Spot Last Price still attempts /api/v3/klines interval=1s");

  let oneSecondKlineCalls = 0;
  const candles: Kline[] = [
    [ts("2026-05-01 10:05:00"), "99.95", "100.00", "99.95", "100.00"],
    [ts("2026-05-01 10:05:30"), "100.50", "101.00", "100.50", "101.00"],
    [ts("2026-05-01 10:05:33"), "101.00", "101.00", "100.69", "100.69"],
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/api/v3/klines" && u.searchParams.get("interval") === "1s") {
        oneSecondKlineCalls++;
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return candles.filter(c => c[0] >= s && c[0] < e);
      }
      return undefined;
    },
    (u) => (u.pathname === "/api/v3/aggTrades" ? [] : undefined),
  ]);

  const data = await checkTrailingStop("XYZUSDT", "2026-05-01 10:00:00", "2026-05-01 10:06:00", 100.00, 0.30, "short", "spot", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.granularity, "1s", "granularity === 1s (Spot path preserved)");
  assertTrue(oneSecondKlineCalls > 0, "Spot Last Price DID call /api/v3/klines interval=1s");
  assertMatch(data.dataSourceLabel, /1s klines/, "dataSourceLabel mentions 1s klines (Spot)");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
(async () => {
  console.log("=== Trailing Stop algorithm tests ===");
  await testLastPriceBuyReal();
  await testMarkPriceBuy();
  await testLastPriceSellAggTrades();
  await testMarkPriceSell();
  await testFuturesNeverCallsKlines();
  await testLastWindowBoundary();
  await testMarkWindowBoundary();
  await testSpotStillUses1sKlines();

  console.log(`\n${failures === 0 ? "✅ All assertions passed" : `❌ ${failures} assertion(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
})();

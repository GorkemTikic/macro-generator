// test-trailing-stop.ts
//
// Run with:  npm run test:trailing  (or)  npx tsx test-trailing-stop.ts
//
// Self-contained verification for src/pricing.ts → checkTrailingStop.
// We monkey-patch globalThis.fetch so the test never touches the real
// Binance API, then assert that the algorithm returns the expected
// trough/peak/trigger for both LAST and MARK price flows.
//
// Reference case (CLUSDT, 2026-05-01): activation 103.86, callback 0.25%,
// direction LONG (buy trailing → closes a SHORT). Real chart truth verified
// on TradingView 1s:
//   - Activation reached at 12:12:26 (price drops to 103.86)
//   - Trough 103.58560 around 12:13:03–12:13:05
//   - Trigger at 12:13:07 with price ~103.83966 (= 103.58560 × 1.0025)

import { checkTrailingStop } from "./src/pricing";

type Kline = [number, string, string, string, string, ...unknown[]]; // [openTime, o, h, l, c, ...]

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

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------
function ts(s: string): number {
  return Date.parse(s + "Z");
}

/**
 * Build a 1s kline for [openTimeMs, openTimeMs+1000) with given OHLC.
 * Binance returns volume etc. but our parser only reads indices 0–4.
 */
function k1s(openTimeMs: number, o: number, h: number, l: number, c: number): Kline {
  return [openTimeMs, String(o), String(h), String(l), String(c)];
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
// Test 1 — Last Price BUY (the CLUSDT bug case)
// ---------------------------------------------------------------------------
async function testLastPriceBuy() {
  console.log("\nTEST 1: Last Price BUY trailing — CLUSDT exact user window");

  const start = ts("2026-05-01 11:55:00");
  // Build a 20-minute window of 1s candles. The relevant slice:
  //   12:12:26 — first second whose low touches 103.86 (activation)
  //   12:13:03 — low reaches 103.58560 (trough)
  //   12:13:07 — high reaches 103.83966 (trigger)
  const candles: Kline[] = [];
  // From 11:55 → 12:12:25 price floats around 104.10 (no activation)
  for (let t = start; t < ts("2026-05-01 12:12:26"); t += 1000) {
    candles.push(k1s(t, 104.10, 104.12, 104.08, 104.10));
  }
  // 12:12:26 — drops to 103.86 (activation)
  candles.push(k1s(ts("2026-05-01 12:12:26"), 104.05, 104.05, 103.86, 103.86));
  // 12:12:27 → 12:13:02 — slow drift down to 103.65
  let p = 103.86;
  for (let t = ts("2026-05-01 12:12:27"); t < ts("2026-05-01 12:13:03"); t += 1000) {
    const next = Math.max(103.65, p - 0.005);
    candles.push(k1s(t, p, p, next, next));
    p = next;
  }
  // 12:13:03 — punches the trough at 103.58560
  candles.push(k1s(ts("2026-05-01 12:13:03"), p, p, 103.58560, 103.58560));
  // 12:13:04 → 12:13:06 — bounces up but not enough yet
  candles.push(k1s(ts("2026-05-01 12:13:04"), 103.58560, 103.65, 103.58560, 103.65));
  candles.push(k1s(ts("2026-05-01 12:13:05"), 103.65, 103.75, 103.65, 103.75));
  candles.push(k1s(ts("2026-05-01 12:13:06"), 103.75, 103.83, 103.75, 103.83));
  // 12:13:07 — high crosses 103.83966 → triggers
  candles.push(k1s(ts("2026-05-01 12:13:07"), 103.83, 103.86, 103.83, 103.85));
  // 12:13:08 → 12:14:00 (filler so the algorithm has data past the trigger)
  for (let t = ts("2026-05-01 12:13:08"); t <= ts("2026-05-01 12:14:00"); t += 1000) {
    candles.push(k1s(t, 103.85, 103.90, 103.80, 103.88));
  }

  // The aggTrade refinement window pulls trades for [peakTs, triggerTs+1999].
  // Provide ticks for 12:13:03 → 12:13:08 with the actual cross at 12:13:07.
  const trades = [
    { p: "103.58560", T: ts("2026-05-01 12:13:03") + 200 },
    { p: "103.60000", T: ts("2026-05-01 12:13:03") + 800 },
    { p: "103.65000", T: ts("2026-05-01 12:13:04") + 100 },
    { p: "103.75000", T: ts("2026-05-01 12:13:05") + 500 },
    { p: "103.83000", T: ts("2026-05-01 12:13:06") + 900 },
    { p: "103.83900", T: ts("2026-05-01 12:13:07") + 50 },
    { p: "103.83966", T: ts("2026-05-01 12:13:07") + 350 }, // <— the crossing tick
    { p: "103.85000", T: ts("2026-05-01 12:13:07") + 700 },
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/klines" && u.searchParams.get("interval") === "1s") {
        const startQ = Number(u.searchParams.get("startTime"));
        const endQ = Number(u.searchParams.get("endTime"));
        return candles.filter(c => c[0] >= startQ && c[0] < endQ).slice(0, 1500);
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

  const data = await checkTrailingStop("CLUSDT", "2026-05-01 11:52:17", "2026-05-01 12:13:07", 103.86, 0.25, "long", "futures", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "last", "dataSource === last");
  assertEq(data.granularity, "1s", "granularity === 1s");
  assertEq(data.fellBackTo1m, false, "fellBackTo1m === false");
  assertEq(data.isApproximate, false, "isApproximate === false");
  assertMatch(data.activationTime, /2026-05-01 12:12:26/, "activationTime starts at 12:12:26");
  assertClose(data.peakPrice as number, 103.58560, 1e-6, "trough = 103.58560");
  assertMatch(data.peakTime, /2026-05-01 12:13:03/, "peakTime is 12:13:03");
  assertMatch(data.triggerTime, /2026-05-01 12:13:07/, "triggerTime is 12:13:07");
  assertClose(data.triggerPrice as number, 103.58560 * 1.0025, 1e-4, "triggerPrice ≈ 103.58560 × 1.0025");
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
  // CONSERVATIVE ordering for BUY = [o, l, h, cl]:
  //   12:14 candle: o=103.83 → l=103.58 (trough updates to 103.58) → h=103.97 (dev=0.336% ≥ 0.25%, trigger).
  assertClose(data.peakPrice as number, 103.58, 1e-6, "trough = 103.58");
  assertMatch(data.peakTime, /2026-05-01 12:1(3|4):00/, "peakTime is 12:13 or 12:14");
  assertMatch(data.triggerTime, /2026-05-01 12:14:00/, "triggerTime is 12:14:00 (1m resolution)");
  assertClose(data.triggerPrice as number, 103.58 * 1.0025, 1e-4, "triggerPrice = 103.58 × 1.0025");
}

// ---------------------------------------------------------------------------
// Test 3 — Last Price SELL (mirror logic — track peak)
// ---------------------------------------------------------------------------
async function testLastPriceSell() {
  console.log("\nTEST 3: Last Price SELL trailing (mirror) — track peak, trigger on drop");

  // Activation 100.00, callback 0.30%, direction SHORT (sell trailing).
  // Activation when price ≥ 100.00. Then track peak. Trigger when price drops
  // by 0.30% from peak.
  const candles: Kline[] = [];
  // Pre-activation: price hovers at 99.50
  for (let t = ts("2026-05-01 10:00:00"); t < ts("2026-05-01 10:05:00"); t += 1000) {
    candles.push(k1s(t, 99.50, 99.55, 99.45, 99.50));
  }
  // 10:05:00 — punches through 100.00 (activation)
  candles.push(k1s(ts("2026-05-01 10:05:00"), 99.95, 100.00, 99.95, 100.00));
  // 10:05:01 → 10:05:30 — climbs to 101.00 (peak)
  let cur = 100.00;
  for (let t = ts("2026-05-01 10:05:01"); t < ts("2026-05-01 10:05:31"); t += 1000) {
    const next = Math.min(101.00, cur + 0.04);
    candles.push(k1s(t, cur, next, cur, next));
    cur = next;
  }
  // 10:05:31 onwards — pulls back. Peak = 101.00, trigger at 101.00 × 0.997 = 100.697.
  candles.push(k1s(ts("2026-05-01 10:05:31"), 101.00, 101.00, 100.85, 100.85));
  candles.push(k1s(ts("2026-05-01 10:05:32"), 100.85, 100.85, 100.75, 100.75));
  candles.push(k1s(ts("2026-05-01 10:05:33"), 100.75, 100.75, 100.69, 100.69)); // triggers (100.69 < 100.697)
  for (let t = ts("2026-05-01 10:05:34"); t <= ts("2026-05-01 10:06:00"); t += 1000) {
    candles.push(k1s(t, 100.69, 100.70, 100.60, 100.65));
  }

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/klines" && u.searchParams.get("interval") === "1s") {
        const s = Number(u.searchParams.get("startTime"));
        const e = Number(u.searchParams.get("endTime"));
        return candles.filter(c => c[0] >= s && c[0] < e).slice(0, 1500);
      }
      return undefined;
    },
    (u) => (u.pathname === "/fapi/v1/aggTrades" ? [] : undefined),
  ]);

  const data = await checkTrailingStop("XYZUSDT", "2026-05-01 10:00:00", "2026-05-01 10:06:00", 100.00, 0.30, "short", "futures", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "last", "dataSource === last");
  assertEq(data.granularity, "1s", "granularity === 1s");
  assertClose(data.peakPrice as number, 101.00, 1e-6, "peak = 101.00");
  assertMatch(data.activationTime, /2026-05-01 10:05:00/, "activationTime is 10:05:00");
  assertMatch(data.triggerTime, /2026-05-01 10:05:33/, "triggerTime is 10:05:33");
  assertClose(data.triggerPrice as number, 101.00 * 0.997, 1e-4, "triggerPrice = 101.00 × 0.997 = 100.697");
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
// Test 5 — Last Price falls back to aggTrades, never 1m
// ---------------------------------------------------------------------------
async function testLastAggTradesFallback() {
  console.log("\nTEST 5: Last Price → 1s empty → aggTrades fallback, never 1m");

  let oneMinuteKlineCalls = 0;
  const trades = [
    { p: "104.10000", T: ts("2026-05-01 12:12:25") },
    { p: "103.86000", T: ts("2026-05-01 12:12:26") },
    { p: "103.58560", T: ts("2026-05-01 12:13:03") },
    { p: "103.83000", T: ts("2026-05-01 12:13:06") },
    { p: "103.84457", T: ts("2026-05-01 12:13:07") },
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/klines" && u.searchParams.get("interval") === "1s") {
        return [];
      }
      if (u.pathname === "/fapi/v1/klines" && u.searchParams.get("interval") === "1m") {
        oneMinuteKlineCalls++;
        return [
          k1m(ts("2026-05-01 12:14:00"), 103.80, 103.90, 102.60, 102.85),
        ];
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

  const data = await checkTrailingStop("CLUSDT", "2026-05-01 12:12:17", "2026-05-01 12:13:07", 103.86, 0.25, "long", "futures", "last");

  assertEq(data.status, "triggered", "status === triggered");
  assertEq(data.dataSource, "last", "dataSource === last");
  assertEq(data.granularity, "aggTrades", "granularity === aggTrades");
  assertEq(data.fellBackTo1m, false, "fellBackTo1m === false");
  assertEq(data.isApproximate, false, "isApproximate === false");
  assertEq(oneMinuteKlineCalls, 0, "Last Price never calls 1m klines");
  assertMatch(data.activationTime, /2026-05-01 12:12:26/, "activationTime is 12:12:26");
  assertMatch(data.triggerTime, /2026-05-01 12:13:07/, "triggerTime is 12:13:07");
  assertClose(data.peakPrice as number, 103.58560, 1e-6, "trough = 103.58560");
}

// ---------------------------------------------------------------------------
// Test 6 — Last Price strict To boundary
// ---------------------------------------------------------------------------
async function testLastWindowBoundary() {
  console.log("\nTEST 6: Last Price boundary — ignore data after user-supplied To");

  const candles: Kline[] = [
    k1s(ts("2026-05-01 12:12:26"), 104.00, 104.00, 103.86, 103.86),
    k1s(ts("2026-05-01 12:13:00"), 103.86, 103.86, 103.70, 103.75),
    k1s(ts("2026-05-01 12:13:07"), 103.75, 103.80, 103.72, 103.78),
    // This is the bad candle that caused the original 12:14 leak.
    k1s(ts("2026-05-01 12:14:00"), 103.78, 102.90, 102.60, 102.85),
  ];

  installFetch([
    (u) => {
      if (u.pathname === "/fapi/v1/klines" && u.searchParams.get("interval") === "1s") {
        return candles; // Intentionally return out-of-window data.
      }
      return undefined;
    },
    (u) => (u.pathname === "/fapi/v1/aggTrades" ? [] : undefined),
  ]);

  const toMs = ts("2026-05-01 12:13:07");
  const data = await checkTrailingStop("CLUSDT", "2026-05-01 12:12:17", "2026-05-01 12:13:07", 103.86, 0.25, "long", "futures", "last");

  assertEq(data.status, "activated_no_trigger", "status === activated_no_trigger");
  assertClose(data.peakPrice as number, 103.70, 1e-6, "trough ignores 12:14 low");
  assertTrue((data.activationTs as number) <= toMs + 999, "activation timestamp is inside window");
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
// Run
// ---------------------------------------------------------------------------
(async () => {
  console.log("=== Trailing Stop algorithm tests ===");
  await testLastPriceBuy();
  await testMarkPriceBuy();
  await testLastPriceSell();
  await testMarkPriceSell();
  await testLastAggTradesFallback();
  await testLastWindowBoundary();
  await testMarkWindowBoundary();

  console.log(`\n${failures === 0 ? "✅ All assertions passed" : `❌ ${failures} assertion(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
})();

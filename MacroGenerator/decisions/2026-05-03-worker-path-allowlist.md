---
title: Explicit string-list path allowlist on the Worker proxy (not regex/glob)
tags: [decision, security, worker]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: active
---

# Decision: Explicit string-list path allowlist on the Worker proxy

## Context

Pre-fix, the Worker proxy forwarded *any* path under `/fapi/*`,
`/api/*`, or `/sapi/*` to Binance. To close the
open-proxy hole (see
[[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]]) we
needed an allowlist.

Possible shapes:

1. **Explicit string list** — `if (!FAPI_PATH_ALLOW.includes(url.pathname)) return 403;`
2. **Regex** — `/^\/fapi\/v1\/(klines|markPriceKlines|aggTrades|premiumIndex|fundingRate|exchangeInfo)$/`
3. **Glob/prefix matcher** — `if (!path.startsWith('/fapi/v1/') || forbidden.some(p => path === p)) return 403;`

## Decision

Option 1 — three explicit string arrays at module top:

```ts
const FAPI_PATH_ALLOW = [
  '/fapi/v1/klines',
  '/fapi/v1/markPriceKlines',
  '/fapi/v1/aggTrades',
  '/fapi/v1/premiumIndex',
  '/fapi/v1/fundingRate',
  '/fapi/v1/exchangeInfo',
];
const SPOT_PATH_ALLOW = [...];
const SAPI_PATH_ALLOW = [...];
```

Each handler does `if (!ALLOW.includes(url.pathname)) return 403`.

## Rationale

- **Auditability**: the list of permitted endpoints is six lines you
  can read in one screen. A future agent doesn't need to mentally
  evaluate a regex to know what's allowed.
- **No regex gotchas**: `^/fapi/v1/klines$` doesn't accept a trailing
  slash, but `/fapi/v1/klines/` would. `\?` would have to be
  escape-aware. The string compare avoids all of this.
- **Adding a new endpoint is one literal**: copy the URL from the
  Binance docs into the array. Reviewers immediately see what's
  changed.
- **No false positives**: a regex like `^/fapi/v1/[a-z]+$` accidentally
  whitelists every endpoint that fits the shape. A list does not.

## Trade-off

- The list becomes ~12 entries if we ever cover most of `/fapi/v1/*`.
  That's still readable. If it grows past 30, revisit.
- Subpath endpoints (e.g. hypothetical `/fapi/v1/klines/{symbol}`)
  would need each variant listed. Binance's REST API doesn't currently
  use this shape, so OK.

## Validation

Today the frontend only calls these endpoints. Confirmed by grepping
the client code for `/fapi/`, `/api/v3/`, `/sapi/`:

- `/fapi/v1/klines` — `pricing.ts` `fetchAllKlines`
- `/fapi/v1/markPriceKlines` — `pricing.ts` `getTriggerMinuteCandles`,
  `fetchAllKlines`, `getMarkPriceClose1m`
- `/fapi/v1/aggTrades` — `pricing.ts` `getLastPriceAtSecond`,
  `findMatchInAggTrades`
- `/fapi/v1/premiumIndex` — `LiveTicker` fallback poll
- `/fapi/v1/fundingRate` — `pricing.ts` `getNearestFunding`
- `/fapi/v1/exchangeInfo` — `pricing.ts` `getAllSymbolPrecisions`

If a future feature needs a new endpoint, it must add a literal to the
list — that act is reviewable in PR.

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[bugs/2026-05-03-worker-open-binance-proxy-and-track-payload]]
- [[entities/analytics-system]]
- [[entities/binance-fapi]]
- [[entities/binance-sapi-margin]]
- [[decisions/2026-04-27-worker-as-binance-cors-proxy]]

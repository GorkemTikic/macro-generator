---
title: Dedicated /admin/export endpoint instead of lifting /admin/events cap
tags: [decision, analytics, backend, cloudflare-workers, d1]
source: worker/index.ts
date: 2026-04-26
status: active
---

# Dedicated `/admin/export` endpoint instead of lifting `/admin/events` cap

## Decision

Add a new `GET /admin/export` route to the Cloudflare Worker that returns the full data needed to build the workbook in one call: stats + breakdowns + all devices (5 000 cap) + all events (50 000 cap) for the selected range. Leave the existing `/admin/stats`, `/admin/events`, `/admin/devices` routes unchanged.

## Context

To build the workbook the frontend needs:

- Aggregated counts (overview, breakdowns, daily) — already served by `/admin/stats`.
- Per-device summary rows — already served by `/admin/devices` (200-row cap).
- All raw events for the period — `/admin/events` exists but caps at 200 rows and is ordered by `ts DESC`.

A naïve client-side approach: call all three, then loop over `/admin/events` paginated until exhausted. Three round-trips minimum, plus pagination logic, plus rate-limit risk on the free tier.

## Alternatives considered

- **Lift the 200-row cap on `/admin/events`** so a single call returns everything. Couples the browse-the-UI use case (where 200 rows is right) with the dump-everything use case (where it's wrong). A future change to the UI cap would silently break exports.
- **Client-side pagination loop** over `/admin/events`. More complex frontend code, more requests, no aggregation of stats — still need `/admin/stats` and `/admin/devices` calls anyway.
- **Stream the export from a separate Worker.** Operationally heavier — second deployment surface, second set of secrets — for no benefit at our data size.

## Choice

A dedicated `/admin/export` route running 12 D1 queries in parallel via `Promise.all` and returning everything in one JSON object:

```ts
{ range, overview, today_sessions,
  tabUsage, topMacros, topSymbols, lookupModes, fundingSymbols, countries, daily, errors,
  devices,   // up to 5 000 rows
  events }   // up to 50 000 rows, ORDER BY device_id, ts ASC
```

Events are pre-sorted by `(device_id, ts ASC)` because the Device Journey workbook sheet needs that order anyway — sorting at the database avoids a 50 000-row JS sort in the browser.

## Why this is the right trade-off

- **Use cases are different.** `/admin/events` answers "what just happened?" with paginated descending order. `/admin/export` answers "give me everything for the period". Same table, different shape, different limits.
- **Parallel queries on D1 are fast.** All 12 queries run in one Worker invocation; D1 handles concurrent reads cheaply.
- **The 50 000-event cap is a safety bound, not an expected limit.** At current usage (~50 events/day) the cap won't be hit for years. Hard cap protects against runaway memory if the table ever grows unexpectedly.
- **Auth is identical** — bearer token via `requireAdmin()`, same as the other admin routes. No new secret, no new permission model.

## Consequences

- One new route to maintain. Schema changes to the `events` table now require updating four places (stats / events / devices / export queries) instead of three. Documented in [[entities/analytics-system]].
- Workbook generation becomes one HTTP request from the browser's point of view, regardless of period size.
- Worker bundle grew slightly (~2 KB of additional SQL); no observable effect on cold-start latency.

## Sources
- [[sources/sessions/2026-04-26-analytics-workbook-export]]

## Related
- [[entities/analytics-system]]
- [[entities/export-workbook]]
- [[decisions/2026-04-26-xlsx-workbook-over-csv]]
- [[decisions/2026-04-26-cloudflare-workers-d1-analytics-backend]]

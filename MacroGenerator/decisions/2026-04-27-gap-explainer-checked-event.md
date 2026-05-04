---
title: Add a dedicated gap_explainer_checked event alongside lookup_query
tags: [decision, analytics]
source: in-conversation session
date: 2026-04-27
status: active
---

# `gap_explainer_checked` — dedicated event vs reusing `lookup_query`

## Context

Gap Explainer is a new mode card in Price Lookup. Per the analytics conventions, its usage must be visible to product analytics. The existing `lookup_query` event already covers per-mode usage and has a stable schema (`mode`, `symbol`, `market`, `price_type`).

But Gap Explainer also produces two outcome flags — `last_reached`, `mark_reached` — that don't fit `lookup_query`'s schema and are the most interesting product question ("how often does Mark hold the line that Last crossed?").

## Decision

Fire **two** events on the Gap Explainer success path:

1. `lookup_query` with `mode: 'gapExplainer'`, `symbol`, `market`, `trigger_type` (or `null`), `has_target` — keeps Gap Explainer visible in the existing per-mode aggregations on `/admin/stats` without changing that endpoint's `lookupModes` query.
2. `gap_explainer_checked` with `symbol`, `market`, `trigger_type`, `has_target`, `last_reached`, `mark_reached` — carries the outcome props that `lookup_query`'s schema doesn't accept.

Both are non-blocking via the existing `track()` (sendBeacon + try/catch).

## Why a separate event

- Keeps the `lookup_query` schema stable. Adding outcome props that only one mode emits would dilute the schema for the other six modes.
- D1 stores `event_type` as `TEXT`. New event types land without a schema change. The admin `/events` and `/export` routes already SELECT every event type; the workbook generator does not need a new sheet.
- The existing per-mode counters on `/admin/stats` (`lookupModes` aggregation over `lookup_query`) keep working because `lookup_query` still fires.

## Trade-offs

- One extra row per Gap Explainer run. Negligible at expected volumes.
- Future analytics consumers must know to LEFT JOIN `lookup_query` and `gap_explainer_checked` on `(session_id, ts)` if they want the outcome flags alongside the mode counter. Acceptable.

## Sources

- [[sources/sessions/2026-04-27-price-lookup-closest-miss-gap-explainer]]

## Related

- [[entities/analytics-system]]
- [[entities/price-lookup]]
- [[concepts/mark-vs-last-price]]

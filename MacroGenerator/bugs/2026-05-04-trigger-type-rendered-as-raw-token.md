---
title: Macro output rendered raw `MARK` / `LAST` instead of "Mark Price" / "Last Price"
tags: [bug, macro, ux, formatting, fixed]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: fixed
---

# Trigger type rendered as raw token (`MARK` / `LAST`)

## Symptom

The customer-facing macro reply emitted the order's trigger type as
the raw token string:

```
**Order Type:** Stop-Market
**Trigger Condition:** MARK              ← should be "Mark Price"
**Trigger Price:** 68752.22
```

Reported by the user with a real macro generation. A customer reading
"Trigger Condition: MARK" has no easy way to map that to the
"Mark Price" trigger they configured in the trading interface.

## Root cause

Every macro template was inlining `inputs.trigger_type` directly:

```ts
**Trigger Condition:** ${inputs.trigger_type}
```

`inputs.trigger_type` is populated either from the form's locked
`defaultValue` (`"MARK"` or `"LAST"`) or from the order-grid paste
(which carries Binance's order-metadata token `"MARK"`/`"LAST"`).
There was no display-side translation step.

Same issue in `PriceLookup.tsx`'s Gap Explainer output, which used
the raw `gapTriggerType` state value (`"MARK"` / `"LAST"` / `""`)
to label the trigger type in the customer summary.

The Gap mode UI buttons in the locale dictionary (`gapExplainerTriggerMark` /
`gapExplainerTriggerLast`) were also literal `"MARK"` / `"LAST"`.

## Fix

Add a new helper in `src/macros/helpers.ts`:

```ts
export function prettyTriggerType(raw, _lang = 'en') {
  const t = upper(raw);
  if (t === 'MARK') return 'Mark Price';
  if (t === 'LAST') return 'Last Price';
  return raw == null ? '' : String(raw);   // pass-through for unknown
}
```

Wrap every site that emits `inputs.trigger_type`. 28 occurrences across
7 macro files (`stop_market_mark_not_reached`, `stop_market_loss_higher_than_expected_*`,
`take_profit_slippage_*`, `stop_limit_*`) — both the "**Trigger Condition:**"
detailed block and the "**Trigger:** ... @ ..." summary shorthand,
EN + TR.

In `PriceLookup.tsx` Gap Explainer, compute a `prettyGapTrigger` from
`gapTriggerType` ('MARK' → 'Mark Price', 'LAST' → 'Last Price') before
using it in the customer-facing summary:

```ts
const prettyGapTrigger = gapTriggerType === 'MARK' ? 'Mark Price'
  : gapTriggerType === 'LAST' ? 'Last Price'
  : '';
const triggerLabel = prettyGapTrigger || t.gapExplainerTriggerNone;
```

Update locale labels for the Gap mode buttons (EN + TR) so the UI
matches the macro text:

```ts
gapExplainerTriggerMark: "Mark Price",   // was "MARK"
gapExplainerTriggerLast: "Last Price",   // was "LAST"
```

The helper is lang-agnostic by design — Binance's actual zh-CN UI also
uses "Mark Price" / "Last Price" in English, matching what
`buildFullOHLCBlock` in [[entities/macros-helpers]] already does.

The token stays raw inside the system (`pricing.ts` and macro template
branches still compare against `priceType === "mark"` / `"last"` lowercase) —
the prettifier only affects the rendered string.

See [[decisions/2026-05-04-prettify-trigger-type-token]] for the full
rationale (including why we don't translate at paste time and why
pass-through behavior for unknown values matters).

## Verification

`npm run build` 6.3 s green; `npm test` 79/79 passed. A real macro
generated against `inputs.trigger_type === "MARK"` now reads
"**Trigger Condition:** Mark Price".

## Files

- `src/macros/helpers.ts` — new `prettyTriggerType()` export.
- `src/macros/stop_market_mark_not_reached.ts` — 4 sites (EN detailed, EN summary, TR detailed, TR summary).
- `src/macros/stop_market_loss_higher_than_expected_mark_price.ts` — 4 sites.
- `src/macros/stop_market_loss_higher_than_expected_last_price.ts` — 4 sites.
- `src/macros/take_profit_slippage_mark_price.ts` — 4 sites.
- `src/macros/take_profit_slippage_last_price.ts` — 4 sites.
- `src/macros/stop_limit_mark_price.ts` — 4 sites.
- `src/macros/stop_limit_last_price.ts` — 4 sites.
- `src/components/PriceLookup.tsx` — Gap Explainer output `prettyGapTrigger` derivation.
- `src/locales.ts` — `gapExplainerTriggerMark` / `Last` updated EN + TR.

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[decisions/2026-05-04-prettify-trigger-type-token]]
- [[entities/macros-helpers]]
- [[entities/macros-registry]]
- [[concepts/mark-vs-last-price]]

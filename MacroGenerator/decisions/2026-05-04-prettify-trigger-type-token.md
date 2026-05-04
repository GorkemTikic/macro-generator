---
title: Prettify the raw `MARK` / `LAST` trigger-type token in customer-facing macro output
tags: [decision, macro, formatting, ux]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: active
---

# Decision: `MARK` → "Mark Price", `LAST` → "Last Price" in macro output

## Context

Macro form fields store the trigger type as the raw token the form
collects: `"MARK"` or `"LAST"` (the value that the order-grid paste
populates from Binance's order metadata). Macro templates were
emitting that token verbatim into the customer-facing reply:

```
**Trigger Condition:** MARK
```

A real customer reading "Trigger Condition: MARK" has no good way to
know that maps to the *Mark Price* trigger they configured in the
trading interface. The trading UI says "Mark Price" / "Last Price" in
full prose; the support reply should match.

## Decision

Add a new helper in `src/macros/helpers.ts`:

```ts
export function prettyTriggerType(raw, _lang = 'en') {
  const t = upper(raw);
  if (t === 'MARK') return 'Mark Price';
  if (t === 'LAST') return 'Last Price';
  return raw == null ? '' : String(raw);   // pass-through for unknown
}
```

Wrap every site that emits `inputs.trigger_type` with this helper.
Sites updated (28 occurrences across 7 macro files; both the
"**Trigger Condition:** ..." block in detailed mode and the
"**Trigger:** ... @ ..." shorthand in summary mode, EN + TR):

- `stop_market_mark_not_reached.ts`
- `stop_market_loss_higher_than_expected_mark_price.ts`
- `stop_market_loss_higher_than_expected_last_price.ts`
- `take_profit_slippage_mark_price.ts`
- `take_profit_slippage_last_price.ts`
- `stop_limit_mark_price.ts`
- `stop_limit_last_price.ts`

Also update `PriceLookup.tsx`'s Gap Explainer output so the
`triggerLabel` (which goes into the customer-facing summary block)
shows "Mark Price"/"Last Price" instead of the raw `gapTriggerType`
state value, and update the locale labels for the Gap mode buttons:

```ts
// before
gapExplainerTriggerMark: "MARK",
gapExplainerTriggerLast: "LAST",
// after
gapExplainerTriggerMark: "Mark Price",
gapExplainerTriggerLast: "Last Price",
```

## Lang-agnostic by design

Binance's actual UI keeps "Mark Price" / "Last Price" in English in
both the EN and TR (and ZH) locales — the OHLC blockquote helper
`buildFullOHLCBlock` in [[entities/macros-helpers]] already uses
"Mark Price" / "Last Price" in both languages. So the prettifier
returns the same English label regardless of `lang`. The optional
`_lang` parameter is reserved for a future locale that wants different
phrasing.

## Why not store `"Mark Price"` directly in the form input?

Two reasons:
1. The order-grid paste populates the field with `"MARK"` or `"LAST"` because that's what Binance's order metadata uses. Translating at paste time would lose information — agents who paste a token that's not in `{MARK, LAST}` would see it silently rewritten.
2. The internal logic in `pricing.ts` and the macro templates branches on `priceType === "mark"` / `"last"` (lowercase) — keeping `inputs.trigger_type` as the canonical token means the comparison is unambiguous.

The prettifier is a display-only function. The token stays raw inside
the system; only the rendered string gets the friendly label.

## Pass-through behavior for unknown values

`prettyTriggerType("FOO")` returns `"FOO"` unchanged. This is
intentional — if the order-grid paste ever produces a third token
that we haven't coded for, the agent sees that exact value in the
output rather than a silent default. The agent then has the chance to
notice and ask product to extend the helper, instead of getting a
plausibly-wrong-looking reply.

## Verification

`npm run build` 6.3 s green; `npm test` 79/79 passed. A real macro
generated against `inputs.trigger_type === "MARK"` now reads
"**Trigger Condition:** Mark Price" instead of "**Trigger Condition:**
MARK".

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]]
- [[entities/macros-helpers]]
- [[entities/macros-registry]]
- [[concepts/mark-vs-last-price]]

---
title: Empty `> ` line in blockquote renders as a highlighted empty bar
tags: [bug, markdown, ux, formatting, fixed]
source: sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish.md
date: 2026-05-04
status: fixed
---

# Empty `> ` line in blockquote renders as highlighted empty bar

## Symptom

The OHLC double-block in macro output:

```markdown
> **Mark Price Range:**
>   Highest: 79230.78 (at 2026-05-03 20:36:00 UTC+0)
>   Lowest:  78601.40 (at 2026-05-03 18:17:00 UTC+0)
>                                ← this empty `>` line
> **Last Price Range:**
>   Highest: 79266.00 (at 2026-05-03 20:36:00 UTC+0)
>   Lowest:  78588.20 (at 2026-05-03 18:15:00 UTC+0)
```

…rendered with a *visible* highlighted bar between the two sections in
every chat / markdown viewer the user tried. User feedback: *"why
there is an empty `>` this makes the answer look weird."*

## Root cause

A `> ` line (`>` followed by a single space and nothing else) keeps the
markdown blockquote *open* across the gap. Renderers draw the
blockquote's left bar continuously through that line, producing a
visible empty highlighted strip in between the two content blocks.

The intent was to create a visual gap between the Mark Price and
Last Price sections of the same block; the wrong markdown construct
was used.

## Fix

Replace the `> ` separator with a **truly empty line** (no `>`) so the
markdown parser splits the input into two adjacent blockquotes
instead of one continuous blockquote with an empty inner line:

```markdown
> **Mark Price Range:**
>   Highest: 79230.78 ...
>   Lowest:  78601.40 ...
                                ← truly empty line, no `>`
> **Last Price Range:**
>   Highest: 79266.00 ...
>   Lowest:  78588.20 ...
```

Renders as two separate blockquotes side-by-side vertically with a
clean visual gap and no extra highlighted bar.

Affected 5 sites — every place that built a Mark + Last OHLC double-
block had the same `> ` separator pattern:

- `src/macros/helpers.ts` — shared `buildFullOHLCBlock` (EN + TR).
- `src/macros/stop_market_mark_not_reached.ts` — Mark/Last *Range* block in `buildSideAwareBlock` (EN + TR).
- `src/macros/stop_limit_mark_price.ts` — local `buildFullOHLCBlock` duplicate (EN + TR).
- `src/macros/stop_limit_last_price.ts` — local `buildFullOHLCBlock` duplicate (EN + TR).
- `src/macros/stop_market_loss_higher_than_expected_mark_price.ts` — local `buildFullOHLCBlock` duplicate (EN + TR).

(There are several local copies of `buildFullOHLCBlock` because
historically each macro had its own; the helper version exists but
not every macro switched to it. Deduping is out of scope.)

## Verification

`npm run build` 6.3 s green; `npm test` 79/79 passed. After the fix
the regenerated macro renders without the empty highlighted bar
between the Mark and Last sections.

`grep -rn '^> $' src/` returns no matches after the fix (regex match for `>` + space + EOL).

## Files

- `src/macros/helpers.ts`
- `src/macros/stop_market_mark_not_reached.ts`
- `src/macros/stop_limit_mark_price.ts`
- `src/macros/stop_limit_last_price.ts`
- `src/macros/stop_market_loss_higher_than_expected_mark_price.ts`

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[entities/macros-helpers]]
- [[entities/macros-registry]]

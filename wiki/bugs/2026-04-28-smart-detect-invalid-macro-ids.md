---
title: Smart Detect returned macro IDs that did not exist in the registry
tags: [bug, macro, smart-detect, registry]
source: sources/sessions/2026-04-28-end-to-end-audit-pass.md
date: 2026-04-28
status: fixed
---

# Bug: Smart Detect returned macro IDs that did not exist

## Symptom

When an agent typed a complaint into the Smart Detect textarea on the Macro Generator tab (e.g. the placeholder example "Stop didn't trigger" or a Turkish equivalent), `setMacroId(intent.macroId)` would land on an ID that wasn't in the macro registry. Net effect:

- the macro form fields disappeared (`activeMacro` resolved to `undefined`, no `formConfig` to render),
- clicking **Generate** produced a generic `"Select a macro."` error,
- the helper text still proudly displayed `🤖 Detected: ... (Confidence: 95%)`.

So the UI claimed it had recognized the issue but silently broke the macro pipeline.

## Root cause

`detectMacro` in [[entities/smart-detect]] returned four `macroId` strings that simply weren't registered in [[entities/macros-registry]]:

| Returned (broken) | Closest real ID |
|---|---|
| `stop_limit_not_triggered` | `mark_not_reached_user_checked_last` |
| `stop_limit_not_filled` | `stop_limit_mark_price_not_filled` (or the `_last_price_` variant) |
| `high_frequency_slippage` | `tp_slippage_mark_price` (or the `_last_price` variant) |
| `limit_order_not_reached` | `mark_not_reached_user_checked_last` |

The wiki's `entities/smart-detect.md` had already flagged this as a `## CONTRADICTION` but the code had never been fixed.

It also returned `macroId: 'funding_macro'` for funding queries, which is registered but not listed by `listMacros()` (it lives in the Funding tab, not the Macro Generator dropdown) — same broken UX in a slightly different way.

## Fix

`src/macros/smart_detect.ts`:

1. Replaced each broken ID with a real registry ID. Defaulted Stop-Limit and TP-Slippage to the **Mark Price** variant; agents can switch in the dropdown.
2. The funding branch now returns only `confidence`/`reason` — no `macroId` — so it can't desync the dropdown. (Surfacing the funding hint to the agent UI is left as a follow-up; `MacroGenerator` only displays detections that come with a `macroId`.)

[[entities/smart-detect]] was updated to drop the `## CONTRADICTION` marker and to record the new mapping.

## Verification

- Cross-checked: `grep "macroId: '" src/macros/smart_detect.ts` outputs four IDs, each present in `grep "id:" src/macros/*.ts`.
- `tsc --noEmit` + `vite build` clean.

## Sources

- [[sources/sessions/2026-04-28-end-to-end-audit-pass]]

## Related

- [[entities/smart-detect]]
- [[entities/macros-registry]]
- [[entities/macro-generator-component]]

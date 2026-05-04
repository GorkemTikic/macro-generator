---
title: src/components/MacroGenerator.tsx
tags: [entity, component, ui, macro]
source: src/components/MacroGenerator.tsx
date: 2026-04-25
status: active
---

# src/components/MacroGenerator.tsx (706 satır)

Main macro production interface. For trade-related questions such as Stop/TP/Slippage, the form filled by the agent pulls the price data, passes it to the macro functions in [[entities/macros-registry]], and produces a formatted answer.

## Responsibilities

1. List available macros and show in dropdown (`listMacros(lang)`)
2. Render dynamic form fields according to the selected macro (`formConfig`)
3. **Grid paste shortcut**: Parse tab-delimited row copied from Binance UI — match `GRID_KEYS` (27 columns), autofill in relevant form fields (`mapGridData`)
4. Dynamic timestamp label by status (`getDynamicTimestampLabel`) — different UTC labels for OPEN/CANCELED/EXPIRED/TRIGGERED/EXECUTED
5. Pull OHLC data from [[entities/pricing-ts]] (`getTriggerMinuteCandles` or `getRangeHighLow`) in Submit
6. Call `renderMacro(macroId, inputs, prices, mode, lang, tone)` → markdown reply

## Smart-detect integration

Uses the [[entities/smart-detect]] module — if the user enters free text (e.g. "my stop didn't explode") it predicts the macro type and tone (`empathetic`/`professional`/`direct`).

## Critical shapes

- `MacroInputs` interface — `order_id`, `symbol`, `side`, `trigger_type` (MARK|LAST), `trigger_price`, `limit_price`, `executed_price`, `placed_at_utc`, `triggered_at_utc`, `final_status_utc`, `status`
- `GRID_KEYS` — Matches Binance Order History table column layout 1:1 (27 fields); fallback parser for 26 value version (Activate Price omitted)

## Notes

- Symbol default `"ETHUSDT"` — Out of sync with `activeSymbol` in App context (bug candidate)
- Trigger type `MARK` default — Suitable for Stop-Market behavior

## Recent updates (2026-05-03)

- **No more client-side password gate.** The `requireAuth("112233")`
  wrapper around Generate / Copy / Paste-Grid was removed entirely;
  see [[bugs/2026-05-03-hardcoded-password-gate]] and
  [[decisions/2026-05-03-remove-client-password-gate]]. State
  variables `isAuthenticated`, `requireAuth` are gone.
- **`useMemo` side effect fixed.** `previewDataMap` no longer calls
  `setParseError` from inside the memo body — the error is now
  mirrored via a `useEffect` that watches the memo output. A
  separate `previewDataMapClean` strips the error sentinel for the
  preview grid.
- **Parse modal a11y.** `role="dialog"` + `aria-modal="true"` on the
  overlay; an `Esc`-key effect closes it.
- **Toast UX.** `alert(t.copied)` after Copy is replaced by a
  non-blocking `mg-toast` element.
- See [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]
  for the broader pass.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] (indirect — must work side by side with other tabs rule)
- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[entities/macros-registry]] — `renderMacro` and `listMacros` export point
- [[entities/smart-detect]]
- [[entities/pricing-ts]]
- [[concepts/stateless-macro-engine]]
- [[bugs/2026-05-03-hardcoded-password-gate]]
- [[decisions/2026-05-03-remove-client-password-gate]]

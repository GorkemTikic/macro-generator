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

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]] (indirect — must work side by side with other tabs rule)

## Related

- [[entities/macros-registry]] — `renderMacro` and `listMacros` export point
- [[entities/smart-detect]]
- [[entities/pricing-ts]]
- [[concepts/stateless-macro-engine]]

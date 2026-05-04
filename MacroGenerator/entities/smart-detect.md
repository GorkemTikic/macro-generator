---
title: src/macros/smart_detect.ts
tags: [entity, macro, nlp]
source: src/macros/smart_detect.ts
date: 2026-04-29
status: active
---

# src/macros/smart_detect.ts

Keyword-based classifier that **predicts** macro type and tone from user's free text input. Not AI — simple `String.includes` regexes.

## Turkish-aware lowercasing

Input is normalized via `s.toLocaleLowerCase('tr').replace(/ı/g, 'i')` before any `.includes()` check, and every literal goes through the same normalization. This is required because:

- JS's default `toLowerCase()` turns `'I'` into `'i'` (dotted), so all-caps Turkish like `ÇALIŞMADI` would become `çalişmadi` — never matching the literal `çalışmadı` (dotless `ı`).
- A bare `toLocaleLowerCase('tr')` would over-correct in the other direction (English `'I'` → `'ı'`), breaking literals like `not trigger` and `didn't hit`.

Collapsing `ı` → `i` after the locale-aware lowercasing canonicalizes both sides so the matcher works for any caps-case in either language.

## API

```ts
detectMacro(text): { macroId?, tone?, confidence: number, reason? } | null
```

## Categories and example triggers

| Category | Key words (EN+TR) | macroId | tone |
|---|---|---|---|
| Funding | `funding`, `fonlama`, `fee`, `komisyon` | — (hint only; user must switch to Funding tab) | — |
| Stop not triggered | `stop` + (`çalışmadı`/`tetiklenmedi`/`not trigger`/`skipped`), `stopum patlamadı` | `mark_not_reached_user_checked_last` | empathetic |
| Stop triggered, not filled | `stop` + (`dolmadı`/`not fill`), `limit order not filled` | `stop_limit_mark_price_not_filled` | professional |
| Slippage | `slippage`, `kayma`, `farklı fiyat`, `market`+`price`+`high` | `tp_slippage_mark_price` | direct |
| Not reached | `fiyat gelmedi`, `not reached`, `didn't hit`, `değmedi` | `mark_not_reached_user_checked_last` | direct |

All `macroId` values now exist in [[entities/macros-registry]]. For Stop-Limit and TP-Slippage the classifier defaults to the **Mark Price** variant; the agent can switch to the Last Price variant in the dropdown if needed.

## Funding caveat

`funding_macro` is registered in [[entities/macros-registry]] but is **not** listed by `listMacros()` (it lives in the Funding Macro tab, not the Macro Generator dropdown). The classifier therefore returns only a confidence + reason for funding queries and does not change the dropdown selection. The current MacroGenerator UI does not surface that hint — it only displays detections that come with a `macroId`.

## Sources

- [[sources/sessions/2026-04-28-end-to-end-audit-pass]] — invalid macro IDs fixed and Turkish-aware lowercasing added.

## Related

- [[entities/macro-generator-component]] — consumer
- [[entities/macros-registry]]
- [[concepts/smart-detect-nlp]]
- [[bugs/2026-04-28-smart-detect-invalid-macro-ids]]
- [[bugs/2026-04-29-smart-detect-turkish-caps]]

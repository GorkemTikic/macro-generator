---
title: src/macros/helpers.ts
tags: [entity, macro, helpers, formatting]
source: src/macros/helpers.ts
date: 2026-04-25
status: active
---

# src/macros/helpers.ts

Formatting aids shared by all macros. **Critical** because if the
inconsistency starts here, all macro outputs will differ.

## Public API

| Function | Purpose |
|---|---|
| `fmtNum(v, digits=8)` | Convert number to string with fixed decimal; null/NaN → `"N/A"` |
| `upper(s)` | Trim + uppercase, null-safe |
| `prettyTriggerType(raw, _lang='en')` | `"MARK"` → `"Mark Price"`; `"LAST"` → `"Last Price"`; pass-through for unknown values. **Lang-agnostic** — Binance uses these terms in English in all locales. Added 2026-05-04, see [[decisions/2026-05-04-prettify-trigger-type-token]] and [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]] |
| `statusLineFriendly(inputs, lang='en')` | User-friendly timestamp line for OPEN / CANCELED / EXECUTED / TRIGGERED / EXPIRED. **Lang-aware** — produces English / Turkish / Chinese variants. The `lang` parameter has a default value of `'en'` for backward compat with macros that don't yet pass it explicitly. |
| `truncateToPrecision(raw, prec)` | Does NOT round — cuts (matches Binance precision behavior) |
| `buildFullOHLCBlock(prices, lang='en', precision=8)` | Mark + Last Price 1m candle block as markdown blockquote. Three lang branches (en / tr / zh). |
| `buildLastPriceOHLCBlock(prices, lang='en', precision=8)` | Last Price only 1m candle blockquote. Same three lang branches. |
| `applyTone(text, tone, lang='en')` | Post-processor that wraps the macro output with a tone-specific prefix + suffix (empathetic / professional / direct / standard). Three lang branches per tone. |
| `generateMacro(...)` | Re-export of the template renderer |

## Important detail: truncate, not round

`truncateToPrecision("0.123456789", 4)` → `"0.1234"` (rounding would
give `"0.1235"`). Intentionally consistent with Binance's own
precision behavior — when the user searches the price displayed by
the agent in the Binance UI, they see exactly the same price. See
[[decisions/precision-truncation-not-rounding]].

## `prettyTriggerType` — display-only

Form fields and order-grid paste store `inputs.trigger_type` as the
canonical token (`"MARK"` / `"LAST"`) because that's what Binance's
order metadata uses and it's what the internal `pricing.ts` /
template branches compare against. The prettifier converts to the
friendly label only at render time. Pass-through for unknown values
keeps weird inputs visible to the agent rather than silently
defaulting. Lang-agnostic (zh-CN UI uses "Mark Price" / "Last Price"
in English too). See [[decisions/2026-05-04-prettify-trigger-type-token]].

## `statusLineFriendly` — was English-only until 2026-05-04

Pre-existing inconsistency: even TR macros got an English status line
because the helper hardcoded English for `OPEN` / `CANCELED` /
`EXECUTED` / `TRIGGERED` / `EXPIRED`. Made lang-aware in the same
session that added zh. The lang parameter has a default of `'en'` so
older macros that don't pass it still work — they get English as
before. New zh templates pass `'zh'` explicitly. Worth a follow-up to
thread `lang` into all macro templates so the EN+TR ones also stop
emitting English status lines.

## `buildFullOHLCBlock` / `buildLastPriceOHLCBlock` structure

Three branches: en (Open/High/Low/Close), tr (Açılış/Yüksek/Düşük/Kapanış),
zh (开盘/最高/最低/收盘). Each renders a markdown blockquote header like
`> **Mark Price (1m Candle):**` followed by indented `Open/High/Low/Close`
lines. Decimal places set with the `precision` parameter (default 8).

**Mark + Last separator:** there is a *truly empty line* (no `>`)
between the Mark and Last sub-blocks — splitting them into two
adjacent blockquotes — instead of a `> ` (space) line which renders
as a visible highlighted bar in most markdown viewers. See
[[bugs/2026-05-04-empty-blockquote-line-renders-bar]].

## `applyTone` — 4 tones × 3 langs = 12 variants

| Tone | Prefix / Suffix |
|---|---|
| `standard` | unchanged (no wrap) |
| `professional` | "Dear User, … Best Regards, Binance Support Team" / "Sayın Kullanıcımız, … Saygılarımızla, Binance Destek Ekibi" / "尊敬的用户, … 此致, 币安客服团队" |
| `empathetic` | "Hello, I understand … We are here for you. 🙏" / "Merhaba, … Her zaman yanınızdayız. 🙏" / "您好, 我能理解 … 我们随时为您提供帮助。🙏" |
| `direct` | unchanged (no wrap) |

## Recent updates

- **2026-05-04** — added `prettyTriggerType` (new export); added zh branches to `buildFullOHLCBlock`, `buildLastPriceOHLCBlock`, `applyTone`; made `statusLineFriendly` lang-aware (en/tr/zh). Replaced `> ` empty-line separator with truly empty line in both OHLC builders. See [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]].

## Sources

- [[sources/sessions/2026-05-04-zh-cn-trilingual-and-ux-polish]]

## Related

- [[entities/macros-registry]]
- [[decisions/precision-truncation-not-rounding]]
- [[decisions/2026-05-04-prettify-trigger-type-token]]
- [[decisions/2026-05-04-add-zh-cn-trilingual]]
- [[concepts/bilingual-tr-en]] — now trilingual
- [[bugs/2026-05-04-trigger-type-rendered-as-raw-token]]
- [[bugs/2026-05-04-empty-blockquote-line-renders-bar]]

---
title: Data Flow (UI → Pricing → Macro → Response)
tags: [synthesis, data-flow]
source: src/
date: 2026-04-25
status: active
---

# Data Flow

Data flow from start to finish of a macro production. Example: the user asks the agent, "Why was my stop triggered at a different price?"

## Flow (slippage example)

```
1. Agent
   "Take Profit Slippage (Mark)" macronu seçer
   Order ID, symbol, trigger time, trigger price, executed price doldurur
   ↓
2. MacroGenerator.tsx
   Form state'ini topla — MacroInputs interface
   ↓
3. handleGenerate()
   pricing.getTriggerMinuteCandles(symbol, triggered_at_utc, "futures")
   ↓
4. pricing.ts → fetchWithFallback → Binance fapi
   /fapi/v1/markPriceKlines?symbol=...&startTime=...
   /fapi/v1/klines?symbol=...&startTime=...
   ↓ (parallel, Promise.all)
5. prices = { mark: {open,high,low,close}, last: {...} }
   ↓
6. renderMacro("take_profit_slippage_mark_price", inputs, prices, "detailed", "en", "standard")
   ↓
7. macros/take_profit_slippage_mark_price.ts
   translations.en.templates.detailed({inputs, prices}) → markdown string
   ↓
8. applyTone(string, "standard", "en") → final markdown
   ↓
9. UI Result panel → kullanıcı "Copy" butonu → clipboard
```

## Flow (margin restrictions example)

```
1. Agent "Margin Restrictions" tab'ına geçer
   ↓
2. MarginRestrictions.tsx mount → fetchRestricted()
   ↓
3. restrictedAssets.ts
   Cache check (margin_restricted_cache_v1, TTL 60s)
   Cache hit → cache return
   Cache miss ↓
4. fetchWithFallback → /api-binance/sapi/v1/margin/restricted-asset (DEV)
   veya VITE_MARGIN_PROXY (PROD) veya direkt api.binance.com (CORS-fail PROD)
   X-MBX-APIKEY = getApiKey() (localStorage > build-time)
   ↓
5. Response { openLongRestrictedAsset, maxCollateralExceededAsset }
   ↓
6. Cache write + diff (history append)
   ↓
7. UI iki tablo render eder
```

## Stream (live ticker)

```
1. App.tsx mount → LiveTicker render
   ↓
2. useEffect → new WebSocket(`wss://fstream.binance.com/ws/${activeSymbol.toLowerCase()}@markPrice`)
   ↓
3. ws.onmessage → setPrice(parseFloat(data.p).toFixed(2))
   prevPrice karşılaştırma → ticker-up / ticker-down className
   ↓
4. activeSymbol değişir → cleanup ws.close() + yeni ws açılır
```

## Characteristic features

- **UI never calls Binance directly** — always via pricing.ts or restrictedAssets.ts
- **The macro never fetches** — Formats the prices object fed by the UI ([[concepts/stateless-macro-engine]])
- **Cache is only on margin** — every call to fresh on pricing side

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[entities/pricing-ts]]
- [[entities/restricted-assets-helper]]
- [[entities/macro-generator-component]]
- [[entities/macros-registry]]
- [[entities/live-ticker]]
- [[concepts/binance-fapi-fallback]]
- [[concepts/mark-vs-last-price]]

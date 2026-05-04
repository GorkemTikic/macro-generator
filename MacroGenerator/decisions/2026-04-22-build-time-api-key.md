---
title: Build-time API key (VITE_BINANCE_API_KEY)
tags: [decision, security, deployment]
source: .env.example, src/margin/restrictedAssets.ts
date: 2026-04-22
status: active
---

# Decision: API key is embedded in bundle at build-time (VITE_BINANCE_API_KEY)

## Context

Margin Restrictions endpoint requires auth. A central key is needed so that ~50 agents do not have to enter their own keys (session 530e, 21:16).

GitHub Pages **static hosting** — no server-side secrets can be kept. Three options were considered:

1. ❌ Each agent enters its own key → Friction is high for 50 agents
2. ❌ Backend proxy + secret → infra ek maliyet
3. ✅ **Build-time env var** + opsiyonel localStorage override

## Decision

`VITE_BINANCE_API_KEY=...` is set in `.env.local`, and it is embedded in the bundle during `npm run build`. Override mechanism: If the agent wishes, he can use his own key with `localStorage.setItem("binance_api_key_v1", "...")`.

## Security assumptions

Clearly documented in `.env.example`:

> **WARNING:** VITE_* values are baked into the built JS bundle. The key will be extractable from the client bundle by anyone who loads the page. **For a read-only MARKET_DATA key the worst case is rate-limit abuse.**

This was found acceptable because:
- Key **READ-ONLY** and **IP-whitelisted** (recommended in .env.example)
- No withdrawal/trade permission
- Worst case scenario: rate limit abuse → change key

## Alternative (suggestion in production)

`.env.example`'da: "If that is not acceptable, use a serverless proxy instead." Cloudflare Worker örneği veriliyor — `VITE_MARGIN_PROXY` env var.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]
- [[sources/docs/2026-04-22-env-example]]

## Related

- [[entities/restricted-assets-helper]]
- [[entities/vite-config]]
- [[decisions/2026-04-22-localstorage-per-agent-override]]
- [[bugs/2026-04-22-leaked-api-credentials]]

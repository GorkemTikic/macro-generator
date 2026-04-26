---
title: localStorage per-agent API key override
tags: [decision, security, ux]
source: src/margin/restrictedAssets.ts
date: 2026-04-22
status: active
---

# Decision: Agent can write its own API key to localStorage and override it

## Context

The build-time embedded key ([[decisions/2026-04-22-build-time-api-key]]) is tied to a central IP whitelist. Some agents may want to use from a different IP (e.g. from home); Some may prefer their own key.

## Decision

Error 500 (Server Error)!!1500.That’s an error.There was an error. Please try again later.That’s all we know.

```ts
localStorage["binance_api_key_v1"]   →  varsa kullanılır
        else
import.meta.env.VITE_BINANCE_API_KEY  →  build-time fallback
```

`getApiKey()` (src/margin/restrictedAssets.ts) implements this order.

## UX implication

The UI shows an "enter your own key" prompt when necessary (if `hasSharedKey()` is false or a 401 is received). The key is stored in localStorage — per browser, per agent.

## Trade-off

- ✅ Flexibility: agent can switch to his own key without re-building
- ❌ If XSS occurs, the key will be leaked (but the key is already read-only and can be revoke)
- ❌ Browser cleaning deletes the key — the agent has to re-enter it every time

## Sources

<!-- Not discussed directly in session, inferred from code resolution -->

## Related

- [[entities/restricted-assets-helper]]
- [[decisions/2026-04-22-build-time-api-key]]

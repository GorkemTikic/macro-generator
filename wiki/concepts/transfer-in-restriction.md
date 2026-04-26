---
title: Margin Transfer-In Restriction
tags: [concept, margin, binance]
source: src/margin/restrictedAssets.ts, sessions
date: 2026-04-25
status: active
---

# Margin Transfer-In Restriction

The situation where an asset cannot be transferred from spot wallet to margin wallet in Binance Margin. The problem area that the [[entities/margin-restrictions]] feature wants to solve.

## Two types of constraints

`/sapi/v1/margin/restricted-asset` returns two separate lists:

| List | Meaning |
|---|---|
| `openLongRestrictedAsset` | A new LONG position cannot be opened for this asset (existing position can be closed) |
| `maxCollateralExceededAsset` | System-wide collateral cap exceeded — no new transfer-ins opened |

## Confused concepts (wrong assumption in session 530e)

In the first iteration, the agent (Claude) interpreted this constraint as follows: "cannot borrow / open short". User **strongly corrected**:

> "It has nothing to do with Long and Short or Borrow... I can still borrow and trade in Pair. What I can't do is transfer CHZ from spot to futures. The others are not related to that. Read the FAQ."

Correct scope:
- ✅ "Can this asset be transferred?" — yes/no
- ❌ "Can this asset be long/short?" — wrong question

See [[bugs/2026-04-22-misunderstood-restriction-scope]] · [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]].

## Cross vs Isolated nuance

In Session 530e, a different topic emerged for MET and PNUT: Debt **cannot be done** in Cross Margin, but **can** be done in Isolated Margin. The user asked for this distinction in the API — the `restricted-asset` endpoint does not make this distinction; `/sapi/v1/margin/exchangeInfo` may provide richer metadata, but it was not used in the Phase 1 implementation. See [[entities/binance-sapi-margin]].

## FAQ resource

The user shared the following link:
https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09

This FAQ describes the "max collateral reached" scenario — the user aggressively requested that the feature focus on this need.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/margin-restrictions]]
- [[entities/binance-sapi-margin]]
- [[entities/restricted-assets-helper]]
- [[bugs/2026-04-22-misunderstood-restriction-scope]]

---
title: src/components/MarginRestrictions.tsx
tags: [entity, component, ui, margin, binance-sapi]
source: src/components/MarginRestrictions.tsx
date: 2026-04-25
status: active
---

# src/components/MarginRestrictions.tsx (412 satır)

Table listing **transfer-in restricted assets** in margin trading. For the agent to instantly answer the user's questions such as "why can't I send CHZ from spot to margin?"

## Data source

Binance **Margin SAPI** endpoint: `/sapi/v1/margin/exchangeInfo` or similar (`/sapi/v1/margin/restricted-asset` correct path). See [[entities/binance-sapi-margin]].

## Important decision: scope = transfer-in only

The previous iteration had the distinction `open-long restricted` / `borrow restricted`. User gave aggressive feedback (session 530e, 21:31): According to the margin team's answer, the real problem is **max collateral reached** and **asset cannot be transferred from spot to futures/margin** — not to be confused with borrowing or direction restriction.

**Final scope:** "Can this asset be transferred? If not, what is the reason?" — nothing else. See [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]].

## Cross vs Isolated

MET and PNUT case (session 530e, 21:39): these coins cannot be borrowed in Cross Margin, but can be borrowed in Isolated Margin. If the API response distinguishes cross/isolated with `isMarginTradeAllowed` or similar fields, the UI should reflect this.

## API key concern

Endpoint requires authentication. User 50 wants agents to use it (session 530e, 21:16). Current solution: hardcode own API key — see [[bugs/2026-04-22-leaked-api-credentials]] ⚠️ **SAFETY**.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/binance-sapi-margin]]
- [[concepts/transfer-in-restriction]]
- [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]]
- [[decisions/2026-04-22-use-sapi-margin-exchangeinfo]]
- [[bugs/2026-04-22-leaked-api-credentials]]

---
title: Margin feature scope is transfer-in only
tags: [decision, scope, margin]
source: sources/sessions/2026-04-22-margin-restrictions-build.md
date: 2026-04-22
status: active
---

# Decision: Margin feature scope = transfer-in restriction only

## Context

In the first iteration, the Margin Restrictions page wanted to show different categories, such as `openLong restricted` / `borrow restricted`, in separate sections. User (session 530e, 21:31) gave harsh feedback:

> "It has nothing to do with Long and Short or Borrow... All I can't do is transfer CHZ from spot to futures."

## Decision

The UI and data model answer **a single question**: "Can this asset be transferred-in now? If not, why?"

Two lists of reasons are shown:
1. **Open-long restricted** — new LONG cannot be opened (so transfer-in is generally meaningless)
2. **Max collateral exceeded** — system-wide collateral cap exceeded

Borrowing details, cross/isolated distinction, leverage limits **out of scope**.

## Justification

- Agent's real customer question: "why can't I send CHZ" — nothing else
- Broader scope = more complex UI = increased risk of agent giving wrong answer
- The cross/isolated borrow difference does not exist in the `restricted-asset` endpoint anyway.

## Trade-off

MET/PNUT case (there is no debt in Cross, there is in Isolated) is not reflected in the UI. These questions still have to go to the margin team. It may be enriched from `/sapi/v1/margin/exchangeInfo` in the future.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/margin-restrictions]]
- [[concepts/transfer-in-restriction]]
- [[bugs/2026-04-22-misunderstood-restriction-scope]]

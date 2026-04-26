---
title: Margin restriction scope misinterpreted (long/short vs transfer-in)
tags: [bug, requirements, scope]
source: sources/sessions/2026-04-22-margin-restrictions-build.md
date: 2026-04-22
status: fixed
---

# Bug: Restriction scope interpreted incorrectly

## Symptom

In the first iteration, Claude (agent) designed the Margin Restrictions UI with "long opening / short opening / borrowing" categories. User harshly corrected (session 530e, 21:31):

> "OK what you did wrong is this... You thought Long and Short or Borrow related to that... In the pair itself I can still borrow or trade what I can't do is to transfer CHZ from spot to Futures others are not related to that read the freaking FAQ...."

## Root cause

Claude interpreted the `openLongRestrictedAsset` field name as "restriction on opening long positions". The actual Binance semantics: this list is "transfer-in restricted" assets — since long positions cannot be opened, there is no point in transferring them anyway.

The FAQ shared by the user (https://www.binance.com/en/support/faq/detail/dca77ef963294b368b5ebad0affeda09) and the "max collateral reached" scenario was not read/misunderstood.

## Fix

Scope narrowed to **transfer-in only** — see [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]]. The UI shows two lists of reasons: open-long-restricted and max-collateral-exceeded — but within the "reason = cannot be transferred" framing.

## Cross/Isolated case

The user then gave an example of MET/PNUT (session 530e, 21:39):
> "MET and PNUT cannot be borrowed in Cross Margin, but they can be borrowed in Isolated. Does the API distinguish between cross/isolated?"

This is excluded (different issue from FAQ). See [[concepts/transfer-in-restriction]].

## Course found

Inferring semantics from API field names is risky. User's context (FAQ link, real ticket examples) **primary source** — field name secondary.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[entities/margin-restrictions]]
- [[concepts/transfer-in-restriction]]
- [[decisions/2026-04-22-margin-feature-scope-transfer-in-only]]
- [[entities/binance-sapi-margin]]

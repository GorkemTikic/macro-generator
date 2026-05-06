---
title: FAQ Searcher
tags: [entity, component, faq, support-workflow]
source: src/components/FaqSearcher.tsx, src/faqSearch.ts, src/faqCatalog.ts
date: 2026-05-06
status: active
---

# FAQ Searcher

FAQ Searcher is the Futures DeskMate tab for finding official Binance
Futures references by keyword. It is designed for support speed: agents
type a topic such as liquidation, funding, STP, error code, Mark Price,
or hedge mode and receive ranked official references plus copy-ready
citation packs.

## User-facing purpose

The feature reduces manual FAQ hunting. Agents no longer need to search
separate help center pages, developer docs, announcements, or saved
links during a live support case. They can search inside DeskMate,
open the official source, or copy a citation-ready reference block.

## UI surface

`FaqSearcher.tsx` intentionally keeps the interface narrow:

- one keyword input
- one "Copy Pack" action
- result count
- official reference cards
- matched search terms
- source/priority/confidence metadata
- "Open Reference" link
- "Copy Citation" action

The older imported UI had product/source/priority filters and
quick-topic chips. Those were removed before shipping because the
support goal is keyword-based FAQ discovery, not another tabbed or
filter-heavy research workflow.

## Data and search

`src/faqCatalog.ts` holds the curated reference catalog. Each entry
captures title, URL, product, product area, subcategory, page type,
source, priority, confidence, key topics, and support use cases.

`src/faqSearch.ts` provides:

- Turkish-aware normalization
- Chinese/English/Turkish alias expansion
- priority and source weighting
- result scoring
- matched-term extraction
- citation pack generation

The search layer includes aliases for frequent Futures topics such as
liquidation, Mark Price, funding, fees, PnL, ADL, hedge mode, cross and
isolated margin, stop orders, trailing stop, STP, error codes, portfolio
margin, multi-assets mode, options, leverage, and order failure.

## Analytics

FAQ Searcher emits:

- `faq_search` when a keyword query is used
- `faq_copy` when a citation or citation pack is copied

These events let Admin Analytics show whether the feature is being used
and which support workflows are gaining traction.

## Verification

`src/faqSearch.test.ts` verifies:

- Turkish liquidation terms find liquidation references
- Chinese error-code terms find developer references
- STP finds user and API references
- citation packs include official URLs and priority metadata

The initial deploy passed `npm test` and `npm run build`.

## Recent updates

- **2026-05-06** - FAQ Searcher restored from the older project copy,
  simplified to a keyword-first workflow, integrated as the `faq` tab,
  tracked in analytics, localized in EN/TR/ZH, deployed to GitHub Pages,
  and marked with a `"NEW"` badge. See
  [[sources/sessions/2026-05-06-faq-searcher-deploy]].

## Sources

- [[sources/sessions/2026-05-06-faq-searcher-deploy]]

## Related

- [[entities/app-tsx]]
- [[entities/analytics-system]]
- [[entities/locales-ts]]
- [[decisions/github-pages-deploy]]

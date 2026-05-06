---
title: "2026-05-06: FAQ Searcher Deploy"
type: session
date: 2026-05-06
tags: [faq, search, support-workflow, deploy, github-pages]
status: active
---

# 2026-05-06 FAQ Searcher Deploy

## Objective

Restore the FAQ-related work that existed in the older project copy and
ship it into the current Futures DeskMate workspace. The intended user
flow is simple: agents search by keyword and find official Binance
Futures references quickly. Extra filter tabs and category-driven
navigation were intentionally removed from the surface because they made
the workflow feel heavier than the support need.

## What was delivered

### 1. FAQ catalog and search engine

The missing FAQ source files were copied from the older project copy:

- `src/faqCatalog.ts`
- `src/faqSearch.ts`
- `src/faqSearch.test.ts`

`faqCatalog.ts` is the curated official-reference library. `faqSearch.ts`
normalizes English, Turkish, and Chinese search terms, expands common
aliases, scores results by title/topic/source/priority, and builds
citation packs agents can paste into support notes.

### 2. FAQ Searcher UI

`src/components/FaqSearcher.tsx` was added as a simplified keyword-first
UI. The first imported version had product/source/priority filters and
quick-topic chips. The final shipped version keeps only the core support
workflow:

- keyword input
- result count
- official reference result cards
- matched-term highlights
- copy citation
- copy citation pack
- open reference link

This keeps the page aligned with the original goal: find FAQ references
by keyword, not manage another set of tabs.

### 3. App integration

`src/App.tsx` now imports `FaqSearcher`, adds the `faq` tab after
`macros`, and lazy-mounts the FAQ panel only after first activation.
The tab received a small red `"NEW"` badge after launch to surface the
new feature to agents.

The FD brand click handler was also corrected to switch back to the real
`macros` tab id.

### 4. Analytics and localization

`src/analytics/index.ts` now includes:

- `faq` tab id
- `FAQ Searcher` tab label
- `faq_search` event
- `faq_copy` event

`src/locales.ts` now includes `tabFaq` in EN/TR/ZH.

### 5. Styling

FAQ-specific CSS was added to `src/styles.css` for the hero, stats,
keyword search row, result cards, priority labels, matched terms, tags,
copy buttons, empty state, and mobile layouts.

## Verification

Local checks:

- `npm test` passed: 83 tests, including `src/faqSearch.test.ts`.
- `npm run build` passed.

GitHub deployment:

- Commit `34982f2` - `feat: add FAQ keyword search`
- Commit `c6ab680` - `docs: update report for FAQ keyword search [skip ci]`
- Commit `a5fa83f` - `feat: mark FAQ searcher as new`

GitHub Actions:

- Deploy to GitHub Pages succeeded.
- Generate Progress Report succeeded.
- A fresh manual Pages deployment was also run and succeeded from the
  latest `main` commit.

Live verification confirmed the GitHub Pages bundle contains both
`FAQ Searcher` and `faq_search`.

## Management value

The feature turns scattered official FAQ/reference hunting into a direct
agent workflow. Agents can search by topic, copy citation-ready source
packs, and answer with stronger confidence. It improves response speed,
reduces inconsistent references, and helps newer agents find trusted
materials without relying on memory or team chats.

## Files touched

- `src/App.tsx`
- `src/components/FaqSearcher.tsx`
- `src/faqCatalog.ts`
- `src/faqSearch.ts`
- `src/faqSearch.test.ts`
- `src/analytics/index.ts`
- `src/locales.ts`
- `src/styles.css`
- `outputs/PROJECT_PROGRESS_REPORT.md`

## Sources

- [[sources/sessions/2026-05-06-faq-searcher-deploy]]

## Related

- [[entities/faq-searcher]]
- [[entities/app-tsx]]
- [[entities/analytics-system]]
- [[entities/locales-ts]]
- [[decisions/github-pages-deploy]]

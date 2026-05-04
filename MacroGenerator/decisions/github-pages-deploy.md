---
title: Deployment = GitHub Pages via GitHub Actions
tags: [decision, deployment, ci-cd]
source: DEPLOYMENT_GUIDE.md, vite.config.ts, .github/workflows/
date: 2026-03-21
status: active
---

# Verdict: GitHub Pages automatic deployment with GitHub Actions

## Decision

`main` branch'e her push'ta GitHub Action build alır + GitHub Pages'e deploy eder. URL: `https://gorkemtikic.github.io/macro-generator/`

Asset paths compatible with `base: "/macro-generator/"` — sub-path in `vite.config.ts`.

## Justification

- **Zero server cost** — static hosting is free
- **Auto-deploy** — push = live (no manual steps)
- **Public URL** — team + agents access from anywhere
- **Versioned** — snapshot possible with git tag

## Trade-off

- ❌ Server-side cannot keep secrets → API key must be embedded in the client ([[decisions/2026-04-22-build-time-api-key]])
- ❌ No server-side proxy → External proxy is required for CORS endpoints ([[decisions/2026-04-22-vite-dev-proxy-for-cors]])
- ❌ Build cache cleaning is required from time to time (CDN edge)

## Manuel fallback

`npm run deploy` — manually deploy with package `gh-pages` (if Action fails).

## Sources

- [[sources/docs/2026-04-22-deployment-guide]]

## Related

- [[entities/vite-config]]
- [[decisions/2026-04-22-build-time-api-key]]
- [[decisions/2026-04-22-vite-dev-proxy-for-cors]]

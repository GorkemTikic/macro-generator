---
title: Use Cloudflare Workers + D1 as analytics backend
tags: [decision, analytics, cloudflare, architecture]
source: sources/sessions/2026-04-26-analytics-build.md
date: 2026-04-26
status: active
---

# Decision: Use Cloudflare Workers + D1 as analytics backend

## Decision

Use **Cloudflare Workers** (serverless edge function) + **D1** (Cloudflare's SQLite offering) as the analytics ingest and storage layer, rather than a managed analytics SaaS or a traditional database.

## Context

FD Macro Generator is a fully static site deployed on GitHub Pages. There is no server, no backend, and no database. Tracking product usage requires an external HTTP endpoint to receive events. The options evaluated were:

| Option | Free tier | Privacy | Ops burden | SQL queries |
|---|---|---|---|---|
| Cloudflare Workers + D1 | 100k req/day, 10M reads/day | Full control | Zero | Yes (SQL) |
| Supabase | 500MB DB, 2M req/month | Hosted | Moderate | Yes |
| Plausible (self-host) | Unlimited | Full control | Docker needed | No |
| Plausible Cloud | Paid | External | Zero | No |

## Rationale

- **Free tier is sufficient**: internal tool, ~10–50 events/day expected.
- **IP hashing at the edge**: Workers can hash the client IP before any write, so raw IPs never leave CF's memory. Alternatives push IP handling into the DB.
- **`CF-IPCountry` header**: Cloudflare provides the request's country code for free in the Worker — no geo-IP database or extra API call needed.
- **Zero ops**: no Docker, no managed DB plan, no maintenance.
- **Full SQL**: D1 is real SQLite — ad-hoc queries for admin stats use SQL aggregations (GROUP BY, JSON_EXTRACT), which no SaaS analytics offers.

## Consequences

- Admin queries depend on D1 SQL (`GET /admin/stats` runs 10 parallel queries server-side).
- Worker must be redeployed (`wrangler deploy`) when ingest logic changes.
- `VITE_ANALYTICS_URL` must be set at build time; changing the Worker URL requires a frontend rebuild.

## Sources
- [[sources/sessions/2026-04-26-analytics-build]]

## Related
- [[decisions/github-pages-deploy]] — why a separate backend is required at all
- [[decisions/2026-04-26-ip-hash-privacy]]
- [[decisions/2026-04-26-admin-export-endpoint]] — full-data dump route added on top of this backend
- [[entities/analytics-system]]
- [[entities/export-workbook]]

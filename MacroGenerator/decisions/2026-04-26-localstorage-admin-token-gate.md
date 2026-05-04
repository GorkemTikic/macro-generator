---
title: Gate admin dashboard via localStorage token (no route)
tags: [decision, analytics, admin, security]
source: sources/sessions/2026-04-26-analytics-build.md
date: 2026-04-26
status: active
---

# Decision: Gate admin dashboard via localStorage token (no dedicated route)

## Decision

The admin dashboard tab is only rendered in the UI when `localStorage.getItem('_fd_admin_token')` returns a non-empty value. There is no public URL, no login form, and no route protection in the router (there is no router — the app is single-page).

The token stored in localStorage is also sent as `Authorization: Bearer <token>` on every admin API call to the Cloudflare Worker, which validates it against the `ADMIN_TOKEN` secret.

## Rationale

- **Static site constraint**: GitHub Pages cannot enforce server-side route guards. Any URL-based protection (e.g., `/admin`) would be purely cosmetic.
- **The tab is invisible without the token**: an attacker who doesn't know the token can't see the admin tab in the UI, and every API call would fail with 401 anyway.
- **No login form surface**: a login form is an additional attack surface. The token is set once by the admin directly in DevTools (`localStorage.setItem('_fd_admin_token', '<token>')`).
- **The actual security is the Worker**: the localStorage token is a UI convenience. The real enforcement is the `Authorization: Bearer` check in the Worker, which validates against the Cloudflare secret.
- **Consistent with existing pattern**: `decisions/2026-04-22-localstorage-per-agent-override` already uses localStorage for per-agent API key overrides in this codebase.

## How to access admin

```javascript
// Run once in browser DevTools:
localStorage.setItem('_fd_admin_token', '<ADMIN_TOKEN value>');
// Then reload the page — Admin tab appears.
```

## Sources
- [[sources/sessions/2026-04-26-analytics-build]]

## Related
- [[decisions/2026-04-22-localstorage-per-agent-override]]
- [[entities/analytics-system]]
- [[decisions/2026-04-26-cloudflare-workers-d1-analytics-backend]]

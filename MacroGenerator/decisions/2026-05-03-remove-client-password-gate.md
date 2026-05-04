---
title: Remove the client-side password gate rather than move it server-side
tags: [decision, security]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: active
---

# Decision: Remove the client-side password gate rather than move it server-side

## Context

`MacroGenerator.tsx` had a `requireAuth(callback)` wrapper that compared
a user-typed prompt against the literal string `"112233"` — see
[[bugs/2026-05-03-hardcoded-password-gate]] for the full bug
description.

Two reasonable fixes:

1. **Delete the gate** entirely.
2. **Move it server-side**: have the Worker mint a short-lived token,
   gate every macro Generate behind `Authorization: Bearer <token>`.

## Decision

Option 1 — delete it.

## Rationale

The macro generator emits chat-ready text from inputs the agent already
typed. Nothing it produces is privileged, sensitive, or rate-limited
beyond the upstream Binance API (which is already gated by the Worker
proxy's path allowlist after this session — see
[[decisions/2026-05-03-worker-path-allowlist]]).

The actual sensitive surface in the app is the analytics admin
dashboard. That already has a real bearer-token gate against the
Cloudflare Worker. We don't need a second, weaker gate elsewhere.

Moving the macro gate to the Worker would buy:

- A useful real-time check on Generate clicks (server can rate limit).
- Proof-of-employment if we ever ship to non-employees.

But it would cost:

- A `/auth/login` endpoint, a session-token cookie / store, an expiry
  flow, lockout handling.
- A round-trip on every Generate click.
- A new failure mode (Worker down → no macros at all).

Given the realistic threat model (the app is internal, on
`gorkemtikic.github.io/macro-generator/`, used by a small team of
support agents), the costs outweigh the benefits.

## Consequences

- Anyone with the URL can use the tool. This is fine — they could
  already do so, since the password was `112233`.
- The `prompt()` UX hazard is gone. Agents no longer type a password
  on every reload.
- If we later need real auth, we'd add it as a cookie-backed Worker
  gate — not as a client-side string compare.

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[bugs/2026-05-03-hardcoded-password-gate]]
- [[entities/macro-generator-component]]

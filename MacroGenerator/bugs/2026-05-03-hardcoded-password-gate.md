---
title: Hardcoded client-side password gate "112233" in MacroGenerator
tags: [bug, security, fixed]
source: sources/sessions/2026-05-03-full-codebase-audit-and-remediation.md
date: 2026-05-03
status: fixed
---

# Bug: Hardcoded client-side password gate "112233"

## Symptom

`src/components/MacroGenerator.tsx` had a `requireAuth(callback)` wrapper
that prompted for a password before letting the user click Generate /
Copy / Paste-Grid. The password compared against the literal string
`"112233"` in JSX:

```ts
const requireAuth = (callback: Function) => {
  if (isAuthenticated) { callback(); return; }
  const pwd = window.prompt(/* ... */);
  if (pwd === "112233") { setIsAuthenticated(true); callback(); }
  else if (pwd !== null) { alert(/* "Incorrect password!" */); }
};
```

## Root cause

Client-side "password" with the value embedded in the bundled JS. Anyone
could:

1. Read the value from DevTools sources / minified `dist/assets/index-*.js`.
2. Type `112233` in the prompt.
3. Set `localStorage._fd_admin_token = …` on the live origin and
   never see the prompt again, since `requireAuth` short-circuits when
   `isAuthenticated` is `true` (and the state survives via React but
   not across reloads — which the user worked around by typing `112233`
   on every reload).

Net effect: zero security value, plus an interactive `prompt()` UX
hazard.

## Fix

Removed the gate entirely (commit landed in
[[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]).
Changes:

- Deleted `requireAuth`, `isAuthenticated`, the prompt copy in EN/TR.
- `requireAuth(handleGenerate)` → `handleGenerate()`.
- `requireAuth(handleCopy)` → `handleCopy()`.
- `requireAuth(openParseModal)` → `openParseModal`.

Net diff: -22 lines, no replacement gate. The decision was to delete
rather than move the check server-side; see
[[decisions/2026-05-03-remove-client-password-gate]] for rationale.

## Why no server-side replacement

The actual sensitive surface (the analytics/admin endpoints) is already
gated by the Worker's bearer-token check. The macro generator itself
emits chat-ready text with no privileged data behind it. A server-side
gate on Generate would just slow down support agents.

## Related files

- `src/components/MacroGenerator.tsx`

## Sources

- [[sources/sessions/2026-05-03-full-codebase-audit-and-remediation]]

## Related

- [[decisions/2026-05-03-remove-client-password-gate]]
- [[entities/macro-generator-component]]

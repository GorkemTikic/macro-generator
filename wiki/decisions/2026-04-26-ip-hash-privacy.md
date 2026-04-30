---
title: Hash IPs server-side before storage (SHA-256 prefix)
tags: [decision, analytics, privacy, security]
source: sources/sessions/2026-04-26-analytics-build.md
date: 2026-04-26
status: active
---

# Decision: Hash IPs server-side before storage

## Decision

In the Cloudflare Worker, compute `SHA-256(CF-Connecting-IP)` and store only the **first 16 hex characters** (8 bytes) of the digest. Raw IP addresses are never written to D1.

```typescript
async function hashIp(ip: string): Promise<string> {
  const buf  = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
```

## Rationale

- **Privacy**: raw IPs are PII under GDPR. Hashing makes individual re-identification computationally infeasible.
- **Utility preserved**: the 16-char prefix is still useful for approximate unique-visitor counting within a session window, since hash collisions at 8 bytes are negligible for the expected traffic volume.
- **No-store guarantee**: the hash is computed entirely inside the Worker before the D1 insert; the raw IP is in memory for microseconds and never serialised anywhere.
- **Consistency with tool constraint**: the product design rule was "no reckless PII" — hashing satisfies this at the minimum overhead cost.

## Why only 8 bytes (16 hex chars)?

The full 32-byte SHA-256 is unnecessarily long for an approximate count. 8 bytes provides 2^64 possible values — astronomically more than needed — and truncation makes it slightly harder to use as a reversibility aid if the hash is ever leaked alongside the IP.

## Sources
- [[sources/sessions/2026-04-26-analytics-build]]

## Related
- [[entities/analytics-system]]
- [[decisions/2026-04-26-cloudflare-workers-d1-analytics-backend]]
- [[decisions/2026-04-26-devices-not-users-framing]] — privacy posture extended into the leadership-facing labelling

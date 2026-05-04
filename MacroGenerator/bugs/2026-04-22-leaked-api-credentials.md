---
title: API credentials JSONL transcript'inde plaintext
tags: [bug, security, credentials]
source: sources/sessions/2026-04-22-margin-restrictions-build.md
date: 2026-04-22
status: open
priority: high
---

# Security note: plaintext in API credentials JSONL transcript

## Symptom

In Session 530e, 21:06 message, the user pasted the Binance API key + secret pair into the chat. These are now plaintext in file `~/.claude/projects/.../530e1c25-....jsonl` — including the symlink/snapshot in the vault (reference to raw via [[sources/sessions/2026-04-22-margin-restrictions-build]]).

## Risk

- If the JSONL file is shared on local disk, the key will be leaked
- The risk expands if it falls within the scope of backup or cloud sync
- If committed to Git, public expose

## Mitigation (things to do)

1. **IMMEDIATELY revoke key in Binance account** — create a new key
2. Make the new key **read-only + IP-whitelisted** (recommended in `.env.example`)
3. Put the new key **only** into `.env.local` (there is already pattern `*.local` in `.gitignore`)
4. It is conceivable to force the JSONL transcript file to be cleared from disk — but the vault has the `raw/` immutable rule, so it will not be deleted. Alternative: the snapshot is replaced with a sanitized copy and the link is moved to archive/.

## Notes

- Code implementation **correctly designed**: `.env.local` gitignored, build-time env, localStorage override — see. [[decisions/2026-04-22-build-time-api-key]]. It's not about the code, it's about **sharing on chat**.
- The reference in the Vault **marks** this event — instead of deleting it, we write it in a visible place, it will attract attention in a similar situation in the future.

## Sources

- [[sources/sessions/2026-04-22-margin-restrictions-build]]

## Related

- [[decisions/2026-04-22-build-time-api-key]]
- [[entities/restricted-assets-helper]]
- [[sources/docs/2026-04-22-env-example]]

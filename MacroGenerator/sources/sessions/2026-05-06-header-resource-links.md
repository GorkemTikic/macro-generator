---
title: "2026-05-06: Header Resource Links"
type: session
date: 2026-05-06
tags: [ux, onboarding, guide, video, header, deploy]
status: active
---

# 2026-05-06 Header Resource Links

## Objective

Make the project guidance easier for agents to find directly from the
live Futures DeskMate app. The goal was to remove friction for new or
returning agents by putting the "How to Use" guide and the video guide
collection in the top header, instead of relying on separate messages or
external bookmarks.

## What was delivered

Two compact header links were added next to the live ticker and before
the language switcher:

- `How to Use` -> `https://boffice.toolsfdg.net/sh/x_rrcN3VYT-qsX_`
- `Video Guides` -> `https://boffice.toolsfdg.net/sh/sVbnNVdxrWmgN9C`

The links open in a new tab so agents do not lose their current
workspace state. They use small pill/chip styling that matches the
existing app header affordances without taking over the primary tab row.

## Files touched

- `src/App.tsx` - added a `resource-links` nav group with the two external
  guide anchors.
- `src/styles.css` - added `.resource-links` and `.resource-link` styles for
  compact header chips, hover state, wrapping, and no-overflow behavior.

## Verification

- `npm run build` passed.
- Commit `72e33f1` - `feat: add guide links to header`.
- GitHub Pages deploy succeeded from `main`.
- Generate Progress Report workflow succeeded.
- Live bundle was verified to contain both guide URLs and the
  `Video Guides` label.

## Management value

The update improves enablement and discoverability. Agents can open
written and video guidance from the same workspace they use for daily
Futures cases, which reduces onboarding friction, cuts down repeated
"where is the guide?" questions, and makes the tool feel more complete
as an internal support product.

## Sources

- [[sources/sessions/2026-05-06-header-resource-links]]

## Related

- [[entities/app-tsx]]
- [[decisions/github-pages-deploy]]

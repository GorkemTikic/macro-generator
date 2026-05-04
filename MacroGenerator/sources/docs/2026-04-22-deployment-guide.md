---
title: DEPLOYMENT_GUIDE.md
tags: [source, doc, deployment]
source: DEPLOYMENT_GUIDE.md
date: 2026-04-22
status: active
---

# DEPLOYMENT_GUIDE.md summary

## Aim

Steps to deploy to GitHub Pages + local/remote synchronization.

## Steps

1. **Initial Publish**: GitHub repo oluştur → Settings > Pages > Source = "GitHub Actions" (gerekli!) → `git remote add` + `git push -u origin main`
2. **Auto-deploy**: `main` push'u GitHub Action tetikler → build + Pages deploy
3. **URL**: `https://YOUR_GITHUB_USERNAME.github.io/macro-generator/`
4. **Update remote**: `git add . && git commit -m "..." && git push origin main`
5. **Pull remote**: `git pull origin main`
6. **Built-in scripts**: `npm run dev`, `npm run build`, `npm run deploy` (gh-pages manuel fallback)

## Notes

- **Repo URL hardcoded**: `gorkemtikic/macro-generator`
- **Sub-path**: `vite.config.ts` must be compatible with `base: "/macro-generator/"`
- "GitHub Actions" source mode is required — incompatible with branch deploy mode

## Open topics

- "Setup & Execution" in README does not include step `cd macro-generator-main` — zip download would be helpful for nesting issue ([[bugs/2026-04-22-npm-wrong-cwd]])
- Production CORS proxy (`VITE_MARGIN_PROXY`) configuration is not in DEPLOYMENT_GUIDE — it is in `.env.example`

## Sources

- `DEPLOYMENT_GUIDE.md`

## Related

- [[entities/vite-config]]
- [[decisions/github-pages-deploy]]
- [[sources/docs/2026-04-22-env-example]]
- [[bugs/2026-04-22-npm-wrong-cwd]]

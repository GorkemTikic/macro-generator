---
title: npm run dev — ENOENT package.json (wrong directory)
tags: [bug, dev, env]
source: sources/sessions/2026-04-22-npm-dev-wrong-cwd.md
date: 2026-04-22
status: fixed
---

# Bug: `npm run dev` ENOENT — wrong working directory

## Symptom

Session 8d9d (2026-04-22 21:14):

```
PS C:\Users\user\Desktop\Macro App\macro-generator-main> npm run dev
npm error code ENOENT
npm error path C:\Users\user\Desktop\Macro App\macro-generator-main\package.json
npm error enoent Could not read package.json
```

## Root cause

The project is **double nested** when zip downloaded from GitHub:

```
Macro App/
└── macro-generator-main/         ← npm burada koşturuldu
    └── macro-generator-main/     ← gerçek proje burada
        ├── package.json
        ├── src/
        └── ...
```

`npm` is looking for `package.json` in its parent directory, but cannot find it.

## Fix

Enter a subfolder with `cd macro-generator-main`, then `npm install` + `npm run dev`.

## Course found

GitHub zip download folder nesting convention — a note in the README might be helpful. See lint-report finding.

## Sources

- [[sources/sessions/2026-04-22-npm-dev-wrong-cwd]]

## Related

- [[sources/docs/2026-04-22-deployment-guide]]

---
title: Analytics Setup Guide
tags: [docs, analytics, deployment, cloudflare]
source: worker/, src/analytics/index.ts
date: 2026-04-26
status: active
---

# Analytics Setup Guide

Step-by-step guide to deploying the analytics worker and enabling the admin dashboard.

---

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com) (free tier is sufficient)
- Node.js installed
- `npm install -g wrangler` (Cloudflare CLI)

---

## Step 1 — Authenticate Wrangler

```bash
wrangler login
```

This opens a browser to authorise Wrangler with your Cloudflare account.

---

## Step 2 — Create the D1 Database

```bash
wrangler d1 create macro-analytics-db
```

Copy the `database_id` from the output. It looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

---

## Step 3 — Update wrangler.toml

Open `worker/wrangler.toml` and replace the placeholder:

```toml
[[d1_databases]]
binding       = "DB"
database_name = "macro-analytics-db"
database_id   = "PASTE_YOUR_ID_HERE"   # ← replace this

[vars]
ALLOWED_ORIGIN = "https://YOUR-GITHUB-USERNAME.github.io"   # ← replace this
```

---

## Step 4 — Apply the Database Schema

```bash
cd worker
wrangler d1 execute macro-analytics-db --file=schema.sql
```

Expected output: `🌀 Executing on remote database...` then success.

---

## Step 5 — Set the Admin Token Secret

Pick a strong random password. Store it somewhere safe (password manager).

```bash
wrangler secret put ADMIN_TOKEN
# Paste your token when prompted
```

This is the password you'll use to log into the admin dashboard. **Never put it in a config file.**

---

## Step 6 — Deploy the Worker

```bash
wrangler deploy
```

The CLI prints the worker URL, e.g.:
```
https://macro-analytics.YOUR-SUBDOMAIN.workers.dev
```

Copy this URL.

---

## Step 7 — Wire the Frontend

Add the worker URL to your environment:

```bash
# In the project root (macro-generator-main/)
echo "VITE_ANALYTICS_URL=https://macro-analytics.YOUR-SUBDOMAIN.workers.dev" >> .env.local
```

Or add it as a GitHub Actions secret if you use CI/CD (add `VITE_ANALYTICS_URL` as a repository secret, then add `--env VITE_ANALYTICS_URL=${{ secrets.VITE_ANALYTICS_URL }}` to your build step).

---

## Step 8 — Rebuild and Deploy the Frontend

```bash
npm run build
# or let GitHub Actions deploy automatically via git push
```

---

## Step 9 — Access the Admin Dashboard

1. Open the deployed app (GitHub Pages URL)
2. Open browser DevTools console
3. Run:
   ```javascript
   localStorage.setItem('_fd_admin_token', 'YOUR_ADMIN_TOKEN_HERE');
   ```
4. Refresh the page
5. An **⚙ Admin** tab appears in the navigation
6. Click it, enter your admin token in the login form (it auto-fills if already set)

To log out, click the **Logout** button in the admin dashboard. This clears the token from localStorage and hides the tab.

---

## Verification

To confirm events are arriving, check the D1 database:

```bash
wrangler d1 execute macro-analytics-db --command "SELECT COUNT(*) FROM events"
```

Or open a tab in the app and immediately check the admin dashboard — you should see at least a `page_view` event.

---

## Cost Estimate (Cloudflare Free Tier)

| Resource | Free Limit | Expected Usage |
|---|---|---|
| Worker requests | 100,000 / day | ~5–10 / session |
| D1 row writes | 100,000 / day | 1 per event |
| D1 row reads | 10,000,000 / day | ~20 per admin page load |
| D1 storage | 5 GB | Negligible for years |

This app will stay well within the free tier even at heavy usage.

---

## Troubleshooting

**Events not showing up:**
- Check that `VITE_ANALYTICS_URL` is set and the app was rebuilt after adding it.
- Open DevTools → Network and look for POST requests to your worker URL. A 200 response means the event was accepted.

**Admin shows "Invalid admin token":**
- Verify the token you entered in the form matches what you set with `wrangler secret put ADMIN_TOKEN`.
- Tokens are case-sensitive.

**CORS errors:**
- Check `ALLOWED_ORIGIN` in `wrangler.toml` matches your GitHub Pages URL exactly (no trailing slash).
- After editing `wrangler.toml`, run `wrangler deploy` again.

**Worker not deployed yet / VITE_ANALYTICS_URL not set:**
- The analytics client does nothing if the URL is empty. The app works normally.
- You can add analytics at any time — it's fully opt-in.

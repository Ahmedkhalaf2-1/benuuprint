# Production deployment (VPS)

## Architecture

| Role | Address |
|---|---|
| Public website | https://benuuprint.com, https://www.benuuprint.com |
| Public API | https://api.benuuprint.com/api/v1 |
| Next.js frontend (internal) | 127.0.0.1:3021 |
| NestJS backend (internal) | 127.0.0.1:3020 |
| Benue PostgreSQL | 5545 |
| Reverse proxy | Caddy |
| Process manager | PM2 (`benue-frontend`) |
| Runtime | Node.js 22, pnpm |

Coexistence: the **Contrast** project already uses 3000 (frontend), 3010 (backend) and 5544 (PostgreSQL) on this VPS. Benue Print must never use those. Port 3021 binds to loopback only and is never exposed publicly; Caddy is the only public entry point.

## Environment variables

| Variable | Production value | When read |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.benuuprint.com/api/v1` | **build time** (inlined in the bundle) |
| `NEXT_PUBLIC_SITE_URL` | `https://benuuprint.com` | **build time** (canonical, Open Graph, sitemap, robots) |
| `HOST` / `PORT` | `127.0.0.1` / `3021` (set by `ecosystem.config.cjs`) | runtime, `next start` only |

`NEXT_PUBLIC_*` values are public and must never contain secrets. The frontend has no secrets. `src/lib/config/env.ts` is the only place that reads them.

### They must be set BEFORE `pnpm build`

Next.js replaces `NEXT_PUBLIC_*` with literal strings during `next build`. Changing them afterwards (in the shell, in PM2 `--update-env`, or in the env file) **does nothing** until you rebuild. If the API URL or site URL is wrong in production, fix the env and run `pnpm build` again.

The production env file lives **only on the VPS** (never committed). Use `.env.production.local` in the frontend directory (git-ignored, loaded by `next build`):

```
NEXT_PUBLIC_API_URL=https://api.benuuprint.com/api/v1
NEXT_PUBLIC_SITE_URL=https://benuuprint.com
```

Alternatively export them inline on the build command (below). Local development uses `.env.local` (see `.env.example`); do not copy it to the VPS.

## Deploy sequence

```bash
cd /opt/benue-print/frontend-repo/frontend

git pull

pnpm install --frozen-lockfile

# create/update the production env BEFORE building
cat > .env.production.local <<'ENV'
NEXT_PUBLIC_API_URL=https://api.benuuprint.com/api/v1
NEXT_PUBLIC_SITE_URL=https://benuuprint.com
ENV

NEXT_PUBLIC_API_URL=https://api.benuuprint.com/api/v1 \
NEXT_PUBLIC_SITE_URL=https://benuuprint.com \
pnpm build
```

First start (once):

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

Every later deploy (after `pnpm build`):

```bash
pm2 restart benue-frontend --update-env
# or: pm2 startOrReload ecosystem.config.cjs --update-env
```

Verify locally on the VPS:

```bash
curl -I http://127.0.0.1:3021
pm2 status benue-frontend
ss -ltnp | grep 3021    # must show 127.0.0.1:3021, not 0.0.0.0
```

## PM2

`ecosystem.config.cjs` defines `benue-frontend`: `NODE_ENV=production`, `cwd` = the frontend directory, single fork instance, runs `next start --hostname 127.0.0.1 --port 3021`, restarts on failure (max 10 restarts, 10s min uptime). `pnpm start` is also available and reads `HOST`/`PORT` (defaults `0.0.0.0`/`3001`), so local development is unaffected: `pnpm dev` stays on 3001.

## Caddy (intended routing, configured separately, not in this repo)

```
benuuprint.com, www.benuuprint.com  ->  reverse_proxy 127.0.0.1:3021
api.benuuprint.com                  ->  reverse_proxy 127.0.0.1:3020
```

DNS A/AAAA records for `benuuprint.com`, `www` and `api` must point to the VPS; Caddy obtains the TLS certificates. Consider redirecting `www` to the apex so the canonical host is `https://benuuprint.com`.

Backend requirements (outside this repo): `CORS_ORIGINS` must include `https://benuuprint.com` (and `https://www.benuuprint.com` if www is served rather than redirected), and `PUBLIC_APP_URL` should be `https://benuuprint.com` so created tracking links carry the website URL.

## How requests flow

- **Browser to API**: browser code calls `NEXT_PUBLIC_API_URL` (`https://api.benuuprint.com/api/v1`) directly with a Bearer access token held in memory.
- **Auth (BFF)**: the browser calls same-origin Next route handlers, which call the backend at `NEXT_PUBLIC_API_URL` from the server and hold the refresh token in an httpOnly cookie.
  - Staff: `/api/auth/{login,refresh,logout}`, cookie `bp_rt` (path `/`).
  - Customer: `/api/customer/auth/{login,refresh,logout}`, cookie `bp_c_rt` (path `/api/customer`). Fully separate from staff.
  - Cookies are `secure` when `NODE_ENV=production` (set by PM2), so the site must be served over HTTPS (Caddy). Do not test the production build over plain HTTP from another host: browsers will drop the secure cookies. Local `pnpm dev` is unaffected.
- Because the BFF calls the public API URL from the same VPS, the VPS must be able to resolve and reach `api.benuuprint.com` (normal public DNS is enough).
- Refresh behaviour is unchanged: one coordinated refresh, 401 triggers a single refresh and one retry, 403 never triggers refresh or logout.

## Language (English / Arabic)

The site and both apps are bilingual. The language is stored in the non-sensitive `bp_locale` cookie (no URL prefix), see [I18N.md](./I18N.md). Because the root layout reads that cookie, application pages are rendered per request (dynamic); this needs no extra server setting. The Arabic font is bundled (`@fontsource/ibm-plex-sans-arabic`), so the production build needs no Google Fonts access.

## SEO

Canonical, Open Graph, `metadataBase`, sitemap and robots are emitted only from `NEXT_PUBLIC_SITE_URL`. With it set to `https://benuuprint.com` at build time, all absolute URLs use that origin. With it unset nothing is emitted (there is never a localhost fallback).

## Known contract note: customer responsibility matrix

`getMatrix` (`src/features/responsibilities/api.ts`) accepts both a bare array (OpenAPI) and an envelope with `items`/`areas`/`responsibilities` plus `commercial` (the backend document mentions `commercial.salesOwner`). The backend document does not settle which one is returned, so this is deliberately left tolerant. Tighten it once the live response shape is confirmed.

## Checklist (manual, on the VPS / DNS)

1. DNS records for `benuuprint.com`, `www`, `api`.
2. Caddy config + TLS for the two site blocks above.
3. Backend running at 127.0.0.1:3020 with correct CORS and `PUBLIC_APP_URL`.
4. Frontend env file with the two `NEXT_PUBLIC_*` values, then `pnpm build`.
5. `pm2 start ecosystem.config.cjs && pm2 save` (first time) or `pm2 restart benue-frontend --update-env`.
6. `curl -I http://127.0.0.1:3021`, then check https://benuuprint.com, staff login, customer login, and a public `/track/<token>` page.

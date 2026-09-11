# Los Santos Wire

An independent GTA news and reference site built with Next.js 16 App Router, TypeScript, Tailwind CSS, and Supabase. Public news is sourced, labeled, and separated from rumors. Administrator access uses Supabase Auth and an email allowlist; ingestion uses the OpenAI Responses API for structured extraction with server-side evidence and trust checks.

This repository does not establish that any deployment, feed, credentials, or live ingestion have been verified. No Rockstar feed is guaranteed available. Live content requires operator-configured sources and publication approval/settings. Production public-data reads exclude fixtures even if `DEMO_MODE=true`; missing production database configuration returns empty content and safe settings.

Autonomous Rockstar monitoring is not operational until an approved, accessible feed, API, or permitted HTML source is configured and tested. In the operator-reported check on 2026-09-10, Newswire required JavaScript and exposed no parseable body to the web reader; `/newswire/rss` was unavailable. Do not invent a feed endpoint. The accumulation migration adds opt-in GTABase HTML sources for Thursday event-week and vehicle-catalog collection, while keeping third-party weekly records reported/review-only. It also records the current official GTA VI date from Rockstar's VI page when the setting is unset. See the [source policy](docs/editorial-policy.md).

## Local development

Use Node.js 22.12 or newer within the supported engine range (`>=22.12.0 <25`) and npm. CI uses Node 22. The manifest pins exact versions and the lockfile determines the complete installed dependency tree.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000` (the current shared preview is on `http://localhost:3001`). For an explicit alternate port, run `npm run dev -- --port 3001` and match `NEXT_PUBLIC_SITE_URL` to that local origin. Leave database credentials empty to work on empty/development states. `DEMO_MODE=true` is for local development only; fixtures are fictional, labeled, and excluded from search indexing. Always set `DEMO_MODE=false` for production and previews. Do not use a production database for fixture seeding.

The shared preview's ignored `.env.local` contains only its local origin configuration; it is not production credential setup. Do not overwrite an existing local environment file when following the copy command. `.env.example` keeps the normal localhost:3000 default and shows where to substitute your actual production domain.

For real data, provision Supabase, apply the migrations, fill `.env.local`, create a confirmed administrator account, and configure a permitted source using the [deployment guide](docs/deployment.md). Reading already-published content does not require an OpenAI key; automated extraction does.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting application code |
| `npm test` | Vitest suite |
| `npm run build` | Production build; must work without secrets |
| `npm start` | Serve an existing production build |
| `npm run seed` | Development seed entry point; read the deployment guide before using |

CI runs lint, typecheck, tests, and build with empty service credentials. It does not deploy, migrate a remote database, fetch live feeds, or confirm production readiness.

## Deploy and operate

Deploy to Vercel or a compatible Node.js host with Supabase. The recommended free scheduler is the explicitly gated GitHub Actions HTTP workflow; Vercel Cron remains disabled. It runs every 30 minutes and calls `GET /api/cron/news-sync` with `Authorization: Bearer <CRON_SECRET>`. The route also runs the vehicle catalog collector; weekly sources are gated to Thursdays after `WEEKLY_SYNC_AFTER_UTC_HOUR` (default 10 UTC). Setup and switching instructions are in [deployment](docs/deployment.md). A paid Vercel plan is only needed if you prefer Vercel Cron instead.

Transient-data cleanup runs when an automation run is inserted, so retention depends on functioning scheduled runs. It removes rate-limit records expired for over one day, expired AI extraction cache entries, and daily view aggregates older than 90 UTC days. See [operations](docs/operations.md) for the retention limits and monitoring requirements.

- [Architecture and data boundaries](docs/architecture.md)
- [Deployment, credentials, migrations, and scheduler selection](docs/deployment.md)
- [Editorial policy and source permissions](docs/editorial-policy.md)
- [Operations, failure recovery, and acceptance checks](docs/operations.md)
- [Shared implementation contracts](docs/contracts.md)

This website is an independent fan-operated GTA news and information platform and is not affiliated with Rockstar Games or Take-Two Interactive.

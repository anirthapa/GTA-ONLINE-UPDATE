# Deployment

These are operator instructions, not evidence of a completed deployment. No production credentials, remote migrations, feed availability, admin login, scheduler execution, or Search Console submission are verified by these docs.

## Prerequisites and configuration

Use Node.js 22 (at least 22.12), npm, a Supabase project, and a Vercel project or compatible Node host. Use separate Supabase projects for production and development. Copy `.env.example` to `.env.local` only for local work when that file does not already exist; configure hosted variables through the hosting dashboard. The ignored shared-preview `.env.local` uses `http://localhost:3001` and is not a production credential file. The example's normal local default remains port 3000; replace the documented production placeholder with your actual domain before deploying.

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonicals and production indexing | Final HTTPS origin, no path/query/fragment; localhost for local development |
| `NEXT_PUBLIC_SUPABASE_URL` | Database and Auth | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Administrator Auth | Preferred modern Supabase browser-safe key; legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted |
| `SUPABASE_SERVICE_ROLE_KEY` | Server reads/writes and sync | Server-only service-role key; never prefix with `NEXT_PUBLIC_` |
| `ADMIN_EMAIL` | Administrator access | Comma-separated allowlist of confirmed Auth account emails |
| `AI_PROVIDER` | Real ingestion extraction | `groq` uses the free Groq plan; `openai` selects the paid OpenAI fallback |
| `GROQ_API_KEY` | Real ingestion extraction | Server-only Groq key; required when `AI_PROVIDER=groq` |
| `AI_MODEL` | Optional extraction override | Groq default: `openai/gpt-oss-120b`; verify current free-plan limits |
| `OPENAI_API_KEY` | Optional paid extraction fallback | Server-only; used when `AI_PROVIDER=openai` or no provider is selected |
| `OPENAI_MODEL` | Optional OpenAI model override | Used by the OpenAI fallback; operator must verify account/model access |
| `CRON_SECRET` | Cron endpoint and database-backed abuse prevention/views | Random secret of at least 32 characters, as required by the routes; same value on the selected scheduler |
| `INGESTION_BUDGET_MS` | Optional sync work budget | Default 240000; numeric milliseconds clamped to 5000–240000; leave time for in-flight requests and finalization |
| `DEMO_MODE` | Local fixture development | `false` on production and previews; never seed production |
| `ALLOW_FICTIONAL_SEED` | Explicit development seed opt-in | `false` when deployed; `true` only while seeding an isolated test database |
| `GOOGLE_SITE_VERIFICATION` | Optional Search Console | Ownership token; not proof of successful verification |
| `CONTACT_EMAIL` | Optional public contact page | Editorial address published to readers; do not put a private credential here |

The `NEXT_PUBLIC_` values can be embedded at build time. Set the correct production values before building and redeploy after changing them. Do not print or commit secrets. Use a password manager to generate/store the cron secret. `NODE_ENV` and `VERCEL_ENV` are runtime/platform values, not demo switches.

## Database migrations

Run from the repository root. Install/use the Supabase CLI according to the [Supabase migration guide](https://supabase.com/docs/guides/deployment/database-migrations). This repository stores migrations under `supabase/migrations/`:

- `202609100001_core.sql`: schema, RLS, defaults, trust constraints, admin revisions and leases, including 0–100 confidence fields for guides and vehicles.
- `202609100002_ingestion.sql`: transactional ingestion persistence.
- `202609100003_cost_controls.sql`: extraction cache and early duplicate attachment.
- `202609100010_analytics.sql`: database rate limits, per-day article views, trending RPC, and transient-data cleanup triggered by automation-run insertion.
- `202609100011_catalog_search.sql`: generated guide `search_document` combining title and description with the PostgreSQL `simple` text-search configuration, plus its GIN index for catalog search.
- `202609100012_explicit_deny_policies.sql`: explicit deny policies for anonymous/authenticated clients; server-side `service_role` access remains the only application data path.

If this checkout has no `supabase/config.toml`, initialize the CLI configuration once. `init` is a setup action; it is not a migration or seed.

```powershell
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Skip `init` if a configuration already exists. Confirm the linked project and inspect the dry run before pushing. Keep backups before changes to a populated database. The migration SQL is not a repeatable manual paste script; use migration history. Do not run `db reset` against production.

If an earlier revision of these migration files was already applied, editing the same filename does not apply its new SQL to that database. Reconcile the schema through a reviewed forward migration before treating confidence controls or retention cleanup as installed.

For an isolated local Supabase stack, initialize configuration, run `npx supabase start` (Docker required), then `npx supabase migration up --local`. Read the local API credentials from the CLI status and put them in `.env.local`. Supabase CLI login tokens and database passwords are operator setup credentials; they are not required by the application CI workflow.

## Development seed

The actual entry point is `scripts/seed.ts`; the package script is `tsx --env-file=.env.local scripts/seed.ts`. With migrations already applied and `.env.local` pointing only at an isolated development database, run:

```powershell
$env:ALLOW_FICTIONAL_SEED = 'true'
try { npm run seed } finally { Remove-Item Env:ALLOW_FICTIONAL_SEED -ErrorAction SilentlyContinue }
```

The script requires the opt-in, Supabase URL, and service-role key. It upserts fictional articles, archived weekly test data, vehicles, and guides by fixed IDs; it does not create sources, administrators, or live announcements. Re-running can overwrite earlier fixture edits at those IDs. The seed guard is an explicit opt-in, not proof the supplied database is non-production: inspect the target yourself. Seeding is optional and must not run during deployment or CI. Fictional records retain `is_seed=true`; unknown-verification weekly fixtures are not eligible to appear as confirmed current events.

## Administrator setup

In Supabase Auth, create an email/password account for each permitted administrator and confirm its email. Put those exact addresses in `ADMIN_EMAIL`. Configure the Auth Site URL to the final origin and the allowed callback URL to `https://YOUR_DOMAIN/auth/callback`; add the localhost callback only for development. Sign in at `/admin/login`. There is no shared default password, automatic account creation, or fixture-based admin bypass. A successful Supabase login still requires a confirmed allowlisted email.

Configure sources only after verifying accessible content and permission. Newswire's reported JavaScript-only body and unavailable RSS path mean automated Rockstar monitoring is not ready simply because the app deployed. See the [dated availability notes](editorial-policy.md#source-availability-and-permission). Do not seed a VI release date; administrators configure it from a newly checked official source.

## Vercel deployment

Import the repository as a Next.js project, select Node.js 22, and use `npm ci` with the default Next.js output. The checked-in build command rejects `DEMO_MODE=true` before running `npm run build`; keep that guard when configuring dashboard overrides. Add production variables, apply the migrations to the intended project, and deploy. Use separate preview credentials or leave preview database configuration empty. Do not enable real scheduled ingestion against previews.

`vercel.json` declares Next.js, a 300-second maximum for the sync function, and an empty `crons` list. The route's own duration and your plan's function limits must support the workload; a configured maximum is not a guarantee a batch will finish. No Vercel account or deployment has been exercised by this change.

## Choose exactly one scheduler

The recommended free option is GitHub Actions. The committed configuration schedules no Vercel HTTP calls: Vercel has no cron entries and GitHub's job requires explicit repository variables. Do not enable both providers. The desired interval is 30 minutes; per-source `fetch_frequency` can cause a source to be skipped until it is due.

### Option A: GitHub scheduled HTTP — recommended free option

Leave `vercel.json` with `"crons": []` and deploy that configuration. Under repository Settings → Secrets and variables → Actions, configure:

| Kind | Name | Value |
| --- | --- | --- |
| Repository variable | `NEWS_SYNC_ENABLED` | `true` |
| Repository variable | `NEWS_SYNC_SCHEDULER` | `github` |
| Repository variable | `NEWS_SYNC_SITE_URL` | Final public HTTPS origin, with no extra path |
| Repository secret | `CRON_SECRET` | Exact value of the app's production `CRON_SECRET` |

`.github/workflows/news-sync.yml` runs at minutes 17 and 47 UTC, and offers a manually dispatched run behind the same gates. It calls `GET /api/cron/news-sync` with a bearer token, rejects redirects, and prevents concurrent GitHub jobs. It checks the checked-out Vercel configuration for a duplicate sync cron. It cannot inspect an old deployed Vercel schedule: remove that schedule and redeploy before enabling GitHub.

GitHub Actions is the scheduler; the application can still be hosted on Vercel Hobby or another free/low-cost HTTPS host. The workflow does not need a paid Vercel plan because it makes a normal authenticated HTTPS request from GitHub's runner.

The endpoint must be reachable from GitHub's runners and return its JSON response directly; an access-protection login page or domain redirect will fail the run. Use the final canonical hostname. GitHub schedules run from the default branch, may be delayed or dropped under load, and can be disabled after inactivity in public repositories. This is a requested interval, not a timing SLA. See [GitHub scheduling behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

### Option B: Vercel Cron on a paid plan

Set `NEWS_SYNC_ENABLED=false` and `NEWS_SYNC_SCHEDULER=vercel` (or leave GitHub variables unset). Replace the empty `crons` array in `vercel.json` with:

```json
"crons": [
  { "path": "/api/cron/news-sync", "schedule": "*/30 * * * *" }
]
```

Keep the other configuration fields. Set the production `CRON_SECRET`, redeploy, and confirm the single cron in the project dashboard. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. A 30-minute Vercel cron requires Pro/Enterprise; Hobby only permits daily schedules and rejects this interval. Function usage and duration limits still apply. See [Vercel cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [cron authentication and lifecycle](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

When switching providers, disable the current provider first, wait for active work to finish, remove/redeploy its schedule if applicable, and then enable the other provider. Leases and idempotency are secondary protection, not permission to schedule duplicate work.

Retention also depends on the chosen scheduler reaching a committed insertion into `automation_runs`. That insertion triggers cleanup of rate limits expired for over one day, expired AI cache entries, and daily view aggregates older than 90 UTC days. No independent cleanup schedule is configured; disabled scheduling, missing ingestion credentials, or failure before insertion can extend retention. Monitor actual run records, not just the presence of a cron entry.

## Release acceptance

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. CI uses no application secrets and proves neither connectivity nor deployment. Use the [operations checklist](operations.md) to verify admin authorization, empty production behavior, source permissions, one real sync, review/publishing, and sitemap output after deployment. Record date, deployment revision, database migration versions, scheduler provider, and actual results before describing any deployment as verified.

The backend now rejects fixture access whenever `NODE_ENV=production`, even if `DEMO_MODE=true`: missing database configuration yields empty data and safe settings, and configured public queries exclude seeds. Keep the flag false when deployed; the Vercel build command rejects a true flag, and root metadata plus sitemap/robots routes use `indexingAllowed()` to suppress indexing for demo or misconfigured environments. These guards do not constitute live deployment verification.

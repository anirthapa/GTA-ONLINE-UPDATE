# Operations

## First live acceptance

Record the deployed revision, date, operator, migration versions, and selected scheduler. This checklist is work to perform with real credentials; its presence does not mean the checks passed.

1. Run the four CI commands and confirm a credential-free production build succeeds. In an isolated production-runtime check without database configuration, confirm empty public news, no active fabricated weekly offer, and empty sitemaps. Verify the backend also refuses fixtures with `NODE_ENV=production` and `DEMO_MODE=true`; the Vercel deployment guard itself rejects that flag. Never remove credentials from a live site just to test this.
2. Confirm the intended Supabase migrations are applied. Verify anonymous/authenticated table access is denied and the application can read through its server client. Never expose the service-role key in browser bundles, logs, or workflow output.
3. Confirm an allowlisted, email-confirmed account can sign in at `/admin/login`. Confirm an unallowlisted account and an unauthenticated request cannot invoke admin mutations. Verify logout and session expiry.
4. Keep auto-publish disabled. Add a permitted source with an exact host allowlist and run its source test. Check real parsed titles/URLs and rejection counts; a successful fetch does not prove extraction or publication.
5. Check cron authentication: an unauthenticated request must be rejected; a correctly authenticated request should produce a JSON result. Calling the authenticated endpoint can fetch sources, spend API credits, and write to the database; do this against the intended environment only.
6. Inspect the corresponding automation run, source item, evidence, and review/draft article. Confirm a manual publication passes provenance checks. Confirm only eligible real article records appear in the sitemap alongside public static routes and verified reference pages; seeds, review, drafts, and future publication dates stay excluded. Confirm the current weekly canonical is present even while awaiting a verified event, and archive entries require a real published parent article.
7. Verify an active weekly update has explicit source dates and disappears from the current slot at its exclusive end boundary. With no qualifying record, the UI must say no verified current update is available.
8. Enable exactly one scheduler after the manual check. Observe its next run and record the result. Confirm host timeouts and API usage are acceptable. A successful HTTP response alone does not establish that anything was published.
9. Inspect `/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml`, rendered canonical/meta tags, and any JSON-LD on the final domain. Preview/demo environments must remain excluded. Search Console and Google News inclusion require separate verification and are never implied by a sitemap.
10. With the analytics migration applied and a configured `CRON_SECRET`, verify `POST /api/views` rejects a wrong origin, counts a real published article, deduplicates repeated views, and updates `article_daily_views`. Check the 60-per-minute request limit in an isolated environment. A JSON `{ "ok": true }` response means the request was handled, not necessarily that a duplicate view incremented the counter.

## Routine monitoring

Use `/admin/logs` and the source/admin pages together with host logs. Database records include `automation_runs`, `automation_logs`, `source_items`, source failure counters and timestamps, article revisions, and ingestion leases. Distinguish a run with no enabled/due sources from a successful publication. Inspect `PARTIAL`, `FAILED`, or `ABANDONED` runs and source-level failures even if the scheduler itself completed.

Monitor source freshness, rejected items, extraction failures, publication/review counts, elapsed duration, API spend, and whether current weekly data has expired. `last_successful_fetch_at` establishes fetch recency, not confirmation of every article fact. A new `last_checked_at` alone is not evidence of success. Set alerting in the host/Actions/monitoring system you actually operate; this repository does not provision an external alert service.

GitHub's scheduled workflow is gated by `NEWS_SYNC_ENABLED=true` and `NEWS_SYNC_SCHEDULER=github`. Manual workflow dispatch uses the same gates. It checks HTTP status and reported incomplete-run status, does not follow redirects, and does not retry the entire mutating request automatically. See deployment instructions for the provider-switching sequence.

## Retention and cleanup

`202609100010_analytics.sql` installs a trigger before insertion into `automation_runs`. A committed insertion runs these cleanup rules:

| Stored data | Removal condition |
| --- | --- |
| `rate_limits` | `expires_at` is more than one day in the past |
| `ai_extractions` | The cache entry has expired |
| `article_daily_views` | Its UTC `day` is older than 90 days |

Retention relies on functioning scheduled runs reaching that insertion; there is no independent TTL worker or database cleanup timer. Disabled scheduling, missing credentials, skipped runs that never insert, and failures before insertion can leave old rows in place beyond these ages. Cleanup in a rolled-back insertion transaction is also rolled back. Monitor committed automation runs and the oldest eligible rows; do not describe these thresholds as guaranteed deletion deadlines. Removing daily aggregates does not reset lifetime article view totals. This trigger does not define retention for articles, revisions, provenance, automation logs, or provider backups.

## Failure handling

| Symptom | Investigation and action |
| --- | --- |
| Empty production news | Confirm database credentials and migrations, then inspect published non-seed rows and backend errors. Do not enable demo mode to mask it. |
| Cron authorization failure | A missing/short secret returns 503; a wrong bearer token returns 401. Set at least 32 random characters and compare app/scheduler values. Rotate/redeploy both sides together. |
| Redirect, HTML response, or protection screen | Correct the scheduler origin and legitimate endpoint access configuration. The workflow deliberately requires direct JSON. |
| Source 403/challenge/permission refusal | Disable the source pending legitimate access; do not bypass restrictions or turn on HTML fallback automatically. |
| DNS/host/content-type rejection | Check explicit permitted hosts and actual feed format. Do not weaken private-address or redirect checks to make a source pass. |
| Source timeout, 429, or 5xx | Inspect source logs and fetch frequency; allow bounded retries/backoff and reduce load. Do not repeatedly dispatch full runs. |
| OpenAI key/model/quota/output error | Check credentials, permitted model, quota and schema/evidence rejection. Keep the item unpublished and retry only after fixing the cause. |
| Duplicate/locked sync | Inspect the active run/lease and scheduler selection. Do not clear a live lease or enable a second provider. |
| Runtime timeout / unfinished run | Inspect run status, lease expiry and processed items before retrying. Reduce enabled source workload or plan a larger execution environment; a 300-second setting is not a queue. |
| Admin save conflict | Reload and compare the current revision before applying the edit again. Do not overwrite another editor's change blindly. |
| Missing news sitemap entry | Check publication date (48-hour window), status, seed flag, verification label, source URL, canonical configuration, and environment indexing gate. |
| Sitemap 5xx | Inspect database connectivity/query errors. The SEO route fails on configured database errors rather than returning fabricated content. |
| Views 503 / missing daily counts | Check `CRON_SECRET` length, database configuration and `202609100010_analytics.sql`; inspect the real article's publication/seed state and hourly deduplication. |
| Guide catalog search fails or misses description terms | Confirm `202609100011_catalog_search.sql` is applied and the deployed query uses the generated title-plus-description search vector; verify a known description-only term and a prefix query. |

The source fetcher currently checks exact HTTPS hosts, public DNS destinations and redirects, pins the validated address for the HTTPS request, enforces response types and size/deadline limits, and bounds retries. These controls are implemented protections, not a claim of an external security audit. No source access is guaranteed.

The sync route can return HTTP 200 with a `PARTIAL` result; inspect `status`, `runId`, `processed`, `skipped`, `failed`, `sources`, and optional `reason`. GitHub marks an incomplete result as a failed job; Vercel monitoring needs application-level log inspection. `SKIPPED` can mean an active worker or an already-used five-minute idempotency bucket. Failed unchanged source items stop retrying after three recorded attempts. Repair the underlying cause and review the precise failed rows before any operator reset; no automatic poison-item reset UI or command is promised here.

An accessible official VI page does not imply an accessible Newswire feed. Maintain the source availability record and do not call autonomous Rockstar monitoring operational until an approved source passes the adapter and real ingestion checks. A manually verified release date belongs in admin settings with its source and verification timestamp; the seed script must not supply it.

## Recovery and release rollback

Disable the chosen scheduler and affected sources before investigating a bad ingestion release. Preserve run logs, source evidence, and article revisions. Restore a known-good application deployment only after checking database compatibility; application rollback does not undo migrations or publications. Use new forward migrations for schema corrections and the Supabase backup/restore process for data recovery, rehearsed in an isolated project.

Withdraw unsupported articles through the admin publication controls, check related weekly records and promotional flags, and verify the public page and sitemaps. Respect cache expiry/invalidation when checking public pages; the sitemap queries are dynamic. Do not delete evidence merely to remove the visible story.

Rotate exposed keys at their provider, update hosted secrets, redeploy where required, and update the single scheduler's secret. Review access and logs without copying credentials into incident notes. Keep backups and retention aligned with the actual Supabase plan; no backup policy or restore drill has been verified here.

## Capacity and known limits

The ordinary sitemap caps total URLs at 50,000, including public routes, up to 300 verified guides, 500 verified vehicles, 104 real weekly archives, and the newest qualifying articles that fit. The news sitemap caps at 1,000 articles in 48 hours. Add partitioned sitemaps and coordinate public getter limits before exceeding capacity. Verify `published_at` represents original site publication before relying on Google News date semantics. HTML extraction is conservative and may produce no usable items on unsupported layouts. Source tests do not run AI or publish. AI evidence checks are not a substitute for review. CI has no live database, publisher, OpenAI, cron, or deployment credentials and cannot verify those integrations.

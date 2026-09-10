# Architecture

## Application boundaries

Next.js 16 App Router serves the public site, admin pages, server actions, and HTTP routes. React and Tailwind CSS provide the UI. Supabase supplies PostgreSQL and Auth. The manifest pins exact versions, including Next.js 16.3.4, React 19.3.0, and TypeScript 6.0.3, and declares `type: module`. `package-lock.json` fixes the complete dependency tree used by `npm ci`; review manifest and lockfile changes together. The declared Node engine is `>=22.12.0 <25`; the CI and deployment instructions select Node 22.

| Area | Implementation and responsibility |
| --- | --- |
| Site identity | `src/lib/site.ts`: name, description, public origin, navigation, development display flag |
| Server database client | `src/lib/db.ts`: `getDb()` and `isDatabaseConfigured()`; service-role client, no browser persistence |
| Public content | `src/services/public-data.ts`: articles, verified current weekly update/archive, vehicles, guides, settings |
| Admin boundary | `src/lib/auth.ts`, `src/proxy.ts`, `src/app/admin/**`, `src/app/auth/**`: server-validated session and confirmed allowlisted email |
| Source adapters | `src/services/sources/index.ts`, `safe-fetch.ts`: RSS/Atom, JSON, channel-specific YouTube feeds, community XML feeds, opt-in HTML |
| Extraction | `src/services/ai/extract.ts`: Responses API structured output, Zod validation, source evidence checks |
| Trust | `src/services/trust.ts` and SQL constraints: server-owned source classification and publication eligibility |
| Ingestion | `src/services/ingestion/pipeline.ts`: `runNewsSync({ sourceId? })`; protected HTTP entry point at `src/app/api/cron/news-sync/route.ts` |
| Search discovery | `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/news-sitemap.xml/route.ts` |
| Article analytics | `src/app/api/views/route.ts`, `src/lib/rate-limit.ts`, `supabase/migrations/202609100010_analytics.sql`: first-party counts and durable abuse limits |

All public database reads run on the server. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must stay server-side. Tables enable RLS and revoke access from `anon` and `authenticated`; a Supabase login alone does not grant table access. Admin actions must call `requireAdmin()` independently of the UI. The anon key is used for the Auth session, not for unrestricted public table reads.

## Storage and publication

`supabase/migrations/202609100001_core.sql` defines sources, source items, articles, provenance, revisions, weekly updates, vehicles and price history, guides, settings, automation runs/logs, cache entries, and ingestion leases. `supabase/migrations/202609100002_ingestion.sql` supplies ingestion persistence logic. Apply migrations in filename order using the Supabase CLI; see deployment instructions.

`supabase/migrations/202609100003_cost_controls.sql` adds the `ai_extractions` cache and an early duplicate-attachment RPC. Cached extraction keys include schema version, model and content hash; cached results are validated again before use. The pipeline records token-usage and cache-hit events. These reduce repeat extraction work; they do not guarantee a particular monthly cost or configure a billing cap.

`supabase/migrations/202609100011_catalog_search.sql` adds a generated `guides.search_document` vector covering both title and description using PostgreSQL's `simple` text-search configuration, with a GIN index. This supplies indexed catalog-search coverage for description terms as well as titles; prefix matching is determined by the query using that vector. Apply this migration before deploying code that queries the new column.

`supabase/migrations/202609100012_explicit_deny_policies.sql` makes the backend-only access boundary explicit with deny policies for `anon` and `authenticated` on every application table. The server-only service role remains the sole application data path.

`supabase/migrations/202609100010_analytics.sql` adds `rate_limits`, `article_daily_views`, and service-role-only counting/trending RPCs. `POST /api/views` validates the origin and UUID, caps the request body, and applies a database limit of 60 requests per reader key per 60 seconds. The counting RPC accepts only published, non-seed, nonfuture articles and limits a reader/article pair to one count per hour; counts aggregate by UTC day. Reader keys are HMACs of date and IP using `CRON_SECRET`, so this secret is needed for analytics even with scheduling disabled. These are approximate reader signals, not authenticated unique-person metrics. On non-Vercel hosts, configure a trusted reverse proxy to overwrite forwarding headers before treating the IP-based limit as meaningful.

Articles have an explicit status (`DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED`) and a separate verification label (`CONFIRMED`, `REPORTED`, `RUMOR`, `UNKNOWN`). A model confidence score does not establish publisher authority. The database validates publication provenance and minimum confidence. Admin article edits use `admin_edit_article`, record revisions, check for concurrent changes, and set an editorial lock.

Guides and vehicles also store `confidence_score`, defaulting to 0 and constrained to 0–100 in the core schema and admin validation. Their admin forms expose an evidence-confidence control alongside source and verification fields. This records an editor's assessment; it does not grant official verification or apply the article auto-publication threshold to reference pages. Their public and sitemap eligibility still uses the source, verification date, verification label where present, and non-seed checks.

The analytics migration installs `cleanup_transient_records` before insertion into `automation_runs`. On a committed run insertion, it deletes rate-limit rows whose expiry was more than one day ago, expired `ai_extractions`, and `article_daily_views` with a UTC day older than 90 days. This is run-triggered cleanup, not a background database timer: retention relies on functioning scheduled runs reaching that insertion. If scheduling stops or a run fails before insertion, expired data can remain longer. Lifetime `articles.views` totals are not reset by removal of daily aggregates.

Weekly records require a source article, confirmed publication, and explicit event boundaries. `event_end` is exclusive. Missing or ambiguous date evidence must not be turned into an inferred reset date. Expired events belong in the archive; they must not be served as current bonuses.

Database defaults disable all auto-publish categories, set confidence threshold to 90, and leave the GTA VI release date unset. The migration does not insert live stories or enabled feeds.

## Development and missing configuration

Production public-data reads never enable fixtures: `demoAllowed()` returns false whenever `NODE_ENV=production`, including when `DEMO_MODE=true`. Missing production database credentials therefore return empty public data and safe settings; configured production queries exclude `is_seed` rows. Fixtures remain available in development and explicitly opted-in non-production tests. Keep `DEMO_MODE=false` on hosted production and previews; the Vercel build guard rejects a true flag, and the independent SEO gate disables indexing when it is true. The site display flag is not the backend's permission to serve fixtures. This production behavior supersedes the older broad demo wording in `docs/contracts.md`.

Configured database failures throw meaningful read errors rather than falling back to fixtures. Article lists use `src/services/cache.ts` with a default 45-second database cache; mutation triggers invalidate cache entries, and cache lookup failures fall through to authoritative reads. Article details and weekly queries read their current status directly. Never restore fixtures to hide an outage. Verify cache behavior and error presentation during acceptance.

## Sync execution and recovery boundaries

`runNewsSync` acquires a durable `news-sync` lease with a 120-second TTL, renews between work units, and releases it on exit. SQL persistence checks ownership. Scheduled run keys use five-minute buckets; an already-recorded bucket or a held lease returns `SKIPPED`. Manual source-specific runs use unique keys and still share the global lease. These controls reduce duplicate work; they do not guarantee exactly-once HTTP delivery.

The pipeline examines at most 100 enabled sources in last-checked order and respects each source's `fetch_frequency`. Adapters normalize at most 50 input items per source. Source failures are isolated and recorded. Failed unchanged items are retried up to three recorded attempts; processed/ignored unchanged items are skipped. SQL combines canonical URLs, content hashes, title/topic similarity, provenance and revisions when attaching or updating a story. Conflicts and editorial locks require review.

The default work budget is 240 seconds (`INGESTION_BUDGET_MS`), checked between work units. It is not cancellation of an in-flight fetch/AI request. The hosting function allows up to 300 seconds in the checked-in configuration. Review real workload duration before enabling many sources. A budget interruption or source/item rejection can produce `PARTIAL`; fatal errors throw and record `FAILED` where possible. `expire_editorial_content` archives expired weekly records, clears expired breaking flags, and marks old unleased runs abandoned.

The cron route accepts GET only, requires a configured secret at least 32 characters long, and compares the bearer header with a timing-safe check. Missing/short configuration returns 503; invalid authorization returns 401; thrown sync failures return 500. A returned sync result, including `PARTIAL`, is JSON with HTTP 200, so scheduler/monitoring code must inspect `status`. The GitHub workflow treats `PARTIAL` as a failed job and accepts `SUCCESS` or `SKIPPED`. Vercel's HTTP delivery status alone will not expose every source failure.

## Metadata and indexing

`pageMetadata(title, description, path): Metadata` provides title, description, a canonical URL, Open Graph, Twitter metadata, and an indexing directive. Paths must be site-relative. `jsonLd(data): string` JSON-serializes data and escapes every `<` as `\u003c` for safe insertion in a script element; it does not verify the factual accuracy of structured data.

Indexing requires production mode, a valid explicitly configured HTTPS origin, database read credentials, `DEMO_MODE` other than `true`, and no Vercel preview/development environment. The root layout now uses the shared `indexingAllowed()` gate; individual record pages also need to preserve seed/private no-index flags when overriding metadata. Robots exclusion is a crawler directive, not access control or a guaranteed removal from search.

Sitemaps query persisted records directly. Articles require `PUBLISHED`, `is_seed=false`, a known verification label, valid nonfuture publication time, and an HTTPS source. Draft, review, archived articles, seed, and unknown-verification records are excluded. Editorially published rumors retain their label; sitemap membership is not an assertion of confirmation.

The ordinary sitemap includes the static public routes and hub canonicals, including `/gta-online/weekly-update` even while it is awaiting a verified event. Static pages carry no invented last-modified timestamp. Verified guide and vehicle detail pages require a real non-seed record, HTTPS source and nonfuture verification timestamp; guides also require `CONFIRMED` or `REPORTED`. These reference tables have no draft/publication-status column, so their public verification gates determine eligibility. Routes come from the shared hub/guide-path mapping. Current public getter limits are respected: up to 300 guides and 500 vehicles.

Up to 104 real confirmed weekly archive pages are included only after their exclusive end boundary, with `PUBLISHED` or `ARCHIVED` weekly status and a real published parent article. Draft/review/seed records and unpublished parents stay excluded. The current canonical is independent of archive rows. Qualifying news article URLs fill the remaining capacity, fetched in batches of 1,000, for at most 50,000 total URLs with duplicates removed.

The news sitemap contains only up to 1,000 qualifying articles published within 48 hours, using their stored `published_at` rather than sitemap generation time. That field must reflect original site publication for Google News; ingestion currently may populate it from the source's publication timestamp, so editors must verify its semantics before treating Google News acceptance as validated. Add sitemap partitioning before the capacity limits are exceeded. Both sitemap routes return empty URL sets when indexing is disabled; robots disallows crawling and omits sitemap links in that state. Configured database query errors fail the sitemap request rather than inventing content. All three routes are dynamic so a credential-free build does not freeze an empty production sitemap.

The XML news response escapes text and carries `X-Robots-Tag: noindex` for the XML document itself. This does not mark the linked news articles no-index. No sitemap guarantees inclusion in Google News or search. See [Next.js sitemap metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) and [Google's news sitemap requirements](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap).

# QA handoff — 2026-09-10

QA edits are limited to `tests/app/**` and this document. Application source, configuration, migrations and backend/admin-owned tests were not edited. No browser automation was used.

## Verification

- `npx vitest run tests/app --reporter=dot`: 139 tests passed across six files. No skipped or expected-failure tests.
- Final combined rerun after the search changes: `npx vitest run tests/app tests/backend/database.test.ts --reporter=dot` passed all 156 tests (139 app + 17 SQL). The SQL run applied every migration, including `202609100011_catalog_search.sql`.
- `npx tsc --noEmit --incremental false`: passed with exit code 0.
- Cron: missing/short secrets, incorrect and unequal-byte-length credentials, exact valid credentials, pipeline execution, cache header and sanitized failures.
- Views: real NextRequest and rate-limit helper with mocked DB; origin checks, configuration, strict UUID payloads, 429/503 handling, hashed RPC identity, deduplication, malformed JSON, streamed size boundaries, cancellation and UTF-8 byte limits.
- Search: current `searchCatalog` route integration, mapped public fields and guide kinds, query length, result limits and error responses. Separate tests exercise real public getters and catalog search against a mocked DB, checking bound article websearch, safe tokenized guide prefix queries with `config: 'simple'`, escaped vehicle ILIKE wildcards and production filters. Expected injection-query values are explicit fixtures, not computed by copying the implementation. These mocks do not prove database search-result semantics.
- SEO: JSON-LD and XML escaping, production indexability, canonical restrictions, robots, persisted article eligibility, sitemap pagination, DB errors and timestamp fallback. Sitemap mocks support the expanded catalog/weekly queries.
- Admin: imports the real `_lib/validation` schemas and `isAdminEmail`; uses the existing repository `server-only` alias. Covers publication/evidence constraints, JSON structure, dates, URLs, source fetch controls, numeric limits and exact email allowlisting.
- Independently reran `npx vitest run tests/backend/database.test.ts --reporter=dot`: 17 tests passed after the cleanup addition. The backend-owned suite applies every sorted SQL migration using PGlite. It verifies view deduplication, aggregate counts, preserved editorial timestamps, stable cache rows, rate-limit threshold/key isolation/expiry reset, denied analytics privileges for anon/authenticated roles, and no views for draft/future/seed/missing articles. Coordination with backend task `01a08a56-3628-7723-ad65-180bf3517a9b` is complete; SQL test ownership remains there.

## Remaining findings

All findings reported in this QA pass have been addressed in the current source, subject to the verification limits below.

## Fixed during coordination

- Guide search now uses a safely tokenized, bound prefix query over the title-and-description vector introduced by `202609100011_catalog_search.sql`. The prior title-only omission is resolved by source/migration inspection; the updated query-boundary regression tests cover malicious punctuation and wildcard inputs.
- SearchBox now guards displayed results with `resultsFor === query` and clears results on failed requests, resolving stale links after query changes or failures. Confirmed by source inspection; client interaction was not browser-tested.
- Main changed malformed JSON in `/api/views` from 503 to 400 and added bounded streamed reads. The regression and stream tests pass.
- Main changed article-body guide links to use `guidePath`, fixing LOCATION/TRAILER links that previously pointed at rejected `/guides/...` routes. Confirmed by source inspection.
- Backend fixed views-only updates changing editorial `updated_at` and invalidating the public cache. The actual PostgreSQL regression passes.
- Main added a cleanup trigger in `202609100010_analytics.sql`: inserting an automation run deletes rate-limit records expired for over one day, expired AI extractions, and daily analytics older than 90 days. This resolves the missing cleanup path; retention depends on automation runs continuing. The migration applies successfully in the independently rerun SQL suite; deletion boundary behavior was not separately tested by QA.

## Limits

Unit/route checks run without production credentials or external pipeline execution. PGlite verifies SQL execution in embedded PostgreSQL, not a deployed Supabase instance. Visual layout, client interaction and live hosting behavior were not browser-tested.

## Main integration verification

After the scoped QA handoff, the main implementation pass completed `npm run lint`, `npm run typecheck`, `npm test` (226 tests across 12 files), and `npm run build` successfully. Browser checks covered 320px layout without horizontal overflow, desktop layout, mobile drawer navigation, vehicle filtering, guide search/navigation, light/dark switching, and bookmark persistence across reload. These were local checks, not a formal accessibility or Core Web Vitals audit.

A local production server returned empty search and weekly states without credentials, excluded fictional articles, emitted disallow-all robots and an empty sitemap, and refused unconfigured cron execution with HTTP 503. Authenticated admin operations, remote Supabase behavior, live source ingestion, OpenAI extraction, and deployed scheduler execution still require operator configuration and end-to-end verification.

The authenticated Supabase MCP was then used to apply migrations `202609100001` through `202609100012` to project `tbziuqnilggamspydfrs`. Hosted verification found all 17 expected tables, generated guide search column/index, RLS enabled, explicit deny policies for anonymous/authenticated roles, service-role grants intact, no seed rows, and no security-advisor lints. OpenAI extraction, administrator login, live source ingestion and scheduler execution remain unverified until their credentials and source permissions are configured.

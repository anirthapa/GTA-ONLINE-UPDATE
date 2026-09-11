# Editorial policy

Los Santos Wire is an independent fan-operated publication, not Rockstar Games or Take-Two Interactive. Every published news item needs attributable source evidence and a clear verification label. An empty news section is preferable to an invented announcement, reward, discount, vehicle price, or release date.

## Labels and approval

| Label | Meaning |
| --- | --- |
| `CONFIRMED` | Evidence attributable to an approved Rockstar-owned host; not inferred from a publisher name or model confidence |
| `REPORTED` | Attributable reporting without approved official confirmation |
| `RUMOR` | An explicitly unconfirmed claim; preserve the uncertainty throughout headline, excerpt, body, and metadata |
| `UNKNOWN` | Insufficient established provenance; not eligible for publication |

Publication status is separate from verification. Draft and review rows are not public news. All auto-publish settings default to false. Review the original evidence before enabling auto-publish for any trust tier. The default confidence threshold is 90/100; confidence is a filtering signal, not a truth probability or substitute for evidence. Rumors, conflicts, irrelevant items, ambiguous extraction, or low confidence require review. A human publication action does not waive database provenance checks.

Guide and vehicle editors can record `confidence_score` from 0 to 100; the schema and admin validation enforce that range and default it to 0. Record an honest assessment of the sourced facts. Raising this score neither supplies missing evidence nor changes a verification label; reference-page visibility still requires its source/verification conditions. The article publication threshold is not automatically a guide or vehicle publication gate.

An official hostname establishes a source ownership boundary, not a guarantee that every interpretation is correct. Titles and summaries must not overstate source wording. Do not assign official trust to a third-party mirror, community account, or guessed YouTube channel. The current official-host allowlist in `src/services/trust.ts` consists of `rockstargames.com`, `www.rockstargames.com`, and `support.rockstargames.com`; changing it requires code and SQL review.

## Source availability and permission

There is no bundled enabled official feed and no verified claim that Rockstar provides a usable public RSS/JSON endpoint for this application. The presence of an RSS adapter does not prove a publisher offers a feed. Do not invent a Newswire RSS URL or silently substitute HTML when a feed is absent. Operators must identify a permitted endpoint, confirm its current response and content, configure exact allowed hosts, and test it before enabling ingestion.

The operator-reported availability check on 2026-09-10 found the [official Newswire page](https://www.rockstargames.com/newswire) dependent on JavaScript with no parseable body exposed by the web reader, and `/newswire/rss` unavailable. These results do not establish that the conservative server-side HTML adapter can read Newswire. Autonomous Rockstar monitoring remains non-operational until an approved accessible feed, API, or explicitly permitted and parseable HTML source passes an actual adapter test. Never invent an endpoint or imply that deploying the scheduler solves source access.

In the same operator-reported check, the [official GTA VI page](https://www.rockstargames.com/VI) was accessible and displayed November 19, 2026. Forward migration `202609100016` records that date only when `release_date` is still unset, with the official page as its source and the migration time as the verification timestamp. An administrator must revisit the page after applying the migration and update or clear the three release fields if Rockstar changes its announcement. Preserve date/time semantics.

RSS/Atom and JSON feeds must permit the intended use. The JSON adapter accepts an array or `{ "items": [...] }` with normalized fields `id`, `url`, `title`, `content`, `publishedAt`, and `modifiedAt`; arbitrary publisher APIs may need a separately implemented adapter. Community sources retain community trust. The YouTube adapter accepts a channel-specific feed URL and checks channel IDs; the operator must establish the actual channel's ownership. It does not transcribe video or obtain permission to reproduce video content.

HTML ingestion requires explicit operator permission review and `allow_html=true` on an `HTML` source. Record the permission basis, allowed use, review date, and reviewer in the team's operational records. Review publisher terms, robots directives, licensing, and any restrictions before enabling it. The checkbox is an opt-in control, not a legal permission grant or an automatic terms/robots compliance engine. The adapter only examines explicit article elements, or the one canonical page for the `WEEKLY_UPDATE` adapter; it does not promise compatibility with every Newswire layout.

Do not bypass login walls, paywalls, robots restrictions, bot challenges, rate limits, or publisher blocks. Do not add rotating proxies, forged credentials, hidden/private endpoints, or automated challenge solving. A blocked source stays unavailable pending legitimate access or a different permitted source. Report failures honestly and preserve existing dated content without calling it newly checked.

## Evidence and content handling

The extraction service requests structured plain text with short source quotes. Zod and evidence checks reject malformed output and quotes absent from source text. Source text is untrusted input, including any embedded instructions. These checks reduce errors but cannot guarantee factual correctness or detect every contradiction; editorial review remains necessary.

Write concise original summaries, link to the source, and use only the limited quotation needed to support a claim. Do not republish full articles. Only use images with a documented permission/license basis, accurate alt text, and source attribution where needed. Do not invent a cover image or present generated artwork as documentary evidence.

Weekly bonuses and event boundaries need explicit source support. Do not infer a current event from a recurring Thursday pattern, carry old discounts forward, or populate unknown values with plausible numbers. The backend treats `event_end` as an exclusive boundary. If source timezone or end-day wording is ambiguous, keep it in review. GTA VI release dates require an official source URL and verification timestamp; no date is the correct state when evidence is unavailable.

## Corrections and demo records

Correct material errors through authenticated editing, preserve revisions and provenance, and explain substantial corrections in the article. Recheck dependent weekly data and any featured/breaking promotion. Withdraw unsupported news from publication and verify it disappears from sitemaps. Breaking status must expire; never refresh publication dates to make old news appear new.

Demo content is only for isolated development. Retain `is_seed=true`, explicit fictional labels, and historical/test dates. Do not convert a fixture into a live story by clearing its flag; create a new sourced record. No seed or fixture belongs in a sitemap or active production news. Search metadata and structured data must preserve the article's uncertainty and must not contain facts absent from the visible content.

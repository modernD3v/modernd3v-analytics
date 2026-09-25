# Task 01: Private analytics service, first build

Repo: `modernd3v-analytics` (new, empty)
Written: 2026-09-25, from the modernD3vforall planning session
Model: Opus 5.5, medium effort. The code is small, but the decisions around origin checking, what counts as identifying data, and failing silently are easy to get subtly wrong, and a mistake here can reach every page of a live site.

## Start here

This repo has no `planning/CONTEXT.md` yet. Creating it is part of this task (see closing step 1). Read this whole file, then show a brief numbered plan and wait for approval before writing code.

## Scope boundary

This service answers one question: which channel sends people to a site. It is not a product.

Do not build, stub, or scaffold any of the following, even "for later": a dashboard, user accounts, auth for other people's sites, billing, cookies, localStorage or sessionStorage, fingerprinting, anything that identifies a person, IP address storage. If the plan seems to need one of these, stop and report instead.

Do not touch the modernD3vforall repo. Including the snippet there, updating its privacy page, and running its admit-path checklist are a separate task that comes after this one.

## Why it exists

The founding offer went out on 2026-09-11 through LinkedIn posts, DMs and email. It produced signups and no way to tell which channel produced them. Search Console and Medium stats cannot show whether anyone clicked through, and the site records nothing about where visitors come from. The December 15 revenue plan (post on Instagram, Medium and LinkedIn, funnel to modernd3vforall.com) cannot be evaluated without this.

## Decisions already made

1. **Owned, not a third-party analytics product.** Keeps the modernD3vforall privacy page honest.
2. **Separate repo, deployment and database.** Chosen knowingly over building into modernD3vforall, because it will serve future sites.
3. **Multi-tenant but private.** Every row carries a site identifier from day one. Only Gonzalo uses it.
4. **Terminal script is the interface.** Same pattern as `npm run users` and `npm run purchases` in modernD3vforall.
5. **Schema shaped for a later dashboard.** The dashboard is not built now.
6. **Stack: Node, Express, Postgres.** Matches modernD3vforall so the read script pattern and deployment habits carry over. If the plan argues for something else, argue it in the plan, do not switch silently.
7. **The server decides the site, not the client.** The site identifier comes from matching the request's `Origin` header against the allowed-sites config. The snippet never sends a site id. Reason: a client-supplied id would let any page write into any site's rows.
8. **The server sets the timestamp.** Client clocks are wrong often enough to matter.
9. **Path without query string or hash.** Query strings can carry emails, tokens and reset codes. UTM values are extracted by the snippet before the query is dropped.
10. **Referrer stored as host only** (for example `www.linkedin.com`), never the full URL. Browsers mostly send only the origin cross-site anyway, and full referrer URLs can identify people.
11. **Tag values are stored as sent** (trimmed, length capped), not rejected or rewritten. The allowed tag values live in config and the read script flags anything not on the list. Reason: refusing an event over a typo loses the visit; flagging it keeps the visit and exposes the typo.
12. **Page loads only, no history hooks.** One event per full page load. Client-side route changes are not tracked. Attribution needs the landing, not the clickstream.

## Hard constraints

1. **Recording must never break the calling site.** The snippet fails silently: every line inside `try/catch`, nothing thrown, nothing awaited, no render blocking, no retries, no dependencies. Use `navigator.sendBeacon` with a `text/plain` body (no CORS preflight), falling back to `fetch` with `keepalive: true` and a swallowed rejection. modernD3vforall had three production outages in four days from changes near the auth path. This must not be the fourth.
2. **No secrets in this environment.** Never ask for, print, or write a production `DATABASE_URL` or any key. Local development uses a local Postgres with throwaway credentials in an ignored `.env`. Provide `.env.example` with names only. Gonzalo enters real values in the hosting dashboard by hand.
3. **Proof, not assertion.** See the proof section. Every check is broken on purpose and watched to fail.
4. **No em dashes anywhere** (code comments, README, output strings). American spelling.

## Build

1. **Ingest endpoint.** `POST /e`. Accepts one JSON-in-text/plain body per page view: `path`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`. Looks up the `Origin` header in config. Unlisted or missing origin: respond `403`, write nothing. Listed: normalize (strip query and hash from path, reduce referrer to host, trim and cap tag lengths), insert, respond `204`. Reject bodies over a small size cap. Do not log request IPs or bodies in application code.
2. **One events table.** Columns: `id`, `site_id`, `path`, `referrer_host` (nullable), `utm_source`, `utm_medium`, `utm_campaign` (all nullable), `created_at` (server default). Index on `(site_id, created_at)`. Plain SQL migration file, run by Gonzalo against production by hand. The session gives him the exact command in the report.
3. **Config.** One file mapping allowed origins to site ids (for example `https://modernd3vforall.com` and `https://www.modernd3vforall.com` both to `modernd3vforall`), plus the allowed tag values below. Adding a site is a config edit and a redeploy, not a code change. Test origins (localhost, the Playwright page, the seeded second site) load only when `NODE_ENV` is explicitly `development` or `test`. Unset or any other value means production, and production config contains no test origins.
4. **Client snippet.** One small file, `snippet/track.js`, written to be pasted inline into a page (so a down service has nothing to fail to load). The endpoint URL is the only value a site edits. Keep it short and readable, not minified.
5. **Seed script.** Seeds the local database for the read script proof. It refuses any `DATABASE_URL` whose host is not `localhost` or `127.0.0.1`, and it checks before connecting.
6. **Read script.** `npm run visits -- --site <id> --from <date> --to <date>` (defaults: all sites, last 7 days). Reports per site:
   - landing visits grouped by `utm_source`, then `utm_medium` and `utm_campaign`
   - untagged landing visits grouped by referrer host, with no referrer shown as `(none)`
   - a separate count of internal page views (referrer host equals the site's own host), excluded from the source grouping so navigation inside the site does not look like a channel
   - a warning line for any tag value not on the allowed list, with its count
   It reads `DATABASE_URL` from the environment. The session runs it only against the local database.

## Tagging convention (goes in config and the README)

All lowercase, standard UTM names.

- `utm_source`, where the link lives: `instagram`, `medium`, `linkedin`, `email`
- `utm_medium`, the format: `post`, `story`, `bio`, `article`, `dm`
- `utm_campaign`, what it points at: `founding`, `module-one`, `free-chapter`

`utm_medium` is the format field and has nothing to do with Medium the platform. Medium the platform is always `utm_source=medium`.

Never invent a value mid-campaign. The script groups on exact strings, so `insta` and `instagram` become two channels. Add values to the list on purpose.

Tags matter more than referrers here, because Instagram's in-app browser often sends no referrer.

## Proof required before reporting done

Each item: show the command and its real output in the report.

1. **Refusal.** `curl` with an unlisted `Origin` gets `403` and the row count is unchanged. Then the same with a listed origin gets `204` and the count goes up by one. Both halves are required: an origin check that never fires passes the first half alone, and one that always fires passes the second alone.
2. **Normalization.** Send a path with `?email=a@b.com#x` and a full referrer URL. Show the stored row has neither.
3. **Silent failure.** A local test page on an allowed origin includes the snippet. Run it three ways: endpoint stopped, endpoint returning `500`, endpoint hanging. Each time the page renders fully and the console shows no uncaught error. Automate this with Playwright (listening for `pageerror`), then remove the `try/catch` from the snippet on purpose, watch the test fail, and restore it.
4. **Read script.** Seed the local database with events across two sites, several sources, some untagged, some internal, and one off-list value like `insta`. Show the report output and that `insta` is flagged.
5. **Test origins stay out of production.** With `NODE_ENV` unset, `curl` with a localhost `Origin` gets `403` and the row count is unchanged.
6. **Seed script guard.** A fake non-local `DATABASE_URL` is refused before any connection is attempted. A localhost URL is admitted. Both halves are required.

## Traps

- A check that never fires still passes every test. That is why every proof above has a half that must fail.
- `sendBeacon` hides the response, so the snippet cannot tell refusal from success. That is correct behavior. Prove refusal from the server side, not the client.
- The `Origin` header can be forged by anything that is not a browser. The allowed list keeps random sites from writing rows; it is not authentication. Say so in the README rather than pretending otherwise.
- The calling site may have a Content Security Policy that blocks inline scripts or `connect-src` to a new host. Do not solve that here. Note it in the README for the follow-up task.
- Hosting request logs may record IPs even though the app does not. Report what the chosen host does; do not claim "no IPs anywhere" unless verified.

## Closing steps, in this order

**1. Create `planning/CONTEXT.md`.** This is its first version. It holds: the one question the service answers and the scope boundary above; decisions 1 through 12 with their reasons; the tagging convention; the traps; what Gonzalo must do by hand (hosting setup, env values, running the migration); and the open follow-up task in modernD3vforall. No counts, no changelog. Keep it short enough that future sessions will actually update it.

**2. Commit on a branch, push, open a pull request against `main`, and stop.** Gonzalo merges. Do not merge. Do not create `content` or `styling` branches here, those belong to modernD3vforall. Never leave work uncommitted.

**3. Report, contradictions first.** Prose under 100 words, not counting command output. First: anything found that disagrees with this file. Then: the proof outputs, the exact migration command for Gonzalo, the env var names he must set in the hosting dashboard, and anything the chosen host logs.

## After this task (Gonzalo, not the session)

1. Create the database and service in the hosting dashboard, enter env values by hand, run the migration.
2. Hand the modernD3vforall follow-up task to that repo's session: include the snippet, update the privacy page (path, referrer host, campaign tags, timestamp, nothing identifying), run the admit-path checklist on staging before `main`.
3. Definition of done: post one tagged link each on Instagram, Medium and LinkedIn, click each one, and `npm run visits -- --site modernd3vforall` shows three visits split by source.

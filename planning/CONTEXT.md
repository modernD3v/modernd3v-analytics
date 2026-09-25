# Context

This service answers one question: which channel sends people to a site. It is not a product. Do not build a dashboard, user accounts, auth for other sites, billing, cookies, localStorage or sessionStorage, fingerprinting, IP storage, or anything that identifies a person. Do not touch the modernD3vforall repo from here.

## Decisions

1. Owned service, so the modernD3vforall privacy page can stay honest.
2. Separate repo, deployment, and database, because later sites will use it.
3. Multi-tenant but private. Every row has a site id. Only Gonzalo uses it.
4. The interface is `npm run visits`, not a web page.
5. The events table is shaped so a later dashboard can read it. The dashboard is not built.
6. Stack is Node, Express, and Postgres.
7. The server picks the site by matching `Origin` to config. The snippet never sends a site id, because a client-supplied id could write into any site.
8. The server sets `created_at`. Client clocks are often wrong.
9. Store the path without query or hash. Query strings can carry emails, tokens, and reset codes. The snippet reads UTM values before that.
10. Store the referrer as a host only. Full referrer URLs can identify people.
11. Store tag values as sent, after trim and a 100 character cap. Do not reject a visit over a typo. The read script flags values that are not on the allowed list.
12. One event per full page load. Do not track client-side route changes.

Test origins (localhost, the Playwright page, the seeded second site) load only when `NODE_ENV` is exactly `development` or `test`. Unset or anything else means production, and production config has no test origins. `npm run seed` refuses a `DATABASE_URL` whose host is not `localhost` or `127.0.0.1`, and it checks before connecting.

The host is Vercel and the database is Neon. Ingest uses the pooled connection string in `DATABASE_URL`, with a pool max of 1. Migrations and `scripts/check-reader-role.sql` use the direct string. `visits_reader` is created in SQL, not the Neon console, because a console role inherits `neon_superuser` and can write. `npm run visits:prod` is the only script that loads `.env.prod-read`, and that file holds the read-only connection.

## Tagging

All lowercase. `utm_source`: `instagram`, `medium`, `linkedin`, `email`. `utm_medium` (the format, not Medium the platform): `post`, `story`, `bio`, `article`, `dm`. `utm_campaign`: `founding`, `module-one`, `free-chapter`. Medium the platform is `utm_source=medium`. Add values on purpose. The script groups on exact strings.

## Traps

A check that never fires still passes a one-sided test. `sendBeacon` hides the response, so prove refusal on the server. `Origin` can be forged by non-browsers. The allowed list is not authentication. A site Content Security Policy may block the inline snippet or `connect-src`. Do not solve that here. Vercel request logs record client IPs. The app stores none. Locally, `neon_superuser` has no powers. The role check detects membership, not production safety. Gonzalo runs that check against production.

## Gonzalo, by hand

Create the Neon database and the Vercel project. Set `DATABASE_URL` on Vercel to the pooled string. Vercel sets `NODE_ENV`. Do not set `PORT`. Run migrations 001 and 002 on the direct string, set the `visits_reader` password with `\password`, and run `scripts/check-reader-role.sql` on that same direct string. Put the read-only connection in `.env.prod-read`.

## Follow-up

In modernD3vforall: paste the snippet, update the privacy page (path, referrer host, campaign tags, timestamp, nothing identifying), and run the admit-path checklist on staging before `main`. Done means one tagged visit each from Instagram, Medium, and LinkedIn shows up split by source.

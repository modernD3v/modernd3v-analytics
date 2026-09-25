# modernd3v-analytics

Private analytics for one question: which channel sends people to a site. The read interface is a terminal script, not a web page.

## Local setup

Local Postgres only. Copy `.env.example` to `.env` and set `DATABASE_URL` to a localhost URL. Then:

```
psql "$DATABASE_URL" -f migrations/001_events.sql
npm start
npm run visits -- --site modernd3vforall --from 2026-09-18 --to 2026-09-25
```

`npm run seed` loads local proof rows. It refuses any `DATABASE_URL` whose host is not `localhost` or `127.0.0.1`, and it checks before connecting.

`NODE_ENV` must be exactly `development` or `test` to load test origins (localhost and the seeded second site). Unset or any other value means production. Production config has no test origins.

## Ingest

`POST /e` accepts a `text/plain` JSON body: `path`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`. The site id comes from the `Origin` header, matched against `src/config.js`. A missing or unlisted origin gets `403` and writes nothing. The server strips the path query and hash, stores the referrer as a host only, trims and caps tag values, and sets `created_at`.

The origin list is not authentication. Anything that is not a browser can forge `Origin`. The list only keeps random sites from writing rows.

Paste `snippet/track.js` inline. Replace `https://analytics.example.invalid/e` with the real endpoint. That URL is the only value a site edits. The snippet uses `sendBeacon` and falls back to `fetch` with `keepalive`. It catches its own failures and does not retry.

A calling site may have a Content Security Policy that blocks inline scripts or `connect-src` to this host. Fix that in the site repo when the snippet is added there.

## Tagging

All lowercase, standard UTM names. The read script groups on exact strings.

- `utm_source`, where the link lives: `instagram`, `medium`, `linkedin`, `email`
- `utm_medium`, the format: `post`, `story`, `bio`, `article`, `dm`
- `utm_campaign`, what it points at: `founding`, `module-one`, `free-chapter`

`utm_medium` is the format field. Medium the platform is always `utm_source=medium`.

Add values in `src/config.js` on purpose. The script flags anything not on the list and still counts the visit. Tags matter more than referrers, because Instagram's in-app browser often sends no referrer.

## Read script

`npm run visits -- --site <id> --from <date> --to <date>`

Defaults: all sites, the last 7 calendar days through today, UTC, both dates inclusive. Per site it prints tagged landings by source, then medium and campaign; untagged landings by referrer host (`(none)` when empty); internal page views (referrer host is one of that site's configured hosts), kept out of the source grouping; and a warning for each off-list tag value.

## Hosting

The host is Vercel and the database is Neon. Vercel request logs record client IPs. The app stores none.

Set `DATABASE_URL` on Vercel to the pooled Neon connection string. Vercel sets `NODE_ENV`. Do not set `PORT`. The ingest pool uses at most one connection.

Run migrations against the Neon direct connection string, then `\password visits_reader`. Put that role's connection string in `.env.prod-read`. Only `npm run visits:prod` reads that file. `npm run visits` keeps using the local database.

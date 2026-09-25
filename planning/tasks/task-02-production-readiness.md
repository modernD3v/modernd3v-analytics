# Task 02: Production readiness

Repo: `modernd3v-analytics`
Written: 2026-09-25
Hold: do not start until the task-01 pull request is merged. One writer at a time.
Model: Sonnet, medium effort. The decisions are made below. The work is a SQL file, a check query, a small deploy change, and proofs.

## Start here

Read `planning/CONTEXT.md`, then show a brief numbered plan and wait for approval before writing code.

## Scope boundary

Same as task-01. This task adds no features. No dashboard, user accounts, auth for other people's sites, billing, cookies, localStorage or sessionStorage, fingerprinting, IP address storage, or anything that identifies a person. If the plan seems to need a new feature, stop and report.

## Decisions already made

1. **Host is Vercel, database is Neon**, same as modernD3vforall. Reason: deployment habits carry over.
2. **The ingest endpoint uses Neon's pooled connection string with a pool max of 1.** Reason: every serverless request is its own invocation, and direct connections run out. Migrations use the direct string.
3. **Vercel request logs record client IPs. The app stores none.** The README and `CONTEXT.md` say exactly that, never "no IPs anywhere."
4. **Reading production from Gonzalo's laptop uses a read-only role, `visits_reader`.** Reason: nothing on a developer machine writes to production.
5. **The role is created in SQL, not in the Neon console.** Reason: a console-created role inherits `neon_superuser` and can write regardless of grants.
6. **The production read connection lives in a separate ignored file, `.env.prod-read`,** loaded only by `npm run visits:prod`. `.env` stays pointed at local. `.env.example` lists names only.

## Hard constraints

1. **No secrets in this environment.** Never ask for, print, or write a production connection string, password, or key. Gonzalo enters real values by hand.
2. **Proof, not assertion.** Every check is broken on purpose and watched to fail.
3. **No em dashes anywhere**, including code comments and output strings. American spelling.

## Build

1. **Make the Express app deployable on Vercel.** Follow Vercel's current Express documentation. Verify against the docs, do not guess. Say in the report which page you followed.
2. **`migrations/002_visits_reader.sql`.** Create `visits_reader` with `LOGIN` and no password. Grant `CONNECT` on the database, `USAGE` on schema `public`, `SELECT` on `events`. Nothing else. Gonzalo sets the password by hand with `psql \password`.
3. **`scripts/check-reader-role.sql`.** Lists every role `visits_reader` belongs to, directly or through other roles, using `pg_auth_members`. Reports whether it can `INSERT`, `UPDATE`, `DELETE` or `TRUNCATE` `events`, and whether it can `CREATE` in schema `public`. Prints the server version. Expected result: no memberships, and every privilege false.
4. **`npm run visits:prod`.** Runs the task-01 read script with `.env.prod-read` loaded. Add `.env.prod-read` to `.gitignore`. No other script loads that file.

## Proof (local Postgres only)

Show each command and its real output.

1. **Grants.** As `visits_reader`, `SELECT` on `events` succeeds and `INSERT` fails with permission denied. Both halves.
2. **Role check.** Run the check on the clean role and show no memberships. Then create a local role named `neon_superuser`, grant it to `visits_reader`, rerun, and watch the check flag it. Revoke and rerun clean. Then break each new line on purpose: grant `UPDATE` on `events` to `visits_reader`, watch the check flag it, revoke. Do the same for `DELETE` and for `TRUNCATE`. Grant `CREATE` on schema `public`, watch it flag, revoke. Rerun clean at the end.
3. **No regressions.** Rerun task-01 proofs 1 (refusal), 2 (normalization) and 5 (test origins stay out of production) after the Vercel change.
4. **Fetch fallback.** With `try/catch` removed, task-01's stopped, 500, and hanging cases still passed, because `sendBeacon` never throws on network errors, so the fetch fallback never ran. Add a Playwright case with `navigator.sendBeacon` removed and the endpoint stopped. Remove the swallowed fetch rejection on purpose (the second function passed to `.then`; the snippet has no `.catch`), watch the test fail, and restore it.
5. **Test origins admit.** Task-01 proof 5 showed a localhost `Origin` refused with `NODE_ENV` unset. Show the other half: with `NODE_ENV=development`, the same `curl` returns `204` and the count goes up by one.

## Traps

- Locally, `neon_superuser` has no powers. Proof 2 shows the check detects membership, not that the role is safe in production. Gonzalo runs the check against production himself.
- Vercel's runtime can parse request bodies before Express sees them. Local proofs cannot show whether `text/plain` bodies arrive intact on Vercel. Say so in the report. Gonzalo's post-deploy `curl` is the real proof.
- An env var set only locally is a gap no test shows. List every env var production needs.
- If the fetch fallback test still passes with the rejection handler removed, `pageerror` is not catching unhandled rejections. Fix the test so it fails before restoring the handler.

## Closing steps, in this order

**1. Update `planning/CONTEXT.md`** with: the host and database decisions; the IP logging fact (Vercel logs IPs, the app stores none); the `visits_reader` role and why it is created in SQL; the `neon_superuser` trap; pooled versus direct connection strings and which one each part uses. Replace stale lines rather than appending. Remove "No host is chosen..." from Traps. Rewrite "Gonzalo, by hand" for Vercel and Neon: no `PORT`, `NODE_ENV` is set by Vercel, migrations run on the direct connection string.

**2. Commit on a branch, push, open a pull request against `main`, and stop.** Gonzalo merges. Never merge. No `content` or `styling` branches. Never leave work uncommitted.

**3. Report, contradictions first.** Prose under 100 words, not counting command output. Then: the proof outputs; the exact commands for Gonzalo (migration 002 on the direct string, `\password`, the check query); the env var names for Vercel.

## After this task (Gonzalo, by hand)

1. Run migration 002 against the direct connection string.
2. Set the `visits_reader` password with `\password`.
3. Run the check query against production and confirm zero memberships.
4. Create the Vercel project and enter env values.
5. `curl` the deployed `/e` with a listed `Origin`, then confirm the row with `npm run visits:prod`.

# AGENTS.md

Instructions for any coding agent working in this repo (Cursor, Claude, or other).

## What this repo is

A private analytics service. It answers one question: which channel sends people to a site. Only Gonzalo uses it. It is not a product.

## Before any task

1. Read `planning/CONTEXT.md` if it exists. It is the source of truth for decisions and traps.
2. Read the task file you were given in `planning/tasks/`.
3. Show a brief numbered plan and wait for approval before writing code.

## Scope boundary

Never build, stub, or scaffold: a dashboard, user accounts, auth for other people's sites, billing, cookies, localStorage or sessionStorage, fingerprinting, IP address storage, or anything that identifies a person. If a task seems to need one of these, stop and report.

Never touch the modernD3vforall repo from here.

## Hard rules

- **The client snippet must never break the calling site.** Everything in `try/catch`, nothing thrown, nothing awaited, no render blocking, no retries, no dependencies.
- **No secrets.** Never ask for, print, or write a production `DATABASE_URL` or any key. Local development uses a local Postgres with throwaway credentials in an ignored `.env`. `.env.example` holds names only. Gonzalo enters real values in the hosting dashboard by hand.
- **Proof, not assertion.** Every check, test, or gate is broken on purpose and watched to fail before it counts.
- **No counts in docs.** Do not copy numbers of tests, events, or rows into documentation. Measure them from a live run.
- **No em dashes** anywhere, including code comments and output strings. American spelling.

## Stack

Node, Express, Postgres. Plain SQL migrations, run against production by Gonzalo by hand. The read interface is a terminal script (`npm run visits`), not a web page.

## Finishing any task

1. **Update `planning/CONTEXT.md`** with anything that reverses a decision, proves a doc false, changes what a future session must not do, adds an external account or dependency, is a first measurement, or gives a blocker a date. Leave out routine implementation, counts, and anything `git log` already says.
2. **Commit on a branch, push, open a pull request against `main`, and stop.** Gonzalo merges. Never merge. Never leave work uncommitted.
3. **Report contradictions first**, then what was added. Prose under 100 words, not counting command output.

## Do not

- Edit this file. Propose changes in your report instead.
- Create status, history, or changelog summary files. `git log` is the history.

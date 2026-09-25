# CURSOR.md

Cursor-specific notes for this repo. The full agent instructions are in `AGENTS.md`. Read that first; this file only adds what is particular to Cursor.

## Setup

- Use Agent mode.
- Model: use the one the task file names. If Cursor does not offer it, use the strongest available model and say so in the plan.
- `.cursor/rules/analytics-constraints.mdc` loads into every chat automatically and repeats the hard rules. Do not edit it; propose changes in your report.

## Starting a task

Paste into a new Agent chat:

```
Read @AGENTS.md and @planning/tasks/<task-file>.md in full. Then show me a brief numbered plan and wait for my approval before writing any code.
```

## While working

- Do not run terminal commands that touch a production database. Local Postgres only.
- When a proof step needs a browser (the silent-failure test), use Playwright in the terminal, not Cursor's browser preview, so the result is repeatable.
- Show real command output for every proof step. A summary of what the output "would" show does not count.

# Ten&See AI Workflow

These files make every teammate's AI already know the project — nobody explains
anything in chat. They ship with `git clone`; there is nothing to install.

```
AGENTS.md                              ← project map + hard rules (all AI tools)
ROADMAP.md                             ← 42 days, one task each, checkboxes
AI-WORKFLOW.md                         ← this guide
.cursor/rules/project-context.mdc      ← repo map + pitfalls (Cursor, always on)
.cursor/rules/token-discipline.mdc     ← token limits (Cursor, always on)
.cursor/rules/roadmap-workflow.mdc     ← day-execution loop (Cursor, always on)
.cursor/skills/day-runner/SKILL.md     ← the "run day N" command (Cursor)
```

## Team usage (every day)

1. Pull latest, open the repo in Cursor.
2. New chat → type **`run day N`** (or just `run day` — it picks the first
   unchecked one in ROADMAP.md).
3. Review the diff. Never auto-accept changes to auth or secrets.
4. Check the agent's `Verified:` line, let it commit, close the chat.

One day = one chat. Short chats + the rules files are what keep token spend low.

## Who reads what

| File | Read by |
|---|---|
| `AGENTS.md` | Cursor, VS Code Copilot, Devin, most agents |
| `.cursor/rules/*.mdc` | Cursor only (auto-applied, richer detail) |
| `.cursor/skills/day-runner/` | Cursor only (the `run day N` command) |
| `ROADMAP.md` | The day-runner skill + humans |

Teammates on VS Code/Devin still get the project map and hard rules via
`AGENTS.md`; they just type the day's ROADMAP.md entry as their prompt instead
of `run day N`.

## What does NOT ship in git (each person sets up their own)

- `backend/.env` — secrets are never committed. Share via a password manager.
- Phase 0 accounts (Days 1–3): GitHub Student Pack, Cursor Pro, Meta sandbox
  are per-person signups.

## Avoiding collisions

Two people must not run the same day. Claim a day in your team chat first,
or assign phases per person (e.g. one owns Phase 3, another owns Phase 4 —
they touch different files and can run in parallel after Day 15).

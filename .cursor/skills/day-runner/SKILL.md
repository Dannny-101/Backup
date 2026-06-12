---
name: day-runner
description: Execute one Ten&See roadmap day. Use when the user says "run day N", "day N", or asks to continue the roadmap.
---

# Day Runner

Execute exactly one day from `ROADMAP.md`.

## Steps

1. If the user gave no day number, grep `ROADMAP.md` for `[ ]` and take the first
   unchecked day; confirm it in one line before starting
2. Read that single day's entry (task + instruction). Do not read other phases
3. Check the day's dependency note (some days require earlier days). If unmet, stop and say which day to do first
4. Execute per the roadmap-workflow and token-discipline rules: 1–3 files, smallest diff
5. Run the verification named in the entry. Report the actual result
6. Mark the day done in `ROADMAP.md`: change its `[ ]` to `[x]`
7. Commit: `day-N: <task name>`. Stop — do not begin the next day

## Output format

End with exactly:

- **Done:** one sentence
- **Verified:** the command/check and its result
- **Next:** the next day number and its task name (do not start it)

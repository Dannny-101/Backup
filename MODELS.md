# Model Routing — which AI runs which day

Principle: match the model to the **cost of being wrong**, not the size of the task.

## Tiers

| Tier | Models | Use for |
|---|---|---|
| **S — Architect** | Claude Opus-class / GPT-5.5 thinking | Security-sensitive design, subtle bugs, multi-system loops |
| **A — Builder** | Claude Sonnet-class / GPT-5.3-Codex | Default workhorse: implementation, integrations, tests |
| **B — Sprinter** | Composer Fast / Copilot (free, Student) | Mechanical edits, boilerplate, config, meta tags |
| **H — Human** | No AI | Signups, live drills, business judgment, creative tools |

Runtime models (inside the product, cost-per-call matters):
chat replies = Groq Llama (free tier) · lead extraction = Gemini Flash JSON mode ·
fallback = the Day-17 regex. Never use frontier models in the visitor chat path.

## Day → tier

| Days | Tier |
|---|---|
| 1, 2, 3, 33, 39, 42 | H |
| 6, 8, 14, 16, 22 | S |
| 4, 5, 7, 12, 13, 15, 17, 18, 19, 21, 23, 26, 27, 28, 30, 32, 34, 35, 36, 38, 41 | A |
| 9, 10, 11, 20, 24, 25, 29, 31, 37, 40 | B |

## Rules for agents and humans

- The day-runner skill states the day's tier before starting. If your current
  model is below the tier, switch models before proceeding.
- S-tier days are NEVER run unattended; a human reviews every line of the diff.
- B-tier days may be automated (scheduled agent → PR) once CI tests exist (Day 28).
- Day 27 (PDPA) and anything legal: AI drafts, a human approves the wording.

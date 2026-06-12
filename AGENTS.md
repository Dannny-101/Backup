# Ten&See — Agent Instructions (all AI tools)

This file is read by Cursor, GitHub Copilot, Devin, and most coding agents.
Cursor users also get the detailed rules in `.cursor/rules/` automatically.

## What this project is

Student-housing platform (Malaysia). Express monolith: REST API + static frontend
served from one server. MongoDB via Mongoose. Socket.io live chat with an agent
queue (`backend/services/chatQueue.js`). WhatsApp Cloud API + SMTP email.

## File map — do not re-explore the repo

- `backend/server.js` — entry: Socket.io handlers, chat queue init, lead-alert cron
- `backend/routes/` — 14 routers; auth lives in `routes/admin.js` (`authMiddleware`)
- `backend/models/` — Lead, Booking, Listing, Property, ChatMessage, ChatSession,
  Admin, Task, Notification, auditlog
- `backend/services/` — chatQueue, chatPager, whatsapp, email (email.js here is the
  ONLY canonical email module)
- `frontend/` — vanilla HTML/JS. `admin/index.html` is ~6k lines: ALWAYS grep for the
  target function/id first, then read only the surrounding lines. Never read it whole.

## The workflow

The build plan is `ROADMAP.md` — 42 tasks, one per day, with checkboxes.
To execute: read ONE day's entry, touch only the files it names (usually 1–3),
make the smallest diff, run the verification it specifies, tick its `[ ]` to `[x]`,
commit as `day-N: <task name>`, then STOP. One day per session/chat.

## Hard rules

- Public endpoints are ONLY: GET listings/properties, POST leads, POST bookings,
  POST chat, the WhatsApp webhook. Everything else requires `authMiddleware`.
  Never remove or weaken auth to make something pass.
- `JWT_SECRET` and all credentials come from `.env` (never committed). Never add
  fallback secret strings. Reference env keys by name only.
- WhatsApp Cloud API base is `https://graph.facebook.com/<version>` — never instagram.
- `Lead.email` is conditionally required — WhatsApp-source leads have no email.
- API responses follow `{ success, data | error }`. Get `io` / `emitToAdmins`
  via `req.app.get(...)`. Admin actions get an audit entry via `createAuditLog`.
- Never read or modify `node_modules/`, `package-lock.json`, `frontend/assets/`.
- No new dependencies unless the day's task says to install one.

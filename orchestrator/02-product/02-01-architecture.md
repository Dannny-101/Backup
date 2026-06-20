# System Architecture

## High-Level Design

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Frontend      │─────▶│   Express API    │─────▶│   MongoDB    │
│  (vanilla JS)   │      │  (Monolith)      │      │  (Mongoose)  │
└─────────────────┘      └──────────────────┘      └──────────────┘
        │                         │
        │                         ▼
        │                ┌──────────────────┐
        │                │   Socket.io      │
        │                │  (Live Chat)     │
        │                └──────────────────┘
        │                         │
        ▼                         ▼
┌─────────────────┐      ┌──────────────────┐
│  WhatsApp Cloud │      │   SMTP Email     │
│     API         │      │   (Nodemailer)   │
└─────────────────┘      └──────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Real-time | Socket.io |
| Frontend | Vanilla HTML/CSS/JS |
| Maps | Mapbox GL JS |
| Messaging | WhatsApp Cloud API (Meta) |
| Email | SMTP (Nodemailer) |
| Auth | JWT (custom middleware) |
| Hosting | TBD |

## Key Services

- **chatQueue.js** — Agent queue system for live chat
- **chatPager.js** — Pager/alert system for chat agents
- **whatsapp.js** — WhatsApp Cloud API integration
- **email.js** — Canonical email module (single source of truth)

## Security Layer

- `authMiddleware` in `routes/admin.js` protects all non-public endpoints
- Public endpoints: GET listings/properties, POST leads, POST bookings, POST chat, WhatsApp webhook
- CORS allowlist, Helmet, rate limiting (Express + Socket.io)
- WhatsApp webhook HMAC-SHA256 signature verification
- JWT_SECRET from `.env` only — no fallbacks

## Socket.io Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-room` | Client → Server | Join a chat session room |
| `send-message` | Client → Server | Send a chat message |
| `new-message` | Server → Client | Broadcast new message |
| `typing` | Bidirectional | Typing indicators |
| `agent-join` | Server → Client | Agent assigned to session |

## Environment Variables (from `.env`)

| Key | Purpose |
|-----|---------|
| `JWT_SECRET` | JWT signing |
| `MONGODB_URI` | Database connection |
| `WHATSAPP_PHONE_ID` | WhatsApp Cloud API |
| `WHATSAPP_TOKEN` | WhatsApp API access |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| `META_APP_SECRET` | Webhook signature HMAC |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email delivery |
| `MAPBOX_TOKEN` | Maps (should be served via API, not hardcoded) |

---

#tags #architecture #system-design #tech-stack #express #mongodb #socketio

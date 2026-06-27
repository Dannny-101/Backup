# Ten&See Deployment & Operations Guide

This document describes the current production deployment architecture, repository layout, and how to navigate the system.

## Recent Changes

- **AI agent features removed** from the codebase and all GitHub repositories.
- **Repository cleanup**: `Ten-See/main` and `Backup/main` + `Backup/beta` now share the same clean codebase.
- **Production deployment** moved to Azure VM.
- **Domain + HTTPS** configured via Cloudflare and Caddy.

## Live Environment

| Service | URL |
|--------|-----|
| Public website | https://beta.tenandsee.homes |
| Admin dashboard | https://beta.tenandsee.homes/admin |
| Default admin login | `admin` / `admin123` |

## Repositories

- **Primary production repo**: `https://github.com/Dannny-101/Ten-See` (main branch)
- **Backup / dev repo**: `https://github.com/Dannny-101/Backup` (main and beta branches)

All three branches currently contain the same code.

## Azure VM

- **VM name**: `teanandseevm`
- **Resource group**: `tenandsee-vm`
- **Public IP**: `104.208.77.198`
- **OS**: Ubuntu 24.04 LTS
- **SSH user**: `azureuser`
- **SSH key**: `~/Downloads/teanandseevm_key.pem`

```bash
ssh -i ~/Downloads/teanandseevm_key.pem azureuser@104.208.77.198
```

## Stack Architecture

```
User
  │
  ▼
Cloudflare (DNS + proxy)
  │
  ▼
Caddy (HTTPS termination, reverse proxy)
  │
  ▼
Ten-See Node.js app (Docker container, port 5000)
  │
  ▼
MongoDB (Docker container, port 27017)
```

## Services on the VM

| Service | Purpose | Port |
|---------|---------|------|
| Docker | Container runtime | - |
| Ten-See app | Node.js + Express + static frontend | 5000 |
| MongoDB | Database | 27017 |
| Caddy | Reverse proxy + HTTPS | 80, 443 |

## Project Layout

```
Ten-See/
├── backend/
│   ├── server.js          # Express entry point
│   ├── .env               # Environment variables (not committed)
│   ├── package.json
│   ├── models/            # Mongoose schemas
│   ├── routes/            # REST API routes
│   └── services/          # Email, WhatsApp, chat queue
├── frontend/
│   ├── index.html         # Landing page
│   ├── admin/index.html   # Admin dashboard
│   └── ...
├── docker-compose.yml     # App + MongoDB containers
└── Dockerfile             # App container build
```

## Key Navigation

### Admin Panel
- URL: https://beta.tenandsee.homes/admin
- Login: `admin` / `admin123`
- Change the default password immediately after first login.

### API Endpoints
- Public listings: `GET /api/listings`
- Public properties: `GET /api/properties`
- Lead creation: `POST /api/leads`
- Booking creation: `POST /api/bookings`
- WhatsApp webhook: `POST /api/whatsapp/webhook`
- Admin routes: `/api/admin/*` (require JWT)

## Environment Variables

Create `backend/.env` on the server:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/tenandsee
JWT_SECRET=<random_secret>
ADMIN_EMAIL=<your_admin_email>
MAPBOX_TOKEN=<your_mapbox_token>
WHATSAPP_API_URL=https://graph.facebook.com/v21.0
WHATSAPP_PHONE_ID=<your_phone_id>
WHATSAPP_TOKEN=<your_token>
WHATSAPP_APP_SECRET=<your_app_secret>
WHATSAPP_VERIFY_TOKEN=<your_verify_token>
```

## Common Maintenance Commands

All commands assume you are SSH'd into the VM.

```bash
# App status
cd ~/Ten-See
docker compose ps

# View logs
docker compose logs -f app

# Restart app
docker compose restart

# Rebuild and restart
docker compose down
docker compose up -d --build

# Edit environment variables
nano ~/Ten-See/backend/.env

# Restart after env changes
docker compose restart

# Caddy logs
sudo journalctl -u caddy -f

# Update from GitHub
cd ~/Ten-See
git pull origin main
docker compose up -d --build
```

## WhatsApp Webhook

If using the WhatsApp Business API, set the webhook URL in Meta's dashboard to:

```
https://beta.tenandsee.homes/api/whatsapp/webhook
```

Make sure `WHATSAPP_VERIFY_TOKEN` matches the value configured in Meta.

## Cloudflare Settings

- **A record**: `beta` → `104.208.77.198`
- **Proxy status**: Enabled (orange cloud)
- **SSL/TLS mode**: Full (strict)

## Security Notes

- Change the default admin password immediately.
- Keep `.env` out of Git (it is ignored by `.gitignore`).
- Restrict SSH key permissions: `chmod 600 ~/Downloads/teanandseevm_key.pem`.
- Do not commit secrets or credentials.

## Local Development

To work locally:

```bash
git clone https://github.com/Dannny-101/Ten-See.git
cd Ten-See/backend
npm install
# Create .env file
node server.js
```

The frontend is served from the backend via static file routes.

## Troubleshooting

### Site not loading
- Check DNS: `dig beta.tenandsee.homes`
- Check Caddy: `sudo systemctl status caddy`
- Check app: `docker compose ps` and `docker compose logs app`

### Certificate issues
- Caddy handles certificates automatically.
- Ensure the DNS A record points to the VM IP.
- Ensure Cloudflare SSL/TLS is set to Full (strict).

### DNS not resolving on Mac
- Flush DNS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
- Or add a temporary hosts entry: `sudo sh -c 'echo "104.208.77.198 beta.tenandsee.homes" >> /etc/hosts'`

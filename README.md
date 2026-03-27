# GroomBook

> **Built for groomers, not corporations.**

GroomBook is the open-source scheduling and client management platform built specifically for independent pet groomers — giving you the tools of enterprise software without the enterprise price tag or vendor lock-in.

**[Try the Live Demo →](https://groombook.farh.net)**

---

## Why GroomBook?

Independent groomers are stuck using paper books, spreadsheets, or generic scheduling tools that weren't built for pet care. GroomBook is purpose-built for the way grooming shops actually work: managing pets and their owners, filling cancelled slots automatically, and giving clients a way to confirm without calling the shop.

- **Open source** — you own your data, no vendor lock-in
- **Self-hostable** — run it yourself for free, or use low-cost hosting
- **Purpose-built for groomers** — pet records, appointment notes, breed-aware workflows

---

## Features

- **iCal calendar feed** — push GroomBook appointments directly into Google Calendar or Apple Calendar. No app switching, works with the tools you already use.
- **Waitlist system** — automatically fill cancelled slots from your waitlist. Reduce no-show revenue loss without lifting a finger.
- **Quick-find client & pet search** — instantly surface any client or pet by name. Never lose context on a regular — full history at a glance.
- **Customer portal** — clients confirm or cancel appointments on their own without calling the shop. Less phone tag, fewer no-shows.
- **Appointment notes** — add per-appointment notes for breed quirks, grooming preferences, or anything your staff needs to know next time.
- **RBAC (role-based access control)** — front desk sees bookings; only you see financials. Right access for every role in your shop.

---

## Live Demo

Try the full groomer and customer experience at **[groombook.farh.net](https://groombook.farh.net)**. Log in with demo credentials to explore the scheduler, customer portal, and staff views.

---

## Quick Start (Docker Compose)

The fastest way to run GroomBook is with Docker Compose. This starts PostgreSQL, runs database migrations, and serves both the API and web frontend.

```bash
git clone https://github.com/groombook/groombook.git
cd groombook

# Start everything (Postgres + migrate + API + web)
docker compose up --build
```

- **Web UI**: http://localhost:8080
- **API**: http://localhost:3000

The default `docker-compose.yml` sets `AUTH_DISABLED=true` so you can explore the app without configuring an OIDC provider. **Disable this in any internet-facing deployment.**

### Production configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables to update for production:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_DISABLED` | Set to `false` in production |
| `OIDC_ISSUER` | Authentik issuer URL |
| `OIDC_AUDIENCE` | OAuth2 audience (default: `groombook`) |
| `CORS_ORIGIN` | Public URL of the web frontend |

```bash
docker compose --env-file .env up --build
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | [Hono](https://hono.dev/) (TypeScript, Node.js) |
| Frontend | React 19 + Vite + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Database | PostgreSQL via [CNPG](https://cloudnative-pg.io/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | OIDC via [Authentik](https://goauthentik.io/) |
| Infra | Kubernetes (namespace: `groombook`), Flux GitOps |
| CI | GitHub Actions (self-hosted `groombook-runners`) |

## Repository Structure

```
groombook/
├── apps/
│   ├── api/          # Hono REST API
│   └── web/          # React PWA
├── packages/
│   ├── db/           # Drizzle schema + migrations
│   └── types/        # Shared TypeScript types
├── .github/
│   └── workflows/    # CI/CD pipelines
└── docker-compose.yml
```

---

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker & Docker Compose (for local Postgres)

```bash
# Clone the repo
git clone https://github.com/groombook/groombook.git
cd groombook

# Install dependencies
pnpm install

# Start local Postgres
docker compose up postgres -d

# Run database migrations
DATABASE_URL=postgres://groombook:groombook@localhost:5432/groombook pnpm db:migrate

# Start API and Web in parallel
pnpm dev
```

API: http://localhost:3000 | Web: http://localhost:5173

### Running Tests

```bash
# Unit tests (vitest)
pnpm test

# E2E tests (Playwright) — requires the full Docker Compose stack
docker compose up -d --wait
pnpm --filter @groombook/e2e test
```

### Building

```bash
pnpm build
```

---

## Self-Hosting on Kubernetes

See the [groombook/infra](https://github.com/groombook/infra) repository for Kubernetes manifests and Flux configuration.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a pull request

All PRs require CI to pass before merge. See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## License

MIT

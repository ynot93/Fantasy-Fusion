# Fantasy Fusion

A Premier League fantasy football app where users form or join leagues, contribute to prize pools, and compete for cash prizes based on real Fantasy Premier League (FPL) performance.

The repo is a FastAPI backend and a React frontend, wired together: the frontend is a real client of the backend API, with local email/password accounts linked to users' real FPL teams, and real wallet/payments and league data. Some admin-panel features still run on mock data because the backend doesn't have a real endpoint for them yet — see [Known gaps](#known-gaps) for exactly which ones and why.

## Table of contents

- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the app](#running-the-app)
- [Running tests](#running-tests)
- [Environment variables](#environment-variables)
- [Authentication model](#authentication-model)
- [API reference](#api-reference)
- [Database & migrations](#database--migrations)
- [Known gaps](#known-gaps)

## Tech stack

**Backend**
| | |
|---|---|
| Language / runtime | Python 3.11 |
| Framework | FastAPI 0.116 |
| ORM | SQLAlchemy 2.0 (async, via `asyncpg`) |
| Migrations | Alembic |
| Database | PostgreSQL (SQLite in-memory for tests, via `aiosqlite`) |
| Auth | JWT (`python-jose`) + local email/password (bcrypt via `passlib`); FPL teams linked by manager ID |
| FPL data | `fpl` package + direct `aiohttp` calls to `fantasy.premierleague.com` |
| Payments | Provider-abstracted (`PaymentProvider` protocol); M-Pesa (Daraja) and Stripe implemented, Pesapal removed |
| Testing | `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx` test client |

**Frontend**
| | |
|---|---|
| Language | TypeScript |
| Framework | React 19 |
| Build tool | Vite 6 |
| Routing | `react-router-dom` v7 (hash-based routing) |
| Animation | `framer-motion` |
| Styling | Tailwind CSS (via CDN script — not a build-time integration, see Known gaps) |
| State | React Context (`AuthContext`) + local component state — no Redux/React Query |
| HTTP | Native `fetch`, wrapped in `services/http.ts` |

## Folder structure

```
Fantasy-Fusion/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # get_db, get_current_user, get_current_linked/verified_fpl_user
│   │   │   ├── deps_fpl.py          # FPLAdapter singleton accessor
│   │   │   └── routes/
│   │   │       ├── auth.py          # /auth/signup, /auth/login, /auth/me
│   │   │       ├── leagues.py       # /leagues/*
│   │   │       ├── payments.py      # /payments/*
│   │   │       ├── mpesa.py         # /mpesa/* (webhooks)
│   │   │       ├── stripe.py        # /stripe/*
│   │   │       ├── fpl.py           # /fpl/*
│   │   │       └── admin/           # /admin/users, /admin/leagues, /admin/transactions,
│   │   │                            # /admin/content, /admin/settings, /admin/system
│   │   ├── core/
│   │   │   ├── config.py            # Settings (pydantic-settings, reads .env)
│   │   │   ├── security.py          # JWT + password hashing helpers
│   │   │   ├── rbac.py              # require_role() dependency factory
│   │   │   └── rate_limit.py        # FixedWindowRateLimiter (login + FPL verify)
│   │   ├── db/
│   │   │   ├── auth/                # User model/schemas/crud
│   │   │   ├── leagues/             # League model/schemas/crud
│   │   │   ├── payments/            # Wallet, Transaction, LeaguePot, provider abstraction
│   │   │   │   └── providers/       # mpesa_provider.py, stripe_provider.py, fake.py
│   │   │   ├── admin/               # Shared enums + admin-only models/schemas
│   │   │   └── database.py          # Async engine/session setup
│   │   ├── services/
│   │   │   └── fpl_adapter.py       # Wraps the `fpl` package + raw FPL REST calls
│   │   ├── tests/                   # pytest suite (in-memory SQLite, FakeProvider)
│   │   └── main.py                  # App assembly, CORS, router registration, lifespan
│   ├── migrations/                  # Alembic migration scripts
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example                 # Documents every required env var
│   └── .env                         # Not committed — copy from .env.example
├── frontend/
│   ├── pages/                       # One file per route (Dashboard, Wallet, MyLeagues, …)
│   │   └── admin/                   # Admin-panel pages
│   ├── components/                  # Shared UI (Header, Layout, LeagueCard, ProtectedRoute, …)
│   │   ├── admin/                   # Admin-only components
│   │   └── profile/                 # Profile page sub-sections
│   ├── context/
│   │   └── AuthContext.tsx          # Auth state, token storage, login/logout
│   ├── services/
│   │   ├── fantasyApi.ts            # The single API surface every page calls through
│   │   ├── http.ts                  # apiFetch() — fetch wrapper, auth header, error typing
│   │   └── money.ts                 # centsToKsh / kshToCents converters
│   ├── types.ts                     # All shared TypeScript types/interfaces
│   ├── App.tsx                      # Route definitions
│   ├── index.tsx                    # Entry point (wraps App in AuthProvider + HashRouter)
│   ├── vite.config.ts
│   ├── vite-env.d.ts                # import.meta.env typing
│   ├── .env.local                   # Not committed — copy from .env.example
│   └── .env.example
├── CLAUDE.md                        # Architecture guidance for AI-assisted development
├── ROADMAP.md                       # Production-readiness audit and phased roadmap
└── README.md                        # This file
```

## Prerequisites

- **Python 3.11** (the backend's committed `venv` was built against 3.11; other 3.11.x versions should work)
- **Node.js** (any version supporting Vite 6 / React 19 — 20.x LTS or newer recommended)
- **PostgreSQL** — a running instance reachable from the backend (local, Docker, or a managed instance). SQLite is only used for the automated test suite.
- A **Fantasy Premier League team** to link after signing up (only its public manager ID is needed — never the FPL password). To test verification end-to-end you also need a free FPL classic league to use as the verification league (see below).

## Setup

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd Fantasy-Fusion
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env — at minimum set DATABASE_URL, SYNC_DATABASE_URL, JWT_SECRET_KEY, ALGORITHM,
# ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, FPL_API_BASE_URL.
# MPESA/STRIPE/FPL-service-account fields are required by Settings but only matter
# functionally if you exercise those specific flows — placeholder strings are fine otherwise.
alembic upgrade head             # creates all tables in your Postgres database
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local       # VITE_API_BASE_URL defaults to http://127.0.0.1:8000
```

## Running the app

Run both from separate terminals:

```bash
# Terminal 1 — backend (http://127.0.0.1:8000)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend (http://localhost:3000)
cd frontend
npm run dev
```

Open **http://localhost:3000**, click **Log In**, and enter real FPL credentials — your account is created automatically on first successful login. Interactive API docs (Swagger UI) are at **http://127.0.0.1:8000/docs**.

**⚠️ Caution on Wallet/deposit flows**: if `MPESA_*` in `.env` are real (non-placeholder) credentials, clicking **Add Funds** will trigger an actual M-Pesa STK push. Confirm your credentials point at a sandbox before testing deposits/withdrawals.

## Running tests

Backend only — there is no frontend test runner configured yet (`npx tsc --noEmit` is the closest available check):

```bash
cd backend
pytest                                   # full suite
pytest app/tests/test_league.py          # one file
pytest app/tests/test_league.py::test_x  # one test
pytest --cov=app                         # with coverage
```

Tests never touch your real database or `.env` — `app/tests/conftest.py` overrides the DB dependency with an in-memory SQLite engine (fresh schema per test) and swaps in a `FakeProvider` for payments, so no real M-Pesa/Stripe calls happen during testing.

```bash
cd frontend
npx tsc --noEmit                         # type-check (no bundling/emit)
```

## Environment variables

Every variable is documented inline in the committed example files — read these rather than this section going stale:

- `backend/.env.example` — database URLs, JWT settings, CORS origins, FPL service-account credentials, M-Pesa/Stripe provider credentials.
- `frontend/.env.example` — `VITE_API_BASE_URL` (and the legacy unused `GEMINI_API_KEY`/`API_KEY` the Vite config still exposes as a holdover from the original AI Studio scaffold).

Two settings worth calling out specifically:
- **`CORS_ORIGINS`** (backend, optional, defaults to `["http://localhost:3000"]`) — must include whatever origin your frontend actually runs on, or every browser request will fail CORS before reaching the API.
- **`VITE_API_BASE_URL`** (frontend, required) — if unset or wrong, every page will fail to load data with no explicit error beyond a failed network request in devtools.

## Authentication model

Accounts are local: `POST /auth/signup` / `POST /auth/login` with `{email, password}` (bcrypt-hashed, 8–72 chars), issuing the backend's own JWT access + refresh tokens.

**Password reset** (frontend: `/forgot-password` → emailed link → `/reset-password?token=…`): `POST /auth/password-reset/request` always returns the same 202 whether or not the email has an account, and emails a link to `FRONTEND_URL/reset-password?token=…`. The token is a JWT signed with a key derived from `JWT_SECRET_KEY` (so it can't be used as a bearer token, and a bearer token can't reset a password), expires after `PASSWORD_RESET_EXPIRE_MINUTES` (default 30), and embeds a fingerprint of the current password hash, so it's single-use and every older link dies once the password changes. Email goes out over SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS`); **with `SMTP_HOST` unset (local dev) the email, link included, is written to the backend log instead**. Never leave it unset in production.

> **Why not "log in with FPL"?** FPL moved its login to PingOne OIDC in 2026/27 and the old `users.premierleague.com` endpoint the `fpl` package used is gone. There is no supported way for a third-party server to log in to FPL (no password grant, redirect locked to FPL's own domain, bot-detection on the flow), and FPL's terms forbid letting anyone else access your account. Everything the app needs from FPL is public, so the backend never holds FPL credentials or sessions.

After signing up, users onboard their FPL team in two steps (frontend: `/link-fpl`):
1. **Link** — `POST /fpl/link` with a manager ID or a pasted Points-page URL (`…/entry/<id>/event/<gw>`). The backend checks the team exists via the public `/api/entry/{id}/` and stores `fpl_manager_id` (unique — one team per account). Linking a different team resets verification.
2. **Verify ownership** — the user joins the **verification league** on FPL (a free classic league you create from your own FPL account; set `FPL_VERIFICATION_LEAGUE_ID` + `FPL_VERIFICATION_LEAGUE_CODE`), then `POST /fpl/verify` re-reads their public entry uncached and checks the league appears in `leagues.classic`. Only the account owner can add their team to a league, so this proves control. Users may leave the league afterwards (FPL caps private leagues at 30 per manager).

What each stage unlocks:
- **No team linked** — can browse, use the wallet; cannot join or create any league (403).
- **Linked, unverified** — can join/create **free** leagues.
- **Verified** — can also join/create leagues with an `entry_fee_cents > 0` and call `/payments/leagues/contribute`.

Consequences worth knowing:
- A user's **role** (`user`/`admin`/`super_admin`) is never self-assignable — new accounts always start as `user`. To test admin pages, promote a user directly in the database:
  ```sql
  UPDATE users SET role = 'super_admin' WHERE email = 'you@example.com';
  ```
- Tokens are stored in `localStorage` on the frontend (not an httpOnly cookie) — a deliberate tradeoff given the backend issues bearer tokens rather than setting cookies; see `CLAUDE.md`/`ROADMAP.md` for the security tradeoff this implies.
- A refresh token is issued but **not usable** — there's no `/auth/refresh` endpoint. A 401 anywhere just forces re-login.

## API reference

Base URL: `http://127.0.0.1:8000` (local). All endpoints below except `POST /auth/signup`, `POST /auth/login`, `GET /fpl/bootstrap`, and `GET /fpl/entry/{id}` require `Authorization: Bearer <token>`. Endpoints under `/admin/*` additionally require the caller's role to be `admin` or `super_admin` (a few are `super_admin`-only, noted below).

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | `{email, password}` → 201 `{access_token, refresh_token, token_type, user}`. 409 if the email is taken. |
| POST | `/auth/login` | `{email, password}` → same shape as signup. 401 on bad credentials. Rate-limited (5 attempts / 15 min / IP). |
| GET | `/auth/me` | Current user (`id, email, username, fpl_manager_id, fpl_verified, role`). |
| POST | `/auth/password-reset/request` | `{email}` → 202, same response for unknown emails. Emails a reset link. Rate-limited (5 / 15 min / IP). |
| POST | `/auth/password-reset/confirm` | `{token, password}` → 200. 400 if the token is invalid, expired, or already used. |

### Leagues
| Method | Path | Notes |
|---|---|---|
| GET | `/leagues/` | List leagues. Query params: `is_private`, `limit`, `offset`. |
| POST | `/leagues/` | Create a league. Body: `{name, is_private, max_members, entry_fee_cents}`. Needs a linked team; a verified one if `entry_fee_cents > 0`. |
| GET | `/leagues/mine` | Leagues the current user is a member of. |
| POST | `/leagues/join` | `{code}` → joins by invite code. 400 if full, 404 if code unknown, 403 if no linked team (or unverified for a paid league). |
| GET | `/leagues/{league_id}` | League detail, members enriched with live FPL name/team/points. |

### Payments
| Method | Path | Notes |
|---|---|---|
| GET | `/payments/wallet` | Current user's wallet balance (auto-created on first access). |
| GET | `/payments/transactions` | Current user's transaction history. Query params: `limit`, `offset`. |
| POST | `/payments/wallet/deposit` | `{amount_cents, currency, provider: "MPESA"\|"STRIPE", idempotency_key?}`. |
| POST | `/payments/wallet/withdraw` | `{amount_cents, destination, provider, idempotency_key?}`. |
| POST | `/payments/leagues/contribute` | `{league_id, amount_cents}` — pay a league's entry fee into its pot. Requires a verified FPL team. |
| POST | `/payments/leagues/payout` | `{league_id, winner_user_id}` — pays the full pot to the winner. |

### M-Pesa / Stripe webhooks
*(server-to-server; not called by the frontend)*
| Method | Path | Notes |
|---|---|---|
| POST | `/mpesa/stk-callback` | Deposit completion callback. |
| POST | `/mpesa/b2c/result` | Withdrawal (B2C) result callback. |
| POST | `/mpesa/b2c/timeout` | Withdrawal timeout callback. |
| GET | `/stripe/create-payment-intent` | **Not wired into the wallet ledger** — see Known gaps. |
| POST | `/stripe/onboard-user` | Stripe Connect onboarding. |
| POST | `/stripe/withdraw` | **Unauthenticated** — see Known gaps. |
| POST | `/stripe/webhook` | Signature-verified, but handlers are stubs (`print()` only). |

### FPL data
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/fpl/bootstrap` | None | All static FPL data (players, teams, gameweeks). Cached ~5 min. |
| GET | `/fpl/entry/{entry_id}` | None | Any manager's public profile summary. Cached ~1 hr. |
| POST | `/fpl/link` | User | `{team}` (manager ID or Points URL) → `{user, team: {manager_id, team_name, manager_name, overall_points}}`. 422 unparseable, 404 no such team, 409 linked to another account. |
| GET | `/fpl/verification` | User | `{linked, verified, league_code}`. |
| POST | `/fpl/verify` | Linked user | Checks the team has joined the verification league. 400 if not yet, 503 if unconfigured. Rate-limited (10 / 15 min / user). |
| GET | `/fpl/my-picks/{event_id}` | Linked user | Current user's squad/captain for a given gameweek (public FPL data). |

### Admin — Users
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/admin/users` | admin+ | List/filter users (`q`, `role`, `status`). |
| GET | `/admin/users/{id}` | admin+ | User detail. |
| PATCH | `/admin/users/{id}` | admin+ | Update `email`/`status`/`is_locked`. |
| PATCH | `/admin/users/{id}/role` | **super_admin** | Change role. |
| PATCH | `/admin/users/{id}/balance` | admin+ | Adjust wallet balance; records an `ADJUSTMENT` transaction. |
| PATCH | `/admin/users/{id}/suspend` | admin+ | Suspend/reactivate. |

### Admin — Leagues
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/admin/leagues` | admin+ | List all leagues with creator + prize pool + participant count. |
| POST | `/admin/leagues` | admin+ | Admin-created league. |
| GET | `/admin/leagues/{id}` | admin+ | Detail, including FPL-enriched members. |
| PATCH | `/admin/leagues/{id}` | admin+ | Update league fields. |
| POST | `/admin/leagues/{id}/close` | admin+ | Marks `completed`. |
| POST | `/admin/leagues/{id}/payouts` | admin+ | `{winner_user_id}` → pays out the pot. |
| POST | `/admin/leagues/{id}/recalculate` | admin+ | **Stub** — returns `{"ok": true}`, no real computation. |

### Admin — other
| Method | Path | Role | Notes |
|---|---|---|---|
| GET/POST/PATCH/DELETE | `/admin/content*` | admin+ | **Stub** — not backed by a real content model yet. |
| GET/PATCH | `/admin/settings` | admin+ / **super_admin** (write) | Generic key-value settings store. |
| GET | `/admin/transactions` | admin+ | **Stub** — always returns `[]`. |
| POST | `/admin/transactions/withdrawals/{id}/approve` | admin+ | **Stub**. |
| GET | `/admin/health` | admin+ | Basic health check. |
| GET | `/admin/audit-logs` | admin+ | **Stub** — always returns `[]`. |

The live, always-accurate version of this table is the running server's Swagger UI at `/docs` or its raw schema at `/openapi.json`.

## Database & migrations

For the full local setup (where Postgres runs, how to connect with psql or a GUI, the schema, backups, and troubleshooting), see **[docs/DATABASE.md](docs/DATABASE.md)**.

Postgres via SQLAlchemy async (`asyncpg` at runtime, `psycopg2` for Alembic). Migration history lives in `backend/migrations/versions/`, starting from a single **baseline** revision (`34626e6c8489`) that creates the whole schema, so `alembic upgrade head` builds a working database from empty.

> **Upgrading a database created before the baseline?** The old chain (`1f9c3b0e9ce9` … `edd0db22bd32`) was squashed because it couldn't build a database from scratch. A database that was at `edd0db22bd32` already matches the baseline: run `alembic stamp --purge 34626e6c8489` (don't `upgrade`, which would try to recreate existing tables), then `alembic check` should report no changes. For a database at any older revision, stamp it the same way, then run `alembic check`: any differences it lists are what that database is missing, and need a one-off migration (or, for a disposable dev DB, drop it and `alembic upgrade head` from empty).

 `migrations/env.py` imports all four domain model modules so `alembic revision --autogenerate` can see every table — if you add a new model module, add its import there too.

```bash
alembic upgrade head                              # apply all pending migrations
alembic revision --autogenerate -m "description"  # generate a new migration from model changes
alembic downgrade -1                              # roll back one revision
```

Always review an autogenerated migration before running it — check it only contains the change you intended (enum/type reflection quirks can sometimes produce unrelated noise).

## Known gaps

Deliberate, scoped decisions — not bugs waiting to be noticed:

- **Admin dashboard stats, transactions list, CMS, analytics, fraud alerts, and system settings (API keys/branding/backups) still render mock data** on the frontend. Each needs real backend work of varying size:
  - Dashboard stats and a real transactions list are straightforward additions.
  - CMS needs purpose-built models (the existing generic content stub doesn't fit homepage/announcements/help-article shapes well).
  - Live analytics (DAU/WAU/MAU, retention cohorts) need a login-event table that doesn't exist yet — there's no historical data to backfill, so this only becomes meaningful after weeks of real usage going forward.
  - Fraud detection and automated backups are flagged as needing product/compliance and infra-ops input respectively before building more than a minimal, clearly-labeled MVP.
- **Stripe is not fully wired.** `POST /stripe/withdraw` and `GET /stripe/create-payment-intent` bypass the wallet ledger entirely and the former has no auth check at all. The wallet deposit/withdraw UI only offers M-Pesa for this reason. Don't point real Stripe credentials at a shared/public environment until this is addressed.
- **League payout authorization is not scoped to the league's creator/admin** — any authenticated user can currently trigger `POST /payments/leagues/payout` for any league. The admin-panel payout flow is a safer path (gated by `require_role`), but the underlying user-facing endpoint itself needs an ownership check before this is safe to expose publicly.
- **Tailwind loads via a CDN `<script>` tag**, not a build-time integration — fine for development, not recommended for a production deploy (no purging, larger payload).
- **No CI/CD, Docker, or deployment configuration** exists yet.

See `ROADMAP.md` for the full production-readiness audit and phased plan this list is drawn from — it goes deeper into security hardening, compliance (KYC/responsible gambling/licensing), and infrastructure work beyond what's listed here.

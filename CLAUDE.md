# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Fantasy Fusion is a Premier League fantasy football app where users form or join leagues, contribute to prize pools, and compete for cash prizes. The repo has two halves that **are now wired together**:

- `backend/` — a FastAPI + SQLAlchemy (async) API that owns auth, leagues, wallets/payments, and an FPL (Fantasy Premier League) data adapter.
- `frontend/` — a React 19 + Vite SPA that is a real client of the backend API (via `frontend/services/fantasyApi.ts` + `frontend/services/http.ts`), with real JWT auth, real league/wallet/FPL data, and admin pages backed by real endpoints where the backend supports them.

Several frontend pages still render from in-memory mock data because the backend has no endpoint for that data yet — this is deliberate, not an oversight. See **"What's still mocked"** below before assuming a page is wired.

For the full endpoint reference, run/test commands, and folder structure, see `README.md` — this file is scoped to architecture guidance for making changes, not a full reference.

## Commands

### Backend (`backend/`)

```bash
pip install -r requirements.txt         # install deps (no virtualenv committed)
uvicorn app.main:app --reload           # run the API locally (http://127.0.0.1:8000)
pytest                                  # run all tests
pytest app/tests/test_league.py         # run a single test file
pytest --cov=app                        # run with coverage (pytest-cov is installed)
alembic revision --autogenerate -m "message"   # create a migration
alembic upgrade head                    # apply migrations
```

Tests do **not** need a real database or `.env`: `app/tests/conftest.py` overrides `get_db` with an in-memory SQLite (`aiosqlite`) engine and overrides the payments service with `FakeProvider` for MPESA/STRIPE, so provider credentials are never hit in tests. Every test function gets a fresh schema (`prepare_database` fixture drops/recreates tables per test).

`app/core/config.py` defines `Settings` (pydantic-settings) which requires a `.env` file in `backend/` at runtime for the app to boot outside of tests. **`backend/.env.example` is committed** and documents every field — copy it to `.env` and fill in real values; check with the user before assuming any value beyond what's already in their `.env`.

### Frontend (`frontend/`)

```bash
npm install
npm run dev        # Vite dev server on port 3000 (0.0.0.0)
npm run build
npm run preview
```

`frontend/.env.local` (gitignored; `.env.example` is committed) must set `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000` in the example) for the frontend to reach the backend — without it, every API call fails. The backend must also be running with CORS allowing the frontend's origin (`CORS_ORIGINS` in backend config, defaults to `http://localhost:3000`). There is no lint or test script configured on the frontend; `npx tsc --noEmit` is the closest thing to a check.

**Accounts are local email/password** (`POST /auth/signup`, `POST /auth/login`). FPL teams are linked afterwards by public manager ID (`POST /fpl/link`) and ownership-verified by joining a verification league (`POST /fpl/verify`, configured via `FPL_VERIFICATION_LEAGUE_ID`/`FPL_VERIFICATION_LEAGUE_CODE`). Do **not** reintroduce "log in with FPL": FPL moved to PingOne OIDC in 2026/27, `users.premierleague.com` no longer exists, there's no server-usable login flow, and FPL's terms forbid sharing account access.

## Backend architecture

FastAPI app assembly lives in `app/main.py`, which wires an `aiohttp.ClientSession` + `FPLAdapter` into `app.api.deps_fpl` module-level state during the `lifespan` startup hook (not via `Depends` construction), registers `CORSMiddleware` (origins from `Settings.CORS_ORIGINS`), and includes routers under prefixes (`/auth`, `/leagues`, `/payments`, `/mpesa`, `/stripe`, `/fpl`, plus unprefixed `admin_*` routers that define their own prefixes internally).

**Domain modules** under `app/db/<domain>/` each follow the same `models.py` / `schemas.py` / `crud.py` split:
- `auth/` — `User` model (role: `user`/`admin`/`super_admin` via `app/db/admin/enums.py::Role`; `hashed_password` (bcrypt); nullable unique `fpl_manager_id` plus `fpl_verified`/`fpl_verified_at` for the linked FPL team). Gating: `deps.get_current_linked_fpl_user` (any league membership) and `deps.get_current_verified_fpl_user` (anything involving money — paid leagues, contributions); `leagues.py::_require_fpl_for_league` applies the same rule on join/create. Password reset tokens (`security.create_password_reset_token`) are signed with a *derived* key, never `JWT_SECRET_KEY` itself — keep it that way, or `get_current_user` would accept them as bearer tokens. `app/services/email.py::send_email` logs instead of sending when `SMTP_HOST` is unset.
- `leagues/` — `League` model (`is_private`, `max_members`, `code` invite code, `entry_fee_cents`, `prize_scheme`) plus the `league_members` association table (many-to-many with `User`).
- `payments/` — `Wallet`, `Transaction`, `LeaguePot`. All money is stored in **minor units (cents)** as `BigInteger`. Providers: `MPESA` and `STRIPE` only — `PESAPAL`/`PAYPAL` were removed entirely.
- `admin/` — shared enums (`Role`, `UserStatus`, `LeagueStatus`) and admin-only schemas/models (`Setting`, `AdminContent`, `AuditLog`, `LeaguePayout`).

**Payments are provider-abstracted**: `app/db/payments/interfaces.py` defines the `PaymentProvider` Protocol (`create_deposit`, `capture_deposit`, `payout`). Concrete providers live in `app/db/payments/providers/` (`mpesa_provider.py`, `stripe_provider.py`, `fake.py`). `PaymentsService` (`app/db/payments/service.py`) is constructed with a `dict[str, PaymentProvider]` provider map (built per-request in `get_payments_service()`, `routes/payments.py`) and holds all business logic: deposits, withdrawals, league contributions (deducts wallet, credits `LeaguePot`, skims a house cut via `house_cut_bps`), and payouts. Deposit/withdrawal completion is driven by provider webhooks calling `on_deposit_succeeded`/`on_withdraw_succeeded`/etc., looked up by `(provider, provider_ref)`, idempotent via a `TxStatus.SUCCEEDED` short-circuit and unique constraints on `(provider, provider_ref)` and `idempotency_key`. Admin balance adjustments (`PATCH /admin/users/{id}/balance`) also write an `ADJUSTMENT`-type `Transaction` so the change shows up in the user's own history — unlike every other `TxType`, `ADJUSTMENT.amount_cents` carries its own sign (credit or debit) rather than being a positive magnitude with direction implied by type.

**FPL integration**: `app/services/fpl_adapter.py` is a thin `aiohttp` client over FPL's **public** REST API (`bootstrap_static()`, `get_entry()`, `get_entry_picks()`) — the `fpl` PyPI package was dropped (its login is dead and its `get_user()` returned FPL's 404 body as if it were a team). It never authenticates to FPL; endpoints that need an FPL login (e.g. `/api/my-team/`) are unavailable by design. `_get_json` raises `FPLEntryNotFound` on 404 — routes map that to 404, not 500. The adapter has a simple in-process TTL cache (`SimpleTTLCache`) for public data (bootstrap-static: 300s default, manager entries: 3600s default); pass `get_entry(..., use_cache=False)` when you need to see a change the user just made on FPL (verification does). `parse_manager_id()` accepts a bare ID or any URL containing `/entry/<id>`. The adapter singleton is accessed via `app.api.deps_fpl.get_fpl_adapter()`, not constructed per-request.

League leaderboards are enriched with live FPL data: `app/api/routes/leagues.py::_enrich_members()` calls `adapter.get_entry()` per member to fill in `name`/`team_name`/`points` (current-gameweek) on top of the bare `UserResponse` fields — reused by both `GET /leagues/{id}` and the admin league detail endpoint. This means league-detail requests fan out to N FPL calls (cached ~1hr per manager); expect latency on first view of a league with many never-before-looked-up members.

**Auth/RBAC**: JWT-based (`app/core/security.py`), with `get_current_user` (`app/api/deps.py`) decoding the bearer token (`sub` claim is coerced to `int` before the user lookup — the DB column is an integer PK) and loading the `User`. `app/core/rbac.py::require_role(*allowed)` is a dependency factory for gating admin routes by `Role`. `get_current_active_fpl_user` additionally requires the user to have linked FPL credentials. There is no `/auth/refresh` endpoint — a refresh token is issued but unused; a 401 anywhere just forces re-login.

**Migrations**: Alembic, configured in `backend/alembic.ini` with scripts under `backend/migrations/`. Uses `SYNC_DATABASE_URL` (separate from the async `DATABASE_URL` used at runtime) — check `migrations/env.py` before assuming which URL a given Alembic invocation needs. `migrations/env.py` imports all four domain model modules (`auth`, `leagues`, `payments`, `admin`) so `autogenerate` can see every table — if you add a new model module, import it there too or `autogenerate` will silently produce an empty diff for it. History starts at baseline `34626e6c8489` (the old chain was squashed because it never created several tables and couldn't build a DB from empty); keep it that way by only ever changing the schema through migrations, never `create_all`/manual DDL against a real DB. `alembic check` should report no changes after `upgrade head`. Postgres enum types outlive `drop_table`, so a migration's `downgrade()` that drops a table using an enum must drop the enum too (see the baseline).

## Frontend architecture

Routing is centralized in `frontend/App.tsx` using `react-router-dom`, with a hard split between the public app (wrapped in `components/Layout.tsx`, animated route transitions via `framer-motion`) and the `/admin/*` section (wrapped in `components/admin/AdminLayout.tsx`), switched on `location.pathname.startsWith('/admin')`. Authenticated routes (`/dashboard`, `/my-leagues`, `/wallet`, `/profile`, `/link-fpl`, all `/admin/*`) are wrapped in `components/ProtectedRoute.tsx`, which redirects to `/login` if unauthenticated and to `/dashboard` if authenticated but missing a required role. `/signup` (`pages/Signup.tsx`) creates an account and sends the user to `/link-fpl` (`pages/LinkFpl.tsx`: link team → confirm → verify).

**Auth**: `context/AuthContext.tsx` holds `{accessToken, refreshToken, user}` in `localStorage` (one namespaced key) and exposes `useAuth()` (`isAuthenticated`, `user`, `login`, `signup`, `logout`, plus `setUser`/`refreshUser` to update the stored user after FPL link/verify — `AuthUser.fplManagerId` is `null` until linked, so guard before using it). `services/http.ts`'s `apiFetch()` reads the token via a getter wired up by `AuthContext` (mirroring how it's wired, not a React import — `http.ts` has no framework dependency) and clears auth on any 401.

**API layer**: `frontend/services/fantasyApi.ts` is the single module every page imports for data — it's the seam between real and mock data. Methods backed by real endpoints call through `services/http.ts::apiFetch()` and map backend shapes (`snake_case`, integer ids, cents) to frontend shapes (`camelCase`, string ids, decimal currency via `services/money.ts::centsToKsh`/`kshToCents`). Methods still backed by mock data use in-module arrays and `simulateDelay()` — grep for `mock` in this file to see exactly what's real vs. not at any point in time, since this list changes as more of Phase 6 lands.

All current data types (`League`, `Member`, `UserProfile`, `AdminUser`, `AnalyticsData`, etc.) are defined in `frontend/types.ts`. Where a type now mirrors a real backend enum/shape, it uses the backend's own values (e.g. `UserRole = 'user'|'admin'|'super_admin'`, `UserStatus = 'active'|'suspended'`, `LeagueStatus = 'open'|'ongoing'|'completed'` — no more `'Moderator'`, `'Banned'`, or `'Payouts Approved'`, none of which exist on the backend). Nullable backend fields (`League.maxMembers`, `AdminLeague.maxParticipants`, `AdminLeague.creator`) are typed `| null` — always guard before formatting/dividing by them (see `components/LeagueCard.tsx` for the pattern).

## What's still mocked

These render from `fantasyApi.ts`'s in-memory mock data because the backend has no real endpoint for them yet (not a bug — see `README.md`'s roadmap section for the plan):
- Admin dashboard stats (`getAdminDashboardStats`)
- Admin transactions list (`getAdminTransactions`, `getFinancialSummary`) — the backend's `GET /admin/transactions` is a literal stub returning `[]`
- CMS: homepage content, announcements, help articles
- Analytics/Reports (user trends, retention cohorts, top leagues/players)
- Fraud alerts
- System settings (API keys, branding, backups)

When wiring any of these, check `README.md`'s "Known gaps" section first — several (fraud detection, backups) need a deliberately scoped-down MVP rather than the full mock shape, per prior product-judgment calls made when this was planned.

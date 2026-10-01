# Fantasy Fusion — Production Readiness & Public Launch Roadmap

This document is the single source of truth for what stands between the current codebase and a secure, legally compliant, publicly launched product handling real money. It was produced by a full audit of the backend (security + feature completeness) and frontend/infra as of **2026-08-23**. Re-read it before starting new work, and update it as phases close or new gaps are discovered.

**Update (see changelog below the snapshot):** several Phase 0/Phase 1 items are now fixed — migrations match models, CORS is configured, the admin payout call is correct, and the frontend is now a real client of the backend with real auth. The two items in the paragraph below are **still unfixed**.

**Read this first if you take nothing else away:** the app currently has an endpoint that lets any authenticated user drain another league's prize pool (`POST /payments/leagues/payout` — not the admin-panel payout flow, which is role-gated), and an unauthenticated endpoint that can trigger a real Stripe payout (`POST /stripe/withdraw`). Do not deploy this publicly, and do not connect real payment credentials to a shared environment, until these are fixed.

---

## 1. Snapshot

Fantasy Fusion is a FastAPI (async SQLAlchemy) backend paired with a React 19 + Vite frontend, intended to let users form fantasy-football leagues tied to real Fantasy Premier League (FPL) performance, contribute to a prize pool, and win cash payouts via M-Pesa or Stripe (Pesapal was removed — see changelog). Today:

- The **backend** has a working skeleton — auth, leagues, wallets, and provider-abstracted payments all exist as code and are reachable from a real frontend — but still contains the two money-moving security vulnerabilities called out above, and its core product logic (turning real FPL scores into league standings and a determined winner) does not exist yet.
- The **frontend** is wired to the real backend for auth, leagues, wallet/payments, and FPL stats, plus the admin Users/Leagues panels. Admin dashboard stats, transactions list, CMS, analytics, fraud alerts, and system settings still render mock data because the backend has no real endpoint for them yet (see `README.md`'s "Known gaps").
- There is **no CI/CD, no containerization, no deployment configuration, no linting, and no error/observability tooling** anywhere in the repository.
- The database migrations have been rebuilt to match the models — `wallets`, `transactions`, `league_pots`, and the admin tables (`settings`, `admin_content`, `audit_logs`, `league_payouts`) all now have migrations and exist in the dev database. Fresh-DB deploys from a clean `alembic upgrade head` have not been drilled end-to-end, so treat this as improved, not proven.

In short: this is now a working full-stack prototype on its core flows, not a product that is close to launch. The estimate below assumes a **solo developer working primarily through Claude Code**, phased mostly linearly.

### Changelog since this document was first written (2026-08-23)

A later session wired the frontend to the backend end-to-end and fixed several Phase 0/Phase 1 items in the process (see `README.md` for full current endpoint/architecture docs; this file has not been fully re-audited line by line, only the specific items below are confirmed):
- **Fixed**: migrations rebuilt to match models (admin tables + league columns added; `migrations/env.py` now imports all domain model modules so `autogenerate` sees everything).
- **Fixed**: CORS configured (`CORSMiddleware`, origins from `Settings.CORS_ORIGINS`).
- **Fixed**: `admin/leagues.py::trigger_payouts` now calls `PaymentsService.payout_winner` correctly (instance method, real kwargs) and uses the winner from the request body.
- **Fixed**: JWT `sub` claim is coerced to `int` before the user lookup (was a latent Postgres type-mismatch risk).
- **Fixed**: frontend is a real API client — real JWT auth (FPL-login only, no local password), real route guarding (`ProtectedRoute`), real league/wallet/FPL data. `.env.example` committed on both sides.
- **Found and fixed, not previously known**: the installed `fpl==0.6.35` package doesn't have `get_bootstrap_static()`/`get_entry()`/`get_entry_picks()` — every FPL data endpoint was silently broken (masked by tests mocking at the adapter level). Now uses `get_user()` and direct REST calls instead.
- **Removed**: Pesapal support (provider, routes including `routes/pesapal.py`, config) was dropped entirely rather than fixing the `"PAYPAL"`/`"PESAPAL"` key mismatch noted under "Feature Completeness Gaps" below — M-Pesa and Stripe are the only payment providers now.
- **Still open**: unauthorized league payout (#3), unauthenticated Stripe endpoints (#1–2), no refresh/token-type separation (#8), plaintext FPL session cookies (#9), no security headers/rate limiting beyond FPL-login/`TrustedHostMiddleware` (#11, CORS piece only is done), `is_locked` not enforced (#12), and everything in Phases 2–10 below.

---

## 2. Current State — Detailed Findings

### 2.1 Backend — Critical Security Vulnerabilities

1. **Unauthenticated Stripe withdrawal endpoint.** `backend/app/api/routes/stripe.py` `POST /stripe/withdraw` has no `Depends(get_current_user)` and no in-app wallet-balance check — it calls `stripe.Payout.create(...)` directly from client-supplied params. Anyone on the internet can trigger a payout to an arbitrary Stripe account.
2. **Unauthenticated Stripe PaymentIntent/Connect endpoints.** `stripe.py` `GET /create-payment-intent` and `POST /onboard-user` take a client-supplied `user_id` with no auth and no ownership check.
3. **Unauthorized league payout — any user can drain any league's pot.** `backend/app/api/routes/payments.py` `POST /payments/leagues/payout` only requires *being logged in* (not league ownership/admin), with a code comment literally reading `# authorize only league admin in real code; here we assume authorized`. `PaymentsService.payout_winner` (`backend/app/db/payments/service.py`) never verifies the "winner" is even a member of the league.
4. ~~**Admin payout endpoint is broken.**~~ **Fixed** — see changelog above.
5. **No webhook signature/origin verification for M-Pesa.** `routes/mpesa.py` (`/stk-callback`, `/b2c/result`, `/b2c/timeout`) accepts any POST body as truth — an attacker who guesses/observes a reference ID can fake a "payment succeeded" callback and get a wallet credited, or a withdrawal marked complete. Stripe's webhook (`stripe.Webhook.construct_event`) is the one correctly implemented case. (Pesapal's equivalent `/ipn` route no longer exists — Pesapal support was removed, see changelog.)
6. **Stripe webhook handlers are stubs.** `payment_intent.succeeded`, `payout.paid`, `account.updated` only `print()` — deposits made through this route never actually credit a wallet.
7. ~~**Migrations don't match models.**~~ **Fixed** — see changelog above. (The `hashed_password NOT NULL` claim turned out not to apply to the actual dev database, which had been bootstrapped via `create_all` rather than the migration chain — but the migration *files* still had this latent issue for anyone deploying fresh, and the new migrations don't carry it forward.)
8. **No refresh/access token separation.** `core/security.py`'s `create_access_token`/`create_refresh_token` both produce generically-shaped JWTs with no `type` claim; `deps.get_current_user` accepts either as a valid access token. There's also no refresh endpoint, no revocation/blacklist — a leaked refresh token is valid for its full lifetime with no way to invalidate it.
9. **FPL session cookies stored in plaintext** (`users.fpl_session_cookie`, `auth/models.py`). A DB leak yields live FPL account sessions for every linked user, with no encryption at rest.
10. **Other confirmed bugs:** `get_pesapal_token()` in `core/security.py` references a variable before assignment (`UnboundLocalError` on every call — Pesapal deposits are currently non-functional); `stripe_provider.py` compares `settings.STRIPE_CONNECT` (a `bool`) to the string `"true"`, which is always `False`, so Connect payouts always raise `NotImplementedError` regardless of config; `db/database.py` hardcodes `echo=True`, logging all SQL (including bound parameters — potentially PII/session cookies) to stdout unconditionally, including in production.
11. **No security headers, no general rate limiting, no `TrustedHostMiddleware`.** ~~No CORS policy~~ **CORS is now configured** (`CORSMiddleware`, origins from `Settings.CORS_ORIGINS`) — the rest of this item still stands. FPL login specifically has its own rate limiter (`core/rate_limit.py`); no other endpoint does.
12. **`is_locked` is entirely dead.** Settable via the admin API but never checked at login — a locked user can still authenticate and use the API freely.

### 2.2 Backend — Feature Completeness Gaps

- **League lifecycle is a stub.** Leagues can be created and joined via invite code, but: entry fees aren't enforced at join time, league `status` (`open`/`ongoing`/`completed`) is never checked when joining, nothing connects FPL gameweek scores to league standings, there is no winner-determination logic (the winner is a raw caller-supplied ID), and status transitions only happen via a manual admin "close" call — the "recalculate standings" admin endpoint is an explicit stub returning `{"ok": True}`.
- **FPL integration is read-only pass-through.** `GET /fpl/bootstrap|entry|my-team|my-picks` work and are tested, but nothing polls for live scores, nothing tracks gameweek deadlines, and nothing gates league actions around a deadline.
- **The auth system is partially dead code.** `POST /auth/register` and `POST /auth/login` (local email/password) are fully commented out, along with `crud.create_user` and the `hashed_password` column on `User`. The only live login path is `POST /auth/fpl-login`, which proxies real FPL credentials to FPL's own site per request. This is now the **deliberately kept** auth model (see `README.md`'s "Authentication model"), not a half-migration. ~~The existing pytest suite is currently broken~~ — `conftest.py`'s fixtures have since been rewritten around `/auth/fpl-login`; the full suite (26 tests as of this writing) passes cleanly with `pytest`.
- **No password reset / account recovery** of any kind — structurally consistent with there being no local password to reset.
- **No notifications.** Zero email/SMS/push send capability anywhere in the codebase (`email_validator` is present but is a Pydantic validator, not a sender).
- **KYC field exists but is unused.** `User.kyc_level` is stored and displayed to admins but never checked before a withdrawal or payout.
- **No background jobs/scheduling of any kind** (no Celery, no APScheduler, no cron) — everything is request-driven; nothing can run on a timer (score sync, stale-transaction expiry, status transitions).
- **Payments have two divergent Stripe integrations** — the `PaymentsService`-backed one (ledger-aware) and the ad-hoc direct one in `routes/stripe.py` (bypasses the wallet ledger entirely, and is unauthenticated — see item #1/#2 above). ~~Pesapal provider-key mismatch~~ **Resolved by removal**: Pesapal support (provider, routes, config, migration) was dropped from the codebase entirely rather than fixed — M-Pesa and Stripe are the only payment providers now.
- **Admin panel is a mix of real and stub.** Users and Settings modules are real, DB-backed. Content (CMS), Transactions (list + withdrawal approval), and System (health check, audit log) are pure stubs returning hardcoded empty/fixed responses, despite backing models (`AdminContent`, `AuditLog`) existing in the schema.

### 2.3 Frontend Gaps

- ~~**100% mock data, zero backend calls.**~~ **Partially fixed** — `frontend/services/fantasyApi.ts` now routes auth, leagues, wallet/payments, FPL stats, and admin Users/Leagues through real backend calls (see `services/http.ts`). Admin dashboard stats, transactions list, CMS, analytics, fraud alerts, and system settings still use the original hardcoded mock arrays — see `README.md`'s "Known gaps" for the full current list.
- ~~**Auth is entirely cosmetic.**~~ **Fixed** — `Login.tsx` calls real `POST /auth/fpl-login`; `AuthContext` holds real JWT state; `ProtectedRoute` enforces auth + role at the route level (including `/admin/*`). `Signup.tsx` was removed (the backend has no separate signup — login auto-registers).
- **No state-management library** (no Redux/Zustand/React Query) — local `useState`/prop drilling only. Still true.
- ~~**No environment configuration.**~~ **Fixed** — `.env.example` committed on both sides (`VITE_API_BASE_URL` on the frontend). The frontend's own `README.md` is still unedited AI-Studio boilerplate, though — low priority, but worth replacing or deleting since the repo root `README.md` is now the real one.
- **Tailwind is loaded via CDN `<script>` tag**, not a build-time integration — explicitly unsupported for production by Tailwind's own documentation (no purging, larger payload, no version pinning).
- **No tests of any kind** on the frontend (no Vitest/Jest/Playwright/Cypress config, no `*.test.tsx` files).
- **Minor dead ends:** `Fixtures.tsx` is a 0-byte file not referenced by any route; `GameDataManagement.tsx` is a literal "Coming Soon" placeholder; `Modal.tsx` lacks basic dialog accessibility (no `role="dialog"`, no focus trap, no Escape-to-close).

### 2.4 Infrastructure Gaps

No Dockerfile, no docker-compose, no CI config of any kind (GitHub Actions/GitLab CI/CircleCI), no PaaS config (Procfile/vercel.json/render.yaml/fly.toml), no linting/formatting config on either side (no ESLint/Prettier, no ruff/black/mypy), and no error-tracking or observability tooling (no Sentry, no structured logging outside two files) anywhere in the repository.

---

## 3. Non-Negotiable Principles Going Forward

These apply to every phase below, not just Phase 0:

1. **No endpoint that moves money, changes a balance, or exposes PII may be reachable without authentication + authorization matched to the action** (not just "logged in," but "allowed to do *this specific thing*").
2. **Every inbound webhook/callback (M-Pesa, Pesapal, Stripe, any future provider) must verify a signature or shared secret** before acting on its payload. No provider is exempt.
3. **Every financial state change must be recorded in an immutable audit trail**, not just the mutable `Transaction`/`Wallet` rows.
4. **No real payout is issued without the recipient's `kyc_level` clearing a defined threshold**, once KYC is implemented (Phase 3/6).
5. **Sensitive data at rest is encrypted** — FPL session cookies at minimum; evaluate phone numbers and other PII during Phase 6.
6. **Nothing ships to production without a green CI run** (tests + lint) once Phase 1 stands up CI.

---

## 4. Phased Roadmap

Each phase lists **Goals**, **Key Tasks**, and **Exit Criteria**. Phases are mostly sequential — later phases assume earlier ones are done, since this is sized for one developer. Don't start feature work (Phase 2+) on top of Phase 0's open vulnerabilities.

### Phase 0 — Emergency Security Triage
*Timeframe: days, not weeks. Do this before anything else, including reading further into this roadmap for feature work.*

**Goals:** Make it impossible for an unauthenticated or unauthorized actor to move money or leak secrets, even in a dev/staging environment with real provider credentials.

**Key tasks:**
- Add `Depends(get_current_user)` (+ ownership checks) to `stripe.py`'s `/create-payment-intent`, `/onboard-user`, `/withdraw`.
- Fix `/payments/leagues/payout` to require the requester be the league's creator or a platform admin, and verify the winner is an actual league member.
- Fix `admin/leagues.py::trigger_payouts` to call `PaymentsService.payout_winner` correctly (instance method, real keyword args) and use the winner from the request, not the calling admin.
- Add HMAC/shared-secret (or IP-allowlist, per provider docs) verification to the M-Pesa and Pesapal callback/IPN routes.
- Add a `type` claim (`"access"` vs `"refresh"`) to JWTs in `core/security.py`, and reject refresh-typed tokens in `get_current_user`.
- Encrypt `fpl_session_cookie` at rest (e.g., Fernet with a key sourced from settings/secrets manager) — this alone is a meaningful scope increase, but it's the difference between a DB leak being "bad" and "catastrophic for every linked user's real FPL account."
- Fix `get_pesapal_token()`'s `UnboundLocalError` and the `STRIPE_CONNECT` string/bool comparison bug.
- Gate `echo=True` in `db/database.py` behind an explicit debug/env flag, off by default.

**Exit criteria:** No endpoint can move money or read/write another user's data without both authentication and the correct authorization check. All three webhook/callback routes verify their caller. Tokens can't be type-confused. FPL cookies aren't plaintext in the DB.

---

### Phase 1 — Foundation Rebuild

**Goals:** A codebase that can be deployed from scratch, tested automatically, and iterated on safely.

**Key tasks:**
- ~~Rebuild/extend Alembic migrations~~ **Done** — see changelog in section 1. Not yet drilled: a true fresh-DB `alembic upgrade head` deploy (the dev DB was bootstrapped via `create_all` before the migration chain was repaired, so this path is improved but unproven).
- **Auth model decision: made.** FPL-login-only was kept as primary (`conftest.py` fixtures already rewritten around it, dead `/auth/register`/`/auth/login` code still present but inert). This does mean Phase 6's KYC/age-verification/account-recovery work will need to be designed around "account only exists via a live/historical FPL login," not an independent local account — factor that into Phase 6 planning rather than assuming local auth will exist by then.
- Add a refresh endpoint with rotation and server-side revocation (even a simple revoked-token table is enough at this scale).
- Enforce `is_locked` at login.
- Add rate limiting (`slowapi`) on auth and payment-initiating endpoints, `CORSMiddleware` scoped to the actual frontend origin(s), basic security headers, and `TrustedHostMiddleware`.
- Write `.env.example` for both `backend/` and `frontend/` documenting every required variable.
- Replace `print()` calls in payment/webhook code with structured logging; add Sentry (or equivalent) to the backend.
- Add `ruff`/`black` for the backend and `eslint`/`prettier` for the frontend.
- Fix the test suite so `pytest` is green end-to-end under the decided auth model; add the missing `make_user` fixture or remove/rewrite the test that needs it.
- Stand up CI (GitHub Actions): lint + test on every PR for both backend and frontend.

**Exit criteria:** Fresh clone → `alembic upgrade head` → app boots → `pytest` passes → CI is green on a PR.

---

### Phase 2 — Core Product: FPL Scoring Engine & League Lifecycle

**Goals:** Leagues actually function as a fantasy-football competition, not just a group-membership + wallet system.

**Key tasks:**
- Build a standings pipeline that ties each member's `fpl_manager_id` to their real gameweek points (via `services/fpl_adapter.py` + FPL's entry-history endpoints), and a model to store computed standings per league per gameweek.
- Add a scheduled job (APScheduler to start — no need for Celery/Redis at this scale yet) that refreshes standings periodically during live gameweeks.
- Add gameweek-deadline awareness: read `deadline_time` from FPL's bootstrap-static `events`, and lock league joins/leaves/contributions once the current gameweek's deadline passes.
- Replace caller-supplied `winner_user_id` with real winner determination computed from standings at league completion.
- Automate `open → ongoing → completed` status transitions off real triggers (first deadline passed / season-end or admin-defined end date) instead of only a manual admin "close" call.
- Enforce `entry_fee_cents` payment at join time (call the existing `contribute_to_league` flow automatically, or block join until paid) rather than leaving it as a disconnected manual step.

**Exit criteria:** A league can be created, joined, played through at least one real gameweek, and resolved to a winner automatically from real FPL data, end to end, without manual intervention.

---

### Phase 3 — Payments Hardening & Completion

**Goals:** Every dollar moved through the platform is authorized, reconciled, and auditable.

**Key tasks:**
- Consolidate the two divergent Stripe integrations into the single `PaymentsService`-backed, ledger-aware path; remove or refactor the ad-hoc direct-Stripe routes in `routes/stripe.py`.
- Wire real webhook handlers for all three providers to `on_deposit_succeeded`/`on_withdraw_succeeded`/their failure equivalents, consistently.
- Fix the `"PAYPAL"` vs `"PESAPAL"` provider-key mismatch across schema/service/tests; implement Pesapal payouts or explicitly disable them in the API/UI until they are.
- Add KYC gating on withdrawals (`kyc_level` threshold) and basic withdrawal velocity/amount limits as an AML control.
- Implement real `AuditLog` writes for every admin financial action and user withdrawal/payout.
- Add a reconciliation job/report comparing transaction sums against wallet + pot balances, alerting on drift.
- Add a concurrency test exercising `adjust_wallet_balance` under simultaneous requests (the `SELECT ... FOR UPDATE` locking exists but is currently unverified by any test).

**Exit criteria:** All deposit/withdraw/contribute/payout flows go through one ledger-backed path per provider; every provider's webhook is signature-verified and actually updates the DB; a reconciliation report can be run and shows zero drift; a concurrency test passes.

---

### Phase 4 — Frontend Rebuild: Real Backend Integration

**Status: mostly done for the core flows** (auth, leagues, wallet/payments, FPL stats, admin Users/Leagues) — see `README.md`'s "Known gaps" for exactly what's still mock. The remaining key tasks below are either not started or were deliberately deferred.

**Goals:** The UI that already exists becomes a real client of the real API, not a demo.

**Key tasks:**
- ~~Replace `frontend/services/fantasyApi.ts` page-by-page with a real API client reading `VITE_API_BASE_URL` from env.~~ **Done** for the flows listed above; remaining mock-backed methods are tracked in `README.md`.
- ~~Implement real auth~~ **Done, with one deliberate deviation**: tokens are stored in `localStorage`, not an httpOnly cookie + in-memory token as recommended here — the backend issues bearer tokens rather than setting cookies, so the httpOnly approach would need a backend redesign too. `AuthContext`/`useAuth`/`ProtectedRoute` all exist and `/admin/*` rejects non-admins server-side via `require_role`, not just UI hiding. Revisit the storage tradeoff if XSS exposure becomes a real concern before other hardening lands.
- Adopt a data-fetching layer (React Query or similar) instead of manual `useState`/`useEffect` per page. Still not done — not blocking, but worth it once more pages are real and cache invalidation/refetching logic starts duplicating across them.
- Move Tailwind off the CDN `<script>` to a proper build-time config (`tailwind.config.js` + PostCSS via Vite) — required before any production deploy.
- Resolve the dead ends: fill in or remove `Fixtures.tsx`, implement or clearly gate `GameDataManagement.tsx`.
- Fix `Modal.tsx` accessibility: `role="dialog"`, `aria-modal`, focus trap, Escape-to-close.
- Add Vitest + React Testing Library for components, and Playwright for at least the core flow (sign up → link FPL → join league → deposit → contribute → view standings).
- Add ESLint/Prettier config and wire into CI from Phase 1.

**Exit criteria:** Every page reads/writes through the real backend API; login/logout/admin-gating are enforced server-side; a full core-flow e2e test passes in CI; production build no longer depends on a CDN script for styling.

---

### Phase 5 — Admin Panel Completion

**Status:** Users and Leagues admin pages are real and DB-backed (including a real payout flow with winner selection, replacing the old caller-supplied-winner approach). Everything in **Key tasks** below is still accurate and unstarted.

**Goals:** Admins can actually operate the platform without touching the database by hand.

**Key tasks:**
- Wire `admin/content.py` (CMS) to the existing `AdminContent` model; connect the frontend's `HomepageContentEditor`/`AnnouncementsManager`/`HelpCenterManager` to it.
- Wire `admin/transactions.py` (list + withdrawal approval) to the real `Transaction` model — this is the operational control for manual withdrawal review.
- Wire `admin/system.py`'s `/health` to real checks (DB connectivity, FPL upstream reachability, background-job heartbeat from Phase 2) and `/audit-logs` to the real `AuditLog` table populated in Phase 3.
- Implement the league "recalculate" endpoint for real — trigger Phase 2's standings sync on demand.
- Decide analytics/reports scope for v1: recommend deferring deep analytics (retention cohorts, DAU/WAU trends) post-launch, but wire top-line real numbers (user count, active leagues, total pot volume) since they're cheap and build trust with early users/admins.

**Exit criteria:** No admin page renders hardcoded/mock data; withdrawal approvals and content edits persist to the DB and are reflected for end users.

---

### Phase 6 — Legal, Compliance & Responsible Gambling

**Goals:** The platform can legally accept real money from the public in its target market(s).

**Key tasks:**
- Engage actual legal counsel on gambling / paid-entry fantasy-sports licensing requirements for each target jurisdiction. This is a real gap, not a checkbox — flag Kenya-specific exposure given the existing M-Pesa/Pesapal integration, and note that US/EU targeting multiplies this work significantly (fantasy-sports law varies by US state; EU gambling law varies by country). **This document does not substitute for that counsel.**
- Get the already-scaffolded `TermsOfService.tsx`/`PrivacyPolicy.tsx`/`ResponsibleGaming.tsx` pages properly drafted/reviewed by counsel rather than left as placeholder copy.
- Add age verification at signup appropriate to jurisdiction.
- Enforce KYC before payout (ties directly to Phase 3's `kyc_level` gating — build the actual submission/verification/admin-review flow, since the field currently exists but nothing populates or checks it meaningfully).
- Build real backend-enforced responsible-gambling controls (deposit limits, self-exclusion, cool-off periods) behind the currently-static `ResponsibleGaming.tsx` page.
- Add AML monitoring thresholds appropriate to transaction volume/jurisdiction.
- Address data-protection obligations (GDPR or local equivalent) for PII, FPL session cookies, and financial data — retention policy, right-to-erasure handling.
- Clarify tax/reporting obligations on winnings and the platform's house cut.

**Exit criteria:** Legal sign-off obtained for the initial target jurisdiction; KYC and age verification are enforced in the product, not just modeled; responsible-gambling controls are live and enforced server-side, not just documented on a static page.

---

### Phase 7 — Production Infrastructure & Observability

**Goals:** The app can be deployed, monitored, and recovered like a real production service.

**Key tasks:**
- Dockerfiles for backend and frontend; docker-compose for local dev (backend + Postgres + job runner).
- Choose hosting sized to solo-dev scale (a managed-Postgres + container PaaS — e.g. Fly.io/Render/similar — rather than standing up Kubernetes).
- CI/CD with distinct staging and production environments and deploy-on-merge.
- Real secrets management (platform secret store), replacing the `.env.example` from Phase 1 with actual deploy-time secrets.
- Sentry (or equivalent) on both backend and frontend; log aggregation.
- Uptime/health monitoring wired to the now-real `/admin/health`, with alerting.
- Automated database backups with a **tested** restore procedure (untested backups are not backups).
- App-layer rate limiting extended to all public endpoints, not just auth.
- Environment-split settings (dev/staging/prod) so debug behavior (SQL echo, verbose errors) can never leak into production by default.

**Exit criteria:** A one-command (or one-pipeline) deploy from a clean checkout to staging and to production; an alert fires within minutes of a simulated outage; a backup has been restored successfully at least once as a drill.

---

### Phase 8 — Testing, QA & Security Review

**Goals:** Confidence that the system behaves correctly under real conditions before real money is at stake publicly.

**Key tasks:**
- Expand backend coverage: webhook handlers exercised through real signature verification (not just calling the internal service methods directly, as current tests do), admin content/transactions/system routes, league lifecycle and payout authorization, the wallet-adjustment concurrency test from Phase 3.
- Frontend coverage from Phase 4 (component + e2e) fully wired into CI.
- Run this repo's `/code-review` and `/security-review` skills across the accumulated diff, and use the `ultrareview` cloud multi-agent review as a final pre-launch pass.
- Commission or perform a focused penetration test specifically on the auth and payments subsystems before opening real public money flows.
- Load-test around simulated gameweek-deadline traffic spikes (many users contributing/joining right before a deadline lock).

**Exit criteria:** CI is green across backend + frontend; a security review (internal or external) has been performed on auth/payments specifically and its findings resolved; load tests pass at the expected launch scale.

---

### Phase 9 — Beta / Soft Launch

**Goals:** Validate the whole system with real users and real (but capped) money before removing safety limits.

**Key tasks:**
- Launch to a small closed group with low deposit/withdrawal caps.
- Monitor error tracking, the Phase 3 reconciliation report, and a support channel closely during at least one full live gameweek cycle.
- Fix bugs/UX issues found; do not skip this phase even under time pressure — it is the cheapest place to catch what testing missed.
- Require explicit compliance sign-off (Phase 6) before lifting any caps.

**Exit criteria:** At least one full league cycle (join → contribute → play through gameweeks → payout) completed successfully with real users and no reconciliation drift or security incidents.

---

### Phase 10 — Public Launch & Post-Launch Operations

**Goals:** Sustainable, monitored operation after caps are lifted.

**Key tasks:**
- Lift beta caps once Phase 9 has built confidence.
- Establish an on-call/incident-response process specifically for payment issues (who gets paged, what the runbook is for "reconciliation shows drift" or "a provider webhook is failing").
- Establish an ongoing iteration cadence for the deferred items (deeper analytics, notifications polish, mobile app if desired).

**Exit criteria:** The platform is live to the public with no deposit/withdrawal caps, monitored 24/7 by alerting rather than by someone watching a dashboard, with a documented incident-response process.

---

## 5. Risk Register

| Risk | Why it matters | Primary mitigation |
|---|---|---|
| Operating without required gambling/fantasy-sports licensing | Regulatory shutdown, fines, personal liability | Phase 6 — legal engagement before public real-money launch |
| Payment authorization bugs (current state: several) | Direct, immediate financial loss | Phase 0 (stop the bleeding) + Phase 3 (systematic hardening) |
| FPL session cookie leakage | Account takeover of every linked user's real FPL account | Phase 0 (encrypt at rest) |
| Shared `aiohttp.ClientSession` used for per-user FPL cookie injection in `fpl_adapter.py` | Under concurrent requests, one user's session cookie can leak into another user's request — an architecture-level race condition, not just a bug | Needs a dedicated fix in Phase 2/7: move to a request-scoped session or cookie jar instead of a single app-lifetime singleton |
| No reconciliation between transactions and balances | Fraud or bugs causing fund drift go undetected indefinitely | Phase 3 — reconciliation job/report |
| Untested backups | A real incident reveals backups don't actually restore | Phase 7 — require a restore drill, not just a backup schedule |

---

## 6. Launch Checklist ("Definition of Done")

Do not remove beta caps / open to the public until every item below is true:

- [ ] No unauthenticated endpoint can move money or expose PII
- [ ] Every webhook/callback endpoint verifies a signature or shared secret
- [ ] Migrations match models; a fresh-DB deploy succeeds end to end
- [ ] Full test suite (backend + frontend) is green in CI
- [ ] Legal sign-off obtained for the target launch jurisdiction(s)
- [ ] KYC and age verification are enforced before withdrawal, not just modeled
- [ ] Real standings/winner-determination engine has been proven through at least one full live gameweek cycle
- [ ] Monitoring, alerting, and a tested backup/restore are live in production
- [ ] Frontend is fully wired to the backend — no mock data paths remain reachable
- [ ] Responsible-gambling controls (limits, self-exclusion, cool-off) are live and server-enforced

---

*Originally written 2026-08-23; changelog and inline strikethroughs added 2026-10-01 to reflect the frontend-backend wiring work (see section 1's changelog). Not a full re-audit — items without a strikethrough or changelog mention should still be assumed accurate as originally written. Update this document as phases complete or new findings emerge — it should always reflect the current true state, not the state at time of writing. `README.md` is now the source of truth for current architecture, endpoints, and setup; this file stays focused on what's left and why it matters.*

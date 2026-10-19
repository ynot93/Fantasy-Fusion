# Database guide

How the Fantasy Fusion database is set up for local development, how to get into it, and the commands you'll use day to day.

## At a glance

| | |
|---|---|
| Engine | PostgreSQL 18, installed natively in WSL (Ubuntu), cluster `18/main` |
| Address | `localhost:5432`, listening on 127.0.0.1 only |
| Database | `fantasy_football_db` |
| Role the app uses | `postgres` (a superuser; see [Hardening](#hardening)) |
| Service | systemd unit `postgresql`, enabled, so it starts with WSL |
| Data directory | `/var/lib/postgresql/18/main` |
| Server log | `/var/log/postgresql/postgresql-18-main.log` |
| Schema management | Alembic, in `backend/migrations/` |
| Tests | Don't touch Postgres. They use in-memory SQLite (`backend/app/tests/conftest.py`). |

## How the app finds the database

The backend reads two URLs from `backend/.env`. Copy `backend/.env.example` and fill them in. Never commit `.env`.

```ini
# Runtime (FastAPI, async driver)
DATABASE_URL=postgresql+asyncpg://<user>:<password>@localhost:5432/fantasy_football_db
# Alembic migrations (sync driver)
SYNC_DATABASE_URL=postgresql://<user>:<password>@localhost:5432/fantasy_football_db
```

Both must point at the same database. Alembic reads `SYNC_DATABASE_URL` through `app.core.config.settings` (see `migrations/env.py`), not the URL in `alembic.ini`. To point a single Alembic command at another database, override it in the environment:

```bash
SYNC_DATABASE_URL=postgresql://<user>:<password>@localhost:5432/other_db alembic upgrade head
```

## Starting and stopping Postgres

Postgres runs as a system service inside WSL:

```bash
sudo systemctl status postgresql     # is it running?
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
pg_lsclusters                        # version, port, status, data dir of each cluster
sudo tail -f /var/log/postgresql/postgresql-18-main.log
```

If WSL itself is shut down (`wsl --shutdown` from Windows), Postgres stops with it and starts again the next time WSL boots.

## Connecting

**psql as the app's user** (asks for the password from `.env`):

```bash
psql "postgresql://postgres@localhost:5432/fantasy_football_db"
```

**psql as the OS-level postgres user** (no password; uses Ubuntu's default peer auth):

```bash
sudo -u postgres psql -d fantasy_football_db
```

To avoid typing the password each time, create `~/.pgpass` with `localhost:5432:fantasy_football_db:postgres:<password>` and run `chmod 600 ~/.pgpass`.

**From Windows (DBeaver, pgAdmin, TablePlus, VS Code extensions):** connect to host `localhost`, port `5432`, database `fantasy_football_db`, user `postgres`. WSL2 forwards `localhost` from Windows into WSL by default, so no extra networking setup is needed.

### psql commands you'll actually use

```text
\dt                      list tables
\d users                 columns, indexes and constraints of a table
\dT+                     list enum types and their values
\x                       toggle expanded output (one column per line)
\timing                  show how long each query takes
\q                       quit
```

## What's in the schema

All tables are defined by the SQLAlchemy models under `backend/app/db/<domain>/models.py` and created by migrations.

| Table | Purpose |
|---|---|
| `users` | Accounts. `email` (unique, stored lowercase), bcrypt `hashed_password`, `role`, `status`, plus the linked FPL team: `fpl_manager_id` (unique, null until linked), `fpl_verified`, `fpl_verified_at`. |
| `leagues` | Fantasy leagues. Unique `code` (invite code), `entry_fee_cents`, `is_private`, `max_members`, `status`, `prize_scheme` (JSON). |
| `league_members` | Many-to-many join between users and leagues. Rows are deleted along with their user or league (`ON DELETE CASCADE`). |
| `wallets` | One per user; `balance_cents`. |
| `transactions` | Wallet ledger: deposits, withdrawals, contributions, payouts, house fees, admin adjustments. Unique on `idempotency_key` and on `(provider, provider_ref)`. |
| `league_pots` | Each league's prize pot and house cut, in cents. |
| `league_payouts` | Record of payouts made to league winners. |
| `settings` | Admin key/value settings (JSON values). |
| `admin_content` | CMS content (`slug` unique). |
| `audit_logs` | Admin action log. |
| `alembic_version` | Alembic's bookkeeping: the single revision the database is at. |

Enum types: `role` (`user`, `admin`, `super_admin`), `userstatus` (`active`, `suspended`), `leaguestatus` (`open`, `ongoing`, `completed`), `txtype`, `txstatus`, `provider` (`MPESA`, `STRIPE`).

**All money is stored in minor units (cents) as integers.** `ADJUSTMENT` transactions carry their own sign. Every other transaction type stores a positive amount, and the type gives the direction.

## Migrations (Alembic)

Run these from `backend/` with the virtualenv active (`source venv/bin/activate`), or call `venv/bin/alembic` directly.

```bash
alembic current                                   # which revision the DB is at
alembic history                                   # list all revisions
alembic upgrade head                              # apply pending migrations
alembic downgrade -1                              # roll back one revision
alembic revision --autogenerate -m "describe it"  # generate a migration from model changes
alembic check                                     # exits non-zero if models and DB have drifted
```

History starts from a single baseline revision, `34626e6c8489`, which creates the whole schema. `alembic upgrade head` on an empty database therefore gives you a complete, working schema.

**Workflow for a schema change:**
1. Edit the model(s).
2. Run `alembic revision --autogenerate -m "..."`.
3. **Read the generated file.** Autogenerate misses server defaults and enum value changes. For Postgres enums, `downgrade()` must also drop any enum type it no longer needs, because dropping a table leaves its enums behind (see the baseline for the pattern).
4. Run `alembic upgrade head`, then `alembic check`. The check should report no changes.
5. Commit the migration together with the model change.

**Never change a real database's schema any other way.** That means no `Base.metadata.create_all()` against Postgres and no hand-run `ALTER TABLE`. That's how the previous migration chain drifted until it could no longer build a database from scratch, which is why it was squashed.

**Databases created before the baseline:** a database at the old head (`edd0db22bd32`) already matches the baseline. Mark it as such instead of upgrading it:

```bash
alembic stamp --purge 34626e6c8489
alembic check        # should print "No new upgrade operations detected."
```

## Common tasks

**Make a user an admin.** Roles are never self-assignable:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'you@example.com';
```

The user must log out and back in, because the role is baked into their JWT.

**Mark a user's FPL team as verified by hand** (dev only; normally `POST /fpl/verify` does this):

```sql
UPDATE users SET fpl_verified = true, fpl_verified_at = now() WHERE email = 'you@example.com';
```

**Look around:**

```sql
SELECT id, email, role, fpl_manager_id, fpl_verified FROM users ORDER BY id;
SELECT l.name, l.code, l.entry_fee_cents, count(m.user_id) AS members
  FROM leagues l LEFT JOIN league_members m ON m.league_id = l.id GROUP BY l.id;
SELECT type, status, amount_cents, created_at FROM transactions ORDER BY id DESC LIMIT 20;
```

**Back up and restore:**

```bash
pg_dump -Fc -h localhost -U postgres fantasy_football_db > ff_$(date +%F).dump
pg_restore -h localhost -U postgres -d fantasy_football_db --clean --if-exists ff_2026-10-19.dump
```

**Wipe and rebuild the dev database.** This destroys all data:

```bash
sudo -u postgres psql -c "DROP DATABASE fantasy_football_db WITH (FORCE);"
sudo -u postgres psql -c "CREATE DATABASE fantasy_football_db;"
cd backend && alembic upgrade head
```

## Running and stopping the backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload            # http://127.0.0.1:8000, reloads on code changes
```

Stop it with **Ctrl+C** in the terminal where it's running. If it was started in the background, or that terminal is gone, find it and stop it:

```bash
pgrep -af "uvicorn app.main:app"         # show running instances and their PIDs
pkill -f "uvicorn app.main:app"          # stop them (sends SIGTERM, a clean shutdown)
ss -ltnp | grep :8000                    # confirm nothing is still on port 8000
```

Without `--reload`, a running server keeps serving the code it started with. Restart it after pulling changes or running migrations.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `connection refused` on 5432 | Postgres isn't running. Run `sudo systemctl start postgresql`. |
| `password authentication failed` | The password in `.env` doesn't match the role's. Reset it with `sudo -u postgres psql -c "ALTER ROLE postgres PASSWORD '...';"` and update both URLs. |
| `relation "..." does not exist` | Migrations weren't applied to this database. Run `alembic current`, then `alembic upgrade head`. |
| `type "..." already exists` while upgrading | An earlier downgrade didn't drop an enum. Drop it manually (`DROP TYPE ...;`) and fix that migration's `downgrade()`. |
| `alembic check` reports changes you didn't make | The schema was changed outside Alembic, or a model changed without a migration. Generate a migration, or revert the stray change. |
| Pydantic `Field required` errors when running Alembic or scripts | `.env` is resolved relative to the working directory. Run from `backend/`. |

## Hardening

Both URLs currently connect as `postgres`, a superuser. That's acceptable on a laptop where Postgres listens only on 127.0.0.1, but before any shared or deployed environment, give the app its own least-privileged role:

```sql
CREATE ROLE fantasy_app LOGIN PASSWORD '...';
CREATE DATABASE fantasy_football_db OWNER fantasy_app;
```

Then put `fantasy_app` in both URLs and run `alembic upgrade head`, so the role creates and owns every table. This is simplest on a fresh database. On an existing one, `ALTER DATABASE ... OWNER` alone isn't enough, because the tables stay owned by `postgres`. You'd also need `ALTER TABLE <t> OWNER TO fantasy_app;` (and `ALTER TYPE` for the enums) for each object.

For production, use a separate migration role (DDL rights) and a runtime role (data rights only).

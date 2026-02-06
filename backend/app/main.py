from fastapi import FastAPI
from app.api.routes import auth, leagues, payments, mpesa, stripe, pesapal, fpl
from app.api.routes.admin import users as admin_users, leagues as admin_leagues, transactions as admin_tx, content as admin_content, settings as admin_settings, system as admin_system
from contextlib import asynccontextmanager
from app.db.database import Base, engine
from app.services.fpl_adapter import FPLAdapter
import app.api.deps_fpl as deps_fpl_module
import aiohttp

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    session = aiohttp.ClientSession()
    adapter = FPLAdapter(session)
    deps_fpl_module._fpl_adapter = adapter   # wire into dependency module
    # optionally warm cache or do one-time tasks
    try:
        await adapter.bootstrap_static(ttl=600)
    except Exception:
        # don't crash entire app if FPL is momentarily unreachable
        pass
    yield
    # shutdown
    try:
        await adapter._session.close()
    except Exception:
        pass
    deps_fpl_module._fpl_adapter = None

app = FastAPI(title="Fantasy Fusion", lifespan=lifespan)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(leagues.router, prefix="/leagues", tags=["leagues"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(mpesa.router, prefix="/mpesa", tags=["mpesa"])
app.include_router(stripe.router, prefix="/stripe", tags=["stripe"])
app.include_router(pesapal.router, prefix="/pesapal", tags=["pesapal"])
app.include_router(fpl.router, prefix="/fpl", tags=["fpl Fantasy Premier League Data"])
app.include_router(admin_users.router)
app.include_router(admin_leagues.router)
app.include_router(admin_tx.router)
app.include_router(admin_content.router)
app.include_router(admin_settings.router)
app.include_router(admin_system.router)

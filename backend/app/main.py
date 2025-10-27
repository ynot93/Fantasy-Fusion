from fastapi import FastAPI
from app.api.routes import auth, leagues, payments, mpesa, stripe
from app.api.routes.admin import users as admin_users, leagues as admin_leagues, transactions as admin_tx, content as admin_content, settings as admin_settings, system as admin_system
from contextlib import asynccontextmanager
from app.db.database import Base, engine

app = FastAPI(title="Fantasy Fusion")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(leagues.router, prefix="/leagues", tags=["leagues"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(mpesa.router, prefix="/mpesa", tags=["mpesa"])
app.include_router(stripe.router, prefix="/stripe", tags=["stripe"])
app.include_router(admin_users.router)
app.include_router(admin_leagues.router)
app.include_router(admin_tx.router)
app.include_router(admin_content.router)
app.include_router(admin_settings.router)
app.include_router(admin_system.router)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
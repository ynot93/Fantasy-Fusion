from fastapi import FastAPI
from app.api.routes import auth, leagues, payments, mpesa, stripe
from contextlib import asynccontextmanager
from app.db.database import Base, engine

app = FastAPI(title="Fantasy Fusion")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(leagues.router, prefix="/leagues", tags=["leagues"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(mpesa.router, prefix="/mpesa", tags=["mpesa"])
app.include_router(stripe.router, prefix="/stripe", tags=["stripe"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
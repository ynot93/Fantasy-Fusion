from fastapi import FastAPI
from app.api.routes import auth
from app.db.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fantasy Fusion")

app.include_router(auth.router, prefix="/auth", tags=["auth"])

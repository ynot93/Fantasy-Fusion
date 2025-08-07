from fastapi import FastAPI
from app.database import Base, engine
from app.routes import users

# Import models to create tables
from backend.app.models.models import User

# Initialize the database
Base.metadata.create_all(bind=engine)

# Initialize the FastAPI app
app = FastAPI()

# Include routes
app.include_router(users.router, prefix="/api/v1")

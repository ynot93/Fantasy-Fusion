from sqlalchemy.orm import Session
from app import models, schemas

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = user.password + "notreallyhashed"  # Will implement hashing later
    db_user = models.User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_users(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.User).offset(skip).limit(limit).all()

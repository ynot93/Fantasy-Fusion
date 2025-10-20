from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.leagues.models import league_members
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    leagues_created = relationship("League", back_populates="created_by")
    leagues_joined = relationship("League", secondary=league_members, back_populates="members")
    wallet = relationship('Wallet', back_populates="user", uselist=False)

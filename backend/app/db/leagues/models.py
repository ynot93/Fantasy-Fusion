from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.database import Base

# Association table for many-to-many relationship between User and League
league_members = Table(
    "league_members",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("league_id", Integer, ForeignKey("leagues.id", ondelete="CASCADE"), primary_key=True)
)

class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=False, unique=True)  # invite code
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    created_by = relationship("User", back_populates="leagues_created")
    members = relationship("User", secondary=league_members, lazy="selectin", back_populates="leagues_joined")

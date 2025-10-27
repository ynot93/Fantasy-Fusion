# app/db/admin/enums.py
from __future__ import annotations
import enum

class Role(str, enum.Enum):
    user = "user"
    admin = "admin"
    super_admin = "super_admin"

class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"

class LeagueStatus(str, enum.Enum):
    open = "open"
    ongoing = "ongoing"
    completed = "completed"

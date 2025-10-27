# app/api/routes/admin/users.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db
from app.core.rbac import require_role
from app.db.admin.enums import Role, UserStatus
from app.db.auth.models import User
from app.db.admin.schemas import (
    AdminUserBase, AdminUserDetail, AdminUserUpdate,
    AdminChangeRole, AdminAdjustBalance
)
from app.db.payments.crud import adjust_wallet_balance

router = APIRouter(prefix="/admin/users", tags=["admin:users"])

@router.get("", response_model=list[AdminUserBase])
async def list_users(
    q: str | None = Query(default=None),
    role: Role | None = Query(default=None),
    status: UserStatus | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    stmt = select(User)
    if role: stmt = stmt.where(User.role == role)
    if status: stmt = stmt.where(User.status == status)
    if q: stmt = stmt.where(User.email.ilike(f"%{q}%"))
    rows = (await db.execute(stmt)).scalars().all()
    return rows

@router.get("/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    u = await db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    return u

@router.patch("/{user_id}", response_model=AdminUserDetail)
async def update_user(
    user_id: int, payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    u = await db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    await db.commit(); await db.refresh(u)
    return u

@router.patch("/{user_id}/role")
async def change_role(
    user_id: int, payload: AdminChangeRole,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.super_admin))  # 🔒 super_admin only
):
    u = await db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    u.role = payload.role
    await db.commit()
    return {"ok": True}

@router.patch("/{user_id}/balance")
async def adjust_balance(
    user_id: int, payload: AdminAdjustBalance,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_role(Role.admin, Role.super_admin))
):
    try:
        await adjust_wallet_balance(db, user_id, payload.delta_cents)
        # record audit log (omitted for brevity)
        await db.commit()
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.patch("/{user_id}/suspend")
async def suspend_user(
    user_id: int, suspend: bool = True,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    u = await db.get(User, user_id)
    if not u: raise HTTPException(404, "User not found")
    u.status = UserStatus.suspended if suspend else UserStatus.active
    await db.commit()
    return {"ok": True}

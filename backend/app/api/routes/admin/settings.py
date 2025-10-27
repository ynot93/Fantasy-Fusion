# app/api/routes/admin/settings.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db
from app.core.rbac import require_role
from app.db.admin.enums import Role
from app.db.admin.models import Setting
from app.db.admin.schemas import SettingKV

router = APIRouter(prefix="/admin/settings", tags=["admin:settings"])

@router.get("", response_model=list[SettingKV])
async def get_settings(db: AsyncSession = Depends(get_db), _=Depends(require_role(Role.admin, Role.super_admin))):
    rows = (await db.execute(select(Setting))).scalars().all()
    return [SettingKV(key=r.key, value=r.value) for r in rows]

@router.patch("", response_model=list[SettingKV])
async def upsert_settings(items: list[SettingKV], db: AsyncSession = Depends(get_db), _=Depends(require_role(Role.super_admin))):
    for it in items:
        s = await db.get(Setting, it.key)
        if not s:
            s = Setting(key=it.key, value=it.value); db.add(s)
        else:
            s.value = it.value
    await db.commit()
    rows = (await db.execute(select(Setting))).scalars().all()
    return [SettingKV(key=r.key, value=r.value) for r in rows]

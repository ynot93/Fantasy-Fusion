# app/api/routes/admin/system.py
from fastapi import APIRouter, Depends
from app.core.rbac import require_role
from app.db.admin.enums import Role

router = APIRouter(prefix="/admin", tags=["admin:system"])

@router.get("/health")
async def health(_=Depends(require_role(Role.admin, Role.super_admin))):
    return {"status": "ok"}

@router.get("/audit-logs")
async def audit_logs(_=Depends(require_role(Role.admin, Role.super_admin))):
    return []

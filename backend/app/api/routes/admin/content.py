# app/api/routes/admin/content.py
from fastapi import APIRouter, Depends
from app.core.rbac import require_role
from app.db.admin.enums import Role
router = APIRouter(prefix="/admin/content", tags=["admin:content"])

@router.get("")
async def list_content(_=Depends(require_role(Role.admin, Role.super_admin))): 
    return []

@router.post("")
async def create_content(_=Depends(require_role(Role.admin, Role.super_admin))): 
    return {}

@router.patch("/{content_id}")
async def update_content(content_id:int, _=Depends(require_role(Role.admin, Role.super_admin))): 
    return {}

@router.delete("/{content_id}")
async def delete_content(content_id:int, _=Depends(require_role(Role.admin, Role.super_admin))): 
    return {"ok": True}

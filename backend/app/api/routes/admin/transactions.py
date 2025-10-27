# app/api/routes/admin/transactions.py
from fastapi import APIRouter, Depends
from app.core.rbac import require_role
from app.db.admin.enums import Role

router = APIRouter(prefix="/admin/transactions", tags=["admin:transactions"])

@router.get("")
async def list_transactions(_: str = Depends(require_role(Role.admin, Role.super_admin))):
    return []

@router.post("/withdrawals/{tx_id}/approve")
async def approve_withdrawal(tx_id: int, _=Depends(require_role(Role.admin, Role.super_admin))):
    return {"ok": True}

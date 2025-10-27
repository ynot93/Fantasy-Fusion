# app/core/rbac.py
from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_user
from app.db.admin.enums import Role

def require_role(*allowed: Role):
    async def checker(user = Depends(get_current_user)):
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return checker

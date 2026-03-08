from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_role
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/doctors", response_model=List[UserOut])
async def list_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all registered doctors (any authenticated user can see this)."""
    result = await db.execute(select(User).where(User.role == UserRole.doctor))
    return result.scalars().all()


@router.get("/patients", response_model=List[UserOut])
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
):
    """Return all patients — restricted to doctors."""
    result = await db.execute(select(User).where(User.role == UserRole.patient))
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Patients can only view their own profile; doctors can view any
    if current_user.role.value == "patient" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

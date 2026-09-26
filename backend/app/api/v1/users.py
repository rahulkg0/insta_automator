from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def read_current_user(
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for the currently authenticated user."""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update profile for current authenticated user."""
    updated_user = await AuthService.update_user(db, current_user, user_in)
    return updated_user

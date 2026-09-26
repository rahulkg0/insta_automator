from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.security import create_access_token
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user and return an access token."""
    user = await AuthService.register_user(db, user_in)
    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    user_in: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with email and password and return access token."""
    user = await AuthService.authenticate_user(db, user_in.email, user_in.password)
    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/token", response_model=TokenResponse)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """OAuth2 compatible token login, using username (email) and password."""
    user = await AuthService.authenticate_user(db, form_data.username, form_data.password)
    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

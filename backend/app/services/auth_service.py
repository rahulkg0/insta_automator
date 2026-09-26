from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email.lower().strip()))
        return result.scalars().first()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
        existing_user = await AuthService.get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )

        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email.lower().strip(),
            full_name=user_in.full_name.strip(),
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=False
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
        user = await AuthService.get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive."
            )
        return user

    @staticmethod
    async def update_user(db: AsyncSession, user: User, user_in: UserUpdate) -> User:
        if user_in.email is not None and user_in.email.lower().strip() != user.email:
            existing = await AuthService.get_user_by_email(db, user_in.email)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already taken."
                )
            user.email = user_in.email.lower().strip()
        
        if user_in.full_name is not None:
            user.full_name = user_in.full_name.strip()
            
        if user_in.password is not None:
            user.hashed_password = get_password_hash(user_in.password)

        await db.commit()
        await db.refresh(user)
        return user

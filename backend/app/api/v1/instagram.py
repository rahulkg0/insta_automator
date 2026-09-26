import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.brand import Brand
from app.schemas.instagram import (
    InstagramAccountResponse,
    InstagramConnectRequest,
    InstagramAuthUrlResponse
)
from app.services.instagram_service import InstagramService
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/instagram", tags=["Instagram Integration"])

@router.get("/auth-url", response_model=InstagramAuthUrlResponse)
async def get_instagram_auth_url(
    brand_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate Meta Graph API authorization URL for Instagram Professional account."""
    stmt = select(Brand).where(Brand.id == brand_id, Brand.user_id == current_user.id)
    res = await db.execute(stmt)
    brand = res.scalar_one_or_none()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found or access denied"
        )

    auth_info = InstagramService.get_auth_url(brand_id=str(brand.id), user_id=str(current_user.id))
    return InstagramAuthUrlResponse(**auth_info)

@router.get("/callback")
async def instagram_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Meta OAuth callback endpoint handling Meta authorization response."""
    if error or not code or not state:
        logger.error(f"Meta OAuth error: {error}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/brands?error=instagram_auth_failed")

    try:
        parts = state.split(":")
        brand_id = parts[0]
        user_id = parts[1]

        account_info = await InstagramService.exchange_code_and_get_account(code)
        await InstagramService.connect_or_update_account(
            db=db,
            user_id=user_id,
            brand_id=brand_id,
            account_data=account_info
        )

        return RedirectResponse(url=f"{settings.FRONTEND_URL}/brands/{brand_id}?instagram=connected")
    except Exception as e:
        logger.error(f"Instagram callback processing error: {e}")
        import urllib.parse
        err_msg = urllib.parse.quote(str(e))
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/brands/{brand_id}?error={err_msg}")



@router.post("/mock-connect", response_model=InstagramAccountResponse, status_code=status.HTTP_201_CREATED)
async def mock_connect_instagram(
    payload: InstagramConnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sandbox endpoint for instant Instagram connection testing without production Meta credentials."""
    stmt = select(Brand).where(Brand.id == payload.brand_id, Brand.user_id == current_user.id)
    res = await db.execute(stmt)
    brand = res.scalar_one_or_none()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found or access denied"
        )

    account = await InstagramService.mock_connect(
        db=db,
        user_id=str(current_user.id),
        brand_id=str(payload.brand_id),
        username=payload.username or "@mybrand",
        facebook_page_name=payload.facebook_page_name or f"{brand.name} Facebook Page"
    )

    return InstagramAccountResponse.model_validate(account)

@router.get("/account/{brand_id}", response_model=InstagramAccountResponse)
async def get_instagram_account(
    brand_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve connected Instagram account status for brand."""
    stmt = select(Brand).where(Brand.id == brand_id, Brand.user_id == current_user.id)
    res = await db.execute(stmt)
    brand = res.scalar_one_or_none()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found or access denied"
        )

    account = await InstagramService.get_account_for_brand(
        db=db,
        brand_id=str(brand_id),
        user_id=str(current_user.id)
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Instagram account connected to this brand"
        )

    return InstagramAccountResponse.model_validate(account)

@router.delete("/account/{brand_id}", status_code=status.HTTP_200_OK)
async def disconnect_instagram_account(
    brand_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect Instagram account from brand."""
    success = await InstagramService.disconnect_account(
        db=db,
        brand_id=str(brand_id),
        user_id=str(current_user.id)
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or already disconnected"
        )

    return {"status": "success", "message": "Instagram account disconnected"}

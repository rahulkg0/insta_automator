import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.asset import AssetResponse
from app.services.brand_service import BrandService
from app.storage.storage_service import StorageService

router = APIRouter(tags=["Brand Assets"])

@router.post("/brands/{brand_id}/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_brand_asset(
    brand_id: uuid.UUID,
    asset_type: str = Form("product_image"), # logo_primary, logo_secondary, product_image, font, background, other
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload logo, product photo, or brand asset to object storage and attach to brand."""
    # Verify ownership
    await BrandService.get_brand_by_id(db, brand_id, current_user.id)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content is empty."
        )

    # Validate file size (e.g., max 25MB)
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum 25MB limit."
        )

    filename = file.filename or f"asset_{uuid.uuid4().hex[:8]}"
    content_type = file.content_type or "application/octet-stream"

    # Upload to storage
    file_url, file_size = await StorageService.upload_asset(
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
        brand_id=brand_id,
        asset_type=asset_type
    )

    asset = await BrandService.add_asset(
        db=db,
        brand_id=brand_id,
        user_id=current_user.id,
        asset_type=asset_type,
        filename=filename,
        file_url=file_url,
        file_size=file_size,
        mime_type=content_type,
        meta_info={"original_name": filename}
    )
    return asset

@router.get("/brands/{brand_id}/assets", response_model=List[AssetResponse])
async def list_brand_assets(
    brand_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all assets belonging to a brand."""
    return await BrandService.get_brand_assets(db, brand_id, current_user.id)

@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a brand asset."""
    await BrandService.delete_asset(db, asset_id, current_user.id)
    return None

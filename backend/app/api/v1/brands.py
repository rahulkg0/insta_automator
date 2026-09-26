import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.services.brand_service import BrandService
from app.services.guideline_extractor import GuidelineExtractorService
from app.storage.storage_service import StorageService

router = APIRouter(prefix="/brands", tags=["Brands"])

@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_brand(
    brand_in: BrandCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new brand profile owned by current user."""
    brand = await BrandService.create_brand(db, current_user.id, brand_in)
    return brand

@router.get("", response_model=List[BrandResponse])
@router.get("/", response_model=List[BrandResponse], include_in_schema=False)
async def list_user_brands(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all brand profiles created by the current user."""
    return await BrandService.get_user_brands(db, current_user.id)

@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(
    brand_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific brand details."""
    return await BrandService.get_brand_by_id(db, brand_id, current_user.id)

@router.put("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: uuid.UUID,
    brand_in: BrandUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update brand profile."""
    return await BrandService.update_brand(db, brand_id, current_user.id, brand_in)

@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete brand profile and associated assets."""
    await BrandService.delete_brand(db, brand_id, current_user.id)
    return None

@router.post("/{brand_id}/extract-guidelines", response_model=BrandResponse)
async def upload_and_extract_guidelines(
    brand_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload brand guideline PDF/document, extract guidelines via AI, and update brand profile."""
    # Verify ownership
    brand = await BrandService.get_brand_by_id(db, brand_id, current_user.id)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 1. Upload guideline PDF to storage as asset
    public_url, file_size = await StorageService.upload_asset(
        file_bytes=file_bytes,
        filename=file.filename or "guideline.pdf",
        content_type=file.content_type or "application/pdf",
        brand_id=brand_id,
        asset_type="guideline_pdf"
    )

    # 2. Extract structured guidelines via AI
    extracted_rules = await GuidelineExtractorService.extract_brand_rules(
        file_bytes=file_bytes,
        filename=file.filename or "guideline.pdf"
    )

    # 3. Add asset record
    await BrandService.add_asset(
        db=db,
        brand_id=brand_id,
        user_id=current_user.id,
        asset_type="guideline_pdf",
        filename=file.filename or "guideline.pdf",
        file_url=public_url,
        file_size=file_size,
        mime_type=file.content_type or "application/pdf",
        meta_info=extracted_rules
    )

    # 4. Update brand profile with extracted rules
    update_data = BrandUpdate(**extracted_rules)
    updated_brand = await BrandService.update_brand(db, brand_id, current_user.id, update_data)
    return updated_brand

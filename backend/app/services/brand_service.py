import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.brand import Brand
from app.models.asset import BrandAsset
from app.schemas.brand import BrandCreate, BrandUpdate

class BrandService:
    @staticmethod
    async def create_brand(db: AsyncSession, user_id: uuid.UUID, brand_in: BrandCreate) -> Brand:
        brand = Brand(
            user_id=user_id,
            **brand_in.model_dump()
        )
        db.add(brand)
        await db.commit()
        await db.refresh(brand)
        return brand

    @staticmethod
    async def get_user_brands(db: AsyncSession, user_id: uuid.UUID) -> List[Brand]:
        result = await db.execute(
            select(Brand).where(Brand.user_id == user_id).order_by(Brand.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_brand_by_id(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID) -> Brand:
        result = await db.execute(
            select(Brand).where(Brand.id == brand_id, Brand.user_id == user_id)
        )
        brand = result.scalars().first()
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found or access denied."
            )
        return brand

    @staticmethod
    async def update_brand(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID, brand_in: BrandUpdate) -> Brand:
        brand = await BrandService.get_brand_by_id(db, brand_id, user_id)
        update_data = brand_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(brand, field, value)

        await db.commit()
        await db.refresh(brand)
        return brand

    @staticmethod
    async def delete_brand(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        brand = await BrandService.get_brand_by_id(db, brand_id, user_id)
        await db.delete(brand)
        await db.commit()
        return True

    @staticmethod
    async def add_asset(
        db: AsyncSession,
        brand_id: uuid.UUID,
        user_id: uuid.UUID,
        asset_type: str,
        filename: str,
        file_url: str,
        file_size: int,
        mime_type: str,
        meta_info: Optional[dict] = None
    ) -> BrandAsset:
        # Verify brand ownership
        await BrandService.get_brand_by_id(db, brand_id, user_id)

        asset = BrandAsset(
            brand_id=brand_id,
            user_id=user_id,
            asset_type=asset_type,
            filename=filename,
            file_url=file_url,
            file_size=file_size,
            mime_type=mime_type,
            meta_info=meta_info
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        return asset

    @staticmethod
    async def get_brand_assets(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID) -> List[BrandAsset]:
        await BrandService.get_brand_by_id(db, brand_id, user_id)
        result = await db.execute(
            select(BrandAsset).where(BrandAsset.brand_id == brand_id, BrandAsset.user_id == user_id).order_by(BrandAsset.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_asset(db: AsyncSession, asset_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await db.execute(
            select(BrandAsset).where(BrandAsset.id == asset_id, BrandAsset.user_id == user_id)
        )
        asset = result.scalars().first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found or access denied."
            )
        await db.delete(asset)
        await db.commit()
        return True

import uuid
from typing import Optional, Dict, Any
from sqlalchemy import String, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, GUID

class BrandAsset(Base, TimestampMixin):
    __tablename__ = "brand_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    brand_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    asset_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    ) # e.g. logo_primary, logo_secondary, product_image, guideline_pdf, font, background, other
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    meta_info: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationship
    brand = relationship("Brand", back_populates="assets")

    def __repr__(self) -> str:
        return f"<BrandAsset {self.filename} ({self.asset_type})>"

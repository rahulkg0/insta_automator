import uuid
from typing import Optional, List
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, GUID

class Brand(Base, TimestampMixin):
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_audience: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_personality: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_tone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visual_style: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(50), default="#9333ea", nullable=False)
    secondary_color: Mapped[str] = mapped_column(String(50), default="#ec4899", nullable=False)
    accent_color: Mapped[str] = mapped_column(String(50), default="#06b6d4", nullable=False)
    heading_font: Mapped[str] = mapped_column(String(100), default="Inter-Bold", nullable=False)
    body_font: Mapped[str] = mapped_column(String(100), default="Inter", nullable=False)
    cta_style: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hashtag_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    assets = relationship("BrandAsset", back_populates="brand", cascade="all, delete-orphan")
    instagram_account = relationship("InstagramAccount", back_populates="brand", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Brand {self.name}>"

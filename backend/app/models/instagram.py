import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, GUID

class InstagramAccount(Base, TimestampMixin):
    __tablename__ = "instagram_accounts"

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
        unique=True,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    instagram_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    facebook_page_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    facebook_page_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=True)

    # Relationships
    brand = relationship("Brand", back_populates="instagram_account")
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<InstagramAccount @{self.username} (Brand: {self.brand_id})>"

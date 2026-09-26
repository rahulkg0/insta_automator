import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, GUID

class Post(Base, TimestampMixin):
    __tablename__ = "posts"

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
    brand_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    social_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True
    )

    # Input brief parameters
    brief_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), default="product_promotion", nullable=False)
    post_objective: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_audience: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    product_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cta: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Generated content JSON
    # { "hook": "...", "headline": "...", "body": "...", "cta": "...", "caption": "...", "hashtags": [...], "visual_concept": "...", "template_type": "..." }
    generated_content: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Generated design JSON (Phase 4 canvas elements)
    generated_design: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Final rendered image URL
    rendered_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Scheduling & publishing timestamps
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # State Machine: DRAFT, GENERATING, READY_FOR_REVIEW, APPROVED, SCHEDULED, PUBLISHING, PUBLISHED, GENERATION_FAILED, PUBLISH_FAILED
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False, index=True)

    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    versions = relationship("PostVersion", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Post {self.id} status={self.status}>"

class PostVersion(Base, TimestampMixin):
    __tablename__ = "post_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_content: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    generated_design: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    rendered_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    post = relationship("Post", back_populates="versions")

    def __repr__(self) -> str:
        return f"<PostVersion post={self.post_id} v{self.version_number}>"

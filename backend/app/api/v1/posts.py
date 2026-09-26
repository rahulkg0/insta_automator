import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.post import (
    PostBriefRequest,
    PostResponse,
    PostUpdateSchema,
    PostVersionResponse
)
from app.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/generate", response_model=PostResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def generate_post(
    brief: PostBriefRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger AI Content Generation Pipeline and return structured post."""
    post = await PostService.create_and_generate_post(db, current_user.id, brief)
    return post

@router.post("/{post_id}/regenerate", response_model=PostResponse)
async def regenerate_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate AI content and create a new post version."""
    return await PostService.regenerate_post_content(db, post_id, current_user.id)

@router.get("", response_model=List[PostResponse])
@router.get("/", response_model=List[PostResponse], include_in_schema=False)
async def list_posts(
    brand_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all posts for the current user (optionally filtered by brand)."""
    return await PostService.get_user_posts(db, current_user.id, brand_id)

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details for a specific post."""
    return await PostService.get_post_by_id(db, post_id, current_user.id)

@router.get("/{post_id}/versions", response_model=List[PostVersionResponse])
async def get_post_versions(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get version history for a post."""
    return await PostService.get_post_versions(db, post_id, current_user.id)

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: uuid.UUID,
    update_in: PostUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update post copy or transition status (e.g. APPROVED)."""
    return await PostService.update_post(db, post_id, current_user.id, update_in)

@router.post("/{post_id}/publish", response_model=PostResponse)
async def publish_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Publish post live to connected Instagram account via Meta Graph API."""
    return await PostService.publish_post(db, post_id, current_user.id)

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete post."""
    await PostService.delete_post(db, post_id, current_user.id)
    return None

from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid
from pydantic import BaseModel, Field, ConfigDict

class PostBriefRequest(BaseModel):
    brand_id: uuid.UUID
    brief_prompt: str = Field(..., min_length=3, max_length=1000)
    content_type: str = Field("product_promotion", max_length=50)
    post_objective: Optional[str] = Field("Generate enquiries", max_length=255)
    target_audience: Optional[str] = Field(None, max_length=255)
    product_info: Optional[str] = None
    cta: Optional[str] = Field("DM us for details", max_length=255)
    campaign_name: Optional[str] = None

class GeneratedContentSchema(BaseModel):
    content_type: str
    hook: str
    headline: str
    body: str
    cta: str
    caption: str
    hashtags: List[str]
    visual_concept: str
    template_type: str
    carousel_slides: Optional[List[Dict[str, Any]]] = None

class PostUpdateSchema(BaseModel):
    hook: Optional[str] = None
    headline: Optional[str] = None
    body: Optional[str] = None
    cta: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    rendered_image_url: Optional[str] = None

class PostVersionResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    version_number: int
    generated_content: GeneratedContentSchema
    rendered_image_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID
    social_account_id: Optional[uuid.UUID] = None
    brief_prompt: str
    content_type: str
    post_objective: Optional[str] = None
    target_audience: Optional[str] = None
    product_info: Optional[str] = None
    cta: Optional[str] = None
    generated_content: Optional[GeneratedContentSchema] = None
    generated_design: Optional[Dict[str, Any]] = None
    rendered_image_url: Optional[str] = None
    status: str
    current_version: int
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

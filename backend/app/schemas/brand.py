from datetime import datetime
from typing import Optional, List
import uuid
from pydantic import BaseModel, Field, ConfigDict

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    brand_personality: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    primary_color: str = Field("#9333ea", max_length=50)
    secondary_color: str = Field("#ec4899", max_length=50)
    accent_color: str = Field("#06b6d4", max_length=50)
    heading_font: str = Field("Inter-Bold", max_length=100)
    body_font: str = Field("Inter", max_length=100)
    cta_style: Optional[str] = None
    content_rules: Optional[str] = None
    logo_rules: Optional[str] = None
    hashtag_rules: Optional[str] = None

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    brand_personality: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    primary_color: Optional[str] = Field(None, max_length=50)
    secondary_color: Optional[str] = Field(None, max_length=50)
    accent_color: Optional[str] = Field(None, max_length=50)
    heading_font: Optional[str] = Field(None, max_length=100)
    body_font: Optional[str] = Field(None, max_length=100)
    cta_style: Optional[str] = None
    content_rules: Optional[str] = None
    logo_rules: Optional[str] = None
    hashtag_rules: Optional[str] = None

class BrandResponse(BrandBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from typing import Optional, Dict, Any
import uuid
from pydantic import BaseModel, Field, ConfigDict

class AssetBase(BaseModel):
    asset_type: str = Field(..., max_length=50)
    filename: str = Field(..., max_length=255)
    file_url: str
    file_size: int = 0
    mime_type: str = Field(..., max_length=100)
    meta_info: Optional[Dict[str, Any]] = None

class AssetCreate(AssetBase):
    brand_id: uuid.UUID

class AssetResponse(AssetBase):
    id: uuid.UUID
    brand_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

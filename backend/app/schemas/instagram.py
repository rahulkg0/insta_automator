import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class InstagramAccountResponse(BaseModel):
    id: uuid.UUID
    brand_id: uuid.UUID
    instagram_user_id: str
    username: str
    name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    facebook_page_name: Optional[str] = None
    is_connected: bool = True
    last_synced_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class InstagramConnectRequest(BaseModel):
    brand_id: uuid.UUID
    username: Optional[str] = "@mybrand"
    facebook_page_name: Optional[str] = "My Brand Official Page"

class InstagramAuthUrlResponse(BaseModel):
    auth_url: str
    is_mock: bool
    state: str

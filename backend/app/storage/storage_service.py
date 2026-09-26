import os
import uuid
import shutil
import logging
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure local upload storage directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class StorageService:
    @staticmethod
    async def upload_asset(
        file_bytes: bytes,
        filename: str,
        content_type: str,
        brand_id: uuid.UUID,
        asset_type: str
    ) -> Tuple[str, int]:
        """Upload brand asset file to storage and return (public_url, file_size_bytes)."""
        file_size = len(file_bytes)
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{brand_id}/{asset_type}_{uuid.uuid4().hex}{ext}"

        # If Supabase URL and key are provided, use Supabase Storage
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

        if supabase_url and supabase_key and "supabase.co" in supabase_url:
            try:
                import httpx
                bucket_name = os.getenv("STORAGE_BUCKET_NAME", "instagram-automator-assets")
                upload_endpoint = f"{supabase_url}/storage/v1/object/{bucket_name}/{unique_filename}"
                headers = {
                    "Authorization": f"Bearer {supabase_key}",
                    "apikey": supabase_key,
                    "Content-Type": content_type
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post(upload_endpoint, content=file_bytes, headers=headers)
                    if resp.status_code in [200, 201]:
                        public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{unique_filename}"
                        return public_url, file_size
                    else:
                        logger.warning(f"Supabase upload returned {resp.status_code}: {resp.text}. Falling back to local storage.")
            except Exception as e:
                logger.error(f"Error uploading to Supabase: {e}. Falling back to local storage.")

        # Local storage fallback
        target_path = os.path.join(UPLOAD_DIR, unique_filename)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(file_bytes)

        public_url = f"{settings.BACKEND_URL}/api/v1/storage/files/{unique_filename}"
        return public_url, file_size

    @staticmethod
    async def upload_generated_post(
        image_bytes: bytes,
        post_id: uuid.UUID,
        format: str = "png"
    ) -> Tuple[str, int]:
        """Upload AI generated final post graphic to storage."""
        unique_filename = f"generated_posts/post_{post_id}_{uuid.uuid4().hex[:8]}.{format}"
        file_size = len(image_bytes)

        target_path = os.path.join(UPLOAD_DIR, unique_filename)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(image_bytes)

        public_url = f"{settings.BACKEND_URL}/api/v1/storage/files/{unique_filename}"
        return public_url, file_size

    @staticmethod
    async def delete_asset(file_url: str) -> bool:
        """Delete asset file from storage."""
        if "/api/v1/storage/files/" in file_url:
            relative_path = file_url.split("/api/v1/storage/files/")[-1]
            target_path = os.path.join(UPLOAD_DIR, relative_path)
            if os.path.exists(target_path):
                os.remove(target_path)
                return True
        return True

    @staticmethod
    def get_public_url(relative_path: str) -> str:
        return f"{settings.BACKEND_URL}/api/v1/storage/files/{relative_path}"

import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from app.storage.storage_service import UPLOAD_DIR

router = APIRouter(prefix="/storage", tags=["Storage"])

@router.get("/files/{file_path:path}")
async def serve_uploaded_file(file_path: str):
    """Serve locally uploaded assets and generated images."""
    safe_path = os.path.normpath(os.path.join(UPLOAD_DIR, file_path))
    if not safe_path.startswith(UPLOAD_DIR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    
    if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    return FileResponse(safe_path)

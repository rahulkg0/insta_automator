from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.brands import router as brands_router
from app.api.v1.assets import router as assets_router
from app.api.v1.storage import router as storage_router
from app.api.v1.posts import router as posts_router
from app.api.v1.instagram import router as instagram_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(brands_router)
api_v1_router.include_router(assets_router)
api_v1_router.include_router(storage_router)
api_v1_router.include_router(posts_router)
api_v1_router.include_router(instagram_router)


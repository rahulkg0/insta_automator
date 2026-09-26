import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from app.core.config import settings
from app.core.db import engine
from app.models.base import Base
import app.models.user
import app.models.brand
import app.models.asset
import app.models.post
import app.models.instagram


from app.api.v1.router import api_v1_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("instagram_automator")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create database tables if they do not exist
    logger.info("Initializing database schemas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Auto-migrate SQLite posts table for new scheduling columns if missing
        try:
            await conn.execute(text("ALTER TABLE posts ADD COLUMN scheduled_at DATETIME"))
            logger.info("Migrated schema: added scheduled_at to posts table.")
        except Exception as e:
            logger.debug(f"scheduled_at column exists or skipped: {e}")

        try:
            await conn.execute(text("ALTER TABLE posts ADD COLUMN published_at DATETIME"))
            logger.info("Migrated schema: added published_at to posts table.")
        except Exception as e:
            logger.debug(f"published_at column exists or skipped: {e}")
    logger.info("Database schemas ready.")
    yield
    # Shutdown
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured exception handler
@app.exception_handler(Exception)
async def custom_global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "retryable": True
            }
        }
    )

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }

app.include_router(api_v1_router)

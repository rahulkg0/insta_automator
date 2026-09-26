from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent

if (ROOT_DIR / ".env").exists():
    load_dotenv(dotenv_path=ROOT_DIR / ".env", override=True)
elif (BASE_DIR / ".env").exists():
    load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)
else:
    load_dotenv(override=True)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Instagram AI Automator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:3000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev_secret_key_instagram_ai_automator_super_secret_2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")) # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/instagram_automator")
    
    # AI Configuration
    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-72b-instruct:free")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Meta Instagram Configuration
    META_APP_ID: Optional[str] = os.getenv("META_APP_ID", "")
    META_APP_SECRET: Optional[str] = os.getenv("META_APP_SECRET", "")
    META_REDIRECT_URI: str = os.getenv("META_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/instagram/callback")


    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")

settings = Settings()

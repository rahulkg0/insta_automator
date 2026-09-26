import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Check if postgres is reachable or default to sqlite for standalone local dev
use_sqlite = False
try:
    import socket
    host = settings.POSTGRES_HOST
    port = settings.POSTGRES_PORT
    with socket.create_connection((host, port), timeout=1.0):
        pass
except Exception:
    logger.info("PostgreSQL not detected on localhost:5432. Using SQLite async for local standalone development.")
    use_sqlite = True

if use_sqlite:
    effective_url = "sqlite+aiosqlite:///./dev.db"
else:
    effective_url = db_url

engine = create_async_engine(
    effective_url,
    echo=False,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

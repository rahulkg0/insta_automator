import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.base import Base
from app.models.user import User
from app.models.brand import Brand
from app.models.asset import BrandAsset
from app.models.post import Post, PostVersion

from app.main import app as fastapi_app
from app.core.db import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_suite.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_post_ai_generation_and_regeneration():
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        # 1. Sign up User
        res_u = await ac.post("/api/v1/auth/signup", json={
            "email": "creator@aitronix.com", "full_name": "Creator Admin", "password": "Password123!"
        })
        token = res_u.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Brand
        res_brand = await ac.post("/api/v1/brands", json={
            "name": "Aitronix Robotics",
            "industry": "Robotics & STEM",
            "brand_tone": "Professional & Educational",
            "primary_color": "#9333ea"
        }, headers=headers)
        brand_id = res_brand.json()["id"]

        # 3. Generate AI Post Content
        brief_data = {
            "brand_id": brand_id,
            "brief_prompt": "Create a promotional post for our robotics workshop.",
            "content_type": "product_promotion",
            "post_objective": "Generate enquiries",
            "target_audience": "Students in grades 6-9",
            "product_info": "Innovator Robotics Kit",
            "cta": "DM us for details"
        }
        res_post = await ac.post("/api/v1/posts/generate", json=brief_data, headers=headers)
        assert res_post.status_code == 201
        post_data = res_post.json()
        assert post_data["status"] == "READY_FOR_REVIEW"
        assert post_data["current_version"] == 1
        assert "hook" in post_data["generated_content"]
        assert "caption" in post_data["generated_content"]
        assert "hashtags" in post_data["generated_content"]

        post_id = post_data["id"]

        # 4. Regenerate post content (creates Version 2)
        res_regen = await ac.post(f"/api/v1/posts/{post_id}/regenerate", headers=headers)
        assert res_regen.status_code == 200
        assert res_regen.json()["current_version"] == 2

        # 5. Check version history
        res_versions = await ac.get(f"/api/v1/posts/{post_id}/versions", headers=headers)
        assert res_versions.status_code == 200
        assert len(res_versions.json()) == 2

        # 6. Update copy & transition status to APPROVED
        res_update = await ac.put(f"/api/v1/posts/{post_id}", json={
            "hook": "BUILD YOUR FIRST ROBOT!",
            "status": "APPROVED"
        }, headers=headers)
        assert res_update.status_code == 200
        assert res_update.json()["status"] == "APPROVED"
        assert res_update.json()["generated_content"]["hook"] == "BUILD YOUR FIRST ROBOT!"

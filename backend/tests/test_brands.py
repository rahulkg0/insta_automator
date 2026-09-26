import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.base import Base
from app.models.user import User
from app.models.brand import Brand
from app.models.asset import BrandAsset

from app.main import app as fastapi_app
from app.core.db import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_suite.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False
)
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
async def test_brand_crud_and_tenant_isolation():
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        # 1. Register User A
        res_u1 = await ac.post("/api/v1/auth/signup", json={
            "email": "usera@brand.com", "full_name": "User A", "password": "Password123!"
        })
        token_a = res_u1.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B
        res_u2 = await ac.post("/api/v1/auth/signup", json={
            "email": "userb@brand.com", "full_name": "User B", "password": "Password123!"
        })
        token_b = res_u2.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User A creates Brand A
        brand_data = {
            "name": "Aitronix Robotics",
            "industry": "Education & Robotics",
            "target_audience": "Students and Schools",
            "primary_color": "#9333ea",
            "secondary_color": "#ec4899"
        }
        res_brand_a = await ac.post("/api/v1/brands", json=brand_data, headers=headers_a)
        assert res_brand_a.status_code == 201
        brand_id = res_brand_a.json()["id"]
        assert res_brand_a.json()["name"] == "Aitronix Robotics"

        # 4. User B attempts to access User A's Brand (must be 404/Denied)
        res_forbidden_get = await ac.get(f"/api/v1/brands/{brand_id}", headers=headers_b)
        assert res_forbidden_get.status_code == 404

        # 5. User A updates Brand A
        res_update = await ac.put(f"/api/v1/brands/{brand_id}", json={"brand_tone": "Educational & Professional"}, headers=headers_a)
        assert res_update.status_code == 200
        assert res_update.json()["brand_tone"] == "Educational & Professional"

        # 6. Upload Asset for Brand A
        files = {"file": ("logo.png", b"\x89PNG\r\n\x1a\nfakeimagebytes", "image/png")}
        data = {"asset_type": "logo_primary"}
        res_asset = await ac.post(f"/api/v1/brands/{brand_id}/assets", data=data, files=files, headers=headers_a)
        assert res_asset.status_code == 201
        assert res_asset.json()["asset_type"] == "logo_primary"

        # 7. List Brand Assets
        res_assets_list = await ac.get(f"/api/v1/brands/{brand_id}/assets", headers=headers_a)
        assert res_assets_list.status_code == 200
        assert len(res_assets_list.json()) == 1

        # 8. Brand Guideline Extraction
        guideline_file = {"file": ("guideline.pdf", b"%PDF-1.4 sample guideline content with #9333ea and Montserrat font", "application/pdf")}
        res_extract = await ac.post(f"/api/v1/brands/{brand_id}/extract-guidelines", files=guideline_file, headers=headers_a)
        assert res_extract.status_code == 200
        assert res_extract.json()["primary_color"] == "#9333ea"

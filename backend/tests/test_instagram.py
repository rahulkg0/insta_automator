import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.base import Base
import app.models.user
import app.models.brand
import app.models.asset
import app.models.post
import app.models.instagram

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
async def test_instagram_connection_flow():
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        # 1. Sign up user
        res_signup = await ac.post("/api/v1/auth/signup", json={
            "email": "ig_user@brand.com", "full_name": "IG User", "password": "Password123!"
        })
        assert res_signup.status_code == 201
        token = res_signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create a Brand
        brand_data = {
            "name": "Insta Test Brand",
            "industry": "Marketing",
            "primary_color": "#833AB4",
            "secondary_color": "#FD1D1D",
            "accent_color": "#F56040"
        }
        create_brand_resp = await ac.post("/api/v1/brands", json=brand_data, headers=headers)
        assert create_brand_resp.status_code == 201
        brand_id = create_brand_resp.json()["id"]

        # 3. Get Auth URL
        auth_url_resp = await ac.get(f"/api/v1/integrations/instagram/auth-url?brand_id={brand_id}", headers=headers)
        assert auth_url_resp.status_code == 200
        auth_data = auth_url_resp.json()
        assert "auth_url" in auth_data
        assert "is_mock" in auth_data

        # 4. Initially, no account connected
        no_account_resp = await ac.get(f"/api/v1/integrations/instagram/account/{brand_id}", headers=headers)
        assert no_account_resp.status_code == 404

        # 5. Mock Connect Instagram Account
        connect_payload = {
            "brand_id": brand_id,
            "username": "@testbrand_official",
            "facebook_page_name": "Test Brand Facebook Page"
        }
        connect_resp = await ac.post("/api/v1/integrations/instagram/mock-connect", json=connect_payload, headers=headers)
        assert connect_resp.status_code == 201
        account = connect_resp.json()
        assert account["username"] == "@testbrand_official"
        assert account["is_connected"] is True
        assert account["brand_id"] == brand_id

        # 6. Retrieve connected account status
        get_acc_resp = await ac.get(f"/api/v1/integrations/instagram/account/{brand_id}", headers=headers)
        assert get_acc_resp.status_code == 200
        fetched = get_acc_resp.json()
        assert fetched["username"] == "@testbrand_official"
        assert fetched["is_connected"] is True

        # 7. Disconnect Account
        disconnect_resp = await ac.delete(f"/api/v1/integrations/instagram/account/{brand_id}", headers=headers)
        assert disconnect_resp.status_code == 200

        # 8. Check account is now 404 / disconnected
        after_disc_resp = await ac.get(f"/api/v1/integrations/instagram/account/{brand_id}", headers=headers)
        assert after_disc_resp.status_code == 404

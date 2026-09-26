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
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_signup_and_login_flow():
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        signup_data = {
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "Password123!"
        }
        res_signup = await ac.post("/api/v1/auth/signup", json=signup_data)
        assert res_signup.status_code == 201
        body_signup = res_signup.json()
        assert "access_token" in body_signup
        token = body_signup["access_token"]
        assert body_signup["user"]["email"] == "testuser@example.com"
        assert body_signup["user"]["full_name"] == "Test User"

        res_dup = await ac.post("/api/v1/auth/signup", json=signup_data)
        assert res_dup.status_code == 400

        headers = {"Authorization": f"Bearer {token}"}
        res_me = await ac.get("/api/v1/users/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["email"] == "testuser@example.com"

        login_data = {
            "email": "testuser@example.com",
            "password": "Password123!"
        }
        res_login = await ac.post("/api/v1/auth/login", json=login_data)
        assert res_login.status_code == 200
        assert "access_token" in res_login.json()

        res_bad_pass = await ac.post("/api/v1/auth/login", json={"email": "testuser@example.com", "password": "WrongPassword"})
        assert res_bad_pass.status_code == 401

        res_unauth = await ac.get("/api/v1/users/me")
        assert res_unauth.status_code == 401

        res_update = await ac.put("/api/v1/users/me", headers=headers, json={"full_name": "Updated User Name"})
        assert res_update.status_code == 200
        assert res_update.json()["full_name"] == "Updated User Name"

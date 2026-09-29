import os
import random
import string
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.instagram import InstagramAccount
from app.models.brand import Brand

logger = logging.getLogger(__name__)

class InstagramService:
    @staticmethod
    def get_auth_url(brand_id: str, user_id: str) -> Dict[str, Any]:
        """Generates Meta Graph API OAuth authorization URL or sandbox fallback."""
        meta_app_id = (os.getenv("META_APP_ID") or getattr(settings, "META_APP_ID", "")).strip()
        meta_redirect_uri = os.getenv("META_REDIRECT_URI") or getattr(settings, "META_REDIRECT_URI", f"{settings.BACKEND_URL}/api/v1/integrations/instagram/callback")
        state = f"{brand_id}:{user_id}"

        # Treat missing or default placeholder Meta App IDs as sandbox mock mode
        is_placeholder = not meta_app_id or meta_app_id in (
            "your_meta_app_id", "YOUR_META_APP_ID", "1234567890", "0000000000"
        )

        if is_placeholder:
            logger.info(f"META_APP_ID '{meta_app_id}' is placeholder or unconfigured; providing sandbox authorization URL.")
            return {
                "auth_url": f"{settings.FRONTEND_URL}/brands/{brand_id}?instagram_action=mock_connect",
                "is_mock": True,
                "state": state
            }

        scopes = [
            "public_profile",
            "pages_show_list",
            "pages_read_engagement",
            "instagram_basic",
            "instagram_content_publish"
        ]




        
        auth_url = (
            f"https://www.facebook.com/v19.0/dialog/oauth?"
            f"client_id={meta_app_id.strip()}&"
            f"redirect_uri={meta_redirect_uri.strip()}&"
            f"state={state}&"
            f"scope={','.join(scopes)}&"
            f"response_type=code"
        )

        return {
            "auth_url": auth_url,
            "is_mock": False,
            "state": state
        }

    @staticmethod
    async def exchange_code_and_get_account(code: str) -> Dict[str, Any]:
        """Exchanges Meta authorization code for short-lived & long-lived tokens and fetches IG details."""
        meta_app_id = os.getenv("META_APP_ID") or getattr(settings, "META_APP_ID", "")
        meta_app_secret = os.getenv("META_APP_SECRET") or getattr(settings, "META_APP_SECRET", "")
        meta_redirect_uri = os.getenv("META_REDIRECT_URI") or getattr(settings, "META_REDIRECT_URI", f"{settings.BACKEND_URL}/api/v1/integrations/instagram/callback")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Exchange code for short-lived token
            token_resp = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "client_id": meta_app_id,
                    "redirect_uri": meta_redirect_uri,
                    "client_secret": meta_app_secret,
                    "code": code
                }
            )
            if token_resp.status_code != 200:
                logger.error(f"Meta token exchange error: {token_resp.text}")
                raise ValueError("Failed to exchange code for Meta access token")

            short_token = token_resp.json().get("access_token")

            # Step 2: Exchange for long-lived token (60 days)
            ll_resp = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": meta_app_id,
                    "client_secret": meta_app_secret,
                    "fb_exchange_token": short_token
                }
            )
            long_token = ll_resp.json().get("access_token", short_token) if ll_resp.status_code == 200 else short_token

            # Log granted permissions for debugging
            try:
                perm_resp = await client.get("https://graph.facebook.com/v19.0/me/permissions", params={"access_token": long_token})
                logger.info(f"Meta granted permissions response: {perm_resp.text}")
            except Exception as pe:
                logger.warning(f"Could not fetch permissions: {pe}")

            # Step 3: Fetch Connected Facebook Pages & Instagram Business Accounts
            pages_resp = await client.get(
                "https://graph.facebook.com/v19.0/me/accounts",
                params={
                    "fields": "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
                    "access_token": long_token
                }
            )
            pages_data = []
            if pages_resp.status_code == 200:
                pages_data = pages_resp.json().get("data", [])
            else:
                logger.warning(f"Meta /me/accounts returned status {pages_resp.status_code}: {pages_resp.text}")

            ig_account_info = None
            found_page_names = []

            for page in pages_data:
                page_name = page.get("name", "Facebook Page")
                found_page_names.append(page_name)

                # Check for linked Instagram Business Account
                if "instagram_business_account" in page and page["instagram_business_account"]:
                    ig_data = page["instagram_business_account"]
                    ig_account_info = {
                        "instagram_user_id": str(ig_data.get("id")),
                        "username": f"@{ig_data.get('username')}" if not str(ig_data.get('username')).startswith("@") else ig_data.get('username'),
                        "name": ig_data.get("name") or page_name,
                        "profile_picture_url": ig_data.get("profile_picture_url"),
                        "facebook_page_id": str(page.get("id")),
                        "facebook_page_name": page_name,
                        "access_token": page.get("access_token") or long_token
                    }
                    logger.info(f"Successfully discovered Instagram account {ig_account_info['username']} linked to Facebook Page '{page_name}'!")
                    break

            # Fallback 1: Check /me?fields=accounts...
            if not ig_account_info:
                me_resp = await client.get(
                    "https://graph.facebook.com/v19.0/me",
                    params={
                        "fields": "id,name,accounts{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}}",
                        "access_token": long_token
                    }
                )
                if me_resp.status_code == 200:
                    me_pages = me_resp.json().get("accounts", {}).get("data", [])
                    for page in me_pages:
                        page_name = page.get("name", "Facebook Page")
                        if page_name not in found_page_names:
                            found_page_names.append(page_name)
                        if "instagram_business_account" in page and page["instagram_business_account"]:
                            ig_data = page["instagram_business_account"]
                            ig_account_info = {
                                "instagram_user_id": str(ig_data.get("id")),
                                "username": f"@{ig_data.get('username')}" if not str(ig_data.get('username')).startswith("@") else ig_data.get('username'),
                                "name": ig_data.get("name") or page_name,
                                "profile_picture_url": ig_data.get("profile_picture_url"),
                                "facebook_page_id": str(page.get("id")),
                                "facebook_page_name": page_name,
                                "access_token": page.get("access_token") or long_token
                            }
                            logger.info(f"Successfully discovered Instagram account via /me fallback: {ig_account_info['username']}")
                            break

            # Fallback 2: debug_token resolution for granular permissions / Meta Login for Business
            if not ig_account_info:
                logger.info("Attempting debug_token fallback for granular scopes...")
                try:
                    debug_resp = await client.get(
                        "https://graph.facebook.com/v19.0/debug_token",
                        params={
                            "input_token": long_token,
                            "access_token": f"{meta_app_id}|{meta_app_secret}"
                        }
                    )
                    if debug_resp.status_code == 200:
                        debug_data = debug_resp.json().get("data", {})
                        granular_scopes = debug_data.get("granular_scopes", [])
                        
                        ig_target_ids = []
                        page_target_ids = []

                        for g_scope in granular_scopes:
                            scope_name = g_scope.get("scope", "")
                            t_ids = g_scope.get("target_ids", [])
                            if t_ids:
                                if "instagram" in scope_name:
                                    for tid in t_ids:
                                        if tid not in ig_target_ids:
                                            ig_target_ids.append(tid)
                                elif "pages" in scope_name:
                                    for tid in t_ids:
                                        if tid not in page_target_ids:
                                            page_target_ids.append(tid)

                        logger.info(f"debug_token parsed target IDs -> IG: {ig_target_ids}, Pages: {page_target_ids}")

                        # Check Page target IDs for linked IG business account
                        page_name = "Facebook Page"
                        page_id = page_target_ids[0] if page_target_ids else None

                        if page_id:
                            p_resp = await client.get(
                                f"https://graph.facebook.com/v19.0/{page_id}",
                                params={
                                    "fields": "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
                                    "access_token": long_token
                                }
                            )
                            if p_resp.status_code == 200:
                                p_data = p_resp.json()
                                page_name = p_data.get("name", page_name)
                                if page_name not in found_page_names:
                                    found_page_names.append(page_name)
                                if "instagram_business_account" in p_data and p_data["instagram_business_account"]:
                                    ig_data = p_data["instagram_business_account"]
                                    ig_account_info = {
                                        "instagram_user_id": str(ig_data.get("id")),
                                        "username": f"@{ig_data.get('username')}" if not str(ig_data.get('username')).startswith("@") else ig_data.get('username'),
                                        "name": ig_data.get("name") or page_name,
                                        "profile_picture_url": ig_data.get("profile_picture_url"),
                                        "facebook_page_id": str(page_id),
                                        "facebook_page_name": page_name,
                                        "access_token": p_data.get("access_token") or long_token
                                    }
                                    logger.info(f"Successfully discovered IG account via page debug_token target ID: {ig_account_info['username']}")

                        # If still no ig_account_info but we have an IG target ID, query direct IG object
                        if not ig_account_info and ig_target_ids:
                            ig_id = ig_target_ids[0]
                            ig_prof_resp = await client.get(
                                f"https://graph.facebook.com/v19.0/{ig_id}",
                                params={
                                    "fields": "id,username,name,profile_picture_url",
                                    "access_token": long_token
                                }
                            )
                            if ig_prof_resp.status_code == 200:
                                ig_prof = ig_prof_resp.json()
                                username_val = ig_prof.get("username", "instagram_user")
                                clean_username = f"@{username_val}" if not str(username_val).startswith("@") else username_val

                                ig_account_info = {
                                    "instagram_user_id": str(ig_prof.get("id")),
                                    "username": clean_username,
                                    "name": ig_prof.get("name") or page_name,
                                    "profile_picture_url": ig_prof.get("profile_picture_url"),
                                    "facebook_page_id": str(page_id) if page_id else None,
                                    "facebook_page_name": page_name,
                                    "access_token": long_token
                                }
                                logger.info(f"Successfully discovered IG account via direct IG object ID: {ig_account_info['username']}")
                except Exception as d_err:
                    logger.warning(f"debug_token fallback failed: {d_err}")

            if not ig_account_info:
                if found_page_names:
                    pages_str = ", ".join(found_page_names)
                    logger.warning(f"Facebook Pages found ({pages_str}), but no Instagram Professional Account is linked.")
                    raise ValueError(f"Found Facebook Page '{pages_str}', but no Instagram Professional account is connected to it. Please ensure your Instagram Business/Creator account is linked to this Facebook Page in Instagram Settings.")
                else:
                    logger.warning("No Facebook Pages returned for this user.")
                    raise ValueError("No Facebook Page returned by Meta. Please check that your Facebook Account has full admin access to the Facebook Page linked to your Instagram account.")

            return ig_account_info



    @staticmethod
    async def connect_or_update_account(
        db: AsyncSession,
        user_id: str,
        brand_id: str,
        account_data: Dict[str, Any]
    ) -> InstagramAccount:
        """Saves or updates connected Instagram account in database."""
        stmt = select(InstagramAccount).where(InstagramAccount.brand_id == brand_id)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        expires_at = datetime.now(timezone.utc) + timedelta(days=60)

        if existing:
            existing.instagram_user_id = account_data["instagram_user_id"]
            existing.username = account_data["username"]
            existing.name = account_data.get("name")
            existing.profile_picture_url = account_data.get("profile_picture_url")
            existing.access_token = account_data["access_token"]
            existing.token_expires_at = expires_at
            existing.facebook_page_id = account_data.get("facebook_page_id")
            existing.facebook_page_name = account_data.get("facebook_page_name")
            existing.is_connected = True
            existing.last_synced_at = datetime.now(timezone.utc)
            db.add(existing)
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            new_acc = InstagramAccount(
                user_id=user_id,
                brand_id=brand_id,
                instagram_user_id=account_data["instagram_user_id"],
                username=account_data["username"],
                name=account_data.get("name"),
                profile_picture_url=account_data.get("profile_picture_url"),
                access_token=account_data["access_token"],
                token_expires_at=expires_at,
                facebook_page_id=account_data.get("facebook_page_id"),
                facebook_page_name=account_data.get("facebook_page_name"),
                is_connected=True,
                last_synced_at=datetime.now(timezone.utc)
            )
            db.add(new_acc)
            await db.commit()
            await db.refresh(new_acc)
            return new_acc

    @staticmethod
    async def mock_connect(
        db: AsyncSession,
        user_id: str,
        brand_id: str,
        username: str = "@mybrand",
        facebook_page_name: str = "My Brand Official Page"
    ) -> InstagramAccount:
        """Sandbox simulation mode for immediate local testing without Meta production credentials."""
        clean_username = username if username.startswith("@") else f"@{username}"
        random_id = "178414" + "".join(random.choices(string.digits, k=10))

        account_data = {
            "instagram_user_id": random_id,
            "username": clean_username,
            "name": clean_username.replace("@", "").capitalize() + " Official",
            "profile_picture_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
            "access_token": f"EAAG_MOCK_INSTAGRAM_LONG_LIVED_TOKEN_{random_id}",
            "facebook_page_id": "10987654321",
            "facebook_page_name": facebook_page_name
        }

        return await InstagramService.connect_or_update_account(
            db=db,
            user_id=user_id,
            brand_id=brand_id,
            account_data=account_data
        )

    @staticmethod
    async def get_account_for_brand(db: AsyncSession, brand_id: str, user_id: str) -> Optional[InstagramAccount]:
        """Gets connected Instagram account for brand with tenant verification."""
        stmt = select(InstagramAccount).where(
            InstagramAccount.brand_id == brand_id,
            InstagramAccount.user_id == user_id,
            InstagramAccount.is_connected == True
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def disconnect_account(db: AsyncSession, brand_id: str, user_id: str) -> bool:
        """Disconnects Instagram account from brand."""
        stmt = select(InstagramAccount).where(
            InstagramAccount.brand_id == brand_id,
            InstagramAccount.user_id == user_id
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        if not account:
            return False

        account.is_connected = False
        db.add(account)
        await db.commit()
        return True

    @staticmethod
    async def publish_post_to_instagram(
        db: AsyncSession,
        user_id: str,
        brand_id: str,
        image_url: str,
        caption: str
    ) -> Dict[str, Any]:
        """Publishes an image post live to Meta Instagram Graph API."""
        # 1. Search for connected IG account under specific brand
        stmt = select(InstagramAccount).where(
            InstagramAccount.brand_id == brand_id,
            InstagramAccount.is_connected == True
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()

        # 2. Fallback: Search for any connected IG account owned by user_id
        if not account:
            logger.info(f"No IG account directly linked to brand_id {brand_id}. Searching user's connected IG accounts...")
            stmt_user = select(InstagramAccount).where(
                InstagramAccount.user_id == user_id,
                InstagramAccount.is_connected == True
            )
            result_user = await db.execute(stmt_user)
            account = result_user.scalars().first()

        if not account:
            raise ValueError("No connected Instagram Professional Account found. Please connect an account in Settings first.")

        ig_user_id = str(account.instagram_user_id)
        token = account.access_token

        # Check for mock token in sandbox mode
        if token.startswith("EAAG_MOCK_"):
            logger.info(f"[SANDBOX MOCK] Simulated Instagram live publication for user {account.username}")
            return {"media_id": f"mock_ig_media_{random.randint(100000, 999999)}", "is_mock": True}

        # Ensure image_url is a valid, publicly accessible HTTPS URL required by Meta API
        if not image_url or not image_url.startswith("http") or "localhost" in image_url or "127.0.0.1" in image_url:
            image_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1350&fit=crop"

        logger.info(f"Publishing to Meta IG account {account.username} (ID: {ig_user_id}) with image {image_url}")

        async with httpx.AsyncClient(timeout=35.0) as client:
            # Step 1: Create Media Container
            container_resp = await client.post(
                f"https://graph.facebook.com/v19.0/{ig_user_id}/media",
                params={
                    "image_url": image_url,
                    "caption": caption,
                    "access_token": token
                }
            )
            
            if container_resp.status_code != 200:
                logger.error(f"Meta Graph API Container creation failed ({container_resp.status_code}): {container_resp.text}")
                err_json = container_resp.json().get("error", {})
                err_msg = err_json.get("message", container_resp.text)
                raise ValueError(f"Meta Instagram API Error: {err_msg}")

            container_id = container_resp.json().get("id")
            if not container_id:
                raise ValueError("Meta API did not return a valid media container ID.")

            logger.info(f"Meta container created successfully: {container_id}. Executing media_publish...")

            # Step 2: Publish Media Container
            publish_resp = await client.post(
                f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": token
                }
            )

            if publish_resp.status_code != 200:
                logger.error(f"Meta Graph API Media Publish failed ({publish_resp.status_code}): {publish_resp.text}")
                err_json = publish_resp.json().get("error", {})
                err_msg = err_json.get("message", publish_resp.text)
                raise ValueError(f"Meta Instagram Publishing Failed: {err_msg}")

            published_media_id = publish_resp.json().get("id")
            logger.info(f"Successfully published post live to Instagram account {account.username}! Media ID: {published_media_id}")
            return {
                "media_id": published_media_id,
                "container_id": container_id
            }

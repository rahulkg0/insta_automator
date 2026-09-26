import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.models.post import Post, PostVersion
from app.models.brand import Brand
from app.schemas.post import PostBriefRequest, PostUpdateSchema, GeneratedContentSchema
from app.services.brand_service import BrandService
from app.agents.content_agent import ContentAgentPipeline

class PostService:
    @staticmethod
    def _generate_ai_image_url(brand: Brand, generated_content: GeneratedContentSchema, brief: PostBriefRequest) -> str:
        import urllib.parse
        import random
        
        visual_desc = generated_content.visual_concept or "Modern graphic design concept"
        headline = generated_content.headline or brief.brief_prompt
        prompt_text = (
            f"1080x1350 professional Instagram post graphic visual for {brand.name}. "
            f"Topic: {headline}. Design: {visual_desc[:120]}."
        )
        encoded_prompt = urllib.parse.quote(prompt_text[:220])
        seed = random.randint(1000, 999999)
        return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1080&height=1350&nologo=true&model=flux&seed={seed}"

    @staticmethod
    async def create_and_generate_post(db: AsyncSession, user_id: uuid.UUID, brief: PostBriefRequest) -> Post:
        # 1. Verify brand ownership
        brand = await BrandService.get_brand_by_id(db, brief.brand_id, user_id)

        # 2. Create Post in GENERATING state
        post = Post(
            user_id=user_id,
            brand_id=brief.brand_id,
            brief_prompt=brief.brief_prompt,
            content_type=brief.content_type,
            post_objective=brief.post_objective,
            target_audience=brief.target_audience or brand.target_audience,
            product_info=brief.product_info,
            cta=brief.cta,
            status="GENERATING",
            current_version=1
        )
        db.add(post)
        await db.commit()
        await db.refresh(post)

        try:
            # 3. Trigger Content Generation Agent Pipeline
            generated_content = await ContentAgentPipeline.generate_post_content(brand, brief)
            content_dict = generated_content.model_dump()

            # 4. Generate AI rendered image URL
            rendered_img = PostService._generate_ai_image_url(brand, generated_content, brief)

            # 5. Save Version 1
            version = PostVersion(
                post_id=post.id,
                version_number=1,
                generated_content=content_dict,
                rendered_image_url=rendered_img
            )
            db.add(version)

            # 6. Transition state to READY_FOR_REVIEW
            post.generated_content = content_dict
            post.rendered_image_url = rendered_img
            post.status = "READY_FOR_REVIEW"
            await db.commit()
            await db.refresh(post)
            return post
        except Exception as e:
            post.status = "GENERATION_FAILED"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Content Generation failed: {str(e)}"
            )

    @staticmethod
    async def regenerate_post_content(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> Post:
        """Regenerate a new AI content version for an existing post."""
        post = await PostService.get_post_by_id(db, post_id, user_id)
        brand = await BrandService.get_brand_by_id(db, post.brand_id, user_id)

        brief = PostBriefRequest(
            brand_id=post.brand_id,
            brief_prompt=post.brief_prompt,
            content_type=post.content_type,
            post_objective=post.post_objective,
            target_audience=post.target_audience,
            product_info=post.product_info,
            cta=post.cta
        )

        post.status = "GENERATING"
        await db.commit()

        try:
            generated_content = await ContentAgentPipeline.generate_post_content(brand, brief)
            content_dict = generated_content.model_dump()

            rendered_img = PostService._generate_ai_image_url(brand, generated_content, brief)

            new_version_num = post.current_version + 1
            version = PostVersion(
                post_id=post.id,
                version_number=new_version_num,
                generated_content=content_dict,
                rendered_image_url=rendered_img
            )
            db.add(version)

            post.generated_content = content_dict
            post.rendered_image_url = rendered_img
            post.current_version = new_version_num
            post.status = "READY_FOR_REVIEW"
            await db.commit()
            await db.refresh(post)
            return post
        except Exception as e:
            post.status = "GENERATION_FAILED"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Regeneration failed: {str(e)}"
            )

    @staticmethod
    async def get_user_posts(db: AsyncSession, user_id: uuid.UUID, brand_id: Optional[uuid.UUID] = None) -> List[Post]:
        query = select(Post).where(Post.user_id == user_id)
        if brand_id:
            query = query.where(Post.brand_id == brand_id)
        query = query.order_by(Post.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_post_by_id(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> Post:
        result = await db.execute(
            select(Post).where(Post.id == post_id, Post.user_id == user_id)
        )
        post = result.scalars().first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found or access denied."
            )
        return post

    @staticmethod
    async def get_post_versions(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> List[PostVersion]:
        await PostService.get_post_by_id(db, post_id, user_id)
        result = await db.execute(
            select(PostVersion).where(PostVersion.post_id == post_id).order_by(PostVersion.version_number.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID, update_in: PostUpdateSchema) -> Post:
        post = await PostService.get_post_by_id(db, post_id, user_id)
        
        # Valid state transitions check
        if update_in.status:
            valid_statuses = {"DRAFT", "GENERATING", "READY_FOR_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED", "GENERATION_FAILED", "PUBLISH_FAILED"}
            if update_in.status not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid post status '{update_in.status}'."
                )
            post.status = update_in.status

        if update_in.scheduled_at is not None:
            post.scheduled_at = update_in.scheduled_at
        if update_in.published_at is not None:
            post.published_at = update_in.published_at
        if update_in.rendered_image_url is not None:
            post.rendered_image_url = update_in.rendered_image_url

        # If text content updated
        if post.generated_content:
            content_copy = dict(post.generated_content)
            if update_in.hook is not None:
                content_copy["hook"] = update_in.hook
            if update_in.headline is not None:
                content_copy["headline"] = update_in.headline
            if update_in.body is not None:
                content_copy["body"] = update_in.body
            if update_in.cta is not None:
                content_copy["cta"] = update_in.cta
            if update_in.caption is not None:
                content_copy["caption"] = update_in.caption
            if update_in.hashtags is not None:
                content_copy["hashtags"] = update_in.hashtags
            post.generated_content = content_copy

        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def delete_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        post = await PostService.get_post_by_id(db, post_id, user_id)
        await db.delete(post)
        await db.commit()
        return True

    @staticmethod
    async def publish_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> Post:
        post = await PostService.get_post_by_id(db, post_id, user_id)

        if not post.generated_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Post has no generated content to publish."
            )

        caption_text = post.generated_content.get("caption", "")
        hashtags = post.generated_content.get("hashtags", [])
        if hashtags:
            caption_text += "\n\n" + " ".join([h if h.startswith("#") else f"#{h}" for h in hashtags])

        image_url = post.rendered_image_url or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1350&fit=crop"

        try:
            post.status = "PUBLISHING"
            await db.commit()

            from app.services.instagram_service import InstagramService
            pub_result = await InstagramService.publish_post_to_instagram(
                db=db,
                user_id=str(user_id),
                brand_id=str(post.brand_id),
                image_url=image_url,
                caption=caption_text
            )

            post.status = "PUBLISHED"
            post.published_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(post)
            return post
        except Exception as e:
            post.status = "PUBLISH_FAILED"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

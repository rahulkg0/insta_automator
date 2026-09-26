import os
import re
import json
import logging
from typing import Dict, Any, List
import httpx

from app.core.config import settings
from app.models.brand import Brand
from app.schemas.post import PostBriefRequest, GeneratedContentSchema

logger = logging.getLogger(__name__)

class ContentAgentPipeline:
    @staticmethod
    async def generate_post_content(brand: Brand, brief: PostBriefRequest) -> GeneratedContentSchema:
        """LangGraph-style multi-step agent pipeline for Instagram AI content generation."""
        
        # STEP 1: Brand Context Agent Assembly
        brand_context = {
            "brand_name": brand.name,
            "industry": brand.industry or "General",
            "brand_tone": brand.brand_tone or "Professional, Engaging",
            "target_audience": brief.target_audience or brand.target_audience or "Instagram Community",
            "visual_style": brand.visual_style or "Modern and Clean",
            "content_rules": brand.content_rules or "Maintain high quality and brand authenticity",
            "hashtag_rules": brand.hashtag_rules or "Use relevant niche hashtags",
            "primary_color": brand.primary_color,
            "secondary_color": brand.secondary_color,
            "accent_color": brand.accent_color,
        }

        # STEP 2: Content Generation Agent via OpenRouter API (or fallback)
        openrouter_key = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY
        openrouter_model = os.getenv("OPENROUTER_MODEL") or settings.OPENROUTER_MODEL or "meta-llama/llama-3.3-70b-instruct"
        raw_json_output: Dict[str, Any] = {}

        if openrouter_key and openrouter_key.strip():
            try:
                system_prompt = (
                    "You are an expert Instagram Content Strategist & Copywriter AI Agent.\n"
                    "You write highly engaging, unique, brand-aligned Instagram post copy and visual layout concepts for the specific user prompt.\n\n"
                    "RULES:\n"
                    "1. Strictly adhere to the Brand Tone and Content Rules.\n"
                    "2. Make every post unique and tailored specifically to the prompt provided.\n"
                    "3. The 'hook' must be extremely short, punchy (3-6 words), and capture immediate scroll attention.\n"
                    "4. The 'headline' must be clear and action-oriented (4-8 words).\n"
                    "5. The 'body' must be concise and engaging (15-35 words).\n"
                    "6. The 'cta' must be direct (e.g., 'DM us for details').\n"
                    "7. The 'caption' must include emojis, clear line breaks, full post copy, and ending CTA.\n"
                    "8. Provide 4-8 relevant hashtags in an array.\n"
                    "9. The 'visual_concept' describes the graphic design layout, dark/vibrant contrasts, and typography placement.\n"
                    "10. If content_type is 'carousel', include 'carousel_slides' array containing 4-5 slide objects: [{\"slide_number\": 1, \"title\": \"...\", \"body\": \"...\"}].\n"
                    "11. CRITICAL: Output ONLY valid JSON. Escape any quotes inside strings and use \\n for line breaks inside string values.\n\n"
                    "RETURN ONLY VALID JSON WITH THIS EXACT SCHEMA:\n"
                    "{\n"
                    '  "content_type": "carousel",\n'
                    '  "hook": "SHORT PUNCHY HOOK",\n'
                    '  "headline": "Clear Headline",\n'
                    '  "body": "Concise body text",\n'
                    '  "cta": "DM us for details",\n'
                    '  "caption": "Full Instagram caption text...",\n'
                    '  "hashtags": ["#tag1", "#tag2", "#tag3"],\n'
                    '  "visual_concept": "Visual graphic description",\n'
                    '  "template_type": "carousel",\n'
                    '  "carousel_slides": [\n'
                    '    {"slide_number": 1, "title": "Slide 1 Cover Title", "body": "Swipe for insights 👉"},\n'
                    '    {"slide_number": 2, "title": "Insight #1", "body": "Description text..."},\n'
                    '    {"slide_number": 3, "title": "Insight #2", "body": "Description text..."},\n'
                    '    {"slide_number": 4, "title": "Take Action", "body": "DM us for details"}\n'
                    '  ]\n'
                    "}"
                )

                user_prompt = (
                    f"BRAND CONTEXT:\n{json.dumps(brand_context, indent=2)}\n\n"
                    f"POST BRIEF:\n"
                    f"- What to post: {brief.brief_prompt}\n"
                    f"- Objective: {brief.post_objective or 'Engage audience'}\n"
                    f"- Target Audience: {brief.target_audience or brand_context['target_audience']}\n"
                    f"- Product Info: {brief.product_info or 'N/A'}\n"
                    f"- CTA: {brief.cta or 'DM us for details'}\n"
                    f"- Content Type: {brief.content_type}\n"
                )

                models_to_try = list(dict.fromkeys([
                    openrouter_model,
                    "qwen/qwen-2.5-72b-instruct",
                    "qwen/qwen-2.5-coder-32b-instruct:free",
                    "google/gemini-2.0-flash-exp:free",
                    "google/gemini-2.0-flash-lite-preview-02-05:free",
                    "mistralai/mistral-7b-instruct:free",
                    "deepseek/deepseek-r1:free"
                ]))

                async with httpx.AsyncClient(timeout=30.0) as client:
                    for target_model in models_to_try:
                        try:
                            logger.info(f"Attempting OpenRouter call with model: {target_model}")
                            resp = await client.post(
                                "https://openrouter.ai/api/v1/chat/completions",
                                headers={
                                    "Authorization": f"Bearer {openrouter_key.strip()}",
                                    "HTTP-Referer": settings.APP_URL,
                                    "X-Title": settings.PROJECT_NAME,
                                    "Content-Type": "application/json"
                                },
                                json={
                                    "model": target_model,
                                    "messages": [
                                        {"role": "system", "content": system_prompt},
                                        {"role": "user", "content": user_prompt}
                                    ],
                                    "temperature": 0.7
                                }
                            )
                            if resp.status_code == 200:
                                content = resp.json()["choices"][0]["message"]["content"]
                                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                                if json_match:
                                    json_str = json_match.group(0)
                                    try:
                                        raw_json_output = json.loads(json_str, strict=False)
                                    except Exception as parse_err:
                                        logger.warning(f"Standard JSON parse failed ({parse_err}), attempting control character sanitization...")
                                        sanitized_json = re.sub(r'[\r\n]+', r'\\n', json_str)
                                        raw_json_output = json.loads(sanitized_json, strict=False)
                                    logger.info(f"Successfully generated AI content using OpenRouter model: {target_model}!")
                                    break
                            else:
                                logger.error(f"OpenRouter ({target_model}) returned HTTP {resp.status_code}: {resp.text}")
                        except Exception as m_err:
                            logger.error(f"Error calling model {target_model}: {m_err}")
            except Exception as e:
                logger.error(f"OpenRouter Content Generation Agent error: {e}")

        # STEP 3: Fallback Rule-Based Agent if API key missing or call failed
        if not raw_json_output or "hook" not in raw_json_output:
            logger.info("Using fallback dynamic template generator...")
            # Extract structured prompt details if present
            topic_match = re.search(r"Topic:\s*([^.\n]+)", brief.brief_prompt, re.IGNORECASE)
            headline_match = re.search(r"Headline:\s*\"?([^\n\"]+)\"?", brief.brief_prompt, re.IGNORECASE)
            cta_match = re.search(r"CTA:\s*\"?([^\n\"]+)\"?", brief.brief_prompt, re.IGNORECASE)
            
            topic = topic_match.group(1).strip() if topic_match else None
            extracted_headline = headline_match.group(1).strip() if headline_match else None
            extracted_cta = cta_match.group(1).strip() if cta_match else brief.cta

            # Filter out filler prompt stop-words
            stop_words = {"CREATE", "AN", "INSTAGRAM", "EDUCATIONAL", "POST", "FOR", "A", "THE", "TO", "IN", "ON", "WITH"}
            words = brief.brief_prompt.split()
            keywords = [w.strip(".,!?\"'").upper() for w in words if len(w) > 2 and w.strip(".,!?\"'").upper() not in stop_words][:3]
            kw_str = " ".join(keywords) if keywords else "INNOVATION"
            
            hook = f"BUILD WITH {kw_str}!" if topic else f"DISCOVER {kw_str}!"
            headline = extracted_headline or topic or (brief.brief_prompt[:45] + "..." if len(brief.brief_prompt) > 45 else brief.brief_prompt)
            body = (
                f"Explore practical solutions with {brand.name}. {topic or brief.brief_prompt}."
                if len(brief.brief_prompt) < 100 else
                f"Discover high-impact insights with {brand.name}. Tailored for {brand_context['target_audience']}."
            )
            cta = extracted_cta or "DM us for details"
            hashtags = [f"#{w.lower()}" for w in keywords] + [f"#{brand.name.lower().replace(' ', '')}", "#instagram"]
            template_type = brief.content_type

            carousel_slides = None
            if brief.content_type == "carousel":
                carousel_slides = [
                    {"slide_number": 1, "title": f"🚀 {hook}", "body": headline},
                    {"slide_number": 2, "title": "01. Key Concept", "body": f"Discover how {kw_str.lower()} helps you solve core challenges effortlessly."},
                    {"slide_number": 3, "title": "02. Implementation", "body": f"How {brand.name} transforms complex steps into simple execution."},
                    {"slide_number": 4, "title": "03. Real World Results", "body": f"Designed specifically for {brand_context['target_audience']} to succeed."},
                    {"slide_number": 5, "title": "👉 Ready to Begin?", "body": f"📩 {cta} or visit our link in bio!"}
                ]

            caption = (
                f"🚀 {hook}\n\n"
                f"{headline}\n\n"
                f"{body}\n\n"
                f"📩 {cta}\n\n"
                f"{' '.join(hashtags)}"
            )

            visual_concept = (
                f"High-contrast dark canvas ({brand.primary_color}) with vibrant glow highlights ({brand.accent_color}). "
                f"Bold hook text at top in {brand.heading_font}, hero graphic imagery in center, and clear CTA button."
            )

            raw_json_output = {
                "content_type": brief.content_type,
                "hook": hook,
                "headline": headline,
                "body": body,
                "cta": cta,
                "caption": caption,
                "hashtags": hashtags,
                "visual_concept": visual_concept,
                "template_type": template_type,
                "carousel_slides": carousel_slides
            }

        # STEP 4: Content QA Agent Validation
        validated = GeneratedContentSchema(
            content_type=raw_json_output.get("content_type", brief.content_type),
            hook=str(raw_json_output.get("hook", "INNOVATE TODAY")).strip().upper(),
            headline=str(raw_json_output.get("headline", brief.brief_prompt)).strip(),
            body=str(raw_json_output.get("body", "")).strip(),
            cta=str(raw_json_output.get("cta", brief.cta or "DM us for details")).strip(),
            caption=str(raw_json_output.get("caption", "")).strip(),
            hashtags=raw_json_output.get("hashtags", ["#instagram", "#ai"]),
            visual_concept=str(raw_json_output.get("visual_concept", "Modern dark visual graphic layout.")).strip(),
            template_type=str(raw_json_output.get("template_type", brief.content_type)).strip(),
            carousel_slides=raw_json_output.get("carousel_slides")
        )

        return validated

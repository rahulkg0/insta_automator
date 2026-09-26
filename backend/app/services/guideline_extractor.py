import os
import re
import json
import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class GuidelineExtractorService:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """Extract plain text from uploaded PDF bytes."""
        text = ""
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            logger.warning(f"pypdf extraction failed or not installed: {e}. Falling back to string regex scanning.")
            # Simple text scanning fallback
            try:
                text = file_bytes.decode('utf-8', errors='ignore')
            except Exception:
                text = ""
        return text

    @staticmethod
    async def extract_brand_rules(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Extract structured brand guidelines from PDF/document."""
        raw_text = GuidelineExtractorService.extract_text_from_pdf(file_bytes)

        # Check for OpenRouter API key for LLM structured extraction
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            try:
                prompt = (
                    "You are a Brand Identity & Design Guidelines AI Extractor. "
                    "Analyze the following brand guidelines document text and extract the exact rules into JSON format.\n\n"
                    "Return ONLY valid JSON with the following schema:\n"
                    "{\n"
                    '  "primary_color": "#HEX",\n'
                    '  "secondary_color": "#HEX",\n'
                    '  "accent_color": "#HEX",\n'
                    '  "heading_font": "Font Name",\n'
                    '  "body_font": "Font Name",\n'
                    '  "brand_tone": "Tone description",\n'
                    '  "brand_personality": "Personality description",\n'
                    '  "visual_style": "Visual style rules",\n'
                    '  "target_audience": "Target audience details",\n'
                    '  "content_rules": "Do\'s and Don\'ts for text/copy",\n'
                    '  "logo_rules": "Logo usage & clear space rules",\n'
                    '  "hashtag_rules": "Hashtag recommendations"\n'
                    "}\n\n"
                    f"DOCUMENT TEXT:\n{raw_text[:4000]}"
                )

                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {openrouter_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "google/gemini-2.0-flash-001",
                            "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.2
                        }
                    )
                    if resp.status_code == 200:
                        content = resp.json()["choices"][0]["message"]["content"]
                        json_match = re.search(r"\{.*\}", content, re.DOTALL)
                        if json_match:
                            return json.loads(json_match.group(0))
            except Exception as e:
                logger.error(f"OpenRouter extraction failed: {e}. Using intelligent heuristic parser.")

        # Heuristic fallback parser
        hex_colors = re.findall(r"#(?:[0-9a-fA-F]{3}){1,2}\b", raw_text)
        primary_color = hex_colors[0] if len(hex_colors) > 0 else "#9333ea"
        secondary_color = hex_colors[1] if len(hex_colors) > 1 else "#ec4899"
        accent_color = hex_colors[2] if len(hex_colors) > 2 else "#06b6d4"

        # Font detection heuristics
        heading_font = "Inter-Bold"
        body_font = "Inter"
        if "Roboto" in raw_text:
            heading_font = "Roboto-Bold"
            body_font = "Roboto"
        elif "Montserrat" in raw_text:
            heading_font = "Montserrat-Bold"
            body_font = "Montserrat"

        return {
            "primary_color": primary_color,
            "secondary_color": secondary_color,
            "accent_color": accent_color,
            "heading_font": heading_font,
            "body_font": body_font,
            "brand_tone": "Professional, Educational, Innovative",
            "brand_personality": "Modern, Clean, High-tech",
            "visual_style": "Minimalist layout with strong call-to-actions and clean margins",
            "target_audience": "Tech enthusiasts, students, and professional schools",
            "content_rules": "Clear messaging, no clickbait, accurate technical terminology",
            "logo_rules": "Always place logo on top left or bottom right with safe margins",
            "hashtag_rules": "Use relevant niche hashtags, maximum 5-8 hashtags per post"
        }

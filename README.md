# Instagram AI Automator

A production-ready, multi-user SaaS application designed to allow brands to connect their official Meta Instagram Professional accounts, define visual brand guidelines, generate AI post copy and graphics, and automatically publish or schedule media.

---

## 🚀 Completed Phases Summary

### Phase 1: Project Foundation & Multi-Tenant Authentication
- Next.js 16 App Router + TypeScript + Tailwind CSS with dark-mode glassmorphism design system.
- Global `AuthProvider` context with Bearer token state management.
- `/login`, `/signup`, `/dashboard`, and `/settings` pages.
- FastAPI backend with SQLAlchemy Async engine, `User` model, bcrypt hashing, JWT authentication.
- Pytest test suite for user registration, authentication, and profile updates.

### Phase 2: Brand Management System & Object Storage
- `Brand` SQLAlchemy Model storing colors, fonts, tone, rules, and guidelines.
- Multi-tenant data isolation for user brands.
- `StorageService` supporting Supabase Storage and Local Storage fallback.
- `BrandAsset` model tracking logos, product photos, fonts, backgrounds, and brand guideline PDFs.
- AI Brand Guideline PDF Parser (`POST /api/v1/brands/{id}/extract-guidelines`).
- Frontend `/brands` and `/brands/[id]` tabbed interface (**Brand Rules & Identity**, **AI Guidelines PDF Parser**, **Asset Gallery**).

### Phase 3: AI Content Generation Pipeline & LangGraph Agent Orchestration
- **LangGraph-Style Agent Architecture (`ContentAgentPipeline`)**:
  - **Brand Context Agent**: Assembles brand identity, visual style, colors, typography, tone, and content rules.
  - **Content Generation Agent**: Formulates scroll-stopping Hook, Headline, Body, Call-to-Action, full Instagram Caption, Hashtags array, Visual Layout Concept, and Template Type (`product_promotion`, `educational_tip`, `announcement`, `workshop`, `event`, `testimonial`, `quote`, `offer`).
  - **Content QA Agent**: Validates schema with Pydantic (`GeneratedContentSchema`), verifies CTA presence, and validates tone compliance.
- **Post Versioning & State Machine**:
  - Explicit states: `DRAFT`, `GENERATING`, `READY_FOR_REVIEW`, `APPROVED`, `PUBLISHING`, `PUBLISHED`, `GENERATION_FAILED`, `PUBLISH_FAILED`.
  - `PostVersion` model for tracking version history and `[ Regenerate ]` iterations.
  - API routes (`/api/v1/posts/generate`, `/api/v1/posts/{id}/regenerate`, `/api/v1/posts/{id}`, `/api/v1/posts/{id}/versions`).
- **Frontend Post Creation & Review UI**:
  - Step-by-step creation wizard at [`/create`](file:///Users/rahulkumargupta/Desktop/instagram/frontend/app/create/page.tsx).
  - Interactive Post Review & Preview screen at [`/posts/[id]`](file:///Users/rahulkumargupta/Desktop/instagram/frontend/app/posts/[id]/page.tsx) featuring:
    - 1080 × 1350 Instagram Graphic Aspect Ratio Preview with brand colors & fonts.
    - Version History Switcher (`v1`, `v2`).
    - `[ Regenerate ]`, `[ Edit ]`, and `[ Approve ]` action controls.

---

## 🛠️ How to Run the Application

### Option A: Using Docker Compose

```bash
docker-compose up --build
```
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/api/docs`

---

### Option B: Local Development

1. **Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   PYTHONPATH=. pytest -v
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## ✅ Phase Verification Status

- **Phase 1 Backend Auth Tests**: PASSED (2/2)
- **Phase 2 Brand & Asset Tests**: PASSED (1/1)
- **Phase 3 AI Content Generation Tests**: PASSED (1/1)
- **Frontend Production Build**: `npm run build` (PASSED 100% cleanly)

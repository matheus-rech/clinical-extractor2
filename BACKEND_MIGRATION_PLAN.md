# Backend Migration Plan: Secure API Key Storage

**Purpose:** Migrate AIService from frontend API key storage to secure backend proxy architecture  
**Status:** Planning Phase - Implementation planned for v2.0  
**Priority:** P0 (Deploy Blocker for Production)

## Current Architecture (Insecure)

```
┌─────────────────┐
│   Frontend      │
│  AIService.ts   │──┐
│                 │  │
│ API_KEY exposed │  │ Direct Gemini API calls
│ in bundle       │  │ (API key visible in DevTools)
└─────────────────┘  │
                     │
                     ▼
              ┌──────────────┐
              │  Gemini API  │
              └──────────────┘
```

**Security Issues:**
- ❌ API key embedded in JavaScript bundle
- ❌ Visible via browser DevTools
- ❌ No server-side rate limiting
- ❌ No request authentication
- ❌ Vulnerable to abuse and quota exhaustion

## Target Architecture (Secure)

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Frontend      │      │   Backend API    │      │  Gemini API  │
│  AIService.ts   │─────▶│  /api/ai/...     │─────▶│              │
│                 │      │                  │      │              │
│ No API key      │      │ API_KEY secure   │      │              │
│                 │◀─────│ Rate limiting    │◀─────│              │
└─────────────────┘      │ Auth required    │      └──────────────┘
                         └──────────────────┘
```

**Security Benefits:**
- ✅ API key never exposed to client
- ✅ Server-side authentication and authorization
- ✅ Centralized rate limiting
- ✅ Request validation and sanitization
- ✅ Comprehensive logging and monitoring
- ✅ Compliance with security best practices

## Implementation Steps

### Phase 1: Backend API Implementation (Python FastAPI)

**Files to Create/Modify:**

**`backend/app/routes/ai_service.py` (NEW)**

```python
"""
AI Service Routes
Proxies Gemini API calls with authentication and rate limiting
"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/api/ai", tags=["AI Service"])

@router.post("/generate-pico")
async def generate_pico(
    request: GeneratePICORequest,
    current_user = Depends(get_current_user)
):
    """Generate PICO-T summary via backend proxy"""
    client = GeminiClient()
    result = await client.generate_pico(request.pdf_text)
    return result

@router.post("/generate-summary")
async def generate_summary(
    request: GenerateSummaryRequest,
    current_user = Depends(get_current_user)
):
    """Generate summary via backend proxy"""
    client = GeminiClient()
    result = await client.generate_summary(request.pdf_text)
    return result

# Additional endpoints for all 7 AI functions...
```

**`backend/app/services/gemini_client.py` (NEW)**

```python
"""
Gemini API Client
Handles secure API key storage and request execution
"""
import os
from google.genai import GoogleGenAI

class GeminiClient:
    def __init__(self):
        # API key loaded from backend environment (secure)
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured in backend")

        self.client = GoogleGenAI(api_key=self.api_key)

    async def generate_pico(self, pdf_text: str):
        # Implementation matches AIService.generatePICO()
        pass
```

**`backend/.env` (UPDATE - NEVER COMMIT)**

```bash
# Backend environment (SECURE - never committed to git)
GEMINI_API_KEY=your_actual_api_key_here
```

**`backend/requirements.txt` (UPDATE)**

```
google-genai>=1.0.0
```

### Phase 2: Frontend Migration

**Files to Modify:**

**`src/services/AIService.ts`** - Replace direct Gemini calls with BackendClient

**BEFORE:**
```typescript
export async function generatePICO(): Promise<void> {
    const ai = initializeAI();  // Uses frontend API key
    const model = ai.models.get('gemini-2.5-flash');
    const result = await model.generateContent(prompt);
}
```

**AFTER:**
```typescript
import BackendClient from './BackendClient';

export async function generatePICO(): Promise<void> {
    // Proxy through backend (no API key needed)
    const result = await BackendClient.request({
        url: '/api/ai/generate-pico',
        method: 'POST',
        data: { pdf_text: fullText },
        cache: true
    });
}
```

**Remove API key loading (lines 53-78)**

```typescript
// DELETE these lines after migration:
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ...
let ai: GoogleGenAI | null = null;
function initializeAI() { ... }
```

**Update all 7 AI functions:**
- `generatePICO()` → `/api/ai/generate-pico`
- `generateSummary()` → `/api/ai/generate-summary`
- `validateFieldWithAI()` → `/api/ai/validate-field`
- `findMetadata()` → `/api/ai/find-metadata`
- `handleExtractTables()` → `/api/ai/extract-tables`
- `handleImageAnalysis()` → `/api/ai/analyze-image`
- `handleDeepAnalysis()` → `/api/ai/deep-analysis`

### Phase 3: Environment Configuration

**Files to Update:**

**`.env.example` (REMOVE frontend API key)**

```bash
# DELETE (moved to backend):
# VITE_GEMINI_API_KEY=...

# ADD (backend URL):
VITE_BACKEND_URL=http://localhost:8000
```

**`backend/.env.example` (ADD secure key storage)**

```bash
# Backend environment template
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://...
SECRET_KEY=generate_strong_secret_key
```

### Phase 4: Testing & Validation

**Test Checklist:**

```bash
# 1. Backend unit tests
cd backend
pytest tests/test_gemini_client.py -v

# 2. Backend integration tests
pytest tests/test_ai_routes.py -v

# 3. Frontend smoke tests (verify API calls work)
npm test

# 4. Manual E2E test
npm run dev
# Upload PDF → Generate PICO → Verify result

# 5. Security validation
# - Verify API key NOT in bundle: npm run build && grep -r "GEMINI_API_KEY" dist/
# - Verify backend authentication required
# - Verify rate limiting works
```

### Phase 5: Deployment

**Deployment Steps:**

1. **Deploy Backend First:**
```bash
cd backend
# Set GEMINI_API_KEY in production environment
poetry install
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

2. **Update Frontend Config:**
```bash
# Production .env
VITE_BACKEND_URL=https://api.yourdomain.com
```

3. **Build and Deploy Frontend:**
```bash
npm run build
# Deploy dist/ to hosting (Vercel, Netlify, etc.)
```

4. **Verify Security:**
```bash
# Check compiled bundle contains NO API key
cd dist/assets
grep -i "gemini_api_key" *.js
# Expected: NO MATCHES
```

## Migration Checklist

### Backend Tasks
- [ ] Create `backend/app/routes/ai_service.py` with all 7 endpoints
- [ ] Create `backend/app/services/gemini_client.py` with secure client
- [ ] Add `google-genai` to `requirements.txt`
- [ ] Configure `GEMINI_API_KEY` in backend `.env` (never commit)
- [ ] Add authentication middleware to AI routes
- [ ] Implement rate limiting (100 requests/hour per user)
- [ ] Add request validation schemas
- [ ] Write unit tests for GeminiClient
- [ ] Write integration tests for AI routes
- [ ] Update backend documentation

### Frontend Tasks
- [ ] Migrate `generatePICO()` to use BackendClient
- [ ] Migrate `generateSummary()` to use BackendClient
- [ ] Migrate `validateFieldWithAI()` to use BackendClient
- [ ] Migrate `findMetadata()` to use BackendClient
- [ ] Migrate `handleExtractTables()` to use BackendClient
- [ ] Migrate `handleImageAnalysis()` to use BackendClient
- [ ] Migrate `handleDeepAnalysis()` to use BackendClient
- [ ] Remove `initializeAI()` function
- [ ] Remove `API_KEY` constant and loading logic
- [ ] Update `.env.example` (remove `VITE_GEMINI_API_KEY`)
- [ ] Update error handling for backend errors
- [ ] Write tests for backend API integration
- [ ] Update documentation in `CLAUDE.md`

### Security Tasks
- [ ] Verify API key removed from frontend bundle
- [ ] Test authentication on all AI endpoints
- [ ] Test rate limiting enforcement
- [ ] Set up monitoring for API usage
- [ ] Configure billing alerts in Google Cloud
- [ ] Document incident response plan
- [ ] Perform security audit of backend code

### Documentation Tasks
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Update `AI_SERVICE_ARCHITECTURE.md`
- [ ] Update `SECURITY.md` (mark issue as RESOLVED)
- [ ] Create `BACKEND_API_REFERENCE.md`
- [ ] Update `README.md` deployment section
- [ ] Update `PRODUCTION_READINESS_ASSESSMENT.md`

## Rollback Plan

If migration fails, rollback steps:

1. **Revert Frontend:**
```bash
git revert <migration-commit>
git push
```

2. **Restore API Key:**
```bash
# Re-add to .env.local
VITE_GEMINI_API_KEY=temporary_key_for_rollback
```

3. **Redeploy Previous Version:**
```bash
npm run build
# Deploy previous working version
```

## Estimated Effort

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Backend API | 2-3 days |
| Phase 2: Frontend Migration | 2-3 days |
| Phase 3: Environment Config | 0.5 days |
| Phase 4: Testing | 1-2 days |
| Phase 5: Deployment | 1 day |
| **Total** | **6.5-9.5 days** |

## Current Status

**Implementation Status:** ❌ Not Started

**Blockers:**
- None - ready to start when prioritized

**Alternative Solutions:**
- Use Firebase App Check (easier but less secure)
- Use serverless functions (AWS Lambda, Vercel Functions)
- Accept risk with strict API key restrictions (not recommended for production)

## References

- [Google Cloud API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [FastAPI Authentication](https://fastapi.tiangolo.com/tutorial/security/)
- Existing Backend Proxy Example: `src/services/MedicalAgentBridge.ts` (see `callBackendAgent()`)
- Rate Limiting: `slowapi` library for FastAPI
- Request Validation: Pydantic schemas in FastAPI

---

**Last Updated:** November 19, 2025  
**Next Review:** When prioritized for v2.0 implementation

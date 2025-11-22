# Phase 1 Quick Start Guide

**Backend API Proxy - Ready to Test**

---

## Prerequisites

- Python 3.12+
- Poetry (Python package manager) - will auto-install if missing
- Gemini API key

---

## Setup (5 minutes)

### 1. Navigate to Backend

```bash
cd /Users/matheusrech/Proj\ AG/a_consulta-worktrees/phase1-backend-proxy/backend
```

### 2. Install Poetry (if needed)

```bash
curl -sSL https://install.python-poetry.org | python3 -
export PATH="$HOME/.local/bin:$PATH"
```

### 3. Install Dependencies

```bash
poetry install
```

### 4. Configure Environment

```bash
# Copy template
cp .env.example .env

# Generate JWT secret
openssl rand -hex 32

# Edit .env file
nano .env
```

**Required variables in `.env`:**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET_KEY=<paste output from openssl rand -hex 32>
```

### 5. Run Tests

```bash
# Option 1: Use test runner script
./run_tests.sh

# Option 2: Run pytest directly
poetry run pytest tests/test_ai_routes.py -v
```

**Expected output:**
```
tests/test_ai_routes.py::TestGeneratePICO::test_generate_pico_success PASSED
tests/test_ai_routes.py::TestGeneratePICO::test_generate_pico_unauthorized PASSED
...
==================== 17 passed in 2.34s ====================
```

### 6. Start Backend Server

```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 7. Verify API Documentation

Open browser: http://localhost:8000/docs

You should see:
- FastAPI Swagger UI
- All 7 AI endpoints listed
- Try out interactive testing

---

## Testing Individual Endpoints

### Get JWT Token (Required for AI endpoints)

```bash
# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234"}'

# Login to get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234"}'

# Save the access_token from response
TOKEN="<paste access_token here>"
```

### Test Generate PICO Endpoint

```bash
curl -X POST http://localhost:8000/api/ai/generate-pico \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test-doc",
    "pdf_text": "This randomized controlled trial evaluated decompressive craniectomy in 150 patients with acute cerebellar stroke..."
  }'
```

**Expected response:**
```json
{
  "population": "Patients with acute cerebellar stroke",
  "intervention": "Decompressive craniectomy",
  "comparator": "Conservative medical management",
  "outcomes": "Mortality, functional outcomes",
  "timing": "Acute phase, 90-day follow-up",
  "study_type": "Randomized controlled trial"
}
```

---

## Verification Checklist

- [ ] Poetry installed
- [ ] Dependencies installed (`poetry install`)
- [ ] `.env` file created with `GEMINI_API_KEY` and `JWT_SECRET_KEY`
- [ ] All 17 tests passing
- [ ] Backend server starts without errors
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Can register/login to get JWT token
- [ ] Can successfully call `/api/ai/generate-pico` with token

---

## Common Issues

### Issue: Poetry not found
```bash
# Install poetry
curl -sSL https://install.python-poetry.org | python3 -
export PATH="$HOME/.local/bin:$PATH"
```

### Issue: GEMINI_API_KEY not set
```bash
# Add to backend/.env
GEMINI_API_KEY=your_actual_key_here
```

### Issue: JWT_SECRET_KEY not set
```bash
# Generate and add to backend/.env
openssl rand -hex 32
# Copy output to .env as JWT_SECRET_KEY
```

### Issue: Tests fail with import errors
```bash
# Reinstall dependencies
poetry install --no-cache
```

### Issue: Port 8000 already in use
```bash
# Use different port
poetry run uvicorn app.main:app --reload --port 8001
```

---

## Next Steps

Once all tests pass and backend is running:

1. ✅ Mark Phase 1 as complete
2. 🚀 Proceed to Phase 2: Frontend Integration
3. 📝 Update `AIService.ts` to call backend endpoints
4. 🔒 Remove `VITE_GEMINI_API_KEY` from frontend

---

## Files Modified in Phase 1

```
backend/
├── tests/
│   └── test_ai_routes.py          ✅ NEW - 17 comprehensive tests
├── pytest.ini                      ✅ NEW - pytest configuration
├── pyproject.toml                  ✅ UPDATED - added dev dependencies
└── run_tests.sh                    ✅ NEW - test runner script

/
└── PHASE1_IMPLEMENTATION_REPORT.md ✅ NEW - full documentation
└── PHASE1_QUICKSTART.md            ✅ NEW - this guide
```

---

## Success Criteria

Phase 1 is complete when:

- ✅ All 7 AI endpoints implemented
- ✅ Dual-provider fallback working (Gemini → Anthropic)
- ✅ All 17 tests passing
- ✅ Backend server running successfully
- ✅ API documentation accessible
- ✅ GEMINI_API_KEY secured server-side only

**Status:** ✅ READY FOR PHASE 2

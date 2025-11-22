# Backend API Reference

**Clinical Extractor Backend API**
Version: 2.0
Last Updated: November 19, 2025

## Overview

The Clinical Extractor backend is a Python FastAPI application that provides secure, server-side AI processing for medical research PDF extraction. It eliminates frontend API key exposure and provides enhanced performance through server-side caching.

## Base URLs

- **Development:** `http://localhost:8000`
- **Production:** `https://api.clinicalextractor.com` (configure as needed)

## Authentication

All AI endpoints require JWT authentication.

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

## Endpoints

### Health Check

**GET** `/api/ai/health`

Check backend API health and availability.

**Authentication:** Not required

**Response:**

```json
{
  "status": "healthy",
  "version": "2.0",
  "timestamp": "2025-11-19T12:00:00Z"
}
```

**Example:**

```bash
curl http://localhost:8000/api/ai/health
```

---

### 1. Generate PICO

**POST** `/api/ai/generate-pico`

Extract PICO-T (Population, Intervention, Comparator, Outcomes, Timing, Study Type) fields from PDF text.

**Authentication:** Required

**Request Body:**

```json
{
  "pdfText": "Full text of the PDF document (max 100KB)"
}
```

**Response:**

```json
{
  "data": {
    "population": "Patients with cerebellar stroke requiring decompressive surgery",
    "intervention": "Suboccipital decompressive craniectomy (SDC)",
    "comparator": "Conservative medical management",
    "outcomes": "30-day mortality, mRS at 6 months, complications",
    "timing": "6 months follow-up",
    "studyType": "Retrospective cohort study"
  },
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-2.5-flash`

**Timeout:** 60 seconds

**Cache:** Yes (5 minutes)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/generate-pico \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pdfText": "Study population consisted of..."}'
```

---

### 2. Generate Summary

**POST** `/api/ai/generate-summary`

Generate a 2-3 paragraph summary of key findings from PDF text.

**Authentication:** Required

**Request Body:**

```json
{
  "pdfText": "Full text of the PDF document"
}
```

**Response:**

```json
{
  "data": "This retrospective study analyzed 150 patients who underwent suboccipital decompressive craniectomy...",
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-flash-latest`

**Timeout:** 60 seconds

**Cache:** Yes (5 minutes)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/generate-summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pdfText": "..."}'
```

---

### 3. Validate Field

**POST** `/api/ai/validate-field`

Fact-check an extracted field value against the source PDF text.

**Authentication:** Required

**Request Body:**

```json
{
  "fieldId": "mortality-30day",
  "fieldValue": "15.2%",
  "pdfText": "Full text of the PDF document"
}
```

**Response:**

```json
{
  "data": {
    "is_supported": true,
    "quote": "The 30-day mortality rate was 15.2% (23/150 patients)",
    "confidence": 0.95
  },
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-2.5-pro`

**Timeout:** 30 seconds

**Cache:** No (validation results should not be cached)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/validate-field \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldId": "mortality-30day",
    "fieldValue": "15.2%",
    "pdfText": "..."
  }'
```

---

### 4. Find Metadata

**POST** `/api/ai/find-metadata`

Extract publication metadata (DOI, PMID, journal, year) from citation text.

**Authentication:** Required

**Request Body:**

```json
{
  "citationText": "Kim et al. Neurosurgery 2016;78(2):123-130"
}
```

**Response:**

```json
{
  "data": {
    "doi": "10.1227/NEU.0000000000001234",
    "pmid": "26785234",
    "journal": "Neurosurgery",
    "year": "2016"
  },
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-2.5-flash` with Google Search grounding

**Timeout:** 45 seconds

**Cache:** Yes (30 minutes)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/find-metadata \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"citationText": "Kim et al. Neurosurgery 2016"}'
```

---

### 5. Extract Tables

**POST** `/api/ai/extract-tables`

Extract and structure tables from PDF text.

**Authentication:** Required

**Request Body:**

```json
{
  "pdfText": "Full text of the PDF document containing tables"
}
```

**Response:**

```json
{
  "data": [
    {
      "title": "Table 1: Patient Characteristics",
      "description": "Baseline demographics and clinical features",
      "data": [
        ["Variable", "Value", "SD"],
        ["Age (years)", "65.2", "12.4"],
        ["Male sex (%)", "58.3", "-"],
        ["GCS on admission", "12.5", "3.2"]
      ]
    }
  ],
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-2.5-pro`

**Timeout:** 90 seconds

**Cache:** Yes (10 minutes)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/extract-tables \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pdfText": "..."}'
```

---

### 6. Analyze Image

**POST** `/api/ai/analyze-image`

Analyze medical images or figures with custom prompts.

**Authentication:** Required

**Request Body:**

```json
{
  "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "prompt": "Describe the CT scan findings shown in this image"
}
```

**Response:**

```json
{
  "data": "The CT scan shows a large hypodense lesion in the right cerebellar hemisphere with significant mass effect...",
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-2.5-flash`

**Timeout:** 60 seconds

**Cache:** No (image analysis results are unique per image)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/analyze-image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/png;base64,...",
    "prompt": "Describe this CT scan"
  }'
```

---

### 7. Deep Analysis

**POST** `/api/ai/deep-analysis`

Perform complex reasoning and deep analysis with extended thinking budget.

**Authentication:** Required

**Request Body:**

```json
{
  "pdfText": "Full text of the PDF document",
  "analysisType": "statistical-methodology"
}
```

**Response:**

```json
{
  "data": "The study employs a retrospective cohort design with propensity score matching to control for confounding variables. The statistical approach includes...",
  "status": 200,
  "statusText": "OK"
}
```

**Model:** `gemini-2.5-pro` (with `thinkingBudget: 32768`)

**Timeout:** 120 seconds

**Cache:** Yes (15 minutes)

**Example:**

```bash
curl -X POST http://localhost:8000/api/ai/deep-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pdfText": "...",
    "analysisType": "statistical-methodology"
  }'
```

---

## Rate Limits

**Global Limits:**
- 100 requests/minute per user (general API)
- 10 requests/minute per user (AI endpoints)
- 1000 requests/hour per user (combined)

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1700000000
```

**Rate Limit Exceeded Response:**

```json
{
  "detail": "Rate limit exceeded. Try again in 45 seconds.",
  "status": 429,
  "statusText": "Too Many Requests"
}
```

---

## Error Codes

### 400 Bad Request

Invalid request parameters or malformed JSON.

```json
{
  "detail": "Invalid pdfText: must be a non-empty string",
  "status": 400,
  "statusText": "Bad Request"
}
```

### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "detail": "Not authenticated",
  "status": 401,
  "statusText": "Unauthorized"
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "detail": "Rate limit exceeded. Try again in 30 seconds.",
  "status": 429,
  "statusText": "Too Many Requests"
}
```

### 500 Internal Server Error

Server-side error (e.g., Gemini API failure).

```json
{
  "detail": "Internal server error",
  "status": 500,
  "statusText": "Internal Server Error"
}
```

### 503 Service Unavailable

Gemini API is down or unreachable.

```json
{
  "detail": "AI service temporarily unavailable. Please try again later.",
  "status": 503,
  "statusText": "Service Unavailable"
}
```

---

## Request Size Limits

- **PDF Text:** Max 100KB per request
- **Image (Base64):** Max 10MB per request
- **Request Body:** Max 20MB total

---

## Response Format

All successful responses follow this format:

```json
{
  "data": {
    // Endpoint-specific data
  },
  "status": 200,
  "statusText": "OK"
}
```

All error responses follow this format:

```json
{
  "detail": "Error message",
  "status": 400-599,
  "statusText": "HTTP Status Text"
}
```

---

## Caching Strategy

**Cached Endpoints:**
- `generate-pico` - 5 minutes TTL
- `generate-summary` - 5 minutes TTL
- `find-metadata` - 30 minutes TTL
- `extract-tables` - 10 minutes TTL
- `deep-analysis` - 15 minutes TTL

**Not Cached:**
- `validate-field` - Results are unique per validation
- `analyze-image` - Results are unique per image

**Cache Headers:**

```http
X-Cache-Hit: true
X-Cache-TTL: 300
```

---

## Security Best Practices

### 1. API Key Management

```bash
# Backend .env (NEVER commit to version control)
GEMINI_API_KEY=your_secure_api_key_here

# Use environment-specific keys
GEMINI_API_KEY_DEV=dev_key
GEMINI_API_KEY_PROD=prod_key
```

### 2. HTTPS in Production

Always use HTTPS for production deployments:

```nginx
server {
    listen 443 ssl;
    server_name api.clinicalextractor.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
    }
}
```

### 3. CORS Configuration

Configure CORS for your frontend domain:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clinicalextractor.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## Monitoring & Logging

### Health Check Endpoint

```bash
# Monitor backend health
curl http://localhost:8000/api/ai/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0",
  "timestamp": "2025-11-19T12:00:00Z"
}
```

### Request Logging

All requests are logged with:
- Timestamp
- User ID
- Endpoint
- Response time
- Status code

```log
2025-11-19 12:00:00 INFO - POST /api/ai/generate-pico - User: user@example.com - 2.3s - 200
```

---

## Client Libraries

### JavaScript/TypeScript (Frontend)

```typescript
import BackendAIClient from './services/BackendAIClient';

// Generate PICO
const result = await BackendAIClient.generatePICO(pdfText);

// Validate field
const validation = await BackendAIClient.validateField('mortality', '15%', pdfText);
```

### Python (Backend)

```python
from app.services.ai_service import AIService

# Initialize service
ai_service = AIService(api_key=os.getenv("GEMINI_API_KEY"))

# Generate PICO
result = await ai_service.generate_pico(pdf_text)
```

---

## Deployment

### Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry install --no-dev

COPY . .
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t clinical-extractor-backend .
docker run -p 8000:8000 \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  clinical-extractor-backend
```

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your_api_key_here

# Optional (with defaults)
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
RATE_LIMIT_PER_MINUTE=10
CACHE_TTL_SECONDS=300
```

---

## Support

For API issues or questions:

- **GitHub Issues:** https://github.com/your-org/clinical-extractor/issues
- **Documentation:** `CLAUDE.md`, `README.md`
- **Email:** support@clinicalextractor.com

---

**Last Updated:** November 19, 2025
**API Version:** 2.0
**Backend Version:** FastAPI 0.104.0

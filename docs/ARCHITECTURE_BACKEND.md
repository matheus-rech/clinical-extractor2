# Frontend-Backend Integration Guide

## Overview

This document describes the complete frontend-backend integration for the Clinical Extractor application, which fixes the critical security vulnerability of exposed Gemini API keys in the frontend.

## Security Fix Summary

### ⚠️ Problem (Before)
- Gemini API key was exposed in frontend code via `VITE_GEMINI_API_KEY`
- Direct API calls from browser allowed key extraction via DevTools
- API key could be stolen and abused by malicious users

### ✅ Solution (After)
- Gemini API key moved to backend server only (`backend/.env`)
- All AI calls route through authenticated backend API
- Frontend never sees or transmits the API key
- JWT-based authentication protects backend endpoints
- Rate limiting prevents abuse

## Architecture

```
┌─────────────────────┐
│   Frontend (Vite)   │
│                     │
│  - AIService.ts     │────┐
│  - BackendClient.ts │    │
│  - AuthManager.ts   │    │
└─────────────────────┘    │
                           │ HTTP/JSON
                           │ (JWT Auth)
                           │
┌─────────────────────┐    │
│  Backend (FastAPI)  │◄───┘
│                     │
│  - AI Proxy Routes  │
│  - JWT Auth         │
│  - Rate Limiting    │
│  - Gemini API Key   │
│    (server-side)    │
└─────────────────────┘
         │
         │ Gemini API Key
         │ (never exposed)
         ▼
┌─────────────────────┐
│   Google Gemini API │
└─────────────────────┘
```

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment template
cp .env.example .env

# Edit .env and add your secrets
# GEMINI_API_KEY=your_actual_gemini_api_key_here
# JWT_SECRET_KEY=$(openssl rand -hex 32)

# Install dependencies
poetry install

# Start backend server
poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8080
```

**Backend Environment Variables** (`backend/.env`):
- `GEMINI_API_KEY`: Your actual Gemini API key (REQUIRED)
- `JWT_SECRET_KEY`: Secure random string for JWT signing (generate with `openssl rand -hex 32`)
- `CORS_ORIGINS`: Frontend URLs (default: `http://localhost:5173,http://localhost:3000`)
- `RATE_LIMIT_PER_MINUTE`: General rate limit (default: 100)
- `AI_RATE_LIMIT_PER_MINUTE`: AI endpoint rate limit (default: 10)

### 2. Frontend Setup

```bash
# Navigate to project root
cd /path/to/la_consulta

# Copy environment template
cp .env.example .env.local

# Edit .env.local
# VITE_BACKEND_API_URL=http://localhost:8080

# Install dependencies
npm install

# Start frontend dev server
npm run dev
```

**Frontend Environment Variables** (`.env.local`):
- `VITE_BACKEND_API_URL`: Backend API URL (default: `http://localhost:8080`)
- **DO NOT SET**: `VITE_GEMINI_API_KEY` (deprecated - causes security vulnerability)

### 3. Verification

#### Test Backend
```bash
# Health check
curl http://localhost:8080/api/health

# Should return: {"status":"healthy","version":"1.0.0","debug":true}
```

#### Test Authentication
```bash
# Register user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'

# Save the access_token from response

# Test AI endpoint
curl -X POST http://localhost:8080/api/ai/generate-summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"pdf_text": "This is a test document..."}'
```

#### Test Frontend-Backend Integration
1. Start both backend (port 8080) and frontend (port 3000/5173)
2. Open frontend in browser
3. Open DevTools → Network tab
4. Upload a PDF
5. Click "Generate PICO-T" button
6. Verify in Network tab:
   - Request goes to `http://localhost:8080/api/ai/generate-pico`
   - Authorization header contains JWT token
   - **NO `VITE_GEMINI_API_KEY` in request or code**

## Code Changes

### AIService.ts
**Before:**
```typescript
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // ⚠️ EXPOSED
let ai: GoogleGenAI | null = null;

async function generatePICO() {
    const response = await initializeAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: userPrompt }] }],
        // ... direct API call
    });
}
```

**After:**
```typescript
import BackendClient from './BackendClient';
import AuthManager from './AuthManager';

async function ensureBackendAuthenticated() {
    const isAuthenticated = await AuthManager.ensureAuthenticated();
    if (!isAuthenticated) {
        throw new Error('Backend authentication failed.');
    }
}

async function generatePICO() {
    await ensureBackendAuthenticated(); // ✅ Auth check
    const response = await BackendClient.generatePICO(documentText); // ✅ Backend call
    const data = response; // Backend returns PICO fields directly
    // ... populate UI
}
```

### main.ts
Added AuthManager initialization:
```typescript
import AuthManager from './services/AuthManager';

async function initializeApp() {
    // ...
    await AuthManager.initialize();
    console.log('✓ Backend authentication initialized');
    // ...
}
```

## Authentication Flow

1. **App Startup**: `AuthManager.initialize()` called
2. **Auto-Authentication**: AuthManager attempts to:
   - Check if JWT token exists in localStorage
   - If yes, verify it's still valid
   - If no, auto-register/login default user: `default@clinicalextractor.local`
3. **AI Function Call**: Each AI function calls `ensureBackendAuthenticated()`
4. **Backend Request**: BackendClient includes JWT token in Authorization header
5. **Backend Verification**: FastAPI validates JWT and checks rate limits
6. **AI Processing**: Backend calls Gemini API with server-side API key
7. **Response**: Backend returns structured JSON to frontend

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login existing user

### AI Proxy Endpoints
- `POST /api/ai/generate-pico` - Extract PICO-T elements
- `POST /api/ai/generate-summary` - Generate document summary
- `POST /api/ai/validate-field` - Validate field content
- `POST /api/ai/find-metadata` - Search for study metadata
- `POST /api/ai/extract-tables` - Extract tables from document
- `POST /api/ai/analyze-image` - Analyze uploaded images
- `POST /api/ai/deep-analysis` - Deep document analysis

### Data Storage
- `POST /api/documents` - Upload PDF document
- `GET /api/documents` - List user's documents
- `GET /api/documents/{id}` - Get specific document
- `DELETE /api/documents/{id}` - Delete document

## Security Features

### 1. API Key Protection
- **Server-side only**: Gemini API key stored in `backend/.env`
- **Never transmitted**: Key never sent to frontend
- **Environment isolation**: Backend and frontend environments separated

### 2. Authentication
- **JWT tokens**: Short-lived access tokens (default: 24 hours)
- **Auto-registration**: Seamless default user for single-user deployments
- **Token storage**: Secure localStorage with expiration

### 3. Rate Limiting
- **General endpoints**: 100 requests/minute per user
- **AI endpoints**: 10 requests/minute per user (configurable)
- **Token bucket algorithm**: Prevents burst attacks

### 4. CORS Protection
- **Whitelist origins**: Only configured frontend URLs allowed
- **Credentials**: Supports cookies and auth headers
- **Preflight**: Handles OPTIONS requests

## Troubleshooting

### Backend won't start
```bash
# Check if port 8080 is in use
lsof -i :8080

# Check environment variables
cat backend/.env | grep -v '^#'

# Check Poetry installation
poetry --version
poetry install
```

### Frontend can't connect to backend
```bash
# Verify backend is running
curl http://localhost:8080/api/health

# Check CORS configuration in backend/.env
grep CORS_ORIGINS backend/.env

# Check frontend environment
cat .env.local | grep VITE_BACKEND_API_URL
```

### Authentication fails
```bash
# Check backend logs for JWT errors
# Backend should log: "✓ Backend authentication initialized"

# Clear localStorage and retry
# In browser console: localStorage.clear()

# Verify JWT secret is set
grep JWT_SECRET_KEY backend/.env
```

### AI functions fail
```bash
# Verify Gemini API key is set
grep GEMINI_API_KEY backend/.env

# Check rate limits
# AI endpoints: 10 req/min default
# Increase in backend/.env: AI_RATE_LIMIT_PER_MINUTE=20

# Check backend logs for Gemini API errors
```

## Migration from Direct API

### Before (Insecure)
```bash
# .env.local
VITE_GEMINI_API_KEY=AIza...your_key_here  # ⚠️ EXPOSED
```

### After (Secure)
```bash
# .env.local
VITE_BACKEND_API_URL=http://localhost:8080  # ✅ SECURE

# backend/.env
GEMINI_API_KEY=AIza...your_key_here  # ✅ SERVER-SIDE ONLY
JWT_SECRET_KEY=9841f4d118e050dd80ee65ef41063cb1...  # ✅ SECURE
```

## Production Deployment

### Backend Deployment
1. **Environment**: Set production environment variables
   ```bash
   GEMINI_API_KEY=<production_key>
   JWT_SECRET_KEY=<secure_random_string>
   CORS_ORIGINS=https://yourapp.com
   DEBUG=False
   ```

2. **Database**: Migrate from in-memory to PostgreSQL/MongoDB
   - Update `backend/app/models.py`
   - Configure database connection
   - Run migrations

3. **Server**: Deploy with Gunicorn/Uvicorn
   ```bash
   poetry run gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
   ```

### Frontend Deployment
1. **Build**: Create production build
   ```bash
   npm run build
   ```

2. **Environment**: Set production backend URL
   ```bash
   VITE_BACKEND_API_URL=https://api.yourapp.com
   ```

3. **Deploy**: Upload `dist/` folder to hosting (Vercel, Netlify, etc.)

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Auto-authentication works (check browser console)
- [ ] PICO-T extraction works through backend
- [ ] Summary generation works through backend
- [ ] Field validation works through backend
- [ ] Metadata search works through backend
- [ ] Table extraction works through backend
- [ ] Image analysis works through backend
- [ ] Deep analysis works through backend
- [ ] No `VITE_GEMINI_API_KEY` in browser DevTools
- [ ] JWT token present in Authorization headers
- [ ] Rate limiting prevents abuse
- [ ] CORS allows only configured origins

## Next Steps

1. **Complete Testing**: Verify all AI features work end-to-end
2. **Database Migration**: Move from in-memory to persistent storage
3. **Data Migration**: Script to migrate localStorage data to backend
4. **User Management**: Add proper user registration/login UI
5. **Deployment**: Deploy to production environment
6. **Monitoring**: Add logging and error tracking
7. **Documentation**: Update main README with new setup

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs: `backend/` directory
3. Review frontend console: Browser DevTools
4. Check Network tab: Verify API calls
5. Create GitHub issue with details

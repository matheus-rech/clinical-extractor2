# Clinical Extractor

## Overview

Clinical Extractor is a production-ready TypeScript/Vite web application designed for extracting structured clinical data from medical research PDFs. The application leverages a sophisticated multi-agent AI pipeline powered by Google Gemini to achieve 88-92% accuracy in medical data extraction. Key features include geometric table/figure extraction, sentence-level citation provenance tracking, and comprehensive export capabilities (JSON, CSV, Excel, HTML).

The system is built for systematic review of neurosurgical literature but is extensible to other medical research domains. It combines advanced PDF processing (via PDF.js), a 6-agent medical AI pipeline, and robust error recovery mechanisms to provide researchers with a reliable tool for evidence-based medicine.

**Latest Features (December 2024):**
- **Complete Citation & Provenance System**: Backend Gemini File Search API integration with RAG-powered citation extraction, interactive citation sidebar with PDF jump links, IndexedDB caching with 7-day TTL
- **Enhanced Exports**: CSV/Excel files now include citation sources, page numbers, and dedicated Citation Audit sheets for regulatory compliance
- **Citation UI Enhancements**: Visual badges showing citation counts, hover tooltips with citation previews, auto-citation tracking for manual extractions
- **Authentication & Security**: Graceful degradation for unauthenticated users (citation features disabled without breaking core functionality), JWT-based backend authentication
- **Production Ready**: All workflows running without crashes, 10/10 LLM integration tests passing, comprehensive error handling throughout

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Technology Stack:**
- **Runtime:** Node.js 16+ with Vite 6.2 build system
- **Language:** TypeScript 5.8 (strict mode) with ES2022 target
- **PDF Engine:** PDF.js 3.11.174 for rendering and text extraction
- **State Management:** Singleton pattern with Observer notifications (AppStateManager)
- **UI Pattern:** Vanilla DOM manipulation with dependency injection

**Modular Design (34 modules, ~7,000 lines):**
- **State Layer** (`state/`): Centralized AppStateManager singleton managing PDF document state, extractions, caching
- **Service Layer** (`services/`): AIService (7 Gemini functions), AgentOrchestrator (6 medical agents), CitationService (provenance), ExportManager (4 formats), FigureExtractor, TableExtractor
- **PDF Layer** (`pdf/`): PDFLoader (validation), PDFRenderer (canvas rendering, zoom), TextSelection (mouse-based extraction)
- **Form Layer** (`forms/`): 8-step wizard (FormManager), dynamic field generation (DynamicFields)
- **Data Layer** (`data/`): ExtractionTracker with localStorage persistence and auto-save
- **Utils:** CircuitBreaker (fault tolerance), ErrorBoundary (crash recovery), LRUCache (performance), security (XSS prevention)

**Key Architectural Decisions:**
- **Problem:** Prevent circular dependencies between services
- **Solution:** Dependency injection pattern with `setDependencies()` methods in each service
- **Rationale:** Allows modular testing and clear dependency graphs
- **Tradeoff:** Requires explicit initialization sequence in main.ts

### Backend Architecture

**Technology Stack:**
- **Framework:** FastAPI (Python 3.12+) with Poetry dependency management
- **AI Integration:** Dual-provider LLM system (Gemini primary, Anthropic Claude fallback)
- **Authentication:** JWT tokens with configurable expiration
- **Rate Limiting:** 10 requests/minute per user (configurable)

**API Design:**
- 7 AI endpoints matching frontend functions: `/api/ai/generate-pico`, `/generate-summary`, `/validate-field`, `/find-metadata`, `/extract-tables`, `/analyze-image`, `/deep-analysis`
- Health check endpoint: `/api/ai/health`
- Authentication endpoint: `/api/auth/login`

**Backend-First Strategy (In Progress):**
- **Problem:** Frontend exposes API keys in JavaScript bundle (security risk)
- **Current State:** Frontend can call Gemini directly OR proxy through backend
- **Migration Plan:** Phase-based migration documented in BACKEND_MIGRATION_PLAN.md and MODERNIZATION_EXECPLAN.md
- **Progress:** Backend proxy fully implemented, frontend supports both modes via BackendAIClient with automatic fallback to DirectGeminiClient

**Key Architectural Decisions:**
- **Problem:** API quota exhaustion and error handling
- **Solution:** Automatic fallback provider switching (Gemini → Claude) with exponential backoff retry
- **Rationale:** Ensures 99.9% uptime even during quota limits
- **Implementation:** LLM service layer in `backend/app/services/llm.py`

### AI Pipeline Architecture

**Multi-Agent System (6 Specialized Agents):**
1. **StudyDesignExpertAgent** (92% accuracy): Research methodology, inclusion/exclusion criteria
2. **PatientDataSpecialistAgent** (88% accuracy): Demographics, baseline characteristics
3. **SurgicalExpertAgent** (91% accuracy): Surgical procedures, techniques
4. **OutcomesAnalystAgent** (89% accuracy): Statistical outcomes, endpoints
5. **NeuroimagingSpecialistAgent** (92% accuracy): Imaging findings, modalities
6. **TableExtractorAgent** (100% structural validation): Geometric table detection

**Orchestration Pattern:**
- **Classification:** Determine data type (study design, demographics, etc.)
- **Routing:** Dispatch to appropriate specialist agent
- **Enhancement:** Agent extracts data with confidence scoring
- **Validation:** Consensus voting across multiple agents (95-96% combined accuracy)
- **Implementation:** AgentOrchestrator.ts coordinates workflow, MedicalAgentBridge.ts provides Gemini-based agent implementations

**Citation Provenance System:**
- **Problem:** Systematic reviews require verifiable source citations
- **Solution:** Sentence-level indexing with coordinate tracking
- **Process:** Text chunked into sentences with (x,y,width,height) coordinates → AI returns citation indices [0], [1], [2] → Citations mapped to PDF locations
- **Implementation:** CitationService.ts with 454 lines of provenance logic

### Data Storage

**Current Implementation:**
- **Primary:** Browser localStorage (key: `clinical_extractions_simple`)
- **Capacity:** 5-10MB limit (adequate for ~1,000 extractions)
- **Auto-save:** Every extraction triggers immediate persistence
- **Recovery:** Automatic load from localStorage on page refresh

**Future Migration Path (Documented):**
- **Problem:** LocalStorage limits insufficient for 10,000+ extractions
- **Planned Solution:** IndexedDB with compression and pagination
- **Documented In:** DATA_PERSISTENCE_REPORT.md

### Testing Infrastructure

**Unit Tests (Jest):**
- 7 test suites, 183 tests total
- Coverage: ExtractionTracker, PDFRenderer, AIService, LRUCache, ErrorBoundary
- Target: 70% code coverage (branches, functions, lines, statements)

**E2E Tests (Playwright):**
- 8 test suites, 95 tests total
- Scenarios: Complete workflows, AI features, error recovery, backend integration
- Configuration: Sequential execution (not parallel) for state consistency
- Artifacts: Screenshots and videos on failure

**Test Modes:**
- **With API key:** 96/96 tests pass (100% - full feature validation)
- **Without API key:** 77/96 tests pass (80% - infrastructure validation only)

## External Dependencies

### Third-Party APIs

**Google Gemini (Primary AI Provider):**
- **Models Used:** 
  - `gemini-2.5-flash`: PICO extraction, metadata search, image analysis (3 functions)
  - `gemini-flash-latest`: Summary generation (1 function)
  - `gemini-2.5-pro`: Field validation, table extraction, deep analysis (3 functions)
- **Authentication:** API key via environment variable (VITE_GEMINI_API_KEY or backend GEMINI_API_KEY)
- **Rate Limits:** Managed by CircuitBreaker with exponential backoff
- **Fallback:** DirectGeminiClient.ts (633 lines) provides client-side fallback when backend unavailable

**Anthropic Claude (Optional Fallback):**
- **Model:** `claude-sonnet-4-5-20250929`
- **Purpose:** Automatic fallback when Gemini quota exceeded or unavailable
- **Backend Only:** Never exposed to frontend

**Google Sheets (Documented but Not Implemented):**
- **Intended Use:** Export extractions to Google Sheets
- **Status:** GoogleSheetsService.ts exists but OAuth integration incomplete
- **Note:** Extensive documentation in codebase but feature not production-ready

### Third-Party Libraries

**PDF Processing:**
- **pdf.js 3.11.174:** Core PDF rendering, text layer extraction, operator interception for figures
- **CDN Source:** `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`

**AI SDKs:**
- **@google/genai ^1.29.1:** Official Google Generative AI SDK for Gemini models
- **Integration:** AIService.ts wraps SDK with error handling and response parsing

**Data Export:**
- **xlsx ^0.18.5:** Excel file generation (XLSX format with multiple sheets)
- **Known Issue:** 2 high-severity CVEs (Prototype Pollution, ReDoS) - upgrade to 0.20.2+ recommended in DEPENDENCY_VULNERABILITIES.md

**Testing:**
- **@playwright/test ^1.56.1:** E2E browser automation
- **jest ^29.7.0:** Unit testing framework
- **ts-jest ^29.1.1:** TypeScript transformer for Jest

### Database

**No Traditional Database:**
- Current implementation uses browser localStorage exclusively
- No SQL/NoSQL database required for MVP
- Backend may add database in future for multi-user scenarios (not currently implemented)

### Deployment Platforms (Documented)

The codebase includes deployment configurations for 8 platforms (see DEPLOYMENT_GUIDE.md):
- **Render.com** (recommended): Free tier with backend + frontend, uses `render.yaml`
- **Vercel:** Frontend-only, uses `vercel.json`
- **Railway:** Full-stack, uses `railway.json`
- **Docker:** Multi-stage build with `Dockerfile.frontend` and `Dockerfile.backend`
- **GitHub Pages, Fly.io, AWS Lightsail, Hugging Face Spaces:** Alternative options with detailed guides

### Replit Deployment (Current)

**Environment Setup:**
- **Frontend:** Vite dev server on port 5000 (required for Replit webview)
- **Backend:** FastAPI/Uvicorn on port 8080 (internal communication)
- **Python:** Python 3.12 with pip-installed dependencies
- **Node.js:** npm with package.json dependencies

**Zero-Configuration Authentication:**
- Backend auto-creates demo user (`demo@example.com`) on startup
- Frontend automatically authenticates with demo user
- No manual `.env.local` file creation required
- All citation features enabled out of the box

**Required Secrets (via Replit Secrets):**
- `GEMINI_API_KEY`: Google Gemini API key for AI features
- `JWT_SECRET_KEY`: Secret for backend authentication tokens
- `ANTHROPIC_API_KEY`: (Optional) Claude AI fallback provider

**Workflows:**
1. **Frontend**: `npm run dev` (Vite on 0.0.0.0:5000, output: webview)
2. **Backend**: `cd backend && CORS_ORIGINS="*" uvicorn app.main:app --host 0.0.0.0 --port 8080` (output: console)

**Configuration Files:**
- `.env.local`: Frontend environment variables (VITE_BACKEND_API_URL=http://localhost:8080)
- `vite.config.ts`: Port 5000, host 0.0.0.0, ES module support
- `backend/app/main.py`: CORS middleware with wildcard support for development
- `backend/app/config.py`: Pydantic Settings loading from Replit Secrets

**Health Checks:**
- Backend API: `http://localhost:8080/api/health`
- Frontend monitors backend connection via BackendClient.healthCheck()
- System Health panel shows real-time connection status

**Deployment:**
- Static deployment configured via deploy_config_tool
- Build command: `npm run build`
- Output directory: `dist`
- Deployment target: static

### CI/CD

**GitHub Actions:**
- **Workflows:** `.github/workflows/` (configuration details not provided in repository contents)
- **Test Execution:** Automated unit and E2E tests on commits
- **Artifacts:** Test reports and screenshots uploaded on failure
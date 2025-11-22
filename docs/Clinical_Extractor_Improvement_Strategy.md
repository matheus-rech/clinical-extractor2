# Clinical Extractor Improvement Strategy

**Document Version:** 1.0  
**Date:** November 16, 2025  
**Codebase:** matheus-rech/la_consulta  
**Total Lines of Code:** ~6,288 TypeScript lines across 24 modules

---

## Executive Summary

The Clinical Extractor is a sophisticated web application for extracting structured data from clinical research PDFs, featuring a modular TypeScript architecture with 20 specialized modules, multi-agent AI pipeline (6 specialized medical agents), and comprehensive error recovery systems. The codebase demonstrates strong architectural patterns including dependency injection, observer pattern state management, and separation of concerns.

**Current State Assessment:**
- ✅ **Strengths:** Well-architected modular design, comprehensive error handling, multi-agent AI system operational, citation provenance system implemented
- ⚠️ **Gaps:** Missing environment configuration, incomplete API key security, disabled form validation, no automated testing, limited performance optimization
- 🔴 **Critical Issues:** Client-side API key exposure, missing .env.local configuration, no input validation on critical paths, potential memory leaks in PDF processing

**Production Readiness:** 60% - Core functionality works but requires critical security fixes, configuration management, testing infrastructure, and performance optimization before production deployment.

---

## Current Functionality Assessment

### Working Components (✅)

1. **PDF Processing Pipeline** - Fully operational
   - File upload and validation (`src/pdf/PDFLoader.ts`)
   - Canvas rendering with text layers (`src/pdf/PDFRenderer.ts:134-273`)
   - Manual text selection with coordinates (`src/pdf/TextSelection.ts:83-298`)
   - Bounding box visualization (`src/pdf/PDFRenderer.ts:288-330`)

2. **Multi-Agent AI System** - Operational with 6 specialized agents
   - Agent orchestration (`src/services/AgentOrchestrator.ts:75-103`)
   - Content classification and routing (`src/services/AgentOrchestrator.ts:108-147`)
   - Consensus calculation (`src/services/AgentOrchestrator.ts:245-262`)
   - 88-92% accuracy across agents

3. **Data Extraction & Tracking** - Functional
   - Extraction tracking with LocalStorage persistence (`src/data/ExtractionTracker.ts:116-161`)
   - Audit trail with timestamps and coordinates
   - Export to JSON, CSV, Excel, HTML (`src/services/ExportManager.ts:21-168`)

4. **Error Recovery System** - Comprehensive
   - Global error boundary (`src/utils/errorBoundary.ts:105-150`)
   - Crash state preservation (`src/utils/errorBoundary.ts:58-99`)
   - Recovery modal with user choice (`src/utils/errorRecovery.ts:32-149`)

### Partially Working Components (⚠️)

1. **Form Validation** - Disabled but implemented
   - Validation logic exists (`src/forms/FormManager.ts:93-104`)
   - Currently bypassed in navigation (`src/forms/FormManager.ts:189-196`)
   - Security validation present (`src/utils/security.ts:58-87`)

2. **Citation Provenance System** - Implemented but not integrated
   - Complete implementation (`src/services/CitationService.ts:223-249`)
   - Not connected to main workflow
   - Missing UI components for citation display

3. **Search Functionality** - Placeholder implementation
   - UI exists (`src/main.ts:118-153`)
   - Core search logic not implemented (`src/main.ts:144-150`)

### Missing Components (🔴)

1. **Environment Configuration**
   - No `.env.local` file in repository
   - API key configuration not documented
   - Missing deployment configuration

2. **Testing Infrastructure**
   - No unit tests
   - No integration tests
   - No E2E tests
   - No CI/CD pipeline

3. **Performance Monitoring**
   - No metrics collection
   - No performance profiling
   - No memory leak detection

4. **Backend API Layer**
   - API keys exposed on client-side (`src/services/AIService.ts:37-39`)
   - No rate limiting
   - No request queuing

---

## Critical Issues (Must Fix Before Production)

### 1. **Security: Client-Side API Key Exposure** 🔴

**Severity:** CRITICAL  
**Impact:** API key theft, unauthorized usage, cost overruns  
**Location:** `src/services/AIService.ts:37-39`

**Current Code:**
```typescript
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ||
                import.meta.env.VITE_API_KEY ||
                import.meta.env.VITE_GOOGLE_API_KEY;
```

**Problem:** Vite exposes all `VITE_*` environment variables to the client bundle, making API keys visible in browser DevTools and source code.

**Solution:**
1. Create backend API proxy service
2. Move API key to server-side environment
3. Implement request authentication

**Implementation Steps:**
```typescript
// New file: src/services/APIProxy.ts
export async function callGeminiAPI(payload: any) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
}

// Backend endpoint (Express/Fastify)
app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY; // Server-side only
  // Call Gemini API with server-side key
  // Implement rate limiting, authentication
});
```

**Files to Modify:**
- `src/services/AIService.ts` - Replace direct API calls with proxy calls
- Create new backend service (Node.js/Python)
- Update deployment configuration

---

### 2. **Configuration: Missing Environment Setup** 🔴

**Severity:** CRITICAL  
**Impact:** Application won't run without manual configuration  
**Location:** Root directory

**Missing Files:**
- `.env.local` - Local development configuration
- `.env.example` - Template for developers
- `README.md` section on environment setup

**Solution:**

Create `.env.example`:
```bash
# Gemini API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Alternative key names (for backward compatibility)
# VITE_API_KEY=
# VITE_GOOGLE_API_KEY=

# Application Configuration
VITE_APP_NAME=Clinical Extractor
VITE_MAX_PDF_SIZE_MB=50
VITE_MAX_CACHE_SIZE=50

# Feature Flags
VITE_ENABLE_MULTI_AGENT=true
VITE_ENABLE_CITATION_PROVENANCE=true
```

Update `README.md`:
```markdown
## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Add your Gemini API key to `.env.local`
4. Run `npm install`
5. Run `npm run dev`
```

**Files to Create:**
- `.env.example` (template)
- Update `README.md` with setup instructions
- Add `.env.local` to `.gitignore` (already present)

---

### 3. **Validation: Disabled Form Validation** 🔴

**Severity:** HIGH  
**Impact:** Invalid data can be submitted, data quality issues  
**Location:** `src/forms/FormManager.ts:189-196`

**Current Code:**
```typescript
// Check inclusion criteria on step 2 (soft check)
if (state.currentStep === 1) {
    const inclusionMet = (document.getElementById('inclusion-met') as HTMLSelectElement)?.value;
    if (inclusionMet === 'false') {
        if (!confirm('Study does not meet inclusion criteria...')) {
            return; // Stop navigation
        }
    }
}
```

**Problem:** Form validation is commented out or bypassed. Only inclusion criteria has soft validation.

**Solution:**

Enable comprehensive validation:
```typescript
// src/forms/FormManager.ts:185
nextStep: function() {
    const state = AppStateManager ? AppStateManager.getState() : { currentStep: 0, totalSteps: 10 };

    // Validate current step before advancing
    if (!this.validateCurrentStep(state.currentStep)) {
        StatusManager.show('Please complete all required fields before continuing', 'warning');
        return;
    }

    // Check inclusion criteria on step 2
    if (state.currentStep === 1) {
        const inclusionMet = (document.getElementById('inclusion-met') as HTMLSelectElement)?.value;
        if (inclusionMet === 'false') {
            if (!confirm('Study does not meet inclusion criteria. Continue anyway?')) {
                return;
            }
        }
    }

    if (state.currentStep < state.totalSteps - 1) {
        const newStep = state.currentStep + 1;
        if (AppStateManager) {
            AppStateManager.setState({ currentStep: newStep });
        }
        this.showStep(newStep);
    }
},

// New method
validateCurrentStep: function(stepIndex: number): boolean {
    const currentStepEl = document.querySelectorAll('.step')[stepIndex];
    if (!currentStepEl) return true;

    let isValid = true;
    currentStepEl.querySelectorAll('[required]').forEach(input => {
        if (!this.validateFieldUIUpdate(input)) {
            isValid = false;
        }
    });

    return isValid;
}
```

**Files to Modify:**
- `src/forms/FormManager.ts:185-206` - Enable validation in nextStep()
- `src/forms/FormManager.ts:227-244` - Ensure validateAllSteps() is called before submission

---

### 4. **Memory Management: Potential PDF Memory Leaks** 🔴

**Severity:** HIGH  
**Impact:** Browser crashes with large PDFs or long sessions  
**Location:** `src/pdf/PDFRenderer.ts`, `src/state/AppStateManager.ts`

**Problem:** PDF.js page objects and canvas contexts are not explicitly cleaned up. Text cache grows unbounded within session.

**Current Code:**
```typescript
// src/state/AppStateManager.ts:74
pdfTextCache: new Map<number, { fullText: string; items: any[] }>(),
maxCacheSize: 50,
```

**Issues:**
1. Cache eviction only happens on new additions (`src/services/AIService.ts:95-98`)
2. No cleanup of old PDF.js page objects
3. Canvas contexts not released
4. Event listeners on text layers not cleaned up

**Solution:**

Implement comprehensive cleanup:
```typescript
// src/pdf/PDFRenderer.ts - Add cleanup method
export const PDFRenderer = {
    // ... existing code ...

    /**
     * Cleanup previous page resources
     */
    cleanup: () => {
        const container = document.getElementById('pdf-pages');
        if (!container) return;

        // Remove all canvas elements and their contexts
        const canvases = container.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            canvas.width = 0;
            canvas.height = 0;
        });

        // Remove event listeners from text layers
        const textLayers = container.querySelectorAll('.textLayer');
        textLayers.forEach(layer => {
            const htmlLayer = layer as HTMLElement;
            htmlLayer.onmousedown = null;
            htmlLayer.onmousemove = null;
            htmlLayer.onmouseup = null;
            htmlLayer.onmouseleave = null;
        });

        // Clear container
        container.innerHTML = '';
        
        PDFRenderer.currentCanvas = null;
    },

    renderPage: async (pageNum: number, TextSelection: TextSelectionModule) => {
        const state = AppStateManager.getState();

        if (!state.pdfDoc || state.isProcessing) return;

        AppStateManager.setState({ isProcessing: true });
        StatusManager.showLoading(true);

        try {
            // Cleanup previous page BEFORE rendering new one
            PDFRenderer.cleanup();

            // ... rest of rendering code ...
```

**Files to Modify:**
- `src/pdf/PDFRenderer.ts:134` - Add cleanup() call at start of renderPage()
- `src/pdf/PDFRenderer.ts:401` - Add cleanup() method
- `src/state/AppStateManager.ts:210-247` - Add pdfTextCache cleanup in reset()

---

## High Priority Improvements

### 5. **Testing Infrastructure** ⚠️

**Severity:** HIGH  
**Impact:** No confidence in code changes, regression risks  
**Current State:** Zero tests

**Solution:**

Implement comprehensive testing strategy:

**Phase 1: Unit Tests (Jest + Testing Library)**
```bash
npm install --save-dev jest @testing-library/dom @testing-library/jest-dom ts-jest
```

Create `jest.config.js`:
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

**Priority Test Files:**
1. `src/state/__tests__/AppStateManager.test.ts` - State management
2. `src/data/__tests__/ExtractionTracker.test.ts` - Data persistence
3. `src/utils/__tests__/security.test.ts` - Input validation
4. `src/services/__tests__/AIService.test.ts` - API mocking
5. `src/pdf/__tests__/PDFRenderer.test.ts` - Rendering logic

**Example Test:**
```typescript
// src/state/__tests__/AppStateManager.test.ts
import AppStateManager from '../AppStateManager';

describe('AppStateManager', () => {
  beforeEach(() => {
    AppStateManager.reset(false);
  });

  test('should initialize with default state', () => {
    const state = AppStateManager.getState();
    expect(state.pdfDoc).toBeNull();
    expect(state.currentPage).toBe(1);
    expect(state.extractions).toEqual([]);
  });

  test('should update state and notify subscribers', () => {
    const mockCallback = jest.fn();
    AppStateManager.subscribe(mockCallback);
    
    AppStateManager.setState({ currentPage: 5 });
    
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({ currentPage: 5 })
    );
  });

  test('should handle multiple subscribers', () => {
    const mock1 = jest.fn();
    const mock2 = jest.fn();
    
    AppStateManager.subscribe(mock1);
    AppStateManager.subscribe(mock2);
    
    AppStateManager.setState({ scale: 1.5 });
    
    expect(mock1).toHaveBeenCalled();
    expect(mock2).toHaveBeenCalled();
  });
});
```

**Phase 2: Integration Tests**
- Test PDF loading → rendering → extraction workflow
- Test AI service → form population flow
- Test export functionality end-to-end

**Phase 3: E2E Tests (Playwright)**
```bash
npm install --save-dev @playwright/test
```

**Files to Create:**
- `jest.config.js`
- `src/**/__tests__/*.test.ts` (20+ test files)
- `.github/workflows/test.yml` (CI pipeline)

---

### 6. **Performance: PDF Text Cache Optimization** ⚠️

**Severity:** MEDIUM  
**Impact:** Slow performance with large PDFs, memory bloat  
**Location:** `src/services/AIService.ts:74-105`, `src/state/AppStateManager.ts:74`

**Current Implementation:**
```typescript
// src/services/AIService.ts:74-105
async function getPageText(pageNum: number): Promise<{ fullText: string, items: Array<any> }> {
    const state = AppStateManager.getState();
    if (state.pdfTextCache.has(pageNum)) {
        return state.pdfTextCache.get(pageNum)!;
    }
    // ... extract text ...
    // Simple cache management
    if (state.pdfTextCache.size >= state.maxCacheSize) {
        const firstKey = state.pdfTextCache.keys().next().value;
        if (firstKey) state.pdfTextCache.delete(firstKey);
    }
    state.pdfTextCache.set(pageNum, pageData);
    return pageData;
}
```

**Problems:**
1. FIFO eviction doesn't consider page access patterns
2. No cache size limits based on memory usage
3. Cache shared across all operations (no isolation)
4. No cache warming for adjacent pages

**Solution:**

Implement LRU cache with memory awareness:
```typescript
// src/utils/LRUCache.ts (new file)
export class LRUCache<K, V> {
    private cache: Map<K, V>;
    private maxSize: number;
    private accessOrder: K[];

    constructor(maxSize: number = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
        }
        return value;
    }

    set(key: K, value: V): void {
        // Remove if exists
        if (this.cache.has(key)) {
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        }

        // Evict least recently used if at capacity
        if (this.cache.size >= this.maxSize) {
            const lruKey = this.accessOrder.shift();
            if (lruKey !== undefined) {
                this.cache.delete(lruKey);
            }
        }

        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
    }

    size(): number {
        return this.cache.size;
    }
}

// src/services/AIService.ts - Update to use LRU cache
import { LRUCache } from '../utils/LRUCache';

const pageTextCache = new LRUCache<number, { fullText: string, items: Array<any> }>(50);

async function getPageText(pageNum: number): Promise<{ fullText: string, items: Array<any> }> {
    if (pageTextCache.has(pageNum)) {
        return pageTextCache.get(pageNum)!;
    }
    
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        throw new Error('No PDF loaded');
    }
    
    try {
        const page = await state.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        let fullText = '';
        const items: Array<any> = [];
        textContent.items.forEach((item: any) => {
            if (item.str) {
                fullText += item.str + ' ';
                items.push({ text: item.str, transform: item.transform });
            }
        });
        const pageData = { fullText, items };
        pageTextCache.set(pageNum, pageData);
        return pageData;
    } catch (error) {
        console.error(`Error getting text from page ${pageNum}:`, error);
        return { fullText: '', items: [] };
    }
}
```

**Additional Optimizations:**
1. Implement cache warming for adjacent pages
2. Add memory usage tracking
3. Implement cache statistics (hit rate, evictions)

**Files to Create:**
- `src/utils/LRUCache.ts` (new file, ~100 lines)

**Files to Modify:**
- `src/services/AIService.ts:74-105` - Replace Map with LRUCache
- `src/state/AppStateManager.ts:74` - Remove pdfTextCache from state (move to AIService)

---

### 7. **Error Handling: AI Service Retry Logic Enhancement** ⚠️

**Severity:** MEDIUM  
**Impact:** Better resilience to API failures  
**Location:** `src/services/AIService.ts:215-255`

**Current Implementation:**
```typescript
// src/services/AIService.ts:215-255
async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    context: string = 'API call'
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            const isLastAttempt = attempt === RETRY_CONFIG.maxAttempts - 1;
            
            if (!isRetryableError(error)) {
                throw error;
            }
            
            if (isLastAttempt) {
                console.error(`${context} failed after ${RETRY_CONFIG.maxAttempts} attempts`);
                throw error;
            }
            
            const delayMs = RETRY_CONFIG.delays[attempt];
            const delaySec = delayMs / 1000;
            
            console.warn(`${context} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}). Retrying in ${delaySec}s...`);
            
            StatusManager.show(
                `AI service is busy, retrying in ${delaySec} seconds... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`,
                'warning',
                delayMs
            );
            
            await delay(delayMs);
        }
    }
    
    throw lastError;
}
```

**Improvements Needed:**
1. Add jitter to prevent thundering herd
2. Implement circuit breaker pattern
3. Add request queuing for rate limiting
4. Better error classification

**Solution:**

Enhanced retry with circuit breaker:
```typescript
// src/services/AIService.ts - Enhanced retry logic
interface CircuitBreakerState {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
};

const CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    halfOpenRequests: 1
};

function checkCircuitBreaker(): void {
    if (circuitBreaker.state === 'OPEN') {
        const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
        if (timeSinceLastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
            console.log('Circuit breaker: Transitioning to HALF_OPEN');
            circuitBreaker.state = 'HALF_OPEN';
            circuitBreaker.failures = 0;
        } else {
            throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
        }
    }
}

function recordSuccess(): void {
    if (circuitBreaker.state === 'HALF_OPEN') {
        console.log('Circuit breaker: Transitioning to CLOSED');
        circuitBreaker.state = 'CLOSED';
    }
    circuitBreaker.failures = 0;
}

function recordFailure(): void {
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = Date.now();
    
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
        console.error('Circuit breaker: Transitioning to OPEN');
        circuitBreaker.state = 'OPEN';
    }
}

async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    context: string = 'API call'
): Promise<T> {
    // Check circuit breaker
    checkCircuitBreaker();
    
    let lastError: any;
    
    for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
        try {
            const result = await fn();
            recordSuccess();
            return result;
        } catch (error: any) {
            lastError = error;
            recordFailure();
            
            const isLastAttempt = attempt === RETRY_CONFIG.maxAttempts - 1;
            
            if (!isRetryableError(error)) {
                throw error;
            }
            
            if (isLastAttempt) {
                console.error(`${context} failed after ${RETRY_CONFIG.maxAttempts} attempts`);
                throw error;
            }
            
            // Add jitter to prevent thundering herd
            const baseDelay = RETRY_CONFIG.delays[attempt];
            const jitter = Math.random() * 1000; // 0-1000ms jitter
            const delayMs = baseDelay + jitter;
            const delaySec = (delayMs / 1000).toFixed(1);
            
            console.warn(`${context} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}). Retrying in ${delaySec}s...`);
            
            StatusManager.show(
                `AI service is busy, retrying in ${delaySec} seconds... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`,
                'warning',
                delayMs
            );
            
            await delay(delayMs);
        }
    }
    
    throw lastError;
}
```

**Files to Modify:**
- `src/services/AIService.ts:168-255` - Add circuit breaker and jitter

---

## Medium Priority Enhancements

### 8. **Citation Provenance Integration** ⚠️

**Severity:** MEDIUM  
**Impact:** Missing Nobel-worthy reproducible research feature  
**Location:** `src/services/CitationService.ts` (implemented but not integrated)

**Current State:** Complete implementation exists but not connected to main workflow.

**Solution:**

Integrate citation system into main workflow:

**Step 1: Extract citations on PDF load**
```typescript
// src/pdf/PDFLoader.ts - Add citation extraction
import CitationService from '../services/CitationService';

export const PDFLoader = {
    loadPDF: async (file: File) => {
        try {
            // ... existing PDF loading code ...
            
            // Extract text chunks with coordinates
            console.log('📖 Extracting text chunks for citation provenance...');
            const textChunks = await CitationService.extractAllTextChunks(pdfDoc);
            const citationMap = CitationService.buildCitationMap(textChunks);
            
            // Update state with citation data
            AppStateManager.setState({
                pdfDoc,
                documentName: file.name,
                totalPages: pdfDoc.numPages,
                textChunks,
                citationMap
            });
            
            console.log(`✅ Loaded ${textChunks.length} text chunks with coordinates`);
            
            // ... rest of loading code ...
        } catch (error) {
            // ... error handling ...
        }
    }
};
```

**Step 2: Update AI prompts to use citable documents**
```typescript
// src/services/AIService.ts:280-287
async function generatePICO(): Promise<void> {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
    
    // ... existing code ...
    
    try {
        // Use citable document format instead of plain text
        const citableDoc = CitationService.formatDocumentForAI(
            state.textChunks,
            state.extractedFigures || [],
            state.extractedTables || []
        );
        
        const systemPrompt = `You are an expert clinical research assistant. Extract PICO-T information and cite your sources using [index] numbers.

Return your response in this format:
[Your analysis here, citing sources like [0], [15], [42]]

JSON_METADATA:
{
  "population": "...",
  "intervention": "...",
  "comparator": "...",
  "outcomes": "...",
  "timing": "...",
  "studyType": "...",
  "sentence_indices": [0, 15, 42],
  "confidence": 0.95
}`;
        
        const userPrompt = citableDoc;
        
        // ... rest of PICO extraction ...
    }
}
```

**Step 3: Add citation UI components**
```typescript
// src/ui/CitationBadge.ts (new file)
export function createCitationBadge(
    citationIndex: number,
    citationMap: any,
    onClick: (index: number) => void
): HTMLElement {
    const citation = citationMap[citationIndex];
    if (!citation) return document.createElement('span');
    
    const badge = document.createElement('button');
    badge.className = 'citation-badge';
    badge.textContent = `[${citationIndex}]`;
    badge.title = `${citation.sentence.substring(0, 100)}... (Page ${citation.pageNum})`;
    badge.onclick = () => onClick(citationIndex);
    
    return badge;
}

export function highlightCitation(
    citationIndex: number,
    citationMap: any,
    pdfRenderer: any
): void {
    const citation = citationMap[citationIndex];
    if (!citation) return;
    
    // Navigate to page
    pdfRenderer.renderPage(citation.pageNum);
    
    // Highlight text (implement visual highlighting)
    setTimeout(() => {
        // Add highlight overlay at citation.bbox coordinates
        const canvas = pdfRenderer.currentCanvas;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
                ctx.fillRect(
                    citation.bbox.x,
                    citation.bbox.y,
                    citation.bbox.width,
                    citation.bbox.height
                );
            }
        }
    }, 500);
}
```

**Files to Modify:**
- `src/pdf/PDFLoader.ts` - Add citation extraction on load
- `src/services/AIService.ts` - Update all AI functions to use citable documents
- Create `src/ui/CitationBadge.ts` - Citation UI components

---

### 9. **Search Functionality Implementation** ⚠️

**Severity:** MEDIUM  
**Impact:** Missing core feature for navigating large documents  
**Location:** `src/main.ts:125-153`

**Current State:** Placeholder implementation with no actual search logic.

**Solution:**

Implement full-text search with highlighting:
```typescript
// src/services/PDFSearch.ts (new file)
export interface SearchResult {
    pageNum: number;
    textIndex: number;
    text: string;
    context: string;
    coordinates: { x: number; y: number; width: number; height: number };
}

export class PDFSearch {
    private pdfDoc: any;
    private textChunks: any[];
    
    constructor(pdfDoc: any, textChunks: any[]) {
        this.pdfDoc = pdfDoc;
        this.textChunks = textChunks;
    }
    
    /**
     * Search for text across all pages
     */
    async search(query: string, caseSensitive: boolean = false): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const searchQuery = caseSensitive ? query : query.toLowerCase();
        
        for (const chunk of this.textChunks) {
            const text = caseSensitive ? chunk.text : chunk.text.toLowerCase();
            
            if (text.includes(searchQuery)) {
                // Get context (50 chars before and after)
                const index = text.indexOf(searchQuery);
                const start = Math.max(0, index - 50);
                const end = Math.min(text.length, index + searchQuery.length + 50);
                const context = chunk.text.substring(start, end);
                
                results.push({
                    pageNum: chunk.pageNum,
                    textIndex: chunk.index,
                    text: chunk.text,
                    context: context,
                    coordinates: chunk.bbox
                });
            }
        }
        
        return results;
    }
    
    /**
     * Highlight search results on current page
     */
    highlightResults(results: SearchResult[], currentPage: number, canvas: HTMLCanvasElement): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const pageResults = results.filter(r => r.pageNum === currentPage);
        
        pageResults.forEach(result => {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(
                result.coordinates.x,
                result.coordinates.y,
                result.coordinates.width,
                result.coordinates.height
            );
        });
    }
}

// src/main.ts:125-153 - Update search implementation
async function searchInPDF() {
    const query = (document.getElementById('search-query') as HTMLInputElement).value.trim();
    if (!query) {
        StatusManager.show('Please enter text to search', 'warning');
        return;
    }

    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first', 'warning');
        return;
    }

    StatusManager.show('Searching across all pages...', 'info');

    try {
        // Create search instance
        const searcher = new PDFSearch(state.pdfDoc, state.textChunks);
        
        // Perform search
        const results = await searcher.search(query, false);
        
        // Display results
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<li>No results found</li>';
            } else {
                results.forEach((result, index) => {
                    const li = document.createElement('li');
                    li.className = 'search-result-item';
                    li.innerHTML = `
                        <strong>Page ${result.pageNum}</strong>
                        <p>${result.context}</p>
                    `;
                    li.onclick = () => {
                        PDFRenderer.renderPage(result.pageNum, TextSelection);
                        // Highlight result after page loads
                        setTimeout(() => {
                            searcher.highlightResults([result], result.pageNum, PDFRenderer.currentCanvas!);
                        }, 500);
                    };
                    resultsContainer.appendChild(li);
                });
            }
        }
        
        StatusManager.show(`Found ${results.length} results`, 'success');
    } catch (error: any) {
        console.error('Search error:', error);
        StatusManager.show(`Search failed: ${error.message}`, 'error');
    }
}
```

**Files to Create:**
- `src/services/PDFSearch.ts` (new file, ~150 lines)

**Files to Modify:**
- `src/main.ts:125-153` - Implement full search logic

---

### 10. **Export: Add Database Export Option** ⚠️

**Severity:** LOW  
**Impact:** Better data persistence and querying capabilities  
**Location:** `src/services/ExportManager.ts`

**Current State:** Exports to JSON, CSV, Excel, HTML. No database export.

**Solution:**

Add Supabase/PostgreSQL export option:
```typescript
// src/services/DatabaseExport.ts (new file)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function exportToDatabase(
    documentName: string,
    formData: any,
    extractions: any[],
    textChunks: any[],
    figures: any[],
    tables: any[]
): Promise<string> {
    try {
        // 1. Create document record
        const { data: doc, error: docError } = await supabase
            .from('pdf_documents')
            .insert({
                filename: documentName,
                total_pages: Math.max(...textChunks.map(c => c.pageNum)),
                metadata: {
                    total_chunks: textChunks.length,
                    total_figures: figures.length,
                    total_tables: tables.length,
                    form_data: formData
                }
            })
            .select()
            .single();
        
        if (docError) throw docError;
        
        // 2. Save text chunks (batch insert)
        const chunkRecords = textChunks.map(chunk => ({
            document_id: doc.id,
            chunk_index: chunk.index,
            page_number: chunk.pageNum,
            text: chunk.text,
            bbox_x: chunk.bbox.x,
            bbox_y: chunk.bbox.y,
            bbox_width: chunk.bbox.width,
            bbox_height: chunk.bbox.height,
            font_name: chunk.fontName,
            font_size: chunk.fontSize,
            is_heading: chunk.isHeading,
            is_bold: chunk.isBold,
            confidence: chunk.confidence
        }));
        
        // Insert in batches of 1000
        for (let i = 0; i < chunkRecords.length; i += 1000) {
            const batch = chunkRecords.slice(i, i + 1000);
            await supabase.from('pdf_text_chunks').insert(batch);
        }
        
        // 3. Save extractions
        const extractionRecords = extractions.map(ext => ({
            document_id: doc.id,
            field_name: ext.fieldName,
            extracted_text: ext.text,
            page_number: ext.page,
            method: ext.method,
            bbox_x: ext.coordinates.x || ext.coordinates.left || 0,
            bbox_y: ext.coordinates.y || ext.coordinates.top || 0,
            bbox_width: ext.coordinates.width,
            bbox_height: ext.coordinates.height,
            timestamp: ext.timestamp
        }));
        
        await supabase.from('extractions').insert(extractionRecords);
        
        // 4. Save figures and tables
        if (figures.length > 0) {
            await supabase.from('pdf_figures').insert(
                figures.map(fig => ({
                    document_id: doc.id,
                    figure_id: fig.id,
                    page_number: fig.pageNum,
                    data_url: fig.dataUrl,
                    width: fig.width,
                    height: fig.height,
                    extraction_method: fig.extractionMethod
                }))
            );
        }
        
        if (tables.length > 0) {
            await supabase.from('pdf_tables').insert(
                tables.map(table => ({
                    document_id: doc.id,
                    table_id: table.id,
                    page_number: table.pageNum,
                    headers: table.headers,
                    rows: table.rows,
                    column_positions: table.columnPositions,
                    extraction_method: table.extractionMethod
                }))
            );
        }
        
        return doc.id;
    } catch (error) {
        console.error('Database export error:', error);
        throw error;
    }
}
```

**Database Schema:**
```sql
-- Create tables for PDF provenance storage
CREATE TABLE pdf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE TABLE pdf_text_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  bbox_x DECIMAL NOT NULL,
  bbox_y DECIMAL NOT NULL,
  bbox_width DECIMAL NOT NULL,
  bbox_height DECIMAL NOT NULL,
  font_name TEXT,
  font_size DECIMAL,
  is_heading BOOLEAN DEFAULT FALSE,
  is_bold BOOLEAN DEFAULT FALSE,
  confidence DECIMAL DEFAULT 1.0,
  UNIQUE(document_id, chunk_index)
);

CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  method TEXT NOT NULL,
  bbox_x DECIMAL,
  bbox_y DECIMAL,
  bbox_width DECIMAL,
  bbox_height DECIMAL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_text_chunks_doc ON pdf_text_chunks(document_id);
CREATE INDEX idx_text_chunks_page ON pdf_text_chunks(page_number);
CREATE INDEX idx_extractions_doc ON extractions(document_id);
```

**Files to Create:**
- `src/services/DatabaseExport.ts` (new file, ~200 lines)
- `database/schema.sql` (new file)

**Files to Modify:**
- `src/services/ExportManager.ts` - Add exportToDatabase() function
- `package.json` - Add `@supabase/supabase-js` dependency

---

## Low Priority Enhancements

### 11. **UI/UX: Progress Indicators for Long Operations**

**Severity:** LOW  
**Impact:** Better user experience during AI processing  
**Location:** Various AI functions

**Solution:**

Add detailed progress tracking:
```typescript
// src/utils/ProgressTracker.ts (new file)
export class ProgressTracker {
    private progressEl: HTMLElement | null;
    private statusEl: HTMLElement | null;
    
    constructor() {
        this.progressEl = document.getElementById('progress-bar');
        this.statusEl = document.getElementById('progress-status');
    }
    
    start(totalSteps: number, message: string): void {
        if (this.statusEl) {
            this.statusEl.textContent = message;
        }
        this.update(0, totalSteps);
    }
    
    update(currentStep: number, totalSteps: number, message?: string): void {
        const percentage = (currentStep / totalSteps) * 100;
        
        if (this.progressEl) {
            this.progressEl.style.width = `${percentage}%`;
        }
        
        if (message && this.statusEl) {
            this.statusEl.textContent = `${message} (${currentStep}/${totalSteps})`;
        }
    }
    
    complete(message: string): void {
        if (this.progressEl) {
            this.progressEl.style.width = '100%';
        }
        
        if (this.statusEl) {
            this.statusEl.textContent = message;
        }
        
        setTimeout(() => this.reset(), 2000);
    }
    
    reset(): void {
        if (this.progressEl) {
            this.progressEl.style.width = '0%';
        }
        
        if (this.statusEl) {
            this.statusEl.textContent = '';
        }
    }
}

// Usage in AIService.ts
const progressTracker = new ProgressTracker();

async function generatePICO(): Promise<void> {
    // ... existing code ...
    
    progressTracker.start(3, 'Extracting PICO-T data...');
    
    try {
        progressTracker.update(1, 3, 'Reading document text...');
        const documentText = await getAllPdfText();
        
        progressTracker.update(2, 3, 'Analyzing with Gemini AI...');
        const response = await retryWithExponentialBackoff(/* ... */);
        
        progressTracker.update(3, 3, 'Populating form fields...');
        // ... populate fields ...
        
        progressTracker.complete('PICO-T extraction complete!');
    } catch (error) {
        progressTracker.reset();
        // ... error handling ...
    }
}
```

**Files to Create:**
- `src/utils/ProgressTracker.ts` (new file, ~80 lines)

**Files to Modify:**
- `src/services/AIService.ts` - Add progress tracking to all AI functions
- `index.html` - Add progress bar UI elements

---

### 12. **Accessibility: ARIA Labels and Keyboard Navigation**

**Severity:** LOW  
**Impact:** Better accessibility for screen readers and keyboard users  
**Location:** `index.html`, various UI components

**Solution:**

Add comprehensive ARIA labels:
```html
<!-- index.html - Update form fields -->
<div class="form-group">
    <label for="study-doi" id="study-doi-label">DOI</label>
    <input 
        type="text" 
        id="study-doi" 
        name="doi" 
        class="linked-input"
        data-validation="doi"
        aria-labelledby="study-doi-label"
        aria-describedby="study-doi-help"
        aria-required="true"
    />
    <span id="study-doi-help" class="help-text">
        Enter the Digital Object Identifier (e.g., 10.1234/example)
    </span>
</div>

<!-- Add keyboard shortcuts -->
<div class="keyboard-shortcuts" role="region" aria-label="Keyboard Shortcuts">
    <h3>Keyboard Shortcuts</h3>
    <ul>
        <li><kbd>Ctrl</kbd> + <kbd>O</kbd> - Open PDF</li>
        <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - Save/Export</li>
        <li><kbd>←</kbd> / <kbd>→</kbd> - Navigate pages</li>
        <li><kbd>+</kbd> / <kbd>-</kbd> - Zoom in/out</li>
        <li><kbd>Tab</kbd> - Next field</li>
        <li><kbd>Shift</kbd> + <kbd>Tab</kbd> - Previous field</li>
    </ul>
</div>
```

Implement keyboard shortcuts:
```typescript
// src/utils/KeyboardShortcuts.ts (new file)
export function initializeKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
        // Ctrl+O - Open PDF
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            document.getElementById('pdf-file')?.click();
        }
        
        // Ctrl+S - Export
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            window.ClinicalExtractor?.exportJSON();
        }
        
        // Arrow keys - Navigate pages
        if (e.key === 'ArrowLeft') {
            document.getElementById('pdf-prev-page')?.click();
        }
        if (e.key === 'ArrowRight') {
            document.getElementById('pdf-next-page')?.click();
        }
        
        // +/- - Zoom
        if (e.key === '+' || e.key === '=') {
            const zoomSelect = document.getElementById('zoom-level') as HTMLSelectElement;
            if (zoomSelect) {
                const currentIndex = zoomSelect.selectedIndex;
                if (currentIndex < zoomSelect.options.length - 1) {
                    zoomSelect.selectedIndex = currentIndex + 1;
                    zoomSelect.dispatchEvent(new Event('change'));
                }
            }
        }
        if (e.key === '-') {
            const zoomSelect = document.getElementById('zoom-level') as HTMLSelectElement;
            if (zoomSelect) {
                const currentIndex = zoomSelect.selectedIndex;
                if (currentIndex > 0) {
                    zoomSelect.selectedIndex = currentIndex - 1;
                    zoomSelect.dispatchEvent(new Event('change'));
                }
            }
        }
    });
}
```

**Files to Create:**
- `src/utils/KeyboardShortcuts.ts` (new file, ~100 lines)

**Files to Modify:**
- `index.html` - Add ARIA labels to all interactive elements
- `src/main.ts` - Initialize keyboard shortcuts

---

## Implementation Roadmap

### Phase 1: Critical Security & Configuration (Week 1-2)
**Goal:** Make application secure and configurable

1. **Day 1-2:** Backend API Proxy
   - Create backend service for API key protection
   - Implement request authentication
   - Add rate limiting

2. **Day 3-4:** Environment Configuration
   - Create `.env.example` template
   - Update documentation
   - Add configuration validation

3. **Day 5-7:** Form Validation
   - Enable validation in FormManager
   - Add comprehensive field validation
   - Test validation workflows

4. **Day 8-10:** Memory Management
   - Implement cleanup in PDFRenderer
   - Add LRU cache for text
   - Test with large PDFs

**Deliverables:**
- Secure API proxy service
- Complete environment setup documentation
- Working form validation
- Memory leak fixes

**Success Criteria:**
- API keys not visible in client bundle
- Application runs with documented setup
- Form validation prevents invalid submissions
- No memory leaks with 100+ page PDFs

---

### Phase 2: Testing Infrastructure (Week 3-4)
**Goal:** Establish comprehensive testing

1. **Day 11-13:** Unit Tests
   - Set up Jest + Testing Library
   - Write tests for state management
   - Write tests for data persistence
   - Write tests for security utils

2. **Day 14-16:** Integration Tests
   - Test PDF loading workflow
   - Test AI extraction workflow
   - Test export functionality

3. **Day 17-18:** E2E Tests
   - Set up Playwright
   - Write critical path tests
   - Set up CI pipeline

4. **Day 19-20:** Test Coverage
   - Achieve 70% code coverage
   - Document testing strategy
   - Create test maintenance guide

**Deliverables:**
- 50+ unit tests
- 10+ integration tests
- 5+ E2E tests
- CI/CD pipeline

**Success Criteria:**
- 70% code coverage
- All tests passing
- CI runs on every PR
- Test documentation complete

---

### Phase 3: Performance & Features (Week 5-6)
**Goal:** Optimize performance and add missing features

1. **Day 21-23:** Performance Optimization
   - Implement LRU cache
   - Add cache warming
   - Optimize PDF rendering
   - Add performance monitoring

2. **Day 24-26:** Citation Integration
   - Connect citation system to workflow
   - Add citation UI components
   - Test citation highlighting

3. **Day 27-28:** Search Implementation
   - Implement full-text search
   - Add search highlighting
   - Test search performance

4. **Day 29-30:** Enhanced Error Handling
   - Add circuit breaker
   - Improve retry logic
   - Add request queuing

**Deliverables:**
- Optimized caching system
- Working citation system
- Full-text search
- Enhanced error handling

**Success Criteria:**
- 50% faster PDF text extraction
- Citations work end-to-end
- Search returns results in <1s
- 99% AI request success rate

---

### Phase 4: Polish & Documentation (Week 7-8)
**Goal:** Production-ready polish

1. **Day 31-33:** UI/UX Improvements
   - Add progress indicators
   - Improve loading states
   - Add keyboard shortcuts
   - Accessibility improvements

2. **Day 34-36:** Documentation
   - API documentation
   - User guide
   - Deployment guide
   - Troubleshooting guide

3. **Day 37-38:** Database Export
   - Implement Supabase integration
   - Create database schema
   - Test data persistence

4. **Day 39-40:** Final Testing & Deployment
   - End-to-end testing
   - Performance testing
   - Security audit
   - Production deployment

**Deliverables:**
- Polished UI/UX
- Complete documentation
- Database export feature
- Production deployment

**Success Criteria:**
- All features working smoothly
- Documentation complete
- Application deployed
- User acceptance testing passed

---

## Risk Assessment & Mitigation

### High Risk Items

1. **API Key Security Migration**
   - **Risk:** Breaking existing functionality during backend migration
   - **Mitigation:** Implement feature flag, gradual rollout, maintain backward compatibility
   - **Contingency:** Keep client-side API as fallback option

2. **Memory Leak Fixes**
   - **Risk:** Introducing new bugs in PDF rendering
   - **Mitigation:** Comprehensive testing, gradual rollout, monitoring
   - **Contingency:** Revert to previous version if issues detected

3. **Form Validation Enablement**
   - **Risk:** Blocking legitimate use cases
   - **Mitigation:** Thorough testing with real data, user feedback
   - **Contingency:** Add "skip validation" option for power users

### Medium Risk Items

1. **Testing Infrastructure**
   - **Risk:** Time-consuming to set up
   - **Mitigation:** Start with critical paths, expand gradually
   - **Contingency:** Focus on manual testing if automated testing delayed

2. **Citation System Integration**
   - **Risk:** Performance impact on large documents
   - **Mitigation:** Lazy loading, pagination, caching
   - **Contingency:** Make citation system optional feature

3. **Search Implementation**
   - **Risk:** Slow search on large documents
   - **Mitigation:** Indexing, web workers, pagination
   - **Contingency:** Limit search to current page initially

---

## Success Metrics

### Technical Metrics

1. **Code Quality**
   - Test coverage: ≥70%
   - TypeScript strict mode: Enabled
   - Linting errors: 0
   - Security vulnerabilities: 0

2. **Performance**
   - PDF load time: <3s for 50-page document
   - Text extraction: <5s for 50-page document
   - AI response time: <10s per request
   - Memory usage: <500MB for 100-page document

3. **Reliability**
   - Crash rate: <0.1%
   - AI request success rate: >99%
   - Data loss incidents: 0
   - Recovery success rate: >95%

### User Experience Metrics

1. **Usability**
   - Time to first extraction: <2 minutes
   - Extraction accuracy: >95%
   - User error rate: <5%
   - Task completion rate: >90%

2. **Satisfaction**
   - User satisfaction score: >4/5
   - Feature adoption rate: >70%
   - Support ticket volume: <10/month
   - User retention: >80%

---

## Conclusion

The Clinical Extractor codebase demonstrates strong architectural foundations with its modular design, comprehensive error handling, and sophisticated multi-agent AI system. However, critical security issues (client-side API key exposure), missing configuration management, and lack of testing infrastructure prevent production deployment.

**Immediate Actions Required:**
1. Implement backend API proxy to secure API keys
2. Create environment configuration system
3. Enable form validation
4. Fix memory leaks in PDF processing

**Expected Timeline:** 8 weeks to production-ready state

**Expected Impact:** 
- 100% security improvement (API keys protected)
- 70% test coverage (zero to comprehensive testing)
- 50% performance improvement (optimized caching)
- 95% reliability (enhanced error handling)

The roadmap prioritizes security and stability first, followed by testing infrastructure, then performance and features. This approach ensures a solid foundation before adding enhancements, minimizing technical debt and maximizing long-term maintainability.

---

## Appendix: File-Level Change Summary

### Files Requiring Critical Changes
1. `src/services/AIService.ts` - API proxy integration, LRU cache, circuit breaker
2. `src/forms/FormManager.ts` - Enable validation
3. `src/pdf/PDFRenderer.ts` - Add cleanup method
4. `.env.example` - Create configuration template
5. `README.md` - Update setup instructions

### New Files to Create
1. `src/services/APIProxy.ts` - Backend API proxy
2. `src/utils/LRUCache.ts` - LRU cache implementation
3. `src/services/PDFSearch.ts` - Search functionality
4. `src/services/DatabaseExport.ts` - Database export
5. `src/utils/ProgressTracker.ts` - Progress indicators
6. `src/utils/KeyboardShortcuts.ts` - Keyboard navigation
7. `jest.config.js` - Test configuration
8. `src/**/__tests__/*.test.ts` - Test files (20+)

### Files Requiring Minor Updates
1. `src/pdf/PDFLoader.ts` - Citation extraction integration
2. `src/main.ts` - Search implementation, keyboard shortcuts
3. `src/state/AppStateManager.ts` - Cache cleanup in reset
4. `package.json` - Add testing dependencies
5. `index.html` - ARIA labels, progress indicators

### Total Estimated Changes
- **Lines Added:** ~3,000
- **Lines Modified:** ~500
- **New Files:** ~30
- **Modified Files:** ~15
- **Deleted Files:** 0

---

**Document End**

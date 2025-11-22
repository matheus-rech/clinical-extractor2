# Phase 2 Implementation Progress: UnifiedAIService

## Status: IN PROGRESS (60% Complete)

### ✅ Completed Tasks

1. **BackendAIClient.ts Created** (100%)
   - File: `/src/services/BackendAIClient.ts`
   - All 7 methods implemented:
     - `generatePICO()`
     - `generateSummary()`
     - `validateField()`
     - `findMetadata()`
     - `extractTables()`
     - `analyzeImage()`
     - `deepAnalysis()`
   - Health check method added
   - Proper timeouts configured
   - Uses BackendProxyService for HTTP requests

2. **Type Definitions Added** (100%)
   - File: `/src/types/index.ts`
   - Added 7 new interfaces:
     - `PICOResult`
     - `SummaryResult`
     - `AIValidationResult` (renamed to avoid conflict)
     - `MetadataResult`
     - `TableResult`
     - `TablesResult`
     - `ImageAnalysisResult`
     - `DeepAnalysisResult`

3. **AIService.ts Updates** (60% Complete)
   - Import BackendAIClient: ✅
   - **Updated Functions (3/7):**
     - ✅ `generatePICO()` - Backend-first with fallback
     - ✅ `generateSummary()` - Backend-first with fallback
     - ✅ `validateFieldWithAI()` - Backend-first with fallback
   - **Remaining Functions (4/7):**
     - ⏳ `findMetadata()` - Needs update
     - ⏳ `handleExtractTables()` - Needs update
     - ⏳ `handleImageAnalysis()` - Needs update
     - ⏳ `handleDeepAnalysis()` - Needs update

### 🔄 Next Steps

#### 1. Update Remaining AIService Functions

**Pattern to apply:**
```typescript
try {
    // Get required data
    const data = await getAllPdfText(); // or other data source

    let result;
    try {
        // PRIMARY: Backend API
        StatusManager.show('✨ Processing via backend...', 'info');
        result = await BackendAIClient.methodName(data);
        console.log('[Backend Success] Processed via backend');
    } catch (backendError: any) {
        // FALLBACK: Direct Gemini
        console.warn('[Backend Failed] Fallback to direct:', backendError.message);
        StatusManager.show('⚡ Retrying with direct API...', 'info');
        result = await directGeminiClient.methodName(data);
        console.log('[Fallback Success] Processed via direct Gemini');
    }

    // Process and display results
} catch (error) {
    // Handle errors
}
```

**Functions to update:**

1. **findMetadata()** (Line ~402)
   - Call: `BackendAIClient.findMetadata(citationText)`
   - Fallback: `directGeminiClient.findMetadata(citationText)`
   - Result: `MetadataResult { doi, pmid, journal, year }`

2. **handleExtractTables()** (Line ~688)
   - Call: `BackendAIClient.extractTables(documentText)`
   - Fallback: `directGeminiClient.extractTables(documentText)`
   - Result: `TablesResult { tables: TableResult[] }`

3. **handleImageAnalysis()** (Line ~824)
   - Call: `BackendAIClient.analyzeImage(imageBase64, prompt)`
   - Fallback: `directGeminiClient.analyzeImage(imageBase64, mimeType, prompt)`
   - Result: `ImageAnalysisResult { analysis: string }` or `string`

4. **handleDeepAnalysis()** (Line ~880)
   - Call: `BackendAIClient.deepAnalysis(documentText, analysisType)`
   - Fallback: `directGeminiClient.deepAnalysis(documentText, prompt)`
   - Result: `DeepAnalysisResult { analysis: string }` or `string`

#### 2. Environment Variables

Update `.env.local`:
```bash
# Backend URL (required for Phase 2)
VITE_BACKEND_URL=http://localhost:8000

# Gemini API key (fallback only - can be removed if backend handles all calls)
VITE_GEMINI_API_KEY=your_key_here
```

#### 3. Create Unit Tests

File: `/tests/unit/BackendAIClient.test.ts`

```typescript
import { BackendAIClient } from '../../src/services/BackendAIClient';
import { BackendProxyService } from '../../src/services/BackendProxyService';

jest.mock('../../src/services/BackendProxyService');

describe('BackendAIClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generatePICO', () => {
        it('should call backend endpoint with correct data', async () => {
            const mockResponse = {
                data: {
                    population: 'Test population',
                    intervention: 'Test intervention',
                    comparator: 'Test comparator',
                    outcomes: 'Test outcomes',
                    timing: 'Test timing',
                    studyType: 'Test study'
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                cached: false,
                requestTime: 1000
            };

            (BackendProxyService.request as jest.Mock).mockResolvedValue(mockResponse);

            const result = await BackendAIClient.generatePICO('test pdf text');

            expect(BackendProxyService.request).toHaveBeenCalledWith({
                url: expect.stringContaining('/api/ai/generate-pico'),
                method: 'POST',
                body: { pdfText: 'test pdf text' },
                cache: true,
                timeout: 60000
            });

            expect(result).toEqual(mockResponse.data);
        });

        it('should handle backend timeout error', async () => {
            const timeoutError = new Error('Request timeout');
            (BackendProxyService.request as jest.Mock).mockRejectedValue(timeoutError);

            await expect(BackendAIClient.generatePICO('test')).rejects.toThrow('Request timeout');
        });
    });

    // Add tests for all 7 methods...
});
```

#### 4. Integration Testing

**Manual test checklist:**
- [ ] Backend running on http://localhost:8000
- [ ] Backend health check passes
- [ ] PICO extraction works via backend
- [ ] PICO extraction falls back to direct Gemini when backend fails
- [ ] Summary generation works via backend
- [ ] Field validation works via backend
- [ ] Metadata search works via backend
- [ ] Table extraction works via backend
- [ ] Image analysis works via backend
- [ ] Deep analysis works via backend

#### 5. TypeScript Compilation

Run: `npm run lint` (which runs `tsc --noEmit`)

Expected: Zero errors after completing all function updates

### 📊 Implementation Statistics

- **Files Created:** 1 (BackendAIClient.ts)
- **Files Modified:** 2 (AIService.ts, types/index.ts)
- **Functions Updated:** 3/7 (43%)
- **Lines Added:** ~250
- **Integration Pattern:** Backend-first with graceful fallback

### 🎯 Success Criteria

- [x] BackendAIClient.ts created with 7 methods
- [x] Type definitions added to types/index.ts
- [ ] All 7 AIService functions use backend-first pattern
- [ ] Environment variables updated
- [ ] Unit tests created and passing
- [ ] TypeScript compilation successful
- [ ] Integration tests passing

### 🚀 Deployment Readiness

**Current State:** Development
**Next Milestone:** Complete remaining 4 function updates
**Estimated Time:** 30 minutes
**Blockers:** None

### 📝 Notes

- DirectGeminiClient already exists and provides fallback functionality
- BackendProxyService handles retry logic and rate limiting
- All backend endpoints follow `/api/ai/{operation}` convention
- Health check endpoint: `GET /api/ai/health`
- Backend URL configurable via `VITE_BACKEND_URL`

### 🔗 Related Documents

- `BACKEND_MIGRATION_PLAN.md` - Overall migration strategy
- `PHASE2_INTEGRATION_SPEC.md` - Detailed Phase 2 specifications
- `src/services/BackendProxyService.ts` - HTTP client implementation
- `src/services/DirectGeminiClient.ts` - Fallback client implementation

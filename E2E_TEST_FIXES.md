# E2E Playwright Test Fixes

## Issues Identified

### Issue 1: localStorage Not Preserved on Page Reload
**Test:** `tests/e2e-playwright/08-error-recovery.spec.ts:353`
**Problem:** localStorage data (`clinical_extractions_simple`) disappears after page reload
**Root Cause:** ExtractionTracker.init() is called at module load time, but dependencies might not be set yet

### Issue 2: Manual API Test - No Gemini Response
**Test:** `tests/e2e-playwright/manual-api-test.spec.ts:115`
**Problem:** No PICO fields populated after Gemini API call
**Root Cause:** API key not configured in CI environment OR API call failing silently

---

## Solutions

### Fix 1: Improve localStorage Recovery

The issue is that `ExtractionTracker.init()` runs immediately when the module loads (line 328), but this happens before the DOM is ready and before dependencies are injected. We need to ensure init() is called AFTER dependencies are set in main.ts.

**Changes needed in main.ts:**

```typescript
// After dependency injection, explicitly call init again to load data
ExtractionTracker.setDependencies({
    appStateManager: AppStateManager,
    statusManager: StatusManager,
    pdfRenderer: PDFRenderer
});

// Explicitly reload data after dependencies are set
ExtractionTracker.loadFromStorage();
```

### Fix 2: Add API Key Validation and Better Error Handling

**Root Cause Analysis:**
- The `generatePICO()` function already validates API key via `initializeAI()` (AIService.ts:405)
- `initializeAI()` throws error if API key missing (AIService.ts:113)
- However, error is caught in try-catch block (AIService.ts:447) and only shown via StatusManager
- Test continues running and checks fields, which are empty because API call failed
- Test fails at manual-api-test.spec.ts:115 when it expects at least one field to have content

**Solution: Skip test gracefully if API key not configured**

**Changes needed in manual-api-test.spec.ts:**

```typescript
test('should generate PICO with real Gemini API - like a real user', async ({ page }) => {
    // Set longer timeout for real API call
    test.setTimeout(120000); // 2 minutes

    // 🔑 VALIDATE API KEY FIRST - Skip test if not configured
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_key_here' || apiKey.length < 10) {
        test.skip();
        console.log('\n⚠️  Skipping manual API test - VITE_GEMINI_API_KEY not configured');
        console.log('This test requires a valid Gemini API key in CI environment');
        console.log('Configure in GitHub Actions secrets: VITE_GEMINI_API_KEY\n');
        return;
    }

    console.log('\n🚀 Starting manual real-world API test...');
    console.log('✅ API key validated (length: ' + apiKey.length + ' chars)\n');

    // ... rest of test (unchanged)
});
```

**GitHub Actions Configuration:**

Add to `.github/workflows/ci.yml` (or your CI workflow file):

```yaml
- name: Run Playwright E2E tests
  env:
    VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: npm run test:e2e
```

**Note:** The AIService.ts code already has proper API key validation - no changes needed there. The issue is purely about test environment configuration.

---

## Testing Fixes

### Local Testing

```bash
# 1. Test localStorage persistence
npm run test:e2e -- tests/e2e-playwright/08-error-recovery.spec.ts

# 2. Test API with valid key
export VITE_GEMINI_API_KEY="your_actual_key"
npm run test:e2e -- tests/e2e-playwright/manual-api-test.spec.ts
```

### CI Configuration

Add to `.github/workflows/test.yml`:
```yaml
- name: Run E2E Tests
  env:
    VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: npm run test:e2e
```

---

## Implementation Priority

**Priority 1 (Fix localStorage):**
1. Update main.ts to call `ExtractionTracker.loadFromStorage()` after dependencies
2. Remove auto-init from ExtractionTracker.ts module-level code
3. Test with `npm run test:e2e -- tests/e2e-playwright/08-error-recovery.spec.ts`

**Priority 2 (Fix API Tests):**
1. Add API key validation to AIService.ts
2. Configure CI environment with API key secret
3. Add fallback for tests when API key is missing
4. Test with `npm run test:e2e -- tests/e2e-playwright/manual-api-test.spec.ts`

---

## Expected Results After Fixes

✅ localStorage data persists across page reloads
✅ Extraction recovery test passes
✅ API tests either pass with valid key OR skip gracefully without key
✅ Better error messages for missing API keys
✅ CI pipeline green

---

**Created:** 2025-11-19
**Status:** Ready for implementation

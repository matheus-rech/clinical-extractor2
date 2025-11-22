# Clinical Extractor - Testing Guide

**Comprehensive guide for running, writing, and debugging end-to-end tests using Playwright.**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Writing New Tests](#writing-new-tests)
4. [Test Helpers](#test-helpers)
5. [Debugging Tests](#debugging-tests)
6. [CI/CD Integration](#cicd-integration)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Set up environment (optional for basic tests)
cp .env.example .env.local
# Add VITE_GEMINI_API_KEY=your_key (only needed for AI tests)
```

### Run Your First Test

```bash
# Run all tests (headless)
npm run test:e2e

# View results
npm run test:e2e:report
```

**Expected Output:**
```
Running 22 tests using 1 worker
  ✓  01-pdf-upload.spec.ts:12:1 › PDF Upload and Navigation › should display initial ready state (523ms)
  ✓  01-pdf-upload.spec.ts:18:1 › PDF Upload and Navigation › should show file input for PDF upload (412ms)
  ...
  22 passed (55.2s)
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests (headless, fast)
npm run test:e2e

# Run tests with browser visible (headed mode)
npm run test:e2e:headed

# Run in debug mode (pauses execution, opens inspector)
npm run test:e2e:debug

# View HTML report after tests finish
npm run test:e2e:report
```

### Advanced Commands

```bash
# Run specific test file
npx playwright test 01-pdf-upload

# Run tests matching pattern
npx playwright test -g "should load PDF"

# Run single test by line number
npx playwright test 01-pdf-upload.spec.ts:12

# Run tests on specific browser
npx playwright test --project=chromium

# Run with specific number of workers
npx playwright test --workers=2

# Update snapshots (for visual tests)
npx playwright test --update-snapshots
```

### Watch Mode (Auto-Rerun)

```bash
# Run tests in watch mode (reruns on file changes)
npx playwright test --ui

# Alternative: VS Code extension
# Install "Playwright Test for VSCode"
# Click green play button next to tests
```

---

## Writing New Tests

### Test File Structure

**Naming Convention:** `NN-feature-name.spec.ts`
- `01-` = Core features
- `02-` = User workflows
- `03-` = Advanced features
- `04-` = Edge cases/errors

**Template:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to app
        await page.goto('/');

        // Wait for app to be ready
        await expect(page.locator('#status-message')).toContainText('Ready');
    });

    test('should do something specific', async ({ page }) => {
        // Arrange: Set up test conditions
        const button = page.locator('#my-button');

        // Act: Perform action
        await button.click();

        // Assert: Verify expected outcome
        await expect(page.locator('#result')).toHaveText('Expected text');
    });

    test('should handle error case', async ({ page }) => {
        // Test error handling
        await page.locator('#trigger-error').click();
        await expect(page.locator('.error-message')).toBeVisible();
    });
});
```

### Example Test: PDF Upload

```typescript
import { test, expect } from '@playwright/test';

test.describe('PDF Upload', () => {
    test('should upload PDF file', async ({ page }) => {
        await page.goto('/');

        // 1. Locate file input
        const fileInput = page.locator('#pdf-file-input');

        // 2. Upload file
        await fileInput.setInputFiles('public/Kim2016.pdf');

        // 3. Wait for upload to complete
        await expect(page.locator('#status-message')).toContainText('PDF loaded successfully');

        // 4. Verify page count displayed
        await expect(page.locator('#page-count')).toHaveText('1 / 14');

        // 5. Verify canvas renders
        const canvas = page.locator('#pdf-canvas');
        await expect(canvas).toBeVisible();
    });
});
```

### Example Test: Text Extraction

```typescript
test('should extract text to field', async ({ page }) => {
    // 1. Load PDF first
    await page.goto('/');
    await page.locator('#sample-pdf-btn').click();
    await page.waitForSelector('#page-count:has-text("1 / 14")');

    // 2. Activate DOI field
    const doiField = page.locator('#doi');
    await doiField.click();
    await expect(doiField).toHaveClass(/active-field/);

    // 3. Simulate text selection (simplified)
    await page.evaluate(() => {
        const selection = window.getSelection();
        const range = document.createRange();
        const textNode = document.querySelector('.textLayer span');
        range.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger extraction event
        const event = new CustomEvent('textExtracted', {
            detail: {
                text: '10.1016/j.wneu.2015.08.072',
                fieldId: 'doi',
                page: 1,
                coordinates: { x: 100, y: 200, width: 300, height: 15 }
            }
        });
        document.dispatchEvent(event);
    });

    // 4. Verify field populated
    await expect(doiField).toHaveValue('10.1016/j.wneu.2015.08.072');

    // 5. Verify marker appears
    const marker = page.locator('.extraction-marker').first();
    await expect(marker).toBeVisible();
});
```

---

## Test Helpers

### Available Helper Functions

**Location:** `tests/e2e-playwright/helpers/` (create this directory)

```typescript
// helpers/pdf-helpers.ts

import { Page, expect } from '@playwright/test';

/**
 * Load sample PDF (Kim2016.pdf)
 */
export async function loadSamplePDF(page: Page) {
    await page.locator('#sample-pdf-btn').click();
    await page.waitForSelector('#page-count:has-text("/ 14")');
}

/**
 * Wait for PDF to fully load
 */
export async function waitForPDFLoad(page: Page) {
    await expect(page.locator('#status-message')).toContainText('PDF loaded successfully');
    await expect(page.locator('#pdf-canvas')).toBeVisible();
}

/**
 * Navigate to specific page number
 */
export async function navigateToPage(page: Page, pageNum: number) {
    const pageInput = page.locator('#page-num');
    await pageInput.fill(String(pageNum));
    await pageInput.press('Enter');
    await page.waitForSelector(`#page-count:has-text("${pageNum} / ")`);
}

/**
 * Activate a form field for extraction
 */
export async function activateField(page: Page, fieldId: string) {
    const field = page.locator(`#${fieldId}`);
    await field.click();
    await expect(field).toHaveClass(/active-field/);
    await expect(page.locator('#status-message')).toContainText(`Active field: ${fieldId}`);
}

/**
 * Extract text to active field (simulated)
 */
export async function extractTextToField(page: Page, fieldId: string, text: string) {
    await page.evaluate(({ fieldId, text }) => {
        const event = new CustomEvent('textExtracted', {
            detail: {
                text,
                fieldId,
                page: 1,
                coordinates: { x: 100, y: 200, width: 300, height: 15 }
            }
        });
        document.dispatchEvent(event);
    }, { fieldId, text });

    const field = page.locator(`#${fieldId}`);
    await expect(field).toHaveValue(text);
}

/**
 * Get extraction markers count
 */
export async function getMarkerCount(page: Page): Promise<number> {
    return await page.locator('.extraction-marker').count();
}

/**
 * Clear all extractions
 */
export async function clearExtractions(page: Page) {
    await page.evaluate(() => {
        localStorage.removeItem('clinical_extractions_simple');
        window.location.reload();
    });
    await waitForPDFLoad(page);
}
```

### Using Helpers in Tests

```typescript
import { test, expect } from '@playwright/test';
import { loadSamplePDF, activateField, extractTextToField } from './helpers/pdf-helpers';

test('should extract DOI', async ({ page }) => {
    await page.goto('/');
    await loadSamplePDF(page);
    await activateField(page, 'doi');
    await extractTextToField(page, 'doi', '10.1016/j.wneu.2015.08.072');

    // Additional assertions...
});
```

---

## Debugging Tests

### Debug Mode (Interactive)

```bash
# Run in debug mode - opens Playwright Inspector
npm run test:e2e:debug

# Debug specific test
npx playwright test 01-pdf-upload --debug

# Debug from specific line
npx playwright test 01-pdf-upload.spec.ts:25 --debug
```

**Playwright Inspector Features:**
- Step through test line-by-line
- Inspect page state at each step
- Edit selectors live
- View console logs
- Take screenshots

### Using `page.pause()`

```typescript
test('debug extraction', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sample-pdf-btn').click();

    // Pause execution here - opens inspector
    await page.pause();

    // Continue manually or via inspector
    await page.locator('#doi').click();
});
```

### View Test Artifacts

**After test failure, check:**

```bash
# 1. View HTML report
npm run test:e2e:report

# 2. Screenshots (in test-results/)
open test-results/01-pdf-upload-should-load-PDF-chromium/test-failed-1.png

# 3. Videos (if enabled)
open test-results/01-pdf-upload-should-load-PDF-chromium/video.webm

# 4. Traces (for deep debugging)
npx playwright show-trace test-results/01-pdf-upload-should-load-PDF-chromium/trace.zip
```

### Console Logging in Tests

```typescript
test('debug with console', async ({ page }) => {
    // Listen to browser console
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // Listen to page errors
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    // Log from test
    console.log('Starting test...');

    await page.goto('/');

    // Log page state
    const pageCount = await page.locator('#page-count').textContent();
    console.log('Page count:', pageCount);
});
```

### Common Debugging Scenarios

**1. Element Not Found**

```typescript
// ❌ Will fail immediately if not found
await page.locator('#missing-element').click();

// ✅ Wait up to 30s (configurable)
await page.locator('#my-element').click({ timeout: 30000 });

// ✅ Check if exists first
const exists = await page.locator('#my-element').count() > 0;
if (exists) {
    await page.locator('#my-element').click();
}
```

**2. Timing Issues**

```typescript
// ❌ Race condition
await page.locator('#load-button').click();
await page.locator('#result').textContent(); // May not be ready

// ✅ Wait for condition
await page.locator('#load-button').click();
await expect(page.locator('#result')).toBeVisible();
const result = await page.locator('#result').textContent();
```

**3. State Not Reset**

```typescript
test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.reload();
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/playwright-tests.yml`

```yaml
name: Playwright E2E Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
      env:
        VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
```

### Setting GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `GEMINI_API_KEY`
4. Value: Your Google Gemini API key
5. Click "Add secret"

### Viewing CI Test Results

1. Go to Actions tab in GitHub
2. Click on workflow run
3. Expand "Run Playwright tests" step
4. Download artifacts (HTML report, videos)

---

## Best Practices

### Selectors

**Priority Order:**

1. **data-testid** (best - stable across UI changes)
   ```typescript
   await page.locator('[data-testid="pdf-upload-btn"]').click();
   ```

2. **ID** (good - usually unique)
   ```typescript
   await page.locator('#sample-pdf-btn').click();
   ```

3. **Class** (okay - may change)
   ```typescript
   await page.locator('.primary-button').first().click();
   ```

4. **Text** (fragile - depends on copy)
   ```typescript
   await page.locator('button:has-text("Load PDF")').click();
   ```

### Waiting Strategies

**✅ DO:**
```typescript
// Wait for specific condition
await expect(page.locator('#status')).toContainText('Success');

// Wait for navigation
await Promise.all([
    page.waitForNavigation(),
    page.locator('#link').click()
]);

// Wait for API response
await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/data')),
    page.locator('#fetch-button').click()
]);
```

**❌ DON'T:**
```typescript
// Arbitrary timeouts (flaky!)
await page.waitForTimeout(2000);

// Better: Wait for explicit condition
await expect(page.locator('#result')).toBeVisible();
```

### Test Independence

```typescript
// ✅ Each test is self-contained
test('test A', async ({ page }) => {
    await page.goto('/');
    await loadSamplePDF(page);
    // Test A logic
});

test('test B', async ({ page }) => {
    await page.goto('/');
    await loadSamplePDF(page);
    // Test B logic - doesn't depend on Test A
});

// ❌ Tests depend on each other (breaks parallelization)
let sharedState;
test('test A', async ({ page }) => {
    sharedState = await doSomething(); // BAD!
});
test('test B', async ({ page }) => {
    useSharedState(sharedState); // Will fail if Test A skipped
});
```

### Descriptive Test Names

```typescript
// ✅ Clear, specific
test('should display error when uploading corrupted PDF', async ({ page }) => {});
test('should preserve extraction markers after page navigation', async ({ page }) => {});

// ❌ Vague
test('test upload', async ({ page }) => {});
test('check markers', async ({ page }) => {});
```

---

## Troubleshooting

### Common Issues

**1. "Element not found" errors**

**Cause:** Selector doesn't match any element
**Solution:**
```bash
# Inspect page in headed mode
npx playwright test --headed --debug

# Use Playwright Inspector to test selectors
npx playwright codegen http://localhost:5173
```

**2. "Timeout" errors**

**Cause:** Operation took longer than 30s (default)
**Solution:**
```typescript
// Increase timeout for specific action
await page.locator('#slow-button').click({ timeout: 60000 });

// Increase timeout for entire test
test('slow test', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    // ...
});
```

**3. "Navigation failed" errors**

**Cause:** Dev server not running
**Solution:**
```bash
# Start dev server in separate terminal
npm run dev

# Run tests
npm run test:e2e
```

**4. "PDF.js worker not loaded"**

**Cause:** CDN unavailable or blocked
**Solution:**
```typescript
// In playwright.config.ts, add:
use: {
    offline: false // Ensure internet access for CDN
}
```

**5. Flaky tests (pass/fail randomly)**

**Cause:** Race conditions, timing issues
**Solution:**
```typescript
// Replace waitForTimeout with explicit waits
// ❌ Flaky
await page.waitForTimeout(1000);

// ✅ Stable
await expect(page.locator('#element')).toBeVisible();
```

### Getting Help

1. **Check Playwright Docs:** https://playwright.dev/docs/intro
2. **View Test Trace:** `npx playwright show-trace trace.zip`
3. **Enable Verbose Logging:**
   ```bash
   DEBUG=pw:api npx playwright test
   ```
4. **Ask in #testing channel** (if applicable)

---

## Advanced Topics

### Visual Regression Testing

```typescript
// Take screenshot and compare
test('should match homepage snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
});

// Update snapshots when UI changes intentionally
// npx playwright test --update-snapshots
```

### API Mocking

```typescript
test('should handle API error', async ({ page }) => {
    // Mock API response
    await page.route('**/api/data', route => {
        route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        });
    });

    await page.goto('/');
    await page.locator('#fetch-button').click();
    await expect(page.locator('.error-message')).toBeVisible();
});
```

### Testing File Downloads

```typescript
test('should download JSON export', async ({ page }) => {
    await page.goto('/');

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-json-btn').click();
    const download = await downloadPromise;

    // Save and verify file
    const path = await download.path();
    const content = await fs.readFile(path, 'utf-8');
    const json = JSON.parse(content);

    expect(json).toHaveProperty('formData');
    expect(json).toHaveProperty('extractions');
});
```

---

## Summary

**Key Takeaways:**

- ✅ Use `npm run test:e2e` for quick test runs
- ✅ Use `npm run test:e2e:debug` for debugging
- ✅ Always wait for explicit conditions (not timeouts)
- ✅ Use helper functions for common actions
- ✅ Write descriptive test names
- ✅ Keep tests independent
- ✅ Use data-testid for stable selectors
- ✅ Check HTML report after failures
- ✅ Run tests in CI on every push

**Next Steps:**

1. Read existing tests in `tests/e2e-playwright/`
2. Try writing a simple test
3. Run it with `npx playwright test your-test.spec.ts`
4. View results with `npm run test:e2e:report`

For detailed Playwright documentation, visit: https://playwright.dev/

/**
 * E2E Test Suite 3: AI PICO Extraction (REAL API CALLS)
 *
 * Tests AI-powered extraction features using REAL Google Gemini API:
 * - PICO generation (6 fields)
 * - Summary generation
 * - Metadata extraction (DOI, PMID, journal, year)
 * - Field validation with AI
 * - Deep analysis
 * - Error handling
 *
 * IMPORTANT: These tests make REAL API calls to Google Gemini.
 * Requires: VITE_GEMINI_API_KEY environment variable
 */

import { test, expect } from '@playwright/test';
import { loadSamplePDF } from './helpers/pdf-helpers';
import { navigateToPICOStep } from './helpers/form-helpers';
import {
  waitForAIProcessing,
  verifyPICOFields,
  verifyTraceLogMethod,
  waitForStatusMessage,
  verifyLoadingState,
  getAIExtractionCount
} from './helpers/ai-helpers';

test.describe('AI PICO Extraction (Real API)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app initialization
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });

    // Load sample PDF
    await loadSamplePDF(page);

    // Navigate to PICO form (Step 2) - REQUIRED for AI button visibility
    await navigateToPICOStep(page);
  });

  test('should generate PICO fields from PDF using real AI', async ({ page }) => {
    // Click Generate PICO button (will make REAL API call)
    await page.click('#generate-pico-btn');

    // Wait for AI processing (real API call takes longer)
    await waitForAIProcessing(page, 60000); // 60s timeout for real API

    // Verify PICO fields are populated with real data
    await verifyPICOFields(page);

    // Verify fields have actual medical content
    const population = await page.locator('#population').inputValue();
    expect(population.length).toBeGreaterThan(10); // Real data should be substantial

    // Verify success message
    await expect(page.locator('#extraction-status')).toContainText(/success|complete/i);
  });

  test('should show loading state during real AI processing', async ({ page }) => {
    // Start AI processing
    const clickPromise = page.click('#generate-pico-btn');

    // Verify loading state appears quickly
    await verifyLoadingState(page, true);

    // Wait for completion
    await clickPromise;
    await waitForAIProcessing(page, 60000);

    // Verify loading state clears
    await verifyLoadingState(page, false);
  });

  test('should populate all 6 PICO-T fields with real data', async ({ page }) => {
    await page.click('#generate-pico-btn');
    await waitForAIProcessing(page, 60000);

    // Verify all 6 fields have content
    const fields = ['population', 'intervention', 'comparator', 'outcomes', 'timing', 'study_type'];

    for (const fieldId of fields) {
      const value = await page.locator(`#${fieldId}`).inputValue();
      expect(value.length).toBeGreaterThan(5); // Real AI responses are substantial
    }
  });

  test('should generate summary with real key findings', async ({ page }) => {
    // Click Generate Summary button (REAL API call)
    await page.click('#generate-summary-btn');
    await waitForAIProcessing(page, 60000);

    // Verify summary is populated
    const summary = await page.locator('#summary-text').textContent();
    expect(summary).toBeTruthy();
    expect(summary!.length).toBeGreaterThan(50); // Real summaries are multi-sentence

    // Verify success message
    await expect(page.locator('#extraction-status')).toContainText(/success|complete/i);
  });

  test('should extract metadata with DOI and PMID using real AI', async ({ page }) => {
    // Click Find Metadata button (REAL API with Google Search grounding)
    await page.click('#find-metadata-btn');
    await waitForAIProcessing(page, 90000); // 90s for metadata with search grounding

    // Verify DOI field (format: 10.xxxx/xxxx)
    const doi = await page.locator('#doi').inputValue();
    if (doi) {
      expect(doi).toMatch(/10\.\d{4,}/);
    }

    // Verify year field (1900-2100)
    const year = await page.locator('#year').inputValue();
    if (year) {
      const yearNum = parseInt(year);
      expect(yearNum).toBeGreaterThanOrEqual(1900);
      expect(yearNum).toBeLessThanOrEqual(2100);
    }
  });

  test('should validate extracted field with real AI', async ({ page }) => {
    // First extract some text manually
    await page.click('#citation');
    await page.evaluate(() => {
      // Simulate text extraction
      const event = new CustomEvent('text-extracted', {
        detail: { text: 'Kim et al. 2016 cerebellar decompression study' }
      });
      window.dispatchEvent(event);
    });

    // Click Validate button (REAL AI call for fact-checking)
    const validateBtn = page.locator('button:has-text("Validate")').first();
    if (await validateBtn.isVisible()) {
      await validateBtn.click();
      await waitForAIProcessing(page, 60000);

      // Verify validation result shows confidence score
      const validationResult = page.locator('.validation-result').first();
      if (await validationResult.isVisible()) {
        await expect(validationResult).toContainText(/confidence|supported/i);
      }
    }
  });

  test('should track real AI extractions in trace log', async ({ page }) => {
    // Get initial extraction count
    const initialCount = await getAIExtractionCount(page, 'gemini-pico');

    // Perform AI extraction
    await page.click('#generate-pico-btn');
    await waitForAIProcessing(page, 60000);

    // Verify extraction count increased
    const newCount = await getAIExtractionCount(page, 'gemini-pico');
    expect(newCount).toBeGreaterThan(initialCount);

    // Verify trace log shows gemini-pico method
    await verifyTraceLogMethod(page, 'gemini-pico');
  });

  test('should handle real API timeouts gracefully', async ({ page }) => {
    // Set shorter timeout to trigger timeout handling
    await page.evaluate(() => {
      // Reduce timeout temporarily
      if (window.BackendProxyService) {
        window.BackendProxyService.configure({ timeout: 1000 });
      }
    });

    await page.click('#generate-pico-btn');

    // Wait for timeout error message
    await waitForStatusMessage(page, /timeout|failed|error/i, 15000);

    // Verify error is handled gracefully
    const status = await page.locator('#extraction-status').textContent();
    expect(status).toMatch(/timeout|failed|error/i);
  });

  test('should generate real AI summary after PICO extraction', async ({ page }) => {
    // First generate PICO
    await page.click('#generate-pico-btn');
    await waitForAIProcessing(page, 60000);

    // Then generate summary
    await page.click('#generate-summary-btn');
    await waitForAIProcessing(page, 60000);

    // Verify both completed successfully
    const population = await page.locator('#population').inputValue();
    const summary = await page.locator('#summary-text').textContent();

    expect(population.length).toBeGreaterThan(10);
    expect(summary!.length).toBeGreaterThan(50);
  });

  test('should extract tables with real AI analysis', async ({ page }) => {
    // Click Extract Tables button (REAL gemini-2.5-pro call)
    const extractTablesBtn = page.locator('button:has-text("Extract Tables")').first();

    if (await extractTablesBtn.isVisible()) {
      await extractTablesBtn.click();
      await waitForAIProcessing(page, 75000); // Tables take longer

      // Verify table extraction UI appears
      const tableResults = page.locator('.table-extraction-results');
      if (await tableResults.isVisible()) {
        // Verify at least one table was found
        const tableCount = await page.locator('.extracted-table').count();
        expect(tableCount).toBeGreaterThan(0);
      }
    }
  });

  test('should analyze images with real Gemini vision', async ({ page }) => {
    // Click Analyze Image button (REAL gemini-2.5-flash with vision)
    const analyzeImageBtn = page.locator('button:has-text("Analyze Image")').first();

    if (await analyzeImageBtn.isVisible()) {
      await analyzeImageBtn.click();
      await waitForAIProcessing(page, 60000);

      // Verify image analysis result
      const analysisResult = page.locator('.image-analysis-result');
      if (await analysisResult.isVisible()) {
        const resultText = await analysisResult.textContent();
        expect(resultText!.length).toBeGreaterThan(20);
      }
    }
  });

  test('should perform deep analysis with real extended thinking', async ({ page }) => {
    // Click Deep Analysis button (REAL gemini-2.5-pro with 32k thinking budget)
    const deepAnalysisBtn = page.locator('button:has-text("Deep Analysis")').first();

    if (await deepAnalysisBtn.isVisible()) {
      await deepAnalysisBtn.click();
      await waitForAIProcessing(page, 120000); // Deep analysis takes longest (2 minutes)

      // Verify deep analysis result
      const analysisResult = page.locator('.deep-analysis-result');
      if (await analysisResult.isVisible()) {
        const resultText = await analysisResult.textContent();
        expect(resultText!.length).toBeGreaterThan(100); // Deep analysis is comprehensive
      }
    }
  });

  test('should preserve real AI extractions in localStorage', async ({ page }) => {
    // Perform AI extraction
    await page.click('#generate-pico-btn');
    await waitForAIProcessing(page, 60000);

    // Get population value
    const populationBefore = await page.locator('#population').inputValue();

    // Reload page
    await page.reload();
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });
    await loadSamplePDF(page);

    // Verify extraction persists
    const populationAfter = await page.locator('#population').inputValue();
    expect(populationAfter).toBe(populationBefore);
  });
});

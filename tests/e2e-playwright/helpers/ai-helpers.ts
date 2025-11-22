/**
 * AI Helper Utilities for Playwright E2E Tests
 *
 * Reusable functions for testing AI features with proper mocking
 */

import { Page, expect } from '@playwright/test';

/**
 * Mock Gemini API responses to prevent real API calls during testing
 * @param page - Playwright page instance
 * @param responseData - Custom response data to return
 */
export async function mockGeminiAPI(page: Page, responseData: any) {
  await page.route('**/v1beta/models/gemini-*:generateContent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: typeof responseData === 'string'
                ? responseData
                : JSON.stringify(responseData)
            }]
          }
        }]
      })
    });
  });
}

/**
 * Mock Gemini API to return error responses
 * @param page - Playwright page instance
 * @param errorCode - HTTP error code (e.g., 429, 500)
 * @param errorMessage - Error message to return
 */
export async function mockGeminiAPIError(page: Page, errorCode: number, errorMessage: string) {
  await page.route('**/v1beta/models/gemini-*:generateContent', async (route) => {
    await route.fulfill({
      status: errorCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: errorCode,
          message: errorMessage,
          status: errorCode === 429 ? 'RESOURCE_EXHAUSTED' : 'INTERNAL'
        }
      })
    });
  });
}

/**
 * Wait for AI processing to complete by monitoring the isProcessing state
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in milliseconds (default: 30000)
 */
export async function waitForAIProcessing(page: Page, timeout: number = 30000) {
  // Wait for loading spinner to appear (use actual ID from index.html)
  await page.waitForSelector('#loading-spinner', { state: 'visible', timeout: 5000 })
    .catch(() => {
      // Loading indicator might appear and disappear quickly
      console.log('Loading indicator not detected (may have completed quickly)');
    });

  // Wait for loading spinner to disappear
  await page.waitForSelector('#loading-spinner', { state: 'hidden', timeout })
    .catch(() => {
      // Continue if already hidden
      console.log('Loading indicator already hidden');
    });

  // Additional check: verify isProcessing flag is false
  await page.waitForFunction(
    () => {
      const state = (window as any).ClinicalExtractor?.getAppState?.();
      return !state?.isProcessing;
    },
    { timeout }
  ).catch(() => {
    console.log('isProcessing state check timed out');
  });
}

/**
 * Verify PICO fields are populated with valid data
 * @param page - Playwright page instance
 */
export async function verifyPICOFields(page: Page) {
  // Use actual field IDs from index.html with eligibility- prefix
  const picoFields = [
    'eligibility-population',
    'eligibility-intervention',
    'eligibility-comparator',
    'eligibility-outcomes',
    'eligibility-timing',
    'eligibility-type'  // Note: 'type' not 'study-type'
  ];

  for (const fieldId of picoFields) {
    const field = page.locator(`#${fieldId}`);
    await expect(field).toBeVisible();

    const value = await field.inputValue();
    expect(value.length).toBeGreaterThan(0);
  }
}

/**
 * Verify multi-agent consensus results
 * @param page - Playwright page instance
 * @param expectedMinConfidence - Minimum expected confidence score (0.0-1.0)
 */
export async function verifyConsensusResults(page: Page, expectedMinConfidence: number = 0.75) {
  // Check if pipeline results are displayed
  const resultsSection = page.locator('#pipeline-results');
  await expect(resultsSection).toBeVisible();

  // Verify confidence scores are displayed
  const confidenceElements = page.locator('.confidence-score');
  const count = await confidenceElements.count();

  if (count > 0) {
    // Check first confidence score
    const firstConfidence = await confidenceElements.first().textContent();
    const confidenceValue = parseFloat(firstConfidence?.replace(/[^\d.]/g, '') || '0');

    expect(confidenceValue).toBeGreaterThanOrEqual(expectedMinConfidence);
  }
}

/**
 * Get trace log entries filtered by extraction method
 * @param page - Playwright page instance
 * @param method - Extraction method ('manual', 'gemini-pico', 'gemini-summary', etc.)
 * @returns Array of trace entry elements
 */
export async function getTraceLogEntries(page: Page, method?: string) {
  const selector = method
    ? `#trace-log .trace-entry[data-method="${method}"]`
    : '#trace-log .trace-entry';

  return await page.locator(selector).all();
}

/**
 * Verify trace log has entries with specific method
 * @param page - Playwright page instance
 * @param method - Expected extraction method
 * @param minCount - Minimum expected count (default: 1)
 */
export async function verifyTraceLogMethod(page: Page, method: string, minCount: number = 1) {
  const entries = await getTraceLogEntries(page, method);
  expect(entries.length).toBeGreaterThanOrEqual(minCount);

  // Verify first entry has correct method
  if (entries.length > 0) {
    await expect(entries[0]).toHaveAttribute('data-method', method);
  }
}

/**
 * Mock MedicalAgentBridge responses for multi-agent pipeline testing
 * @param page - Playwright page instance
 * @param agentResponses - Map of agent names to their responses
 */
export async function mockMedicalAgents(page: Page, agentResponses: Record<string, any>) {
  await page.evaluate((responses) => {
    (window as any).mockAgentResponses = responses;

    // Override MedicalAgentBridge.callAgent if it exists
    if ((window as any).ClinicalExtractor?.MedicalAgentBridge) {
      const originalCallAgent = (window as any).ClinicalExtractor.MedicalAgentBridge.callAgent;

      (window as any).ClinicalExtractor.MedicalAgentBridge.callAgent = async function(
        agentName: string,
        data: any,
        dataType: string
      ) {
        // Return mock response if available
        if (responses[agentName]) {
          return {
            extractedFields: responses[agentName].fields || {},
            overallConfidence: responses[agentName].confidence || 0.90,
            sourceQuote: responses[agentName].quote || 'Mock source quote',
            insights: responses[agentName].insights || ['Mock insight']
          };
        }

        // Fallback to original implementation
        return originalCallAgent.call(this, agentName, data, dataType);
      };
    }
  }, agentResponses);
}

/**
 * Clear all AI API mocks
 * @param page - Playwright page instance
 */
export async function clearGeminiMocks(page: Page) {
  await page.unroute('**/v1beta/models/gemini-*:generateContent');
}

/**
 * Wait for specific status message to appear
 * @param page - Playwright page instance
 * @param message - Expected status message (regex or string)
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForStatusMessage(
  page: Page,
  message: string | RegExp,
  timeout: number = 10000
) {
  const statusLocator = page.locator('#extraction-status');
  await expect(statusLocator).toContainText(message, { timeout });
}

/**
 * Verify loading state is displayed during AI processing
 * @param page - Playwright page instance
 * @param shouldBeVisible - Whether loading indicator should be visible (true) or hidden (false)
 */
export async function verifyLoadingState(page: Page, shouldBeVisible: boolean = true) {
  // Use actual loading spinner ID from index.html
  const loadingIndicator = page.locator('#loading-spinner');

  if (shouldBeVisible) {
    // Verify loading IS visible
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#extraction-status')).toContainText(/processing|analyzing|generating/i);
  } else {
    // Verify loading is NOT visible
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
  }
}

/**
 * Get AI extraction count from trace log
 * @param page - Playwright page instance
 * @param method - AI method filter ('gemini-pico', 'gemini-summary', etc.)
 */
export async function getAIExtractionCount(page: Page, method: string): Promise<number> {
  const entries = await getTraceLogEntries(page, method);
  return entries.length;
}

/**
 * Trigger PICO generation and wait for completion
 * @param page - Playwright page instance
 */
export async function generatePICO(page: Page) {
  await page.click('#generate-pico-btn');
  await waitForAIProcessing(page);
}

/**
 * Trigger summary generation and wait for completion
 * @param page - Playwright page instance
 */
export async function generateSummary(page: Page) {
  await page.click('#generate-summary-btn');
  await waitForAIProcessing(page);
}

/**
 * Trigger metadata extraction and wait for completion
 * @param page - Playwright page instance
 */
export async function findMetadata(page: Page) {
  await page.click('#find-metadata-btn');
  await waitForAIProcessing(page);
}

/**
 * Validate a specific field with AI
 * @param page - Playwright page instance
 * @param fieldId - Field ID to validate
 */
export async function validateFieldWithAI(page: Page, fieldId: string) {
  // Click the validate button for the specific field
  const validateBtn = page.locator(`#validate-${fieldId}-btn`);
  await validateBtn.click();
  await waitForAIProcessing(page);
}

/**
 * Run full multi-agent pipeline and wait for completion
 * @param page - Playwright page instance
 */
export async function runFullAIPipeline(page: Page) {
  await page.evaluate(() => {
    (window as any).runFullAIPipeline();
  });

  // Wait for pipeline completion (longer timeout for multi-agent processing)
  await waitForAIProcessing(page, 60000);
}

/**
 * Verify pipeline statistics are displayed
 * @param page - Playwright page instance
 */
export async function verifyPipelineStats(page: Page) {
  const statsSection = page.locator('#pipeline-stats');
  await expect(statsSection).toBeVisible();

  // Verify key stats are present
  await expect(statsSection).toContainText(/processing time/i);
  await expect(statsSection).toContainText(/agents invoked/i);
  await expect(statsSection).toContainText(/confidence/i);
}

/**
 * Get extracted figures count
 * @param page - Playwright page instance
 */
export async function getExtractedFiguresCount(page: Page): Promise<number> {
  const result = await page.evaluate(() => {
    const state = (window as any).ClinicalExtractor?.getAppState?.();
    return state?.extractedFigures?.length || 0;
  });
  return result;
}

/**
 * Get extracted tables count
 * @param page - Playwright page instance
 */
export async function getExtractedTablesCount(page: Page): Promise<number> {
  const result = await page.evaluate(() => {
    const state = (window as any).ClinicalExtractor?.getAppState?.();
    return state?.extractedTables?.length || 0;
  });
  return result;
}

/**
 * Verify bounding boxes are displayed on PDF
 * @param page - Playwright page instance
 * @param expectedColor - Expected bounding box color ('red', 'green', 'blue')
 */
export async function verifyBoundingBoxes(page: Page, expectedColor?: string) {
  const canvas = page.locator('#pdf-container canvas').first();
  await expect(canvas).toBeVisible();

  // Check if bounding boxes are rendered (canvas should have content)
  const hasContent = await page.evaluate(() => {
    const canvas = document.querySelector('#pdf-container canvas') as HTMLCanvasElement;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Check if canvas has any drawing operations
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.some((pixel, index) => {
      // Check for non-white pixels (white = 255,255,255,255)
      if (index % 4 === 3) return false; // Skip alpha channel
      return pixel !== 255;
    });
  });

  expect(hasContent).toBeTruthy();
}

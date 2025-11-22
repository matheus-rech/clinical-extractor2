/**
 * Form Helper Utilities for Playwright E2E Tests
 *
 * Reusable functions for form operations in Clinical Extractor
 */

import { Page, expect } from '@playwright/test';

/**
 * Navigate to a specific form step (1-8)
 */
export async function navigateToStep(page: Page, stepNumber: number) {
  const currentStepText = await page.locator('#step-indicator').textContent();
  const currentStep = parseInt(currentStepText?.match(/Step (\d+)/)?.[1] || '1');

  const diff = stepNumber - currentStep;
  const button = diff > 0 ? '#next-btn' : '#prev-btn';

  for (let i = 0; i < Math.abs(diff); i++) {
    await page.click(button);
    await page.waitForTimeout(300); // Wait for step transition
  }

  // Verify we're on the correct step
  await expect(page.locator(`#step-${stepNumber}`)).toHaveClass(/active/);
}

/**
 * Navigate to PICO form (Step 2) - Required for AI PICO extraction tests
 * This is the most common navigation needed for AI tests
 */
export async function navigateToPICOStep(page: Page) {
  console.log('Navigating to PICO form (Step 2)...');

  // Click Next button to go from Step 1 to Step 2
  const nextButton = page.locator('#next-btn');  // Correct ID is #next-btn
  await expect(nextButton).toBeVisible({ timeout: 5000 });
  await nextButton.click();
  await page.waitForTimeout(1000); // Wait for transition

  // Verify Step 2 is now visible and active
  const step2 = page.locator('#step-2');
  await expect(step2).toBeVisible({ timeout: 5000 });

  console.log('✅ Successfully navigated to Step 2 (PICO form)');
}

/**
 * Fill study identification fields (Step 1)
 */
export async function fillStudyIdentification(
  page: Page,
  data: {
    citation?: string;
    doi?: string;
    pmid?: string;
    year?: string;
    journal?: string;
    country?: string;
  }
) {
  await navigateToStep(page, 1);

  if (data.citation) await page.fill('#citation', data.citation);
  if (data.doi) await page.fill('#doi', data.doi);
  if (data.pmid) await page.fill('#pmid', data.pmid);
  if (data.year) await page.fill('#year', data.year);
  if (data.journal) await page.fill('#journal', data.journal);
  if (data.country) await page.fill('#country', data.country);
}

/**
 * Check if all form fields have valid values (no validation errors)
 */
export async function validateAllFields(page: Page): Promise<boolean> {
  const validationErrors = await page.locator('.validation-error').count();
  return validationErrors === 0;
}

/**
 * Get current form step number
 */
export async function getCurrentStep(page: Page): Promise<number> {
  const stepText = await page.locator('#step-indicator').textContent();
  return parseInt(stepText?.match(/Step (\d+)/)?.[1] || '1');
}

/**
 * Click next button to advance form
 */
export async function nextStep(page: Page) {
  const currentStep = await getCurrentStep(page);
  await page.click('#next-btn');

  // Wait for step to change
  await expect(page.locator(`#step-${currentStep + 1}`)).toHaveClass(/active/, { timeout: 5000 });
}

/**
 * Click previous button to go back
 */
export async function previousStep(page: Page) {
  const currentStep = await getCurrentStep(page);
  await page.click('#prev-btn');

  // Wait for step to change
  await expect(page.locator(`#step-${currentStep - 1}`)).toHaveClass(/active/, { timeout: 5000 });
}

/**
 * Activate a specific form field for extraction
 */
export async function activateField(page: Page, fieldId: string) {
  await page.click(`#${fieldId}`);

  // Verify field is active (check if indicator shows it)
  await expect(page.locator('#active-field-indicator')).toContainText(fieldId, { timeout: 3000 });
}

/**
 * Get extraction count from trace panel
 */
export async function getExtractionCount(page: Page): Promise<number> {
  const countText = await page.locator('#extraction-count').textContent();
  return parseInt(countText || '0', 10);
}

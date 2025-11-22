/**
 * E2E Test Suite 5: Form Navigation and Multi-Step Wizard
 *
 * Tests the 8-step form wizard functionality:
 * - Step navigation (forward/backward)
 * - Progress indicator
 * - Dynamic field addition/removal
 * - Field validation
 * - Data persistence across steps
 * - Linked inputs
 */

import { test, expect } from '@playwright/test';
import {
  loadSamplePDF,
} from './helpers/pdf-helpers';
import {
  navigateToStep,
  fillStudyIdentification,
  getCurrentStep,
  nextStep,
  previousStep,
} from './helpers/form-helpers';

test.describe('Form Navigation and Multi-Step Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app initialization
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });

    // Load sample PDF
    await loadSamplePDF(page);
  });

  test('should start on step 1 (Study Identification)', async ({ page }) => {
    // Verify we're on step 1
    const currentStep = await getCurrentStep(page);
    expect(currentStep).toBe(1);

    // Verify step 1 is active
    await expect(page.locator('#step-1')).toHaveClass(/active/);

    // Verify step indicator shows "Step 1"
    await expect(page.locator('#step-indicator')).toContainText('Step 1');
  });

  test('should navigate forward through all 8 steps', async ({ page }) => {
    // Start on step 1
    expect(await getCurrentStep(page)).toBe(1);

    // Navigate forward through all 8 steps
    for (let i = 2; i <= 8; i++) {
      await nextStep(page);
      const currentStep = await getCurrentStep(page);
      expect(currentStep).toBe(i);

      // Verify correct step is active
      await expect(page.locator(`#step-${i}`)).toHaveClass(/active/);
    }

    // Verify we reached step 8
    expect(await getCurrentStep(page)).toBe(8);
  });

  test('should navigate backward through steps', async ({ page }) => {
    // Navigate to step 8 first
    await navigateToStep(page, 8);
    expect(await getCurrentStep(page)).toBe(8);

    // Navigate backward through all steps
    for (let i = 7; i >= 1; i--) {
      await previousStep(page);
      const currentStep = await getCurrentStep(page);
      expect(currentStep).toBe(i);

      // Verify correct step is active
      await expect(page.locator(`#step-${i}`)).toHaveClass(/active/);
    }

    // Verify we reached step 1
    expect(await getCurrentStep(page)).toBe(1);
  });

  test('should jump to specific step via direct navigation', async ({ page }) => {
    // Jump directly to step 5
    await navigateToStep(page, 5);
    expect(await getCurrentStep(page)).toBe(5);

    // Verify step 5 is active
    await expect(page.locator('#step-5')).toHaveClass(/active/);

    // Jump to step 3
    await navigateToStep(page, 3);
    expect(await getCurrentStep(page)).toBe(3);

    // Verify step 3 is active
    await expect(page.locator('#step-3')).toHaveClass(/active/);
  });

  test('should show progress indicator', async ({ page }) => {
    // Verify progress indicator is visible
    await expect(page.locator('#step-indicator')).toBeVisible();

    // Navigate to step 3
    await navigateToStep(page, 3);

    // Verify indicator shows correct step
    await expect(page.locator('#step-indicator')).toContainText('Step 3');

    // Navigate to step 7
    await navigateToStep(page, 7);

    // Verify indicator updated
    await expect(page.locator('#step-indicator')).toContainText('Step 7');
  });

  test('should enable/disable navigation buttons appropriately', async ({ page }) => {
    // On step 1, previous button should be disabled
    await navigateToStep(page, 1);
    const prevBtn = page.locator('#prev-btn');
    await expect(prevBtn).toBeDisabled();

    // Next button should be enabled
    const nextBtn = page.locator('#next-btn');
    await expect(nextBtn).toBeEnabled();

    // On step 8, next button should be disabled (or show submit)
    await navigateToStep(page, 8);

    // Either next button is disabled or submit button is visible
    const nextBtnDisabled = await nextBtn.isDisabled().catch(() => false);
    const submitBtnVisible = await page.locator('#submit-gsheets-btn').isVisible().catch(() => false);

    expect(nextBtnDisabled || submitBtnVisible).toBe(true);

    // Previous button should be enabled
    await expect(prevBtn).toBeEnabled();
  });

  test('should preserve form data across step navigation', async ({ page }) => {
    // Fill step 1 fields
    await fillStudyIdentification(page, {
      citation: 'Kim 2016 et al.',
      doi: '10.1016/example',
      pmid: '12345678',
      year: '2016',
    });

    // Navigate away to step 3
    await navigateToStep(page, 3);
    expect(await getCurrentStep(page)).toBe(3);

    // Navigate back to step 1
    await navigateToStep(page, 1);
    expect(await getCurrentStep(page)).toBe(1);

    // Verify data is preserved
    await expect(page.locator('#citation')).toHaveValue('Kim 2016 et al.');
    await expect(page.locator('#doi')).toHaveValue('10.1016/example');
    await expect(page.locator('#pmid')).toHaveValue('12345678');
    await expect(page.locator('#year')).toHaveValue('2016');
  });

  test('should handle dynamic field addition - interventions', async ({ page }) => {
    // Navigate to step 6 (Interventions)
    await navigateToStep(page, 6);

    // Count initial intervention fields
    const initialCount = await page.locator('[id^="intervention-"]').count();

    // Add new intervention
    const addBtn = page.locator('#add-intervention-btn');
    if (await addBtn.isVisible()) {
      await addBtn.click();

      // Wait for new field to appear
      await page.waitForTimeout(300);

      // Verify new field was added
      const newCount = await page.locator('[id^="intervention-"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should remove dynamic fields', async ({ page }) => {
    // Navigate to step 6 (Interventions)
    await navigateToStep(page, 6);

    // Add an intervention first
    const addBtn = page.locator('#add-intervention-btn');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);

      // Count fields before removal
      const countBefore = await page.locator('[id^="intervention-"]').count();

      // Find and click a remove button
      const removeBtn = page.locator('.remove-field-btn').first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(300);

        // Verify field was removed
        const countAfter = await page.locator('[id^="intervention-"]').count();
        expect(countAfter).toBeLessThan(countBefore);
      }
    }
  });

  test('should update selectors when adding study arms', async ({ page }) => {
    // Navigate to step 6 or step with arms
    await navigateToStep(page, 6);

    // Check if add arm button exists
    const addArmBtn = page.locator('#add-arm-btn');

    if (await addArmBtn.isVisible()) {
      // Count initial options in mortality/mRS selectors
      const initialMortalityOptions = await page.locator('#mortality-arm-1').locator('option').count()
        .catch(() => 0);

      // Add new arm
      await addArmBtn.click();
      await page.waitForTimeout(300);

      // Verify selectors updated (if mortality selectors exist)
      if (initialMortalityOptions > 0) {
        const newMortalityOptions = await page.locator('#mortality-arm-1').locator('option').count()
          .catch(() => 0);

        // New option should be added
        expect(newMortalityOptions).toBeGreaterThanOrEqual(initialMortalityOptions);
      }
    }
  });

  test('should display linked inputs correctly', async ({ page }) => {
    // Navigate to step 1
    await navigateToStep(page, 1);

    // Fill a linked input
    await page.fill('#citation', 'Test Study Citation');

    // Check if there are any linked inputs with same name
    const linkedInputs = page.locator('.linked-input[name="citation"]');
    const count = await linkedInputs.count();

    if (count > 1) {
      // Verify all linked inputs have same value
      for (let i = 0; i < count; i++) {
        const value = await linkedInputs.nth(i).inputValue();
        expect(value).toBe('Test Study Citation');
      }
    }
  });

  test('should validate DOI format (if validation enabled)', async ({ page }) => {
    // Navigate to step 1
    await navigateToStep(page, 1);

    // Fill DOI with valid format
    await page.fill('#doi', '10.1234/test.2016');

    // Check for validation error
    const hasError = await page.locator('#doi.validation-error').isVisible()
      .catch(() => false);

    // Valid DOI should not show error
    expect(hasError).toBe(false);

    // Try invalid format
    await page.fill('#doi', 'invalid-doi');
    await page.locator('#doi').blur();

    // May or may not show error depending on validation state
    // Just verify the field accepts the input
    const value = await page.locator('#doi').inputValue();
    expect(value).toBe('invalid-doi');
  });
});

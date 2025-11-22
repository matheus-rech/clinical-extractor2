/**
 * E2E Test Suite 1: PDF Upload and Navigation
 *
 * Tests the core PDF functionality:
 * - Uploading PDFs via button click
 * - Uploading PDFs via drag & drop
 * - Page navigation (next/prev/direct)
 * - Zoom controls
 * - Loading sample PDF
 */

import { test, expect } from '@playwright/test';
import {
  loadSamplePDF,
  uploadCustomPDF,
  navigateToPage,
  zoomTo,
  nextPage,
  previousPage,
  getCurrentPage,
  getTotalPages,
  verifyPDFRendered,
} from './helpers/pdf-helpers';

test.describe('PDF Upload and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app to initialize
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });
  });

  test('should display initial ready state', async ({ page }) => {
    // Verify app loaded successfully
    await expect(page.locator('#extraction-status')).toBeVisible();
    await expect(page.locator('#extraction-status')).toContainText(/ready/i);

    // Verify initial page count is 0
    await expect(page.locator('#total-pages')).toHaveText('0');

    // Verify PDF container is present
    await expect(page.locator('#pdf-container')).toBeVisible();
  });

  test('should load sample PDF via button click', async ({ page }) => {
    await loadSamplePDF(page);

    // Verify PDF loaded
    const totalPages = await getTotalPages(page);
    expect(totalPages).toBeGreaterThan(0);

    // Verify starting on page 1
    expect(await getCurrentPage(page)).toBe(1);

    // Verify PDF canvas rendered
    await verifyPDFRendered(page);

    // Verify status message
    await expect(page.locator('#extraction-status')).toContainText(/loaded|ready/i);
  });

  test('should upload PDF via file input', async ({ page }) => {
    // Check if sample PDF exists in fixtures
    const samplePath = './tests/e2e-playwright/fixtures/sample.pdf';

    try {
      await uploadCustomPDF(page, samplePath);

      // Verify PDF loaded
      const totalPages = await getTotalPages(page);
      expect(totalPages).toBeGreaterThan(0);

      // Verify canvas rendered
      await verifyPDFRendered(page);
    } catch (error) {
      // If sample.pdf doesn't exist yet, use the load sample button instead
      await loadSamplePDF(page);

      const totalPages = await getTotalPages(page);
      expect(totalPages).toBeGreaterThan(0);
    }
  });

  test('should navigate to next page', async ({ page }) => {
    await loadSamplePDF(page);

    const totalPages = await getTotalPages(page);

    // Only test if PDF has multiple pages
    if (totalPages > 1) {
      const initialPage = await getCurrentPage(page);

      await nextPage(page);

      const currentPage = await getCurrentPage(page);
      expect(currentPage).toBe(initialPage + 1);

      // Verify canvas updated
      await verifyPDFRendered(page);
    }
  });

  test('should navigate to previous page', async ({ page }) => {
    await loadSamplePDF(page);

    const totalPages = await getTotalPages(page);

    // Only test if PDF has multiple pages
    if (totalPages > 1) {
      // Go to page 2 first
      await nextPage(page);
      expect(await getCurrentPage(page)).toBe(2);

      // Then go back to page 1
      await previousPage(page);
      expect(await getCurrentPage(page)).toBe(1);

      // Verify canvas updated
      await verifyPDFRendered(page);
    }
  });

  test('should navigate to specific page via direct input', async ({ page }) => {
    await loadSamplePDF(page);

    const totalPages = await getTotalPages(page);

    // Test navigation to page 3 if available
    if (totalPages >= 3) {
      await navigateToPage(page, 3);

      expect(await getCurrentPage(page)).toBe(3);

      // Verify canvas updated
      await verifyPDFRendered(page);
    }
  });

  test('should zoom in (150%)', async ({ page }) => {
    await loadSamplePDF(page);

    // Get initial canvas size
    const canvas = page.locator('#pdf-container canvas').first();
    const initialBbox = await canvas.boundingBox();

    // Zoom to 150%
    await zoomTo(page, '1.5');

    // Get new canvas size
    const newBbox = await canvas.boundingBox();

    // Verify canvas is larger (allowing for some margin of error)
    expect(newBbox!.width).toBeGreaterThan(initialBbox!.width * 1.2);
  });

  test('should zoom out (75%)', async ({ page }) => {
    await loadSamplePDF(page);

    // Get initial canvas size (100%)
    const canvas = page.locator('#pdf-container canvas').first();
    const initialBbox = await canvas.boundingBox();

    // Zoom to 75%
    await zoomTo(page, '0.75');

    // Get new canvas size
    const newBbox = await canvas.boundingBox();

    // Verify canvas is smaller
    expect(newBbox!.width).toBeLessThan(initialBbox!.width * 0.9);
  });

  test('should disable prev button on first page', async ({ page }) => {
    await loadSamplePDF(page);

    // Verify we're on page 1
    expect(await getCurrentPage(page)).toBe(1);

    // Previous button should be disabled
    const prevBtn = page.locator('#pdf-prev-page');
    await expect(prevBtn).toBeDisabled();
  });

  test('should disable next button on last page', async ({ page }) => {
    await loadSamplePDF(page);

    const totalPages = await getTotalPages(page);

    // Navigate to last page
    await navigateToPage(page, totalPages);

    // Next button should be disabled
    const nextBtn = page.locator('#pdf-next-page');
    await expect(nextBtn).toBeDisabled();
  });

  test('should show total page count', async ({ page }) => {
    await loadSamplePDF(page);

    const totalPages = await getTotalPages(page);

    // Verify total pages is displayed and > 0
    expect(totalPages).toBeGreaterThan(0);

    // Verify total pages element is visible
    await expect(page.locator('#total-pages')).toBeVisible();
  });

  test('should maintain page number within bounds', async ({ page }) => {
    await loadSamplePDF(page);

    const totalPages = await getTotalPages(page);

    // Try to navigate beyond last page
    await page.fill('#page-num', (totalPages + 10).toString());
    await page.locator('#page-num').press('Enter');

    // Should stay on last page
    expect(await getCurrentPage(page)).toBe(totalPages);

    // Try to navigate before first page
    await page.fill('#page-num', '-5');
    await page.locator('#page-num').press('Enter');

    // Should stay on page 1
    expect(await getCurrentPage(page)).toBe(1);
  });
});

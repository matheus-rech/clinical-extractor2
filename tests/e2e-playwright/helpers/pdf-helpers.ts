/**
 * PDF Helper Utilities for Playwright E2E Tests
 *
 * Reusable functions for PDF operations in Clinical Extractor
 */

import { Page, expect } from '@playwright/test';

/**
 * Load the sample PDF (Kim2016.pdf) using the "Load Sample" button
 */
export async function loadSamplePDF(page: Page) {
  await page.click('#load-sample-btn');

  // Wait for PDF to load (total pages should update from 0)
  await expect(page.locator('#total-pages')).not.toHaveText('0', { timeout: 10000 });

  // Wait for status message indicating success
  await expect(page.locator('#extraction-status')).toContainText(/loaded|ready/i, { timeout: 10000 });
}

/**
 * Upload a custom PDF file via file input
 */
export async function uploadCustomPDF(page: Page, filePath: string) {
  const fileInput = page.locator('#pdf-file');
  await fileInput.setInputFiles(filePath);

  // Wait for PDF to load
  await expect(page.locator('#total-pages')).not.toHaveText('0', { timeout: 10000 });
}

/**
 * Navigate to a specific page number in the PDF
 */
export async function navigateToPage(page: Page, pageNumber: number) {
  await page.fill('#page-num', pageNumber.toString());
  await page.locator('#page-num').press('Enter');

  // Verify navigation succeeded
  await expect(page.locator('#page-num')).toHaveValue(pageNumber.toString());

  // Wait for page to render
  await page.waitForTimeout(500);
}

/**
 * Simulate text selection on PDF using mouse events
 * Clicks at start position, drags to end position, and releases
 */
export async function simulateTextSelection(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const textLayer = page.locator('.textLayer').first();

  // Click at start position
  await textLayer.click({ position: start });

  // Drag to end position
  await page.mouse.down();
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();

  // Wait for extraction processing
  await page.waitForTimeout(500);
}

/**
 * Set zoom level for PDF viewer
 */
export async function zoomTo(page: Page, scale: string) {
  await page.selectOption('#zoom-level', scale);

  // Wait for re-render
  await page.waitForTimeout(500);
}

/**
 * Click next page button
 */
export async function nextPage(page: Page) {
  const currentPage = await page.locator('#page-num').inputValue();
  await page.click('#pdf-next-page');

  // Wait for page change
  await expect(page.locator('#page-num')).not.toHaveValue(currentPage);
}

/**
 * Click previous page button
 */
export async function previousPage(page: Page) {
  const currentPage = await page.locator('#page-num').inputValue();
  await page.click('#pdf-prev-page');

  // Wait for page change
  await expect(page.locator('#page-num')).not.toHaveValue(currentPage);
}

/**
 * Get current page number
 */
export async function getCurrentPage(page: Page): Promise<number> {
  const pageNum = await page.locator('#page-num').inputValue();
  return parseInt(pageNum, 10);
}

/**
 * Get total pages count
 */
export async function getTotalPages(page: Page): Promise<number> {
  const totalText = await page.locator('#total-pages').textContent();
  return parseInt(totalText || '0', 10);
}

/**
 * Verify PDF canvas is visible and rendered
 */
export async function verifyPDFRendered(page: Page) {
  const canvas = page.locator('#pdf-container canvas').first();
  await expect(canvas).toBeVisible();

  // Verify canvas has content (width/height > 0)
  const bbox = await canvas.boundingBox();
  expect(bbox).not.toBeNull();
  expect(bbox!.width).toBeGreaterThan(0);
  expect(bbox!.height).toBeGreaterThan(0);
}

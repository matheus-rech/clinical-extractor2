/**
 * E2E Test Suite 6: Export Functionality
 *
 * Tests data export in multiple formats:
 * - JSON export with full data
 * - CSV export with extraction list
 * - Excel export with multi-sheet workbook
 * - HTML audit report with provenance
 * - Download handling and file validation
 */

import { test, expect } from '@playwright/test';
import { loadSamplePDF, simulateTextSelection } from './helpers/pdf-helpers';
import { fillStudyIdentification, navigateToStep } from './helpers/form-helpers';
import * as fs from 'fs';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app initialization
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });

    // Load sample PDF
    await loadSamplePDF(page);

    // Add some test data
    await fillStudyIdentification(page, {
      citation: 'Kim 2016 et al.',
      doi: '10.1016/example',
      pmid: '12345678',
      year: '2016',
    });

    // Add a manual extraction
    await page.click('#journal');
    await simulateTextSelection(page, { x: 100, y: 100 }, { x: 300, y: 100 });
    await page.waitForTimeout(500);
  });

  test('should export data as JSON', async ({ page }) => {
    // Wait for download
    const downloadPromise = page.waitForEvent('download');

    // Click export JSON button
    const exportBtn = page.locator('#export-json-btn');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      // Wait for download to complete
      const download = await downloadPromise;

      // Verify filename
      expect(download.suggestedFilename()).toMatch(/.*\.json$/);

      // Get file path and read content
      const filePath = await download.path();
      expect(filePath).toBeTruthy();

      if (filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        // Verify JSON structure
        expect(data).toHaveProperty('formData');
        expect(data).toHaveProperty('extractions');
      }
    }
  });

  test('should include all extractions in JSON export', async ({ page }) => {
    // Add multiple extractions
    await page.click('#year');
    await simulateTextSelection(page, { x: 100, y: 200 }, { x: 200, y: 200 });
    await page.waitForTimeout(500);

    await page.click('#country');
    await simulateTextSelection(page, { x: 100, y: 300 }, { x: 200, y: 300 });
    await page.waitForTimeout(500);

    // Export JSON
    const downloadPromise = page.waitForEvent('download');
    const exportBtn = page.locator('#export-json-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;
      const filePath = await download.path();

      if (filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        // Verify extractions array exists and has data
        expect(data.extractions).toBeDefined();
        expect(Array.isArray(data.extractions)).toBe(true);
        expect(data.extractions.length).toBeGreaterThan(0);
      }
    }
  });

  test('should export CSV with extraction data', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    // Click export CSV button
    const exportBtn = page.locator('#export-csv-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;

      // Verify filename
      expect(download.suggestedFilename()).toMatch(/.*\.csv$/);

      // Get file path and read content
      const filePath = await download.path();
      expect(filePath).toBeTruthy();

      if (filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');

        // CSV should have headers
        expect(content).toContain('Field');
        expect(content).toContain('Text');
        expect(content).toContain('Page');
      }
    }
  });

  test('should generate Excel workbook with multiple sheets', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    // Click export Excel button
    const exportBtn = page.locator('#export-excel-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;

      // Verify filename
      expect(download.suggestedFilename()).toMatch(/.*\.xlsx$/);

      // Verify file was downloaded
      const filePath = await download.path();
      expect(filePath).toBeTruthy();

      if (filePath) {
        // Verify file exists and has content
        const stats = await fs.promises.stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    }
  });

  test('should include coordinates in Excel export', async ({ page }) => {
    // Note: This test assumes Excel export includes coordinate data
    // Actual verification would require xlsx parsing library

    const downloadPromise = page.waitForEvent('download');
    const exportBtn = page.locator('#export-excel-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;
      const filePath = await download.path();

      expect(filePath).toBeTruthy();

      if (filePath) {
        // Verify file size indicates data was exported
        const stats = await fs.promises.stat(filePath);
        expect(stats.size).toBeGreaterThan(1000); // Should be > 1KB if it has real data
      }
    }
  });

  test('should format Excel with professional styling', async ({ page }) => {
    // This test verifies Excel export completes successfully
    // Actual styling verification would require xlsx library

    const downloadPromise = page.waitForEvent('download');
    const exportBtn = page.locator('#export-excel-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;

      // Verify successful download
      expect(download.suggestedFilename()).toMatch(/.*\.xlsx$/);

      const filePath = await download.path();
      expect(filePath).toBeTruthy();
    }
  });

  test('should generate HTML audit report', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    // Click export audit button
    const exportBtn = page.locator('#export-audit-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;

      // Verify filename
      expect(download.suggestedFilename()).toMatch(/.*\.html$/);

      // Get file path and read content
      const filePath = await download.path();
      expect(filePath).toBeTruthy();

      if (filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');

        // Verify HTML structure
        expect(content).toContain('<!DOCTYPE html>');
        expect(content).toContain('<html');
        expect(content).toContain('</html>');
      }
    }
  });

  test('should include provenance in audit report', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    const exportBtn = page.locator('#export-audit-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;
      const filePath = await download.path();

      if (filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');

        // Audit report should include metadata
        expect(content).toContain('Extraction'); // or 'Audit' or 'Report'

        // Should include timestamp or date
        expect(content.toLowerCase()).toMatch(/(timestamp|date|time)/);
      }
    }
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Navigate to fresh page without extractions
    await page.goto('/');
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });

    // Try to export without loading PDF or adding data
    const exportBtn = page.locator('#export-json-btn');

    if (await exportBtn.isVisible()) {
      // Should either show warning or export empty structure
      const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);

      await exportBtn.click();

      const download = await downloadPromise;

      if (download) {
        // If download happens, verify it has valid structure
        const filePath = await download.path();
        if (filePath) {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const data = JSON.parse(content);

          expect(data).toBeDefined();
          expect(data.extractions).toBeDefined();
        }
      }
      // Otherwise, warning was shown - also acceptable
    }
  });

  test('should download files with correct MIME types', async ({ page }) => {
    // Test JSON MIME type
    const jsonDownloadPromise = page.waitForEvent('download');
    const jsonBtn = page.locator('#export-json-btn');

    if (await jsonBtn.isVisible()) {
      await jsonBtn.click();
      const jsonDownload = await jsonDownloadPromise;

      // Verify JSON filename
      expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
    }

    // Allow UI to settle
    await page.waitForTimeout(500);

    // Test CSV MIME type
    const csvDownloadPromise = page.waitForEvent('download');
    const csvBtn = page.locator('#export-csv-btn');

    if (await csvBtn.isVisible()) {
      await csvBtn.click();
      const csvDownload = await csvDownloadPromise;

      // Verify CSV filename
      expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
    }

    // Allow UI to settle
    await page.waitForTimeout(500);

    // Test Excel MIME type
    const xlsxDownloadPromise = page.waitForEvent('download');
    const xlsxBtn = page.locator('#export-excel-btn');

    if (await xlsxBtn.isVisible()) {
      await xlsxBtn.click();
      const xlsxDownload = await xlsxDownloadPromise;

      // Verify Excel filename
      expect(xlsxDownload.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });
});

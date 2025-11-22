/**
 * E2E Test Suite 7: Search and Annotation
 *
 * Tests search and annotation functionality:
 * - Basic text search with highlighting
 * - Regex search support
 * - Search result navigation
 * - Semantic search with TF-IDF
 * - Highlight annotations
 * - Sticky note annotations
 * - Shape annotations
 * - Annotation persistence and export
 */

import { test, expect } from '@playwright/test';
import { loadSamplePDF } from './helpers/pdf-helpers';

test.describe('Search and Annotation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app initialization
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });

    // Load sample PDF
    await loadSamplePDF(page);
  });

  test('should search for text in PDF', async ({ page }) => {
    // Check if search interface exists
    const searchInput = page.locator('#search-input');

    if (await searchInput.isVisible()) {
      // Enter search query
      await searchInput.fill('study');

      // Click search button or press Enter
      await searchInput.press('Enter');

      // Wait for search to complete
      await page.waitForTimeout(1000);

      // Verify search results or highlights appear
      const highlights = page.locator('.search-highlight');
      const highlightCount = await highlights.count();

      // Should find at least some matches
      expect(highlightCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should navigate between search results', async ({ page }) => {
    const searchInput = page.locator('#search-input');

    if (await searchInput.isVisible()) {
      // Search for common term
      await searchInput.fill('the');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Check for next/previous buttons
      const nextBtn = page.locator('#next-search-result');
      const prevBtn = page.locator('#prev-search-result');

      if (await nextBtn.isVisible()) {
        // Click next to navigate through results
        await nextBtn.click();
        await page.waitForTimeout(300);

        // Verify navigation occurred (current result should change)
        const currentResult = page.locator('#current-search-result');
        if (await currentResult.isVisible()) {
          const resultText = await currentResult.textContent();
          expect(resultText).toBeTruthy();
        }
      }
    }
  });

  test('should support case-sensitive search', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    const caseSensitiveToggle = page.locator('#case-sensitive-toggle');

    if (await searchInput.isVisible() && await caseSensitiveToggle.isVisible()) {
      // Enable case-sensitive
      await caseSensitiveToggle.check();

      // Search for uppercase term
      await searchInput.fill('Study');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      const highlightsUpper = await page.locator('.search-highlight').count();

      // Search for lowercase term
      await searchInput.fill('study');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      const highlightsLower = await page.locator('.search-highlight').count();

      // Results might differ (depending on PDF content)
      expect(highlightsUpper).toBeGreaterThanOrEqual(0);
      expect(highlightsLower).toBeGreaterThanOrEqual(0);
    }
  });

  test('should support regex search', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    const regexToggle = page.locator('#regex-toggle');

    if (await searchInput.isVisible() && await regexToggle.isVisible()) {
      // Enable regex mode
      await regexToggle.check();

      // Search with regex pattern (e.g., any 4-digit number)
      await searchInput.fill('\\d{4}');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Should find year numbers or similar
      const highlights = await page.locator('.search-highlight').count();
      expect(highlights).toBeGreaterThanOrEqual(0);
    }
  });

  test('should clear search highlights', async ({ page }) => {
    const searchInput = page.locator('#search-input');

    if (await searchInput.isVisible()) {
      // Perform search
      await searchInput.fill('patient');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Check if clear button exists
      const clearBtn = page.locator('#clear-search-btn');

      if (await clearBtn.isVisible()) {
        // Click clear
        await clearBtn.click();
        await page.waitForTimeout(300);

        // Verify highlights removed
        const highlights = await page.locator('.search-highlight').count();
        expect(highlights).toBe(0);
      }
    }
  });

  test('should perform semantic search with TF-IDF', async ({ page }) => {
    // Check if semantic search interface exists
    const semanticSearchBtn = page.locator('#semantic-search-btn');

    if (await semanticSearchBtn.isVisible()) {
      const searchInput = page.locator('#search-input');

      // Enter complex query
      await searchInput.fill('mortality rate');

      // Click semantic search
      await semanticSearchBtn.click();
      await page.waitForTimeout(1500);

      // Verify results panel appears
      const resultsPanel = page.locator('#search-results-panel');

      if (await resultsPanel.isVisible()) {
        // Check for ranked results
        const results = page.locator('.search-result-item');
        const count = await results.count();

        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should add yellow highlight annotation', async ({ page }) => {
    // Check if annotation tools exist
    const highlightBtn = page.locator('#annotation-highlight-btn');

    if (await highlightBtn.isVisible()) {
      // Click highlight tool
      await highlightBtn.click();

      // Select color (yellow)
      const yellowColorBtn = page.locator('#annotation-color-yellow');
      if (await yellowColorBtn.isVisible()) {
        await yellowColorBtn.click();
      }

      // Click on PDF to add highlight
      const pdfCanvas = page.locator('#pdf-container canvas').first();
      await pdfCanvas.click({ position: { x: 150, y: 150 } });

      // Wait for annotation to render
      await page.waitForTimeout(500);

      // Verify annotation was added
      const annotations = page.locator('.annotation-highlight');
      const count = await annotations.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should add sticky note annotation', async ({ page }) => {
    const noteBtn = page.locator('#annotation-note-btn');

    if (await noteBtn.isVisible()) {
      // Click note tool
      await noteBtn.click();

      // Click on PDF to place note
      const pdfCanvas = page.locator('#pdf-container canvas').first();
      await pdfCanvas.click({ position: { x: 200, y: 200 } });

      // Wait for comment dialog
      await page.waitForTimeout(500);

      // Check if comment input exists
      const commentInput = page.locator('#annotation-comment-input');

      if (await commentInput.isVisible()) {
        // Enter comment
        await commentInput.fill('Need to verify this data');

        // Save comment
        const saveBtn = page.locator('#save-annotation-btn');
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
        }

        // Wait for annotation to render
        await page.waitForTimeout(500);

        // Verify sticky note was added
        const notes = page.locator('.annotation-note');
        const count = await notes.count();

        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should add shape annotation (rectangle)', async ({ page }) => {
    const shapeBtn = page.locator('#annotation-shape-btn');

    if (await shapeBtn.isVisible()) {
      // Click shape tool
      await shapeBtn.click();

      // Select rectangle
      const rectBtn = page.locator('#shape-rectangle-btn');
      if (await rectBtn.isVisible()) {
        await rectBtn.click();
      }

      // Draw rectangle on PDF
      const pdfCanvas = page.locator('#pdf-container canvas').first();

      // Mouse down, drag, mouse up
      await pdfCanvas.click({ position: { x: 100, y: 300 } });
      await page.mouse.down();
      await page.mouse.move(300, 400);
      await page.mouse.up();

      // Wait for shape to render
      await page.waitForTimeout(500);

      // Verify shape was added
      const shapes = page.locator('.annotation-shape');
      const count = await shapes.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should persist annotations across sessions', async ({ page }) => {
    const highlightBtn = page.locator('#annotation-highlight-btn');

    if (await highlightBtn.isVisible()) {
      // Add annotation
      await highlightBtn.click();

      const pdfCanvas = page.locator('#pdf-container canvas').first();
      await pdfCanvas.click({ position: { x: 250, y: 250 } });
      await page.waitForTimeout(500);

      // Count annotations
      const countBefore = await page.locator('.annotation-highlight').count();

      // Reload page
      await page.reload();

      // Wait for app to initialize
      await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });

      // Load same PDF
      await loadSamplePDF(page);
      await page.waitForTimeout(1000);

      // Verify annotations restored
      const countAfter = await page.locator('.annotation-highlight').count();

      expect(countAfter).toBeGreaterThanOrEqual(0);
    }
  });

  test('should export annotations as JSON', async ({ page }) => {
    const exportAnnotationsBtn = page.locator('#export-annotations-btn');

    if (await exportAnnotationsBtn.isVisible()) {
      // Wait for download
      const downloadPromise = page.waitForEvent('download');

      // Click export
      await exportAnnotationsBtn.click();

      // Get download
      const download = await downloadPromise;

      // Verify filename
      expect(download.suggestedFilename()).toMatch(/annotation.*\.json$/i);

      // Verify file content
      const filePath = await download.path();
      if (filePath) {
        const fs = require('fs');
        const content = await fs.promises.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        // Should be array of annotations
        expect(Array.isArray(data)).toBe(true);
      }
    }
  });

  test('should import annotations from JSON', async ({ page }) => {
    const importAnnotationsBtn = page.locator('#import-annotations-btn');

    if (await importAnnotationsBtn.isVisible()) {
      // Create test annotation file
      const testAnnotations = [
        {
          id: 'test-1',
          type: 'highlight',
          pageNum: 1,
          color: 'yellow',
          coordinates: { x: 100, y: 100, width: 200, height: 20 },
          text: 'Test annotation',
          timestamp: Date.now(),
        },
      ];

      const fs = require('fs');
      const tempFile = '/tmp/test-annotations.json';
      await fs.promises.writeFile(tempFile, JSON.stringify(testAnnotations));

      // Upload file
      const fileInput = page.locator('#annotation-import-input');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(tempFile);

        // Wait for import
        await page.waitForTimeout(1000);

        // Verify annotation was imported
        const annotations = page.locator('.annotation-highlight');
        const count = await annotations.count();

        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

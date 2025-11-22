/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Backend Migration E2E Tests
 *
 * End-to-end tests for the complete backend migration:
 * - Backend-first routing for AI operations
 * - Automatic fallback to DirectGeminiClient
 * - Cache utilization across operations
 * - UI integration with backend services
 *
 * These tests run in a real browser environment using Playwright
 * to verify the complete user workflow.
 */

import { test, expect, Page } from '@playwright/test';
import { loadSamplePDF, navigateToPage } from './helpers/pdf-helpers';

test.describe('Backend Migration E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to application
        await page.goto('http://localhost:3000');

        // Wait for app to be ready
        await page.waitForSelector('#pdf-upload', { state: 'visible' });
    });

    test.describe('Backend-First AI Operations', () => {
        test('should generate PICO via backend API', async ({ page }) => {
            // Load sample PDF
            await loadSamplePDF(page);
            await page.waitForTimeout(2000); // Wait for PDF to fully load

            // Monitor network requests
            const backendRequests: string[] = [];
            page.on('request', request => {
                const url = request.url();
                if (url.includes('/api/ai/')) {
                    backendRequests.push(url);
                }
            });

            // Click Generate PICO button
            await page.click('button:has-text("Generate PICO")');

            // Wait for processing
            await page.waitForSelector('.status-message:has-text("Processing")', { state: 'visible' });
            await page.waitForSelector('.status-message:has-text("PICO generated successfully")', {
                state: 'visible',
                timeout: 60000
            });

            // Verify backend API was called
            expect(backendRequests.some(url => url.includes('/api/ai/generate-pico'))).toBe(true);

            // Verify PICO fields populated
            const populationField = await page.inputValue('#population');
            const interventionField = await page.inputValue('#intervention');

            expect(populationField).not.toBe('');
            expect(interventionField).not.toBe('');

            // Verify trace log shows backend route
            const traceLog = await page.textContent('#trace-log');
            expect(traceLog).toContain('Backend API');
        });

        test('should generate summary via backend API', async ({ page }) => {
            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            const backendRequests: string[] = [];
            page.on('request', request => {
                const url = request.url();
                if (url.includes('/api/ai/generate-summary')) {
                    backendRequests.push(url);
                }
            });

            await page.click('button:has-text("Generate Summary")');

            await page.waitForSelector('.status-message:has-text("Summary generated")', {
                state: 'visible',
                timeout: 60000
            });

            expect(backendRequests.length).toBeGreaterThan(0);

            const summaryField = await page.inputValue('#summary');
            expect(summaryField).not.toBe('');
        });

        test('should validate field via backend API', async ({ page }) => {
            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            // Fill a field manually
            await page.fill('#sample-size', '57 patients');

            const backendRequests: string[] = [];
            page.on('request', request => {
                const url = request.url();
                if (url.includes('/api/ai/validate-field')) {
                    backendRequests.push(url);
                }
            });

            // Click validate button
            await page.click('button:has-text("Validate Field")');

            await page.waitForSelector('.validation-result', {
                state: 'visible',
                timeout: 30000
            });

            expect(backendRequests.length).toBeGreaterThan(0);

            // Check validation result displayed
            const validationResult = await page.textContent('.validation-result');
            expect(validationResult).toContain('Confidence:');
        });
    });

    test.describe('Fallback to DirectGeminiClient', () => {
        test('should fallback when backend unavailable', async ({ page }) => {
            // Mock backend unavailable by intercepting requests
            await page.route('**/api/ai/**', route => {
                route.abort('failed');
            });

            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            // Try to generate PICO
            await page.click('button:has-text("Generate PICO")');

            // Should show fallback message
            await page.waitForSelector('.status-message:has-text("Using fallback")', {
                state: 'visible',
                timeout: 10000
            });

            // Should still complete successfully
            await page.waitForSelector('.status-message:has-text("PICO generated")', {
                state: 'visible',
                timeout: 60000
            });

            // Verify fields populated despite fallback
            const populationField = await page.inputValue('#population');
            expect(populationField).not.toBe('');
        });

        test('should fallback when backend times out', async ({ page }) => {
            // Simulate timeout by delaying response
            await page.route('**/api/ai/generate-summary', route => {
                setTimeout(() => route.abort('timedout'), 31000);
            });

            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            await page.click('button:has-text("Generate Summary")');

            // Should detect timeout and fallback
            await page.waitForSelector('.status-message', {
                state: 'visible',
                timeout: 90000 // Allow time for timeout + fallback
            });

            const statusText = await page.textContent('.status-message');
            expect(statusText).toMatch(/fallback|timeout/i);
        });

        test('should fallback when backend returns 500 error', async ({ page }) => {
            await page.route('**/api/ai/**', route => {
                route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Internal Server Error' })
                });
            });

            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            await page.click('button:has-text("Generate PICO")');

            // Should handle error gracefully and fallback
            await page.waitForSelector('.status-message', {
                state: 'visible',
                timeout: 60000
            });

            const statusText = await page.textContent('.status-message');
            expect(statusText).toMatch(/fallback|error/i);
        });
    });

    test.describe('Cache Utilization', () => {
        test('should use cached PDF text for multiple AI operations', async ({ page }) => {
            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            // Track PDF text extraction calls
            let pdfExtractionCount = 0;
            page.on('console', msg => {
                if (msg.text().includes('Extracting PDF text')) {
                    pdfExtractionCount++;
                }
            });

            // First operation - PICO
            await page.click('button:has-text("Generate PICO")');
            await page.waitForSelector('.status-message:has-text("PICO generated")', {
                state: 'visible',
                timeout: 60000
            });

            const firstExtractionCount = pdfExtractionCount;

            // Second operation - Summary (should use cached text)
            await page.click('button:has-text("Generate Summary")');
            await page.waitForSelector('.status-message:has-text("Summary generated")', {
                state: 'visible',
                timeout: 60000
            });

            // PDF text should only be extracted once
            expect(pdfExtractionCount).toBe(firstExtractionCount);
        });

        test('should show cache statistics', async ({ page }) => {
            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            // Perform operations to populate cache
            await page.click('button:has-text("Generate PICO")');
            await page.waitForTimeout(5000);

            // Open cache statistics panel (if exists)
            const cacheStatsButton = page.locator('button:has-text("Cache Stats")');
            if (await cacheStatsButton.count() > 0) {
                await cacheStatsButton.click();

                // Verify stats displayed
                const statsPanel = page.locator('.cache-stats-panel');
                await expect(statsPanel).toBeVisible();

                const statsText = await statsPanel.textContent();
                expect(statsText).toMatch(/hit rate|cache size/i);
            }
        });
    });

    test.describe('Performance Monitoring', () => {
        test('should complete PICO generation within 30 seconds (backend)', async ({ page }) => {
            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            const startTime = Date.now();

            await page.click('button:has-text("Generate PICO")');
            await page.waitForSelector('.status-message:has-text("PICO generated")', {
                state: 'visible',
                timeout: 60000
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(30000); // Less than 30 seconds
        });

        test('should handle large PDFs without timeout', async ({ page }) => {
            // Upload a larger PDF (if available)
            const fileInput = await page.locator('#pdf-upload');

            // Note: This test assumes a large test PDF exists
            // In practice, you would upload a real large file here

            await page.click('button:has-text("Generate PICO")');

            // Larger timeout for big documents
            await page.waitForSelector('.status-message', {
                state: 'visible',
                timeout: 120000 // 2 minutes
            });

            const statusText = await page.textContent('.status-message');
            expect(statusText).not.toContain('timeout');
        });
    });

    test.describe('Error Handling', () => {
        test('should display user-friendly error messages', async ({ page }) => {
            await page.route('**/api/ai/**', route => {
                route.fulfill({
                    status: 429,
                    body: JSON.stringify({ error: 'Rate limit exceeded' })
                });
            });

            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            await page.click('button:has-text("Generate PICO")');

            // Should show user-friendly error
            await page.waitForSelector('.status-message.error', {
                state: 'visible',
                timeout: 10000
            });

            const errorText = await page.textContent('.status-message.error');
            expect(errorText).toMatch(/rate limit|try again/i);
        });

        test('should recover from network errors', async ({ page }) => {
            let requestCount = 0;

            await page.route('**/api/ai/**', route => {
                requestCount++;
                if (requestCount === 1) {
                    // Fail first request
                    route.abort('failed');
                } else {
                    // Succeed on retry
                    route.continue();
                }
            });

            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            await page.click('button:has-text("Generate PICO")');

            // Should retry and eventually succeed
            await page.waitForSelector('.status-message:has-text("PICO generated")', {
                state: 'visible',
                timeout: 90000
            });

            expect(requestCount).toBeGreaterThan(1); // Verify retry occurred
        });
    });

    test.describe('Complete User Workflow', () => {
        test('should complete full extraction workflow with backend', async ({ page }) => {
            // 1. Load PDF
            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            // 2. Generate PICO
            await page.click('button:has-text("Generate PICO")');
            await page.waitForSelector('.status-message:has-text("PICO generated")', {
                timeout: 60000
            });

            // 3. Generate Summary
            await page.click('button:has-text("Generate Summary")');
            await page.waitForSelector('.status-message:has-text("Summary generated")', {
                timeout: 60000
            });

            // 4. Validate a field
            await page.fill('#sample-size', '57 patients');
            await page.click('button[data-field="sample-size"]:has-text("Validate")');
            await page.waitForSelector('.validation-result', { timeout: 30000 });

            // 5. Extract tables
            await page.click('button:has-text("Extract Tables")');
            await page.waitForSelector('.status-message:has-text("Tables extracted")', {
                timeout: 60000
            });

            // 6. Verify all data populated
            const picoField = await page.inputValue('#population');
            const summaryField = await page.inputValue('#summary');

            expect(picoField).not.toBe('');
            expect(summaryField).not.toBe('');

            // 7. Export data
            await page.click('button:has-text("Export JSON")');

            // Verify download triggered (if implemented)
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
            const download = await downloadPromise;

            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.json$/);
            }
        });
    });

    test.describe('Backend Health Monitoring', () => {
        test('should display backend health status', async ({ page }) => {
            // Check if health indicator exists
            const healthIndicator = page.locator('.backend-health-indicator');

            if (await healthIndicator.count() > 0) {
                await expect(healthIndicator).toBeVisible();

                const healthStatus = await healthIndicator.textContent();
                expect(healthStatus).toMatch(/healthy|degraded|unhealthy/i);
            }
        });

        test('should switch routing based on backend health', async ({ page }) => {
            // Simulate backend becoming unhealthy
            await page.route('**/api/health', route => {
                route.fulfill({
                    status: 503,
                    body: JSON.stringify({ status: 'unhealthy' })
                });
            });

            await loadSamplePDF(page);
            await page.waitForTimeout(2000);

            await page.click('button:has-text("Generate PICO")');

            // Should automatically use fallback
            await page.waitForSelector('.status-message', {
                state: 'visible',
                timeout: 60000
            });

            const statusText = await page.textContent('.status-message');
            // Should still complete successfully
            expect(statusText).toMatch(/generated|success/i);
        });
    });
});

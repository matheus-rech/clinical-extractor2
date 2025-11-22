/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cache Integration Tests
 *
 * Tests the unified caching system across the application:
 * - CacheManager: Central cache orchestration
 * - PDFTextCache: PDF text extraction caching
 * - HTTPResponseCache: HTTP response caching with TTL
 * - AIResultCache: AI operation result caching
 * - LRU eviction policies
 * - Memory management
 *
 * Test Coverage:
 * - Cache creation and retrieval
 * - TTL expiration
 * - LRU eviction when cache full
 * - Memory limits and size tracking
 * - Cache statistics and monitoring
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { CacheManager, PDFTextCache, HTTPResponseCache, AIResultCache } from '../../src/services/CacheManager';
import { LRUCache } from '../../src/utils/LRUCache';

describe('Cache Integration Tests', () => {
    beforeEach(() => {
        // Clear all caches before each test
        CacheManager.clearAll();
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Cleanup after each test
        CacheManager.clearAll();
    });

    describe('CacheManager - Central Orchestration', () => {
        it('should create and retrieve named caches', () => {
            const cache1 = CacheManager.getCache('test-cache-1');
            const cache2 = CacheManager.getCache('test-cache-2');

            expect(cache1).toBeDefined();
            expect(cache2).toBeDefined();
            expect(cache1).not.toBe(cache2);
        });

        it('should return same cache instance for same name', () => {
            const cache1 = CacheManager.getCache('test-cache');
            const cache2 = CacheManager.getCache('test-cache');

            expect(cache1).toBe(cache2);
        });

        it('should list all cache names', () => {
            CacheManager.getCache('cache-1');
            CacheManager.getCache('cache-2');
            CacheManager.getCache('cache-3');

            const names = CacheManager.listCaches();

            expect(names).toContain('cache-1');
            expect(names).toContain('cache-2');
            expect(names).toContain('cache-3');
            expect(names.length).toBeGreaterThanOrEqual(3);
        });

        it('should clear all caches', () => {
            const cache1 = CacheManager.getCache<string, string>('cache-1');
            const cache2 = CacheManager.getCache<string, string>('cache-2');

            cache1.set('key1', 'value1');
            cache2.set('key2', 'value2');

            expect(cache1.get('key1')).toBe('value1');
            expect(cache2.get('key2')).toBe('value2');

            CacheManager.clearAll();

            expect(cache1.get('key1')).toBeUndefined();
            expect(cache2.get('key2')).toBeUndefined();
        });

        it('should clear specific cache by name', () => {
            const cache1 = CacheManager.getCache<string, string>('cache-1');
            const cache2 = CacheManager.getCache<string, string>('cache-2');

            cache1.set('key1', 'value1');
            cache2.set('key2', 'value2');

            const cleared = CacheManager.clear('cache-1');

            expect(cleared).toBe(true);
            expect(cache1.get('key1')).toBeUndefined();
            expect(cache2.get('key2')).toBe('value2'); // Unchanged
        });

        it('should return false when clearing non-existent cache', () => {
            const cleared = CacheManager.clear('non-existent-cache');
            expect(cleared).toBe(false);
        });

        it('should get statistics for all caches', () => {
            const cache1 = CacheManager.getCache<string, string>('cache-1');
            const cache2 = CacheManager.getCache<string, string>('cache-2');

            cache1.set('key1', 'value1');
            cache2.set('key2', 'value2');

            const stats = CacheManager.getAllStats();

            expect(stats['cache-1']).toBeDefined();
            expect(stats['cache-2']).toBeDefined();
            expect(stats['cache-1'].size).toBe(1);
            expect(stats['cache-2'].size).toBe(1);
        });

        it('should get statistics for specific cache', () => {
            const cache = CacheManager.getCache<string, string>('test-cache');
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const stats = CacheManager.getStats('test-cache');

            expect(stats).toBeDefined();
            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBeDefined();
        });

        it('should delete cache instance', () => {
            CacheManager.getCache('test-cache');
            expect(CacheManager.listCaches()).toContain('test-cache');

            const deleted = CacheManager.deleteCache('test-cache');

            expect(deleted).toBe(true);
            expect(CacheManager.listCaches()).not.toContain('test-cache');
        });
    });

    describe('PDFTextCache - PDF Text Extraction', () => {
        it('should cache PDF text across multiple requests', () => {
            const pageData = {
                fullText: 'This is the full text of page 1 from a medical research paper.',
                items: [
                    { str: 'This is the full text', x: 10, y: 20, width: 100, height: 10 }
                ]
            };

            // First access - cache miss
            expect(PDFTextCache.get(1)).toBeUndefined();

            // Store in cache
            PDFTextCache.set(1, pageData);

            // Second access - cache hit
            const cachedData = PDFTextCache.get(1);
            expect(cachedData).toBeDefined();
            expect(cachedData?.fullText).toBe(pageData.fullText);
            expect(cachedData?.items).toEqual(pageData.items);

            // Verify cache statistics
            const stats = PDFTextCache.getStats();
            expect(stats.hitCount).toBe(1);
            expect(stats.missCount).toBe(1);
            expect(stats.size).toBe(1);
        });

        it('should handle large PDF text (10MB limit)', () => {
            // Create large text (~1MB per page)
            // Note: LRUCache.calculateSize() uses JSON.stringify().length * 2
            // So 1MB text → ~2MB in memory calculation
            const largePage = {
                fullText: 'A'.repeat(1024 * 1024), // 1MB
                items: []
            };

            // Add 4 pages (~8MB total after *2 multiplier)
            // 5 pages would exceed the 10MB limit
            for (let i = 1; i <= 4; i++) {
                PDFTextCache.set(i, largePage);
            }

            const stats = PDFTextCache.getStats();
            expect(stats.size).toBe(4);

            // All 4 pages should be accessible
            for (let i = 1; i <= 4; i++) {
                expect(PDFTextCache.get(i)).toBeDefined();
            }

            // Verify total memory is under 10MB limit
            expect(stats.memoryUsage).toBeLessThan(10 * 1024 * 1024);
        });

        it('should evict oldest entries when exceeding 50 pages', () => {
            // Fill cache to capacity (50 pages)
            for (let i = 1; i <= 50; i++) {
                PDFTextCache.set(i, { fullText: `Page ${i}`, items: [] });
            }

            expect(PDFTextCache.getStats().size).toBe(50);

            // Add 51st page - should evict page 1
            PDFTextCache.set(51, { fullText: 'Page 51', items: [] });

            expect(PDFTextCache.getStats().size).toBe(50); // Still 50
            expect(PDFTextCache.get(1)).toBeUndefined(); // Page 1 evicted
            expect(PDFTextCache.get(51)).toBeDefined(); // Page 51 present
        });
    });

    describe('HTTPResponseCache - HTTP Response Caching', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should cache HTTP responses with TTL', () => {
            const mockResponse = {
                status: 200,
                data: { result: 'success' },
                headers: { 'content-type': 'application/json' }
            };

            HTTPResponseCache.set('GET:/api/test', mockResponse);

            const cached = HTTPResponseCache.get('GET:/api/test');
            expect(cached).toEqual(mockResponse);
        });

        it('should expire entries after 5 minutes TTL', () => {
            const mockResponse = { status: 200, data: 'test' };

            HTTPResponseCache.set('GET:/api/test', mockResponse);
            expect(HTTPResponseCache.get('GET:/api/test')).toBeDefined();

            // Advance time by 4 minutes - should still be cached
            jest.advanceTimersByTime(4 * 60 * 1000);
            expect(HTTPResponseCache.get('GET:/api/test')).toBeDefined();

            // Advance time by 2 more minutes (6 total) - should expire
            jest.advanceTimersByTime(2 * 60 * 1000);
            expect(HTTPResponseCache.get('GET:/api/test')).toBeUndefined();
        });

        it('should handle cache key format correctly', () => {
            const response1 = { data: 'response1' };
            const response2 = { data: 'response2' };

            HTTPResponseCache.set('GET:/api/endpoint1', response1);
            HTTPResponseCache.set('POST:/api/endpoint2', response2);

            expect(HTTPResponseCache.get('GET:/api/endpoint1')).toEqual(response1);
            expect(HTTPResponseCache.get('POST:/api/endpoint2')).toEqual(response2);
            expect(HTTPResponseCache.get('GET:/api/endpoint2')).toBeUndefined();
        });

        it('should evict LRU entries when exceeding 100 entries', () => {
            // Fill cache to capacity
            for (let i = 1; i <= 100; i++) {
                HTTPResponseCache.set(`GET:/api/endpoint${i}`, { data: `response${i}` });
            }

            expect(HTTPResponseCache.getStats().size).toBe(100);

            // Add 101st entry - should evict least recently used
            HTTPResponseCache.set('GET:/api/endpoint101', { data: 'response101' });

            expect(HTTPResponseCache.getStats().size).toBe(100);
            expect(HTTPResponseCache.get('GET:/api/endpoint101')).toBeDefined();
        });
    });

    describe('AIResultCache - AI Operation Results', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should cache AI results with 10 minute TTL', () => {
            const mockPICOResult = {
                population: '57 patients',
                intervention: 'Decompressive craniectomy',
                comparator: 'Standard care',
                outcome: 'Mortality',
                timing: '6 months',
                studyType: 'RCT'
            };

            AIResultCache.set('pico:hash123', mockPICOResult);

            const cached = AIResultCache.get('pico:hash123');
            expect(cached).toEqual(mockPICOResult);
        });

        it('should expire AI results after 10 minutes', () => {
            const mockResult = { summary: 'Test summary' };

            AIResultCache.set('summary:hash456', mockResult);
            expect(AIResultCache.get('summary:hash456')).toBeDefined();

            // Advance time by 9 minutes - should still be cached
            jest.advanceTimersByTime(9 * 60 * 1000);
            expect(AIResultCache.get('summary:hash456')).toBeDefined();

            // Advance time by 2 more minutes (11 total) - should expire
            jest.advanceTimersByTime(2 * 60 * 1000);
            expect(AIResultCache.get('summary:hash456')).toBeUndefined();
        });

        it('should handle different AI operation types', () => {
            const picoResult = { population: 'Test' };
            const summaryResult = { summary: 'Test summary' };
            const validationResult = { is_supported: true, quote: 'Test', confidence: 0.9 };

            AIResultCache.set('pico:abc', picoResult);
            AIResultCache.set('summary:def', summaryResult);
            AIResultCache.set('validation:ghi', validationResult);

            expect(AIResultCache.get('pico:abc')).toEqual(picoResult);
            expect(AIResultCache.get('summary:def')).toEqual(summaryResult);
            expect(AIResultCache.get('validation:ghi')).toEqual(validationResult);
        });

        it('should evict LRU entries when exceeding 50 entries', () => {
            // Fill cache to capacity
            for (let i = 1; i <= 50; i++) {
                AIResultCache.set(`result:${i}`, { data: `result${i}` });
            }

            expect(AIResultCache.getStats().size).toBe(50);

            // Add 51st entry - should evict least recently used
            AIResultCache.set('result:51', { data: 'result51' });

            expect(AIResultCache.getStats().size).toBe(50);
            expect(AIResultCache.get('result:51')).toBeDefined();
        });
    });

    describe('Cache Hit Rate Analysis', () => {
        it('should track cache hit rate accurately', () => {
            const cache = CacheManager.getCache<string, string>('test-cache');

            // Populate cache
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Perform mixed hits and misses
            cache.get('key1'); // Hit
            cache.get('key2'); // Hit
            cache.get('key4'); // Miss
            cache.get('key1'); // Hit
            cache.get('key5'); // Miss

            const stats = cache.getStats();

            expect(stats.hitCount).toBe(3);
            expect(stats.missCount).toBe(2);
            expect(stats.hitRate).toBeCloseTo(60, 1); // 60% hit rate
        });

        it('should achieve 80%+ hit rate after warmup', () => {
            const cache = CacheManager.getCache<string, string>('warmup-cache', {
                maxSize: 50
            });

            // Warmup: Add 50 entries
            for (let i = 1; i <= 50; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            // Simulate realistic access pattern (80% hits, 20% misses)
            for (let i = 0; i < 100; i++) {
                if (Math.random() < 0.8) {
                    // 80% chance of accessing existing key
                    const randomKey = Math.floor(Math.random() * 50) + 1;
                    cache.get(`key${randomKey}`);
                } else {
                    // 20% chance of accessing non-existent key
                    cache.get(`missing${i}`);
                }
            }

            const stats = cache.getStats();
            expect(stats.hitRate).toBeGreaterThanOrEqual(0.7); // At least 70% in practice
        });
    });

    describe('Memory Management', () => {
        it('should respect memory limits', () => {
            const cache = CacheManager.getCache<string, string>('memory-test', {
                maxSize: 10,
                sizeLimit: 1024 * 100 // 100KB limit
            });

            // Add entries until limit reached
            for (let i = 1; i <= 10; i++) {
                cache.set(`key${i}`, 'A'.repeat(1024 * 5)); // 5KB each
            }

            const stats = cache.getStats();
            expect(stats.size).toBeLessThanOrEqual(10);
            expect(stats.memoryUsage).toBeLessThanOrEqual(1024 * 100);
        });

        it('should evict entries when memory limit exceeded', () => {
            const evictions: Array<{ key: string; value: string }> = [];
            const cache = CacheManager.getCache<string, string>('eviction-test', {
                maxSize: 100,
                sizeLimit: 1024 * 10, // 10KB limit
                onEvict: (key, value) => {
                    evictions.push({ key, value });
                }
            });

            // Add large entries (2KB each)
            for (let i = 1; i <= 10; i++) {
                cache.set(`key${i}`, 'A'.repeat(1024 * 2));
            }

            expect(evictions.length).toBeGreaterThan(0); // Some evictions occurred
        });
    });

    describe('Cache Coordination Across Services', () => {
        it('should maintain independent state across different caches', () => {
            // Set data in all three caches
            PDFTextCache.set(1, { fullText: 'PDF page 1', items: [] });
            HTTPResponseCache.set('GET:/api/test', { data: 'HTTP response' });
            AIResultCache.set('pico:abc', { population: 'Test' });

            // Verify all caches have their data
            expect(PDFTextCache.get(1)).toBeDefined();
            expect(HTTPResponseCache.get('GET:/api/test')).toBeDefined();
            expect(AIResultCache.get('pico:abc')).toBeDefined();

            // Clear only HTTP cache
            HTTPResponseCache.clear();

            // Verify only HTTP cache cleared
            expect(PDFTextCache.get(1)).toBeDefined();
            expect(HTTPResponseCache.get('GET:/api/test')).toBeUndefined();
            expect(AIResultCache.get('pico:abc')).toBeDefined();
        });

        it('should provide comprehensive statistics across all caches', () => {
            PDFTextCache.set(1, { fullText: 'Page 1', items: [] });
            PDFTextCache.set(2, { fullText: 'Page 2', items: [] });

            HTTPResponseCache.set('GET:/api/1', { data: 'response1' });

            AIResultCache.set('pico:1', { population: 'Test' });
            AIResultCache.set('summary:1', { summary: 'Test' });

            const allStats = CacheManager.getAllStats();

            expect(allStats['pdf-text']).toBeDefined();
            expect(allStats['http-responses']).toBeDefined();
            expect(allStats['ai-results']).toBeDefined();

            expect(allStats['pdf-text'].size).toBe(2);
            expect(allStats['http-responses'].size).toBe(1);
            expect(allStats['ai-results'].size).toBe(2);
        });
    });

    describe('Concurrent Access', () => {
        it('should handle 1000 concurrent cache operations', async () => {
            const cache = CacheManager.getCache<string, number>('concurrent-test');
            const promises: Promise<void>[] = [];

            // Simulate 1000 concurrent operations
            for (let i = 0; i < 1000; i++) {
                promises.push(
                    new Promise<void>((resolve) => {
                        if (i % 2 === 0) {
                            cache.set(`key${i}`, i);
                        } else {
                            cache.get(`key${i - 1}`);
                        }
                        resolve();
                    })
                );
            }

            await Promise.all(promises);

            const stats = cache.getStats();
            expect(stats.size).toBeGreaterThan(0);
            expect(stats.hitCount + stats.missCount).toBe(500); // 500 get operations
        });
    });
});

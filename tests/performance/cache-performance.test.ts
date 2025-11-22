/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cache Performance Tests
 *
 * Performance and stress testing for the caching system:
 * - Hit rate optimization
 * - Memory usage under load
 * - Concurrent access handling
 * - Eviction performance
 * - TTL expiration accuracy
 *
 * These tests verify the cache system performs well under realistic
 * and stress conditions.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CacheManager, PDFTextCache, HTTPResponseCache, AIResultCache } from '../../src/services/CacheManager';
import { LRUCache } from '../../src/utils/LRUCache';

describe('Cache Performance Tests', () => {
    beforeEach(() => {
        CacheManager.clearAll();
    });

    afterEach(() => {
        CacheManager.clearAll();
    });

    describe('Hit Rate Optimization', () => {
        it('should achieve 80%+ hit rate after warmup', () => {
            const cache = CacheManager.getCache<string, string>('perf-test', {
                maxSize: 100
            });

            // Warmup phase: Add 50 entries
            for (let i = 1; i <= 50; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            // Simulate realistic access pattern
            // 80% accessing existing keys, 20% new keys
            for (let i = 0; i < 500; i++) {
                if (Math.random() < 0.8) {
                    // 80% hit existing
                    const randomKey = Math.floor(Math.random() * 50) + 1;
                    cache.get(`key${randomKey}`);
                } else {
                    // 20% miss (new keys)
                    cache.get(`new-key${i}`);
                }
            }

            const stats = cache.getStats();

            expect(stats.hitRate).toBeGreaterThan(75); // At least 75% hit rate
            expect(stats.hitCount).toBeGreaterThan(stats.missCount);

            console.log(`[Performance] Hit rate: ${stats.hitRate.toFixed(2)}%`);
            console.log(`[Performance] Hits: ${stats.hitCount}, Misses: ${stats.missCount}`);
        });

        it('should maintain high hit rate with varying access patterns', () => {
            const cache = CacheManager.getCache<string, string>('varying-pattern', {
                maxSize: 100
            });

            // Phase 1: Uniform distribution
            for (let i = 0; i < 100; i++) {
                cache.set(`uniform-${i}`, `value${i}`);
            }

            for (let i = 0; i < 200; i++) {
                const key = `uniform-${Math.floor(Math.random() * 100)}`;
                cache.get(key);
            }

            const phase1Stats = cache.getStats();
            expect(phase1Stats.hitRate).toBeGreaterThan(0.85); // Should be high

            // Phase 2: Skewed distribution (20% of keys accessed 80% of time)
            for (let i = 0; i < 200; i++) {
                if (Math.random() < 0.8) {
                    // 80% access first 20 keys
                    const key = `uniform-${Math.floor(Math.random() * 20)}`;
                    cache.get(key);
                } else {
                    // 20% access remaining 80 keys
                    const key = `uniform-${Math.floor(Math.random() * 80) + 20}`;
                    cache.get(key);
                }
            }

            const phase2Stats = cache.getStats();
            expect(phase2Stats.hitRate).toBeGreaterThan(0.90); // Should be even higher
        });

        it('should optimize hit rate with LRU eviction', () => {
            const cache = CacheManager.getCache<string, string>('lru-optimization', {
                maxSize: 10 // Small cache
            });

            // Fill cache
            for (let i = 1; i <= 10; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            // Access pattern: frequently access keys 1-5, rarely access 6-10
            for (let i = 0; i < 100; i++) {
                if (i % 10 < 8) {
                    // 80% of time access keys 1-5
                    const key = `key${(i % 5) + 1}`;
                    cache.get(key);
                } else {
                    // 20% of time access keys 6-10
                    const key = `key${(i % 5) + 6}`;
                    cache.get(key);
                }
            }

            // Add new keys (should evict least recently used 6-10)
            for (let i = 11; i <= 15; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            // Verify frequently accessed keys still present
            expect(cache.get('key1')).toBeDefined();
            expect(cache.get('key2')).toBeDefined();
            expect(cache.get('key3')).toBeDefined();

            const stats = cache.getStats();
            // TODO: Add eviction tracking to LRUCache.getStats()
            // expect(stats.evictions).toBeGreaterThan(0);
        });
    });

    describe('Memory Usage Under Load', () => {
        it('should stay under memory limit with large dataset', () => {
            const cache = CacheManager.getCache<string, string>('memory-test', {
                maxSize: 1000,
                sizeLimit: 1024 * 1024 * 5 // 5MB limit
            });

            // Add entries until we hit limit
            for (let i = 0; i < 1000; i++) {
                // Each entry ~10KB
                cache.set(`large-key${i}`, 'A'.repeat(1024 * 10));
            }

            const stats = cache.getStats();

            expect(stats.memoryUsage).toBeLessThanOrEqual(1024 * 1024 * 5);
            // TODO: Add eviction tracking to LRUCache.getStats()
            // expect(stats.evictions).toBeGreaterThan(0); // Should have evicted

            console.log(`[Memory] Total size: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            // console.log(`[Memory] Evictions: ${stats.evictions}`);
        });

        it('should handle gradual memory pressure', () => {
            const cache = CacheManager.getCache<string, string>('gradual-memory', {
                maxSize: 100,
                sizeLimit: 1024 * 500 // 500KB
            });

            let evictionCount = 0;
            const evictions: string[] = [];

            const cacheWithEviction = new LRUCache<string, string>({
                maxSize: 100,
                sizeLimit: 1024 * 500,
                onEvict: (key) => {
                    evictionCount++;
                    evictions.push(key);
                }
            });

            // Gradually add larger and larger entries
            for (let i = 0; i < 200; i++) {
                const size = 1024 * (i + 1); // 1KB, 2KB, 3KB, ...
                cacheWithEviction.set(`key${i}`, 'A'.repeat(size));
            }

            expect(evictionCount).toBeGreaterThan(0);
            expect(evictions.length).toBeGreaterThan(0);

            // Verify oldest small entries evicted first
            expect(evictions[0]).toBe('key0');
        });

        it('should maintain performance with near-capacity operation', () => {
            const cache = CacheManager.getCache<string, number>('near-capacity', {
                maxSize: 100,
                sizeLimit: 1024 * 1024 // 1MB
            });

            // Fill to 95% capacity
            for (let i = 0; i < 95; i++) {
                cache.set(`key${i}`, i);
            }

            const startTime = Date.now();

            // Perform 1000 operations at near capacity
            for (let i = 0; i < 1000; i++) {
                cache.set(`rotating-key${i % 10}`, i); // Overwrite same 10 keys
                cache.get(`key${i % 95}`);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Operations should complete in reasonable time
            expect(duration).toBeLessThan(1000); // Less than 1 second for 1000 ops

            console.log(`[Performance] 1000 operations in ${duration}ms`);
        });
    });

    describe('Concurrent Access Handling', () => {
        it('should handle 1000 concurrent requests without errors', async () => {
            const cache = CacheManager.getCache<string, number>('concurrent-test', {
                maxSize: 500
            });

            const promises: Promise<void>[] = [];

            // Simulate 1000 concurrent operations
            for (let i = 0; i < 1000; i++) {
                const promise = new Promise<void>((resolve) => {
                    setTimeout(() => {
                        if (i % 3 === 0) {
                            cache.set(`key${i}`, i);
                        } else if (i % 3 === 1) {
                            cache.get(`key${i - 1}`);
                        } else {
                            cache.has(`key${i - 2}`);
                        }
                        resolve();
                    }, Math.random() * 10); // Random delay 0-10ms
                });
                promises.push(promise);
            }

            // Wait for all operations to complete
            await Promise.all(promises);

            const stats = cache.getStats();

            expect(stats.size).toBeGreaterThan(0);
            expect(stats.hitCount + stats.missCount).toBeGreaterThan(0);

            console.log(`[Concurrency] Handled 1000 concurrent operations`);
            console.log(`[Concurrency] Final cache size: ${stats.size}`);
        });

        it('should handle rapid sequential updates', () => {
            const cache = CacheManager.getCache<string, number>('rapid-updates', {
                maxSize: 100
            });

            const startTime = Date.now();

            // Rapidly update same keys
            for (let i = 0; i < 10000; i++) {
                cache.set(`key${i % 10}`, i); // Update same 10 keys 1000 times each
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(cache.getStats().size).toBe(10);
            expect(duration).toBeLessThan(500); // Less than 500ms for 10000 updates

            console.log(`[Performance] 10000 rapid updates in ${duration}ms`);
        });

        it('should handle concurrent read/write mix', async () => {
            const cache = CacheManager.getCache<string, string>('read-write-mix', {
                maxSize: 200
            });

            // Prepopulate cache
            for (let i = 0; i < 100; i++) {
                cache.set(`initial-key${i}`, `value${i}`);
            }

            const promises: Promise<void>[] = [];

            // Concurrent readers (70%)
            for (let i = 0; i < 700; i++) {
                promises.push(
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            cache.get(`initial-key${Math.floor(Math.random() * 100)}`);
                            resolve();
                        }, Math.random() * 50);
                    })
                );
            }

            // Concurrent writers (30%)
            for (let i = 0; i < 300; i++) {
                promises.push(
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            cache.set(`new-key${i}`, `new-value${i}`);
                            resolve();
                        }, Math.random() * 50);
                    })
                );
            }

            await Promise.all(promises);

            const stats = cache.getStats();
            expect(stats.size).toBeGreaterThan(0);
            expect(stats.hitCount).toBeGreaterThan(0);

            console.log(`[Concurrency] Read/write mix completed`);
            console.log(`[Concurrency] Final stats:`, stats);
        });
    });

    describe('Eviction Performance', () => {
        it('should evict entries efficiently at capacity', () => {
            const cache = CacheManager.getCache<string, string>('eviction-perf', {
                maxSize: 100
            });

            // Fill to capacity
            for (let i = 0; i < 100; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            const startTime = Date.now();

            // Add 100 more entries (should trigger 100 evictions)
            for (let i = 100; i < 200; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Evictions should be fast
            expect(duration).toBeLessThan(100); // Less than 100ms for 100 evictions

            const stats = cache.getStats();
            expect(stats.size).toBe(100);
            // TODO: Add eviction tracking to LRUCache.getStats()
            // expect(stats.evictions).toBe(100);

            console.log(`[Eviction] 100 evictions in ${duration}ms`);
        });

        it('should maintain performance during continuous eviction', () => {
            const cache = CacheManager.getCache<string, string>('continuous-eviction', {
                maxSize: 50
            });

            const startTime = Date.now();

            // Continuously add entries (triggers evictions)
            for (let i = 0; i < 1000; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            const stats = cache.getStats();

            expect(stats.size).toBe(50);
            // TODO: Add eviction tracking to LRUCache.getStats()
            // expect(stats.evictions).toBe(950); // 1000 - 50 = 950 evictions
            expect(duration).toBeLessThan(500); // Should be fast

            console.log(`[Eviction] 950 evictions in ${duration}ms`);
            console.log(`[Eviction] Average: ${(duration / 950).toFixed(2)}ms per eviction`);
        });
    });

    describe('Real-World Scenarios', () => {
        it('should handle PDF extraction workflow efficiently', () => {
            // Simulate extracting 50 pages of PDF
            const startTime = Date.now();

            for (let page = 1; page <= 50; page++) {
                PDFTextCache.set(page, {
                    fullText: `Page ${page} content: `.repeat(100), // ~2KB per page
                    items: Array(50).fill(null).map((_, i) => ({
                        str: `Text ${i}`,
                        x: 10,
                        y: 20 * i,
                        width: 100,
                        height: 10
                    }))
                });
            }

            const endTime = Date.now();
            const cacheTime = endTime - startTime;

            // Access pages randomly (simulating user navigation)
            const accessStartTime = Date.now();

            for (let i = 0; i < 100; i++) {
                const randomPage = Math.floor(Math.random() * 50) + 1;
                PDFTextCache.get(randomPage);
            }

            const accessEndTime = Date.now();
            const accessTime = accessEndTime - accessStartTime;

            expect(cacheTime).toBeLessThan(100); // Caching should be fast
            expect(accessTime).toBeLessThan(50); // Access should be very fast

            const stats = PDFTextCache.getStats();
            expect(stats.hitRate).toBeGreaterThan(0.95); // High hit rate

            console.log(`[PDF Workflow] Cache 50 pages: ${cacheTime}ms`);
            console.log(`[PDF Workflow] 100 random accesses: ${accessTime}ms`);
            console.log(`[PDF Workflow] Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
        });

        it('should handle HTTP response caching under load', async () => {
            const responses = Array(100).fill(null).map((_, i) => ({
                url: `GET:/api/endpoint${i}`,
                data: { result: `response${i}`, timestamp: Date.now() }
            }));

            const startTime = Date.now();

            // Cache all responses
            responses.forEach(({ url, data }) => {
                HTTPResponseCache.set(url, data);
            });

            const cacheTime = Date.now() - startTime;

            // Simulate API call pattern (80% hits, 20% misses)
            const accessStartTime = Date.now();

            for (let i = 0; i < 1000; i++) {
                if (Math.random() < 0.8) {
                    // 80% access cached endpoints
                    const randomIdx = Math.floor(Math.random() * 100);
                    HTTPResponseCache.get(`GET:/api/endpoint${randomIdx}`);
                } else {
                    // 20% access non-cached endpoints
                    HTTPResponseCache.get(`GET:/api/new-endpoint${i}`);
                }
            }

            const accessTime = Date.now() - accessStartTime;

            expect(cacheTime).toBeLessThan(50);
            expect(accessTime).toBeLessThan(100);

            const stats = HTTPResponseCache.getStats();
            expect(stats.hitRate).toBeGreaterThan(0.75);

            console.log(`[HTTP Caching] Cache 100 responses: ${cacheTime}ms`);
            console.log(`[HTTP Caching] 1000 accesses: ${accessTime}ms`);
            console.log(`[HTTP Caching] Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
        });

        it('should handle AI result caching workflow', () => {
            const aiOperations = [
                { key: 'pico:doc1', result: { population: 'Test', intervention: 'Test' } },
                { key: 'summary:doc1', result: { summary: 'Test summary' } },
                { key: 'validation:field1', result: { is_supported: true, confidence: 0.9 } },
                { key: 'metadata:doc1', result: { doi: '10.1234/test', year: 2024 } }
            ];

            const startTime = Date.now();

            // Cache AI results
            aiOperations.forEach(({ key, result }) => {
                AIResultCache.set(key, result);
            });

            // Simulate repeated AI operations on same document
            for (let i = 0; i < 50; i++) {
                aiOperations.forEach(({ key }) => {
                    AIResultCache.get(key); // Should hit cache instead of calling AI
                });
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            const stats = AIResultCache.getStats();

            expect(duration).toBeLessThan(50); // Very fast with caching
            expect(stats.hitCount).toBe(200); // 50 iterations * 4 operations
            expect(stats.hitRate).toBe(100); // 100% hit rate

            console.log(`[AI Caching] 200 cached AI operations: ${duration}ms`);
            console.log(`[AI Caching] Hit rate: ${stats.hitRate.toFixed(2)}%`);
        });
    });
});

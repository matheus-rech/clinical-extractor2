/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unified LRU Cache Tests
 *
 * Comprehensive test suite for the enhanced LRU Cache implementation
 * covering TTL, size limits, eviction callbacks, and statistics.
 */

import { LRUCache, CacheConfig } from '../../src/utils/LRUCache';

describe('UnifiedLRUCache', () => {
    let cache: LRUCache<string, string>;

    beforeEach(() => {
        cache = new LRUCache({ maxSize: 3 });
    });

    describe('Basic Operations', () => {
        it('should store and retrieve values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return undefined for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('should update existing values', () => {
            cache.set('key1', 'value1');
            cache.set('key1', 'value2');
            expect(cache.get('key1')).toBe('value2');
        });

        it('should check if key exists', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(false);
        });

        it('should delete keys', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeUndefined();
            expect(cache.delete('key1')).toBe(false); // Already deleted
        });

        it('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.size()).toBe(0);
        });

        it('should track cache size', () => {
            expect(cache.size()).toBe(0);
            cache.set('key1', 'value1');
            expect(cache.size()).toBe(1);
            cache.set('key2', 'value2');
            expect(cache.size()).toBe(2);
        });
    });

    describe('LRU Eviction', () => {
        it('should evict LRU when full', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.set('key4', 'value4'); // Should evict key1

            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });

        it('should update access order on get', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            cache.get('key1'); // Access key1 (moves to end)
            cache.set('key4', 'value4'); // Should evict key2 (not key1)

            expect(cache.get('key1')).toBe('value1');
            expect(cache.get('key2')).toBeUndefined();
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });

        it('should update access order on set of existing key', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            cache.set('key1', 'updated1'); // Update key1 (moves to end)
            cache.set('key4', 'value4'); // Should evict key2 (not key1)

            expect(cache.get('key1')).toBe('updated1');
            expect(cache.get('key2')).toBeUndefined();
        });
    });

    describe('TTL Expiration', () => {
        it('should respect TTL expiration', async () => {
            cache = new LRUCache({ maxSize: 10, ttl: 100 }); // 100ms TTL
            cache.set('key1', 'value1');

            expect(cache.get('key1')).toBe('value1');

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(cache.get('key1')).toBeUndefined();
        });

        it('should not expire entries before TTL', async () => {
            cache = new LRUCache({ maxSize: 10, ttl: 200 }); // 200ms TTL
            cache.set('key1', 'value1');

            // Wait less than TTL
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(cache.get('key1')).toBe('value1');
        });

        it('should handle cache without TTL', () => {
            cache = new LRUCache({ maxSize: 10 }); // No TTL
            cache.set('key1', 'value1');

            expect(cache.get('key1')).toBe('value1');
        });
    });

    describe('Memory Size Limits', () => {
        it('should calculate string sizes correctly', () => {
            cache = new LRUCache({
                maxSize: 10,
                sizeLimit: 100 // 100 bytes
            });

            cache.set('key1', 'a'); // 2 bytes (UTF-16)
            cache.set('key2', 'bb'); // 4 bytes
            cache.set('key3', 'ccc'); // 6 bytes

            const stats = cache.getStats();
            expect(stats.memoryUsage).toBeGreaterThan(0);
        });

        it('should evict when memory limit reached', () => {
            cache = new LRUCache({
                maxSize: 100,
                sizeLimit: 50 // Very small limit
            });

            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Should have evicted some entries due to size limit
            const stats = cache.getStats();
            expect(stats.memoryUsage).toBeLessThanOrEqual(50);
        });
    });

    describe('Eviction Callbacks', () => {
        it('should call eviction callback when evicting', () => {
            const evictedKeys: string[] = [];
            cache = new LRUCache({
                maxSize: 2,
                onEvict: (key: string, value: any) => {
                    evictedKeys.push(key);
                }
            });

            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3'); // Should evict key1

            expect(evictedKeys).toContain('key1');
        });

        it('should call eviction callback on delete', () => {
            const evictedKeys: string[] = [];
            cache = new LRUCache({
                maxSize: 10,
                onEvict: (key: string, value: any) => {
                    evictedKeys.push(key);
                }
            });

            cache.set('key1', 'value1');
            cache.delete('key1');

            expect(evictedKeys).toContain('key1');
        });

        it('should call eviction callback with correct value', () => {
            let evictedValue: any;
            cache = new LRUCache({
                maxSize: 2,
                onEvict: (key: string, value: any) => {
                    evictedValue = value;
                }
            });

            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3'); // Should evict key1

            expect(evictedValue).toBe('value1');
        });
    });

    describe('Statistics', () => {
        it('should provide comprehensive statistics', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.get('key1'); // Hit
            cache.get('key1'); // Hit
            cache.get('key3'); // Miss

            const stats = cache.getStats();

            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(3);
            expect(stats.utilizationPercent).toBeCloseTo(66.67, 1);
            expect(stats.hitCount).toBe(2);
            expect(stats.missCount).toBe(1);
            expect(stats.hitRate).toBeCloseTo(66.67, 1);
            expect(stats.entries).toHaveLength(2);
        });

        it('should track access counts', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            cache.get('key1');
            cache.get('key1');
            cache.get('key1'); // 3 accesses

            cache.get('key2'); // 1 access

            const stats = cache.getStats();
            const key1Entry = stats.entries.find((e: any) => e.key === 'key1');
            const key2Entry = stats.entries.find((e: any) => e.key === 'key2');

            expect(key1Entry?.accessCount).toBe(3);
            expect(key2Entry?.accessCount).toBe(1);
        });

        it('should sort entries by access count', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            cache.get('key3');
            cache.get('key3');
            cache.get('key3'); // 3 accesses

            cache.get('key1');
            cache.get('key1'); // 2 accesses

            cache.get('key2'); // 1 access

            const stats = cache.getStats();

            // Should be sorted by access count (descending)
            expect(stats.entries[0].key).toBe('key3');
            expect(stats.entries[1].key).toBe('key1');
            expect(stats.entries[2].key).toBe('key2');
        });

        it('should track entry age', () => {
            cache.set('key1', 'value1');
            const stats = cache.getStats();

            expect(stats.entries[0].age).toBeGreaterThanOrEqual(0);
        });

        it('should track oldest and newest entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const stats = cache.getStats();

            expect(stats.oldestEntry).toBeDefined();
            expect(stats.newestEntry).toBeDefined();
            expect(stats.newestEntry).toBeGreaterThanOrEqual(stats.oldestEntry!);
        });

        it('should calculate hit rate correctly', () => {
            cache.set('key1', 'value1');

            cache.get('key1'); // Hit
            cache.get('key2'); // Miss
            cache.get('key1'); // Hit
            cache.get('key3'); // Miss

            const stats = cache.getStats();
            expect(stats.hitRate).toBe(50); // 2 hits, 2 misses = 50%
        });

        it('should handle zero hit rate', () => {
            const stats = cache.getStats();
            expect(stats.hitRate).toBe(0);
        });
    });

    describe('Backward Compatibility', () => {
        it('should support legacy number constructor', () => {
            const legacyCache = new LRUCache<string, string>(5);

            legacyCache.set('key1', 'value1');
            expect(legacyCache.get('key1')).toBe('value1');

            const stats = legacyCache.getStats();
            expect(stats.maxSize).toBe(5);
        });

        it('should support config object constructor', () => {
            const configCache = new LRUCache<string, string>({
                maxSize: 5,
                ttl: 1000
            });

            configCache.set('key1', 'value1');
            expect(configCache.get('key1')).toBe('value1');

            const stats = configCache.getStats();
            expect(stats.maxSize).toBe(5);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty cache statistics', () => {
            const stats = cache.getStats();

            expect(stats.size).toBe(0);
            expect(stats.entries).toHaveLength(0);
            expect(stats.oldestEntry).toBeNull();
            expect(stats.newestEntry).toBeNull();
        });

        it('should handle single entry cache', () => {
            cache.set('key1', 'value1');

            const stats = cache.getStats();
            expect(stats.size).toBe(1);
            expect(stats.oldestEntry).toBe(stats.newestEntry);
        });

        it('should handle object values', () => {
            const objCache = new LRUCache<string, { data: string }>({ maxSize: 3 });

            objCache.set('key1', { data: 'value1' });
            const result = objCache.get('key1');

            expect(result).toEqual({ data: 'value1' });
        });

        it('should handle array values', () => {
            const arrCache = new LRUCache<string, string[]>({ maxSize: 3 });

            arrCache.set('key1', ['a', 'b', 'c']);
            const result = arrCache.get('key1');

            expect(result).toEqual(['a', 'b', 'c']);
        });

        it('should handle numeric keys', () => {
            const numCache = new LRUCache<number, string>({ maxSize: 3 });

            numCache.set(1, 'value1');
            numCache.set(2, 'value2');

            expect(numCache.get(1)).toBe('value1');
            expect(numCache.get(2)).toBe('value2');
        });
    });
});

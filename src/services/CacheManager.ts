/**
 * Central Cache Manager
 *
 * Provides unified cache management with named cache instances.
 * Supports multiple cache types for different use cases:
 * - PDF text extraction caching
 * - HTTP response caching
 * - AI result caching
 *
 * Features:
 * - Named cache instances with custom configurations
 * - Global cache clearing
 * - Comprehensive statistics across all caches
 * - Pre-configured cache instances for common use cases
 *
 * @license MIT
 * Copyright (c) 2025 Clinical Extractor
 */

import { LRUCache, CacheConfig } from '../utils/LRUCache';

/**
 * Central cache manager with named cache instances
 */
export class CacheManager {
    private static caches: Map<string, LRUCache<any, any>> = new Map();

    /**
     * Get or create a named cache
     * @param name - Unique cache name
     * @param config - Cache configuration (used only if cache doesn't exist)
     * @returns Cache instance
     */
    static getCache<K = string, V = any>(
        name: string,
        config?: CacheConfig
    ): LRUCache<K, V> {
        if (!this.caches.has(name)) {
            const defaultConfig: CacheConfig = {
                maxSize: 100,
                ttl: 300000  // 5 minutes
            };
            this.caches.set(name, new LRUCache<K, V>(config || defaultConfig));
        }
        return this.caches.get(name)! as LRUCache<K, V>;
    }

    /**
     * Clear all caches
     */
    static clearAll(): void {
        for (const cache of this.caches.values()) {
            cache.clear();
        }
        console.log('[CacheManager] All caches cleared');
    }

    /**
     * Clear specific cache by name
     * @param name - Cache name to clear
     */
    static clear(name: string): boolean {
        const cache = this.caches.get(name);
        if (cache) {
            cache.clear();
            console.log(`[CacheManager] Cache '${name}' cleared`);
            return true;
        }
        return false;
    }

    /**
     * Get statistics for all caches
     * @returns Statistics object keyed by cache name
     */
    static getAllStats(): Record<string, any> {
        const stats: Record<string, any> = {};
        for (const [name, cache] of this.caches.entries()) {
            stats[name] = cache.getStats();
        }
        return stats;
    }

    /**
     * Get statistics for a specific cache
     * @param name - Cache name
     * @returns Cache statistics or undefined if cache doesn't exist
     */
    static getStats(name: string): any {
        const cache = this.caches.get(name);
        return cache ? cache.getStats() : undefined;
    }

    /**
     * List all cache names
     * @returns Array of cache names
     */
    static listCaches(): string[] {
        return Array.from(this.caches.keys());
    }

    /**
     * Delete a cache instance
     * @param name - Cache name to delete
     */
    static deleteCache(name: string): boolean {
        return this.caches.delete(name);
    }
}

// Pre-configured cache instances for common use cases

/**
 * PDF Text Cache
 * - Max 50 entries (pages)
 * - Size limit: 10MB
 * - No TTL (valid until evicted)
 */
export const PDFTextCache = CacheManager.getCache<number, { fullText: string; items: Array<any> }>('pdf-text', {
    maxSize: 50,
    sizeLimit: 10 * 1024 * 1024,  // 10MB
    onEvict: (key, value) => {
        console.log(`[PDFTextCache] Evicted page ${key} (${Math.round((value.fullText?.length || 0) / 1024)}KB)`);
    }
});

/**
 * HTTP Response Cache
 * - Max 100 entries
 * - TTL: 5 minutes
 * - Size limit: 5MB
 */
export const HTTPResponseCache = CacheManager.getCache<string, any>('http-responses', {
    maxSize: 100,
    ttl: 300000,  // 5 minutes
    sizeLimit: 5 * 1024 * 1024,  // 5MB
    onEvict: (key) => {
        console.log(`[HTTPResponseCache] Evicted ${key}`);
    }
});

/**
 * AI Result Cache
 * - Max 50 entries
 * - TTL: 10 minutes
 * - No size limit (results typically small)
 */
export const AIResultCache = CacheManager.getCache<string, any>('ai-results', {
    maxSize: 50,
    ttl: 600000,  // 10 minutes
    onEvict: (key) => {
        console.log(`[AIResultCache] Evicted ${key}`);
    }
});

/**
 * Export default instance for convenience
 */
export default CacheManager;

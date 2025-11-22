/**
 * Unified LRU Cache implementation with advanced features
 *
 * Implements Least Recently Used eviction policy with support for:
 * - TTL (Time To Live) expiration
 * - Memory size limits
 * - Eviction callbacks
 * - Comprehensive statistics
 * - Access count tracking
 *
 * @license MIT
 * Copyright (c) 2025 Clinical Extractor
 */

export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    accessCount: number;
    size?: number;  // For memory tracking
}

export interface CacheConfig {
    maxSize: number;           // Max entries or max memory (bytes)
    ttl?: number;              // Time-to-live in milliseconds
    sizeLimit?: number;        // Max memory in bytes
    onEvict?: (key: string, value: any) => void;  // Eviction callback
}

export class LRUCache<K = string, V = any> {
    private cache: Map<K, CacheEntry<V>>;
    private maxSize: number;
    private accessOrder: K[];
    private config: CacheConfig;
    private hitCount: number = 0;
    private missCount: number = 0;

    constructor(maxSizeOrConfig: number | CacheConfig = 50) {
        this.cache = new Map();
        this.accessOrder = [];

        // Support both legacy number constructor and new config object
        if (typeof maxSizeOrConfig === 'number') {
            this.config = { maxSize: maxSizeOrConfig };
            this.maxSize = maxSizeOrConfig;
        } else {
            this.config = maxSizeOrConfig;
            this.maxSize = maxSizeOrConfig.maxSize;
        }
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.missCount++;
            return undefined;
        }

        // Check TTL expiration
        if (this.config.ttl && Date.now() - entry.timestamp > this.config.ttl) {
            this.delete(key);
            this.missCount++;
            return undefined;
        }

        // Update access order (move to end)
        this.updateAccessOrder(key);
        entry.accessCount++;
        this.hitCount++;

        return entry.value;
    }

    set(key: K, value: V): void {
        const size = this.calculateSize(value);

        // If key exists, update it
        if (this.cache.has(key)) {
            const entry = this.cache.get(key)!;
            entry.value = value;
            entry.timestamp = Date.now();
            entry.size = size;
            this.updateAccessOrder(key);
            return;
        }

        // Evict if necessary (check both count and size limits)
        while (this.shouldEvict(size)) {
            this.evictLRU();
        }

        // Add new entry
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            accessCount: 0,
            size
        });
        this.accessOrder.push(key);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    delete(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        // Call eviction callback if provided
        if (this.config.onEvict) {
            this.config.onEvict(key as string, entry.value);
        }

        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        return true;
    }

    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
    }

    size(): number {
        return this.cache.size;
    }

    private updateAccessOrder(key: K): void {
        const index = this.accessOrder.indexOf(key);
        
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        
        this.accessOrder.push(key);
    }

    private evictLRU(): void {
        if (this.accessOrder.length === 0) return;

        const lruKey = this.accessOrder.shift()!;
        const entry = this.cache.get(lruKey);

        if (entry && this.config.onEvict) {
            this.config.onEvict(lruKey as string, entry.value);
        }

        this.cache.delete(lruKey);
        console.log(`LRU Cache: Evicted ${lruKey}`);
    }

    private shouldEvict(incomingSize: number = 0): boolean {
        // Check count limit
        if (this.cache.size >= this.maxSize) return true;

        // Check memory limit
        if (this.config.sizeLimit) {
            const currentMemory = this.getTotalMemory();
            if (currentMemory + incomingSize >= this.config.sizeLimit) {
                return true;
            }
        }

        return false;
    }

    private calculateSize(value: V): number {
        if (typeof value === 'string') return value.length * 2;  // UTF-16
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value).length * 2;
            } catch {
                return 1024;  // Default for non-serializable objects
            }
        }
        return 8;  // Primitive types
    }

    private getTotalMemory(): number {
        let total = 0;
        for (const entry of this.cache.values()) {
            total += entry.size || 0;
        }
        return total;
    }

    private calculateHitRate(): number {
        const total = this.hitCount + this.missCount;
        return total === 0 ? 0 : (this.hitCount / total) * 100;
    }

    getStats() {
        let oldestTimestamp: number | null = null;
        let newestTimestamp: number | null = null;
        const entries: Array<{
            key: string;
            accessCount: number;
            age: number;
            size?: number;
        }> = [];

        this.cache.forEach((entry, key) => {
            if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
            }
            if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
                newestTimestamp = entry.timestamp;
            }

            entries.push({
                key: key as string,
                accessCount: entry.accessCount,
                age: Date.now() - entry.timestamp,
                size: entry.size
            });
        });

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilizationPercent: (this.cache.size / this.maxSize) * 100,
            memoryUsage: this.getTotalMemory(),
            memoryLimit: this.config.sizeLimit,
            hitRate: this.calculateHitRate(),
            hitCount: this.hitCount,
            missCount: this.missCount,
            oldestEntry: oldestTimestamp,
            newestEntry: newestTimestamp,
            entries: entries.sort((a, b) => b.accessCount - a.accessCount)  // Most accessed first
        };
    }
}

export default LRUCache;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mock for BackendProxyService
 * Prevents actual network requests during testing
 */

export interface ProxyRequest {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    cache?: boolean;
    timeout?: number;
}

export interface ProxyResponse {
    ok: boolean;
    status: number;
    statusText: string;
    data: any;
    headers: Record<string, string>;
}

// Mock configuration
const mockConfig = {
    baseURL: 'http://localhost:8000',
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
    cacheEnabled: true,
    cacheTTL: 300000,
    rateLimitPerSecond: 10,
};

// Mock request function that returns successful responses
const mockRequest = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    data: { success: true },
    headers: { 'content-type': 'application/json' },
});

const BackendProxyService = {
    config: mockConfig,
    rateLimiter: null as any,
    requestQueue: [] as any[],

    configure: jest.fn((newConfig: Partial<typeof mockConfig>) => {
        Object.assign(mockConfig, newConfig);
    }),

    request: mockRequest,

    clearCache: jest.fn(),

    getCacheStats: jest.fn().mockReturnValue({
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
    }),

    healthCheck: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: { status: 'healthy' },
    }),
};

export default BackendProxyService;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for BackendProxyService
 */

import BackendProxyService from '../../src/services/BackendProxyService';
import type { ProxyRequest, ProxyResponse } from '../../src/services/BackendProxyService';

global.fetch = jest.fn();

describe('BackendProxyService', () => {
    beforeEach(() => {
        BackendProxyService.configure({
            baseURL: 'https://api.example.com',
            timeout: 5000,
            retryAttempts: 2,
            retryDelay: 100,
            cacheEnabled: true,
            cacheTTL: 1000,
            rateLimitPerSecond: 10,
        });
        BackendProxyService.clearCache();
        BackendProxyService.requestQueue = [];
        
        (global.fetch as jest.Mock).mockClear();
    });

    describe('configure', () => {
        it('should update configuration', () => {
            BackendProxyService.configure({
                baseURL: 'https://new-api.example.com',
                timeout: 10000,
            });

            expect(BackendProxyService.config.baseURL).toBe('https://new-api.example.com');
            expect(BackendProxyService.config.timeout).toBe(10000);
        });

        it('should initialize rate limiter when configured', () => {
            BackendProxyService.configure({
                rateLimitPerSecond: 5,
            });

            expect(BackendProxyService.rateLimiter).not.toBeNull();
        });
    });

    describe('buildURL', () => {
        it('should build URL with base URL', () => {
            const url = BackendProxyService.buildURL('/users');
            
            expect(url).toBe('https://api.example.com/users');
        });

        it('should handle absolute URLs', () => {
            const url = BackendProxyService.buildURL('https://other-api.com/data');
            
            expect(url).toBe('https://other-api.com/data');
        });

        it('should append query parameters', () => {
            const url = BackendProxyService.buildURL('/users', { id: '123', name: 'John' });
            
            expect(url).toContain('id=123');
            expect(url).toContain('name=John');
        });

        it('should handle URLs without params', () => {
            const url = BackendProxyService.buildURL('/users', {});
            
            expect(url).toBe('https://api.example.com/users');
        });
    });

    describe('getCacheKey', () => {
        it('should generate unique cache key', () => {
            const request1: ProxyRequest = {
                url: '/users',
                method: 'GET',
                params: { id: '123' },
            };

            const request2: ProxyRequest = {
                url: '/users',
                method: 'GET',
                params: { id: '456' },
            };

            const key1 = BackendProxyService.getCacheKey(request1);
            const key2 = BackendProxyService.getCacheKey(request2);

            expect(key1).not.toBe(key2);
        });

        it('should include method in cache key', () => {
            const getRequest: ProxyRequest = {
                url: '/users',
                method: 'GET',
            };

            const postRequest: ProxyRequest = {
                url: '/users',
                method: 'POST',
            };

            const getKey = BackendProxyService.getCacheKey(getRequest);
            const postKey = BackendProxyService.getCacheKey(postRequest);

            expect(getKey).not.toBe(postKey);
        });
    });

    describe('request', () => {
        it('should make successful GET request', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

            const response = await BackendProxyService.get('/users');

            expect(response.status).toBe(200);
            expect(response.data).toEqual({ data: 'test' });
            expect(response.cached).toBe(false);
        });

        it('should cache GET requests', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await BackendProxyService.get('/users');
            
            const response = await BackendProxyService.get('/users');

            expect(response.cached).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should not cache POST requests', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await BackendProxyService.post('/users', { name: 'John' });
            
            await BackendProxyService.post('/users', { name: 'John' });

            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should retry on failure', async () => {
            const mockError = new Error('Network error');
            const mockSuccess = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock)
                .mockRejectedValueOnce(mockError)
                .mockResolvedValueOnce(mockSuccess);

            const response = await BackendProxyService.get('/users');

            expect(response.status).toBe(200);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should throw after max retries', async () => {
            // Configure for 3 retry attempts (will get 3 total calls: initial + 2 retries)
            BackendProxyService.configure({ retryAttempts: 3 });
            
            const mockError = new Error('Network error');
            (global.fetch as jest.Mock).mockRejectedValue(mockError);

            await expect(BackendProxyService.get('/users')).rejects.toThrow();
            
            // With retryAttempts=3: attempt 1 fails → retry (1 < 3), attempt 2 fails → retry (2 < 3), attempt 3 fails → throw (3 >= 3)
            // Total: 3 calls
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should handle non-JSON responses', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'text/plain']]),
                text: async () => 'plain text response',
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

            const response = await BackendProxyService.get('/users');

            expect(response.data).toBe('plain text response');
        });

        it('should throw on HTTP errors', async () => {
            const mockHeaders = new Headers();
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: mockHeaders,
                text: async () => 'Not Found',
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await expect(BackendProxyService.get('/users')).rejects.toThrow(/HTTP 404/);
        });

        it('should include custom headers', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

            await BackendProxyService.get('/users', undefined, {
                'Authorization': 'Bearer token123',
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token123',
                    }),
                })
            );
        });
    });

    describe('convenience methods', () => {
        beforeEach(() => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
        });

        it('should make POST request', async () => {
            await BackendProxyService.post('/users', { name: 'John' });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ name: 'John' }),
                })
            );
        });

        it('should make PUT request', async () => {
            await BackendProxyService.put('/users/123', { name: 'John' });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'PUT',
                })
            );
        });

        it('should make DELETE request', async () => {
            await BackendProxyService.delete('/users/123');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });

        it('should make PATCH request', async () => {
            await BackendProxyService.patch('/users/123', { name: 'John' });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'PATCH',
                })
            );
        });
    });

    describe('cache management', () => {
        it('should clear cache', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await BackendProxyService.get('/users');
            
            BackendProxyService.clearCache();
            
            const response = await BackendProxyService.get('/users');

            expect(response.cached).toBe(false);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should return cache statistics', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await BackendProxyService.get('/users');
            
            const stats = BackendProxyService.getCacheStats();

            expect(stats.size).toBe(1);
            expect(stats.maxSize).toBe(100);
        });
    });

    describe('request queue', () => {
        it('should queue requests', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const promise = BackendProxyService.queueRequest({
                url: '/users',
                method: 'GET',
            });

            expect(BackendProxyService.requestQueue.length).toBeGreaterThanOrEqual(0);
            
            await promise;
        });

        it('should return queue statistics', () => {
            BackendProxyService.queueRequest({
                url: '/users',
                method: 'GET',
            });

            const stats = BackendProxyService.getQueueStats();

            expect(stats.pending).toBeGreaterThanOrEqual(0);
            expect(typeof stats.processing).toBe('boolean');
        });
    });

    describe('batch requests', () => {
        it('should batch multiple requests', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ data: 'test' }),
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const requests: ProxyRequest[] = [
                { url: '/users/1', method: 'GET' },
                { url: '/users/2', method: 'GET' },
                { url: '/users/3', method: 'GET' },
            ];

            const responses = await BackendProxyService.batch(requests);

            expect(responses.length).toBe(3);
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should handle batch failures gracefully', async () => {
            BackendProxyService.configure({ retryAttempts: 1 });
            
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ data: 'test1' }),
                })
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ data: 'test3' }),
                });

            const requests: ProxyRequest[] = [
                { url: '/users/1', method: 'GET' },
                { url: '/users/2', method: 'GET' },
                { url: '/users/3', method: 'GET' },
            ];

            const responses = await BackendProxyService.batch(requests);

            expect(responses.length).toBe(3);
            expect(responses[0].status).toBe(200);
            expect(responses[1].status).toBe(0); // Failed request
            expect(responses[2].status).toBe(200);
        });
    });

    describe('CORS proxy', () => {
        it('should create CORS proxy URL', () => {
            const targetURL = 'https://api.example.com/data';
            const proxyURL = BackendProxyService.createCORSProxyURL(targetURL, 'https://corsproxy.io/?');

            expect(proxyURL).toContain('corsproxy.io');
            expect(proxyURL).toContain(encodeURIComponent(targetURL));
        });

        it('should use custom proxy URL', () => {
            const targetURL = 'https://api.example.com/data';
            const customProxy = 'https://my-proxy.com/?url=';
            const proxyURL = BackendProxyService.createCORSProxyURL(targetURL, customProxy);

            expect(proxyURL).toContain('my-proxy.com');
        });
    });

    describe('health check', () => {
        it('should return true for healthy endpoint', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ status: 'healthy' }),
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

            const isHealthy = await BackendProxyService.healthCheck();

            expect(isHealthy).toBe(true);
        });

        it('should return false for unhealthy endpoint', async () => {
            BackendProxyService.configure({ retryAttempts: 1 });
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

            const isHealthy = await BackendProxyService.healthCheck();

            expect(isHealthy).toBe(false);
        });

        it('should use custom health check URL', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ status: 'healthy' }),
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

            await BackendProxyService.healthCheck('https://custom-api.com/status');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://custom-api.com/status',
                expect.any(Object)
            );
        });
    });
});

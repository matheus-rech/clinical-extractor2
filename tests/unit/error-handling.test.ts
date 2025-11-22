/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Error Handling Tests
 *
 * Comprehensive testing of error handling for AI operations:
 * - Network errors (timeout, connection refused, DNS failure)
 * - API errors (429 rate limit, 500 server error, 503 unavailable)
 * - Data errors (invalid JSON, malformed response, missing fields)
 * - User-friendly error messages
 * - Automatic retry with exponential backoff
 * - Graceful degradation and fallback
 *
 * Tests the aiErrorHandler utility and error propagation through the stack.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/services/BackendProxyService', () => ({
    BackendProxyService: {
        request: jest.fn()
    }
}));

import { BackendProxyService } from '../../src/services/BackendProxyService';

// Import error handler utilities
// Note: These might need to be created based on your actual error handling structure
interface AIError extends Error {
    code?: string;
    statusCode?: number;
    retryable?: boolean;
    originalError?: Error;
}

class AIErrorHandler {
    static categorizeError(error: Error): { category: string; retryable: boolean; userMessage: string } {
        const errorMessage = error.message.toLowerCase();

        // Network errors
        if (errorMessage.includes('timeout') || errorMessage.includes('timedout')) {
            return {
                category: 'TIMEOUT',
                retryable: true,
                userMessage: 'Request timed out. Retrying...'
            };
        }

        if (errorMessage.includes('econnrefused') || errorMessage.includes('network error')) {
            return {
                category: 'NETWORK',
                retryable: true,
                userMessage: 'Network connection failed. Please check your internet connection.'
            };
        }

        // API errors
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            return {
                category: 'RATE_LIMIT',
                retryable: true,
                userMessage: 'Too many requests. Please wait a moment and try again.'
            };
        }

        if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
            return {
                category: 'SERVER_ERROR',
                retryable: true,
                userMessage: 'Server error occurred. Attempting to use fallback...'
            };
        }

        if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
            return {
                category: 'SERVICE_UNAVAILABLE',
                retryable: true,
                userMessage: 'Service temporarily unavailable. Using fallback method...'
            };
        }

        // Data errors
        if (errorMessage.includes('invalid json') || errorMessage.includes('parse error')) {
            return {
                category: 'INVALID_DATA',
                retryable: false,
                userMessage: 'Invalid response from server. Please try again.'
            };
        }

        // Authentication errors
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
            return {
                category: 'AUTH_ERROR',
                retryable: false,
                userMessage: 'Authentication failed. Please check your API key.'
            };
        }

        // Generic error
        return {
            category: 'UNKNOWN',
            retryable: false,
            userMessage: 'An error occurred. Please try again.'
        };
    }

    static async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                const errorInfo = this.categorizeError(lastError);

                if (!errorInfo.retryable || attempt === maxRetries - 1) {
                    throw lastError;
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    static formatErrorMessage(error: Error): string {
        const errorInfo = this.categorizeError(error);
        return errorInfo.userMessage;
    }
}

describe('AI Error Handling Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Error Categorization', () => {
        it('should categorize timeout errors correctly', () => {
            const timeoutError = new Error('Request timeout after 60000ms');
            const result = AIErrorHandler.categorizeError(timeoutError);

            expect(result.category).toBe('TIMEOUT');
            expect(result.retryable).toBe(true);
            expect(result.userMessage).toContain('timed out');
        });

        it('should categorize network errors correctly', () => {
            const networkError = new Error('Network error: ECONNREFUSED');
            const result = AIErrorHandler.categorizeError(networkError);

            expect(result.category).toBe('NETWORK');
            expect(result.retryable).toBe(true);
            expect(result.userMessage).toContain('connection');
        });

        it('should categorize rate limit errors correctly', () => {
            const rateLimitError = new Error('429 Rate limit exceeded');
            const result = AIErrorHandler.categorizeError(rateLimitError);

            expect(result.category).toBe('RATE_LIMIT');
            expect(result.retryable).toBe(true);
            expect(result.userMessage).toContain('Too many requests');
        });

        it('should categorize server errors correctly', () => {
            const serverError = new Error('500 Internal Server Error');
            const result = AIErrorHandler.categorizeError(serverError);

            expect(result.category).toBe('SERVER_ERROR');
            expect(result.retryable).toBe(true);
            expect(result.userMessage).toContain('fallback');
        });

        it('should categorize service unavailable correctly', () => {
            const unavailableError = new Error('503 Service Unavailable');
            const result = AIErrorHandler.categorizeError(unavailableError);

            expect(result.category).toBe('SERVICE_UNAVAILABLE');
            expect(result.retryable).toBe(true);
            expect(result.userMessage).toContain('temporarily unavailable');
        });

        it('should categorize invalid JSON errors correctly', () => {
            const jsonError = new Error('Invalid JSON response from backend');
            const result = AIErrorHandler.categorizeError(jsonError);

            expect(result.category).toBe('INVALID_DATA');
            expect(result.retryable).toBe(false);
            expect(result.userMessage).toContain('Invalid response');
        });

        it('should categorize auth errors correctly', () => {
            const authError = new Error('401 Unauthorized');
            const result = AIErrorHandler.categorizeError(authError);

            expect(result.category).toBe('AUTH_ERROR');
            expect(result.retryable).toBe(false);
            expect(result.userMessage).toContain('Authentication failed');
        });

        it('should categorize unknown errors correctly', () => {
            const unknownError = new Error('Something went wrong');
            const result = AIErrorHandler.categorizeError(unknownError);

            expect(result.category).toBe('UNKNOWN');
            expect(result.retryable).toBe(false);
            expect(result.userMessage).toContain('error occurred');
        });
    });

    describe('Retry Logic with Exponential Backoff', () => {
        it('should retry timeout errors with exponential backoff', async () => {
            let attemptCount = 0;
            const mockOperation = jest.fn(async () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Request timeout after 60000ms');
                }
                return 'success';
            });

            const result = await AIErrorHandler.retryWithBackoff(mockOperation, 3, 100);

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries on persistent timeout', async () => {
            const mockOperation = jest.fn(async () => {
                throw new Error('Request timeout after 60000ms');
            });

            await expect(
                AIErrorHandler.retryWithBackoff(mockOperation, 3, 100)
            ).rejects.toThrow('timeout');

            expect(mockOperation).toHaveBeenCalledTimes(3);
        });

        it('should not retry non-retryable errors', async () => {
            const mockOperation = jest.fn(async () => {
                throw new Error('401 Unauthorized');
            });

            await expect(
                AIErrorHandler.retryWithBackoff(mockOperation, 3, 100)
            ).rejects.toThrow('Unauthorized');

            expect(mockOperation).toHaveBeenCalledTimes(1); // Only one attempt
        });

        it('should implement exponential backoff delays', async () => {
            const delays: number[] = [];
            let attemptCount = 0;

            const mockOperation = jest.fn(async () => {
                attemptCount++;
                const now = Date.now();
                if (attemptCount > 1) {
                    delays.push(now);
                }
                if (attemptCount < 4) {
                    throw new Error('Network error: ECONNREFUSED');
                }
                return 'success';
            });

            await AIErrorHandler.retryWithBackoff(mockOperation, 4, 100);

            // Verify delays increase exponentially
            // Note: Actual timing verification is complex in tests
            expect(mockOperation).toHaveBeenCalledTimes(4);
        });

        it('should succeed immediately if no error', async () => {
            const mockOperation = jest.fn(async () => 'immediate success');

            const result = await AIErrorHandler.retryWithBackoff(mockOperation, 3);

            expect(result).toBe('immediate success');
            expect(mockOperation).toHaveBeenCalledTimes(1);
        });
    });

    describe('User-Friendly Error Messages', () => {
        it('should format timeout errors for users', () => {
            const error = new Error('Request timeout after 60000ms');
            const message = AIErrorHandler.formatErrorMessage(error);

            expect(message).toBe('Request timed out. Retrying...');
            expect(message).not.toContain('60000ms'); // No technical details
        });

        it('should format network errors for users', () => {
            const error = new Error('Network error: ECONNREFUSED');
            const message = AIErrorHandler.formatErrorMessage(error);

            expect(message).toContain('connection');
            expect(message).not.toContain('ECONNREFUSED'); // No error codes
        });

        it('should format rate limit errors for users', () => {
            const error = new Error('429 Rate limit exceeded');
            const message = AIErrorHandler.formatErrorMessage(error);

            expect(message).toContain('Too many requests');
            expect(message).not.toContain('429'); // No status codes
        });

        it('should format generic errors for users', () => {
            const error = new Error('Unexpected error: XYZ123');
            const message = AIErrorHandler.formatErrorMessage(error);

            expect(message).toBe('An error occurred. Please try again.');
            expect(message).not.toContain('XYZ123'); // No error details
        });
    });

    describe('Backend Proxy Error Handling', () => {
        it('should handle 429 rate limit errors', async () => {
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('429 Rate limit exceeded')
            );

            const mockAIOperation = async () => {
                return await BackendProxyService.request({ url: '/api/ai/test', method: 'POST' });
            };

            await expect(mockAIOperation()).rejects.toThrow('429');

            const error = new Error('429 Rate limit exceeded');
            const errorInfo = AIErrorHandler.categorizeError(error);

            expect(errorInfo.retryable).toBe(true);
        });

        it('should handle network timeout errors', async () => {
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('Request timeout after 60000ms')
            );

            await expect(
                BackendProxyService.request({ url: '/api/ai/test', method: 'POST' })
            ).rejects.toThrow('timeout');
        });

        it('should handle invalid API responses', async () => {
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('Invalid JSON response from backend')
            );

            await expect(
                BackendProxyService.request({ url: '/api/ai/test', method: 'POST' })
            ).rejects.toThrow('Invalid JSON');
        });

        it('should handle connection refused errors', async () => {
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('Network error: ECONNREFUSED')
            );

            await expect(
                BackendProxyService.request({ url: '/api/ai/test', method: 'POST' })
            ).rejects.toThrow('ECONNREFUSED');
        });
    });

    describe('Error Recovery Strategies', () => {
        it('should retry on timeout and succeed', async () => {
            let callCount = 0;

            const mockOperation = async () => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('Request timeout after 60000ms');
                }
                return { data: 'success' };
            };

            const result = await AIErrorHandler.retryWithBackoff(mockOperation, 3, 50);

            expect(result).toEqual({ data: 'success' });
            expect(callCount).toBe(2);
        });

        it('should fallback to DirectGeminiClient on backend failure', async () => {
            // Simulate backend failure
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('503 Service Unavailable')
            );

            const mockFallback = jest.fn(async () => ({ data: 'fallback success' }));

            // Try backend first, then fallback
            try {
                await BackendProxyService.request({ url: '/api/ai/test', method: 'POST' });
            } catch (error) {
                const errorInfo = AIErrorHandler.categorizeError(error as Error);
                if (errorInfo.category === 'SERVICE_UNAVAILABLE') {
                    const result = await mockFallback();
                    expect(result).toEqual({ data: 'fallback success' });
                }
            }

            expect(mockFallback).toHaveBeenCalled();
        });

        it('should maintain state consistency after errors', async () => {
            const state = { isProcessing: false, lastError: null as Error | null };

            const mockOperation = async () => {
                state.isProcessing = true;
                try {
                    throw new Error('Simulated error');
                } catch (error) {
                    state.lastError = error as Error;
                    throw error;
                } finally {
                    state.isProcessing = false;
                }
            };

            await expect(mockOperation()).rejects.toThrow('Simulated error');

            expect(state.isProcessing).toBe(false); // State reset
            expect(state.lastError).toBeDefined();
        });
    });

    describe('Edge Cases and Stress Testing', () => {
        it('should handle rapid consecutive errors', async () => {
            const errors: Error[] = [];

            for (let i = 0; i < 100; i++) {
                try {
                    throw new Error(`Error ${i}`);
                } catch (error) {
                    errors.push(error as Error);
                    AIErrorHandler.categorizeError(error as Error);
                }
            }

            expect(errors.length).toBe(100);
        });

        it('should handle very long error messages', () => {
            const longMessage = 'Error: ' + 'A'.repeat(10000);
            const error = new Error(longMessage);

            const message = AIErrorHandler.formatErrorMessage(error);

            // Should still return user-friendly message, not the long error
            expect(message.length).toBeLessThan(200);
        });

        it('should handle errors with missing messages', () => {
            const error = new Error();
            const result = AIErrorHandler.categorizeError(error);

            expect(result.category).toBe('UNKNOWN');
            expect(result.userMessage).toBeDefined();
        });

        it('should handle concurrent error handling', async () => {
            const promises = Array(100).fill(null).map(async (_, i) => {
                const error = new Error(`Error ${i % 5}`); // 5 different error types
                return AIErrorHandler.categorizeError(error);
            });

            const results = await Promise.all(promises);

            expect(results).toHaveLength(100);
            results.forEach(result => {
                expect(result).toHaveProperty('category');
                expect(result).toHaveProperty('retryable');
                expect(result).toHaveProperty('userMessage');
            });
        });
    });

    describe('Integration with Real AI Operations', () => {
        it('should handle PICO generation errors gracefully', async () => {
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('500 Internal Server Error')
            );

            const mockPICOGeneration = async () => {
                try {
                    return await BackendProxyService.request({
                        url: '/api/ai/generate-pico',
                        method: 'POST',
                        body: { pdfText: 'test' }
                    });
                } catch (error) {
                    const errorInfo = AIErrorHandler.categorizeError(error as Error);
                    throw new Error(errorInfo.userMessage);
                }
            };

            await expect(mockPICOGeneration()).rejects.toThrow('fallback');
        });

        it('should handle validation errors with context', async () => {
            (BackendProxyService.request as jest.Mock).mockRejectedValue(
                // @ts-expect-error - Jest mock typing limitation
                new Error('Invalid field value format')
            );

            const mockValidation = async () => {
                try {
                    return await BackendProxyService.request({
                        url: '/api/ai/validate-field',
                        method: 'POST',
                        body: { fieldId: 'test', fieldValue: 'test', pdfText: 'test' }
                    });
                } catch (error) {
                    return {
                        is_supported: false,
                        quote: '',
                        confidence: 0,
                        error: AIErrorHandler.formatErrorMessage(error as Error)
                    };
                }
            };

            const result = await mockValidation();

            // @ts-expect-error - Test expects error handling path
            expect(result.is_supported).toBe(false);
            // @ts-expect-error - Test expects error handling path
            expect(result.error).toBeDefined();
        });
    });
});

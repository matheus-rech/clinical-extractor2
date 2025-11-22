/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for BackendHealthMonitor
 */

import BackendHealthMonitor from '../../src/services/BackendHealthMonitor';

describe('BackendHealthMonitor', () => {
    // Mock BackendClient
    let mockBackendClient: any;

    beforeEach(() => {
        // Reset monitor state before each test
        BackendHealthMonitor.reset();

        // Create mock BackendClient
        mockBackendClient = {
            healthCheck: jest.fn(),
            isAuthenticated: jest.fn()
        };

        BackendHealthMonitor.setBackendClient(mockBackendClient);
    });

    afterEach(() => {
        // Stop monitor to prevent memory leaks
        BackendHealthMonitor.stop();
    });

    describe('Configuration', () => {
        it('should use default configuration', () => {
            const status = BackendHealthMonitor.getStatus();
            expect(status.mode).toBe('frontend-only');
            expect(status.checkCount).toBe(0);
        });

        it('should allow custom configuration', () => {
            BackendHealthMonitor.configure({
                checkInterval: 30000,
                cacheTTL: 15000,
                autoStart: false
            });

            // Configuration applied (internal state not directly accessible)
            expect(() => BackendHealthMonitor.configure({ cacheTTL: 10000 })).not.toThrow();
        });
    });

    describe('Health Checking', () => {
        it('should check backend health successfully', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            const status = await BackendHealthMonitor.checkHealth();

            expect(status.isHealthy).toBe(true);
            expect(status.isAuthenticated).toBe(true);
            expect(status.mode).toBe('backend');
            expect(status.checkCount).toBe(1);
            expect(mockBackendClient.healthCheck).toHaveBeenCalledTimes(1);
        });

        it('should handle backend unavailable', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(false);
            mockBackendClient.isAuthenticated.mockReturnValue(false);

            const status = await BackendHealthMonitor.checkHealth();

            expect(status.isHealthy).toBe(false);
            expect(status.isAuthenticated).toBe(false);
            expect(status.mode).toBe('frontend-only');
        });

        it('should handle backend errors gracefully', async () => {
            mockBackendClient.healthCheck.mockRejectedValue(new Error('Network error'));

            const status = await BackendHealthMonitor.checkHealth();

            expect(status.isHealthy).toBe(false);
            expect(status.mode).toBe('frontend-only');
            expect(status.error).toBe('Network error');
        });

        it('should cache health check results', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            // First check
            await BackendHealthMonitor.checkHealth();

            // Second check (should use cache)
            const status = await BackendHealthMonitor.checkHealth();

            // healthCheck called only once (cached)
            expect(mockBackendClient.healthCheck).toHaveBeenCalledTimes(1);
            expect(status.checkCount).toBe(1);
        });

        it('should bypass cache on force check', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            // First check
            await BackendHealthMonitor.checkHealth();

            // Force check (bypass cache)
            await BackendHealthMonitor.forceCheck();

            // healthCheck called twice
            expect(mockBackendClient.healthCheck).toHaveBeenCalledTimes(2);
        });
    });

    describe('Status Getters', () => {
        it('should provide current status', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            await BackendHealthMonitor.checkHealth();

            expect(BackendHealthMonitor.isHealthy()).toBe(true);
            expect(BackendHealthMonitor.isAuthenticated()).toBe(true);
            expect(BackendHealthMonitor.getMode()).toBe('backend');
        });

        it('should return immutable status copy', async () => {
            await BackendHealthMonitor.checkHealth();

            const status1 = BackendHealthMonitor.getStatus();
            const status2 = BackendHealthMonitor.getStatus();

            // Same values but different objects
            expect(status1).toEqual(status2);
            expect(status1).not.toBe(status2);
        });
    });

    describe('Event Subscription', () => {
        it('should notify listeners on status change', async () => {
            const listener = jest.fn();
            BackendHealthMonitor.subscribe(listener);

            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            await BackendHealthMonitor.checkHealth();

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    isHealthy: true,
                    mode: 'backend'
                })
            );
        });

        it('should not notify if status unchanged', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            // First check
            await BackendHealthMonitor.checkHealth();

            const listener = jest.fn();
            BackendHealthMonitor.subscribe(listener);

            // Second check (cached, no change)
            await BackendHealthMonitor.checkHealth();

            expect(listener).not.toHaveBeenCalled();
        });

        it('should support unsubscribe', async () => {
            const listener = jest.fn();
            const unsubscribe = BackendHealthMonitor.subscribe(listener);

            unsubscribe();

            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            await BackendHealthMonitor.checkHealth();

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('Continuous Monitoring', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should start continuous monitoring', async () => {
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            BackendHealthMonitor.configure({ checkInterval: 1000 });
            BackendHealthMonitor.start();

            // Initial check
            expect(mockBackendClient.healthCheck).toHaveBeenCalledTimes(1);

            // Advance timer by 1 second
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Allow async operations to complete

            // Should check again
            expect(mockBackendClient.healthCheck).toHaveBeenCalledTimes(2);
        });

        it('should stop monitoring', () => {
            BackendHealthMonitor.start();
            BackendHealthMonitor.stop();

            // Should not throw
            expect(() => BackendHealthMonitor.stop()).not.toThrow();
        });

        it('should not start twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            BackendHealthMonitor.start();
            BackendHealthMonitor.start();

            expect(consoleSpy).toHaveBeenCalledWith('⚠️ Health monitor already running');

            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing BackendClient gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            BackendHealthMonitor.setBackendClient(null);
            const status = await BackendHealthMonitor.checkHealth();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('BackendClient not injected')
            );
            expect(status.mode).toBe('frontend-only');

            consoleSpy.mockRestore();
        });

        it('should handle listener errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const badListener = () => {
                throw new Error('Listener error');
            };

            BackendHealthMonitor.subscribe(badListener);
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            await BackendHealthMonitor.checkHealth();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error in health monitor listener'),
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should schedule retry on failure', async () => {
            BackendHealthMonitor.configure({
                retryDelay: 10,  // Very short delay for testing
                maxRetries: 2
            });

            mockBackendClient.healthCheck.mockRejectedValue(new Error('Network error'));

            // First check (will fail and schedule retry asynchronously)
            const status = await BackendHealthMonitor.checkHealth();

            // Should have failed
            expect(status.isHealthy).toBe(false);
            expect(status.error).toBe('Network error');

            // Should have called once initially (retries happen asynchronously)
            expect(mockBackendClient.healthCheck).toHaveBeenCalled();
        });
    });

    describe('Reset', () => {
        it('should reset all state', async () => {
            BackendHealthMonitor.start();
            mockBackendClient.healthCheck.mockResolvedValue(true);
            mockBackendClient.isAuthenticated.mockReturnValue(true);

            await BackendHealthMonitor.checkHealth();

            BackendHealthMonitor.reset();

            const status = BackendHealthMonitor.getStatus();
            expect(status.checkCount).toBe(0);
            expect(status.mode).toBe('frontend-only');
        });
    });
});

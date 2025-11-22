/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BackendHealthMonitor - Centralized backend health monitoring
 *
 * Provides:
 * - Continuous health checking with configurable intervals
 * - Cached health status to reduce API calls
 * - Health status change notifications
 * - Automatic retry with exponential backoff
 * - Frontend-first design (graceful degradation)
 *
 * Design Principle:
 * Backend integration is OPTIONAL. The application must work
 * seamlessly in frontend-only mode when backend is unavailable.
 */

export interface HealthStatus {
    isHealthy: boolean;
    isAuthenticated: boolean;
    lastChecked: number;
    checkCount: number;
    mode: 'backend' | 'frontend-only';
    error?: string;
}

export interface HealthMonitorConfig {
    checkInterval: number;        // How often to check (ms)
    cacheTTL: number;             // How long to cache result (ms)
    retryDelay: number;           // Initial retry delay (ms)
    maxRetries: number;           // Max retry attempts
    autoStart: boolean;           // Start monitoring automatically
}

type HealthChangeCallback = (status: HealthStatus) => void;

/**
 * BackendHealthMonitor Service
 * Singleton pattern for centralized health monitoring
 */
class BackendHealthMonitor {
    private config: HealthMonitorConfig = {
        checkInterval: 60000,     // 1 minute
        cacheTTL: 30000,          // 30 seconds
        retryDelay: 5000,         // 5 seconds
        maxRetries: 3,
        autoStart: false          // Don't auto-start (manual control)
    };

    private status: HealthStatus = {
        isHealthy: false,
        isAuthenticated: false,
        lastChecked: 0,
        checkCount: 0,
        mode: 'frontend-only'
    };

    private intervalId: number | null = null;
    private listeners: HealthChangeCallback[] = [];
    private retryCount = 0;
    private BackendClient: any = null;

    /**
     * Configure health monitor
     */
    configure(config: Partial<HealthMonitorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Set BackendClient dependency (injected to avoid circular deps)
     */
    setBackendClient(client: any): void {
        this.BackendClient = client;
    }

    /**
     * Start continuous health monitoring
     */
    start(): void {
        if (this.intervalId) {
            console.warn('⚠️ Health monitor already running');
            return;
        }

        console.log('🏥 Starting backend health monitor...');

        // Initial check immediately
        this.checkHealth();

        // Then periodic checks
        this.intervalId = window.setInterval(() => {
            this.checkHealth();
        }, this.config.checkInterval);
    }

    /**
     * Stop health monitoring
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🏥 Health monitor stopped');
        }
    }

    /**
     * Check backend health (with caching)
     */
    async checkHealth(): Promise<HealthStatus> {
        // Return cached result if still valid
        const now = Date.now();
        const cacheValid = (now - this.status.lastChecked) < this.config.cacheTTL;

        if (cacheValid && this.status.checkCount > 0) {
            return this.status;
        }

        // Perform actual health check
        if (!this.BackendClient) {
            console.warn('⚠️ BackendClient not injected - cannot check health');
            return this.status;
        }

        try {
            const isHealthy = await this.BackendClient.healthCheck();
            const isAuthenticated = this.BackendClient.isAuthenticated();

            const newStatus: HealthStatus = {
                isHealthy,
                isAuthenticated,
                lastChecked: Date.now(),
                checkCount: this.status.checkCount + 1,
                mode: isHealthy && isAuthenticated ? 'backend' : 'frontend-only'
            };

            // Notify listeners if status changed
            if (this.hasStatusChanged(newStatus)) {
                this.notifyListeners(newStatus);
            }

            this.status = newStatus;
            this.retryCount = 0; // Reset retry count on success

            return newStatus;

        } catch (error: any) {
            const errorStatus: HealthStatus = {
                isHealthy: false,
                isAuthenticated: false,
                lastChecked: Date.now(),
                checkCount: this.status.checkCount + 1,
                mode: 'frontend-only',
                error: error.message
            };

            // Notify listeners if status changed
            if (this.hasStatusChanged(errorStatus)) {
                this.notifyListeners(errorStatus);
            }

            this.status = errorStatus;

            // Retry with exponential backoff if configured
            if (this.retryCount < this.config.maxRetries) {
                this.retryCount++;
                const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
                console.log(`⚠️ Health check failed, retrying in ${delay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);

                setTimeout(() => this.checkHealth(), delay);
            }

            return errorStatus;
        }
    }

    /**
     * Get current status (from cache)
     */
    getStatus(): HealthStatus {
        return { ...this.status };
    }

    /**
     * Check if backend is healthy (cached)
     */
    isHealthy(): boolean {
        return this.status.isHealthy;
    }

    /**
     * Check if authenticated (cached)
     */
    isAuthenticated(): boolean {
        return this.status.isAuthenticated;
    }

    /**
     * Get current mode
     */
    getMode(): 'backend' | 'frontend-only' {
        return this.status.mode;
    }

    /**
     * Subscribe to health status changes
     */
    subscribe(callback: HealthChangeCallback): () => void {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Force immediate health check (bypass cache)
     */
    async forceCheck(): Promise<HealthStatus> {
        this.status.lastChecked = 0; // Invalidate cache
        return this.checkHealth();
    }

    /**
     * Check if status has changed significantly
     */
    private hasStatusChanged(newStatus: HealthStatus): boolean {
        return (
            newStatus.isHealthy !== this.status.isHealthy ||
            newStatus.isAuthenticated !== this.status.isAuthenticated ||
            newStatus.mode !== this.status.mode
        );
    }

    /**
     * Notify all listeners of status change
     */
    private notifyListeners(status: HealthStatus): void {
        this.listeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error in health monitor listener:', error);
            }
        });
    }

    /**
     * Reset monitor state
     */
    reset(): void {
        this.stop();
        this.status = {
            isHealthy: false,
            isAuthenticated: false,
            lastChecked: 0,
            checkCount: 0,
            mode: 'frontend-only'
        };
        this.retryCount = 0;
        this.listeners = [];
    }
}

// Export singleton instance
export default new BackendHealthMonitor();

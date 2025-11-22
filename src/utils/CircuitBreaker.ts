/**
 * Circuit Breaker pattern implementation for AI service resilience
 * 
 * Prevents cascading failures by temporarily blocking requests
 * when error rate exceeds threshold.
 */

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    monitoringPeriod: number;
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastFailureTime: number | null;
    nextAttemptTime: number | null;
}

export class CircuitBreaker {
    private state: CircuitState;
    private failureCount: number;
    private successCount: number;
    private consecutiveFailures: number;
    private consecutiveSuccesses: number;
    private lastFailureTime: number | null;
    private nextAttemptTime: number | null;
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            failureThreshold: config.failureThreshold || 5,
            successThreshold: config.successThreshold || 2,
            timeout: config.timeout || 60000,
            monitoringPeriod: config.monitoringPeriod || 300000,
        };

        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (this.nextAttemptTime && Date.now() < this.nextAttemptTime) {
                throw new Error(
                    `Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`
                );
            }

            this.state = CircuitState.HALF_OPEN;
            console.log('Circuit breaker: Transitioning to HALF_OPEN');
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.successCount++;
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            if (this.consecutiveSuccesses >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.reset();
                console.log('Circuit breaker: Transitioning to CLOSED (recovered)');
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            this.trip();
        } else if (this.consecutiveFailures >= this.config.failureThreshold) {
            this.trip();
        }
    }

    private trip(): void {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.timeout;
        
        console.warn(
            `Circuit breaker: Transitioning to OPEN after ${this.consecutiveFailures} consecutive failures. ` +
            `Will retry at ${new Date(this.nextAttemptTime).toISOString()}`
        );
    }

    private reset(): void {
        this.failureCount = 0;
        this.successCount = 0;
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }

    getState(): CircuitState {
        return this.state;
    }

    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failureCount,
            successes: this.successCount,
            consecutiveFailures: this.consecutiveFailures,
            consecutiveSuccesses: this.consecutiveSuccesses,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttemptTime,
        };
    }

    forceOpen(): void {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.timeout;
        console.warn('Circuit breaker: Manually forced to OPEN state');
    }

    forceClose(): void {
        this.state = CircuitState.CLOSED;
        this.reset();
        console.log('Circuit breaker: Manually forced to CLOSED state');
    }
}

export default CircuitBreaker;

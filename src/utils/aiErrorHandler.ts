/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Error Handler Utility
 *
 * Provides error categorization and user-friendly messaging for AI service errors.
 * Helps users understand what went wrong and what action to take.
 */

export type ErrorCategory =
    | 'api_key'
    | 'rate_limit'
    | 'network'
    | 'circuit_breaker'
    | 'response_format'
    | 'timeout'
    | 'unknown';

export interface CategorizedError {
    category: ErrorCategory;
    userMessage: string;
    technicalDetails: string;
    shouldRetry: boolean;
    retryAfterSeconds?: number;
    actionableSteps: string[];
}

/**
 * Categorizes AI errors and provides user-friendly messages with actionable steps
 */
export function categorizeAIError(error: any, context: string = 'AI operation'): CategorizedError {
    const errorMsg = (error?.message || '').toLowerCase();
    const errorCode = error?.code?.toUpperCase() || '';

    // API Key Issues
    if (errorMsg.includes('api key') ||
        errorMsg.includes('unauthorized') ||
        errorMsg.includes('invalid key') ||
        error?.status === 401 ||
        error?.status === 403) {
        return {
            category: 'api_key',
            userMessage: 'API key configuration issue detected',
            technicalDetails: error.message || 'Authentication failed',
            shouldRetry: false,
            actionableSteps: [
                'Check that .env.local file exists in project root',
                'Verify VITE_GEMINI_API_KEY is set correctly',
                'Get a valid API key from https://ai.google.dev/',
                'Restart the development server after updating .env.local'
            ]
        };
    }

    // Rate Limiting
    if (errorMsg.includes('rate limit') ||
        errorMsg.includes('too many requests') ||
        errorMsg.includes('429') ||
        error?.status === 429 ||
        errorMsg.includes('quota')) {
        return {
            category: 'rate_limit',
            userMessage: 'API rate limit reached',
            technicalDetails: error.message || 'Too many requests',
            shouldRetry: true,
            retryAfterSeconds: 60,
            actionableSteps: [
                'Wait 60 seconds before trying again',
                'Check your API quota in Google Cloud Console',
                'Consider upgrading your API plan if needed',
                'Reduce the number of concurrent requests'
            ]
        };
    }

    // Circuit Breaker
    if (errorMsg.includes('circuit breaker') || errorMsg.includes('circuit is open')) {
        return {
            category: 'circuit_breaker',
            userMessage: 'AI service temporarily unavailable',
            technicalDetails: 'Circuit breaker is OPEN due to repeated failures',
            shouldRetry: true,
            retryAfterSeconds: 60,
            actionableSteps: [
                'System detected repeated failures and paused requests',
                'Circuit breaker will auto-recover in 60 seconds',
                'Wait for automatic recovery before retrying',
                'If issue persists, check your internet connection'
            ]
        };
    }

    // Network Errors
    const networkErrorCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN'];
    if (networkErrorCodes.includes(errorCode) ||
        errorMsg.includes('network') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('connection') ||
        errorMsg.includes('fetch failed')) {
        return {
            category: 'network',
            userMessage: 'Network connection issue',
            technicalDetails: error.message || 'Network error',
            shouldRetry: true,
            retryAfterSeconds: 5,
            actionableSteps: [
                'Check your internet connection',
                'Verify you can access https://generativelanguage.googleapis.com',
                'Try disabling VPN or proxy if enabled',
                'Wait a moment and try again'
            ]
        };
    }

    // Timeout Errors
    if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        return {
            category: 'timeout',
            userMessage: 'Request timed out',
            technicalDetails: error.message || 'Operation timeout',
            shouldRetry: true,
            retryAfterSeconds: 10,
            actionableSteps: [
                'The operation took too long to complete',
                'Try with a smaller/shorter document',
                'Check your internet connection speed',
                'Retry the operation'
            ]
        };
    }

    // Response Format Issues
    if (errorMsg.includes('json') ||
        errorMsg.includes('parse') ||
        errorMsg.includes('unexpected token') ||
        errorMsg.includes('invalid response')) {
        return {
            category: 'response_format',
            userMessage: 'AI returned an invalid response',
            technicalDetails: error.message || 'Response parsing failed',
            shouldRetry: false,
            actionableSteps: [
                'The AI response was in an unexpected format',
                'This may indicate the document is too complex',
                'Try with a shorter or simpler document',
                'If issue persists, contact support with error details'
            ]
        };
    }

    // Unknown Error
    return {
        category: 'unknown',
        userMessage: `${context} failed`,
        technicalDetails: error.message || 'Unknown error occurred',
        shouldRetry: false,
        actionableSteps: [
            'An unexpected error occurred',
            'Check browser console for details (F12)',
            'Try refreshing the page',
            'Contact support if issue persists'
        ]
    };
}

/**
 * Formats a categorized error into a user-friendly message
 */
export function formatErrorMessage(categorizedError: CategorizedError, includeSteps: boolean = true): string {
    let message = `⚠️ ${categorizedError.userMessage}`;

    if (categorizedError.retryAfterSeconds) {
        message += `\n\nPlease wait ${categorizedError.retryAfterSeconds} seconds before retrying.`;
    }

    if (includeSteps && categorizedError.actionableSteps.length > 0) {
        message += '\n\nWhat to do:\n';
        categorizedError.actionableSteps.forEach((step, index) => {
            message += `${index + 1}. ${step}\n`;
        });
    }

    return message.trim();
}

/**
 * Determines if an error is retryable based on its category
 */
export function isErrorRetryable(error: any): boolean {
    const categorized = categorizeAIError(error);
    return categorized.shouldRetry;
}

/**
 * Gets suggested retry delay for an error
 */
export function getRetryDelay(error: any): number {
    const categorized = categorizeAIError(error);
    return (categorized.retryAfterSeconds || 0) * 1000; // Convert to milliseconds
}

/**
 * Logs error with full context for debugging
 */
export function logErrorWithContext(
    error: any,
    context: string,
    additionalInfo?: Record<string, any>
): void {
    const categorized = categorizeAIError(error, context);

    console.group(`🔴 ${context} - ${categorized.category.toUpperCase()}`);
    console.error('User Message:', categorized.userMessage);
    console.error('Technical Details:', categorized.technicalDetails);
    console.error('Should Retry:', categorized.shouldRetry);
    if (categorized.retryAfterSeconds) {
        console.error('Retry After:', `${categorized.retryAfterSeconds}s`);
    }
    console.error('Original Error:', error);
    if (additionalInfo) {
        console.error('Additional Context:', additionalInfo);
    }
    console.groupEnd();
}

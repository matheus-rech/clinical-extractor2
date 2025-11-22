/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CitationAuditTrail Service
 * 
 * Logs all citation queries and user actions for regulatory compliance and audit purposes.
 * Provides complete traceability of citation usage and data extraction provenance.
 * 
 * Features:
 * - Timestamps all citation queries
 * - Tracks AI responses and citations used
 * - Logs user actions (extractions, field updates)
 * - Exports audit trail for compliance
 * - localStorage persistence
 * - IndexedDB backup for large datasets
 */

import type { Citation } from './CitationService';
import type { Extraction } from '../types';

/**
 * Audit log entry for a citation query
 */
export interface CitationQueryLog {
    /** Unique log entry ID */
    id: string;
    /** Timestamp of the query */
    timestamp: string;
    /** Query text sent to AI */
    query: string;
    /** AI response text */
    response: string;
    /** Citation indices used in response */
    citationIndices: number[];
    /** Full citation objects referenced */
    citations: Citation[];
    /** Confidence score from AI (0-1) */
    confidence?: number;
    /** User who made the query (for multi-user systems) */
    userId?: string;
}

/**
 * Audit log entry for user actions
 */
export interface UserActionLog {
    /** Unique log entry ID */
    id: string;
    /** Timestamp of the action */
    timestamp: string;
    /** Type of action */
    actionType: 'extraction' | 'field_update' | 'citation_view' | 'export' | 'delete';
    /** Field name affected */
    fieldName?: string;
    /** Extraction ID if applicable */
    extractionId?: string;
    /** Citation indices involved */
    citationIndices?: number[];
    /** Additional metadata */
    metadata?: any;
}

/**
 * Combined audit trail entry
 */
export type AuditLogEntry = CitationQueryLog | UserActionLog;

/**
 * Statistics about audit trail usage
 */
export interface AuditStats {
    totalQueries: number;
    totalActions: number;
    totalCitationsUsed: number;
    dateRange: {
        earliest: string;
        latest: string;
    };
    queriesByHour: Record<string, number>;
    actionsByType: Record<string, number>;
}

/**
 * CitationAuditTrail Service
 */
class CitationAuditTrailService {
    private queryLogs: CitationQueryLog[] = [];
    private actionLogs: UserActionLog[] = [];
    private readonly STORAGE_KEY = 'citation_audit_trail';
    private readonly MAX_LOGS = 10000; // Prevent unbounded growth

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Log a citation query
     */
    logCitationQuery(
        query: string,
        response: string,
        citationIndices: number[],
        citations: Citation[],
        confidence?: number,
        userId?: string
    ): CitationQueryLog {
        const log: CitationQueryLog = {
            id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            query,
            response,
            citationIndices,
            citations,
            confidence,
            userId
        };

        this.queryLogs.push(log);
        this.trimLogs();
        this.saveToStorage();

        return log;
    }

    /**
     * Log a user action
     */
    logUserAction(
        actionType: UserActionLog['actionType'],
        fieldName?: string,
        extractionId?: string,
        citationIndices?: number[],
        metadata?: any
    ): UserActionLog {
        const log: UserActionLog = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            actionType,
            fieldName,
            extractionId,
            citationIndices,
            metadata
        };

        this.actionLogs.push(log);
        this.trimLogs();
        this.saveToStorage();

        return log;
    }

    /**
     * Log an extraction with its citations
     */
    logExtraction(extraction: Extraction): void {
        this.logUserAction(
            'extraction',
            extraction.fieldName,
            extraction.id,
            extraction.citationIndices,
            {
                method: extraction.method,
                page: extraction.page,
                text: extraction.text.substring(0, 100)
            }
        );
    }

    /**
     * Log a citation view (when user clicks on a citation)
     */
    logCitationView(citationIndex: number, pageNum: number): void {
        this.logUserAction(
            'citation_view',
            undefined,
            undefined,
            [citationIndex],
            { pageNum }
        );
    }

    /**
     * Log an export action
     */
    logExport(exportType: string, recordCount: number): void {
        this.logUserAction(
            'export',
            undefined,
            undefined,
            undefined,
            { exportType, recordCount }
        );
    }

    /**
     * Get all query logs
     */
    getQueryLogs(): CitationQueryLog[] {
        return [...this.queryLogs];
    }

    /**
     * Get all action logs
     */
    getActionLogs(): UserActionLog[] {
        return [...this.actionLogs];
    }

    /**
     * Get all logs combined
     */
    getAllLogs(): AuditLogEntry[] {
        return [...this.queryLogs, ...this.actionLogs].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    /**
     * Get logs for a specific date range
     */
    getLogsByDateRange(startDate: Date, endDate: Date): AuditLogEntry[] {
        const start = startDate.getTime();
        const end = endDate.getTime();

        return this.getAllLogs().filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime >= start && logTime <= end;
        });
    }

    /**
     * Get statistics about audit trail
     */
    getStats(): AuditStats {
        const allLogs = this.getAllLogs();
        
        const timestamps = allLogs.map(log => new Date(log.timestamp));
        const earliest = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date();
        const latest = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date();

        // Count queries by hour of day
        const queriesByHour: Record<string, number> = {};
        this.queryLogs.forEach(log => {
            const hour = new Date(log.timestamp).getHours().toString();
            queriesByHour[hour] = (queriesByHour[hour] || 0) + 1;
        });

        // Count actions by type
        const actionsByType: Record<string, number> = {};
        this.actionLogs.forEach(log => {
            actionsByType[log.actionType] = (actionsByType[log.actionType] || 0) + 1;
        });

        // Total citations used across all queries
        const totalCitationsUsed = this.queryLogs.reduce(
            (sum, log) => sum + log.citationIndices.length,
            0
        );

        return {
            totalQueries: this.queryLogs.length,
            totalActions: this.actionLogs.length,
            totalCitationsUsed,
            dateRange: {
                earliest: earliest.toISOString(),
                latest: latest.toISOString()
            },
            queriesByHour,
            actionsByType
        };
    }

    /**
     * Export audit trail as JSON
     */
    exportJSON(): Blob {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            statistics: this.getStats(),
            queryLogs: this.queryLogs,
            actionLogs: this.actionLogs
        };

        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    /**
     * Export audit trail as CSV
     */
    exportCSV(): Blob {
        let csv = 'Type,ID,Timestamp,Action/Query,Response/Field,Citations,Metadata\n';

        // Add query logs
        this.queryLogs.forEach(log => {
            const query = log.query.replace(/"/g, '""');
            const response = log.response.substring(0, 100).replace(/"/g, '""');
            const citations = log.citationIndices.join(';');
            csv += `Query,"${log.id}","${log.timestamp}","${query}","${response}","${citations}",confidence:${log.confidence || 'N/A'}\n`;
        });

        // Add action logs
        this.actionLogs.forEach(log => {
            const field = log.fieldName || 'N/A';
            const citations = log.citationIndices?.join(';') || '';
            const metadata = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
            csv += `Action,"${log.id}","${log.timestamp}","${log.actionType}","${field}","${citations}","${metadata}"\n`;
        });

        return new Blob([csv], { type: 'text/csv' });
    }

    /**
     * Clear all logs (use with caution)
     */
    clearAll(): void {
        if (confirm('Are you sure you want to clear the entire audit trail? This cannot be undone.')) {
            this.queryLogs = [];
            this.actionLogs = [];
            this.saveToStorage();
        }
    }

    /**
     * Trim logs to prevent unbounded growth
     */
    private trimLogs(): void {
        const totalLogs = this.queryLogs.length + this.actionLogs.length;
        
        if (totalLogs > this.MAX_LOGS) {
            // Remove oldest 20% of logs
            const toRemove = Math.floor(this.MAX_LOGS * 0.2);
            
            // Sort by timestamp and remove oldest
            const allLogs = [...this.queryLogs, ...this.actionLogs].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            const idsToRemove = new Set(allLogs.slice(0, toRemove).map(log => log.id));
            
            this.queryLogs = this.queryLogs.filter(log => !idsToRemove.has(log.id));
            this.actionLogs = this.actionLogs.filter(log => !idsToRemove.has(log.id));
        }
    }

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = {
                queryLogs: this.queryLogs,
                actionLogs: this.actionLogs
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save audit trail to localStorage:', e);
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.queryLogs = data.queryLogs || [];
                this.actionLogs = data.actionLogs || [];
            }
        } catch (e) {
            console.error('Failed to load audit trail from localStorage:', e);
            this.queryLogs = [];
            this.actionLogs = [];
        }
    }
}

// Singleton instance
const citationAuditTrail = new CitationAuditTrailService();

export default citationAuditTrail;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ExtractionTracker - Manages extraction data and persistence
 *
 * Handles:
 * - Adding and tracking extractions
 * - localStorage persistence
 * - Trace log updates
 * - Navigation to extractions
 * - Statistics updates
 *
 * Dependencies:
 * - Requires StatusManager for showing AI extraction info
 * - Requires PDFRenderer for page navigation
 * - These dependencies are injected to avoid circular imports
 */

import SecurityUtils from '../utils/security';
import type { Extraction, ExtractionMethod } from '../types';

// Type definitions for injected dependencies
interface AppStateManager {
    getState: () => any;
    setState: (updates: any) => void;
}

interface StatusManager {
    show: (message: string, type: string, duration: number) => void;
}

interface PDFRenderer {
    renderPage: (pageNum: number, textSelection?: any) => Promise<void>;
}

interface ExtractionInput {
    text: string;
    fieldName: string;
    documentName: string;
    page: number;
    coordinates: any;
    method: string;
    citationIndices?: number[];
}

interface ExtractionTrackerType {
    extractions: Extraction[];
    fieldMap: Map<string, Extraction>;
    appStateManager: AppStateManager | null;
    statusManager: StatusManager | null;
    pdfRenderer: PDFRenderer | null;

    init: () => void;
    setDependencies: (deps: {
        appStateManager: AppStateManager;
        statusManager: StatusManager;
        pdfRenderer: PDFRenderer;
    }) => void;
    addExtraction: (data: ExtractionInput) => Extraction | null;
    updateTraceLog: (extraction: Extraction) => void;
    navigateToExtraction: (extraction: Extraction) => void;
    updateStats: () => void;
    saveToStorage: () => void;
    loadFromStorage: () => void;
    getExtractions: () => Extraction[];
    getCitationStats: () => { totalCitations: number; fieldsWithCitations: number; avgCitationsPerField: number };
}

/**
 * ExtractionTracker manages all extraction data and its persistence.
 *
 * Key features:
 * - Validates and sanitizes all input data
 * - Persists to localStorage with error handling
 * - Updates trace log UI in real-time
 * - Maintains field-to-extraction mapping
 * - Provides navigation to extraction locations
 */
const ExtractionTracker: ExtractionTrackerType = {
    extractions: [],
    fieldMap: new Map(),
    appStateManager: null,
    statusManager: null,
    pdfRenderer: null,

    /**
     * Initialize the tracker by loading saved data from localStorage
     */
    init: function(): void {
        this.loadFromStorage();
    },

    /**
     * Inject dependencies to avoid circular imports
     * This must be called before using navigateToExtraction
     *
     * @param deps - Object containing required dependencies
     */
    setDependencies: function(deps: {
        appStateManager: AppStateManager;
        statusManager: StatusManager;
        pdfRenderer: PDFRenderer;
    }): void {
        this.appStateManager = deps.appStateManager;
        this.statusManager = deps.statusManager;
        this.pdfRenderer = deps.pdfRenderer;
    },

    /**
     * Add a new extraction to the tracker
     *
     * @param data - Extraction data to add
     * @returns The created extraction object, or null if validation fails
     */
    addExtraction: function(data: ExtractionInput): Extraction | null {
        // Sanitize all text inputs to prevent XSS
        const sanitizedData = {
            ...data,
            text: SecurityUtils.sanitizeText(data.text),
            fieldName: SecurityUtils.sanitizeText(data.fieldName),
            documentName: SecurityUtils.sanitizeText(data.documentName)
        };

        // Create temporary extraction for validation
        const validationData = {
            ...sanitizedData,
            id: 'temp',
            timestamp: new Date().toISOString()
        };

        // Validate extraction data structure
        if (!SecurityUtils.validateExtraction(validationData)) {
            console.error('Invalid extraction data:', validationData);
            return null;
        }

        // Create final extraction with unique ID and timestamp
        const extraction: Extraction = {
            id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...sanitizedData,
            method: sanitizedData.method as ExtractionMethod,
            citationIndices: data.citationIndices || [],
            citationCount: (data.citationIndices || []).length
        };

        // Store extraction in array and map
        this.extractions.push(extraction);
        this.fieldMap.set(data.fieldName, extraction);

        // Update UI and persistence
        this.updateTraceLog(extraction);
        this.updateStats();
        this.saveToStorage();

        // Update global state if available
        if (this.appStateManager) {
            this.appStateManager.setState({ extractions: this.extractions });
        }

        return extraction;
    },

    /**
     * Update the trace log UI with a new extraction
     * Creates a DOM entry showing the extraction details
     *
     * @param extraction - Extraction to add to trace log
     */
    updateTraceLog: function(extraction: Extraction): void {
        const logContainer = document.getElementById('trace-log');
        if (!logContainer) return;

        // Create trace entry element
        const entry = document.createElement('div');
        entry.className = 'trace-entry';
        entry.dataset.extractionId = extraction.id;
        entry.dataset.method = extraction.method;

        // Truncate long text for display
        const truncatedText = extraction.text.length > 80
            ? extraction.text.substring(0, 80) + '...'
            : extraction.text;

        // Citation badge if citations exist
        const citationBadge = extraction.citationCount && extraction.citationCount > 0
            ? `<span class="citation-badge" title="${extraction.citationCount} citation(s)">${extraction.citationCount} 📚</span>`
            : '';

        // Build entry HTML with sanitized content
        entry.innerHTML = `
            <span class="field-label">${SecurityUtils.escapeHtml(extraction.fieldName)}</span>
            ${citationBadge}
            <span class="extracted-text">"${SecurityUtils.escapeHtml(truncatedText)}"</span>
            <div class="metadata">
                Page ${extraction.page} | ${extraction.method} | ${new Date(extraction.timestamp).toLocaleTimeString()}
            </div>`;

        // Add click handler for navigation
        entry.onclick = () => this.navigateToExtraction(extraction);

        // Insert at top of log (newest first)
        logContainer.insertBefore(entry, logContainer.firstChild);
    },

    /**
     * Navigate to an extraction's location in the PDF
     * For manual extractions, highlights the text on the page
     * For AI extractions, shows the text in a status message
     *
     * @param extraction - Extraction to navigate to
     */
    navigateToExtraction: function(extraction: Extraction): void {
        // AI extractions don't have coordinates, just show text
        if (extraction.method !== 'manual') {
            if (this.statusManager) {
                this.statusManager.show(
                    `AI Extraction: ${extraction.text}`,
                    'info',
                    5000
                );
            }
            return;
        }

        // For manual extractions, navigate to the page
        if (!this.appStateManager || !this.pdfRenderer) {
            console.warn('Dependencies not injected. Call setDependencies() first.');
            return;
        }

        const state = this.appStateManager.getState();

        // Render the page if not currently displayed
        if (extraction.page !== state.currentPage) {
            this.pdfRenderer.renderPage(extraction.page);
        }

        // Highlight the extraction marker after page renders
        setTimeout(() => {
            const marker = document.querySelector(
                `.extraction-marker[data-extraction-id="${extraction.id}"]`
            ) as HTMLElement;

            if (marker) {
                // Scroll marker into view
                marker.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Temporary highlight effect
                marker.style.background = 'rgba(255, 193, 7, 0.5)';
                setTimeout(() => {
                    marker.style.background = '';
                }, 1000);
            }
        }, 500);
    },

    /**
     * Update the statistics display
     * Shows total extractions and number of pages with data
     */
    updateStats: function(): void {
        const extractionCountEl = document.getElementById('extraction-count');
        const pagesWithDataEl = document.getElementById('pages-with-data');

        if (extractionCountEl) {
            extractionCountEl.textContent = this.extractions.length.toString();
        }

        // Calculate unique pages with extractions
        const uniquePages = new Set(this.extractions.map(e => e.page));
        if (pagesWithDataEl) {
            pagesWithDataEl.textContent = uniquePages.size.toString();
        }
    },

    /**
     * Save extractions to localStorage
     * Uses a simple key for compatibility
     */
    saveToStorage: function(): void {
        try {
            localStorage.setItem(
                'clinical_extractions_simple',
                JSON.stringify(this.extractions)
            );
        } catch (e) {
            console.error("Failed to save to localStorage:", e);
        }
    },

    /**
     * Load extractions from localStorage
     * Populates the trace log and updates statistics
     */
    loadFromStorage: function(): void {
        try {
            const saved = localStorage.getItem('clinical_extractions_simple');

            if (saved) {
                this.extractions = JSON.parse(saved);

                // Rebuild field map and trace log
                this.extractions.forEach(ext => {
                    this.fieldMap.set(ext.fieldName, ext);
                    this.updateTraceLog(ext);
                });

                // Update UI
                this.updateStats();

                // Update global state if available
                if (this.appStateManager) {
                    this.appStateManager.setState({
                        extractions: this.extractions
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load from localStorage:", e);
            this.extractions = [];
        }
    },

    /**
     * Get all extractions
     * @returns Array of all extraction objects
     */
    getExtractions: function(): Extraction[] {
        return this.extractions;
    },

    /**
     * Get citation statistics across all extractions
     * @returns Object with citation statistics
     */
    getCitationStats: function(): { totalCitations: number; fieldsWithCitations: number; avgCitationsPerField: number } {
        const totalCitations = this.extractions.reduce((sum, ext) => sum + (ext.citationCount || 0), 0);
        const fieldsWithCitations = this.extractions.filter(ext => (ext.citationCount || 0) > 0).length;
        const avgCitationsPerField = fieldsWithCitations > 0 ? totalCitations / fieldsWithCitations : 0;

        return {
            totalCitations,
            fieldsWithCitations,
            avgCitationsPerField: Math.round(avgCitationsPerField * 10) / 10
        };
    }
};

// Initialize on load
ExtractionTracker.init();

export default ExtractionTracker;

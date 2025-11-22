/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Citation UI Enhancer
 * 
 * Adds visual enhancements for citations throughout the application:
 * - Citation badges next to form fields with provenance
 * - Tooltip previews on hover over citation numbers
 * - Auto-citation tracking for manual extractions
 * 
 * Integrates with ExtractionTracker, FormManager, and AppStateManager
 */

import AppStateManager from '../state/AppStateManager';
import ExtractionTracker from '../data/ExtractionTracker';
import citationAuditTrail from './CitationAuditTrail';
import type { Extraction, Citation } from '../types';

/**
 * Citation UI Enhancer Service
 */
class CitationUIEnhancerService {
    private tooltipElement: HTMLElement | null = null;
    private isInitialized = false;

    /**
     * Initialize the citation UI enhancer
     */
    initialize(): void {
        if (this.isInitialized) return;

        this.createTooltipElement();
        this.addCitationBadgesToForms();
        this.setupCitationHoverListeners();
        this.isInitialized = true;

        console.log('Citation UI Enhancer initialized');
    }

    /**
     * Create the tooltip element for citation previews
     */
    private createTooltipElement(): void {
        // Remove existing tooltip if present
        const existing = document.getElementById('citation-tooltip');
        if (existing) existing.remove();

        // Create new tooltip
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'citation-tooltip';
        this.tooltipElement.className = 'citation-tooltip hidden';
        this.tooltipElement.innerHTML = `
            <div class="citation-tooltip-header">
                <span class="citation-tooltip-index"></span>
                <span class="citation-tooltip-page"></span>
            </div>
            <div class="citation-tooltip-content"></div>
            <div class="citation-tooltip-footer">
                <span class="citation-tooltip-confidence"></span>
            </div>
        `;
        document.body.appendChild(this.tooltipElement);

        // Add styles
        this.injectStyles();
    }

    /**
     * Inject CSS styles for citation UI enhancements
     */
    private injectStyles(): void {
        if (document.getElementById('citation-ui-styles')) return;

        const style = document.createElement('style');
        style.id = 'citation-ui-styles';
        style.textContent = `
            /* Citation Badge */
            .citation-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                margin-left: 6px;
                cursor: help;
                box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
                transition: all 0.2s ease;
            }

            .citation-badge:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
            }

            /* Form field citation badge */
            .form-group.has-citation {
                position: relative;
            }

            .form-group.has-citation::before {
                content: '✓';
                position: absolute;
                left: -20px;
                top: 50%;
                transform: translateY(-50%);
                color: #10b981;
                font-weight: bold;
                font-size: 16px;
            }

            .field-citation-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: #10b981;
                color: white;
                padding: 3px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                margin-left: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .field-citation-badge:hover {
                background: #059669;
            }

            /* Citation Tooltip */
            .citation-tooltip {
                position: fixed;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }

            .citation-tooltip.hidden {
                opacity: 0;
                display: none;
            }

            .citation-tooltip-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
            }

            .citation-tooltip-index {
                font-weight: 600;
                color: #667eea;
                font-size: 14px;
            }

            .citation-tooltip-page {
                font-size: 12px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 2px 8px;
                border-radius: 4px;
            }

            .citation-tooltip-content {
                font-size: 13px;
                line-height: 1.5;
                color: #374151;
                margin-bottom: 8px;
                max-height: 150px;
                overflow-y: auto;
            }

            .citation-tooltip-footer {
                display: flex;
                justify-content: flex-end;
                padding-top: 8px;
                border-top: 1px solid #e5e7eb;
            }

            .citation-tooltip-confidence {
                font-size: 11px;
                color: #6b7280;
                font-style: italic;
            }

            /* Clickable citation numbers */
            .citation-number {
                color: #667eea;
                cursor: pointer;
                text-decoration: underline;
                font-weight: 500;
                transition: color 0.2s;
            }

            .citation-number:hover {
                color: #764ba2;
            }

            /* Trace log citation badge styling */
            .trace-entry .citation-badge {
                margin-left: 8px;
                font-size: 10px;
                padding: 2px 6px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Add citation badges to form fields that have provenance
     */
    addCitationBadgesToForms(): void {
        const extractions = ExtractionTracker.getExtractions();
        
        extractions.forEach(extraction => {
            if (!extraction.citationCount || extraction.citationCount === 0) return;

            // Find the form field
            const field = document.querySelector(
                `[name="${extraction.fieldName}"], #${extraction.fieldName}`
            ) as HTMLElement;

            if (!field) return;

            const formGroup = field.closest('.form-group');
            if (!formGroup) return;

            // Add class to form group
            formGroup.classList.add('has-citation');

            // Check if badge already exists
            if (formGroup.querySelector('.field-citation-badge')) return;

            // Create badge
            const badge = document.createElement('span');
            badge.className = 'field-citation-badge';
            badge.innerHTML = `📚 ${extraction.citationCount} citation${extraction.citationCount > 1 ? 's' : ''}`;
            badge.title = `This field has ${extraction.citationCount} supporting citation(s)`;

            // Add click handler to show citations
            badge.onclick = () => this.showFieldCitations(extraction);

            // Insert badge after the label
            const label = formGroup.querySelector('label');
            if (label) {
                label.appendChild(badge);
            }
        });
    }

    /**
     * Show citations for a specific field
     */
    private showFieldCitations(extraction: Extraction): void {
        if (!extraction.citationIndices || extraction.citationIndices.length === 0) {
            alert('No citations available for this field.');
            return;
        }

        const state = AppStateManager.getState();
        let message = `Citations for "${extraction.fieldName}":\n\n`;

        extraction.citationIndices.forEach((idx, i) => {
            const citation = state.citationMap?.[idx];
            if (citation) {
                message += `[${idx}] Page ${citation.pageNum}:\n`;
                message += `"${citation.sentence.substring(0, 100)}..."\n\n`;
            }
        });

        // Log the citation view
        citationAuditTrail.logUserAction(
            'citation_view',
            extraction.fieldName,
            extraction.id,
            extraction.citationIndices
        );

        // Show in alert (can be replaced with modal in production)
        alert(message);
    }

    /**
     * Setup hover listeners for citation numbers
     */
    private setupCitationHoverListeners(): void {
        // Use event delegation for citation numbers
        document.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-number') || target.closest('.citation-number')) {
                const citationEl = target.classList.contains('citation-number') 
                    ? target 
                    : target.closest('.citation-number') as HTMLElement;
                
                const citationIndex = parseInt(citationEl.dataset.citationIndex || '0');
                this.showTooltip(citationIndex, e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-number') || target.closest('.citation-number')) {
                this.hideTooltip();
            }
        });

        // Also handle citation badges
        document.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-badge')) {
                const extractionId = target.closest('[data-extraction-id]')?.getAttribute('data-extraction-id');
                if (extractionId) {
                    const extraction = ExtractionTracker.getExtractions().find(ext => ext.id === extractionId);
                    if (extraction && extraction.citationIndices && extraction.citationIndices.length > 0) {
                        // Show first citation as preview
                        this.showTooltip(extraction.citationIndices[0], e.clientX, e.clientY);
                    }
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-badge')) {
                this.hideTooltip();
            }
        });
    }

    /**
     * Show tooltip for a citation
     */
    private showTooltip(citationIndex: number, x: number, y: number): void {
        if (!this.tooltipElement) return;

        const state = AppStateManager.getState();
        const citation = state.citationMap?.[citationIndex];

        if (!citation) {
            this.hideTooltip();
            return;
        }

        // Update tooltip content
        const indexEl = this.tooltipElement.querySelector('.citation-tooltip-index');
        const pageEl = this.tooltipElement.querySelector('.citation-tooltip-page');
        const contentEl = this.tooltipElement.querySelector('.citation-tooltip-content');
        const confidenceEl = this.tooltipElement.querySelector('.citation-tooltip-confidence');

        if (indexEl) indexEl.textContent = `Citation [${citationIndex}]`;
        if (pageEl) pageEl.textContent = `Page ${citation.pageNum}`;
        if (contentEl) {
            const previewText = citation.sentence.substring(0, 150);
            contentEl.textContent = previewText + (citation.sentence.length > 150 ? '...' : '');
        }
        if (confidenceEl) {
            const confidence = citation.confidence || 0;
            confidenceEl.textContent = `Confidence: ${(confidence * 100).toFixed(0)}%`;
        }

        // Position tooltip
        const tooltipWidth = 400;
        const tooltipHeight = 200;
        
        let left = x + 10;
        let top = y + 10;

        // Prevent tooltip from going off screen
        if (left + tooltipWidth > window.innerWidth) {
            left = x - tooltipWidth - 10;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = y - tooltipHeight - 10;
        }

        this.tooltipElement.style.left = `${left}px`;
        this.tooltipElement.style.top = `${top}px`;
        this.tooltipElement.classList.remove('hidden');

        // Log citation view
        citationAuditTrail.logCitationView(citationIndex, citation.pageNum);
    }

    /**
     * Hide tooltip
     */
    private hideTooltip(): void {
        if (this.tooltipElement) {
            this.tooltipElement.classList.add('hidden');
        }
    }

    /**
     * Refresh citation badges (call after new extractions)
     */
    refresh(): void {
        // Remove old badges
        document.querySelectorAll('.field-citation-badge').forEach(badge => badge.remove());
        document.querySelectorAll('.form-group.has-citation').forEach(group => {
            group.classList.remove('has-citation');
        });

        // Re-add badges
        this.addCitationBadgesToForms();
    }

    /**
     * Add citation tracking to a manual extraction
     * Called when user highlights text and extracts to a field
     */
    trackManualExtractionCitation(
        extraction: Extraction,
        selectedText: string,
        pageNum: number
    ): void {
        const state = AppStateManager.getState();
        
        // Find matching citations for the selected text
        const matchingIndices: number[] = [];
        
        if (state.textChunks) {
            state.textChunks.forEach(chunk => {
                // Check if selected text is contained in this chunk
                if (chunk.text.includes(selectedText) || selectedText.includes(chunk.text)) {
                    matchingIndices.push(chunk.index);
                }
            });
        }

        // Update extraction with citation indices
        if (matchingIndices.length > 0) {
            extraction.citationIndices = matchingIndices;
            extraction.citationCount = matchingIndices.length;

            // Log the extraction with citations
            citationAuditTrail.logExtraction(extraction);

            // Refresh UI
            this.refresh();
        }
    }
}

// Singleton instance
const citationUIEnhancer = new CitationUIEnhancerService();

export default citationUIEnhancer;

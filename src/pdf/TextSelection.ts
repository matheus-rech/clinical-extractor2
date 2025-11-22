/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TextSelection - Interactive text selection for PDF text layers
 *
 * This module enables:
 * - Mouse-based text selection from PDF text layers
 * - Visual highlighting of selected text
 * - Extraction creation with bounding box calculation
 * - Integration with form fields and validation
 * - Auto-advance to next field after extraction
 */

import AppStateManager from '../state/AppStateManager';
import StatusManager from '../utils/status';
import SecurityUtils from '../utils/security';
import ExtractionTracker from '../data/ExtractionTracker';
import {
    calculateBoundingBox,
    addExtractionMarker,
    autoAdvanceField
} from '../utils/helpers';
import type { Extraction } from '../types';

/**
 * PDFTextItem with complete position and dimension data
 */
export interface PDFTextItem {
    /** DOM span element containing the text */
    element: HTMLSpanElement;
    /** X coordinate in viewport space */
    x: number;
    /** Y coordinate in viewport space */
    y: number;
    /** Width in viewport space */
    width: number;
    /** Height in viewport space */
    height: number;
    /** Text content */
    text: string;
}

/**
 * Selection state for tracking mouse interactions
 */
interface SelectionState {
    /** Whether user is currently selecting text */
    isSelecting: boolean;
    /** First text item clicked */
    startItem: PDFTextItem | null;
    /** Array of currently selected items */
    selectedItems: PDFTextItem[];
}

/**
 * TextSelection - Main text selection handler
 */
export const TextSelection = {
    /**
     * Enables interactive text selection on a PDF text layer
     *
     * @param textLayer - The text layer DOM element
     * @param textItems - Array of text items with position data
     * @param pageNum - PDF page number
     *
     * Features:
     * - Click and drag to select text spans
     * - Visual highlighting during selection
     * - Automatic extraction creation on release
     * - Form field population with extracted text
     * - Bounding box calculation for coordinates
     * - Integration with validation and tracking
     *
     * Mouse Events:
     * - mousedown: Start selection
     * - mousemove: Extend selection
     * - mouseup: Finalize and create extraction
     * - mouseleave: Cancel selection if in progress
     */
    enable: (textLayer: HTMLElement, textItems: PDFTextItem[], pageNum: number) => {
        // Selection state
        const selectionState: SelectionState = {
            isSelecting: false,
            startItem: null,
            selectedItems: []
        };

        /**
         * Handle mouse down - Start selection
         */
        const handleMouseDown = (e: MouseEvent) => {
            const state = AppStateManager.getState();

            // Check if a form field is selected
            if (!state.activeField) {
                StatusManager.show('Please select a form field first', 'warning');
                return;
            }

            // Start selection
            selectionState.isSelecting = true;

            // Find the text item that was clicked
            selectionState.startItem = textItems.find(
                item => item.element === e.target
            ) || null;

            // Initialize selected items
            selectionState.selectedItems = selectionState.startItem
                ? [selectionState.startItem]
                : [];

            // Add visual feedback
            textLayer.classList.add('active-selection');

            // Clear previous highlights
            textLayer.querySelectorAll('.highlight').forEach(el => {
                el.classList.remove('highlight');
            });

            // Highlight start item
            if (selectionState.startItem) {
                selectionState.startItem.element.classList.add('highlight');
            }
        };

        /**
         * Handle mouse move - Extend selection
         */
        const handleMouseMove = (e: MouseEvent) => {
            const state = AppStateManager.getState();

            // Only process if we're actively selecting
            if (!selectionState.isSelecting || !state.activeField || !selectionState.startItem) {
                return;
            }

            // Find current item under mouse
            const currentItem = textItems.find(item => item.element === e.target);

            if (currentItem) {
                // Find indices of start and current items
                const startIndex = textItems.findIndex(
                    item => item.element === selectionState.startItem!.element
                );
                const endIndex = textItems.findIndex(
                    item => item.element === currentItem.element
                );

                // Validate indices
                if (startIndex === -1 || endIndex === -1) return;

                // Select all items between start and current
                selectionState.selectedItems = textItems.slice(
                    Math.min(startIndex, endIndex),
                    Math.max(startIndex, endIndex) + 1
                );

                // Update highlights efficiently
                textItems.forEach(item => {
                    const shouldHighlight = selectionState.selectedItems.some(
                        sel => sel.element === item.element
                    );
                    item.element.classList.toggle('highlight', shouldHighlight);
                });
            }
        };

        /**
         * Handle mouse up - Finalize selection and create extraction
         */
        const handleMouseUp = () => {
            const state = AppStateManager.getState();

            // Only process if we were selecting
            if (!selectionState.isSelecting || !state.activeField) {
                return;
            }

            // Stop selection
            selectionState.isSelecting = false;
            textLayer.classList.remove('active-selection');

            // Check if we have valid selected items
            if (selectionState.selectedItems.length > 0 &&
                selectionState.selectedItems.every(item => item)) {

                // Extract text from selected items
                const extractedText = selectionState.selectedItems
                    .map(item => item.text)
                    .join(' ')
                    .trim();

                // Sanitize the extracted text
                const sanitizedText = SecurityUtils.sanitizeText(extractedText);

                // Calculate bounding box from selected items
                const bounds = calculateBoundingBox(selectionState.selectedItems);

                // Create extraction record
                const extraction = ExtractionTracker.addExtraction({
                    fieldName: state.activeField,
                    text: sanitizedText,
                    page: pageNum,
                    coordinates: bounds,
                    method: 'manual',
                    documentName: state.documentName
                });

                // Update form field if extraction was successful
                if (extraction && state.activeFieldElement) {
                    const element = state.activeFieldElement as HTMLInputElement;

                    // Handle number fields specially
                    if (element.type === 'number') {
                        // Extract numeric value from text
                        const match = sanitizedText.match(/-?\d+(\.\d+)?/);
                        element.value = match ? match[0] : '';
                    } else {
                        // Plain text field
                        element.value = sanitizedText;
                    }

                    // Mark field as having extraction
                    element.classList.add('has-extraction');
                }

                // Update visual state of selected items
                selectionState.selectedItems.forEach(item => {
                    if (item && item.element) {
                        item.element.classList.remove('highlight');
                        item.element.classList.add('extracted');
                    }
                });

                // Handle extraction result
                if (extraction) {
                    // Add visual marker to PDF
                    addExtractionMarker(extraction);

                    // Show success message
                    StatusManager.show(
                        `Extracted to ${state.activeField}`,
                        'success'
                    );

                    // Auto-advance to next field
                    autoAdvanceField(state.activeFieldElement, state.currentStep);
                } else {
                    // Extraction failed validation
                    StatusManager.show(
                        `Extraction failed validation for ${state.activeField}`,
                        'error'
                    );
                }
            } else {
                // Invalid or empty selection - clear highlights
                textLayer.querySelectorAll('.highlight').forEach(el => {
                    el.classList.remove('highlight');
                });
            }

            // Reset selection state
            selectionState.startItem = null;
            selectionState.selectedItems = [];
        };

        /**
         * Handle mouse leave - Cancel selection if in progress
         */
        const handleMouseLeave = () => {
            if (selectionState.isSelecting) {
                // Cancel selection
                selectionState.isSelecting = false;
                textLayer.classList.remove('active-selection');

                // Clear highlights
                textLayer.querySelectorAll('.highlight').forEach(el => {
                    el.classList.remove('highlight');
                });

                // Reset state
                selectionState.startItem = null;
                selectionState.selectedItems = [];
            }
        };

        // Attach event listeners to text layer
        // Note: Using direct assignment for simple approach
        // For production, consider proper event listener management with MemoryManager
        textLayer.onmousedown = handleMouseDown as any;
        textLayer.onmousemove = handleMouseMove as any;
        textLayer.onmouseup = handleMouseUp as any;
        textLayer.onmouseleave = handleMouseLeave as any;
    }
};

export default TextSelection;

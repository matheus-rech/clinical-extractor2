/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Helper Functions - Utility functions for PDF extraction and UI management
 */

import type { Coordinates, Extraction, TextItem } from '../types';

/**
 * Calculates the bounding box from an array of text items
 * @param items - Array of text items with position and size data
 * @returns The bounding box coordinates and dimensions
 */
export function calculateBoundingBox(items: TextItem[]): Coordinates {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    items.forEach(item => {
        if (!item) return; // Skip if item is null/undefined

        const x = item.x ?? parseFloat(item.element?.dataset.x || '0');
        const y = item.y ?? parseFloat(item.element?.dataset.y || '0');
        const width = item.width ?? parseFloat(item.element?.dataset.width || '0');
        const height = item.height ?? parseFloat(item.element?.dataset.height || '0');

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });

    // Handle case with no valid items
    if (!isFinite(minX)) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.round(maxX - minX),
        height: Math.round(maxY - minY)
    };
}

/**
 * Converts a Blob to base64 string
 * @param blob - The blob to convert
 * @returns Promise resolving to base64 string (without data URL prefix)
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Adds a visual marker for an extraction on the PDF page
 * @param extraction - The extraction object containing coordinates and metadata
 */
export function addExtractionMarker(extraction: Extraction): void {
    const pageDiv = document.querySelector('.pdf-page');
    if (!pageDiv || !extraction || !extraction.coordinates) return;

    const marker = document.createElement('div');
    marker.className = 'extraction-marker';
    marker.dataset.extractionId = extraction.id;
    marker.dataset.field = extraction.fieldName;
    marker.dataset.method = extraction.method; // For styling

    marker.style.left = extraction.coordinates.x + 'px';
    marker.style.top = extraction.coordinates.y + 'px';
    marker.style.width = extraction.coordinates.width + 'px';
    marker.style.height = extraction.coordinates.height + 'px';

    pageDiv.appendChild(marker);
}

/**
 * Adds extraction markers for all extractions on a specific page
 * @param pageNum - The page number to add markers for
 * @param extractions - Array of all extractions
 */
export function addExtractionMarkersForPage(pageNum: number, extractions: Extraction[]): void {
    const pageDiv = document.querySelector('.pdf-page');
    if (!pageDiv) return;

    // Clear existing markers for the page first
    pageDiv.querySelectorAll('.extraction-marker').forEach(m => m.remove());

    // Add markers for extractions on this page
    extractions
        .filter(ext => ext.page === pageNum)
        .forEach(ext => addExtractionMarker(ext));
}

/**
 * Automatically advances focus to the next form field
 * @param currentFieldElement - The currently active field element
 * @param currentStep - The current step number (0-indexed)
 */
export function autoAdvanceField(
    currentFieldElement: HTMLElement | null,
    currentStep: number
): void {
    const currentStepElement = document.getElementById(`step-${currentStep + 1}`);
    if (!currentStepElement || !currentFieldElement) return;

    const inputs = Array.from(
        currentStepElement.querySelectorAll('.linked-input:not([disabled])')
    );
    const currentIndex = inputs.indexOf(currentFieldElement);

    if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLElement).focus();
    }
}

/**
 * Clears all search highlight markers from the PDF
 * @param searchMarkers - Array of marker elements to remove
 */
export function clearSearchMarkers(searchMarkers: HTMLElement[]): void {
    searchMarkers.forEach(marker => marker.remove());
    searchMarkers.length = 0; // Clear the array

    document.querySelectorAll('.search-highlight').forEach(el => {
        el.classList.remove('search-highlight');
    });
}

/**
 * Updates the enabled/disabled state of PDF navigation buttons
 * Disables prev button on first page, next button on last page
 * @param currentPage - Current page number (1-indexed)
 * @param totalPages - Total number of pages in the PDF
 */
export function updateNavigationButtonStates(currentPage: number, totalPages: number): void {
    const prevBtn = document.getElementById('pdf-prev-page') as HTMLButtonElement;
    const nextBtn = document.getElementById('pdf-next-page') as HTMLButtonElement;

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Global Window interface extensions for the Clinical Extractor application.
 * Consolidates all window-level type declarations to avoid conflicts.
 */

import type { TextItem, Coordinates, Extraction } from './index';

declare global {
  interface Window {
    /** PDF.js library object */
    pdfjsLib: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      getDocument: (options: any) => {
        promise: Promise<any>;
      };
    };
    /** Memory manager for cleanup */
    MemoryManager: {
      listeners: Array<{ el: Window | HTMLElement | Document; type: string; handler: EventListenerOrEventListenerObject }>;
      timeouts: number[];
      registerEventListener: (el: Window | HTMLElement | Document, type: string, handler: EventListenerOrEventListenerObject) => void;
      registerTimeout: (id: number) => void;
      cleanup: () => void;
    };
    /** Calculate bounding box from text items */
    calculateBoundingBox: (items: TextItem[]) => Coordinates;
    /** Add visual marker for an extraction */
    addExtractionMarker: (extraction: Extraction) => void;
    /** Add all extraction markers for a page */
    addExtractionMarkersForPage: (pageNum: number, extractions: Extraction[]) => void;
    /** Automatically advance to next field */
    autoAdvanceField: () => void;
    /** Clear all search markers from PDF */
    clearSearchMarkers: () => void;
    /** Add indication field */
    addIndication: () => void;
    /** Add intervention field */
    addIntervention: () => void;
    /** Add study arm field */
    addArm: () => void;
    /** Add mortality outcome field */
    addMortality: () => void;
    /** Add mRS outcome field */
    addMRS: () => void;
    /** Add complication field */
    addComplication: () => void;
    /** Add predictor field */
    addPredictor: () => void;
    /** Remove dynamic field element */
    removeElement: (btn: HTMLElement) => void;
    /** Update arm selector dropdowns */
    updateArmSelectors: () => void;
    /** Export data as JSON */
    exportJSON: () => void;
    /** Export data as CSV */
    exportCSV: () => void;
    /** Export audit log */
    exportAudit: () => void;
    /** Export annotated PDF */
    exportAnnotatedPDF: () => void;
    /** Toggle search interface visibility */
    toggleSearchInterface: () => void;
    /** Search for text in PDF */
    searchInPDF: () => Promise<void>;
    /** Generate PICO analysis with AI */
    generatePICO: () => Promise<void>;
    /** Generate summary with AI */
    generateSummary: () => Promise<void>;
    /** Validate field with AI */
    validateFieldWithAI: (fieldId: string) => Promise<void>;
    /** Find metadata with AI */
    findMetadata: () => Promise<void>;
    /** Extract tables with AI */
    handleExtractTables: () => Promise<void>;
    /** Analyze images with AI */
    handleImageAnalysis: () => Promise<void>;
    /** Perform deep analysis with AI */
    handleDeepAnalysis: () => Promise<void>;
    /** Extract figures from PDF using operator interception */
    extractFiguresFromPDF: () => Promise<void>;
    /** Extract tables from PDF using geometric detection */
    extractTablesFromPDF: () => Promise<void>;
    /** Toggle bounding box provenance visualization */
    toggleBoundingBoxes: () => Promise<void>;
    /** Toggle table region visualization */
    toggleTableRegions: () => Promise<void>;
    /** Run full multi-agent AI pipeline */
    runFullAIPipeline: () => Promise<void>;
    /** Clinical Extractor API object */
    ClinicalExtractor: any;
    /** Convert blob to base64 */
    blobToBase64: (blob: Blob) => Promise<string>;
    /** Backend proxy service for API requests */
    BackendProxyService: any;
    /** Trigger crash state save for testing */
    triggerCrashStateSave: () => void;
    /** Trigger manual recovery for testing */
    triggerManualRecovery: () => Promise<void>;
    /** Circuit breaker for fault tolerance */
    CircuitBreaker: any;
    /** Application configuration */
    CONFIG: any;
    /** Export data as Excel */
    exportExcel: () => void;
    /** Semantic search functionality */
    semanticSearch: (query: string) => Promise<void>;
    /** Clear search results */
    clearSearchResults: () => void;
    /** Navigate to next search result */
    nextSearchResult: () => void;
    /** Navigate to previous search result */
    previousSearchResult: () => void;
    /** Process PDF for citations */
    processPDFForCitations: () => Promise<void>;
    /** Extract citations from text */
    extractCitations: (text: string) => any[];
    /** Highlight citation in PDF */
    highlightCitation: (index: number) => void;
    /** Jump to citation location */
    jumpToCitation: (index: number) => void;
    /** Add annotation to PDF */
    addAnnotation: (type: string, color: string) => void;
    /** Remove annotation */
    removeAnnotation: (id: string) => void;
    /** Export annotations */
    exportAnnotations: () => void;
    /** Import annotations */
    importAnnotations: (data: string) => void;
    /** Clear all annotations */
    clearAnnotations: () => void;
    /** Upload PDF to backend */
    uploadPDFToBackend: () => Promise<void>;
    /** Sync with backend */
    syncWithBackend: () => Promise<void>;
    /** Check backend health */
    checkBackendHealth: () => Promise<boolean>;
  }
}

export {};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PDF Loading Module
 *
 * Handles PDF document loading using PDF.js library.
 * Provides centralized PDF loading functionality with:
 * - File to ArrayBuffer conversion
 * - PDF.js document loading with configuration
 * - State management integration
 * - DOM updates for UI elements
 * - Error handling and status updates
 *
 * @module PDFLoader
 */

import AppStateManager from '../state/AppStateManager';
import StatusManager from '../utils/status';
import SecurityUtils from '../utils/security';
import { PDFConfig } from '../config';
import PDFRenderer from './PDFRenderer';
import TextSelection from './TextSelection';
import CitationService from '../services/CitationService';
import TextStructureService from '../services/TextStructureService';

/**
 * PDF.js library types
 *
 * @remarks
 * PDF.js is loaded globally via CDN and attached to window.pdfjsLib.
 * Window interface is now in types/window.d.ts
 */

/**
 * PDF document loading task options
 */
interface PDFDocumentLoadingTask {
  /** PDF data as ArrayBuffer or Uint8Array */
  data: ArrayBuffer | Uint8Array;
  /** URL to character map files */
  cMapUrl?: string;
  /** Whether character maps are packed */
  cMapPacked?: boolean;
  /** Password for encrypted PDFs */
  password?: string;
}

/**
 * PDF document proxy returned by PDF.js
 */
interface PDFDocumentProxy {
  /** Total number of pages in the document */
  numPages: number;
  /** Get a specific page */
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  /** Clean up resources */
  destroy: () => Promise<void>;
}

/**
 * PDF page proxy for rendering and text extraction
 */
interface PDFPageProxy {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Get page viewport for rendering */
  getViewport: (params: { scale: number }) => PDFPageViewport;
  /** Render page to canvas */
  render: (params: PDFRenderParams) => PDFRenderTask;
  /** Get text content for extraction */
  getTextContent: () => Promise<PDFTextContent>;
}

/**
 * PDF page viewport for rendering calculations
 */
interface PDFPageViewport {
  width: number;
  height: number;
  scale: number;
}

/**
 * PDF render parameters
 */
interface PDFRenderParams {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFPageViewport;
}

/**
 * PDF render task
 */
interface PDFRenderTask {
  promise: Promise<void>;
}

/**
 * PDF text content structure
 */
interface PDFTextContent {
  items: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
  }>;
}

/**
 * PDFLoader Object
 *
 * Provides methods for loading PDF documents and managing PDF.js configuration.
 */
const PDFLoader = {
  /**
   * Load a PDF file and initialize the application state
   *
   * @param file - The PDF file to load
   * @returns Promise resolving to the loaded PDF document proxy
   *
   * @throws Error if PDF loading fails
   *
   * @remarks
   * This method:
   * 1. Sets processing state and shows loading indicator
   * 2. Converts file to ArrayBuffer
   * 3. Loads PDF using PDF.js with configuration
   * 4. Updates application state with document info
   * 5. Updates DOM elements (total pages, visibility)
   * 6. Shows success/error status
   * 7. Triggers first page render
   *
   * @example
   * ```typescript
   * const fileInput = document.querySelector('input[type="file"]');
   * fileInput.addEventListener('change', async (e) => {
   *   const file = e.target.files[0];
   *   try {
   *     const pdfDoc = await PDFLoader.loadPDF(file);
   *     console.log(`Loaded PDF with ${pdfDoc.numPages} pages`);
   *   } catch (error) {
   *     console.error('Failed to load PDF:', error);
   *   }
   * });
   * ```
   */
  loadPDF: async (file: File): Promise<PDFDocumentProxy> => {
    // Set processing state
    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);

    try {
      // Clean up previous PDF resources before loading new one
      try {
        PDFRenderer.cleanup();
      } catch (cleanupError) {
        console.error("PDFRenderer cleanup failed:", cleanupError);
        // Optionally, you could report this error to a status manager or telemetry here
      }

      // Convert file to ArrayBuffer for PDF.js
      const arrayBuffer = await file.arrayBuffer();
      
      // Also create base64 string for API uploads (needed for citations)
      const base64String = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });

      // Configure PDF.js worker (must be set before first getDocument call)
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded. Ensure pdf.js is included in your HTML.');
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFConfig.workerSrc;

      // Load PDF document with configuration
      const pdfDoc = await window.pdfjsLib.getDocument({
        data: arrayBuffer,
        ...PDFConfig.documentOptions
      }).promise;

      // Sanitize filename for security
      const sanitizedName = SecurityUtils.sanitizeText(file.name);

      // Update application state (including base64 data for citations)
      AppStateManager.setState({
        pdfDoc,
        totalPages: pdfDoc.numPages,
        documentName: sanitizedName,
        isProcessing: false,
        pdfTextCache: new Map(), // Clear cache on new load
        pdfBase64Data: base64String // Store base64 for citations
      });

      console.log('📖 Extracting text chunks for semantic search and citations...');
      StatusManager.show('Indexing document text...', 'info');
      
      try {
        const textChunks = await CitationService.extractAllTextChunks(pdfDoc);
        const citationMap = CitationService.buildCitationMap(textChunks);
        
        AppStateManager.setState({
          textChunks,
          citationMap
        });
        
        console.log(`✅ Indexed ${textChunks.length} text chunks for search and citations`);
        StatusManager.show(`Indexed ${textChunks.length} sentences for search & citations`, 'success', 3000);
        
        try {
          const structuredText = TextStructureService.build(textChunks);
          
          AppStateManager.setState({
            sections: structuredText.sections,
            paragraphs: structuredText.paragraphs,
            chunkIndexToParagraphId: structuredText.chunkIndexToParagraphId,
            paragraphIdToSectionId: structuredText.paragraphIdToSectionId
          });
          
          console.log(`📚 Built ${structuredText.sections.length} sections and ${structuredText.paragraphs.length} paragraphs`);
        } catch (error) {
          console.error('⚠️ Failed to build text structure:', error);
        }
      } catch (error) {
        console.error('⚠️ Failed to extract text chunks:', error);
        StatusManager.show('Warning: Text indexing failed, search may not work', 'warning', 5000);
      }

      // Update DOM elements
      const totalPagesElement = document.getElementById('total-pages');
      const uploadAreaElement = document.getElementById('upload-area');
      const pdfPagesElement = document.getElementById('pdf-pages');

      if (totalPagesElement) {
        totalPagesElement.textContent = pdfDoc.numPages.toString();
      }

      // Hide upload area after successful load
      if (uploadAreaElement) {
        uploadAreaElement.style.display = 'none';
      }

      // Show PDF viewer
      if (pdfPagesElement) {
        pdfPagesElement.style.display = 'block';
      }
      
      console.log('✓ PDF UI updated: upload hidden, viewer shown');

      // Show success status
      StatusManager.showLoading(false);
      StatusManager.show('PDF loaded successfully', 'success');

      // Render first page with text selection enabled
      await PDFRenderer.renderPage(1, TextSelection);

      return pdfDoc;

    } catch (error) {
      // Handle errors
      console.error('PDF Load Error:', error);

      StatusManager.showLoading(false);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error';

      StatusManager.show(
        `Failed to load PDF: ${errorMessage}`,
        'error'
      );

      AppStateManager.setState({ isProcessing: false });

      throw error;
    }
  }
};

/**
 * Export PDFLoader as default
 */
export default PDFLoader;

/**
 * Export TypeScript types for external use
 */
export type {
  PDFDocumentProxy,
  PDFPageProxy,
  PDFPageViewport,
  PDFRenderParams,
  PDFRenderTask,
  PDFTextContent
};

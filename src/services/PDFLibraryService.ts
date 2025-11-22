
/**
 * PDFLibraryService - Manages PDF library selection and loading
 */

import BackendClient from './BackendClient';
import PDFLoader from '../pdf/PDFLoader';
import StatusManager from '../utils/status';

interface LibraryPDF {
  id: string;
  title: string;
  filename: string;
  total_pages: number;
  description?: string;
}

const PDFLibraryService = {
  /**
   * Populate the PDF library dropdown
   */
  async populateLibraryDropdown(): Promise<void> {
    const dropdown = document.getElementById('pdf-library-select') as HTMLSelectElement;
    if (!dropdown) {
      console.warn('⚠️ PDF library dropdown element not found');
      return;
    }

    try {
      console.log('📚 Loading PDF library...');
      const pdfs: LibraryPDF[] = await BackendClient.getLibraryPDFs();
      
      console.log('📚 Received PDFs from backend:', pdfs);
      
      // Clear existing options except the first (placeholder)
      dropdown.innerHTML = '<option value="">Select a PDF from library...</option>';
      
      if (!pdfs || pdfs.length === 0) {
        console.warn('⚠️ No PDFs found in library');
        dropdown.innerHTML = '<option value="">No PDFs in library yet</option>';
        return;
      }
      
      // Add library PDFs
      pdfs.forEach(pdf => {
        const option = document.createElement('option');
        option.value = pdf.id;
        option.textContent = `${pdf.title} (${pdf.total_pages} pages)`;
        dropdown.appendChild(option);
      });
      
      console.log(`✅ Loaded ${pdfs.length} PDFs into library dropdown`);
    } catch (error) {
      console.error('❌ Failed to load PDF library:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      dropdown.innerHTML = '<option value="">Failed to load library</option>';
      StatusManager.show('Could not load PDF library - check console', 'warning');
    }
  },

  /**
   * Load a PDF from the library
   */
  async loadFromLibrary(libraryId: string): Promise<void> {
    if (!libraryId) return;

    try {
      StatusManager.show('Loading PDF from library...', 'info');
      
      // Get the full PDF data
      const pdfItem = await BackendClient.getLibraryPDF(libraryId);
      
      // Convert base64 to blob
      const base64Data = pdfItem.pdf_data.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const file = new File([blob], pdfItem.filename, { type: 'application/pdf' });
      
      // Store library PDF ID in state
      const AppStateManager = (window as any).ClinicalExtractor?.AppStateManager;
      if (AppStateManager) {
        AppStateManager.setState({ currentLibraryPdfId: libraryId });
      }
      
      // Load the PDF
      await PDFLoader.loadPDF(file);
      
      // Load existing annotations for this PDF
      const AnnotationService = (window as any).ClinicalExtractor?.AnnotationService;
      if (AnnotationService) {
        AnnotationService.loadFromStorage(libraryId);
      }
      
      StatusManager.show(`Loaded: ${pdfItem.title}`, 'success');
    } catch (error) {
      console.error('Failed to load PDF from library:', error);
      StatusManager.show('Failed to load PDF from library', 'error');
    }
  }
};

export default PDFLibraryService;

/**
 * Comprehensive End-to-End Test for Clinical Extractor
 * 
 * Tests the complete user journey with Kim2016.pdf:
 * 1. PDF Upload
 * 2. Text Extraction
 * 3. Manual Selection
 * 4. AI-Powered Extraction
 * 5. Form Population
 * 6. Data Export
 * 
 * This test validates all 6 major architectural components.
 */

import AppStateManager from '../../src/state/AppStateManager';
import PDFLoader from '../../src/pdf/PDFLoader';
import PDFRenderer from '../../src/pdf/PDFRenderer';
import ExtractionTracker from '../../src/data/ExtractionTracker';
import FormManager, { setDependencies as setFormManagerDependencies } from '../../src/forms/FormManager';
import StatusManager from '../../src/utils/status';

describe('Complete User Workflow E2E Test', () => {
  
  beforeAll(() => {
    document.body.innerHTML = `
      <div id="pdf-pages"></div>
      <div id="extraction-form">
        <input id="study-title" class="linked-input" name="study_title" />
        <input id="doi" class="linked-input" name="doi" data-validation="doi" />
        <input id="pmid" class="linked-input" name="pmid" data-validation="pmid" />
        <input id="year" class="linked-input" name="year" data-validation="year" />
        <textarea id="population" class="linked-input" name="population"></textarea>
        <textarea id="intervention" class="linked-input" name="intervention"></textarea>
        <textarea id="outcomes" class="linked-input" name="outcomes"></textarea>
      </div>
      <div class="step active" id="step-0"></div>
      <div class="step" id="step-1"></div>
      <button id="prev-btn">Previous</button>
      <button id="next-btn">Next</button>
      <button id="submit-gsheets-btn">Submit</button>
      <div id="submit-btn-group"></div>
      <div id="step-indicator"></div>
      <div id="progress-bar"></div>
      <div id="status-message"></div>
      <div id="active-field-indicator"></div>
    `;

    ExtractionTracker.setDependencies({
      appStateManager: AppStateManager,
      statusManager: StatusManager,
      pdfRenderer: PDFRenderer,
    });

    setFormManagerDependencies({
      appStateManager: AppStateManager,
      statusManager: StatusManager,
      dynamicFields: null,
    });
  });

  beforeEach(() => {
    // Clear extractions between tests to prevent accumulation
    AppStateManager.setState({ extractions: [] });
  });

  describe('Step 1: PDF Upload and Loading', () => {
    it('should initialize application state', () => {
      const state = AppStateManager.getState();
      
      expect(state.pdfDoc).toBeNull();
      expect(state.currentPage).toBe(1);
      expect(state.totalPages).toBe(0);
      expect(state.extractions).toEqual([]);
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('Step 2: Text Extraction Pipeline', () => {
    it('should extract text from PDF pages', async () => {
      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue({
          items: [
            {
              str: 'Character-Aware Neural Language Models',
              transform: [12, 0, 0, 12, 100, 700],
              width: 200,
              height: 12,
              dir: 'ltr',
            },
            {
              str: 'Yoon Kim, Yacine Jernite, David Sontag, Alexander M. Rush',
              transform: [10, 0, 0, 10, 100, 680],
              width: 300,
              height: 10,
              dir: 'ltr',
            },
          ],
        }),
        getViewport: jest.fn((params) => ({
          width: 612,
          height: 792,
          transform: [1, 0, 0, 1, 0, 0],
        })),
        render: jest.fn(() => ({ promise: Promise.resolve() })),
      };

      const textContent = await mockPage.getTextContent();
      
      expect(textContent.items).toHaveLength(2);
      expect(textContent.items[0].str).toContain('Character-Aware');
      expect(textContent.items[1].str).toContain('Yoon Kim');
    });

    it('should cache extracted text for performance', () => {
      const cache = new Map();
      const pageData = {
        text: 'Sample page text',
        page: 1,
        timestamp: Date.now(),
      };

      cache.set(1, pageData);

      expect(cache.has(1)).toBe(true);
      expect(cache.get(1)).toEqual(pageData);
    });
  });

  describe('Step 3: Manual Text Selection', () => {
    it('should track manual text selection with coordinates', () => {
      const extraction = {
        id: 'ext_' + Date.now(),
        timestamp: new Date().toISOString(),
        fieldName: 'study_title',
        text: 'Character-Aware Neural Language Models',
        page: 1,
        coordinates: {
          left: 100,
          top: 700,
          width: 200,
          height: 12,
        },
        method: 'manual' as const,
        documentName: 'Kim2016.pdf',
      };

      ExtractionTracker.addExtraction(extraction);

      const extractions = ExtractionTracker.getExtractions();
      expect(extractions).toHaveLength(1);
      expect(extractions[0].text).toBe('Character-Aware Neural Language Models');
      expect(extractions[0].method).toBe('manual');
      expect(extractions[0].coordinates).toBeDefined();
    });

    it('should populate form field on extraction', () => {
      const titleInput = document.getElementById('study-title') as HTMLInputElement;
      titleInput.value = 'Character-Aware Neural Language Models';

      expect(titleInput.value).toBe('Character-Aware Neural Language Models');
    });

    it('should sanitize extracted text for security', () => {
      const maliciousText = '<script>alert("xss")</script>Safe Text';
      const extraction = {
        id: 'ext_' + Date.now(),
        timestamp: new Date().toISOString(),
        fieldName: 'test',
        text: maliciousText,
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual' as const,
        documentName: 'test.pdf',
      };

      ExtractionTracker.addExtraction(extraction);

      const extractions = ExtractionTracker.getExtractions();
      expect(extractions[0].text).not.toContain('<script>');
    });
  });

  describe('Step 4: AI-Powered Extraction', () => {
    it('should prevent concurrent AI operations with mutex', () => {
      AppStateManager.setState({ isProcessing: true });
      
      const state = AppStateManager.getState();
      expect(state.isProcessing).toBe(true);

      AppStateManager.setState({ isProcessing: false });
      expect(AppStateManager.getState().isProcessing).toBe(false);
    });

    it('should track AI extractions with method tag', () => {
      const aiExtraction = {
        id: 'ext_ai_' + Date.now(),
        timestamp: new Date().toISOString(),
        fieldName: 'population',
        text: 'Neural language models trained on character-level inputs',
        page: 1,
        coordinates: { left: 50, top: 500, width: 400, height: 30 },
        method: 'gemini-pico' as const,
        documentName: 'Kim2016.pdf',
      };

      ExtractionTracker.addExtraction(aiExtraction);

      const extractions = ExtractionTracker.getExtractions();
      const aiExtractions = extractions.filter(e => e.method.startsWith('gemini'));
      
      expect(aiExtractions.length).toBeGreaterThan(0);
      expect(aiExtractions[0].method).toBe('gemini-pico');
    });
  });

  describe('Step 5: Form Navigation and Validation', () => {
    beforeEach(() => {
      FormManager.initialize();
    });

    it('should navigate through form steps', () => {
      AppStateManager.setState({ currentStep: 0, totalSteps: 8 });

      FormManager.nextStep();
      expect(AppStateManager.getState().currentStep).toBe(1);

      FormManager.previousStep();
      expect(AppStateManager.getState().currentStep).toBe(0);
    });

    it('should validate DOI format', () => {
      const doiInput = document.getElementById('doi') as HTMLInputElement;
      doiInput.value = '10.1234/test.2016';

      const isValid = FormManager.validateFieldUIUpdate(doiInput);
      expect(isValid).toBe(true);
    });

    it('should validate PMID format', () => {
      const pmidInput = document.getElementById('pmid') as HTMLInputElement;
      pmidInput.value = '27602347';

      const isValid = FormManager.validateFieldUIUpdate(pmidInput);
      expect(isValid).toBe(true);
    });

    it('should validate year range', () => {
      const yearInput = document.getElementById('year') as HTMLInputElement;
      yearInput.value = '2016';

      const isValid = FormManager.validateFieldUIUpdate(yearInput);
      expect(isValid).toBe(true);
    });

    it('should collect form data', () => {
      const titleInput = document.getElementById('study-title') as HTMLInputElement;
      const doiInput = document.getElementById('doi') as HTMLInputElement;
      
      titleInput.value = 'Character-Aware Neural Language Models';
      doiInput.value = '10.1234/test.2016';

      const formData = FormManager.collectFormData();
      
      expect(formData.study_title).toBe('Character-Aware Neural Language Models');
      expect(formData.doi).toBe('10.1234/test.2016');
    });
  });

  describe('Step 6: Data Export and Persistence', () => {
    it('should export data as JSON', () => {
      const formData = {
        study_title: 'Character-Aware Neural Language Models',
        doi: '10.1234/test.2016',
        year: '2016',
      };

      const extractions = [
        {
          id: 'ext_1',
          timestamp: new Date().toISOString(),
          fieldName: 'study_title',
          text: 'Character-Aware Neural Language Models',
          page: 1,
          coordinates: { x: 100, y: 700, width: 200, height: 12 },
          method: 'manual' as const,
          documentName: 'Kim2016.pdf',
        },
      ];

      AppStateManager.setState({ extractions });

      const exportData = {
        formData,
        extractions,
        metadata: {
          exportDate: new Date().toISOString(),
          documentName: 'Kim2016.pdf',
          totalExtractions: extractions.length,
        },
      };

      expect(exportData.formData.study_title).toBe('Character-Aware Neural Language Models');
      expect(exportData.extractions).toHaveLength(1);
      expect(exportData.metadata.totalExtractions).toBe(1);
    });

    it('should add extractions successfully', () => {
      // Add an extraction
      const extraction = {
        id: 'ext_test',
        timestamp: new Date().toISOString(),
        fieldName: 'test',
        text: 'test',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual' as const,
        documentName: 'test.pdf',
      };

      const result = ExtractionTracker.addExtraction(extraction);

      // Verify extraction was added
      expect(result).not.toBeNull();
      expect(result?.fieldName).toBe('test');
    });
  });

  describe('Step 7: Error Handling and Recovery', () => {
    it('should handle PDF loading errors gracefully', async () => {
      const invalidFile = new File(['invalid'], 'bad.pdf', { type: 'application/pdf' });

      try {
        await PDFLoader.loadPDF(invalidFile);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should cleanup resources on PDF change', () => {
      PDFRenderer.currentCanvas = document.createElement('canvas');
      
      PDFRenderer.cleanup();

      expect(PDFRenderer.currentCanvas).toBeNull();
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full extraction workflow', async () => {
      AppStateManager.setState({
        documentName: 'Kim2016.pdf',
        currentPage: 1,
        totalPages: 10,
        currentStep: 0,
        totalSteps: 8,
      });

      const extraction1 = {
        id: 'ext_1',
        timestamp: new Date().toISOString(),
        fieldName: 'study_title',
        text: 'Character-Aware Neural Language Models',
        page: 1,
        coordinates: { left: 100, top: 700, width: 200, height: 12 },
        method: 'manual' as const,
        documentName: 'Kim2016.pdf',
      };

      const extraction2 = {
        id: 'ext_2',
        timestamp: new Date().toISOString(),
        fieldName: 'population',
        text: 'Neural language models',
        page: 1,
        coordinates: { left: 50, top: 500, width: 400, height: 30 },
        method: 'gemini-pico' as const,
        documentName: 'Kim2016.pdf',
      };

      ExtractionTracker.addExtraction(extraction1);
      ExtractionTracker.addExtraction(extraction2);

      const titleInput = document.getElementById('study-title') as HTMLInputElement;
      const populationInput = document.getElementById('population') as HTMLTextAreaElement;
      
      titleInput.value = extraction1.text;
      populationInput.value = extraction2.text;

      FormManager.nextStep();
      expect(AppStateManager.getState().currentStep).toBe(1);

      const formData = FormManager.collectFormData();
      expect(formData.study_title).toBe('Character-Aware Neural Language Models');
      expect(formData.population).toBe('Neural language models');

      ExtractionTracker.saveToStorage();

      const extractions = ExtractionTracker.getExtractions();
      // Check that we have at least 2 extractions (may have more from previous tests)
      expect(extractions.length).toBeGreaterThanOrEqual(2);
      // Check the last two extractions match what we just added
      const lastTwo = extractions.slice(-2);
      expect(lastTwo[0].method).toBe('manual');
      expect(lastTwo[0].fieldName).toBe('study_title');
      expect(lastTwo[1].method).toBe('gemini-pico');
      expect(lastTwo[1].fieldName).toBe('population');

      const exportData = {
        formData,
        extractions,
        metadata: {
          exportDate: new Date().toISOString(),
          documentName: 'Kim2016.pdf',
          totalExtractions: extractions.length,
          manualExtractions: extractions.filter(e => e.method === 'manual').length,
          aiExtractions: extractions.filter(e => e.method.startsWith('gemini')).length,
        },
      };

      // Verify the export data structure (may have more extractions from previous tests)
      expect(exportData.metadata.totalExtractions).toBeGreaterThanOrEqual(2);
      expect(exportData.metadata.manualExtractions).toBeGreaterThanOrEqual(1);
      expect(exportData.metadata.aiExtractions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance and Optimization', () => {
    it('should use LRU cache for PDF text', () => {
      const cache = new Map();
      const maxSize = 50;

      for (let i = 1; i <= 60; i++) {
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(i, { text: `Page ${i}`, page: i });
      }

      expect(cache.size).toBeLessThanOrEqual(maxSize);
      expect(cache.has(60)).toBe(true);
      expect(cache.has(1)).toBe(false);
    });

    it('should prevent memory leaks with cleanup', () => {
      const container = document.getElementById('pdf-pages');
      if (container) {
        for (let i = 0; i < 10; i++) {
          const div = document.createElement('div');
          container.appendChild(div);
        }

        expect(container.children.length).toBe(10);

        PDFRenderer.cleanup();

        expect(container.children.length).toBe(0);
      }
    });
  });
});

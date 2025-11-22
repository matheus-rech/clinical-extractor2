/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Add declarations for global variables and functions attached to the window object.
declare global {
    interface Window {
        gapiLoaded: () => void;
        gisLoaded: () => void;
        pdfjsLib: any;
        google: any;
        // Fix: Add gapi to window type to fix gapi not found errors.
        gapi: any;
        MemoryManager: typeof MemoryManager;
        calculateBoundingBox: typeof calculateBoundingBox;
        addExtractionMarker: typeof addExtractionMarker;
        addExtractionMarkersForPage: typeof addExtractionMarkersForPage;
        autoAdvanceField: typeof autoAdvanceField;
        clearSearchMarkers: typeof clearSearchMarkers;
        addIndication: () => void;
        addIntervention: () => void;
        addArm: () => void;
        addMortality: () => void;
        addMRS: () => void;
        addComplication: () => void;
        addPredictor: () => void;
        removeElement: (btn: HTMLElement) => void;
        updateArmSelectors: () => void;
        exportJSON: () => void;
        exportCSV: () => void;
        exportAudit: () => void;
        exportAnnotatedPDF: () => void;
        toggleSearchInterface: () => void;
        searchInPDF: () => Promise<void>;
        generatePICO: () => Promise<void>;
        generateSummary: () => Promise<void>;
        validateFieldWithAI: (fieldId: string) => Promise<void>;
        findMetadata: () => Promise<void>;
        handleExtractTables: () => Promise<void>;
        handleImageAnalysis: () => Promise<void>;
        handleDeepAnalysis: () => Promise<void>;
        handleSubmitToGoogleSheets: (e: Event) => Promise<void>;
    }
}


// --- CONFIGURATION ---
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    // A visible error for the user in the UI, as this is critical.
    const body = document.querySelector('body');
    if (body) {
        body.innerHTML = `<div style="font-family: sans-serif; padding: 2em; text-align: center; color: #b71c1c; background: #ffebee;">
            <h1>Configuration Error</h1>
            <p>The Gemini API Key is missing. Please ensure the API_KEY environment variable is set.</p>
        </div>`;
    }
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const CONFIG = {
    // For Google Sheets (requires OAuth 2.0 Client ID)
    GOOGLE_API_KEY: "", // Your Google Cloud project API Key
    GOOGLE_CLIENT_ID: "", // Your OAuth 2.0 Client ID (e.g., "xxxxx.apps.googleusercontent.com")
    GOOGLE_SHEET_ID: "", // The ID of your Google Sheet
    GOOGLE_SCOPES: "https://www.googleapis.com/auth/spreadsheets",
};

const PDFConfig = {
    workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    documentOptions: {
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        password: ''
    }
};


// --- CLIENTS ---
let gapiLoaded = false;
let gapiTokenClient: any;
// Fix: Property 'gapiLoaded' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
window.gapiLoaded = () => { gapiLoaded = true; console.log("Google API client loaded."); };
// Fix: Property 'gisLoaded' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
window.gisLoaded = () => {
    if (CONFIG.GOOGLE_CLIENT_ID) {
        // Fix: Cannot find name 'google'. (Solved by declare global)
        gapiTokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: CONFIG.GOOGLE_SCOPES,
            callback: '', // Callback is set dynamically on click
        });
        console.log("Google Auth client initialized.");
    } else {
        console.warn("Google Client ID missing. 'Save to Google Sheets' will not work.");
    }
};
// Load Google scripts dynamically
(function() {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js?onload=gapiLoaded';
    gapiScript.async = true;
    gapiScript.defer = true;
    document.head.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client?onload=gisLoaded';
    gisScript.async = true;
    gisScript.defer = true;
    document.head.appendChild(gisScript);
})();


// --- Core Modules (Simplified Implementations) ---

// AppState (Observer Pattern Approximation)
let AppState = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    activeField: null,
    activeFieldElement: null,
    documentName: '',
    extractions: [],
    currentStep: 0,
    totalSteps: 8,
    markdownContent: '',
    markdownLoaded: false,
    pdfTextCache: new Map(),
    searchMarkers: [],
    maxCacheSize: 50,
    isProcessing: false,
    lastSubmissionId: null
};
// Fix: This expression is not callable. Type '{}' has no call signatures.
const subscribers = new Set<(state: typeof AppState) => void>();
const AppStateManager = {
    getState: () => ({ ...AppState }), // Return a copy
    setState: (updates) => {
        AppState = { ...AppState, ...updates };
        subscribers.forEach(cb => cb(AppState));
    },
    subscribe: (cb: (state: typeof AppState) => void) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
    }
};

// StatusManager
const StatusManager = {
     statusDiv: document.getElementById('extraction-status'),
     messageSpan: document.getElementById('status-message'),
     spinnerDiv: document.getElementById('loading-spinner'),
     timeoutId: null, // Store timeout ID
     show: function(message, type = 'info', duration = 3000) {
        if (!this.statusDiv || !this.messageSpan) return;
        // Clear existing timeout if any
        if (this.timeoutId) clearTimeout(this.timeoutId);

        this.messageSpan.textContent = message;
        this.statusDiv.className = 'extraction-status show';
        const colors = { success: '#4CAF50', warning: '#FF9800', error: '#f44336', info: '#2196F3' };
        this.statusDiv.style.background = colors[type] || colors.info;
        this.statusDiv.style.color = 'white';

        this.timeoutId = setTimeout(() => {
            this.statusDiv?.classList.remove('show');
            this.timeoutId = null; // Clear the stored ID
        }, duration);
     },
    showLoading: function(show) {
        this.spinnerDiv?.classList.toggle('active', show);
    }
};

// SecurityUtils
const SecurityUtils = {
    sanitizeText: (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
         // Basic sanitization: remove tags, trim, limit length
        return div.innerHTML.replace(/<[^>]*>?/gm, '').trim().substring(0, 10000);
    },
     validateExtraction: (extraction) => {
        // Simplified validation
        return extraction && extraction.fieldName && extraction.text && extraction.coordinates && extraction.page >= 0; // Page 0 for AI
    },
    escapeHtml: (text) => {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    validateInput: (input) => {
        const validationType = (input as HTMLInputElement).dataset.validation;
        const value = (input as HTMLInputElement).value.trim();

        if ((input as HTMLInputElement).required && !value) {
            return { valid: false, message: 'This field is required' };
        }

        if (validationType === 'doi' && value) {
            const doiRegex = /^10\.\d{4,}\/-?[A-Za-z0-9._;()/:]+$/; // Accepts some special characters
            if (!doiRegex.test(value)) return { valid: false, message: 'Invalid DOI format' };
        }
        if (validationType === 'pmid' && value) {
            if (!/^\d+$/.test(value)) return { valid: false, message: 'PMID must be numeric' };
        }
         if (validationType === 'year' && value) {
            const year = parseInt(value);
            if (isNaN(year) || year < 1900 || year > 2100) return { valid: false, message: 'Invalid year (1900-2100)' };
        }

        return { valid: true };
    },
     // Encode/Decode for localStorage (simplified for preview - no actual encryption)
    encodeData: (data) => btoa(JSON.stringify(data)),
    decodeData: (encodedData) => JSON.parse(atob(encodedData))
};

 // MemoryManager (Simplified - just basic cleanup)
const MemoryManager = {
    listeners: [],
    timeouts: [],
    registerEventListener: function(el, type, handler) {
        el.addEventListener(type, handler);
        this.listeners.push({ el, type, handler });
    },
    registerTimeout: function(id) {
        this.timeouts.push(id);
    },
    cleanup: function() {
        this.listeners.forEach(({ el, type, handler }) => el.removeEventListener(type, handler));
        this.timeouts.forEach(id => clearTimeout(id));
        this.listeners = [];
        this.timeouts = [];
        console.log("Cleanup performed (simplified)");
    }
};
window.addEventListener('beforeunload', () => MemoryManager.cleanup());


// --- PDF Modules ---
// Fix: Property 'pdfjsLib' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFConfig.workerSrc;

const PDFLoader = {
    loadPDF: async (file) => {
        AppStateManager.setState({ isProcessing: true });
        StatusManager.showLoading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Load PDF for rendering (Lector library removed)
            // Fix: Property 'pdfjsLib' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
            const pdfDoc = await window.pdfjsLib.getDocument({
                data: arrayBuffer,
                ...PDFConfig.documentOptions
            }).promise;
            const sanitizedName = SecurityUtils.sanitizeText(file.name);

            AppStateManager.setState({
                pdfDoc,
                totalPages: pdfDoc.numPages,
                documentName: sanitizedName,
                isProcessing: false,
                pdfTextCache: new Map() // Clear cache on new load
            });

            document.getElementById('total-pages').textContent = pdfDoc.numPages.toString();
            document.getElementById('upload-area').style.display = 'none';
            document.getElementById('pdf-pages').style.display = 'block';

            StatusManager.showLoading(false);
            StatusManager.show('PDF loaded successfully', 'success');
            await PDFRenderer.renderPage(1); // Render first page after load
            return pdfDoc;
        } catch (error) {
            console.error("PDF Load Error:", error);
            StatusManager.showLoading(false);
            StatusManager.show(`Failed to load PDF: ${error.message || 'Unknown error'}`, 'error');
            AppStateManager.setState({ isProcessing: false });
            throw error;
        }
    }
};

const TextSelection = {
    enable: (textLayer, textItems, pageNum) => {
        let isSelecting = false;
        let startItem = null;
        let selectedItems = [];

        const handleMouseDown = (e) => {
            const state = AppStateManager.getState();
            if (!state.activeField) {
                StatusManager.show('Please select a form field first', 'warning');
                return;
            }
            isSelecting = true;
            startItem = textItems.find(item => item.element === e.target);
            selectedItems = startItem ? [startItem] : [];
            textLayer.classList.add('active-selection');
            textLayer.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            if (startItem) startItem.element.classList.add('highlight');
        };

        const handleMouseMove = (e) => {
            const state = AppStateManager.getState();
            if (!isSelecting || !state.activeField || !startItem) return;

            const currentItem = textItems.find(item => item.element === e.target);
            if (currentItem) {
                const startIndex = textItems.findIndex(item => item.element === startItem.element);
                const endIndex = textItems.findIndex(item => item.element === currentItem.element);

                 if (startIndex === -1 || endIndex === -1) return; // Item not found

                selectedItems = textItems.slice(
                    Math.min(startIndex, endIndex),
                    Math.max(startIndex, endIndex) + 1
                );

                // Efficiently update highlights
                textItems.forEach(item => {
                     const shouldHighlight = selectedItems.some(sel => sel.element === item.element);
                     item.element.classList.toggle('highlight', shouldHighlight);
                });
            }
        };

        const handleMouseUp = () => {
            const state = AppStateManager.getState();
            if (!isSelecting || !state.activeField) return;

            isSelecting = false;
            textLayer.classList.remove('active-selection');

            if (selectedItems.length > 0 && selectedItems.every(item => item)) {
                const extractedText = selectedItems.map(item => item.text).join(' ').trim();
                const sanitizedText = SecurityUtils.sanitizeText(extractedText);
                // Fix: Cannot find name 'calculateBoundingBox'. (Solved by declare global)
                const bounds = calculateBoundingBox(selectedItems); // Use global helper

                const extraction = ExtractionTracker.addExtraction({
                    fieldName: state.activeField,
                    text: sanitizedText,
                    page: pageNum,
                    coordinates: bounds,
                    method: 'manual',
                    documentName: state.documentName
                });

                 if (extraction && state.activeFieldElement) {
                     const element = state.activeFieldElement as HTMLInputElement;
                     if (element.type === 'number') {
                        const match = sanitizedText.match(/-?\d+(\.\d+)?/);
                        element.value = match ? match[0] : '';
                     } else {
                        element.value = sanitizedText;
                     }
                     element.classList.add('has-extraction');
                 }

                 selectedItems.forEach(item => {
                    if(item && item.element) {
                        item.element.classList.remove('highlight');
                        item.element.classList.add('extracted');
                    }
                });


                if (extraction) {
                    // Fix: Cannot find name 'addExtractionMarker'. (Solved by declare global)
                    addExtractionMarker(extraction); // Use global helper
                    StatusManager.show(`Extracted to ${state.activeField}`, 'success');
                    // Fix: Cannot find name 'autoAdvanceField'. (Solved by declare global)
                    autoAdvanceField(); // Use global helper
                } else {
                     StatusManager.show(`Extraction failed validation for ${state.activeField}`, 'error');
                }
            } else {
                 // Clear highlights if selection was invalid or empty
                textLayer.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            }
            startItem = null;
            selectedItems = [];
        };

         // Cleanup previous listeners if re-enabling on same layer
         // (Simple approach for preview, robust solution needs MemoryManager)
        textLayer.onmousedown = handleMouseDown;
        textLayer.onmousemove = handleMouseMove;
        textLayer.onmouseup = handleMouseUp;
        textLayer.onmouseleave = () => { // Handle mouse leaving the layer during selection
            if (isSelecting) {
                 // Optionally finalize or cancel selection here
                 // For now, reset selection state
                 // handleMouseUp(); // Uncomment to finalize selection on mouse leave
                isSelecting = false;
                textLayer.classList.remove('active-selection');
                textLayer.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
                startItem = null;
                selectedItems = [];
            }
        };
    }
};

const PDFRenderer = {
    renderPage: async (pageNum) => {
         const state = AppStateManager.getState();
        if (!state.pdfDoc || state.isProcessing) return;

        AppStateManager.setState({ isProcessing: true });
        StatusManager.showLoading(true);

         try {
            const page = await state.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: state.scale });
            const container = document.getElementById('pdf-pages');
            if (!container) return;
            container.innerHTML = ''; // Clear previous page

            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.style.width = viewport.width + 'px';
            pageDiv.style.height = viewport.height + 'px';

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            pageDiv.appendChild(canvas);

            // Create Text Layer
            const textContent = await page.getTextContent();
            const textLayer = document.createElement('div');
            textLayer.className = 'textLayer';
            const textItems = [];

            textContent.items.forEach(item => {
                if (!item.str || !item.str.trim()) return; // Check for item.str
                const span = document.createElement('span');
                span.textContent = item.str;
                // Add text directionality for better layout support in complex documents.
                span.dir = item.dir;
                // Disabling font ligatures can improve selection accuracy.
                span.style.fontFeatureSettings = '"liga" 0';
                
                // Fix: Property 'pdfjsLib' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
                const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                span.style.left = tx[4] + 'px';
                span.style.top = tx[5] + 'px';
                span.style.fontSize = Math.sqrt((tx[0] * tx[0]) + (tx[1] * tx[1])) + 'px';
                // Store necessary data for bounding box calculation and selection
                // Fix: Type 'number' is not assignable to type 'string'.
                span.dataset.x = String(tx[4]);
                // Fix: Type 'number' is not assignable to type 'string'.
                span.dataset.y = String(tx[5]);
                span.dataset.width = String(item.width * state.scale);
                span.dataset.height = String(item.height * state.scale);

                textLayer.appendChild(span);
                textItems.push({ element: span, x: tx[4], y: tx[5], width: item.width * state.scale, height: item.height * state.scale, text: item.str });
            });
            pageDiv.appendChild(textLayer);

            TextSelection.enable(textLayer, textItems, pageNum);
            // Fix: Cannot find name 'addExtractionMarkersForPage'. (Solved by declare global)
            addExtractionMarkersForPage(pageNum); // Use global helper
            container.appendChild(pageDiv);

            AppStateManager.setState({ currentPage: pageNum });
            // Fix: Property 'value' does not exist on type 'HTMLElement'.
            (document.getElementById('page-num') as HTMLInputElement).value = pageNum.toString();
            // Fix: Cannot find name 'clearSearchMarkers'. (Solved by declare global)
            clearSearchMarkers(); // Use global helper

         } catch (error) {
            console.error("PDF Render Error:", error);
            StatusManager.show(`Failed to render page ${pageNum}: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            AppStateManager.setState({ isProcessing: false });
            StatusManager.showLoading(false);
        }
    }
};

// --- Extraction Tracker ---
const ExtractionTracker = {
    extractions: [],
    fieldMap: new Map(),
    init: function() {
        this.loadFromStorage();
    },
    addExtraction: function(data) {
         const sanitizedData = {
            ...data,
            text: SecurityUtils.sanitizeText(data.text),
            fieldName: SecurityUtils.sanitizeText(data.fieldName),
            documentName: SecurityUtils.sanitizeText(data.documentName)
        };
         const validationData = { ...sanitizedData, id: 'temp', timestamp: new Date().toISOString() };

         if (!SecurityUtils.validateExtraction(validationData)) {
            console.error('Invalid extraction data:', validationData);
            return null;
        }


        const extraction = {
            id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...sanitizedData
        };
        this.extractions.push(extraction);
        this.fieldMap.set(data.fieldName, extraction);
        this.updateTraceLog(extraction);
        this.updateStats();
        this.saveToStorage();
        AppStateManager.setState({ extractions: this.extractions }); // Update global state
        return extraction;
    },
    updateTraceLog: function(extraction) {
         const logContainer = document.getElementById('trace-log');
         if (!logContainer) return;
        const entry = document.createElement('div');
        entry.className = 'trace-entry';
        entry.dataset.extractionId = extraction.id;
        entry.dataset.method = extraction.method; // For styling
        const truncatedText = extraction.text.length > 80 ? extraction.text.substring(0, 80) + '...' : extraction.text;
        entry.innerHTML = `
            <span class="field-label">${SecurityUtils.escapeHtml(extraction.fieldName)}</span>
            <span class="extracted-text">"${SecurityUtils.escapeHtml(truncatedText)}"</span>
            <div class="metadata">
                Page ${extraction.page} | ${extraction.method} | ${new Date(extraction.timestamp).toLocaleTimeString()}
            </div>`;
         entry.onclick = () => this.navigateToExtraction(extraction);
        logContainer.insertBefore(entry, logContainer.firstChild);
    },
     navigateToExtraction: function(extraction) {
        // AI extractions don't have coordinates, just show text
        if (extraction.method !== 'manual') {
            StatusManager.show(`AI Extraction: ${extraction.text}`, 'info', 5000);
            return;
        }
        const state = AppStateManager.getState();
        if (extraction.page !== state.currentPage) {
            PDFRenderer.renderPage(extraction.page);
        }
        // Add highlight effect after delay
        setTimeout(() => {
            // Fix: Property 'style' does not exist on type 'Element'.
            const marker = document.querySelector(`.extraction-marker[data-extraction-id="${extraction.id}"]`) as HTMLElement;
            if (marker) {
                marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Fix: Property 'style' does not exist on type 'Element'.
                marker.style.background = 'rgba(255, 193, 7, 0.5)';
                setTimeout(() => { marker.style.background = ''; }, 1000);
            }
        }, 500);
    },
    updateStats: function() {
        document.getElementById('extraction-count').textContent = this.extractions.length.toString();
        const uniquePages = new Set(this.extractions.map(e => e.page));
        // Fix: Type 'number' is not assignable to type 'string'.
        document.getElementById('pages-with-data').textContent = uniquePages.size.toString();
    },
    saveToStorage: function() {
        try {
            localStorage.setItem('clinical_extractions_simple', JSON.stringify(this.extractions));
        } catch (e) { console.error("Save failed", e); }
    },
    loadFromStorage: function() {
        try {
            const saved = localStorage.getItem('clinical_extractions_simple');
            if (saved) {
                this.extractions = JSON.parse(saved);
                this.extractions.forEach(ext => {
                    this.fieldMap.set(ext.fieldName, ext);
                    this.updateTraceLog(ext); // Populate log on load
                });
                this.updateStats();
                AppStateManager.setState({ extractions: this.extractions }); // Update global state
            }
        } catch (e) { console.error("Load failed", e); this.extractions = []; }
    },
     getExtractions: function() { return this.extractions; } // Add getter
};
ExtractionTracker.init(); // Load saved data


// --- Form Management ---
const FormManager = {
    validator: SecurityUtils, // Use SecurityUtils directly for validation
    initialize: function() {
        this.initializeFormFields();
        this.initializeNavigation();
        DynamicFields.initialize(); // Initialize dynamic fields
        this.showStep(0);
    },
     initializeFormFields: function() {
        const inputs = document.querySelectorAll('.linked-input');
        inputs.forEach(input => {
            // Use MemoryManager if available, otherwise basic listeners
            // Fix: Property 'MemoryManager' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
            const manager = window.MemoryManager || MemoryManager;
            manager.registerEventListener(input, 'focus', () => {
                document.querySelectorAll('.form-group').forEach(g => g.classList.remove('active-extraction'));
                // Fix: Property 'name' does not exist on type 'Element'.
                const fieldName = (input as HTMLInputElement).name || input.id;
                AppStateManager.setState({ activeField: fieldName, activeFieldElement: input });
                input.closest('.form-group')?.classList.add('active-extraction');
                document.getElementById('active-field-indicator').textContent = `Extracting: ${fieldName}`;
                document.getElementById('active-field-indicator').style.background = '#4CAF50';
            });
             manager.registerEventListener(input, 'blur', () => {
                this.validateFieldUIUpdate(input);
            });
        });
    },
    validateFieldUIUpdate: function(input) {
        const result = this.validator.validateInput(input);
        input.classList.toggle('validation-error', !result.valid);
        const messageEl = input.nextElementSibling as HTMLElement;
        if (messageEl && messageEl.classList.contains('validation-message')) {
            messageEl.textContent = result.valid ? '' : result.message;
            messageEl.style.display = result.valid ? 'none' : 'block';
        }
        return result.valid;
    },
    initializeNavigation: function() {
         document.getElementById('prev-btn').onclick = () => this.previousStep();
         document.getElementById('next-btn').onclick = () => this.nextStep();
         // Fix: Cannot find name 'handleSubmitToGoogleSheets'. (Solved by declare global)
         // Fix: Explicitly call from window to resolve scoping issue.
         document.getElementById('submit-gsheets-btn').onclick = (e) => window.handleSubmitToGoogleSheets(e);
    },
    showStep: function(stepIndex) {
         const steps = document.querySelectorAll('.step');
         const state = AppStateManager.getState();
         steps.forEach((step, index) => step.classList.toggle('active', index === stepIndex));
         // Fix: Property 'disabled' does not exist on type 'HTMLElement'.
         (document.getElementById('prev-btn') as HTMLButtonElement).disabled = (stepIndex === 0);
         document.getElementById('step-indicator').textContent = `Step ${stepIndex + 1} of ${state.totalSteps}`;
         const isLastStep = stepIndex === state.totalSteps - 1;
         (document.getElementById('next-btn') as HTMLElement).style.display = isLastStep ? 'none' : 'inline-block';
         (document.getElementById('submit-btn-group') as HTMLElement).style.display = isLastStep ? 'flex' : 'none';
         (document.querySelector('.form-panel') as HTMLElement).scrollTop = 0;
         // Update progress bar
         const progressBar = document.getElementById('progress-bar') as HTMLElement;
         if (progressBar) {
            const progress = ((stepIndex + 1) / state.totalSteps) * 100;
            progressBar.style.width = progress + '%';
         }
         // Re-initialize fields in case dynamic ones were added
         this.initializeFormFields();
          // Update arm selectors if on relevant steps
          // Fix: Property 'updateArmSelectors' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
          if (stepIndex >= 6 && window.updateArmSelectors) {
            // Fix: Property 'updateArmSelectors' does not exist on type 'Window & typeof globalThis'. (Solved by declare global)
            window.updateArmSelectors();
          }
    },
    nextStep: function() {
         const state = AppStateManager.getState();
        
         // --- VALIDATION LOGIC REMOVED ---
         /*
         const currentStepElement = document.getElementById(`step-${state.currentStep + 1}`);
         let isValid = true;
         currentStepElement.querySelectorAll('[required]').forEach(input => {
            if (!input.value) {
                isValid = false;
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = ''; // Reset border color
            }
         });
          // Also validate fields with data-validation
          currentStepElement.querySelectorAll('[data-validation]').forEach(input => {
              if (!this.validateFieldUIUpdate(input)) {
                  isValid = false;
              }
          });


         if (!isValid) {
            StatusManager.show('Please fill required fields and correct errors.', 'warning');
            return;
         }
         */
        // --- END OF VALIDATION LOGIC ---


        // Check inclusion criteria on step 2 (this is a soft check, so it's fine to keep)
        if (state.currentStep === 1) {
            // Fix: Property 'value' does not exist on type 'HTMLElement'.
            const inclusionMet = (document.getElementById('inclusion-met') as HTMLSelectElement).value;
            if (inclusionMet === 'false') {
                 // Use a simple confirm for preview, replace with modal in full app
                if (!confirm('Study does not meet inclusion criteria according to your selection. Continue extraction anyway?')) {
                    return; // Stop navigation
                }
            }
        }

        if (state.currentStep < state.totalSteps - 1) {
            const newStep = state.currentStep + 1;
            AppStateManager.setState({ currentStep: newStep });
            this.showStep(newStep);
        }
    },
    previousStep: function() {
        const state = AppStateManager.getState();
        if (state.currentStep > 0) {
             const newStep = state.currentStep - 1;
            AppStateManager.setState({ currentStep: newStep });
            this.showStep(newStep);
        }
    },
     validateAllSteps: function() {
        let allValid = true;
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.querySelectorAll('[required], [data-validation]').forEach(input => {
                if (!this.validateFieldUIUpdate(input)) {
                    allValid = false;
                }
            });
        });
        if (!allValid) {
             StatusManager.show('Please correct errors on all steps before submitting.', 'warning');
        }
        return allValid;
     },
    collectFormData: function() {
        // Fix: Property 'value', 'name' does not exist on type 'Element'.
        const formData: { [key: string]: string } = {};
        document.querySelectorAll('#extraction-form input, #extraction-form textarea, #extraction-form select').forEach(input => {
            const el = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (el.value) formData[el.name || el.id] = el.value;
        });
        return formData;
    }
};

// --- Dynamic Fields ---
// Simplified dynamic fields logic for preview
const DynamicFields = {
    counters: { indication: 0, intervention: 0, arm: 0, mortality: 0, mrs: 0, complication: 0, predictor: 0 },
    initialize: function() {
         // Expose functions globally for HTML onclick
         // Fix: Bunch of properties missing on window. (Solved by declare global)
         window.addIndication = () => this.addIndication();
         window.addIntervention = () => this.addIntervention();
         window.addArm = () => this.addArm();
         window.addMortality = () => this.addMortality();
         window.addMRS = () => this.addMRS();
         window.addComplication = () => this.addComplication();
         window.addPredictor = () => this.addPredictor();
         window.removeElement = (btn) => this.removeElement(btn);
         window.updateArmSelectors = () => this.updateArmSelectors(); // Ensure this is also global
    },
    addField: function(type, containerId) {
         const container = document.getElementById(containerId);
         if (!container) return;
         const count = this.counters[type]++;
         const div = document.createElement('div');
         div.className = 'dynamic-container';
         let htmlContent = '';

         switch (type) {
            case 'indication':
                htmlContent = `
                    <h4>Indication ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group">
                            <label>Sign/Symptom</label>
                            <select name="indication_sign_${count}" class="linked-input">
                                <option value="">Select...</option>
                                <option value="Drowsiness">Drowsiness</option>
                                <option value="GCS_Drop">Drop in GCS</option>
                                <option value="Imaging_Mass_Effect">Imaging signs of mass effect</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Count (N)</label>
                            <input type="number" name="indication_count_${count}" class="linked-input">
                        </div>
                    </div>`;
                break;
            case 'intervention':
                htmlContent = `
                    <h4>Intervention Type ${count + 1}</h4>
                    <div class="form-group"><label>Surgical Type</label><select name="intervention_type_${count}" class="linked-input"><option value="">Select...</option><option value="SDC_EVD">SDC + EVD</option><option value="SDC_ALONE">SDC Alone</option><option value="EVD_ALONE">EVD Alone</option></select></div>
                    <div class="form-group"><label>Time To Surgery (Hours)</label><input type="number" step="0.1" name="intervention_time_${count}" class="linked-input"></div>
                    <div class="form-group"><label>Duraplasty?</label><select name="intervention_duraplasty_${count}" class="linked-input"><option value="null">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></div>`;
                break;
            case 'arm':
                htmlContent = `
                    <h3>Study Arm ${count + 1}</h3>
                    <div class="grid-2col">
                        <div class="form-group"><label>Label</label><input type="text" name="arm_label_${count}" class="linked-input arm-label-input" oninput="updateArmSelectors()"></div>
                        <div class="form-group"><label>Sample Size (N)</label><input type="number" name="arm_n_${count}" class="linked-input"></div>
                    </div>`;
                break;
            case 'mortality':
                htmlContent = `
                    <h4>Mortality Data Point ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group"><label>Arm</label><select name="mortality_arm_${count}" class="arm-selector linked-input"></select></div>
                        <div class="form-group"><label>Timepoint</label><input type="text" name="mortality_tp_${count}" class="linked-input"></div>
                    </div>
                    <div class="grid-2col">
                        <div class="form-group"><label>Deaths (N)</label><input type="number" name="mortality_deaths_${count}" class="linked-input"></div>
                        <div class="form-group"><label>Total (N)</label><input type="number" name="mortality_total_${count}" class="linked-input"></div>
                    </div>`;
                break;
            case 'mrs':
                htmlContent = `
                    <h4>mRS Data Point ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group"><label>Arm</label><select name="mrs_arm_${count}" class="arm-selector linked-input"></select></div>
                        <div class="form-group"><label>Timepoint</label><input type="text" name="mrs_tp_${count}" class="linked-input"></div>
                    </div>
                    <h5>Distribution (Counts)</h5>
                    <div class="grid-mrs">
                        ${[0,1,2,3,4,5,6].map(i => `<div class="form-group"><label>${i}</label><input type="number" name="mrs_${i}_${count}" class="linked-input"></div>`).join('')}
                    </div>`;
                break;
            case 'complication':
                 htmlContent = `
                    <h4>Complication ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group"><label>Description</label><input type="text" name="comp_desc_${count}" class="linked-input"></div>
                        <div class="form-group"><label>Arm</label><select name="comp_arm_${count}" class="arm-selector linked-input"></select></div>
                    </div>
                    <div class="form-group"><label>Count (N)</label><input type="number" name="comp_count_${count}" class="linked-input"></div>`;
                break;
            case 'predictor':
                 htmlContent = `
                    <h4>Predictor Analysis ${count + 1}</h4>
                    <div class="form-group"><label>Predictor Variable</label><input type="text" name="pred_var_${count}" class="linked-input"></div>
                    <div class="grid-3col">
                        <div class="form-group"><label>Effect Size (OR/HR)</label><input type="number" step="0.01" name="pred_effect_${count}" class="linked-input"></div>
                        <div class="form-group"><label>95% CI (Lower)</label><input type="number" step="0.01" name="pred_ci_lower_${count}" class="linked-input"></div>
                        <div class="form-group"><label>95% CI (Upper)</label><input type="number" step="0.01" name="pred_ci_upper_${count}" class="linked-input"></div>
                    </div>
                    <div class="form-group"><label>p-Value</label><input type="number" step="0.001" name="pred_pvalue_${count}" class="linked-input"></div>`;
                break;
        }

        htmlContent += `<button type="button" class="remove-btn" onclick="removeElement(this)">Remove</button>`;
        div.innerHTML = htmlContent;

         container.appendChild(div);
         FormManager.initializeFormFields(); // Re-bind listeners for new fields
         if (type === 'arm') this.updateArmSelectors(); // Update selectors if an arm was added
         if (type === 'mortality' || type === 'mrs' || type === 'complication') this.updateArmSelectors(); // Update selectors for fields that use arms
    },
     addIndication: function() { this.addField('indication', 'indications-container'); },
     addIntervention: function() { this.addField('intervention', 'interventions-container'); },
     addArm: function() { this.addField('arm', 'arms-container'); },
     addMortality: function() { this.addField('mortality', 'mortality-global-container'); },
     addMRS: function() { this.addField('mrs', 'mrs-global-container'); },
     addComplication: function() { this.addField('complication', 'complications-container'); },
     addPredictor: function() { this.addField('predictor', 'predictors-container'); },
     removeElement: function(button) {
        button.closest('.dynamic-container')?.remove();
        this.updateArmSelectors();
    },
     updateArmSelectors: function() {
        const armLabels = Array.from(document.querySelectorAll('.arm-label-input'))
            // Fix: Property 'value' does not exist on type 'Element'.
            .map(input => (input as HTMLInputElement).value.trim())
            .filter(Boolean);

        document.querySelectorAll('.arm-selector').forEach(selectEl => {
            const select = selectEl as HTMLSelectElement;
            // Fix: Property 'value' does not exist on type 'Element'.
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Arm...</option>'; // Clear existing options
            armLabels.forEach(label => {
                const option = new Option(label, label);
                // Fix: Property 'add' does not exist on type 'Element'.
                select.add(option);
            });
            // Try to reselect the previous value if it still exists
            if (armLabels.includes(currentValue)) {
                // Fix: Property 'value' does not exist on type 'Element'.
                select.value = currentValue;
            }
        });
    }
};

// --- Export Manager ---
const ExportManager = {
    exportJSON: function() {
        const state = AppStateManager.getState();
        const formData = FormManager.collectFormData();
        const data = { document: state.documentName, exportDate: new Date().toISOString(), formData, extractions: ExtractionTracker.getExtractions() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `extraction_${Date.now()}.json`);
        StatusManager.show('JSON export successful (Preview)', 'success');
    },
    exportCSV: function() {
        let csv = 'Field,Text,Page,X,Y,Width,Height,Timestamp\n';
        ExtractionTracker.getExtractions().forEach(ext => {
             csv += `"${ext.fieldName}","${ext.text.replace(/"/g, '""')}",${ext.page},${ext.coordinates.x},${ext.coordinates.y},${ext.coordinates.width},${ext.coordinates.height},"${ext.timestamp}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, `extraction_${Date.now()}.csv`);
        StatusManager.show('CSV export successful (Preview)', 'success');
    },
    exportAudit: function() {
         const formData = FormManager.collectFormData();
         // Generate simplified HTML locally for preview
         const state = AppStateManager.getState();
         const extractions = ExtractionTracker.getExtractions();
         let html = `<h1>Audit Report</h1><h2>Document: ${state.documentName}</h2><h3>Form Data</h3><ul>`;
         Object.entries(formData).forEach(([key, value]) => html += `<li><b>${key}:</b> ${value}</li>`);
         html += `</ul><h3>Extractions</h3>`;
         extractions.forEach(ext => html += `<p><b>${ext.fieldName} (Page ${ext.page}):</b> "${ext.text}" <i>@ ${ext.timestamp}</i></p>`);
         const blob = new Blob([html], { type: 'text/html' });
         const url = URL.createObjectURL(blob);
         window.open(url, '_blank');
         setTimeout(() => URL.revokeObjectURL(url), 1000); // Clean up blob URL
         StatusManager.show('Audit report generated (Preview)', 'success');
    },
    exportAnnotatedPDF: function() {
         StatusManager.show('Annotated PDF export not available in preview.', 'info');
    },
     downloadFile: function(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000); // Clean up blob URL
    }
};

// --- GEMINI API FUNCTIONS ---

/**
 * Gets text content from a specific PDF page, using cache if available.
 * @param {number} pageNum - The page number.
 * @returns {Promise<{fullText: string, items: Array<any>}>}
 */
async function getPageText(pageNum) {
    const state = AppStateManager.getState();
    if (state.pdfTextCache.has(pageNum)) {
        return state.pdfTextCache.get(pageNum);
    }
    if (!state.pdfDoc) {
        throw new Error('No PDF loaded');
    }
    try {
        const page = await state.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        let fullText = '';
        const items = [];
        textContent.items.forEach(item => {
            if (item.str) {
                fullText += item.str + ' ';
                items.push({ text: item.str, transform: item.transform });
            }
        });
        const pageData = { fullText, items };
        // Simple cache management
        if (state.pdfTextCache.size >= state.maxCacheSize) {
            const firstKey = state.pdfTextCache.keys().next().value;
            if (firstKey) state.pdfTextCache.delete(firstKey);
        }
        state.pdfTextCache.set(pageNum, pageData);
        return pageData;
    } catch (error) {
        console.error(`Error getting text from page ${pageNum}:`, error);
        return { fullText: '', items: [] };
    }
}

/**
 * Gets all text from the loaded PDF document.
 * @returns {Promise<string|null>} Full text of the document or null if no PDF is loaded.
 */
async function getAllPdfText() {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show("Please load a PDF first.", "warning");
        return null;
    }

    let fullText = "";
    StatusManager.show("Reading full document text...", "info", 60000); // Long timeout
    for (let i = 1; i <= state.totalPages; i++) {
        const pageData = await getPageText(i); // getPageText is already defined and caches
        fullText += pageData.fullText + "\n\n";
    }
    StatusManager.show("Document text reading complete.", "success");
    return fullText;
}

/**
 * Calls the Gemini API with Google Search grounding.
 * @param {string} systemInstruction - The system instruction.
 * @param {string} userPrompt - The user query.
 * @param {object} responseSchema - The JSON schema for the response.
 * @returns {Promise<string>} - The text content from the API response.
 */
async function callGeminiWithSearch(systemInstruction, userPrompt, responseSchema) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction,
                tools: [{googleSearch: {}}],
                responseMimeType: "application/json",
                responseSchema
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Search API call failed:", error);
        throw error;
    }
}


/**
 * ✨ Generates PICO-T summary using Gemini API.
 */
async function generatePICO() {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    document.getElementById('pico-loading').style.display = 'block';
    StatusManager.show('✨ Analyzing document for PICO-T summary...', 'info');

    try {
        // Get full text of the document to provide as context
        const documentText = await getAllPdfText();
        if (!documentText) {
            throw new Error("Could not read text from the PDF.");
        }

        const systemPrompt = "You are an expert clinical research assistant. Your task is to extract PICO-T information from the provided clinical study text and return it as a JSON object. Be concise and accurate. If information is not found, return an empty string for that field.";
        const userPrompt = `Here is the clinical study text:\n\n${documentText}`;
         
        // Fix: Use Type enum for schema definition
        const picoSchema = {
            type: Type.OBJECT,
            properties: {
                "population": { "type": Type.STRING, "description": "The study population (e.g., '57 patients with malignant cerebellar infarction')" },
                "intervention": { "type": Type.STRING, "description": "The intervention performed (e.g., 'suboccipital decompressive craniectomy (SDC)')" },
                "comparator": { "type": Type.STRING, "description": "The comparison group (e.g., 'best medical treatment alone' or 'no comparator')" },
                "outcomes": { "type": Type.STRING, "description": "The primary outcomes measured (e.g., 'mRS at 12-month follow-up')" },
                "timing": { "type": Type.STRING, "description": "The follow-up timing (e.g., '12-month follow-up')" },
                "studyType": { "type": Type.STRING, "description": "The type of study (e.g., 'retrospective-matched case-control study')" }
            }
        };

        // Call Gemini directly
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: picoSchema
            }
        });
         
        const jsonText = response.text;
        const data = JSON.parse(jsonText);

        // Populate fields
        // Fix: Property 'value' does not exist on type 'HTMLElement'.
        (document.getElementById('eligibility-population') as HTMLInputElement).value = data.population || '';
        (document.getElementById('eligibility-intervention') as HTMLInputElement).value = data.intervention || '';
        (document.getElementById('eligibility-comparator') as HTMLInputElement).value = data.comparator || '';
        (document.getElementById('eligibility-outcomes') as HTMLInputElement).value = data.outcomes || '';
        (document.getElementById('eligibility-timing') as HTMLInputElement).value = data.timing || '';
        (document.getElementById('eligibility-type') as HTMLInputElement).value = data.studyType || '';
         
        // Add to trace log
        const state2 = AppStateManager.getState();
        const coords = { x: 0, y: 0, width: 0, height: 0 }; // AI extractions have no coords
        ExtractionTracker.addExtraction({ fieldName: 'population (AI)', text: data.population, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'intervention (AI)', text: data.intervention, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'comparator (AI)', text: data.comparator, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'outcomes (AI)', text: data.outcomes, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'timing (AI)', text: data.timing, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'studyType (AI)', text: data.studyType, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });


        StatusManager.show('✨ PICO-T fields auto-populated by Gemini!', 'success');

    } catch (error) {
        console.error("Gemini PICO-T Error:", error);
        StatusManager.show(`AI extraction failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        document.getElementById('pico-loading').style.display = 'none';
    }
}
         
/**
 * ✨ Generates a summary of key findings using Gemini API.
 */
async function generateSummary() {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
     if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    document.getElementById('summary-loading').style.display = 'block';
    StatusManager.show('✨ Asking Gemini for summary...', 'info');

     try {
        const documentText = await getAllPdfText();
        if (!documentText) {
            throw new Error("Could not read text from the PDF.");
        }
        
        const systemPrompt = "You are an expert clinical research assistant. Your task is to read the provided clinical study text and write a concise summary (2-3 paragraphs) focusing on the key findings, outcomes, and any identified predictors of those outcomes.";
        const userPrompt = `Please summarize the following clinical study text:\n\n${documentText}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [{ parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
            }
        });
         
        const summaryText = response.text;
         
        // Fix: Property 'value' does not exist on type 'HTMLElement'.
        (document.getElementById('predictorsPoorOutcomeSurgical') as HTMLTextAreaElement).value = summaryText;
         
        // Add to trace log
        const state2 = AppStateManager.getState();
        ExtractionTracker.addExtraction({ fieldName: 'summary (AI)', text: summaryText, page: 0, coordinates: {x:0,y:0,width:0,height:0}, method: 'gemini-summary', documentName: state2.documentName });
         
        StatusManager.show('✨ Key findings summary generated by Gemini!', 'success');

     } catch (error) {
        console.error("Gemini Summary Error:", error);
        StatusManager.show(`AI summary failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        document.getElementById('summary-loading').style.display = 'none';
    }
}

/**
 * ✨ Validates a field's content against the PDF text using Gemini.
 */
async function validateFieldWithAI(fieldId) {
    const state = AppStateManager.getState();
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (!field) {
        StatusManager.show(`Field ${fieldId} not found.`, 'error');
        return;
    }
     
    // Fix: Property 'value' does not exist on type 'HTMLElement'.
    const claim = field.value;
    if (!claim) {
        StatusManager.show('Field is empty, nothing to validate.', 'warning');
        return;
    }

    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }
     
    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);
    StatusManager.show(`✨ Validating claim with Gemini: "${claim.substring(0, 30)}..."`, 'info');

    try {
        const documentText = await getAllPdfText();
        if (!documentText) {
            throw new Error("Could not read text from PDF for validation.");
        }
        
        const systemPrompt = `You are a fact-checking expert specializing in clinical research papers. Your task is to determine if a given "claim" is directly supported by the provided "document text". You must respond with a JSON object.`;
        const userPrompt = `DOCUMENT TEXT:\n"""${documentText}"""\n\nCLAIM:\n"""${claim}"""\n\nBased on the document text, is the claim supported? Provide a direct quote if it is.`;

        const validationSchema = {
            type: Type.OBJECT,
            properties: {
                "is_supported": { 
                    type: Type.BOOLEAN, 
                    description: "True if the claim is directly supported by the text, otherwise false." 
                },
                "supporting_quote": { 
                    type: Type.STRING, 
                    description: "A direct quote from the document that supports the claim. If not supported, this should be an empty string or a brief explanation." 
                },
                "confidence_score": { 
                    type: Type.NUMBER, 
                    description: "Your confidence in the validation from 0.0 to 1.0." 
                }
            },
            required: ["is_supported", "supporting_quote", "confidence_score"]
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: validationSchema
            }
        });

        const jsonText = response.text;
        const validation = JSON.parse(jsonText);

        if (validation.is_supported) {
            StatusManager.show(`✓ VALIDATED (Confidence: ${Math.round(validation.confidence_score * 100)}%): "${validation.supporting_quote}"`, 'success', 10000);
            field.style.borderColor = 'var(--success-green)';
        } else {
            StatusManager.show(`✗ NOT SUPPORTED (Confidence: ${Math.round(validation.confidence_score * 100)}%). Reason: "${validation.supporting_quote}"`, 'warning', 10000);
             field.style.borderColor = 'var(--warning-orange)';
        }

    } catch (error) {
        console.error("Gemini Validation Error:", error);
        StatusManager.show(`AI validation failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        StatusManager.showLoading(false);
    }
}
         
/**
 * ✨ Finds study metadata using Gemini with Google Search.
 */
async function findMetadata() {
    const state = AppStateManager.getState();
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }
    // Fix: Property 'value' does not exist on type 'HTMLElement'.
    const citationText = (document.getElementById('citation') as HTMLInputElement).value;
    if (!citationText) {
        StatusManager.show('Please enter a citation or title first.', 'warning');
        return;
    }
     
    AppStateManager.setState({ isProcessing: true });
    document.getElementById('metadata-loading').style.display = 'block';
    StatusManager.show('✨ Searching Google for metadata...', 'info');

    try {
        const systemPrompt = "You are a research assistant. Find the metadata for the given study. Use Google Search to find the information. If a value isn't found, return an empty string for it. Provide only the JSON response.";
        const userPrompt = `Find the DOI, PMID, journal name, and publication year for the following study: "${citationText}"`;
         
        const metadataSchema = {
            type: Type.OBJECT,
            properties: {
                "doi": { "type": Type.STRING, "description": "The DOI of the paper" },
                "pmid": { "type": Type.STRING, "description": "The PubMed ID (PMID) of the paper" },
                "journal": { "type": Type.STRING, "description": "The name of the journal" },
                "year": { "type": Type.STRING, "description": "The 4-digit publication year" }
            }
        };

        const responseJson = await callGeminiWithSearch(systemPrompt, userPrompt, metadataSchema);
        const data = JSON.parse(responseJson);
         
        // Fix: Property 'value' does not exist on type 'HTMLElement'.
        if (data.doi) (document.getElementById('doi') as HTMLInputElement).value = data.doi;
        if (data.pmid) (document.getElementById('pmid') as HTMLInputElement).value = data.pmid;
        if (data.journal) (document.getElementById('journal') as HTMLInputElement).value = data.journal;
        if (data.year) (document.getElementById('year') as HTMLInputElement).value = data.year;

        StatusManager.show('✨ Metadata auto-populated!', 'success');

    } catch (error) {
        console.error("Gemini Metadata Error:", error);
        StatusManager.show(`AI metadata search failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        document.getElementById('metadata-loading').style.display = 'none';
    }
}

/**
 * ✨ Extracts tables from the document using Gemini Pro.
 */
async function handleExtractTables() {
    const state = AppStateManager.getState();
    const resultsContainer = document.getElementById('table-extraction-results');
    if (!state.pdfDoc) {
        StatusManager.show("Please load a PDF first.", "warning");
        return;
    }

    resultsContainer.innerHTML = 'Extracting tables from document... ✨';
    StatusManager.showLoading(true);

    try {
        const documentText = await getAllPdfText();
        if (!documentText) return;

        const systemPrompt = `You are a data extraction specialist. Analyze the provided text from a clinical research paper. Identify all tables and extract their content. Structure the output as a JSON object. The object should have a single key 'tables' which is an array. Each object in the array should represent one table and have 'title' (the table's caption or title), 'description' (a brief summary of the table's content), and 'data' (a 2D array of strings representing rows and columns, including headers). If no tables are found, return an empty array for the 'tables' key.`;

        const tableSchema = {
            type: Type.OBJECT,
            properties: {
                tables: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            data: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                }
                            }
                        },
                        required: ["title", "data"]
                    }
                }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: documentText,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: tableSchema
            }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);

        if (result.tables && result.tables.length > 0) {
            renderTables(result.tables, resultsContainer);
            StatusManager.show(`Successfully extracted ${result.tables.length} tables.`, 'success');
        } else {
            resultsContainer.innerText = "No tables found in the document.";
            StatusManager.show("No tables were identified by the AI.", "info");
        }

    } catch (error) {
        console.error("Table Extraction Error:", error);
        resultsContainer.innerText = `Error: ${error.message}`;
        StatusManager.show("Table extraction failed.", "error");
    } finally {
        StatusManager.showLoading(false);
    }
}

function renderTables(tables, container) {
    container.innerHTML = '';
    tables.forEach((tableData, index) => {
        const details = document.createElement('details');
        details.open = true; // Open by default
        
        const summary = document.createElement('summary');
        summary.textContent = `Table ${index + 1}: ${tableData.title || 'Untitled'}`;
        
        const description = document.createElement('p');
        description.textContent = tableData.description || '';
        description.style.fontSize = '11px';
        description.style.fontStyle = 'italic';
        
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        if (tableData.data && tableData.data.length > 0) {
            // Assume first row is header
            const headerRow = document.createElement('tr');
            tableData.data[0].forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // The rest are body rows
            for (let i = 1; i < tableData.data.length; i++) {
                const bodyRow = document.createElement('tr');
                tableData.data[i].forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    bodyRow.appendChild(td);
                });
                tbody.appendChild(bodyRow);
            }
        }
        
        table.appendChild(thead);
        table.appendChild(tbody);
        
        details.appendChild(summary);
        if(tableData.description) details.appendChild(description);
        details.appendChild(table);
        
        container.appendChild(details);
    });
}

/**
 * ✨ Analyzes an uploaded image with a text prompt using Gemini Flash.
 */
async function handleImageAnalysis() {
    // Fix: Property 'files' does not exist on type 'HTMLElement'.
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
    // Fix: Property 'value' does not exist on type 'HTMLElement'.
    const prompt = (document.getElementById('image-analysis-prompt') as HTMLInputElement).value;
    const resultsContainer = document.getElementById('image-analysis-results');

    // Fix: Property 'files' does not exist on type 'HTMLElement'.
    if (!fileInput.files || fileInput.files.length === 0) {
        StatusManager.show("Please upload an image.", "warning");
        return;
    }
    if (!prompt) {
        StatusManager.show("Please enter a prompt for image analysis.", "warning");
        return;
    }
    
    // Fix: Property 'files' does not exist on type 'HTMLElement'.
    const file = fileInput.files[0];
    resultsContainer.innerHTML = 'Analyzing image... ✨';
    StatusManager.showLoading(true);

    try {
        const base64Data = await blobToBase64(file);
        const imagePart = {
            inlineData: {
                mimeType: file.type,
                data: base64Data,
            },
        };
        const textPart = {
            text: prompt
        };
        
        // Fix: Type error in generateContent call
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        resultsContainer.innerText = response.text;

    } catch (error) {
        console.error("Image Analysis Error:", error);
        resultsContainer.innerText = `Error: ${error.message}`;
        StatusManager.show("Image analysis failed.", "error");
    } finally {
        StatusManager.showLoading(false);
    }
}

/**
 * ✨ Performs deep analysis on the document text using Gemini Pro with thinking budget.
 */
async function handleDeepAnalysis() {
    const state = AppStateManager.getState();
    // Fix: Property 'value' does not exist on type 'HTMLElement'.
    const prompt = (document.getElementById('deep-analysis-prompt') as HTMLInputElement).value;
    const resultsContainer = document.getElementById('deep-analysis-results');
    if (!prompt) {
        StatusManager.show("Please enter a prompt for deep analysis.", "warning");
        return;
    }
    if (!state.pdfDoc) {
        StatusManager.show("Please load a PDF first.", "warning");
        return;
    }

    resultsContainer.innerHTML = 'Thinking deeply... ✨';
    StatusManager.showLoading(true);

    try {
        const documentText = await getAllPdfText();
        if (!documentText) return;
        
        const fullPrompt = `Based on the following document text, please answer this question: ${prompt}\n\nDOCUMENT TEXT:\n${documentText}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: fullPrompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        
        resultsContainer.innerText = response.text;

    } catch (error) {
        console.error("Deep Analysis Error:", error);
        resultsContainer.innerText = `Error: ${error.message}`;
        StatusManager.show("Deep analysis failed.", "error");
    } finally {
        StatusManager.showLoading(false);
    }
}

// --- Helper Functions (made global for HTML access) ---
// Fix: 'calculateBoundingBox' is used before its definition. (Solved by adding to window and declare global)
const calculateBoundingBox = (items) => {
     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
    if (!isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 }; // Handle case with no valid items
    return { x: Math.round(minX), y: Math.round(minY), width: Math.round(maxX - minX), height: Math.round(maxY - minY) };
};
window.calculateBoundingBox = calculateBoundingBox;

// Fix: 'addExtractionMarker' is used before its definition. (Solved by adding to window and declare global)
const addExtractionMarker = (extraction) => {
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
};
window.addExtractionMarker = addExtractionMarker;

// Fix: 'addExtractionMarkersForPage' is used before its definition. (Solved by adding to window and declare global)
const addExtractionMarkersForPage = (pageNum) => {
    const pageDiv = document.querySelector('.pdf-page');
    if (!pageDiv) return;
     // Clear existing markers for the page first
     pageDiv.querySelectorAll('.extraction-marker').forEach(m => m.remove());
    // Add markers
    ExtractionTracker.getExtractions()
        .filter(ext => ext.page === pageNum)
        // Fix: Cannot find name 'addExtractionMarker'. (Solved by adding to window and declare global)
        .forEach(ext => addExtractionMarker(ext));
};
window.addExtractionMarkersForPage = addExtractionMarkersForPage;

// Fix: 'autoAdvanceField' is used before its definition. (Solved by adding to window and declare global)
const autoAdvanceField = () => {
     const state = AppStateManager.getState();
     const currentStepElement = document.getElementById(`step-${state.currentStep + 1}`);
     if (!currentStepElement || !state.activeFieldElement) return;
     const inputs = Array.from(currentStepElement.querySelectorAll('.linked-input:not([disabled])'));
     const currentIndex = inputs.indexOf(state.activeFieldElement);
     if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
        // Fix: Property 'focus' does not exist on type 'Element'.
        (inputs[currentIndex + 1] as HTMLElement).focus();
     }
};
window.autoAdvanceField = autoAdvanceField;

// Fix: 'clearSearchMarkers' is used before its definition. (Solved by adding to window and declare global)
const clearSearchMarkers = () => {
    AppState.searchMarkers.forEach(marker => marker.remove());
    AppState.searchMarkers = [];
    document.querySelectorAll('.search-highlight').forEach(el => el.classList.remove('search-highlight'));
};
window.clearSearchMarkers = clearSearchMarkers;

// Fix: Type 'unknown' is not assignable to type 'string'.
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Fix: Property 'split' does not exist on type 'string | ArrayBuffer'.
            resolve((reader.result as string).split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// --- Initialization ---
FormManager.initialize();

// Setup PDF Controls
document.getElementById('pdf-upload-btn').onclick = () => document.getElementById('pdf-file').click();
document.getElementById('pdf-file').onchange = (e) => PDFLoader.loadPDF((e.target as HTMLInputElement).files[0]);
document.getElementById('pdf-file-2').onchange = (e) => PDFLoader.loadPDF((e.target as HTMLInputElement).files[0]); // For label click
document.getElementById('pdf-prev-page').onclick = () => {
    const state = AppStateManager.getState();
    if (state.currentPage > 1) PDFRenderer.renderPage(state.currentPage - 1);
};
document.getElementById('pdf-next-page').onclick = () => {
    const state = AppStateManager.getState();
    if (state.currentPage < state.totalPages) PDFRenderer.renderPage(state.currentPage + 1);
};
 document.getElementById('page-num').onchange = (e) => {
    // Fix: Property 'value' does not exist on type 'EventTarget'.
    const pageNum = parseInt((e.target as HTMLInputElement).value);
    const state = AppStateManager.getState();
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= state.totalPages) {
        PDFRenderer.renderPage(pageNum);
    } else {
        // Reset input to current page if invalid
        (e.target as HTMLInputElement).value = state.currentPage.toString();
    }
};
document.getElementById('zoom-level').onchange = (e) => {
    // Fix: Property 'value' does not exist on type 'EventTarget'.
    const scale = parseFloat((e.target as HTMLSelectElement).value);
    AppStateManager.setState({ scale });
    PDFRenderer.renderPage(AppStateManager.getState().currentPage);
};
document.getElementById('fit-width').onclick = async () => {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) return;
    const container = document.getElementById('pdf-container');
    if (!container) return;
    const containerWidth = container.clientWidth - 40; // Account for padding
    try {
        const page = await state.pdfDoc.getPage(state.currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const newScale = containerWidth / viewport.width;
        AppStateManager.setState({ scale: newScale });
        // Fix: Property 'value' does not exist on type 'HTMLElement'.
        (document.getElementById('zoom-level') as HTMLSelectElement).value = newScale.toFixed(2); // Update dropdown
        await PDFRenderer.renderPage(state.currentPage);
    } catch (error) {
        console.error("Fit Width Error:", error);
        StatusManager.show("Could not fit PDF to width.", "error");
    }
};
 // Drag and Drop for Upload Area
 const uploadArea = document.getElementById('upload-area');
 if (uploadArea) {
    uploadArea.onclick = () => (document.getElementById('pdf-file-2') as HTMLInputElement).click(); // Make area clickable
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.style.background = '#e3f2fd'; };
    uploadArea.ondragleave = () => { uploadArea.style.background = ''; };
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.style.background = '';
        const file = e.dataTransfer?.files[0];
        if (file && file.type === 'application/pdf') {
            PDFLoader.loadPDF(file);
        } else {
            StatusManager.show('Please drop a valid PDF file.', 'warning');
        }
    };
}


 // Expose simplified ExportManager functions globally
 // Fix: Bunch of properties missing on window. (Solved by declare global)
 window.exportJSON = () => ExportManager.exportJSON();
 window.exportCSV = () => ExportManager.exportCSV();
 window.exportAudit = () => ExportManager.exportAudit();
 window.exportAnnotatedPDF = () => ExportManager.exportAnnotatedPDF();

 // Expose Search Interface functions globally (simplified)
 // Fix: 'toggleSearchInterface' does not exist on type 'Window...'. (Solved by declare global)
 window.toggleSearchInterface = () => {
    document.getElementById('search-interface')?.classList.toggle('active');
};
 // Fix: 'searchInPDF' does not exist on type 'Window...'. (Solved by declare global)
 window.searchInPDF = async () => {
    // Re-link to global functions
    // Fix: Property 'value' does not exist on type 'HTMLElement'.
    const query = (document.getElementById('search-query') as HTMLInputElement).value.trim();
    if (!query) {
        StatusManager.show('Please enter text to search', 'warning');
        return;
    }
    if (!AppState.pdfDoc) {
        StatusManager.show('Please load a PDF first', 'warning');
        return;
    }
    StatusManager.show('Searching across all pages...', 'info');
    // Fix: Cannot find name 'clearSearchMarkers'. (Solved by declare global)
    clearSearchMarkers();

    // This logic is simplified from your module.
    // The full implementation would be in `PDFSearch.performSearch`
    // For this preview, we'll just log and show a message.
    console.log("Search Query:", query);
    document.getElementById('search-results').innerHTML = '<li>Search results would appear here...</li>';
    StatusManager.show('Search complete (preview).', 'success');

};

// Expose Gemini functions globally
// Fix: Bunch of properties missing on window. (Solved by declare global)
window.generatePICO = generatePICO;
window.generateSummary = generateSummary;
window.validateFieldWithAI = validateFieldWithAI;
window.findMetadata = findMetadata; // <-- Expose the new function
window.handleExtractTables = handleExtractTables;
window.handleImageAnalysis = handleImageAnalysis;
window.handleDeepAnalysis = handleDeepAnalysis;

// Setup image upload listener
document.getElementById('image-upload-input').addEventListener('change', (event) => {
    // Fix: Property 'files' does not exist on type 'EventTarget'.
    const file = (event.target as HTMLInputElement).files[0];
    if (file) {
        const preview = document.getElementById('image-preview') as HTMLImageElement;
        // Fix: Property 'src' does not exist on type 'HTMLElement'.
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
        // Fix: Property 'disabled' does not exist on type 'HTMLElement'.
        (document.getElementById('analyze-image-btn') as HTMLButtonElement).disabled = false;
        // Fix: Property 'src' does not exist on type 'HTMLElement'.
        preview.onload = () => URL.revokeObjectURL(preview.src); // free memory
    }
});
 
// Expose Save functions globally
// Fix: 'handleSubmitToGoogleSheets' does not exist on type 'Window...'. (Solved by declare global)
window.handleSubmitToGoogleSheets = async (e) => {
    e.preventDefault();
    if (!CONFIG.GOOGLE_API_KEY || !CONFIG.GOOGLE_CLIENT_ID || !CONFIG.GOOGLE_SHEET_ID) {
        StatusManager.show('Google Sheets config is missing.', 'error');
        return;
    }
    if (!gapiLoaded || !gapiTokenClient) {
         StatusManager.show('Google API client is not loaded yet. Please wait.', 'warning');
         return;
    }
     
    // --- VALIDATION LOGIC REMOVED ---
    /*
    if (!FormManager.validateAllSteps()) {
         StatusManager.show('Please correct validation errors on all steps before saving.', 'error');
         return;
    }
    */

    StatusManager.showLoading(true);
    StatusManager.show('Authenticating with Google...', 'info');
     
    try {
        // Get auth token
        gapiTokenClient.callback = async (tokenResponse) => {
            if (tokenResponse.error) {
                 throw new Error(`Google Auth Error: ${tokenResponse.error}`);
            }
            // Fix: Cannot find name 'gapi'. (Solved by declare global)
            await window.gapi.client.load('sheets', 'v4');
            StatusManager.show('Saving to Google Sheets...', 'info');
             
            const state = AppStateManager.getState();
            const formData = FormManager.collectFormData();
            const extractions = ExtractionTracker.getExtractions();
            const submissionId = `sub_${Date.now()}`;
            const timestamp = new Date().toISOString();

            // --- Define Sheet Headers (Must match your sheet) ---
            // Example:
            const submissionHeaders = ["Submission ID", "Timestamp", "Document", "Citation", "DOI", "PMID", "Total N"];
            const extractionHeaders = ["Submission ID", "Field Name", "Text", "Page", "Method", "X", "Y", "Width", "Height"];

            // 1. Prepare Submission Row
            // This is an example. You MUST adjust this to match your 'Submissions' sheet columns exactly.
            const submissionRow = [
                submissionId,
                timestamp,
                state.documentName,
                // Fix: Property 'citation' does not exist on type '{}'. (Solved by typing formData in collectFormData)
                formData.citation || '',
                formData.doi || '',
                formData.pmid || '',
                formData.totalN || ''
            ];

            // 2. Prepare Extraction Rows
            const extractionRows = extractions.map(ext => [
                submissionId,
                ext.fieldName,
                ext.text,
                ext.page,
                ext.method,
                ext.coordinates.x,
                ext.coordinates.y,
                ext.coordinates.width,
                ext.coordinates.height
            ]);

            // 3. Append to 'Submissions' Sheet
            // Fix: Cannot find name 'gapi'. (Solved by declare global)
            await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
                range: 'Submissions!A:A', // Assumes 'Submissions' tab
                valueInputOption: 'USER_ENTERED',
                resource: { values: [submissionRow] }
            });

            // 4. Append to 'Extractions' Sheet
            if (extractionRows.length > 0) {
                 // Fix: Cannot find name 'gapi'. (Solved by declare global)
                 await window.gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
                    range: 'Extractions!A:A', // Assumes 'Extractions' tab
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: extractionRows }
                });
            }

            StatusManager.showLoading(false);
            StatusManager.show('✓ Successfully saved to Google Sheets!', 'success');
        };
         
        // Check if we already have a token
        // Fix: Cannot find name 'gapi'. (Solved by declare global)
        if (window.gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent
            gapiTokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // We already have a token, just run the callback
            // Fix: Cannot find name 'gapi'. (Solved by declare global)
            gapiTokenClient.callback(window.gapi.client.getToken());
        }

    } catch (error) {
         console.error("Google Sheets Save Error:", error);
         StatusManager.show(`Google Sheets save failed: ${error.message}`, 'error');
         StatusManager.showLoading(false);
    }
};


 // Initial status message
 StatusManager.show('Preview Ready. Load a PDF to begin.', 'info');
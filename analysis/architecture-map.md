# Architecture Map - Clinical Extractor

## MODULE OVERVIEW

### 1. State Management (`state/`)
**AppStateManager.ts (263 lines)** - Singleton state manager implementing the Observer pattern. Manages global application state including PDF document, current page, zoom scale, extractions, text cache, and citation provenance. Provides `getState()`, `setState()`, and `subscribe()` methods for reactive updates across the application. Handles immutable state updates and subscriber notifications.

### 2. PDF Processing (`pdf/`)
**PDFLoader.ts (258 lines)** - Handles PDF file loading and validation. Integrates with PDF.js to load documents and updates AppStateManager with document metadata (name, total pages). Provides error handling for corrupted or invalid PDFs.

**PDFRenderer.ts (403 lines)** - Core PDF rendering engine. Renders PDF pages to canvas, manages zoom controls (0.5x-3.0x), builds text layers for selection, adds extraction markers, and provides bounding box visualization. Includes toggle-able overlays for text chunks, table regions, and figure boundaries with color-coded provenance (red=manual, green=AI, blue=standard).

**TextSelection.ts (301 lines)** - Implements mouse-based text selection on PDF canvas. Calculates bounding boxes for selected text, dispatches extraction events, and tracks coordinates for audit trail. Supports manual extraction method with precise coordinate tracking.

### 3. AI Services (`services/`)
**AIService.ts (727 lines)** - Primary AI integration layer using Google Gemini API. Implements 7 AI-powered functions: PICO-T extraction (gemini-2.5-flash), summary generation (gemini-flash-latest), field validation (gemini-2.5-pro), metadata search with Google Search grounding, table extraction, image analysis, and deep analysis with extended thinking budget (32768 tokens). Manages PDF text caching and handles all AI error scenarios.

**AgentOrchestrator.ts (358 lines)** - Multi-agent coordination system that orchestrates 6 specialized medical research agents. Implements classification → routing → enhancement → validation pipeline. Routes tables to appropriate specialist agents based on content type (patient demographics, surgical procedures, outcomes, neuroimaging, study methodology). Calculates multi-agent consensus with weighted voting and confidence scoring.

**MedicalAgentBridge.ts (295 lines)** - Gemini-based implementation of medical research agents for browser compatibility. Provides 6 specialized agents: StudyDesignExpertAgent (92% accuracy), PatientDataSpecialistAgent (88%), SurgicalExpertAgent (91%), OutcomesAnalystAgent (89%), NeuroimagingSpecialistAgent (92%), and TableExtractorAgent (100% structural validation). Uses gemini-2.0-flash-thinking-exp-1219 for complex clinical reasoning.

**FigureExtractor.ts (256 lines)** - Extracts figures from PDF using operator list interception. Intercepts PDF.js image rendering operators (92, 93, 94) before canvas display to access decoded image data directly from memory. Handles multiple color spaces (Grayscale, RGB, RGBA, CMYK) and filters out decorative elements. Provides perfect-quality image extraction without OCR.

**TableExtractor.ts (341 lines)** - Geometric table detection using coordinate clustering. Groups text items into rows by Y-coordinate clustering (5px tolerance) and detects columns by X-coordinate clustering (10px tolerance). Identifies table regions with ≥3 rows and ≥2 columns. Converts detected regions to structured format with headers, data rows, and bounding boxes. Generates HTML and CSV exports.

**CitationService.ts (454 lines)** - Citation provenance system for systematic reviews. Creates indexed documents for AI citation, parses AI responses with JSON metadata extraction, builds citation maps with bounding boxes, and provides smart document truncation with focus windows. Enables clickable citations that navigate to exact source locations.

**ExportManager.ts (210 lines)** - Data export in multiple formats: JSON (full data), CSV (flattened extractions), Excel (multi-sheet workbook), HTML audit reports (with extraction context), and annotated PDF (future feature). Handles data transformation and file generation for all export types.

### 4. Form Management (`forms/`)
**FormManager.ts (273 lines)** - 8-step wizard for clinical data extraction: Study Identification, Eligibility/PICO-T, Study Quality, Baseline Characteristics, Indications for Surgery, Interventions, Outcomes, and Complications. Manages multi-step navigation, field linking (class `linked-input`), progress tracking, and form data collection. Currently has validation disabled (lines 676-703).

**DynamicFields.ts (268 lines)** - Dynamic field generation for complex clinical data. Provides 7 add/remove functions: addIndication, addIntervention, addArm, addMortality, addMRS, addComplication, addPredictor. Generates HTML with unique IDs, adds remove buttons, and updates related selectors automatically.

### 5. Data Persistence (`data/`)
**ExtractionTracker.ts (330 lines)** - Tracks and persists all extractions to LocalStorage. Auto-saves on every extraction, provides recovery on page reload, and maintains extraction history. Stores extraction objects with field name, text, page number, coordinates, timestamp, and method (manual/gemini-pico/gemini-summary).

### 6. Utilities (`utils/`)
**helpers.ts (141 lines)** - Utility functions for bounding box calculation, extraction markers, field auto-advance, search marker clearing, and blob-to-base64 conversion.

**status.ts (73 lines)** - UI status message management with auto-dismiss, loading indicators, and message types (info, success, warning, error).

**memory.ts (69 lines)** - Memory leak prevention via event listener tracking, timeout cleanup, and PDF text cache size limits (50 pages max).

**security.ts (108 lines)** - Input sanitization and validation. Removes HTML, limits text to 10,000 chars, validates DOI/PMID/email/URL formats, and prevents XSS attacks.

### 7. Configuration (`config/`)
**index.ts (104 lines)** - Application configuration including API keys (Gemini, Google), OAuth client ID, Google Sheets ID, PDF.js worker URLs, and CMAP configuration.

### 8. Type Definitions (`types/`)
**index.ts (329 lines)** - TypeScript interfaces for AppState, Extraction, FormData, Coordinates, TextItem, TextChunk, Citation, and all other type definitions used across the application.

### 9. Entry Point
**main.ts (752 lines)** - Application orchestrator and entry point. Sets up dependency injection, configures PDF.js, initializes modules, registers event listeners, exposes 33 functions to Window API, and implements the full multi-agent pipeline runner. Coordinates all modules and handles application lifecycle.

## DEPENDENCY GRAPH

```
main.ts (Entry Point)
├── AppStateManager (Singleton State)
│   └── [Subscribed by all modules]
├── ExtractionTracker (Data Persistence)
│   ├── AppStateManager
│   ├── StatusManager
│   └── PDFRenderer
├── FormManager (8-Step Wizard)
│   ├── AppStateManager
│   ├── StatusManager
│   └── DynamicFields
├── DynamicFields (Dynamic Form Fields)
│   └── FormManager
├── PDFLoader (File Loading)
│   ├── AppStateManager
│   ├── StatusManager
│   └── PDFRenderer
├── PDFRenderer (Canvas Rendering)
│   ├── AppStateManager
│   ├── StatusManager
│   └── TextSelection
├── TextSelection (Mouse Selection)
│   ├── AppStateManager
│   └── ExtractionTracker
├── AIService (Gemini Integration)
│   ├── AppStateManager
│   ├── ExtractionTracker
│   └── StatusManager
├── AgentOrchestrator (Multi-Agent Pipeline)
│   └── MedicalAgentBridge
├── MedicalAgentBridge (6 Specialized Agents)
│   └── Google Gemini API
├── FigureExtractor (Operator Interception)
│   └── PDF.js Operator List
├── TableExtractor (Geometric Detection)
│   └── PDF.js Text Content
├── CitationService (Provenance System)
│   ├── AppStateManager
│   └── AIService
├── ExportManager (Data Export)
│   └── AppStateManager
├── MemoryManager (Leak Prevention)
│   └── [Used by all modules]
└── StatusManager (UI Messages)
    └── [Used by all modules]
```

## EXTERNAL DEPENDENCIES

### Top 10 Most Important npm Packages

1. **@google/genai (^1.29.1)** - Google Generative AI SDK for Gemini API integration. Core dependency for all AI-powered features including PICO-T extraction, validation, metadata search, and multi-agent analysis. Provides structured JSON output with schemas.

2. **xlsx (^0.18.5)** - Excel file generation for multi-sheet workbook exports. Enables export of metadata, text chunks, figures, and tables to Excel format. **SECURITY ISSUE: Has 2 high-severity vulnerabilities (Prototype Pollution CVE-1321, ReDoS CVE-1333).**

3. **PDF.js (3.11.174 via CDN)** - Mozilla's PDF rendering library. Core dependency for all PDF operations: document loading, page rendering, text extraction, operator list access, and coordinate tracking. Loaded via CDN with worker and CMAP support.

4. **TypeScript (~5.8.2)** - Type safety and compile-time error detection. Provides interfaces for all data structures and ensures type correctness across 6,313 lines of code.

5. **Vite (^6.2.0)** - Build tool and development server. Provides fast HMR, ES module support, environment variable handling (import.meta.env), and optimized production builds.

6. **@types/node (^22.14.0)** - Node.js type definitions for TypeScript. Enables proper typing for file operations, buffers, and Node.js APIs used in build scripts.

7. **Google Search API (via Gemini tools)** - External search grounding for metadata discovery. Used in findMetadata() to search for DOI, PMID, journal, and publication year with external validation.

8. **Google Sheets API (documented but not implemented)** - OAuth 2.0 integration for submitting extractions to Google Sheets. Expected to append to "Submissions" and "Extractions" sheets but service file is missing.

9. **LocalStorage API (browser native)** - Client-side persistence for extraction history. Stores all extractions with key 'clinical_extractions_simple' for recovery on page reload.

10. **Canvas API (browser native)** - PDF rendering, bounding box visualization, and image conversion. Used extensively in PDFRenderer, FigureExtractor, and TableExtractor for visual output.

## DATA FLOW

### Complete Pipeline: PDF Upload → Extraction → AI Processing → Export

**Step 1: PDF Upload and Loading**
User uploads PDF file → PDFLoader validates file type → PDF.js loads document → AppStateManager updates with {pdfDoc, documentName, totalPages} → PDFRenderer renders first page to canvas → Text layer built for selection → Status: "Ready for extraction"

**Step 2: Text Extraction (Manual)**
User selects text on canvas → TextSelection calculates bounding box from mouse coordinates → Extraction event dispatched with {text, page, coordinates} → ExtractionTracker adds extraction with method='manual' → LocalStorage auto-save → Extraction marker added to canvas → Form field populated if linked

**Step 3: Text Extraction (AI - PICO-T)**
User clicks "Generate PICO" → AIService.generatePICO() → getAllPdfText() reads all pages with caching → Gemini API called with PICO schema (gemini-2.5-flash) → JSON response parsed → 6 form fields populated (population, intervention, comparator, outcomes, timing, studyType) → ExtractionTracker adds 6 extractions with method='gemini-pico', page=0, coordinates={0,0,0,0} → Status: "PICO-T fields auto-populated"

**Step 4: Geometric Figure Extraction**
User clicks "Extract Figures" → FigureExtractor.extractFiguresFromPage() for each page → PDF.js getOperatorList() → Intercept image operators (92, 93, 94) → Retrieve image from page.objs memory → Filter by size (≥50x50px) and aspect ratio → Convert color space to RGBA → Generate PNG data URL → AppStateManager updates {extractedFigures} → Diagnostics logged (processing time, operator counts) → Status: "Extracted N figures"

**Step 5: Geometric Table Extraction**
User clicks "Extract Tables" → TableExtractor.extractTablesFromPage() for each page → PDF.js getTextContent() → Group text items by Y-coordinate (rows) → Detect column positions by X-coordinate clustering → Identify table regions (≥3 rows, ≥2 columns, 70% alignment) → Convert to structured format {headers, rows, columnPositions, boundingBox} → AppStateManager updates {extractedTables} → Optional: Render table regions on canvas → Status: "Extracted N tables"

**Step 6: Multi-Agent AI Enhancement**
User clicks "Full AI Pipeline" → AgentOrchestrator.processExtractedData(figures, tables) → For each table: classify content type (patient_demographics, surgical_procedures, outcomes_statistics, neuroimaging_data, study_methodology) → Route to appropriate agents (e.g., patient_demographics → PatientDataSpecialistAgent + TableExtractorAgent) → Call agents in parallel via MedicalAgentBridge → Gemini API with specialized prompts (gemini-2.0-flash-thinking-exp-1219) → Calculate consensus with weighted voting → Aggregate confidence scores → For each figure: classify type → Analyze with relevant agents → Extract clinical insights → AppStateManager updates with enhanced data → Status: "Pipeline complete, N agents invoked, X% average confidence"

**Step 7: Export**
User selects export format → ExportManager function called → Collect data from AppStateManager (formData, extractions, figures, tables) → Transform to target format:
- **JSON**: Full data structure with metadata
- **CSV**: Flattened extraction list with coordinates
- **Excel**: Multi-sheet workbook (Metadata, Text Chunks, Figures, Tables 1-N)
- **HTML Audit**: Report with extraction context and provenance
→ Generate file blob → Trigger browser download → Status: "Export complete"

## ARCHITECTURE PATTERNS

### 1. Singleton Pattern
AppStateManager, ExtractionTracker, all service modules (AIService, FigureExtractor, TableExtractor, AgentOrchestrator) use singleton pattern to ensure single instances across the application.

### 2. Observer Pattern
AppStateManager implements observer pattern with subscribe() method. Modules subscribe to state changes and receive notifications on setState() calls for reactive updates.

### 3. Dependency Injection
Three modules use DI to avoid circular dependencies: ExtractionTracker.setDependencies(), FormManager.setDependencies(), DynamicFields.setDependencies(). All dependencies injected in main.ts setupDependencies().

### 4. Strategy Pattern
Multiple extraction strategies: manual (TextSelection), AI-powered (AIService), geometric (FigureExtractor, TableExtractor), and multi-agent (AgentOrchestrator). Each implements different extraction algorithms.

### 5. Factory Pattern
DynamicFields generates HTML elements dynamically with unique IDs. ExportManager creates different export formats based on user selection.

### 6. Module Pattern
All code organized into cohesive modules with clear responsibilities. Each module exports specific functions/classes and imports only what it needs.

## INITIALIZATION SEQUENCE

1. **DOM Ready** - Wait for DOMContentLoaded event
2. **Dependency Injection** - setupDependencies() wires module dependencies
3. **Module Initialization** - ExtractionTracker.init(), FormManager.initialize()
4. **PDF.js Configuration** - Set worker source URL
5. **Event Listeners** - setupEventListeners() for all UI interactions
6. **Window API Exposure** - Expose 33 functions to window.ClinicalExtractor
7. **Initial Status** - Show "Ready" message
8. **Recovery** - ExtractionTracker loads saved extractions from LocalStorage

## CODE METRICS

- **Total Lines**: 6,313 lines of TypeScript
- **Total Modules**: 20 files
- **Largest Module**: main.ts (752 lines)
- **Most Complex Service**: AIService.ts (727 lines, 7 AI functions)
- **Total Dependencies**: 140 packages (77 prod, 63 dev, 50 optional)
- **TypeScript Errors**: 20 errors across 8 files
- **Security Vulnerabilities**: 1 high-severity (xlsx package)
- **TODO/FIXME Comments**: 0 found in codebase

## TECHNOLOGY STACK

- **Frontend Framework**: Vanilla TypeScript + Vite (no React/Vue/Angular)
- **PDF Processing**: PDF.js 3.11.174
- **AI/ML**: Google Gemini API (2.5-flash, 2.5-pro, 2.0-flash-thinking)
- **State Management**: Custom singleton with observer pattern
- **Build Tool**: Vite 6.2.0
- **Type System**: TypeScript 5.8.2
- **Storage**: Browser LocalStorage
- **Export Formats**: JSON, CSV, Excel (xlsx), HTML
- **Deployment**: Static site (can be hosted on any web server)

# AIService Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AIService.ts (714 lines)                     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  IMPORTS                                                      │   │
│  │  • GoogleGenAI, Type from "@google/genai"                    │   │
│  │  • AppStateManager (PDF state, cache, processing flag)       │   │
│  │  • ExtractionTracker (audit trail)                           │   │
│  │  • StatusManager (user feedback)                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AI CLIENT INITIALIZATION                                     │   │
│  │  const ai = new GoogleGenAI({ apiKey: API_KEY })             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  HELPER FUNCTIONS (4)                                         │   │
│  │  ├─ getPageText(pageNum) → {fullText, items}                 │   │
│  │  ├─ getAllPdfText() → string                                 │   │
│  │  ├─ callGeminiWithSearch(sys, prompt, schema) → string       │   │
│  │  └─ blobToBase64(blob) → string                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AI EXTRACTION FUNCTIONS (7)                                  │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 1. generatePICO()                                  │      │   │
│  │  │    Model: gemini-2.5-flash                         │      │   │
│  │  │    Output: 6 PICO-T fields                         │      │   │
│  │  │    • Population                                     │      │   │
│  │  │    • Intervention                                   │      │   │
│  │  │    • Comparator                                     │      │   │
│  │  │    • Outcomes                                       │      │   │
│  │  │    • Timing                                         │      │   │
│  │  │    • Study Type                                     │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 2. generateSummary()                               │      │   │
│  │  │    Model: gemini-flash-latest                      │      │   │
│  │  │    Output: 2-3 paragraph summary                   │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 3. validateFieldWithAI(fieldId)                    │      │   │
│  │  │    Model: gemini-2.5-pro                           │      │   │
│  │  │    Output: {is_supported, quote, confidence}       │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 4. findMetadata()                                  │      │   │
│  │  │    Model: gemini-2.5-flash + Google Search         │      │   │
│  │  │    Output: {doi, pmid, journal, year}              │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 5. handleExtractTables()                           │      │   │
│  │  │    Model: gemini-2.5-pro                           │      │   │
│  │  │    Output: Array<{title, description, data[][]}>   │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 6. handleImageAnalysis()                           │      │   │
│  │  │    Model: gemini-2.5-flash                         │      │   │
│  │  │    Input: Image (base64) + text prompt             │      │   │
│  │  │    Output: Free-form analysis text                 │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐      │   │
│  │  │ 7. handleDeepAnalysis()                            │      │   │
│  │  │    Model: gemini-2.5-pro                           │      │   │
│  │  │    Config: thinkingBudget = 32768                  │      │   │
│  │  │    Output: Deep reasoning analysis                 │      │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  UI HELPER                                                    │   │
│  │  └─ renderTables(tables, container) → void                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  EXPORTS                                                      │   │
│  │  • Default: AIService object (all functions)                 │   │
│  │  • Named: 7 AI functions (for window binding)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY GRAPH                               │
│                                                                       │
│  AIService.ts                                                         │
│      │                                                                │
│      ├─→ AppStateManager (state/AppStateManager.ts)                  │
│      │       ├─ pdfDoc (PDF document instance)                       │
│      │       ├─ pdfTextCache (Map<number, PageData>)                 │
│      │       ├─ totalPages (number)                                  │
│      │       ├─ maxCacheSize (number)                                │
│      │       ├─ isProcessing (boolean)                               │
│      │       └─ documentName (string)                                │
│      │                                                                │
│      ├─→ ExtractionTracker (data/ExtractionTracker.ts)               │
│      │       └─ addExtraction(extraction) → void                     │
│      │                                                                │
│      ├─→ StatusManager (utils/status.ts)                             │
│      │       ├─ show(message, type, duration) → void                 │
│      │       └─ showLoading(visible) → void                          │
│      │                                                                │
│      └─→ GoogleGenAI (@google/genai)                                 │
│              ├─ ai.models.generateContent(config)                    │
│              └─ Type enum (OBJECT, STRING, NUMBER, BOOLEAN, ARRAY)   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     GEMINI MODEL DISTRIBUTION                         │
│                                                                       │
│  gemini-2.5-flash (Fast, Efficient) - 3 functions                    │
│  ├─ generatePICO() - Structured extraction                           │
│  ├─ findMetadata() + Google Search - Metadata lookup                │
│  └─ handleImageAnalysis() - Vision analysis                          │
│                                                                       │
│  gemini-flash-latest (Fast, Latest) - 1 function                     │
│  └─ generateSummary() - Text summarization                           │
│                                                                       │
│  gemini-2.5-pro (Powerful, Accurate) - 3 functions                   │
│  ├─ validateFieldWithAI() - Fact-checking                            │
│  ├─ handleExtractTables() - Table extraction                         │
│  └─ handleDeepAnalysis() - Deep reasoning (32768 thinking)           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      DATA FLOW EXAMPLE                                │
│                                                                       │
│  User clicks "Generate PICO" button                                  │
│      ↓                                                                │
│  HTML onclick="generatePICO()" [bound via window]                    │
│      ↓                                                                │
│  AIService.generatePICO() called                                     │
│      ↓                                                                │
│  Check: pdfDoc loaded? isProcessing?                                 │
│      ↓                                                                │
│  Set isProcessing = true, show loading                               │
│      ↓                                                                │
│  getAllPdfText() → reads all pages with cache                        │
│      ↓                                                                │
│  ai.models.generateContent({ model: 'gemini-2.5-flash', ... })       │
│      ↓                                                                │
│  Parse JSON response → { population, intervention, ... }             │
│      ↓                                                                │
│  Populate 6 HTML input fields                                        │
│      ↓                                                                │
│  Log 6 extractions to ExtractionTracker                              │
│      ↓                                                                │
│  Show success message via StatusManager                              │
│      ↓                                                                │
│  Set isProcessing = false, hide loading                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING PATTERN                            │
│                                                                       │
│  try {                                                                │
│      // 1. Check prerequisites (pdfDoc, isProcessing)                │
│      if (!state.pdfDoc) { show warning, return }                     │
│      if (state.isProcessing) { show warning, return }                │
│                                                                       │
│      // 2. Set processing state                                      │
│      AppStateManager.setState({ isProcessing: true })                │
│      StatusManager.show('Processing...', 'info')                     │
│                                                                       │
│      // 3. Perform AI operation                                      │
│      const result = await ai.models.generateContent(...)             │
│                                                                       │
│      // 4. Process and display results                               │
│      // Populate UI fields, log extractions                          │
│                                                                       │
│      StatusManager.show('Success!', 'success')                       │
│  } catch (error) {                                                   │
│      console.error("Operation Error:", error)                        │
│      StatusManager.show(`Failed: ${error.message}`, 'error')         │
│  } finally {                                                         │
│      // 5. Always reset processing state                             │
│      AppStateManager.setState({ isProcessing: false })               │
│      StatusManager.showLoading(false)                                │
│  }                                                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

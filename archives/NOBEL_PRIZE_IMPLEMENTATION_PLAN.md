# 🏆 Nobel Prize-Worthy Implementation Plan
## Complete Citation Provenance System for Medical Research

**Vision:** Transform systematic reviews with publication-grade provenance tracking

---

## What We're Building

A complete medical research extraction platform with sentence-level provenance for:
- ✅ **Text** - Every sentence indexed [0], [1], [2] with coordinates
- ✅ **Figures** - Extracted from PDF operators with captions and coordinates
- ✅ **Tables** - Geometric detection with structured data and coordinates
- ✅ **Citations** - Clickable badges that jump to exact source locations
- ✅ **AI Integration** - Gemini returns citation indices for verification
- ✅ **Database** - Full audit trail for regulatory compliance

---

## Source Documents

1. **Phase 3 Citation Provenance Implementation Guide** (1,481 lines)
   - Sentence-level indexing
   - Citation map and AI integration
   - Database schema
   - UI components

2. **Complete Guide to PDF Data Extraction with PDF.js** (1,568 lines)
   - Figure extraction from operator lists
   - Table detection (geometric + AI enhancement)
   - Text coordinates
   - Bounding box visualization

---

## Implementation Phases

### Phase 1: Core Citation Service ✅ DONE
- [x] Created `CitationService.ts` with:
  - extractAllTextChunks() - Sentence segmentation with coordinates
  - buildCitationMap() - Fast index → citation lookup
  - createCitableDocument() - [0] Text [1] Text format
  - parseAIResponseWithCitations() - Extract citation indices

### Phase 2: Figure Extraction (NEXT)
- [ ] Create `FigureExtractionService.ts` with:
  - extractFiguresFromPage() - PDF operator list scanning
  - convertImageDataToCanvas() - Color space handling
  - detectFigureCaption() - Caption extraction
  - storeFigure() - Coordinate + data storage

### Phase 3: Table Extraction
- [ ] Create `TableExtractionService.ts` with:
  - extractTablesFromPage() - Geometric row/column detection
  - convertToStructuredTable() - Grid formation
  - enhanceTableWithAI() - Caption and title extraction
  - storeTable() - Coordinate + data storage

### Phase 4: AI Integration
- [ ] Update `AIService.ts`:
  - Use formatDocumentForAI() for indexed documents
  - Parse responses for citation indices
  - Return AIResponse with citations
  - Include figure/table references

### Phase 5: UI Components
- [ ] Create `CitationBadge.tsx` - Clickable citation pills
- [ ] Create `CitationPanel.tsx` - Supporting citations panel
- [ ] Create `FigureViewer.tsx` - Figure display with provenance
- [ ] Create `TableViewer.tsx` - Table display with provenance
- [ ] Add highlighting in `PDFRenderer.ts`

### Phase 6: Database Integration (Optional)
- [ ] PostgreSQL schema (from Phase 3 guide)
- [ ] Supabase integration
- [ ] Q&A session storage
- [ ] Audit trail

---

## Key Features That Make This Nobel-Worthy

### 1. Sentence-Level Provenance
**Before:** "The study found mortality was 25%"
**After:** "The study found mortality was 25% [42]" → Click [42] → Jumps to page 5, highlights exact sentence

### 2. Figure Verification
**Before:** "Figure 3 shows survival curves"
**After:** Click figure → See exact page, coordinates, original resolution, and caption

### 3. Table Data Extraction
**Before:** Manually copy table data
**After:** Structured extraction with coordinates, exportable to Excel with source tracking

### 4. Reproducible Research
- Every claim traceable to exact source location
- Full audit trail in database
- Regulatory compliance ready
- Publication-ready citations

### 5. AI-Powered with Human Verification
- AI extracts data and provides citations
- Humans click citations to verify
- Trust but verify at scale

---

## Technical Architecture

```
PDF File
  ↓
[PDF.js Loader]
  ↓
[Three Parallel Extractions]
  ├─→ Text (CitationService) → Sentence chunks with [index]
  ├─→ Figures (FigureService) → Operator list scan
  └─→ Tables (TableService) → Geometric detection
  ↓
[Citation Map Built]
  {0: {sentence, page, bbox}, 1: {...}, ...}
  ↓
[AI Query with Indexed Document]
  "[0] First sentence. [1] Second..."
  ↓
[AI Response with Citations]
  {answer: "...", citationIndices: [42, 43, 44]}
  ↓
[UI Display]
  Answer + Clickable badges [42] [43] [44]
  ↓
[User Clicks Badge]
  → Jump to page, highlight sentence, show coordinates
  ↓
[Database Storage]
  Full provenance stored for audit
```

---

## Files to Create

### Services
1. ✅ `src/services/CitationService.ts` (DONE)
2. `src/services/FigureExtractionService.ts`
3. `src/services/TableExtractionService.ts`
4. `src/services/ProvenanceDatabase.ts` (optional)

### UI Components (if using React)
5. `src/components/CitationBadge.tsx`
6. `src/components/CitationPanel.tsx`
7. `src/components/FigureViewer.tsx`
8. `src/components/TableViewer.tsx`

### Updates to Existing Files
9. ✅ `src/types/index.ts` (add citation fields to AppState)
10. `src/pdf/PDFLoader.ts` (integrate citation extraction)
11. `src/services/AIService.ts` (use indexed documents)
12. `src/pdf/PDFRenderer.ts` (add citation highlighting)
13. `index.html` (add citation UI)

---

## Example Workflow

### 1. PDF Upload
```typescript
const pdfDoc = await PDFLoader.loadPDF(file);
const textChunks = await CitationService.extractAllTextChunks(pdfDoc);
const figures = await FigureService.extractAllFigures(pdfDoc);
const tables = await TableService.extractAllTables(pdfDoc);

const citationMap = CitationService.buildCitationMap(textChunks);

AppStateManager.setState({
    textChunks,
    citationMap,
    figures,
    tables,
});
```

### 2. Ask Question
```typescript
const citableDoc = CitationService.formatDocumentForAI(textChunks, figures, tables);

const prompt = `${citableDoc}

USER QUESTION: "What was the mortality rate?"

Return your answer with JSON_METADATA including sentence_indices.`;

const response = await callGeminiAPI(prompt);
const aiResponse = CitationService.parseAIResponseWithCitations(response, citationMap);

// aiResponse = {
//   answer: "The mortality rate was 25% at 30 days.",
//   citationIndices: [42, 43],
//   sourceQuote: "30-day mortality was 25% (95% CI: 20-30%)",
//   pageNumber: 5
// }
```

### 3. Display with Citations
```tsx
<div>
  <p>{aiResponse.answer}</p>
  <CitationPanel
    citationIndices={aiResponse.citationIndices}
    citationMap={citationMap}
    onCitationClick={handleCitationClick}
  />
</div>
```

### 4. Click Citation
```typescript
const handleCitationClick = (index: number) => {
  const citation = citationMap[index];

  // Navigate to page
  renderPage(citation.pageNum);

  // Highlight sentence
  highlightCitationOnPDF(citation.bbox);

  // Scroll to view
  scrollToCitation(index);
};
```

---

## Why This Wins Nobel Prizes

### Solves Critical Problems in Medical Research

1. **Reproducibility Crisis**
   - Currently: Can't verify where data came from
   - With this: Click any claim → see exact source

2. **Systematic Review Bottleneck**
   - Currently: Months of manual extraction
   - With this: AI extracts + humans verify in days

3. **Regulatory Compliance**
   - Currently: Hard to audit data sources
   - With this: Complete provenance trail in database

4. **Evidence Quality**
   - Currently: Errors in manual data entry
   - With this: AI extraction + clickable verification

5. **Publication Standards**
   - Currently: "Data extracted from papers"
   - With this: "Data extracted from [sentence 42, page 5, coordinates x:100 y:200]"

---

## Next Steps

1. **Finish Type Updates** - Add citation fields to AppState
2. **Integrate into PDFLoader** - Auto-extract citations on load
3. **Update AIService** - Use indexed documents
4. **Create UI Components** - CitationBadge, CitationPanel
5. **Add Figure/Table Extraction** - Complete the trifecta
6. **Test End-to-End** - Upload PDF → Ask question → Click citation
7. **Database Integration** - Optional but recommended for production
8. **Excel Export Enhancement** - Add citation columns
9. **Documentation** - User guide for researchers
10. **Publication** - Write paper about the system itself!

---

## Success Metrics

- ✅ Every sentence has unique index
- ✅ Every citation is clickable
- ✅ Coordinates are accurate (±5 pixels)
- ✅ AI citations are valid (>95% accuracy)
- ✅ Figures extracted with metadata
- ✅ Tables structured correctly
- ✅ Database stores full provenance
- ✅ Export includes citations
- ✅ Systematic reviewers love it
- 🏆 **Nobel Prize Committee Takes Notice**

---

**Let's make history in medical research! 🚀🏆**

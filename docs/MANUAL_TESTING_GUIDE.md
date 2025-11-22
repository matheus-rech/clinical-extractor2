# Manual Testing Guide for Clinical Extractor

## Overview

This guide provides step-by-step instructions for manually testing all features of the Clinical Extractor application with Kim2016.pdf.

## Prerequisites

1. Start the development server:
   ```bash
   cd ~/repos/la_consulta
   npm run dev
   ```

2. Open browser to: http://localhost:3000

3. Have Kim2016.pdf ready (located in `/public/Kim2016.pdf`)

---

## Test Suite

### 1. PDF Upload & Rendering

**Steps:**
1. Click "Load PDF" button or "Select PDF File" link
2. Select Kim2016.pdf from file picker
3. Wait for PDF to load

**Expected Results:**
- ✅ PDF renders in center panel
- ✅ Page counter shows "Page 1 of [total]"
- ✅ Status message: "PDF loaded successfully"
- ✅ Text layer is selectable (cursor changes to text selection)

**Evidence:** Take screenshot of loaded PDF

---

### 2. Page Navigation

**Steps:**
1. Click "Next Page" button (▶)
2. Click "Previous Page" button (◀)
3. Type page number in input box and press Enter
4. Use zoom dropdown (100%, 125%, 150%, etc.)
5. Click "Fit Width" button

**Expected Results:**
- ✅ Page navigation works smoothly
- ✅ Page number updates correctly
- ✅ Zoom changes PDF size
- ✅ Fit Width adjusts to panel width

**Evidence:** Screenshot at different zoom levels

---

### 3. Manual Text Selection & Highlighting

**Steps:**
1. Click on "Full Citation" field in left panel
2. Drag-select text from PDF (e.g., title or abstract)
3. Observe highlighting and field population

**Expected Results:**
- ✅ Selected text highlights in yellow/blue
- ✅ Field populates with selected text
- ✅ Trace log entry appears in right panel
- ✅ Extraction marker appears on PDF canvas

**Evidence:** Screenshot showing highlighted text + populated field + trace log entry

---

### 4. Form Filling (Manual)

**Steps:**
1. Navigate through all 8 form steps using "Next" button
2. Fill in various fields manually
3. Use dynamic field buttons (Add Indication, Add Intervention, etc.)
4. Verify validation (DOI, PMID, Year fields)

**Expected Results:**
- ✅ Form wizard navigation works
- ✅ Step indicator updates (Step X of 8)
- ✅ Dynamic fields can be added/removed
- ✅ Validation shows errors for invalid input

**Evidence:** Screenshots of each form step

---

### 5. AI Endpoints (FULL AI ANALYSIS)

**Steps:**
1. Ensure PDF is loaded
2. Click "FULL AI ANALYSIS" button (blue button with sparkle icon)
3. Wait for processing (15-30 seconds)
4. Check populated fields

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Status message: "Analyzing document..."
- ✅ PICO-T fields auto-populate
- ✅ Trace log shows AI extraction entries (method: "gemini-pico")
- ✅ Status message: "PICO-T fields auto-populated by Gemini!"

**Evidence:** Screenshot of populated PICO fields + trace log with AI entries

---

### 6. Table Extractor

**Steps:**
1. Click "Tables" button (blue button in Manual Tools section)
2. Wait for table detection
3. Check trace log for table entries

**Expected Results:**
- ✅ Tables detected from PDF
- ✅ Trace log shows table entries with coordinates
- ✅ Status message indicates number of tables found

**Evidence:** Screenshot of trace log with table entries

---

### 7. Figure Extractor

**Steps:**
1. Click "Figures" button (green button in Manual Tools section)
2. Wait for figure detection
3. Check trace log for figure entries

**Expected Results:**
- ✅ Figures detected from PDF
- ✅ Trace log shows figure entries
- ✅ Status message indicates number of figures found

**Evidence:** Screenshot of trace log with figure entries

---

### 8. Exact Term Search

**Steps:**
1. Click "Search Text" button in Markdown Assistant section
2. Search interface expands
3. Type search term (e.g., "cerebellar")
4. Click "Find in PDF" button
5. Observe results

**Expected Results:**
- ✅ Search interface toggles visibility
- ✅ Results display with page numbers and context
- ✅ Result count shown (e.g., "Found 5 result(s)")
- ✅ Search highlights appear on PDF (yellow overlay)

**Evidence:** Screenshot of search results + highlighted text on PDF

---

### 9. Trace Log

**Steps:**
1. Perform various extractions (manual + AI)
2. Observe right panel trace log
3. Scroll through entries

**Expected Results:**
- ✅ All extractions appear in chronological order
- ✅ Each entry shows: timestamp, field name, method, text preview
- ✅ Method tags visible (manual, gemini-pico, gemini-table, etc.)
- ✅ Entries are color-coded or styled by method

**Evidence:** Screenshot of populated trace log

---

### 10. Provenance & Citation Grounding

**Steps:**
1. Perform AI extraction
2. Click on trace log entry
3. Observe PDF navigation

**Expected Results:**
- ✅ Clicking trace entry jumps to source page
- ✅ Source text highlights on PDF
- ✅ Page number updates to match source

**Evidence:** Screenshot showing highlighted source after clicking trace entry

**Note:** This feature may require CitationService integration. If not working, mark as PARTIAL.

---

### 11. Bounding Boxes Visualization

**Steps:**
1. Look for "Show Bounding Boxes" or similar toggle button
2. Click to enable visualization
3. Observe PDF overlay

**Expected Results:**
- ✅ Bounding boxes appear over text items
- ✅ Boxes align with text at different zoom levels
- ✅ Toggle button changes state (Show/Hide)

**Evidence:** Screenshot with bounding boxes visible

**Note:** If button doesn't exist, mark as NOT IMPLEMENTED.

---

### 12. Data Persistence (LocalStorage)

**Steps:**
1. Perform several extractions
2. Note current form data
3. Refresh browser page (F5)
4. Observe data restoration

**Expected Results:**
- ✅ Extractions reload from localStorage
- ✅ Trace log repopulates
- ✅ Form data persists (if saved)
- ✅ Status message: "Loaded X extractions from storage"

**Evidence:** Screenshot before and after refresh showing same data

---

### 13. Export Form Answers (JSON)

**Steps:**
1. Fill in form data
2. Perform extractions
3. Click "Export JSON" button
4. Open downloaded file

**Expected Results:**
- ✅ JSON file downloads
- ✅ File contains formData object
- ✅ File contains extractions array
- ✅ Each extraction has: id, timestamp, fieldName, text, page, coordinates, method

**Evidence:** Screenshot of JSON file contents

---

### 14. Export Trace Logs (CSV)

**Steps:**
1. Perform multiple extractions
2. Click "Export CSV" button
3. Open downloaded file in spreadsheet

**Expected Results:**
- ✅ CSV file downloads
- ✅ Headers: ID, Timestamp, Field, Text, Page, Method, Document
- ✅ All extractions listed
- ✅ Properly escaped CSV format

**Evidence:** Screenshot of CSV opened in Excel/Google Sheets

---

### 15. Export Excel

**Steps:**
1. Click "Export Excel" button
2. Open downloaded .xlsx file

**Expected Results:**
- ✅ Excel file downloads
- ✅ Multiple sheets (Metadata, Extractions, etc.)
- ✅ Properly formatted tables

**Evidence:** Screenshot of Excel file

---

## Features NOT Implemented (Expected)

### 1. Semantic Search
- **Status:** NOT FOUND
- **Evidence:** No code for embeddings/vector search
- **Recommendation:** Would require embedding model integration

### 2. Annotation Tools UI
- **Status:** NOT FOUND
- **Evidence:** No drawing/markup interface in UI
- **Note:** "Annotated PDF export" mentioned but no interactive tools

### 3. Backend API Proxy
- **Status:** NOT IMPLEMENTED
- **Evidence:** API key exposed client-side (AIService.ts lines 37-39)
- **Security Risk:** ⚠️ API key visible in browser
- **Recommendation:** Implement backend proxy endpoint

---

## New Utilities Integrated ✅

### 1. SearchService
- **Status:** ✅ INTEGRATED
- **Location:** main.ts line 46, searchInPDF() function
- **Test:** Use "Search Text" button and verify results

### 2. LRUCache
- **Status:** ✅ INTEGRATED
- **Location:** AIService.ts line 51, getPageText() function
- **Test:** Load PDF, navigate pages, check console for eviction logs

### 3. CircuitBreaker
- **Status:** ✅ INTEGRATED
- **Location:** AIService.ts line 56, wraps generatePICO()
- **Test:** Trigger AI analysis, check console for circuit breaker logs

---

## Reporting Results

For each test:
1. Mark as **PASS** ✅ if all expected results occur
2. Mark as **PARTIAL** ⚠️ if some features work
3. Mark as **FAIL** ❌ if feature doesn't work
4. Mark as **NOT FOUND** 🔍 if feature doesn't exist

Document evidence with:
- Screenshots at each major step
- Screen recording of complete workflow
- Exported files (JSON, CSV, Excel)
- Console logs (if errors occur)

---

## Known Limitations

1. **PDF Upload:** Requires manual file picker interaction (cannot be automated)
2. **API Key:** Must be configured in .env.local for AI features
3. **Browser Compatibility:** Tested on Chrome, may vary on other browsers
4. **Performance:** Large PDFs (>100 pages) may be slow

---

## Success Criteria

**Baseline Features (Must Pass):**
- ✅ PDF upload and rendering
- ✅ Manual text selection
- ✅ Form filling
- ✅ Trace log
- ✅ Data persistence
- ✅ Export (JSON/CSV)

**AI Features (Require API Key):**
- ✅ FULL AI ANALYSIS
- ✅ PICO-T extraction
- ✅ Table/Figure extraction

**New Features (Integrated):**
- ✅ Exact term search (SearchService)
- ✅ LRU caching (performance)
- ✅ Circuit breaker (resilience)

---

## Troubleshooting

**PDF won't load:**
- Check browser console for errors
- Verify PDF.js library loaded (check Network tab)
- Try different PDF file

**AI features not working:**
- Verify GEMINI_API_KEY in .env.local
- Check browser console for API errors
- Verify internet connection

**Search not working:**
- Ensure PDF is loaded first
- Check that SearchService is imported (main.ts line 46)
- Verify search interface toggles (click "Search Text")

**Exports not downloading:**
- Check browser download settings
- Verify popup blocker not blocking downloads
- Check browser console for errors

---

## Contact

For issues or questions:
- GitHub: https://github.com/matheus-rech/la_consulta
- PR #8: https://github.com/matheus-rech/la_consulta/pull/8

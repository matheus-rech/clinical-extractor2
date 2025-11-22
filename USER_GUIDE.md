# Clinical Extractor - Comprehensive User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication System](#authentication-system)
3. [PDF Upload & Viewing](#pdf-upload--viewing)
4. [Extraction Methods](#extraction-methods)
5. [Citation & Provenance Features](#citation--provenance-features)
6. [Data Export](#data-export)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Time Setup

1. **Access the Application**
   - Open Clinical Extractor in your browser
   - The app will automatically initialize all systems
   - You'll see the main interface with a PDF upload area on the right and an 8-step extraction form on the left

2. **System Health Check**
   - Click the "System Health" button (bottom right) to verify all systems are operational
   - You should see green checkmarks for:
     - ✅ Backend API (http://localhost:8080)
     - ✅ Auth Service
     - ✅ PDF Engine (PDF.js)
     - ✅ Storage (localStorage)

3. **Load a Sample PDF** (Optional)
   - Click the "📄 Load Sample" button to load a demo medical research paper
   - This is helpful for learning how the system works

---

## Authentication System

### How Authentication Works

Clinical Extractor uses **automatic authentication** to provide seamless access to advanced features:

**✅ With Authentication (Recommended)**
- All citation features enabled
- Upload PDFs for AI-powered citation extraction
- Query citations with RAG-powered search
- Export data with citation audit trails
- Full regulatory compliance logging

**⚠️ Without Authentication (Limited Mode)**
- PDF viewing and basic extraction work normally
- Manual text highlighting and extraction available
- Local citation features (search, highlighting) work
- Citation sidebar shows: "🔒 Please log in to use citation features"
- API-dependent citation features disabled

### Setting Up Authentication

Authentication is configured via environment variables in `.env.local`:

```bash
# Backend credentials (required for citation features)
VITE_DEFAULT_USER_EMAIL=your-email@example.com
VITE_DEFAULT_USER_PASSWORD=your-secure-password

# Backend API URL
VITE_BACKEND_API_URL=http://localhost:8080
```

**Steps to Enable:**
1. Create a `.env.local` file in the project root (if not exists)
2. Add the credentials above with your chosen email/password
3. Restart the frontend workflow
4. The app will automatically register/login on startup

**Security Notes:**
- Credentials are stored securely in environment variables
- JWT tokens are used for API authentication
- Tokens expire after a configurable period (default: 24 hours)
- Never commit `.env.local` to version control

---

## PDF Upload & Viewing

### Uploading a PDF

**Method 1: Drag and Drop**
1. Drag a PDF file from your computer
2. Drop it into the "Drop PDF file here or click to browse" area
3. The PDF will load and display automatically

**Method 2: File Browser**
1. Click the "Select PDF File" button
2. Choose a PDF from your computer
3. Click "Open" to load it

**Method 3: Load Sample**
1. Click "📄 Load Sample" to load a demo paper
2. Great for testing and learning

### PDF Viewer Controls

**Navigation:**
- ◀️ **Previous Page**: Go back one page
- ▶️ **Next Page**: Go forward one page
- **Page Input**: Type a page number and press Enter to jump
- **Zoom Dropdown**: Select 50%, 75%, 100%, 125%, 150%, 200%
- **Fit Width Button**: Auto-zoom to fit page width

**Tips:**
- Use mouse wheel to scroll through pages
- Keyboard shortcuts: Arrow keys for page navigation
- Click and drag to select text (see Text Selection below)

---

## Extraction Methods

Clinical Extractor offers **three powerful extraction methods** that can be used together or separately.

### Method 1: AI-Powered Extraction (Fastest)

**🤖 FULL AI ANALYSIS** - Complete automated extraction

1. **Load Your PDF**
2. **Click "🤖 FULL AI ANALYSIS"** (purple button)
3. **Wait for AI Processing** (15-30 seconds)
   - AI reads the entire document
   - Extracts study design, patient data, outcomes, imaging
   - Generates structured data across all 8 form steps
4. **Review the Results**
   - All form fields are automatically populated
   - Each field shows a citation count badge if backed by sources
   - Navigate through steps 1-8 to review data

**What Gets Extracted:**
- ✅ Study ID (citation, DOI, PMID, journal, year, etc.)
- ✅ Patient Demographics (sample size, age, gender, conditions)
- ✅ Imaging Details (modalities, protocols, sequences)
- ✅ Surgical Procedures (techniques, approaches, complications)
- ✅ Primary/Secondary Outcomes (endpoints, results, statistics)
- ✅ Harms/Adverse Events (complications, mortality rates)

### Method 2: Manual Text Selection (Precise)

**📝 Manual Extraction** - Select specific text from the PDF

1. **Select a Form Field**
   - Click on any input field in the 8-step form
   - You'll see "Field selected: [Field Name]" message (orange banner)

2. **Highlight Text in PDF**
   - Click at the start of relevant text in the PDF
   - Drag to the end of the text
   - Release mouse button

3. **Text Automatically Extracted**
   - Selected text populates the active field
   - Citation is automatically tracked (page number, coordinates)
   - You can see the source in the Citation Sidebar

**Tips:**
- Great for correcting AI-extracted data
- Provides exact text from source
- Automatically creates citation provenance
- Works offline (no backend required)

### Method 3: Manual Tools (Specialized)

**🔬 Manual Tools** - Extract specific data types

**📊 Tables** - Extract data tables
1. Click "📊 Tables" button
2. AI detects all tables in the current page
3. Tables are highlighted with coordinates
4. Select relevant table data

**🖼️ Figures** - Extract images and figures
1. Click "🖼️ Figures" button
2. AI identifies figures, charts, images
3. Bounding boxes show detected figures
4. Great for imaging studies

**🔍 Search Text** - Find specific terms
1. Click "🔍 Search" button in Markdown Analysis panel
2. Enter search term
3. System highlights all matches across the PDF
4. Click results to jump to location

---

## Citation & Provenance Features

### Overview

Every piece of extracted data can be **traced back to its source** in the PDF. This is critical for:
- ✅ **Systematic Reviews**: Verify all extracted data
- ✅ **Regulatory Compliance**: FDA, EMA guidelines require source verification
- ✅ **Quality Assurance**: Audit trails for research integrity
- ✅ **Peer Review**: Reviewers can verify your data

### How Citations Work

**🔐 Authentication Required**: Citation features require backend authentication

**1. PDF Upload to Citation System**
1. Load a PDF in the viewer
2. Click "Show Citations" button (top right, blue)
3. Citation Sidebar opens on the right
4. Click "Upload PDF for Citations" button
5. Backend processes PDF with Google Gemini File Search API
6. PDF is chunked, indexed, and stored for queries

**What Happens Behind the Scenes:**
- PDF converted to base64 and uploaded to Gemini File Search
- Gemini creates a "store ID" for the document
- Store ID is cached in **IndexedDB** (browser database)
- Cache stores up to 10 documents for 7 days
- Old entries automatically evicted (oldest first)

**2. Querying Citations**
1. Enter a question in the Citation Sidebar query box
   - Example: "What was the sample size?"
   - Example: "What imaging modality was used?"
2. Click "Query" button
3. Backend sends query to Gemini with your PDF context
4. AI returns answer with citation sources
5. Citations show:
   - 📄 Source text snippet
   - 📍 Page number
   - 🔗 Jump link to exact location

**3. Jump to Citation Source**
1. Citation results appear in the sidebar
2. Click any citation to jump to that page
3. PDF automatically:
   - Navigates to the correct page
   - Highlights the citation text (yellow background)
   - Scrolls to the citation location

### Citation UI Features

**📊 Citation Counts**
- Extraction summary shows: "Citations: 8/15 fields"
- Each field with citations shows a badge: "✓ [3]" (3 citations)
- Green checkmark = data verified by source

**🔍 Citation Preview (Hover)**
- Hover over any citation badge
- Tooltip shows:
  - Source text (first 100 characters)
  - Page number
  - Confidence score (if available)
  - Timestamp

**📝 Auto-Citation Tracking**
- Manual text selections automatically create citations
- System tracks:
  - Selected text
  - Page number
  - Bounding box coordinates (x, y, width, height)
  - Timestamp
- No extra work required - just select and extract!

### Citation Audit Trail

**📋 Regulatory Compliance Logging**

Every citation action is logged for audit purposes:

**What's Logged:**
- 🕐 **Timestamp**: When the action occurred
- 📋 **Action Type**: Query, Upload, Jump, etc.
- 📄 **Document**: PDF filename and ID
- 💬 **Query**: The question asked (for queries)
- 📊 **Response**: AI response received
- 👤 **User**: User ID (if authenticated)

**Storage:**
- Logs stored in browser localStorage
- Maximum 10,000 entries
- Oldest entries automatically removed when limit reached
- Can be exported in Excel/CSV audit sheets

**Accessing Audit Trail:**
1. Go to System Health panel
2. Click "View Audit Trail" (if available)
3. See complete chronological log
4. Export to Excel for regulatory submissions

---

## Data Export

### Export Formats

Clinical Extractor supports **4 export formats** with full citation support:

### 1. JSON Export (Machine-Readable)

**Best for:** API integration, automated processing, archival

**How to Export:**
1. Complete your extraction
2. Click "Export" button (bottom of form)
3. Select "JSON"
4. File downloads: `clinical_extraction_[timestamp].json`

**What's Included:**
```json
{
  "studyId": {
    "citation": "Smith et al. 2024",
    "citations": [
      {
        "index": 0,
        "sentence": "We conducted a randomized trial...",
        "pageNum": 1,
        "bbox": {"x": 100, "y": 200, "width": 400, "height": 50}
      }
    ]
  }
}
```

### 2. CSV Export (Spreadsheet)

**Best for:** Excel analysis, data manipulation, simple sharing

**How to Export:**
1. Click "Export" → "CSV"
2. File downloads: `clinical_extraction_[timestamp].csv`

**What's Included:**
- All form fields as columns
- **Citation Sources** column: "Page 3: 'Sample size was 150 patients'"
- **Citation Count** column: Number of citations per field
- **Page Numbers** column: Comma-separated list (e.g., "1, 3, 7")

**Example:**
```csv
Field,Value,Citation Sources,Citation Count,Page Numbers
Sample Size,150,"Page 3: 'Sample size was 150 patients'",1,3
Study Design,RCT,"Page 1: 'randomized controlled trial'",2,"1, 2"
```

### 3. Excel Export (Advanced)

**Best for:** Professional reports, regulatory submissions, comprehensive analysis

**How to Export:**
1. Click "Export" → "Excel"
2. File downloads: `clinical_extraction_[timestamp].xlsx`

**Multiple Worksheets:**

**Sheet 1: "Extraction Data"**
- All extraction fields
- Citation counts
- Page numbers
- Source snippets

**Sheet 2: "Citation Audit"** (Regulatory Compliance)
- Complete audit trail
- Timestamp for every action
- Query history
- AI responses
- User actions
- Document information

**Sheet 3: "Metadata"** (Optional)
- Extraction date
- PDF filename
- Total pages
- User information
- System version

**Excel Features:**
- Formatted headers (bold)
- Auto-sized columns
- Frozen header row
- Cell validation (where applicable)

### 4. HTML Export (Presentation)

**Best for:** Printing, presentations, web publishing

**How to Export:**
1. Click "Export" → "HTML"
2. File downloads: `clinical_extraction_[timestamp].html`
3. Open in any browser

**What's Included:**
- Styled HTML with CSS
- Formatted sections for each step
- Citation links (clickable page numbers)
- Print-optimized layout
- Responsive design

---

## Advanced Features

### IndexedDB Caching System

**Purpose:** Avoid re-uploading PDFs you've already processed

**How It Works:**
1. When you upload a PDF for citations, the system:
   - Calculates a SHA-256 hash of the PDF content
   - Stores the Gemini File Search "store ID" in IndexedDB
   - Associates it with the PDF hash and filename

2. Next time you load the same PDF:
   - System checks IndexedDB for existing store ID
   - If found and not expired → Reuses existing index
   - If not found or expired → Re-uploads and re-indexes

**Cache Settings:**
- **Max Entries:** 10 PDFs
- **Time-to-Live (TTL):** 7 days
- **Eviction Policy:** Oldest first when limit reached
- **Storage Location:** Browser IndexedDB (survives page refresh)

**Cache Management:**
```javascript
// Check cache status (Developer Console)
const stats = await citationCache.getCacheStats()
console.log(`Cached PDFs: ${stats.totalEntries}`)

// Clear specific PDF cache
await citationCache.clearCacheEntry('document-id')

// Clear all cache
await citationCache.clearAllCache()
```

**When Cache Is Used:**
- ✅ Same PDF loaded multiple times
- ✅ Page refresh with same PDF
- ✅ PDF reopened within 7 days
- ❌ PDF content changed (new hash)
- ❌ Cache expired (> 7 days)
- ❌ Cache full (> 10 entries, oldest evicted)

### Multi-Agent AI System

Clinical Extractor uses **6 specialized AI agents** for maximum accuracy:

1. **StudyDesignExpertAgent** (92% accuracy)
   - Research methodology
   - Inclusion/exclusion criteria
   - Study type classification

2. **PatientDataSpecialistAgent** (88% accuracy)
   - Demographics
   - Baseline characteristics
   - Sample size calculations

3. **SurgicalExpertAgent** (91% accuracy)
   - Surgical procedures
   - Techniques and approaches
   - Operative details

4. **OutcomesAnalystAgent** (89% accuracy)
   - Primary/secondary outcomes
   - Statistical analysis
   - P-values and confidence intervals

5. **NeuroimagingSpecialistAgent** (92% accuracy)
   - Imaging modalities
   - Protocols and sequences
   - Imaging findings

6. **TableExtractorAgent** (100% structural validation)
   - Geometric table detection
   - Table structure parsing
   - Data cell extraction

**How Orchestration Works:**
1. AI classifies the data type (study design vs. demographics vs. outcomes)
2. Routes to appropriate specialist agent
3. Agent extracts data with confidence scoring
4. Multiple agents vote on ambiguous data (consensus)
5. Final result validated and returned

**Result:** 95-96% combined accuracy across all data types

### Error Recovery & Fault Tolerance

**Circuit Breaker Pattern:**
- Automatically retries failed API calls (max 3 attempts)
- Exponential backoff: 1s, 2s, 4s between retries
- Falls back to alternative providers if primary fails
- Prevents cascade failures

**Error Boundary:**
- Catches JavaScript crashes
- Automatically saves current work
- Offers recovery on page reload
- Prevents data loss

**Graceful Degradation:**
- Backend offline? → Frontend-only mode still works
- API quota exceeded? → Switch to Claude AI fallback
- Authentication failed? → Core features still accessible
- Network error? → Show clear error message, retry option

---

## Troubleshooting

### Common Issues

#### "No field selected" Error

**Problem:** Trying to extract text without selecting a form field first

**Solution:**
1. Click on a form field (input box) first
2. You should see an orange banner: "Field selected: [name]"
3. Then highlight text in the PDF
4. Text will populate the selected field

---

#### Citations Not Working

**Problem:** Citation sidebar shows "Please log in to use citation features"

**Solution:**
1. Check if backend is running:
   - Click "System Health" button
   - Backend API should show green ✅
2. Set authentication credentials:
   - Create/edit `.env.local` file
   - Add `VITE_DEFAULT_USER_EMAIL` and `VITE_DEFAULT_USER_PASSWORD`
   - Restart frontend workflow
3. Verify backend connection:
   - Open browser console (F12)
   - Look for "✅ Backend Connection Established"
   - Should see "✅ Authenticated with backend"

---

#### PDF Not Loading

**Problem:** "Failed to load PDF" error message

**Possible Causes:**
1. **Corrupted PDF File**
   - Try opening PDF in Adobe Reader first
   - Re-download PDF if necessary

2. **Unsupported PDF Version**
   - PDF.js supports PDF 1.0 - 2.0
   - Very new PDFs (PDF 2.1+) may not work

3. **Encrypted/Password-Protected PDF**
   - Remove password protection first
   - Use "Save As" to create unencrypted copy

4. **Large File Size**
   - Files > 50MB may be slow to load
   - Consider splitting large PDFs

**Solution:**
- Try the sample PDF first (📄 Load Sample button)
- Check browser console (F12) for detailed error messages
- Ensure browser supports modern JavaScript (Chrome 90+, Firefox 88+)

---

#### Export Button Not Working

**Problem:** Export menu doesn't appear or download fails

**Solution:**
1. **Complete at least Step 1** (Study ID) before exporting
2. **Disable popup blockers** - may prevent download
3. **Check browser permissions** - allow downloads from this site
4. **Try different format** - if Excel fails, try CSV
5. **Clear browser cache** - may have old JavaScript cached

---

#### AI Analysis Running Slowly

**Problem:** "🤖 FULL AI ANALYSIS" takes > 60 seconds

**Possible Causes:**
1. **Large PDF** (> 100 pages)
   - AI must read entire document
   - Consider extracting key pages only

2. **Complex Tables/Figures**
   - Table extraction is computationally intensive
   - Each table requires separate AI analysis

3. **API Rate Limits**
   - Gemini API has rate limits (15 requests/min free tier)
   - System automatically retries with exponential backoff

4. **Network Issues**
   - Slow internet connection
   - Backend server latency

**Solution:**
- Use manual extraction for faster results
- Extract specific sections instead of full analysis
- Check "System Health" for API status
- Upgrade to Gemini API paid tier for higher rate limits

---

#### localStorage Full Error

**Problem:** "QuotaExceededError: localStorage quota exceeded"

**Cause:** Browser localStorage limit (5-10MB) reached

**Solution:**
1. **Export your extractions** to CSV/Excel (backup)
2. **Clear old extractions:**
   ```javascript
   // In browser console (F12)
   localStorage.removeItem('clinical_extractions_simple')
   ```
3. **Reload the page**
4. **Import critical extractions** back if needed

**Prevention:**
- Export regularly (don't rely solely on localStorage)
- Delete old extractions periodically
- Consider upgrading to IndexedDB storage (future feature)

---

### System Health Diagnostics

**How to Check System Status:**

1. **Click "System Health" button** (bottom right corner)
2. **Review all components:**

   ```
   System Health
   ═════════════
   Backend API          ✅ http://localhost:8080
   Auth Service         ✅ Authenticated
   PDF Engine           ✅ PDF.js 3.11.174
   Storage              ✅ localStorage writable
   
   [12:36:07 AM] Starting System Diagnostics...
   [12:36:07 AM] ✅ LocalStorage is writable
   [12:36:07 AM] ✅ PDF.js library Version: 3.11.174
   [12:36:07 AM] ✅ Backend Connection Established
   [12:36:07 AM] ℹ️ Guest Mode (No active session)
   [12:36:07 AM] ✅ System diagnostics complete
   ```

3. **Interpret Results:**
   - ✅ **Green checkmark** = System operational
   - ⚠️ **Yellow warning** = Degraded functionality
   - ❌ **Red X** = System failure, feature unavailable

---

### Getting Help

**Resources:**
- 📖 **This User Guide** - Comprehensive reference
- 🔧 **System Health Panel** - Real-time diagnostics
- 💻 **Browser Console** (F12) - Technical error messages
- 📊 **GitHub Issues** - Report bugs or request features

**Before Reporting Issues:**
1. Check System Health panel
2. Try sample PDF to isolate issue
3. Clear browser cache and cookies
4. Test in different browser (Chrome/Firefox)
5. Check browser console for error messages

---

## Quick Reference

### Keyboard Shortcuts
- **Arrow Keys**: Navigate PDF pages
- **Ctrl+C**: Copy selected text
- **Ctrl+Z**: Undo last form change
- **Ctrl+S**: Quick save (stores in localStorage)

### Button Glossary
- 🤖 **FULL AI ANALYSIS**: Complete automated extraction
- 📊 **Tables**: Extract data tables from current page
- 🖼️ **Figures**: Detect and extract images/figures
- 🔍 **Search**: Find text across entire PDF
- 🔗 **Citations**: Toggle citation sidebar
- 💾 **Export**: Download extraction data

### Status Indicators
- 🟢 **Green badge**: Field verified with citations
- 🟡 **Yellow badge**: Field needs review
- 🔴 **Red badge**: Required field empty
- 📊 **Number badge**: Citation count (e.g., [3] = 3 citations)

---

## Best Practices

### For Systematic Reviews
1. ✅ Always upload PDF for citations before extraction
2. ✅ Use "FULL AI ANALYSIS" first, then manually verify
3. ✅ Export to Excel with Citation Audit sheet for submission
4. ✅ Review all fields with citation count < 2
5. ✅ Use manual text selection to correct AI errors

### For Regulatory Submissions
1. ✅ Enable authentication (required for audit trail)
2. ✅ Export Excel with Citation Audit sheet
3. ✅ Include page numbers in all citations
4. ✅ Verify 100% of fields have source citations
5. ✅ Keep audit logs for minimum 5 years (export regularly)

### For Research Teams
1. ✅ Use consistent form field naming across studies
2. ✅ Export to CSV for batch processing
3. ✅ Share Excel files with embedded citations
4. ✅ Document extraction methodology in notes field
5. ✅ Perform inter-rater reliability checks on 10% of extractions

---

## Appendix: Technical Specifications

### Browser Requirements
- **Chrome**: 90+ (Recommended)
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **JavaScript**: ES2022 support required
- **Storage**: 50MB+ available

### API Requirements
- **Google Gemini API**: Required for AI features
- **Backend Server**: FastAPI on port 8080
- **CORS**: Enabled for frontend domain

### Data Storage
- **localStorage**: ~5-10MB (browser dependent)
- **IndexedDB**: ~50MB quota (automatic management)
- **Session Storage**: Not used
- **Cookies**: Not used (JWT tokens in localStorage)

### Performance Benchmarks
- **PDF Load Time**: < 3 seconds (10MB file)
- **AI Analysis**: 15-45 seconds (depends on PDF complexity)
- **Manual Extraction**: Instant (< 100ms)
- **Export Generation**: < 2 seconds (any format)
- **Citation Query**: 2-5 seconds (depends on query complexity)

---

**Last Updated:** December 2024  
**Version:** 2.0  
**License:** MIT

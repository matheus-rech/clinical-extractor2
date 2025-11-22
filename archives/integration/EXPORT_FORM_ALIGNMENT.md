# Export and Form Alignment Analysis

## Overview

This document analyzes the alignment between the 8-step form structure and the export formats (JSON, CSV, Excel, HTML) to ensure data integrity and completeness.

---

## Current Export Formats

### 1. **JSON Export** (`ExportManager.exportJSON()`)

**What it includes:**
```json
{
  "version": "2.0",
  "document": "Kim2016.pdf",
  "exportDate": "2025-11-19T...",
  "totalPages": 9,
  "formData": { /* ALL form fields from 8 steps */ },
  "extractions": [ /* All extractions with coordinates + provenance */ ],
  "citationMap": { /* Citation index → source mapping */ },
  "textChunks": [ /* Indexed text for citation lookup */ ],
  "metadata": {
    "extractedFigures": 3,
    "extractedTables": 2,
    "extractionCount": 47,
    "uniqueFields": 25
  }
}
```

**Form Data Collection Method:**
- Uses `FormManager.collectFormData()`
- Queries ALL `#extraction-form input, textarea, select` elements
- Captures `el.name` or `el.id` as key, `el.value` as value
- ✅ **Captures all 8 steps** dynamically

---

### 2. **CSV Export** (`ExportManager.exportCSV()`)

**What it includes:**
```csv
Field,Text,Page,X,Y,Width,Height,Timestamp
citation,"Kim et al. 2016 cerebellar study",1,100,200,300,20,"2025-11-19..."
population,"Patients with cerebellar infarction",1,150,250,280,18,"2025-11-19..."
```

**Structure:**
- **Focused on extractions only** (not full form data)
- Includes coordinates for provenance
- Good for extraction-centric analysis

⚠️ **Limitation:** Does NOT include full form data from 8 steps
✅ **Good for:** Extraction lists, systematic reviews, meta-analysis

---

### 3. **Excel Export** (`ExportManager.exportExcel()`)

**What it includes:**

**Sheet 1: Metadata**
- Document name
- Export date
- Total pages
- Extraction count
- Unique fields

**Sheet 2: Extractions**
- Field name
- Extracted text
- Page number
- Coordinates (X, Y, Width, Height)
- Timestamp
- Method (manual/gemini-pico/etc.)

**Sheet 3: Summary**
- Overall statistics
- Field coverage
- Extraction methods breakdown

⚠️ **Missing:** Full form data from 8 steps (only extractions shown)
✅ **Good for:** Systematic reviews, data aggregation, meta-analysis

**Recommended Fix:** Add **Sheet 4: Form Data** with all 8 steps

---

### 4. **HTML Audit Report** (`ExportManager.exportAudit()`)

**What it includes:**
- Document metadata
- **Full form data** from all 8 steps
- All extractions with context
- Coordinates and timestamps

✅ **Complete:** Includes both form data AND extractions
✅ **Good for:** Publication-grade documentation, audit trails, verification

---

## Form Structure (8 Steps)

### Step 1: Study Identification
- Citation
- DOI
- PMID
- Year
- Journal
- Country

### Step 2: Eligibility / PICO-T
- Population
- Intervention
- Comparator
- Outcomes
- Timing
- Study Type

### Step 3: Study Quality
- Quality Score
- Bias Assessment
- Inclusion Criteria
- Exclusion Criteria

### Step 4: Baseline Characteristics
- Sample Size (N)
- Age (mean ± SD)
- Sex (% male)
- Baseline mRS
- Other baseline data

### Step 5: Indications for Surgery
- **Dynamic fields** (add/remove)
- Indication 1, 2, 3... (user-defined count)

### Step 6: Interventions
- **Dynamic fields** (add/remove)
- Intervention descriptions
- Study arms (dropdown updates dynamically)

### Step 7: Outcomes
- **Dynamic fields** (add/remove)
- Mortality timepoints
- mRS distributions
- Functional outcomes

### Step 8: Complications & Predictors
- **Dynamic fields** (add/remove)
- Complication types
- Predictor variables
- Effect sizes

---

## Data Alignment Verification

### ✅ **What Works Well:**

1. **JSON Export:** ✅ Complete
   - Captures ALL form fields via `collectFormData()`
   - Includes ALL extractions with provenance
   - Includes citation map and metadata
   - **Perfect for systematic reviews**

2. **HTML Audit:** ✅ Complete
   - Shows all form data
   - Shows all extractions
   - Human-readable format
   - **Perfect for publication documentation**

3. **Dynamic Form Collection:** ✅ Works
   - `querySelector('#extraction-form input, textarea, select')` captures ALL fields
   - Handles dynamic fields (indications, interventions, arms, etc.)
   - Uses `el.name || el.id` so works with any field

### ⚠️ **What Needs Improvement:**

1. **CSV Export:** ⚠️ Incomplete
   - **Issue:** Only shows extractions, not full form data
   - **Impact:** Can't export complete study data for analysis
   - **Recommendation:** Add form data columns or create separate CSV

2. **Excel Export:** ⚠️ Incomplete
   - **Issue:** Missing form data sheet (only extractions)
   - **Impact:** Users have to manually enter form data for meta-analysis
   - **Recommendation:** Add **Sheet 4: Form Data** with all 8 steps structured

---

## Recommendations

### Priority 1: Add Form Data to Excel Export ⭐ HIGH

Add a new sheet "Form Data" with structured form information:

```typescript
// In ExportManager.exportExcel()
const formDataSheet = XLSX.utils.json_to_sheet([{
    'Citation': formData.citation || '',
    'DOI': formData.doi || '',
    'PMID': formData.pmid || '',
    'Year': formData.year || '',
    'Journal': formData.journal || '',
    'Country': formData.country || '',
    'Population': formData.population || '',
    'Intervention': formData.intervention || '',
    'Comparator': formData.comparator || '',
    'Outcomes': formData.outcomes || '',
    'Timing': formData.timing || '',
    'Study Type': formData.study_type || '',
    'Sample Size': formData.sample_size || '',
    'Age Mean': formData.age_mean || '',
    'Sex % Male': formData.sex_male_percent || '',
    // ... all other fields
}]);

wb.Sheets['Form Data'] = formDataSheet;
wb.SheetNames.push('Form Data');
```

**Benefit:** Complete data export for meta-analysis tools (RevMan, R meta, Stata)

### Priority 2: Enhanced CSV Export ⭐ MEDIUM

Create two CSV export options:

1. **Extractions CSV** (current) - For extraction lists
2. **Complete CSV** (new) - Full form data + extractions

```typescript
exportCompleteCSV: function() {
    const formData = FormManager.collectFormData();
    const extractions = ExtractionTracker.getExtractions();

    // Create wide-format CSV with one row per study
    let csv = 'Citation,DOI,PMID,Year,Population,Intervention,...\n';
    csv += `"${formData.citation}","${formData.doi}","${formData.pmid}",...\n`;

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadFile(blob, `complete_data_${Date.now()}.csv`);
}
```

**Benefit:** Direct import into Excel/R/Python for analysis

### Priority 3: Validate Form-Export Consistency ⭐ LOW

Add validation to ensure all form fields are exported:

```typescript
validateExport: function() {
    const formData = FormManager.collectFormData();
    const expectedFields = [
        'citation', 'doi', 'pmid', 'year', 'journal', 'country',
        'population', 'intervention', 'comparator', 'outcomes', 'timing', 'study_type',
        // ... all 8 steps
    ];

    const missing = expectedFields.filter(field => !formData[field]);
    if (missing.length > 0) {
        console.warn('Missing fields in export:', missing);
    }

    return missing.length === 0;
}
```

---

## Current Status Summary

| Export Format | Form Data | Extractions | Provenance | Metadata | Status |
|---------------|-----------|-------------|------------|----------|--------|
| **JSON** | ✅ Complete | ✅ Complete | ✅ Yes | ✅ Yes | Perfect |
| **CSV** | ❌ Missing | ✅ Complete | ✅ Yes | ❌ No | Needs Fix |
| **Excel** | ❌ Missing | ✅ Complete | ✅ Yes | ✅ Yes | Needs Fix |
| **HTML Audit** | ✅ Complete | ✅ Complete | ✅ Yes | ✅ Yes | Perfect |

---

## Test Coverage Needed

The export test suite (`06-export-functionality.spec.ts`) should verify:

1. ✅ **JSON includes all form fields** from 8 steps
2. ⚠️ **CSV includes all extractions** (currently only extractions)
3. ⚠️ **Excel includes form data sheet** (currently missing)
4. ✅ **HTML audit includes everything** (verified)
5. **Field count validation** (ensure no fields missing)
6. **Dynamic field handling** (indications, interventions, arms)

---

## Conclusion

### ✅ **What's Working:**
- Data collection via `collectFormData()` is **complete** and captures all 8 steps
- JSON export is **perfect** for systematic reviews
- HTML audit is **complete** for publication documentation
- Dynamic fields are handled correctly

### ⚠️ **What Needs Improvement:**
- **Excel export** should include a "Form Data" sheet for meta-analysis workflows
- **CSV export** could offer a "complete data" option beyond just extractions
- **Validation** should ensure no fields are missing

### 🎯 **Priority Action Items:**
1. Add "Form Data" sheet to Excel export (HIGH)
2. Create "Complete CSV" export option (MEDIUM)
3. Add export validation tests (LOW)

---

**Assessment:** The current architecture is **solid** but could be **enhanced** for better meta-analysis workflows by including full form data in Excel/CSV exports. JSON and HTML audit reports are already complete.

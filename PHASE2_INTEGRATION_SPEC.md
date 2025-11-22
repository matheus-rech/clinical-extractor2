# Phase 2 Integration Specification

**Frontend-Backend Integration Guide for AIService.ts**

---

## Overview

This document provides the exact API specifications needed to integrate the frontend `AIService.ts` with the backend API proxy. Use this as a reference when implementing Phase 2.

---

## Authentication

### Get JWT Token

All AI endpoints require JWT authentication. Obtain token via:

**Endpoint:** `POST /api/auth/login`

**Request:**
```typescript
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { access_token } = await response.json();
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Use Token in Requests

```typescript
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

---

## Endpoint Mappings

### 1. Generate PICO

**Frontend Function:** `AIService.generatePICO()`

**Backend Endpoint:** `POST /api/ai/generate-pico`

**Request Format:**
```typescript
const response = await fetch('http://localhost:8000/api/ai/generate-pico', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    document_id: documentId,  // Optional, for tracking
    pdf_text: pdfText          // Full PDF text
  })
});
```

**Response Format:**
```typescript
interface PICOResponse {
  population: string;      // "Patients with acute cerebellar stroke"
  intervention: string;    // "Decompressive craniectomy"
  comparator: string;      // "Conservative medical management"
  outcomes: string;        // "90-day mortality, mRS scores"
  timing: string;          // "2015-2020, 90-day follow-up"
  study_type: string;      // "Randomized controlled trial"
}
```

**Frontend Implementation:**
```typescript
export async function generatePICO(): Promise<void> {
  const state = AppStateManager.getState();

  if (!state.pdfDoc) {
    StatusManager.show('Please load a PDF first', 'error');
    return;
  }

  if (state.isProcessing) {
    StatusManager.show('Already processing...', 'warning');
    return;
  }

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Generating PICO-T summary...', 'info');
    StatusManager.showLoading(true);

    // Get full PDF text
    const pdfText = await getPDFText(state.pdfDoc);

    // Call backend API
    const response = await fetch('http://localhost:8000/api/ai/generate-pico', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        pdf_text: pdfText
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const result: PICOResponse = await response.json();

    // Populate form fields (same as before)
    const populateField = (id: string, value: string) => {
      const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        element.value = value;
        ExtractionTracker.logExtraction(id, value, 0, {x:0, y:0, width:0, height:0}, 'backend-pico');
      }
    };

    populateField('population', result.population);
    populateField('intervention', result.intervention);
    populateField('comparator', result.comparator);
    populateField('outcomes', result.outcomes);
    populateField('timing', result.timing);
    populateField('study-type', result.study_type);

    StatusManager.show('PICO-T summary generated successfully!', 'success');
  } catch (error) {
    console.error('PICO generation failed:', error);
    StatusManager.show(`Failed to generate PICO-T: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
    StatusManager.showLoading(false);
  }
}
```

---

### 2. Generate Summary

**Frontend Function:** `AIService.generateSummary()`

**Backend Endpoint:** `POST /api/ai/generate-summary`

**Request:**
```typescript
{
  document_id: string;
  pdf_text: string;
}
```

**Response:**
```typescript
{
  summary: string;  // "This randomized controlled trial evaluated..."
}
```

**Frontend Implementation:**
```typescript
export async function generateSummary(): Promise<void> {
  const state = AppStateManager.getState();

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Generating summary...', 'info');

    const pdfText = await getPDFText(state.pdfDoc);

    const response = await fetch('http://localhost:8000/api/ai/generate-summary', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        pdf_text: pdfText
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const { summary } = await response.json();

    // Display summary
    const summaryElement = document.getElementById('ai-summary-output');
    if (summaryElement) {
      summaryElement.textContent = summary;
    }

    StatusManager.show('Summary generated!', 'success');
  } catch (error) {
    console.error('Summary generation failed:', error);
    StatusManager.show(`Failed: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
  }
}
```

---

### 3. Validate Field

**Frontend Function:** `AIService.validateFieldWithAI(fieldId)`

**Backend Endpoint:** `POST /api/ai/validate-field`

**Request:**
```typescript
{
  document_id: string;
  field_id: string;      // "sample_size", "mortality_rate", etc.
  field_value: string;   // "150", "35%", etc.
  pdf_text: string;
}
```

**Response:**
```typescript
{
  is_supported: boolean;  // true if value found in document
  quote: string;          // "We enrolled 150 patients with..."
  confidence: number;     // 0.0-1.0
}
```

**Frontend Implementation:**
```typescript
export async function validateFieldWithAI(fieldId: string): Promise<void> {
  const fieldElement = document.getElementById(fieldId) as HTMLInputElement;
  if (!fieldElement || !fieldElement.value) {
    StatusManager.show('Please enter a value to validate', 'warning');
    return;
  }

  const state = AppStateManager.getState();

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show(`Validating ${fieldId}...`, 'info');

    const pdfText = await getPDFText(state.pdfDoc);

    const response = await fetch('http://localhost:8000/api/ai/validate-field', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        field_id: fieldId,
        field_value: fieldElement.value,
        pdf_text: pdfText
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    // Display validation result
    const resultHTML = `
      <div class="validation-result ${result.is_supported ? 'supported' : 'not-supported'}">
        <p><strong>Validation Result:</strong> ${result.is_supported ? '✅ Supported' : '❌ Not Supported'}</p>
        <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</p>
        <p><strong>Quote:</strong> "${result.quote}"</p>
      </div>
    `;

    const validationContainer = document.getElementById('validation-results');
    if (validationContainer) {
      validationContainer.innerHTML = resultHTML;
    }

    StatusManager.show('Validation complete!', 'success');
  } catch (error) {
    console.error('Validation failed:', error);
    StatusManager.show(`Failed: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
  }
}
```

---

### 4. Find Metadata

**Frontend Function:** `AIService.findMetadata()`

**Backend Endpoint:** `POST /api/ai/find-metadata`

**Request:**
```typescript
{
  document_id: string;
  pdf_text: string;  // First 5000 characters
}
```

**Response:**
```typescript
{
  doi: string | null;      // "10.1001/neurosurgery.2020.12345"
  pmid: string | null;     // "12345678"
  journal: string | null;  // "Neurosurgery"
  year: number | null;     // 2020
}
```

**Frontend Implementation:**
```typescript
export async function findMetadata(): Promise<void> {
  const state = AppStateManager.getState();

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Searching for metadata...', 'info');

    const pdfText = await getPDFText(state.pdfDoc);
    const firstPage = pdfText.substring(0, 5000);

    const response = await fetch('http://localhost:8000/api/ai/find-metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        pdf_text: firstPage
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const metadata = await response.json();

    // Populate metadata fields
    if (metadata.doi) {
      const doiElement = document.getElementById('doi') as HTMLInputElement;
      if (doiElement) {
        doiElement.value = metadata.doi;
        ExtractionTracker.logExtraction('doi', metadata.doi, 0, {x:0,y:0,width:0,height:0}, 'backend-metadata');
      }
    }

    if (metadata.pmid) {
      const pmidElement = document.getElementById('pmid') as HTMLInputElement;
      if (pmidElement) {
        pmidElement.value = metadata.pmid;
        ExtractionTracker.logExtraction('pmid', metadata.pmid, 0, {x:0,y:0,width:0,height:0}, 'backend-metadata');
      }
    }

    StatusManager.show('Metadata found!', 'success');
  } catch (error) {
    console.error('Metadata search failed:', error);
    StatusManager.show(`Failed: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
  }
}
```

---

### 5. Extract Tables

**Frontend Function:** `AIService.handleExtractTables()`

**Backend Endpoint:** `POST /api/ai/extract-tables`

**Request:**
```typescript
{
  document_id: string;
  pdf_text: string;
}
```

**Response:**
```typescript
{
  tables: Array<{
    title: string;        // "Table 1: Baseline Characteristics"
    description: string;  // "Patient demographics and clinical features"
    data: string[][];     // [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]]
  }>;
}
```

**Frontend Implementation:**
```typescript
export async function handleExtractTables(): Promise<void> {
  const state = AppStateManager.getState();

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Extracting tables...', 'info');

    const pdfText = await getPDFText(state.pdfDoc);

    const response = await fetch('http://localhost:8000/api/ai/extract-tables', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        pdf_text: pdfText
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const { tables } = await response.json();

    // Render tables as HTML
    const tableContainer = document.getElementById('tables-output');
    if (tableContainer) {
      tableContainer.innerHTML = tables.map((table, idx) => `
        <div class="extracted-table">
          <h3>${table.title}</h3>
          <p>${table.description}</p>
          <table>
            ${table.data.map((row, rowIdx) => `
              <tr>
                ${row.map(cell =>
                  rowIdx === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`
                ).join('')}
              </tr>
            `).join('')}
          </table>
        </div>
      `).join('');
    }

    StatusManager.show(`Extracted ${tables.length} tables!`, 'success');
  } catch (error) {
    console.error('Table extraction failed:', error);
    StatusManager.show(`Failed: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
  }
}
```

---

### 6. Analyze Image

**Frontend Function:** `AIService.handleImageAnalysis()`

**Backend Endpoint:** `POST /api/ai/analyze-image`

**Request:**
```typescript
{
  document_id: string;
  image_base64: string;  // "data:image/png;base64,iVBORw0KG..."
  prompt: string;        // "Describe the findings in this CT scan"
}
```

**Response:**
```typescript
{
  analysis: string;  // "This CT scan shows a large cerebellar infarction..."
}
```

**Frontend Implementation:**
```typescript
export async function handleImageAnalysis(): Promise<void> {
  const imageInput = document.getElementById('image-upload') as HTMLInputElement;
  const promptInput = document.getElementById('image-prompt') as HTMLInputElement;

  if (!imageInput.files || !imageInput.files[0]) {
    StatusManager.show('Please upload an image first', 'warning');
    return;
  }

  const state = AppStateManager.getState();

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Analyzing image...', 'info');

    // Convert image to base64
    const file = imageInput.files[0];
    const reader = new FileReader();
    const imageBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('http://localhost:8000/api/ai/analyze-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        image_base64: imageBase64,
        prompt: promptInput.value || 'Analyze this medical image'
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const { analysis } = await response.json();

    // Display analysis
    const analysisContainer = document.getElementById('image-analysis-output');
    if (analysisContainer) {
      analysisContainer.textContent = analysis;
    }

    StatusManager.show('Image analyzed!', 'success');
  } catch (error) {
    console.error('Image analysis failed:', error);
    StatusManager.show(`Failed: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
  }
}
```

---

### 7. Deep Analysis

**Frontend Function:** `AIService.handleDeepAnalysis()`

**Backend Endpoint:** `POST /api/ai/deep-analysis`

**Request:**
```typescript
{
  document_id: string;
  pdf_text: string;
  prompt: string;  // "Critically evaluate the study methodology"
}
```

**Response:**
```typescript
{
  analysis: string;  // "This study provides strong evidence..."
}
```

**Frontend Implementation:**
```typescript
export async function handleDeepAnalysis(): Promise<void> {
  const promptInput = document.getElementById('deep-analysis-prompt') as HTMLInputElement;

  if (!promptInput.value) {
    StatusManager.show('Please enter an analysis prompt', 'warning');
    return;
  }

  const state = AppStateManager.getState();

  try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Performing deep analysis...', 'info');

    const pdfText = await getPDFText(state.pdfDoc);

    const response = await fetch('http://localhost:8000/api/ai/deep-analysis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: state.documentId || 'unknown',
        pdf_text: pdfText,
        prompt: promptInput.value
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const { analysis } = await response.json();

    // Display analysis
    const analysisContainer = document.getElementById('deep-analysis-output');
    if (analysisContainer) {
      analysisContainer.innerHTML = `<pre>${analysis}</pre>`;
    }

    StatusManager.show('Deep analysis complete!', 'success');
  } catch (error) {
    console.error('Deep analysis failed:', error);
    StatusManager.show(`Failed: ${error.message}`, 'error');
  } finally {
    AppStateManager.setState({ isProcessing: false });
  }
}
```

---

## Helper Functions

### Get Auth Token

```typescript
function getAuthToken(): string {
  // Get from localStorage or session storage
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated. Please log in first.');
  }
  return token;
}
```

### Get Full PDF Text

```typescript
async function getPDFText(pdfDoc: any): Promise<string> {
  const state = AppStateManager.getState();

  // Check cache first
  const cached = state.pdfTextCache.get(pdfDoc);
  if (cached) {
    return cached.fullText;
  }

  // Extract text from all pages
  let fullText = '';
  for (let i = 1; i <= state.totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Frontend Action |
|------|---------|----------------|
| 200 | Success | Display result |
| 401 | Unauthorized | Redirect to login |
| 413 | Payload Too Large | Show size error |
| 422 | Validation Error | Show validation message |
| 429 | Rate Limit | Show retry message |
| 500 | Server Error | Show error, log details |
| 502 | Bad Gateway | Show provider error |
| 503 | Service Unavailable | Show maintenance message |

### Error Handling Pattern

```typescript
try {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Unauthorized - redirect to login
    StatusManager.show('Session expired. Please log in again.', 'error');
    window.location.href = '/login';
    return;
  }

  if (response.status === 429) {
    // Rate limited
    StatusManager.show('Too many requests. Please wait a minute.', 'warning');
    return;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  // Process successful response

} catch (error) {
  console.error('API call failed:', error);
  StatusManager.show(`Failed: ${error.message}`, 'error');
}
```

---

## Environment Variables

### Frontend `.env.local`

```bash
# Backend API URL
VITE_BACKEND_URL=http://localhost:8000

# Remove this (no longer needed in frontend)
# VITE_GEMINI_API_KEY=...
```

### Backend `.env`

```bash
# API keys (server-side only)
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional

# JWT configuration
JWT_SECRET_KEY=your_jwt_secret_here
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (allow frontend origin)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Testing Integration

### Manual Testing Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend dev server running
- [ ] Can log in and get JWT token
- [ ] Token stored in localStorage
- [ ] Can call `/api/ai/generate-pico` successfully
- [ ] Can call all 7 AI endpoints
- [ ] Error handling works (401, 429, 500)
- [ ] Rate limiting enforced after 10 requests

### Integration Test Example

```typescript
describe('AIService Backend Integration', () => {
  it('should generate PICO via backend', async () => {
    const token = await login('test@example.com', 'password');
    localStorage.setItem('auth_token', token);

    await generatePICO();

    expect(document.getElementById('population').value).toBeTruthy();
    expect(document.getElementById('intervention').value).toBeTruthy();
  });
});
```

---

## Migration Checklist

- [ ] Create `BackendAIClient.ts` wrapper
- [ ] Update `AIService.ts` to use backend
- [ ] Remove `API_KEY` from frontend
- [ ] Add authentication helper functions
- [ ] Update error handling for HTTP errors
- [ ] Remove `VITE_GEMINI_API_KEY` from `.env.local`
- [ ] Add `VITE_BACKEND_URL` to `.env.local`
- [ ] Update all 7 AI functions
- [ ] Add integration tests
- [ ] Test rate limiting
- [ ] Test fallback provider
- [ ] Update documentation

---

**Ready for Phase 2 Implementation**

Use this specification as your reference guide when migrating the frontend to use the backend API proxy.

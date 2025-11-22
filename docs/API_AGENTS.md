# AGENTS.md

> **Note to AI Assistants**: This file is your primary source of truth for understanding the `Clinical Extractor` codebase. Read this before making changes.

## 1. Project Context
**Clinical Extractor** is a specialized web application for systematic review of medical research papers. It bridges the gap between manual data extraction and AI automation.
- **Core Function**: Extract structured data (PICO-T, demographics, outcomes) from PDF research papers.
- **Key Differentiator**: "Citation Provenance" - every extracted fact is linked to specific sentence coordinates in the PDF.
- **Users**: Medical researchers, neurosurgeons, systematic reviewers.

## 2. Technology Stack
- **Runtime**: Node.js (v16+)
- **Language**: TypeScript (Strict mode)
- **Framework**: Vite (Frontend tooling), Vanilla DOM manipulation (No React/Vue/Angular for core logic, though JSX is configured)
- **PDF Engine**: PDF.js (Custom rendering layer)
- **AI**: Google GenAI SDK (Gemini 2.5-flash, 2.5-pro)
- **Backend**: Python FastAPI (Optional, for advanced features)
- **Testing**: Jest (Unit), Custom E2E
- **Styling**: Vanilla CSS (`index.css`)

## 3. Architecture & Patterns
The codebase follows a **Modular Service-Oriented Architecture** with **Observer-based State Management**.

### 3.1 Core Patterns
- **Singleton State**: `AppStateManager` is the single source of truth. Do not create local state if it needs to be shared.
- **Dependency Injection**: Services are injected to avoid circular dependencies. Use `setDependencies()` methods.
- **Observer Pattern**: Components subscribe to `AppStateManager` changes.
- **Circuit Breaker**: All external API calls (Gemini, Backend) must be wrapped in `CircuitBreaker` or `BackendProxyService`.
- **Error Boundary**: Global error handling preserves state in `localStorage` on crash.

### 3.2 Directory Structure (`src/`)
| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `main.ts` | Entry point | Orchestrates init sequence, DI setup |
| `state/` | State Management | `AppStateManager.ts` |
| `services/` | Business Logic | `AIService.ts`, `AgentOrchestrator.ts`, `CitationService.ts` |
| `pdf/` | PDF Handling | `PDFLoader.ts`, `PDFRenderer.ts` |
| `forms/` | UI Logic | `FormManager.ts`, `DynamicFields.ts` |
| `data/` | Persistence | `ExtractionTracker.ts` |
| `utils/` | Helpers | `errorBoundary.ts`, `CircuitBreaker.ts` |

## 4. Development Rules

### 4.1 Code Style
- **Strict TypeScript**: No `any` unless absolutely necessary. Define interfaces in `src/types/index.ts`.
- **Async/Await**: Prefer async/await over raw promises.
- **Error Handling**: Use `try/catch` blocks and log errors via `console.error` (which is captured by Error Boundary).

### 4.2 State Management
**DO NOT** modify DOM directly for state that affects other components.
**DO**:
```typescript
// Update state
AppStateManager.setState({ isProcessing: true });

// Listen for changes
AppStateManager.subscribe(state => {
  if (state.isProcessing) showSpinner();
});
```

### 4.3 AI Integration
- Use `AIService` for all GenAI calls.
- **Models**:
    - `gemini-2.5-flash`: Fast tasks (PICO, Metadata).
    - `gemini-2.5-pro`: Complex reasoning, Tables, Validation.
- **Prompting**: Keep prompts in `AGENT_PROMPTS_REFERENCE.md` or within the service methods if dynamic.

### 4.4 Adding New Features
1.  **Define Interface**: Add types to `src/types/index.ts`.
2.  **Create Service**: Create `src/services/YourFeatureService.ts`.
3.  **Register**: Initialize in `src/main.ts` and inject dependencies.
4.  **UI**: Hook into DOM elements in `src/main.ts` or specific manager.

## 5. Key Workflows

### 5.1 Multi-Agent Pipeline
Located in `src/services/AgentOrchestrator.ts`.
- **Agents**: Study Design, Patient Data, Surgical, Outcomes, Neuroimaging, Table.
- **Flow**: Triggered by user or auto-analysis -> Orchestrator delegates to specific Agent -> Agent calls Gemini -> Result merged into State.

### 5.2 Citation Provenance
Located in `src/services/CitationService.ts`.
- **Indexing**: PDF text is indexed by sentence `[0]`, `[1]`.
- **Mapping**: `CitationMap` links Index -> PDF Coordinates.
- **Usage**: AI output must include `[index]` tags to be valid.

## 6. Testing
- **Unit**: `npm test` (Jest). Write tests for all new services in `tests/unit/`.
- **E2E**: `tests/e2e/`.
- **Manual**: Use `npm run dev` and test with sample PDFs.

## 7. Common Pitfalls
- **Circular Dependencies**: Watch out when importing between Services and State. Use DI.
- **PDF.js Workers**: Worker configuration is fragile. Ensure `pdf.worker.mjs` is correctly loaded in `main.ts`.
- **Gemini Quotas**: Handle 429 errors gracefully (built-in to `BackendProxyService`).

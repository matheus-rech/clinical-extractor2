# Top 10 Issues - Clinical Extractor

## ISSUE #1: High-Severity Security Vulnerabilities in xlsx Package

SEVERITY: Critical  
CATEGORY: Security

DESCRIPTION:
The xlsx package (v0.18.5) has 2 high-severity vulnerabilities: Prototype Pollution (GHSA-4r6h-8v6p-xvw6, CVSS 7.8) and Regular Expression Denial of Service/ReDoS (GHSA-5pgg-2g8v-p4x9, CVSS 7.5). These vulnerabilities could allow attackers to inject malicious properties into objects or cause application crashes through crafted input. The npm audit report indicates no fix is currently available for the installed version.

LOCATION:
File: package.json  
Lines: 13 (dependency declaration)  
Affected: ExportManager.ts (uses xlsx for Excel export)

IMPACT:
Users uploading malicious PDF files or triggering Excel exports with crafted data could exploit these vulnerabilities to compromise the application, cause denial of service, or potentially execute arbitrary code. This is especially critical for a medical data extraction tool handling sensitive clinical information.

SUGGESTED FIX:
Upgrade xlsx to version 0.20.2 or later which patches both vulnerabilities. If upgrade breaks compatibility, consider alternative libraries like exceljs or xlsx-populate. Test Excel export functionality thoroughly after upgrade. As a temporary mitigation, add input validation before Excel export and consider disabling Excel export until patched.

EFFORT ESTIMATE: 4-8 hours (including testing)

---

## ISSUE #2: 20 TypeScript Compilation Errors Blocking Type Safety

SEVERITY: High  
CATEGORY: Code Quality

DESCRIPTION:
TypeScript compilation fails with 20 errors across 8 files. Major issues include: type mismatches in Window interface declarations (MemoryManager, handleSubmitToGoogleSheets), missing import.meta.env type definitions (5 errors in AIService.ts), incorrect pdfTextCache type (string vs object), and type mismatches in ExportManager coordinate exports (number vs string). These errors indicate the codebase cannot be properly type-checked, defeating the purpose of using TypeScript.

LOCATION:
Files affected:
- src/forms/FormManager.ts:18,19 (Window interface conflicts)
- src/main.ts:684 (unknown property extractFiguresFromPDF)
- src/pdf/PDFLoader.ts:36 (pdfjsLib type conflict)
- src/pdf/PDFRenderer.ts:255 (SearchMarker[] vs HTMLElement[])
- src/services/AIService.ts:37,38,39,65,87 (import.meta.env, cache type)
- src/services/ExportManager.ts:113-118 (number vs string)
- src/services/MedicalAgentBridge.ts:100 (import.meta.env)
- src/types/index.ts:255,257,259,261 (Window interface conflicts)

IMPACT:
Type safety is completely compromised. Developers cannot catch type errors at compile time, leading to runtime errors. IDE autocomplete and refactoring tools don't work properly. The build process likely fails or requires --skipLibCheck flag, hiding real issues.

SUGGESTED FIX:
1. Add vite/client types: `/// <reference types="vite/client" />` at top of files using import.meta.env
2. Fix pdfTextCache type in AppState to `Map<number, {fullText: string, items: any[]}>`
3. Consolidate Window interface declarations into single declaration file
4. Fix SearchMarker type to extend HTMLElement or change clearSearchMarkers signature
5. Fix ExportManager coordinate types to match Extraction interface
6. Add extractFiguresFromPDF to Window interface type definition

EFFORT ESTIMATE: 1-2 days

---

## ISSUE #3: Missing Google Sheets Service Implementation

SEVERITY: High  
CATEGORY: Architecture

DESCRIPTION:
The CLAUDE.md documentation extensively describes Google Sheets integration with OAuth 2.0 authentication, submission to "Submissions" and "Extractions" sheets, and a handleSubmitToGoogleSheets function. However, no GoogleSheetsService.ts file exists in src/services/. The function is declared in Window interface but not implemented. This is a documented feature that doesn't exist.

LOCATION:
File: Missing src/services/GoogleSheetsService.ts  
Referenced in: CLAUDE.md, GOOGLESHEETS_SERVICE_SUMMARY.md, index.tsx (Window interface)  
Expected usage: Form submission, extraction export

IMPACT:
Users expecting to submit data to Google Sheets will encounter errors. The "Submit to Google Sheets" button (if present in UI) will fail. This breaks a key workflow for systematic reviews where researchers need to aggregate data from multiple papers. Documentation promises functionality that doesn't exist, creating user frustration.

SUGGESTED FIX:
Either: (1) Implement GoogleSheetsService.ts following the documented specification with OAuth 2.0 flow, gapi.client initialization, and append operations to Submissions/Extractions sheets, OR (2) Remove all Google Sheets references from documentation and UI if this feature is deprecated. If implementing, use the Google Sheets API v4 with proper error handling and token refresh.

EFFORT ESTIMATE: 2-3 days (full implementation) or 2 hours (removal)

---

## ISSUE #4: ESLint and ts-prune Tools Timeout/Hang

SEVERITY: Medium  
CATEGORY: Performance / Code Quality

DESCRIPTION:
Both ESLint and ts-prune commands timeout after 60-120 seconds without producing results. This indicates either misconfiguration, missing configuration files, or performance issues with the codebase structure. These tools are essential for code quality checks and should complete in seconds for a 6,313-line codebase.

LOCATION:
Files: Missing or misconfigured .eslintrc.* and ts-prune configuration  
Commands tested: `npx eslint src/`, `npx ts-prune`  
Results: Both timeout without output

IMPACT:
Developers cannot run automated code quality checks. Unused exports accumulate, code style inconsistencies grow, and potential bugs go undetected. CI/CD pipelines cannot include these checks. The codebase quality degrades over time without automated enforcement.

SUGGESTED FIX:
1. Check if .eslintrc.json or .eslintrc.js exists; create if missing with TypeScript-aware config
2. Add eslint-config-typescript and required plugins to devDependencies
3. Configure ESLint to ignore node_modules and build outputs
4. Test ts-prune with --skip flag to identify problematic files
5. Consider using @typescript-eslint/parser and @typescript-eslint/eslint-plugin
6. Add lint script to package.json: `"lint": "eslint src/ --ext .ts"`

EFFORT ESTIMATE: 4-6 hours

---

## ISSUE #5: Form Validation Completely Disabled

SEVERITY: Medium  
CATEGORY: UX / Code Quality

DESCRIPTION:
FormManager.ts lines 676-703 contain commented-out validation logic for the 8-step wizard. Users can navigate between steps without completing required fields. The CLAUDE.md documentation explicitly notes "Multi-step navigation with validation (currently disabled)". This allows incomplete or invalid data to be submitted.

LOCATION:
File: src/forms/FormManager.ts  
Lines: 676-703 (commented validation code)  
Function: Navigation between form steps

IMPACT:
Users can skip required fields, submit incomplete data, and export invalid extractions. For a clinical data extraction tool used in systematic reviews, data quality is paramount. Missing validation leads to incomplete datasets, wasted researcher time, and potentially flawed meta-analyses. The 8-step wizard provides no guidance on required fields.

SUGGESTED FIX:
Uncomment and test the validation logic in FormManager.ts. Add visual indicators for required fields (asterisks, red borders). Implement field-level validation with clear error messages. Add a "Save Draft" option to allow partial completion. Test validation rules for each of the 8 steps. Consider progressive disclosure: show validation errors only after user attempts to proceed.

EFFORT ESTIMATE: 1-2 days (including UX design and testing)

---

## ISSUE #6: Hardcoded File Paths in AgentOrchestrator

SEVERITY: Medium  
CATEGORY: Architecture / Portability

DESCRIPTION:
AgentOrchestrator.ts constructor (lines 73-74) contains hardcoded absolute paths to Python agent files on a specific developer's machine: `/Users/matheusrech/Downloads/Deep Research MCP/claude_code_medical_agent.py` and `/Users/matheusrech/agentic_qa_extraction/agents/table_extractor.py`. These paths won't exist on other machines, breaking the multi-agent pipeline for all users except the original developer.

LOCATION:
File: src/services/AgentOrchestrator.ts  
Lines: 73-74 (constructor)  
Properties: pythonAgentPath, tableExtractorPath

IMPACT:
The multi-agent AI pipeline fails for any user who doesn't have these exact file paths. The "Full AI Pipeline" button will crash. Since the actual agent calls go through MedicalAgentBridge (Gemini-based), these paths appear to be unused legacy code, but their presence is confusing and suggests incomplete refactoring.

SUGGESTED FIX:
Remove the hardcoded path properties entirely since MedicalAgentBridge handles all agent calls via Gemini API (no Python files needed). If Python agents are still used, move paths to environment variables or configuration file. Add validation to check if paths exist before attempting to use them. Document the relationship between AgentOrchestrator and MedicalAgentBridge.

EFFORT ESTIMATE: 1-2 hours

---

## ISSUE #7: No Error Boundary or Global Error Handling

SEVERITY: Medium  
CATEGORY: UX / Reliability

DESCRIPTION:
The application has no global error boundary or centralized error handling. Errors in AI services, PDF processing, or extraction logic can crash the entire application or leave it in an inconsistent state. Each module handles errors independently with console.error() and StatusManager.show(), but there's no recovery mechanism or error reporting.

LOCATION:
Files: All service modules  
Missing: Global error boundary, error recovery, error reporting  
Current approach: Try-catch blocks with console.error()

IMPACT:
Unhandled errors crash the application, forcing users to reload and lose unsaved work. Users see generic error messages without actionable guidance. Developers have no visibility into production errors. The application doesn't gracefully degrade when APIs fail or PDFs are corrupted. LocalStorage data could become corrupted if errors occur during save operations.

SUGGESTED FIX:
Implement a global error handler with window.onerror and window.onunhandledrejection. Add error recovery logic to restore from LocalStorage after crashes. Implement exponential backoff for API failures. Add user-friendly error messages with suggested actions. Consider integrating error reporting service (Sentry, LogRocket) for production monitoring. Add "Report Bug" button that captures error context.

EFFORT ESTIMATE: 2-3 days

---

## ISSUE #8: PDF Text Cache Type Mismatch

SEVERITY: Medium  
CATEGORY: Code Quality / Bugs

DESCRIPTION:
The pdfTextCache in AppState is declared as `Map<number, string>` but AIService.ts expects and stores `{fullText: string, items: any[]}` objects. Line 65 in AIService.ts returns the cached value directly, but line 87 stores an object. This type mismatch causes TypeScript errors and could lead to runtime crashes when cached data is accessed.

LOCATION:
Files:
- src/types/index.ts (AppState interface - cache declared as Map<number, string>)
- src/services/AIService.ts:65 (returns cached value as object)
- src/services/AIService.ts:87 (stores object in cache)
- src/state/AppStateManager.ts (initializes cache as Map)

IMPACT:
Type safety is broken for a critical caching mechanism. If the cache returns a string when an object is expected, accessing `.fullText` or `.items` properties will fail with "undefined is not an object" errors. This could crash AI extraction functions mid-operation, losing user progress.

SUGGESTED FIX:
Change AppState interface to declare pdfTextCache as `Map<number, {fullText: string, items: any[]}>`. Update AppStateManager initialization and getState() to handle the correct type. Add type guards in AIService.ts to validate cached data structure. Consider creating a PageTextData interface for better type safety.

EFFORT ESTIMATE: 2-4 hours

---

## ISSUE #9: No Bundle Size Analysis or Optimization

SEVERITY: Low  
CATEGORY: Performance

DESCRIPTION:
The vite-bundle-visualizer tool was not configured and could not run. There's no visibility into bundle size, code splitting, or which dependencies contribute most to the final bundle. The application loads the entire codebase upfront, including all AI services, PDF processing, and export functionality, even if users only need basic PDF viewing.

LOCATION:
File: Missing vite.config.ts with bundle analyzer plugin  
Impact: All modules loaded eagerly  
Current bundle: Unknown size (no analysis available)

IMPACT:
Slow initial page load, especially on mobile or slow connections. Users downloading large JavaScript bundles even for simple operations. No code splitting means unused features (Excel export, multi-agent pipeline) are loaded for all users. Medical researchers in low-bandwidth environments may struggle to use the tool.

SUGGESTED FIX:
Add vite-bundle-visualizer to devDependencies. Create vite.config.ts with rollupOptions for code splitting. Implement dynamic imports for heavy modules (AIService, AgentOrchestrator, ExportManager). Split PDF.js worker into separate chunk. Analyze bundle and set size budgets. Consider lazy-loading the multi-agent pipeline only when "Full AI Pipeline" button is clicked.

EFFORT ESTIMATE: 1-2 days

---

## ISSUE #10: Missing Environment Variable Validation

SEVERITY: Low  
CATEGORY: UX / Developer Experience

DESCRIPTION:
AIService.ts throws an error if GEMINI_API_KEY is missing (line 47), but this happens at module load time, crashing the entire application before the UI loads. There's no user-friendly error message, no guidance on how to set the key, and no graceful degradation. The error appears only in the browser console, not in the UI.

LOCATION:
File: src/services/AIService.ts  
Lines: 37-48 (API key validation)  
Behavior: Throws error at module load, crashes app

IMPACT:
New users or developers see a blank page with console errors. No guidance on creating .env.local file or obtaining a Gemini API key. The application is completely unusable without the key, even for non-AI features like manual PDF extraction and form filling. Poor developer onboarding experience.

SUGGESTED FIX:
Move API key validation to lazy initialization (first AI function call). Show user-friendly error in UI with setup instructions. Add a "Settings" panel where users can enter their API key (store in LocalStorage). Gracefully disable AI features if key is missing, but allow manual extraction. Add a setup wizard for first-time users. Include API key validation in application startup with clear error messages.

EFFORT ESTIMATE: 1 day

---

## SUMMARY

**Critical Issues (1):** Security vulnerability in xlsx package  
**High Issues (3):** TypeScript errors, missing Google Sheets service, tool configuration  
**Medium Issues (5):** Form validation, hardcoded paths, error handling, cache type mismatch, bundle size  
**Low Issues (2):** Bundle optimization, environment variable validation

**Immediate Action Required:** Fix security vulnerability and TypeScript compilation errors  
**Quick Wins:** Remove hardcoded paths, fix cache type, add environment variable validation  
**Long-term Improvements:** Implement error boundary, optimize bundle, add form validation

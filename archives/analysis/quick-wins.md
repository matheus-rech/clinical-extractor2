# Quick Wins - Clinical Extractor

## QUICK WIN #1: Remove Hardcoded File Paths from AgentOrchestrator

WHAT TO DO:
1. Open `src/services/AgentOrchestrator.ts`
2. Delete lines 69-70 (private properties: `pythonAgentPath` and `tableExtractorPath`)
3. Delete lines 73-74 in constructor (path assignments)
4. Verify that MedicalAgentBridge is handling all agent calls (it is - check line 239)
5. Test the "Full AI Pipeline" button to ensure it still works

EXPECTED IMPACT:
Eliminates confusion about Python dependencies and makes the codebase more portable. The multi-agent pipeline will work on any machine without requiring specific file paths. This also clarifies that the system uses Gemini-based agents (MedicalAgentBridge) rather than local Python scripts.

FILES TO MODIFY:
- src/services/AgentOrchestrator.ts (lines 69-70, 73-74)

ESTIMATED TIME: 30 minutes

---

## QUICK WIN #2: Add Vite Client Types for import.meta.env

WHAT TO DO:
1. Create `src/vite-env.d.ts` with content:
   ```typescript
   /// <reference types="vite/client" />
   
   interface ImportMetaEnv {
     readonly VITE_GEMINI_API_KEY: string
     readonly VITE_API_KEY: string
     readonly VITE_GOOGLE_API_KEY: string
   }
   
   interface ImportMeta {
     readonly env: ImportMetaEnv
   }
   ```
2. This fixes 7 TypeScript errors related to `import.meta.env` in AIService.ts and MedicalAgentBridge.ts
3. Run `npx tsc --noEmit` to verify errors are resolved
4. Test that environment variables still load correctly in development

EXPECTED IMPACT:
Fixes 7 out of 20 TypeScript compilation errors (35% reduction). Provides proper type safety for environment variables and enables IDE autocomplete for env vars. This is a standard Vite configuration that should have been included from the start.

FILES TO MODIFY:
- src/vite-env.d.ts (new file)

ESTIMATED TIME: 15 minutes

---

## QUICK WIN #3: Fix PDF Text Cache Type Mismatch

WHAT TO DO:
1. Open `src/types/index.ts` and find the AppState interface
2. Change `pdfTextCache: Map<number, string>` to `pdfTextCache: Map<number, {fullText: string, items: any[]}>`
3. Add a new interface above AppState:
   ```typescript
   interface PageTextData {
     fullText: string
     items: any[]
   }
   ```
4. Update AppState to use: `pdfTextCache: Map<number, PageTextData>`
5. Run `npx tsc --noEmit` to verify the fix resolves errors in AIService.ts

EXPECTED IMPACT:
Fixes 2 TypeScript errors and prevents potential runtime crashes when accessing cached PDF text. The cache will now correctly store and retrieve page text with items array, enabling proper text extraction and AI processing. This improves type safety for a critical caching mechanism used throughout the application.

FILES TO MODIFY:
- src/types/index.ts (AppState interface, add PageTextData interface)

ESTIMATED TIME: 20 minutes

---

## QUICK WIN #4: Upgrade xlsx Package to Fix Security Vulnerabilities

WHAT TO DO:
1. Open `package.json`
2. Change `"xlsx": "^0.18.5"` to `"xlsx": "^0.20.2"`
3. Run `npm install` to update the package
4. Test Excel export functionality: Load a PDF, extract some data, click "Export to Excel"
5. Open the exported Excel file to verify all sheets (Metadata, Text Chunks, Figures, Tables) are present
6. Run `npm audit` to verify vulnerabilities are resolved

EXPECTED IMPACT:
Eliminates 2 high-severity security vulnerabilities (Prototype Pollution and ReDoS) that could compromise the application. This is critical for a medical data extraction tool handling sensitive clinical information. The upgrade should be backward compatible as it's a minor version bump within the same major version.

FILES TO MODIFY:
- package.json (line 13)

ESTIMATED TIME: 1 hour (including testing)

---

## QUICK WIN #5: Add User-Friendly API Key Error Message

WHAT TO DO:
1. Open `src/services/AIService.ts`
2. Replace lines 41-48 (error throwing code) with:
   ```typescript
   let ai: GoogleGenAI | null = null;
   
   function initializeAI(): GoogleGenAI {
     if (ai) return ai;
     
     if (!API_KEY) {
       const errorMsg = `
         ⚠️ Gemini API Key Not Configured
         
         To use AI features, create a .env.local file in the project root with:
         VITE_GEMINI_API_KEY=your_api_key_here
         
         Get your free API key at: https://ai.google.dev/
       `;
       StatusManager.show(errorMsg, 'error', 30000);
       throw new Error('Gemini API key not configured');
     }
     
     ai = new GoogleGenAI({ apiKey: API_KEY });
     return ai;
   }
   ```
3. Replace all `ai.models.generateContent` calls with `initializeAI().models.generateContent`
4. Test by removing .env.local and trying to use an AI feature - should show friendly error in UI

EXPECTED IMPACT:
New users see a helpful error message in the UI (not just console) with clear setup instructions. The application no longer crashes at startup if the API key is missing. Non-AI features (manual extraction, form filling, PDF viewing) remain functional. Improves developer onboarding experience significantly.

FILES TO MODIFY:
- src/services/AIService.ts (lines 41-53, and all ai.models calls)

ESTIMATED TIME: 2 hours (including testing all AI functions)

---

## IMPLEMENTATION ORDER

1. **Quick Win #2** (15 min) - Add Vite types → Fixes 7 TS errors immediately
2. **Quick Win #3** (20 min) - Fix cache type → Fixes 2 more TS errors
3. **Quick Win #1** (30 min) - Remove hardcoded paths → Improves portability
4. **Quick Win #4** (1 hour) - Upgrade xlsx → Eliminates security vulnerabilities
5. **Quick Win #5** (2 hours) - Better error messages → Improves UX

**Total Time: 4 hours**  
**Total Impact:**
- 9 TypeScript errors fixed (45% of total)
- 2 security vulnerabilities eliminated
- Better error handling and UX
- More portable codebase
- Zero risk of breaking existing functionality

## TESTING CHECKLIST

After implementing all quick wins:

- [ ] Run `npx tsc --noEmit` - should show 11 errors (down from 20)
- [ ] Run `npm audit` - should show 0 high-severity vulnerabilities
- [ ] Load a PDF and extract text manually - should work
- [ ] Click "Generate PICO" - should work or show friendly error if no API key
- [ ] Click "Full AI Pipeline" - should work without path errors
- [ ] Export to Excel - should generate valid .xlsx file
- [ ] Test without .env.local - should show friendly error message in UI
- [ ] Check browser console - should have no errors during normal operation

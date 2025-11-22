# How to Run Clinical Extractor

## ⚠️ IMPORTANT: Use Vite Dev Server

This application **MUST** be run through Vite's development server. It cannot run on a simple HTTP server (like Live Server on port 5500) because:

1. The app uses TypeScript modules (`<script type="module" src="/src/main.ts">`)
2. TypeScript needs to be transpiled to JavaScript before browsers can execute it
3. Vite handles this transpilation automatically

## ✅ Correct Way to Run

### Option 1: Development Mode (Recommended)
```bash
cd <path-to-project>
npm run dev
```

Then open: **http://localhost:3000** (or the port shown in terminal)

### Option 2: Production Build
```bash
# Build the app
npm run build

# Preview the built version
npm run preview
```

Then open: **http://localhost:4173** (or the port shown)

## ❌ What Doesn't Work

- ❌ Live Server (port 5500) - Cannot transpile TypeScript
- ❌ Simple HTTP server - Cannot handle ES modules
- ❌ Opening index.html directly in browser - CORS and module issues

## 🔧 Troubleshooting

If buttons don't work:
1. Check browser console for errors
2. Verify you're using Vite dev server (not Live Server)
3. Run `checkClinicalExtractor()` in browser console to verify API is loaded
4. Check that PDF.js loaded: `console.log(window.pdfjsLib)`

## 📝 Quick Test

After starting `npm run dev`, open browser console and run:
```javascript
checkClinicalExtractor()
```

You should see:
- `window.ClinicalExtractor: true`
- `window.generatePICO: function`
- `window.SamplePDFService: object`
- `window.pdfjsLib: object`


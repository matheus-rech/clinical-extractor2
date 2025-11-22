# Port 5500 Investigation - Why It Doesn't Work

## Problem

When accessing the app at `http://127.0.0.1:5500`, the browser shows:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "video/mp2t"
```

## Root Cause

Port 5500 is likely running a **simple HTTP server** (Live Server, Python's http.server, or similar) that:

1. **Cannot transpile TypeScript** - It serves `.ts` files as-is
2. **Wrong MIME type** - It identifies `.ts` files as `video/mp2t` (MPEG Transport Stream) instead of JavaScript
3. **No ES module support** - Simple servers don't understand Vite's module resolution

## Technical Details

### What Happens with Vite (Port 3001) ✅

```
Browser Request: GET /src/main.ts
↓
Vite Dev Server intercepts
↓
Vite transpiles TypeScript → JavaScript
↓
Vite serves with correct MIME type: application/javascript
↓
Browser executes successfully
```

### What Happens with Simple Server (Port 5500) ❌

```
Browser Request: GET /src/main.ts
↓
Simple HTTP Server serves file as-is
↓
Server detects .ts extension → MIME type: video/mp2t
↓
Browser receives video/mp2t MIME type
↓
Browser rejects: "Expected JavaScript module, got video"
```

## HTML Reference

The `index.html` file has:
```html
<script type="module" src="/src/main.ts"></script>
```

This works with Vite because:
- Vite intercepts the request
- Transpiles TypeScript on-the-fly
- Serves JavaScript with correct headers

This fails with simple servers because:
- Server serves raw `.ts` file
- Browser can't execute TypeScript directly
- MIME type mismatch causes rejection

## Solutions

### Option 1: Use Vite (Recommended) ✅

```bash
npm run dev
# Opens on http://localhost:3000 (or next available port)
```

**Why this works:**
- Vite handles TypeScript transpilation
- Correct MIME types
- Hot module replacement
- ES module resolution
- All Vite features work

### Option 2: Build First, Then Serve ✅

```bash
# Build the app
npm run build

# Serve the built files
npm run preview
# OR use any static server on the dist/ folder
```

**Why this works:**
- TypeScript is already compiled to JavaScript
- Files are in `dist/` with `.js` extensions
- Any static server can serve them

### Option 3: Configure Simple Server (Not Recommended) ⚠️

If you must use port 5500, you'd need to:

1. **Configure MIME types** - Map `.ts` to `application/javascript`
2. **Add TypeScript compiler** - Transpile on-the-fly (complex)
3. **Handle module resolution** - Resolve imports (very complex)

This essentially means **reimplementing Vite**, which is not practical.

## Why Port 5500 Exists

Port 5500 is commonly used by:
- **Live Server** (VS Code extension)
- **Python's http.server** (`python -m http.server 5500`)
- **Simple static file servers**

These are designed for **static HTML/CSS/JS** sites, not modern build tools.

## Verification

To check what's running on port 5500:

```bash
# Check process
lsof -ti:5500 | xargs ps -p

# Check MIME type
curl -I http://127.0.0.1:5500/src/main.ts

# Check if it's Vite
curl http://127.0.0.1:5500/@vite/client
```

## Conclusion

**Port 5500 doesn't work because:**
1. Simple HTTP servers can't transpile TypeScript
2. Wrong MIME type (`video/mp2t` instead of `application/javascript`)
3. No ES module resolution support

**Solution:** Always use `npm run dev` (Vite) for development, or `npm run build` + `npm run preview` for production preview.


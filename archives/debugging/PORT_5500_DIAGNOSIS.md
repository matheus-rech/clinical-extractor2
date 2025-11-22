# Port 5500 Diagnosis - Why It Doesn't Work

## Problem Summary

When accessing the app at `http://127.0.0.1:5500`, browsers show:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "video/mp2t"
```

## Root Cause Analysis

### 1. TypeScript Files Cannot Be Executed Directly

The HTML file contains:
```html
<script type="module" src="/src/main.ts"></script>
```

**Problem:** Browsers cannot execute TypeScript (`.ts`) files directly. They need:
- TypeScript to be **transpiled** to JavaScript (`.js`)
- Correct **MIME type** (`application/javascript` or `text/javascript`)
- Proper **ES module** resolution

### 2. Simple HTTP Servers Don't Transpile

Port 5500 is running a **simple static file server** (likely Live Server or Python's http.server) that:

✅ **Can do:**
- Serve static files (HTML, CSS, JS)
- Handle basic HTTP requests
- Serve files with correct MIME types for common formats

❌ **Cannot do:**
- Transpile TypeScript to JavaScript
- Handle ES module imports (`import` statements)
- Resolve module paths (`@/`, relative imports)
- Set correct MIME types for `.ts` files

### 3. MIME Type Mismatch

When a simple server encounters a `.ts` file:

**What happens:**
1. Server receives request: `GET /src/main.ts`
2. Server looks up MIME type for `.ts` extension
3. Many servers map `.ts` → `video/mp2t` (MPEG Transport Stream video format)
4. Server sends: `Content-Type: video/mp2t`
5. Browser receives response with wrong MIME type
6. Browser rejects: "Expected JavaScript module, got video"

**Why `.ts` maps to video:**
- `.ts` is commonly used for **TypeScript** files
- But `.ts` is **also** the extension for **MPEG Transport Stream** video files
- Simple servers often use default MIME type mappings that prioritize video formats
- Without special configuration, they assume `.ts` = video

### 4. Vite vs Simple Server Comparison

| Feature | Simple Server (Port 5500) | Vite Dev Server (Port 3001) |
|---------|---------------------------|----------------------------|
| **TypeScript Support** | ❌ Serves raw `.ts` files | ✅ Transpiles on-the-fly |
| **MIME Types** | ❌ Wrong (`video/mp2t`) | ✅ Correct (`application/javascript`) |
| **ES Modules** | ❌ No import resolution | ✅ Full ES module support |
| **Hot Reload** | ❌ No | ✅ Yes |
| **Path Aliases** | ❌ No (`@/` doesn't work) | ✅ Yes |
| **Build Process** | ❌ None | ✅ Full build pipeline |

## Technical Details

### What Vite Does (Port 3001) ✅

```
Browser: GET /src/main.ts
    ↓
Vite Dev Server intercepts request
    ↓
Vite reads TypeScript file
    ↓
Vite transpiles TypeScript → JavaScript
    ↓
Vite resolves imports (@/, relative paths)
    ↓
Vite serves JavaScript with headers:
    Content-Type: application/javascript
    ↓
Browser executes successfully
```

### What Simple Server Does (Port 5500) ❌

```
Browser: GET /src/main.ts
    ↓
Simple Server receives request
    ↓
Server looks up file: src/main.ts exists
    ↓
Server checks MIME type for .ts extension
    ↓
Server finds: .ts → video/mp2t (wrong!)
    ↓
Server sends file with headers:
    Content-Type: video/mp2t
    ↓
Browser receives response
    ↓
Browser checks: "Is this a JavaScript module?"
    ↓
Browser sees: Content-Type: video/mp2t
    ↓
Browser rejects: "Expected JavaScript, got video"
```

## Verification Steps

### Check What's Running on Port 5500

```bash
# Check process
lsof -ti:5500 | xargs ps -p

# Check MIME type being sent
curl -I http://127.0.0.1:5500/src/main.ts | grep -i content-type

# Check if it's Vite
curl http://127.0.0.1:5500/@vite/client
# If 404, it's NOT Vite
```

### Check Browser Console

Open browser DevTools → Console, you'll see:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "video/mp2t"
```

## Solutions

### ✅ Solution 1: Use Vite (Recommended)

```bash
npm run dev
# Opens on http://localhost:3000 (or next available port)
```

**Why this works:**
- Vite handles all TypeScript transpilation
- Correct MIME types automatically
- Full ES module support
- Hot module replacement
- Path alias resolution (`@/`)

### ✅ Solution 2: Build First, Then Serve

```bash
# Step 1: Build the app (transpiles TypeScript → JavaScript)
npm run build

# Step 2: Serve the built files
npm run preview
# OR use any static server on dist/ folder
```

**Why this works:**
- TypeScript is already compiled to JavaScript
- Files in `dist/` have `.js` extensions
- Any static server can serve `.js` files correctly
- MIME types are correct for JavaScript

### ⚠️ Solution 3: Configure Simple Server (Not Recommended)

If you absolutely must use port 5500, you'd need to:

1. **Configure MIME types** - Map `.ts` to `application/javascript`
2. **Add TypeScript compiler** - Transpile `.ts` files on-the-fly
3. **Handle ES modules** - Resolve `import` statements
4. **Support path aliases** - Resolve `@/` imports
5. **Handle dependencies** - Resolve node_modules

**This essentially means reimplementing Vite**, which is:
- ❌ Very complex
- ❌ Time-consuming
- ❌ Error-prone
- ❌ Not maintainable

## Why Port 5500 Exists

Port 5500 is commonly used by:

1. **Live Server** (VS Code extension)
   - Simple static file server
   - Great for HTML/CSS/JS sites
   - Not designed for build tools

2. **Python's http.server**
   ```bash
   python -m http.server 5500
   ```
   - Basic HTTP server
   - No build capabilities

3. **Other Simple Servers**
   - http-server (npm package)
   - serve (npm package)
   - All designed for static files only

## Conclusion

**Port 5500 doesn't work because:**

1. ❌ **No TypeScript transpilation** - Serves raw `.ts` files
2. ❌ **Wrong MIME type** - Maps `.ts` to `video/mp2t` instead of JavaScript
3. ❌ **No ES module support** - Can't resolve imports
4. ❌ **No build process** - Missing all Vite features

**The fix:** Always use `npm run dev` (Vite) for development.

## Quick Test

To verify the issue:

```bash
# Test port 5500
curl -I http://127.0.0.1:5500/src/main.ts | grep Content-Type
# Output: Content-Type: video/mp2t (WRONG!)

# Test Vite (port 3001)
curl -I http://localhost:3001/src/main.ts | grep Content-Type  
# Output: Content-Type: application/javascript (CORRECT!)
```


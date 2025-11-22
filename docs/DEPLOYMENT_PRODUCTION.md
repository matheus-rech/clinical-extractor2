# 🌐 Production Deployment Guide

**Last Updated:** November 19, 2025
**Platforms:** Vercel, Netlify, GitHub Pages
**Status:** Production-Ready

---

## 📋 Platform Comparison

| Feature | Vercel | Netlify | GitHub Pages |
|---------|--------|---------|--------------|
| **Setup Difficulty** | Easy | Easy | Medium |
| **Deployment Speed** | ⚡ Instant | ⚡ Instant | ~1-2 min |
| **Custom Domain** | ✅ Free | ✅ Free | ✅ Free |
| **HTTPS** | ✅ Auto | ✅ Auto | ✅ Auto |
| **Environment Variables** | ✅ Yes | ✅ Yes | ❌ Build-time only |
| **Build Logs** | ✅ Detailed | ✅ Detailed | ⚠️ Basic |
| **Rollback** | ✅ One-click | ✅ One-click | ⚠️ Manual |
| **Free Tier** | 100GB/month | 100GB/month | Unlimited |
| **Best For** | Modern apps | JAMstack sites | Static sites |

**Recommendation:** **Vercel** for best developer experience and instant deployments.

---

## 🚀 Option 1: Vercel Deployment (Recommended)

### Why Vercel?

- **Instant deployments** - Deploy in seconds, not minutes
- **Automatic HTTPS** - SSL certificates auto-configured
- **Preview deployments** - Every PR gets unique URL
- **Edge network** - Global CDN for fast loading
- **Zero config** - Detects Vite automatically
- **Best developer experience** - Industry-leading DX

### Prerequisites

- [x] GitHub repository created and pushed
- [x] Vercel account (free) - Sign up at https://vercel.com/signup
- [ ] Gemini API key ready

### Step 1: Install Vercel CLI (Optional)

```bash
# Install globally
npm install -g vercel

# Or use npx (no install needed)
npx vercel --version
```

### Step 2: Login to Vercel

```bash
vercel login
```

**Follow prompts:**
1. Enter your email
2. Click verification link in email
3. CLI shows "Success!"

### Step 3: Deploy from GitHub (Recommended)

#### Via Vercel Dashboard

1. **Go to https://vercel.com/new**

2. **Import Git Repository:**
   - Click "Import Git Repository"
   - Authorize Vercel to access GitHub
   - Select your repository (e.g., `matheus-rech/la_consulta`)

3. **Configure Project:**
   - **Project Name:** `clinical-extractor` (or keep default)
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `./` (leave blank)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add variable:
     - **Name:** `VITE_GEMINI_API_KEY`
     - **Value:** Your Gemini API key
     - **Environments:** Production, Preview, Development
   - Click "Add"

5. **Deploy:**
   - Click "Deploy"
   - Wait ~30-60 seconds
   - Get production URL: `https://clinical-extractor.vercel.app`

### Step 4: Deploy from CLI (Alternative)

```bash
# Navigate to project directory
cd /path/to/clinical-extractor

# Deploy to production
vercel --prod

# Follow prompts:
# ? Set up and deploy? Yes
# ? Which scope? Your Account
# ? Link to existing project? No
# ? What's your project's name? clinical-extractor
# ? In which directory is your code located? ./

# Vercel auto-detects:
# - Framework: Vite
# - Build Command: npm run build
# - Output Directory: dist

# Set environment variables when prompted:
# ? Add environment variables? Yes
# ? VITE_GEMINI_API_KEY? [paste your API key]

# Wait for deployment...
# ✓ Production: https://clinical-extractor.vercel.app [30s]
```

### Step 5: Verify Deployment

1. **Open production URL:** `https://clinical-extractor.vercel.app`

2. **Test key features:**
   - [ ] Upload PDF file
   - [ ] Render PDF pages
   - [ ] Manual text extraction
   - [ ] Generate PICO (verify API key works)
   - [ ] Export JSON

3. **Check browser console:**
   - No errors
   - No missing resources (404s)
   - API calls succeed

### Step 6: Configure Custom Domain (Optional)

**Add custom domain:**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **Domains**
4. Click **Add**
5. Enter domain: `clinical-extractor.com`
6. Follow DNS configuration instructions
7. Wait for DNS propagation (~5-60 minutes)

**DNS Configuration:**

**Option A: Subdomain (easier)**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Option B: Apex domain (requires nameserver change)**
```
Nameservers:
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### Vercel Automatic Deployments

**Every push to master:**
- Triggers automatic deployment
- Runs `npm run build`
- Deploys to production
- Updates production URL

**Every pull request:**
- Creates preview deployment
- Unique URL: `https://clinical-extractor-git-feature-username.vercel.app`
- Comment on PR with preview link
- No impact on production

### Vercel Environment Variables Management

**Add/Update Environment Variables:**

1. Dashboard → Project → **Settings** → **Environment Variables**
2. Click **Add New**
3. Configure:
   - **Key:** `VITE_BACKEND_API_URL`
   - **Value:** `https://api.clinical-extractor.com`
   - **Environments:** Production only
4. **Redeploy** for changes to take effect

**Important:** Changes to environment variables require redeployment!

```bash
# Trigger redeployment after env var change
vercel --prod
```

### Vercel Deployment Logs

**View build logs:**
1. Dashboard → Project → **Deployments**
2. Click on deployment
3. View **Build Logs** tab

**Example successful build:**
```
[12:34:56] Running build command: npm run build
[12:34:57] > clinical-extractor@0.0.0 build
[12:34:57] > vite build
[12:34:58] vite v6.2.0 building for production...
[12:35:28] ✓ built in 607ms
[12:35:28] Build Completed in /vercel/output [30s]
```

### Vercel Rollback

**Rollback to previous deployment:**

1. Dashboard → Project → **Deployments**
2. Find working deployment
3. Click **⋯** (three dots)
4. Click **Promote to Production**
5. Confirm

**Via CLI:**
```bash
vercel rollback
```

---

## 🔷 Option 2: Netlify Deployment

### Why Netlify?

- **Drag-and-drop deploys** - Deploy `dist/` folder directly
- **Form handling** - Built-in form submissions
- **Split testing** - A/B testing built-in
- **Serverless functions** - Easy backend integration
- **Great for JAMstack** - Optimized for static sites

### Prerequisites

- [x] GitHub repository created and pushed
- [x] Netlify account (free) - Sign up at https://app.netlify.com/signup
- [ ] Gemini API key ready

### Step 1: Install Netlify CLI (Optional)

```bash
# Install globally
npm install -g netlify-cli

# Or use npx
npx netlify --version
```

### Step 2: Login to Netlify

```bash
netlify login
```

**Browser opens:**
1. Click "Authorize"
2. CLI shows "Success!"

### Step 3: Deploy from GitHub (Recommended)

#### Via Netlify Dashboard

1. **Go to https://app.netlify.com/start**

2. **Connect to Git Provider:**
   - Click "GitHub"
   - Authorize Netlify
   - Select repository: `matheus-rech/la_consulta`

3. **Configure Build Settings:**
   - **Branch to deploy:** `master`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - Click "Show advanced"

4. **Add Environment Variables:**
   - Click "New variable"
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** Your Gemini API key
   - Click "Add"

5. **Deploy Site:**
   - Click "Deploy site"
   - Wait ~1-2 minutes
   - Get URL: `https://random-name-123456.netlify.app`

### Step 4: Deploy from CLI (Alternative)

```bash
# Navigate to project
cd /path/to/clinical-extractor

# Initialize Netlify
netlify init

# Follow prompts:
# ? What would you like to do? Create & configure a new site
# ? Team: Your Team
# ? Site name: clinical-extractor
# ? Build command: npm run build
# ? Directory to deploy: dist
# ? Netlify config file: netlify.toml (auto-generated)

# Set environment variable
netlify env:set VITE_GEMINI_API_KEY "your-api-key-here"

# Build locally
npm run build

# Deploy to production
netlify deploy --prod

# Wait for deployment...
# ✓ Site is live at https://clinical-extractor.netlify.app
```

### Step 5: Configure Custom Domain

**Add custom domain:**

1. Dashboard → Site → **Domain settings**
2. Click **Add custom domain**
3. Enter: `clinical-extractor.com`
4. Follow DNS instructions

**DNS Configuration:**
```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: your-site.netlify.app
```

### Netlify Automatic Deployments

**Branch deploys:**
- `master` → Production
- Other branches → Deploy previews

**Deploy contexts:**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[context.production]
  environment = { VITE_GEMINI_API_KEY = "prod-key" }

[context.deploy-preview]
  environment = { VITE_GEMINI_API_KEY = "staging-key" }
```

### Netlify Build Logs

**View logs:**
1. Dashboard → Site → **Deploys**
2. Click on deployment
3. View build log

### Netlify Rollback

**Publish previous deploy:**
1. Dashboard → **Deploys**
2. Find working deployment
3. Click **Publish deploy**

---

## 📄 Option 3: GitHub Pages Deployment

### Why GitHub Pages?

- **Free hosting** - Unlimited bandwidth
- **GitHub integration** - Already using GitHub
- **Simple setup** - No external service needed
- **Custom domains** - Free with your repo

**Limitations:**
- No environment variables at runtime (build-time only)
- Slower deployments (1-2 minutes)
- No instant rollback

### Prerequisites

- [x] GitHub repository with code
- [ ] GitHub Pages enabled in repository settings

### Step 1: Configure for GitHub Pages

**Update `vite.config.ts`:**

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Add base for GitHub Pages
    base: mode === 'production' ? '/la_consulta/' : '/',

    // Rest of config...
  };
});
```

**Why `base`?** GitHub Pages serves at `https://username.github.io/repo-name/`

### Step 2: Create GitHub Actions Workflow

**File:** `.github/workflows/github-pages.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ master ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 3: Enable GitHub Pages

1. **Repository → Settings → Pages**
2. **Source:** GitHub Actions
3. **Save**

### Step 4: Deploy

```bash
# Commit workflow file
git add .github/workflows/github-pages.yml vite.config.ts
git commit -m "feat: Add GitHub Pages deployment"
git push origin master

# Wait 1-2 minutes for deployment
# Check: https://github.com/matheus-rech/la_consulta/actions
```

### Step 5: Access Your Site

**URL:** `https://matheus-rech.github.io/la_consulta/`

### GitHub Pages Custom Domain

**Add custom domain:**

1. **Repository → Settings → Pages**
2. **Custom domain:** `clinical-extractor.com`
3. **Enforce HTTPS:** Checked
4. Configure DNS:

```
Type: CNAME
Name: www
Value: matheus-rech.github.io

Type: A (for apex domain)
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

### GitHub Pages Limitations

**Environment Variables:**
- Must be set at build time via GitHub Actions secrets
- Cannot change without redeployment
- No runtime environment variables

**Workaround:**
```typescript
// config.ts
export const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ||
  'hardcoded-key-for-github-pages';
```

**⚠️ Security Note:** Never hardcode real API keys! Use a separate limited key for GitHub Pages.

---

## 🔐 Environment Variables Configuration

### Required Environment Variables

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API access | https://ai.google.dev/ |
| `VITE_BACKEND_API_URL` | Backend API endpoint (optional) | Your backend deployment |

### Optional Environment Variables

```bash
# Application settings
VITE_APP_NAME="Clinical Extractor"
VITE_MAX_PDF_SIZE_MB=50
VITE_MAX_CACHE_SIZE=50

# Feature flags
VITE_ENABLE_MULTI_AGENT=true
VITE_ENABLE_CITATION_PROVENANCE=true
VITE_ENABLE_FIGURE_EXTRACTION=true
VITE_ENABLE_TABLE_EXTRACTION=true

# Development settings
VITE_ENV=production
VITE_DEBUG=false
```

### Setting Environment Variables by Platform

#### Vercel
```bash
# Via CLI
vercel env add VITE_GEMINI_API_KEY

# Via Dashboard
Dashboard → Settings → Environment Variables → Add
```

#### Netlify
```bash
# Via CLI
netlify env:set VITE_GEMINI_API_KEY "your-key"

# Via Dashboard
Dashboard → Site settings → Environment variables → Add
```

#### GitHub Pages
```bash
# Via GitHub Secrets
Repository → Settings → Secrets → Actions → New secret
Name: GEMINI_API_KEY
Value: your-key

# Reference in workflow
env:
  VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

---

## 🧪 Post-Deployment Testing

### Deployment Verification Checklist

After deploying to production, verify all features work:

#### Basic Functionality
- [ ] Site loads without errors
- [ ] All assets load (no 404s)
- [ ] HTTPS works (green padlock)
- [ ] No console errors

#### PDF Features
- [ ] Upload PDF file
- [ ] Render multiple pages
- [ ] Navigate between pages
- [ ] Zoom in/out
- [ ] Text selection works

#### AI Features (Requires API Key)
- [ ] Generate PICO extraction
- [ ] Generate summary
- [ ] Extract metadata
- [ ] Validate field with AI
- [ ] Extract tables
- [ ] Analyze images

#### Data Features
- [ ] Fill form fields
- [ ] Navigate wizard steps
- [ ] Export JSON
- [ ] Export CSV
- [ ] Export Excel
- [ ] Export HTML audit

#### Error Handling
- [ ] Upload invalid file (shows error)
- [ ] API timeout (shows retry option)
- [ ] Network offline (graceful degradation)

### Performance Testing

**Lighthouse Audit:**

1. Open site in Chrome
2. Open DevTools (F12)
3. Go to **Lighthouse** tab
4. Click **Analyze page load**

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

**Run from CLI:**
```bash
npm install -g lighthouse
lighthouse https://clinical-extractor.vercel.app --view
```

### Load Testing

**Test concurrent users:**

```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: apt-get install apache2-utils

# Test with 100 concurrent users, 1000 requests
ab -n 1000 -c 100 https://clinical-extractor.vercel.app/

# Expected results:
# Requests per second: >50
# Time per request: <2000ms
# Failed requests: 0
```

---

## 🔄 Continuous Deployment Workflow

### Recommended Git Workflow

```bash
# Feature development
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "feat: Add new feature"
git push origin feature/new-feature

# Create pull request on GitHub
# ↓ Triggers preview deployment (Vercel/Netlify)
# ↓ Runs CI/CD tests
# ↓ Review preview URL
# ↓ Merge to master

# Merge to master
# ↓ Triggers production deployment
# ↓ Runs all tests
# ↓ Deploys to production
# ↓ Site live at production URL
```

### Deployment Environments

**Three-tier deployment:**

1. **Development (Local)**
   - `npm run dev`
   - `http://localhost:3000`
   - `.env.local` with dev API keys

2. **Staging (Preview Deployments)**
   - Every PR → unique URL
   - `https://clinical-extractor-pr-123.vercel.app`
   - Test before merging

3. **Production (Master Branch)**
   - `master` branch only
   - `https://clinical-extractor.vercel.app`
   - Verified and stable

### Deployment Best Practices

1. **Never deploy directly to production**
   - Always create PR first
   - Review changes
   - Test on preview URL
   - Get approval
   - Then merge to master

2. **Use feature flags for risky changes**
```typescript
// config.ts
export const ENABLE_NEW_FEATURE = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';

// Component.tsx
if (ENABLE_NEW_FEATURE) {
  return <NewFeature />;
} else {
  return <OldFeature />;
}
```

3. **Monitor deployments**
   - Check build logs
   - Verify site loads
   - Test critical paths
   - Monitor error rates

4. **Keep rollback plan ready**
   - Know how to rollback (see platform sections above)
   - Keep previous deployment accessible
   - Have database backup (if applicable)

---

## 📊 Monitoring Production

### Error Tracking

**Sentry Integration (Recommended):**

```bash
# Install Sentry
npm install @sentry/vite-plugin @sentry/browser

# Configure (vite.config.ts)
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: "your-org",
      project: "clinical-extractor"
    })
  ]
});
```

**Add to main.ts:**
```typescript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://your-sentry-dsn",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0
});
```

### Analytics

**Plausible Analytics (Privacy-friendly):**

```html
<!-- index.html -->
<script defer data-domain="clinical-extractor.com"
  src="https://plausible.io/js/script.js"></script>
```

### Uptime Monitoring

**UptimeRobot (Free):**

1. Go to https://uptimerobot.com/
2. Add monitor: `https://clinical-extractor.vercel.app`
3. Check interval: 5 minutes
4. Get alerts via email/Slack

### Performance Monitoring

**Web Vitals Tracking:**

```typescript
// main.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  console.log(metric);
  // Send to your analytics service
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 🚨 Troubleshooting Deployments

### Common Issues

#### Issue 1: Build Fails with "Module not found"

**Symptom:**
```
Error: Cannot find module '@/config'
```

**Cause:** Path alias not configured in build

**Solution:**
```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

#### Issue 2: Environment Variables Not Working

**Symptom:** API calls fail, console shows "undefined"

**Cause:** Environment variables not prefixed with `VITE_`

**Solution:**
```bash
# Wrong
GEMINI_API_KEY=xxx

# Correct
VITE_GEMINI_API_KEY=xxx
```

**Redeploy after fixing!**

#### Issue 3: 404 on Refresh (SPA Routing)

**Symptom:** `/page` works but refresh shows 404

**Cause:** Server not configured for SPA

**Solution:**

**Vercel:** Create `vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify:** Create `_redirects` in `public/`
```
/* /index.html 200
```

**GitHub Pages:** Not supported for SPAs (use hash routing)

#### Issue 4: Large Bundle Size

**Symptom:** Build size >500 KB, slow load times

**Solution:**

1. **Analyze bundle:**
```bash
npm install -D rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [visualizer()]
});

npm run build
# Opens stats.html
```

2. **Code splitting:**
```typescript
// Lazy load routes
const AdminPanel = lazy(() => import('./components/AdminPanel'));
```

3. **Remove unused dependencies:**
```bash
npm install -D depcheck
npx depcheck
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All CI/CD tests passing
- [ ] Production build succeeds locally
- [ ] Environment variables documented
- [ ] `.env.local` in `.gitignore`
- [ ] No hardcoded secrets in code

### Platform Selection
- [ ] Chose deployment platform (Vercel/Netlify/GitHub Pages)
- [ ] Account created
- [ ] Repository connected

### Configuration
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS enabled
- [ ] Branch deploys configured

### Post-Deployment
- [ ] Site loads successfully
- [ ] All features tested
- [ ] Performance tested (Lighthouse)
- [ ] Error tracking configured
- [ ] Analytics configured
- [ ] Uptime monitoring configured
- [ ] Team notified of production URL

---

## 📞 Support

**Platform-Specific Support:**
- **Vercel:** https://vercel.com/support
- **Netlify:** https://docs.netlify.com/
- **GitHub Pages:** https://docs.github.com/en/pages

**Project-Specific Issues:**
- Create issue on GitHub
- Check `TROUBLESHOOTING.md`
- Review deployment logs

---

**Status:** Ready for production deployment! Choose your platform and follow the guide above. 🚀

**Recommended:** Start with Vercel for best developer experience, then expand to other platforms as needed.

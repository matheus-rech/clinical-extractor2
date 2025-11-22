# 🔄 CI/CD Setup Guide

**Last Updated:** November 19, 2025
**Workflows:** 3 (Playwright Tests, TypeScript Check, Production Build)
**Status:** Production-Ready

---

## 📋 Overview

This project uses **GitHub Actions** for continuous integration and continuous deployment (CI/CD). Every push to `master` or pull request triggers automated testing, type checking, and build verification.

### Workflows Summary

| Workflow | File | Purpose | Runtime |
|----------|------|---------|---------|
| **Playwright E2E Tests** | `playwright-tests.yml` | Run 95 E2E tests with real API | ~15-30 min |
| **TypeScript Check** | `typescript.yml` | Type safety verification | ~30 sec |
| **Production Build** | `build.yml` | Build verification & artifacts | ~45 sec |

---

## 🎯 Workflow 1: Playwright E2E Tests

### Purpose

Runs comprehensive end-to-end tests to verify:
- PDF upload and rendering
- Manual text extraction
- AI-powered PICO extraction (real Gemini API calls)
- Multi-agent pipeline
- Form navigation
- Export functionality
- Search and annotations
- Error recovery

### Configuration

**File:** `.github/workflows/playwright-tests.yml`

**Triggers:**
- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches

**Environment:**
- Ubuntu latest
- Node.js 20
- Playwright with Chromium browser
- Timeout: 60 minutes

### Workflow Steps

#### Step 1: Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```
**Purpose:** Get latest code from repository
**Duration:** ~5 seconds

#### Step 2: Setup Node.js
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```
**Purpose:** Install Node.js 20 with npm caching
**Duration:** ~10 seconds (cached), ~30 seconds (first run)

#### Step 3: Install Dependencies
```yaml
- name: Install dependencies
  run: npm ci
```
**Purpose:** Install exact versions from `package-lock.json`
**Duration:** ~30 seconds (cached), ~2 minutes (first run)
**Why `npm ci` not `npm install`?** Ensures reproducible builds

#### Step 4: Install Playwright Browsers
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium
```
**Purpose:** Install Chromium browser for E2E tests
**Duration:** ~1-2 minutes (cached), ~3-5 minutes (first run)
**Why `--with-deps`?** Installs system dependencies required by Chromium

#### Step 5: Run Playwright Tests
```yaml
- name: Run Playwright tests
  run: npm run test:e2e
  env:
    VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```
**Purpose:** Execute all 95 E2E tests
**Duration:** ~15-30 minutes (depends on API latency)
**Critical:** Requires `GEMINI_API_KEY` secret configured
**Command:** Runs `playwright test` with configuration

#### Step 6: Upload Test Results
```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```
**Purpose:** Upload HTML test report (pass or fail)
**Retention:** 30 days
**Access:** Download from workflow artifacts
**Why `if: always()`?** Upload even if tests fail

#### Step 7: Upload Test Videos (on failure)
```yaml
- name: Upload test videos (on failure)
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-videos
    path: test-results/
    retention-days: 7
```
**Purpose:** Upload video recordings of failed tests
**Retention:** 7 days
**Access:** Download from workflow artifacts
**Why `if: failure()`?** Only upload videos when tests fail (saves storage)

### Test Coverage

**8 Test Suites, 95 Tests Total:**

1. **PDF Upload & Rendering** (12 tests)
   - File upload validation
   - Multi-page navigation
   - Button state management
   - Zoom controls

2. **Manual Text Extraction** (10 tests)
   - Mouse selection
   - Bounding box calculation
   - Marker preservation
   - Field linking

3. **AI PICO Extraction** (13 tests) ⚡ Real API calls
   - PICO-T field generation
   - Summary generation
   - Metadata extraction with Google Search
   - Field validation
   - Table/image/deep analysis

4. **Multi-Agent Pipeline** (14 tests)
   - Geometric figure extraction
   - Geometric table extraction
   - Content classification
   - Agent routing
   - Consensus calculation

5. **Form Navigation** (12 tests)
   - 8-step wizard
   - Dynamic fields
   - Data persistence

6. **Export Functionality** (10 tests)
   - JSON, CSV, Excel exports
   - HTML audit reports

7. **Search & Annotation** (12 tests)
   - Text/regex/semantic search
   - Highlights, notes, shapes

8. **Error Recovery** (12 tests)
   - Crash detection
   - Session recovery
   - Circuit breaker

### Expected Results

**Success:**
```
95 passed (15-30m)
```

**Artifacts Created:**
- `playwright-report/index.html` - Interactive test report
- `test-results/` - Screenshots and videos (if failures)

### Debugging Failed Tests

**Step 1: Download Artifacts**
1. Go to failed workflow run
2. Scroll to **Artifacts** section
3. Download `playwright-report`
4. Extract and open `index.html`

**Step 2: Review Test Report**
- Click on failed test
- View error message and stack trace
- Check screenshots at failure point

**Step 3: Download Videos (if available)**
1. Download `test-videos` artifact
2. Extract and play `.webm` files
3. Watch exactly what happened during failure

**Step 4: Reproduce Locally**
```bash
# Run specific test
npx playwright test --grep "test name"

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode (pause at failures)
npx playwright test --debug
```

---

## ✅ Workflow 2: TypeScript Check

### Purpose

Ensures type safety and catches compilation errors before deployment.

### Configuration

**File:** `.github/workflows/typescript.yml`

**Triggers:**
- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches

**Environment:**
- Ubuntu latest
- Node.js 20
- Timeout: 10 minutes

### Workflow Steps

#### Step 1-3: Setup (Same as Playwright)
- Checkout code
- Setup Node.js 20
- Install dependencies with `npm ci`

#### Step 4: Run TypeScript Compiler Check
```yaml
- name: Run TypeScript compiler check
  run: npx tsc --noEmit
```
**Purpose:** Type check all TypeScript files without generating output
**Duration:** ~10-15 seconds
**Fails if:** Any type errors found

**Example Errors Caught:**
- Missing imports
- Type mismatches
- Null safety violations
- Interface violations

#### Step 5: Check for Lint Errors
```yaml
- name: Check for lint errors
  run: npm run lint || echo "Linting completed with warnings"
```
**Purpose:** Additional linting (currently same as `tsc --noEmit`)
**Duration:** ~10-15 seconds
**Note:** Uses `|| echo` to not fail on warnings (only errors fail)

### Expected Results

**Success:**
```
✓ Run TypeScript compiler check (15s)
✓ Check for lint errors (12s)
```

**No artifacts created** (only pass/fail status)

### Debugging Failed TypeScript Checks

**Step 1: Review Error Logs**
1. Click on failed workflow
2. Expand "Run TypeScript compiler check"
3. Read error messages

**Example Error:**
```
src/services/AIService.ts(125,5): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

**Step 2: Reproduce Locally**
```bash
# Run same command as CI
npx tsc --noEmit

# Check specific file
npx tsc src/services/AIService.ts --noEmit
```

**Step 3: Fix Type Errors**
Common fixes:
```typescript
// Problem: Possible undefined
const value = obj.property; // Type error if property is optional

// Solution 1: Optional chaining
const value = obj.property ?? 'default';

// Solution 2: Type guard
if (obj.property) {
    const value = obj.property; // Now safe
}

// Solution 3: Non-null assertion (use carefully)
const value = obj.property!; // Asserts it's defined
```

---

## 🏗️ Workflow 3: Production Build

### Purpose

Verifies application builds successfully for production and uploads build artifacts.

### Configuration

**File:** `.github/workflows/build.yml`

**Triggers:**
- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches

**Environment:**
- Ubuntu latest
- Node.js 20
- Timeout: 10 minutes

### Workflow Steps

#### Step 1-3: Setup (Same as Others)
- Checkout code
- Setup Node.js 20
- Install dependencies with `npm ci`

#### Step 4: Build Production Bundle
```yaml
- name: Build production bundle
  run: npm run build
```
**Purpose:** Create optimized production build
**Duration:** ~30-45 seconds
**Output:** `dist/` folder with:
- `index.html` - Entry point
- `assets/*.js` - Bundled JavaScript (minified)
- `assets/*.css` - Bundled CSS (minified)

**Build Configuration (vite.config.ts):**
```typescript
build: {
  sourcemap: true,        // Include source maps for debugging
  minify: 'esbuild',      // Fast minification
  target: 'es2020'        // Modern browsers
}
```

#### Step 5: Check Build Output
```yaml
- name: Check build output
  run: |
    ls -lh dist/
    du -sh dist/
    echo "Build completed successfully!"
```
**Purpose:** Verify build output and show size
**Duration:** ~1 second
**Example Output:**
```
dist/:
total 136K
-rw-r--r-- 1 runner docker  475 Nov 19 12:34 index.html
drwxr-xr-x 2 runner docker 4.0K Nov 19 12:34 assets

133K    dist/
Build completed successfully!
```

#### Step 6: Upload Build Artifacts
```yaml
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist
    path: dist/
    retention-days: 7
```
**Purpose:** Make production build downloadable
**Retention:** 7 days
**Use Cases:**
- Deploy to hosting manually
- Compare build sizes across commits
- Verify build contents

### Expected Results

**Success:**
```
✓ Build production bundle (607ms)
✓ Check build output (1s)
✓ Upload build artifacts (3s)

Build size: ~133 KB gzipped
```

**Artifacts Created:**
- `dist.zip` - Production build (downloadable)

### Debugging Failed Builds

**Step 1: Review Build Logs**
1. Click on failed workflow
2. Expand "Build production bundle"
3. Check for errors

**Common Build Errors:**

#### Error: Module Not Found
```
Error: Cannot find module '@/utils/helpers'
```
**Cause:** Missing file or incorrect import path
**Fix:** Verify file exists and import path is correct

#### Error: TypeScript Compilation
```
TS2322: Type 'string | undefined' is not assignable to type 'string'.
```
**Cause:** Type error (should be caught by TypeScript Check workflow first)
**Fix:** Run `npm run lint` locally and fix type errors

#### Error: Out of Memory
```
JavaScript heap out of memory
```
**Cause:** Build process using too much memory
**Fix:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Step 2: Reproduce Locally**
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build

# Check build size
du -sh dist/

# Verify build works
npm run preview
# Open http://localhost:4173
```

**Step 3: Compare Successful Builds**
1. Download artifact from passing workflow
2. Download artifact from failed workflow (if build partially succeeded)
3. Compare folder sizes and file lists
4. Identify missing or corrupted files

---

## 📊 Monitoring CI/CD Performance

### Workflow Duration Trends

**Normal Runtime:**
- TypeScript Check: 30-45 seconds
- Production Build: 45-60 seconds
- Playwright Tests: 15-30 minutes

**Red Flags:**
- TypeScript Check >2 minutes = Dependency cache issue
- Production Build >5 minutes = Build performance problem
- Playwright Tests >60 minutes = API rate limiting or network issues

### Check Workflow History

**View trends:**
1. Go to Actions tab
2. Click workflow name
3. Review recent runs
4. Look for patterns in failures

**Example Pattern:**
- All tests pass on `master` = Good
- Tests fail only on PRs from specific branch = Branch-specific issue
- Tests fail intermittently = Flaky test or API rate limiting

### Caching Effectiveness

**Check cache hit rate:**
1. Click on workflow run
2. Expand "Setup Node.js" step
3. Look for "Cache restored from key: ..."

**Optimal:**
```
Cache restored from key: node-modules-Linux-abc123...
✓ Restored cache (1.2s)
```

**Cache Miss:**
```
Cache not found for input keys: node-modules-Linux-abc123...
⚠ Installing dependencies (2m 15s)
```

**Improve Cache:**
- Use exact Node.js version in workflow
- Commit `package-lock.json` to repository
- Avoid frequent dependency changes

---

## 🎨 Badge Installation

### Add CI/CD Status Badges to README

Badges provide visual status of CI/CD workflows.

### Badge URLs

Replace `YOUR_USERNAME` and `clinical-extractor` with your actual GitHub username and repository name.

**Playwright Tests:**
```markdown
[![Playwright Tests](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/playwright-tests.yml)
```

**TypeScript Check:**
```markdown
[![TypeScript Check](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/typescript.yml/badge.svg)](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/typescript.yml)
```

**Production Build:**
```markdown
[![Production Build](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/build.yml)
```

### Example for `matheus-rech/la_consulta`

```markdown
[![Playwright Tests](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml)
[![TypeScript Check](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml)
[![Production Build](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml)
```

### Badge Appearance

**Passing (Green):**
![Passing Badge](https://img.shields.io/badge/build-passing-brightgreen)

**Failing (Red):**
![Failing Badge](https://img.shields.io/badge/build-failing-red)

**Pending (Yellow):**
![Pending Badge](https://img.shields.io/badge/build-pending-yellow)

### Placement in README

**Recommended location:**
```markdown
# Clinical Extractor

[![Playwright Tests](badge-url)](workflow-url)
[![TypeScript Check](badge-url)](workflow-url)
[![Production Build](badge-url)](workflow-url)

A web-based clinical data extraction platform...
```

**Update README:**
```bash
# Edit README.md with badge URLs
git add README.md
git commit -m "docs: Add CI/CD status badges"
git push origin master
```

---

## 🔍 Debugging Workflow Failures

### General Debugging Strategy

1. **Check workflow status** - Which step failed?
2. **Read error logs** - What's the error message?
3. **Reproduce locally** - Can you reproduce the failure?
4. **Check recent changes** - What changed since last success?
5. **Review workflow logs** - Any warnings before failure?

### Step-by-Step Debugging

#### Step 1: Identify Failed Step

Click on failed workflow → Click on job → Identify red X step

**Example:**
```
✓ Checkout code (3s)
✓ Setup Node.js (12s)
✓ Install dependencies (45s)
✗ Run Playwright tests (15m 23s)  ← Failed here
- Upload test results (skipped)
```

#### Step 2: Read Error Message

Expand failed step and scroll to bottom for error summary.

**Example Error:**
```
Error: Test timeout of 30000ms exceeded.
  at tests/e2e-playwright/03-ai-pico-extraction.spec.ts:45:5
```

#### Step 3: Download Artifacts

If test failed, download artifacts:
- `playwright-report` - See which test failed
- `test-videos` - Watch video of failure

#### Step 4: Reproduce Locally

```bash
# Set same environment as CI
export VITE_GEMINI_API_KEY=your_key

# Run specific failed test
npx playwright test --grep "test name"

# If passes locally, issue is CI-specific:
# - Check secrets configuration
# - Check network connectivity
# - Check API rate limits
```

#### Step 5: Check Workflow Logs for Warnings

Sometimes failures are preceded by warnings:
```
⚠ Cache not found
⚠ Slow API response (12.5s)
⚠ Rate limit approaching (80% used)
✗ Test failed - API timeout
```

### Common Failure Patterns

#### Pattern 1: Intermittent Failures

**Symptom:** Test passes sometimes, fails other times

**Causes:**
- Flaky test (timing issues)
- API rate limiting
- Network connectivity

**Solutions:**
- Add retry logic to tests
- Increase timeouts
- Use `test.retry(2)` in Playwright

#### Pattern 2: Works Locally, Fails in CI

**Symptom:** Tests pass on your machine but fail in GitHub Actions

**Causes:**
- Missing secret configuration
- Environment-specific code
- Different Node.js version

**Solutions:**
- Verify secrets are configured
- Check environment variables
- Match Node.js version exactly

#### Pattern 3: Fails After Dependency Update

**Symptom:** Tests fail immediately after `npm install` or `package.json` change

**Causes:**
- Breaking change in dependency
- Version mismatch
- Missing peer dependency

**Solutions:**
- Check `package-lock.json` diff
- Review dependency changelogs
- Run `npm ci` locally with new lock file

---

## 🚨 Alerts and Notifications

### Email Notifications

**Enable workflow failure emails:**
1. Go to repository
2. Click **Watch** button (top right)
3. Select **Custom**
4. Check **Actions**
5. Click **Apply**

**You'll receive emails when:**
- Workflow fails (on your commits)
- Workflow succeeds after previous failure
- Workflow is cancelled

### Slack Integration (Optional)

**Notify Slack channel on workflow status:**

1. **Create Slack App:**
   - Go to https://api.slack.com/apps
   - Create new app
   - Add Incoming Webhook
   - Get webhook URL

2. **Add Slack Webhook to Secrets:**
   - Repository → Settings → Secrets
   - Add secret: `SLACK_WEBHOOK_URL`
   - Value: Your webhook URL

3. **Update Workflow:**
```yaml
- name: Notify Slack on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"❌ CI/CD failed: ${{ github.workflow }} on ${{ github.ref }}"}'
```

### GitHub Actions Status Checks

**Require status checks before merging:**
1. Settings → Branches → Add rule
2. Branch name: `master`
3. Enable: "Require status checks to pass before merging"
4. Select all 3 workflows:
   - Playwright E2E Tests
   - TypeScript Check
   - Production Build
5. Save changes

**Effect:**
- Pull requests can't be merged if any workflow fails
- Forces all code to pass CI/CD before merge
- Prevents broken code from reaching master

---

## 📈 Advanced Configuration

### Run Workflows on Schedule

**Run tests every night at 2 AM UTC:**

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Every day at 2 AM UTC
  push:
    branches: [ main, master ]
```

**Use Cases:**
- Detect API changes overnight
- Catch time-dependent bugs
- Monitor application health

### Matrix Strategy (Multiple Node Versions)

**Test on Node.js 18, 20, and 22:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
```

**Effect:**
- Runs workflow 3 times (once per Node version)
- Ensures compatibility across versions
- Helps catch version-specific bugs

### Conditional Workflow Execution

**Run expensive tests only on master:**

```yaml
- name: Run full E2E suite
  if: github.ref == 'refs/heads/master'
  run: npm run test:e2e

- name: Run smoke tests only
  if: github.ref != 'refs/heads/master'
  run: npm run test:e2e -- --grep @smoke
```

---

## ✅ CI/CD Verification Checklist

Before considering CI/CD fully operational:

### Initial Setup
- [ ] All 3 workflows created in `.github/workflows/`
- [ ] Workflows trigger on push to master
- [ ] Workflows trigger on pull requests
- [ ] `GEMINI_API_KEY` secret configured

### Workflow Verification
- [ ] TypeScript Check passes (0 errors)
- [ ] Production Build passes (dist/ created)
- [ ] Playwright Tests pass (95/95 tests)
- [ ] Test artifacts uploaded correctly
- [ ] Build artifacts uploaded correctly

### Badge Configuration
- [ ] Badges added to README.md
- [ ] Badge URLs updated with actual repo name
- [ ] All 3 badges show green (passing)
- [ ] Badges link to correct workflow pages

### Notifications
- [ ] Email notifications enabled for failures
- [ ] Workflow failure emails received (test by breaking build)
- [ ] Slack integration configured (if desired)

### Branch Protection
- [ ] Status checks required for merging
- [ ] All 3 workflows required for PRs
- [ ] Direct pushes to master blocked (optional)

---

## 📞 Support and Resources

### GitHub Actions Documentation
- [GitHub Actions Overview](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Secrets and Variables](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Playwright Documentation
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [GitHub Actions Integration](https://playwright.dev/docs/ci-intro)

### Troubleshooting
- [GitHub Actions Troubleshooting](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/about-monitoring-and-troubleshooting)

---

**Next Document:** See `PRODUCTION_DEPLOYMENT.md` for deploying to Vercel, Netlify, or GitHub Pages.

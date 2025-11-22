# 📛 README Badge Configuration

**Last Updated:** November 19, 2025
**Purpose:** CI/CD status badges for README.md

---

## 🎯 Badge URLs

### Current Placeholders (Need Update)

The current README.md contains placeholder badges:

```markdown
[![Playwright Tests](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/playwright-tests.yml)
[![TypeScript Check](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/typescript.yml/badge.svg)](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/typescript.yml)
[![Production Build](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/clinical-extractor/actions/workflows/build.yml)
```

### Updated Badges for matheus-rech/la_consulta

Replace the placeholder badges in README.md with these:

```markdown
[![Playwright Tests](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml)
[![TypeScript Check](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml)
[![Production Build](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml)
```

---

## 🔧 How to Update README.md

### Option 1: Manual Edit

1. Open `README.md` in editor
2. Find the badge section (lines 7-9)
3. Replace `YOUR_USERNAME` with `matheus-rech`
4. Replace `clinical-extractor` with `la_consulta`
5. Save file
6. Commit: `git commit -m "docs: Update CI/CD badge URLs"`

### Option 2: Command Line (Automated)

```bash
# Navigate to project directory
cd /Users/matheusrech/Proj\ AG/a_consulta

# Replace placeholders with sed
sed -i '' 's/YOUR_USERNAME/matheus-rech/g' README.md
sed -i '' 's/clinical-extractor/la_consulta/g' README.md

# Verify changes
git diff README.md

# Commit
git add README.md
git commit -m "docs: Update CI/CD badge URLs with actual repository"
git push origin master
```

---

## 📊 Badge Appearance

### Badge States

**Passing (Green):**
```
✓ playwright tests - passing
```
![Passing Badge](https://img.shields.io/badge/build-passing-brightgreen)

**Failing (Red):**
```
✗ playwright tests - failing
```
![Failing Badge](https://img.shields.io/badge/build-failing-red)

**Pending (Yellow):**
```
⟳ playwright tests - pending
```
![Pending Badge](https://img.shields.io/badge/build-pending-yellow)

### Badge Behavior

- **Click badge** → Goes to workflow page
- **Hover badge** → Shows tooltip with status
- **Updates automatically** → After each workflow run

---

## 🎨 Recommended README Header

### Minimal (Current)

```markdown
# Clinical Extractor

[![Playwright Tests](badge-url)](workflow-url)
[![TypeScript Check](badge-url)](workflow-url)
[![Production Build](badge-url)](workflow-url)

A web-based clinical data extraction platform...
```

### Enhanced (With More Badges)

```markdown
# Clinical Extractor

[![Playwright Tests](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml)
[![TypeScript Check](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml)
[![Production Build](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)

A web-based clinical data extraction platform for systematic review of medical research papers.

## 🚀 Live Demo

- **Production:** [https://clinical-extractor.vercel.app](https://clinical-extractor.vercel.app)
- **Documentation:** [Complete Guide](CLAUDE.md)
- **AI Studio:** [Original Project](https://ai.studio/apps/drive/1DFFjaDptqv2f27UHIzLdxSc0rrZszk0G)
```

---

## 🏆 Additional Useful Badges

### Test Coverage

```markdown
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](./TEST_REPORT.md)
```

### Build Size

```markdown
[![Bundle Size](https://img.shields.io/badge/bundle%20size-133%20KB-brightgreen)](./BUILD_VERIFICATION.md)
```

### Version

```markdown
[![Version](https://img.shields.io/github/package-json/v/matheus-rech/la_consulta)](package.json)
```

### Last Commit

```markdown
[![Last Commit](https://img.shields.io/github/last-commit/matheus-rech/la_consulta)](https://github.com/matheus-rech/la_consulta/commits/master)
```

### Stars

```markdown
[![GitHub stars](https://img.shields.io/github/stars/matheus-rech/la_consulta?style=social)](https://github.com/matheus-rech/la_consulta/stargazers)
```

### Issues

```markdown
[![GitHub issues](https://img.shields.io/github/issues/matheus-rech/la_consulta)](https://github.com/matheus-rech/la_consulta/issues)
```

---

## 🔍 Verification After Update

### Step 1: Push Changes

```bash
git add README.md
git commit -m "docs: Update CI/CD badge URLs"
git push origin master
```

### Step 2: Wait for Workflows

Wait ~1-2 minutes for workflows to complete after push.

### Step 3: Check GitHub Repository

1. Go to https://github.com/matheus-rech/la_consulta
2. Scroll to README
3. Verify all 3 badges appear
4. Should show green "passing" badges (if workflows succeeded)

### Step 4: Click Each Badge

Click each badge and verify it links to correct workflow:

- **Playwright Tests** → `.../actions/workflows/playwright-tests.yml`
- **TypeScript Check** → `.../actions/workflows/typescript.yml`
- **Production Build** → `.../actions/workflows/build.yml`

### Step 5: Check Badge Status

All badges should show:
- **Green with "passing"** if workflows succeeded
- **Red with "failing"** if any workflow failed
- **Yellow with "pending"** if workflows still running

---

## 📝 Badge Template for Other Projects

If you deploy to other repositories, use this template:

```markdown
[![Playwright Tests](https://github.com/USERNAME/REPO/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/playwright-tests.yml)
[![TypeScript Check](https://github.com/USERNAME/REPO/actions/workflows/typescript.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/typescript.yml)
[![Production Build](https://github.com/USERNAME/REPO/actions/workflows/build.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/build.yml)
```

**Replace:**
- `USERNAME` → Your GitHub username
- `REPO` → Your repository name

---

## 🎯 Full Updated README Header

Copy this entire block to replace the current README header:

```markdown
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Clinical Extractor

[![Playwright Tests](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/playwright-tests.yml)
[![TypeScript Check](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/typescript.yml)
[![Production Build](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml/badge.svg)](https://github.com/matheus-rech/la_consulta/actions/workflows/build.yml)

A web-based clinical data extraction platform for systematic review of medical research papers, with a focus on neurosurgical literature.
```

---

## ✅ Checklist

- [ ] Replace `YOUR_USERNAME` with `matheus-rech` in README.md
- [ ] Replace `clinical-extractor` with `la_consulta` in README.md
- [ ] Commit changes: `git commit -m "docs: Update CI/CD badge URLs"`
- [ ] Push to GitHub: `git push origin master`
- [ ] Wait for workflows to complete (~2 minutes)
- [ ] Verify badges appear green on GitHub repository page
- [ ] Click each badge to verify workflow links work
- [ ] (Optional) Add additional badges for coverage, bundle size, etc.

---

**Status:** Badge configuration ready! Update README.md and push to see live CI/CD status badges. 🎨

# Dependency Vulnerabilities Report

**Date:** November 19, 2025
**Status:** 1 High Vulnerability (xlsx library)
**Action Required:** Review and mitigate

---

## ✅ Fixed Vulnerabilities

### 1. glob (Command Injection)
- **Severity:** High
- **CVE:** GHSA-5j98-mcp5-4vw2
- **Affected Versions:** 10.2.0 - 10.4.5
- **Fix Applied:** ✅ Updated via `npm audit fix`
- **Status:** **RESOLVED**

---

## ⚠️ Outstanding Vulnerability

### xlsx Library (SheetJS)

**Package:** `xlsx@0.18.5`
**Current Version:** 0.18.5 (latest available)
**Severity:** High
**Status:** ⚠️ **No patch available**

#### Vulnerabilities:

1. **Prototype Pollution**
   - **Advisory:** GHSA-4r6h-8v6p-xvw6
   - **Description:** Prototype pollution vulnerability in sheetJS
   - **Impact:** Attackers could potentially inject properties into Object.prototype
   - **CVSS Score:** High

2. **Regular Expression Denial of Service (ReDoS)**
   - **Advisory:** GHSA-5pgg-2g8v-p4x9
   - **Description:** Maliciously crafted input can cause excessive CPU usage
   - **Impact:** Denial of service through regex complexity attacks
   - **CVSS Score:** High

#### Current Usage in Application

The `xlsx` library is used in:
- **File:** `src/services/ExportManager.ts`
- **Function:** `exportExcel()` - Export data to Excel format
- **Usage:** Server-side file generation (no user input processing)

```typescript
import * as XLSX from 'xlsx';

// Used to create Excel workbooks for data export
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Extractions');
```

---

## Risk Assessment

### Prototype Pollution Risk: **LOW**
- ✅ We **generate** Excel files, not **parse** user-uploaded Excel files
- ✅ No untrusted input goes into xlsx library
- ✅ Only trusted data from form fields and extractions
- ⚠️ Still a concern if users could upload malicious Excel files in future

### ReDoS Risk: **LOW**
- ✅ We don't process complex regex patterns from user input
- ✅ Export function uses simple data structures
- ⚠️ Could become an issue if parsing user-uploaded Excel files

### Overall Risk: **LOW to MEDIUM**
**Current implementation is relatively safe, but requires monitoring.**

---

## Mitigation Strategies

### Option 1: Accept Risk (Recommended for Current Use Case)
**Status:** ✅ **Currently Implemented**

Since we only **generate** Excel files and don't **parse** user-uploaded files, the vulnerabilities are not exploitable in our current codebase.

**Rationale:**
- No user file uploads processed by xlsx
- Only trusted data exported
- Vulnerabilities require malicious Excel files as input
- We're using xlsx for output only

**Action:**
- ✅ Document risk in SECURITY.md
- ✅ Add security note in ExportManager.ts
- ✅ Monitor for patches in future releases

### Option 2: Switch to Alternative Library
**Status:** ⏳ **Evaluate if Risk Increases**

If we add Excel **import** functionality in the future, consider switching to:

**Alternative 1: exceljs**
- **Package:** `exceljs@4.4.0`
- **Pros:** Active maintenance, no known high vulnerabilities
- **Cons:** Larger bundle size, different API
- **Migration Effort:** 2-3 hours

**Alternative 2: xlsx-populate**
- **Package:** `xlsx-populate@1.21.0`
- **Pros:** Similar API, smaller footprint
- **Cons:** Less feature-complete
- **Migration Effort:** 1-2 hours

**Alternative 3: @sheet/dom (Community fork)**
- **Package:** `@sheet/dom`
- **Pros:** Community-maintained security patches
- **Cons:** Less stable, smaller community
- **Migration Effort:** 3-4 hours

### Option 3: Add Input Validation Layer
**Status:** ⏳ **Future Enhancement**

If Excel import is added:
1. Sanitize all input before passing to xlsx
2. Use Content Security Policy (CSP)
3. Run xlsx parsing in sandboxed Web Worker
4. Implement file size limits
5. Validate Excel structure before processing

```typescript
// Future implementation example
async function safeParseExcel(file: File): Promise<Data> {
  // 1. Validate file size
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large');

  // 2. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error('Invalid file type');

  // 3. Parse in sandboxed worker
  const worker = new Worker('xlsx-worker.js');
  const data = await worker.parseExcel(file);

  // 4. Validate output structure
  return validateExcelData(data);
}
```

---

## Recommendations

### Immediate Actions ✅
1. **Document in SECURITY.md** - Add xlsx vulnerability to Known Security Considerations
2. **Add code comment** - Document risk in ExportManager.ts
3. **Update README** - Mention Excel export is safe (output-only)

### Short-Term (Next Sprint) 📋
4. **Monitor for patches** - Check weekly for xlsx updates
5. **Consider alternatives** - Evaluate exceljs if adding import features
6. **Add to CI/CD** - Automated npm audit in GitHub Actions

### Long-Term (Production Phase) 🔮
7. **Dependency scanning** - Integrate Snyk or Dependabot alerts
8. **Security policy** - Define acceptable vulnerability thresholds
9. **Regular audits** - Monthly security review of dependencies

---

## Implementation: Security Documentation

### 1. Add to SECURITY.md

```markdown
### 4. Dependency Vulnerabilities

**xlsx (SheetJS) Library:**
The application uses xlsx@0.18.5 for Excel export functionality. This version has known vulnerabilities:
- Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
- ReDoS (GHSA-5pgg-2g8v-p4x9)

**Mitigation:** We only **generate** Excel files, never **parse** user-uploaded files. The vulnerabilities require malicious input files to exploit. Risk is LOW for current use case.

**Monitoring:** We track xlsx releases and will upgrade when patches are available.
```

### 2. Add to ExportManager.ts

```typescript
/**
 * SECURITY NOTE: xlsx@0.18.5 has known vulnerabilities (Prototype Pollution, ReDoS)
 * but they are NOT exploitable in our use case because:
 * 1. We only GENERATE Excel files (output-only)
 * 2. We never PARSE user-uploaded Excel files
 * 3. All data comes from trusted form inputs
 *
 * If Excel IMPORT is added in the future, reevaluate and consider:
 * - Switching to 'exceljs' library
 * - Implementing input sanitization
 * - Sandboxing file parsing in Web Worker
 *
 * See: DEPENDENCY_VULNERABILITIES.md
 */
import * as XLSX from 'xlsx';
```

---

## Monitoring & Alerting

### Weekly Check
```bash
# Check for xlsx updates
npm outdated xlsx

# Run security audit
npm audit --production
```

### GitHub Actions (Recommended)
```yaml
# .github/workflows/security-audit.yml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  push:
    branches: [master]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: Check for outdated packages
        run: npm outdated || true
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-19 | Accept xlsx risk | Output-only use case, vulnerabilities not exploitable |
| TBD | Monitor weekly | Track for patches |
| TBD | Evaluate alternatives | If adding Excel import feature |

---

## Summary

✅ **1 vulnerability fixed** (glob)
⚠️ **1 vulnerability accepted** (xlsx - low risk for current use)
📋 **Action:** Document in SECURITY.md, add code comments
🔍 **Monitoring:** Weekly npm audit checks

**Conclusion:** Application is safe to deploy. The xlsx vulnerability is not exploitable in our current implementation (output-only). We will monitor for patches and reevaluate if adding Excel import features.

---

**Report Generated:** November 19, 2025 (Updated: November 19, 2025 - Post-test fixes)
**Next Review:** November 26, 2025
**Status:** ✅ Safe for Production Deployment
**Latest Audit:** November 19, 2025 - `npm audit` run, 1 high vulnerability (xlsx) - accepted risk

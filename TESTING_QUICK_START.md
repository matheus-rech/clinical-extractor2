# Testing Quick Start Guide

**Backend Migration v2.0 - Phase 5**

This guide provides quick commands for running the comprehensive test suite.

---

## 🚀 Quick Start (TL;DR)

```bash
# Make script executable (first time only)
chmod +x run-all-tests.sh

# Run all tests
./run-all-tests.sh

# View coverage report
open coverage/lcov-report/index.html
```

---

## 📋 Test Categories

### 1. Integration Tests (50+ tests)

**Backend Integration:**
```bash
npm test tests/integration/backend-integration.test.ts
```

**Cache Integration:**
```bash
npm test tests/integration/cache-integration.test.ts
```

**All Integration Tests:**
```bash
npm test tests/integration/
```

### 2. E2E Tests (30+ tests)

**Backend Migration E2E:**
```bash
npx playwright test backend-migration-e2e.spec.ts
```

**All E2E Tests:**
```bash
npm run test:e2e
```

**E2E with Visible Browser:**
```bash
npm run test:e2e:headed
```

**E2E Debug Mode:**
```bash
npm run test:e2e:debug
```

### 3. Performance Tests (15+ tests)

**Cache Performance:**
```bash
npm test tests/performance/cache-performance.test.ts
```

**All Performance Tests:**
```bash
npm test tests/performance/
```

### 4. Error Handling Tests (30+ tests)

**Error Handling:**
```bash
npm test tests/unit/error-handling.test.ts
```

### 5. Unit Tests (50+ tests)

**All Unit Tests:**
```bash
npm test tests/unit/
```

**Specific Unit Test:**
```bash
npm test tests/unit/DirectGeminiClient.test.ts
```

---

## 🎯 Coverage Analysis

**Generate Coverage Report:**
```bash
npm run test:coverage
```

**View Coverage Report:**
```bash
open coverage/lcov-report/index.html
```

**Coverage Targets:**
- Overall: 90%+ ✅
- CacheManager: 95%+ ✅
- BackendAIClient: 90%+ ✅
- DirectGeminiClient: 85%+ ✅
- AIService: 80%+ ✅

---

## 🔍 TypeScript Verification

**Check TypeScript Compilation:**
```bash
npx tsc --noEmit
```

**Check Specific File:**
```bash
npx tsc src/services/BackendAIClient.ts --noEmit
```

---

## 🐍 Backend Tests (Python)

**Run Backend Tests:**
```bash
cd backend
poetry run pytest tests/ -v
cd ..
```

**Backend Test Coverage:**
```bash
cd backend
poetry run pytest tests/ --cov=app --cov-report=html
cd ..
```

---

## 🎨 Test Filtering

**Run Tests Matching Pattern:**
```bash
npm test -- -t "backend"
```

**Run Tests in Specific File:**
```bash
npm test tests/integration/backend-integration.test.ts
```

**Run Tests in Watch Mode:**
```bash
npm run test:watch
```

**Run Tests with Verbose Output:**
```bash
npm test -- --verbose
```

---

## 🚦 Continuous Integration

**Pre-Commit Checks:**
```bash
# 1. TypeScript
npx tsc --noEmit

# 2. Unit Tests
npm test tests/unit/

# 3. Integration Tests
npm test tests/integration/

# All good? Commit!
git commit -m "Your message"
```

**Pre-Push Checks:**
```bash
# Run full suite
./run-all-tests.sh

# All green? Push!
git push
```

---

## 📊 Test Statistics

### Current Test Count

| Category | Tests | Status |
|----------|-------|--------|
| Unit Tests | 50+ | ✅ |
| Integration Tests | 50+ | ✅ |
| E2E Tests | 30+ | ✅ |
| Performance Tests | 15+ | ✅ |
| Error Handling | 30+ | ✅ |
| **TOTAL** | **175+** | **✅** |

### Execution Times (Estimated)

| Test Suite | Time |
|-----------|------|
| TypeScript Check | ~5s |
| Unit Tests | ~10s |
| Integration Tests | ~15s |
| Performance Tests | ~20s |
| Backend Tests | ~10s |
| E2E Tests | ~60s |
| Coverage | ~30s |
| **TOTAL** | **~2.5 min** |

---

## 🐛 Debugging Failed Tests

**View Test Output:**
```bash
npm test -- --verbose
```

**Run Single Test:**
```bash
npm test -t "should call backend API for PICO generation"
```

**Debug with Node Inspector:**
```bash
node --inspect-brk node_modules/.bin/jest tests/integration/backend-integration.test.ts
```

**Check Test Logs:**
```bash
# Jest logs
cat npm-debug.log

# Playwright logs
npx playwright show-report
```

---

## 🔧 Common Issues

### Issue: "Module not found"
```bash
# Solution: Install dependencies
npm install
```

### Issue: "Backend tests fail"
```bash
# Solution: Install backend dependencies
cd backend
poetry install
cd ..
```

### Issue: "E2E tests timeout"
```bash
# Solution: Increase timeout in playwright.config.ts
# Or run with longer timeout:
npx playwright test --timeout=60000
```

### Issue: "Coverage below 90%"
```bash
# Solution: Check which files are missing coverage
npm run test:coverage
open coverage/lcov-report/index.html
# Add tests for uncovered areas
```

---

## 📚 Related Documentation

- **VALIDATION_CHECKLIST.md** - Complete validation checklist
- **PHASE_5_COMPLETE.md** - Phase 5 completion report
- **run-all-tests.sh** - Automated test runner
- **tests/README.md** - Detailed testing documentation

---

## 🎉 Success Criteria

All tests should pass with:
- ✅ Zero TypeScript errors
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ All performance tests passing
- ✅ Coverage ≥ 90%

If all criteria met:
```
=== ALL TESTS PASSED ✅ ===
Backend Migration v2.0 - Phase 5 Complete!
```

---

## 💡 Tips

**Speed Up Tests:**
```bash
# Run tests in parallel (if supported)
npm test -- --maxWorkers=4
```

**Skip Slow Tests:**
```bash
# Skip E2E tests for quick feedback
npm test tests/unit/ tests/integration/
```

**Continuous Testing:**
```bash
# Watch mode for active development
npm run test:watch
```

**Generate HTML Report:**
```bash
# For E2E tests
npx playwright test --reporter=html
npx playwright show-report
```

---

**Last Updated:** November 19, 2025
**Maintained By:** Backend Migration Team
**Questions?** See VALIDATION_CHECKLIST.md or PHASE_5_COMPLETE.md

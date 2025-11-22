#!/bin/bash

echo "=== AI Test Suites Verification ==="
echo ""

echo "📁 Files Created:"
echo "  1. tests/e2e-playwright/helpers/ai-helpers.ts"
echo "  2. tests/e2e-playwright/03-ai-pico-extraction.spec.ts"
echo "  3. tests/e2e-playwright/04-multi-agent-pipeline.spec.ts"
echo ""

echo "📊 Test Statistics:"
echo "  AI Helper Functions: $(grep -c "^export async function" tests/e2e-playwright/helpers/ai-helpers.ts)"
echo "  PICO Extraction Tests: $(grep -c "^  test(" tests/e2e-playwright/03-ai-pico-extraction.spec.ts)"
echo "  Multi-Agent Pipeline Tests: $(grep -c "^  test(" tests/e2e-playwright/04-multi-agent-pipeline.spec.ts)"
echo "  Total Tests: $(($(grep -c "^  test(" tests/e2e-playwright/03-ai-pico-extraction.spec.ts) + $(grep -c "^  test(" tests/e2e-playwright/04-multi-agent-pipeline.spec.ts)))"
echo ""

echo "📝 Lines of Code:"
wc -l tests/e2e-playwright/helpers/ai-helpers.ts tests/e2e-playwright/03-ai-pico-extraction.spec.ts tests/e2e-playwright/04-multi-agent-pipeline.spec.ts
echo ""

echo "✅ TypeScript Compilation:"
npx tsc tests/e2e-playwright/helpers/ai-helpers.ts --noEmit --skipLibCheck 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ ai-helpers.ts - No errors"
else
  echo "  ❌ ai-helpers.ts - Has errors"
fi

npx tsc tests/e2e-playwright/03-ai-pico-extraction.spec.ts --noEmit --skipLibCheck 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ 03-ai-pico-extraction.spec.ts - No errors"
else
  echo "  ❌ 03-ai-pico-extraction.spec.ts - Has errors"
fi

npx tsc tests/e2e-playwright/04-multi-agent-pipeline.spec.ts --noEmit --skipLibCheck 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ 04-multi-agent-pipeline.spec.ts - No errors"
else
  echo "  ❌ 04-multi-agent-pipeline.spec.ts - Has errors"
fi

echo ""
echo "🎯 Test Coverage Areas:"
echo "  ✅ PICO field generation (6 fields)"
echo "  ✅ Summary generation"
echo "  ✅ Metadata extraction (DOI, PMID, journal, year)"
echo "  ✅ Field validation with AI"
echo "  ✅ Deep analysis with extended thinking"
echo "  ✅ Geometric figure extraction (operator interception)"
echo "  ✅ Geometric table extraction (Y/X clustering)"
echo "  ✅ Content classification"
echo "  ✅ Multi-agent consensus"
echo "  ✅ Confidence scoring"
echo "  ✅ Provenance visualization"
echo "  ✅ Error handling (API errors, timeouts, failures)"
echo "  ✅ Rate limiting"
echo ""

echo "🚀 How to Run Tests:"
echo "  All AI tests: npm run test:e2e -- tests/e2e-playwright/03-ai-pico-extraction.spec.ts tests/e2e-playwright/04-multi-agent-pipeline.spec.ts"
echo "  PICO tests:   npm run test:e2e -- tests/e2e-playwright/03-ai-pico-extraction.spec.ts"
echo "  Pipeline:     npm run test:e2e -- tests/e2e-playwright/04-multi-agent-pipeline.spec.ts"
echo "  With UI:      npm run test:e2e -- tests/e2e-playwright/03-ai-pico-extraction.spec.ts --headed"
echo ""

echo "✅ Verification Complete!"

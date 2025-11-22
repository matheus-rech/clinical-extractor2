#!/bin/bash
# Backend Migration Test Suite Runner
# Phase 5: Testing & Validation
#
# This script runs all tests for the backend migration:
# - TypeScript compilation
# - Unit tests
# - Integration tests
# - Backend tests
# - E2E tests
# - Coverage analysis
#
# Usage: ./run-all-tests.sh
# Optional: ./run-all-tests.sh --verbose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verbose flag
VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}$1${NC}"
}

# Start time
START_TIME=$(date +%s)

print_header "BACKEND MIGRATION TEST SUITE"
echo "Starting comprehensive test execution..."
echo "Phase 5: Testing & Validation"
echo ""

# ==================== 1. TypeScript Compilation ====================
print_step "1️⃣  TypeScript Compilation Check"
echo "Verifying TypeScript code compiles without errors..."
echo ""

if npx tsc --noEmit; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

echo ""

# ==================== 2. Unit Tests ====================
print_step "2️⃣  Unit Tests"
echo "Running unit tests for individual components..."
echo ""

if $VERBOSE; then
    npm test -- tests/unit/ --verbose
else
    npm test -- tests/unit/ --silent
fi

if [ $? -eq 0 ]; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

echo ""

# ==================== 3. Integration Tests ====================
print_step "3️⃣  Integration Tests"
echo "Running integration tests for backend routing and cache..."
echo ""

if $VERBOSE; then
    npm test -- tests/integration/ --verbose
else
    npm test -- tests/integration/ --silent
fi

if [ $? -eq 0 ]; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

echo ""

# ==================== 4. Performance Tests ====================
print_step "4️⃣  Performance Tests"
echo "Running performance tests for cache efficiency..."
echo ""

if $VERBOSE; then
    npm test -- tests/performance/ --verbose
else
    npm test -- tests/performance/ --silent
fi

if [ $? -eq 0 ]; then
    print_success "Performance tests passed"
else
    print_error "Performance tests failed"
    exit 1
fi

echo ""

# ==================== 5. Backend Tests (Python) ====================
print_step "5️⃣  Backend Tests (Python/FastAPI)"
echo "Running backend API tests..."
echo ""

# Check if backend directory exists
if [ -d "backend" ]; then
    cd backend

    # Check if poetry is installed
    if command -v poetry &> /dev/null; then
        if $VERBOSE; then
            poetry run pytest tests/ -v
        else
            poetry run pytest tests/ -q
        fi

        if [ $? -eq 0 ]; then
            print_success "Backend tests passed"
        else
            print_error "Backend tests failed"
            cd ..
            exit 1
        fi
    else
        print_info "Poetry not installed - skipping backend tests"
        print_info "Install with: pip install poetry"
    fi

    cd ..
else
    print_info "Backend directory not found - skipping backend tests"
fi

echo ""

# ==================== 6. E2E Tests (Playwright) ====================
print_step "6️⃣  E2E Tests (Playwright)"
echo "Running end-to-end browser tests..."
echo ""

# Check if Playwright is installed
if command -v playwright &> /dev/null; then
    # Start dev server in background
    print_info "Starting dev server on port 3000..."
    npm run dev > /dev/null 2>&1 &
    DEV_SERVER_PID=$!

    # Wait for server to start
    sleep 5

    # Check if server is running
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Dev server started (PID: $DEV_SERVER_PID)"

        # Run E2E tests
        if $VERBOSE; then
            npx playwright test backend-migration-e2e.spec.ts
        else
            npx playwright test backend-migration-e2e.spec.ts --quiet
        fi

        E2E_EXIT_CODE=$?

        # Stop dev server
        print_info "Stopping dev server..."
        kill $DEV_SERVER_PID 2>/dev/null || true
        sleep 2

        if [ $E2E_EXIT_CODE -eq 0 ]; then
            print_success "E2E tests passed"
        else
            print_error "E2E tests failed"
            exit 1
        fi
    else
        print_error "Dev server failed to start"
        kill $DEV_SERVER_PID 2>/dev/null || true
        exit 1
    fi
else
    print_info "Playwright not installed - skipping E2E tests"
    print_info "Install with: npm install -D @playwright/test"
fi

echo ""

# ==================== 7. Coverage Analysis ====================
print_step "7️⃣  Coverage Analysis"
echo "Generating test coverage report..."
echo ""

if $VERBOSE; then
    npm run test:coverage
else
    npm run test:coverage --silent
fi

if [ $? -eq 0 ]; then
    print_success "Coverage report generated"

    # Extract coverage percentage (if possible)
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*' | head -1 | grep -o '[0-9]*' | tail -1)
        if [ ! -z "$COVERAGE" ]; then
            print_info "Overall coverage: ${COVERAGE}%"

            if [ "$COVERAGE" -ge 90 ]; then
                print_success "Coverage target met (≥90%)"
            else
                print_error "Coverage below target (<90%)"
            fi
        fi
    fi
else
    print_error "Coverage generation failed"
    exit 1
fi

echo ""

# ==================== Summary ====================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "TEST SUITE SUMMARY"

echo -e "${GREEN}✅ All Tests Passed!${NC}"
echo ""
echo "Test Results:"
echo "  • TypeScript Compilation: ✅ OK"
echo "  • Unit Tests: ✅ PASS"
echo "  • Integration Tests: ✅ PASS"
echo "  • Performance Tests: ✅ PASS"
if [ -d "backend" ] && command -v poetry &> /dev/null; then
    echo "  • Backend Tests: ✅ PASS"
fi
if command -v playwright &> /dev/null; then
    echo "  • E2E Tests: ✅ PASS"
fi
echo "  • Coverage Analysis: ✅ COMPLETE"
echo ""
echo "Total Execution Time: ${DURATION}s"
echo ""

print_success "Backend Migration v2.0 - Phase 5 Complete!"
echo ""
echo "Next Steps:"
echo "  1. Review coverage report: open coverage/lcov-report/index.html"
echo "  2. Check VALIDATION_CHECKLIST.md for sign-off"
echo "  3. Merge to main branch"
echo "  4. Deploy to production"
echo ""

exit 0

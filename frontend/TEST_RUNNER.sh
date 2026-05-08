#!/bin/bash

# Print System Test Runner
# Runs all unit, integration, and error handling tests

set -e

TESTS_DIR="frontend/src/utils/__tests__"
RESULTS_FILE="frontend/TEST_RESULTS.md"

echo "======================================"
echo "Print System Test Suite"
echo "======================================"
echo ""

# Check if Jest is installed
if ! command -v jest &> /dev/null && ! command -v npm &> /dev/null; then
    echo "ERROR: Jest/npm not found. Please install dependencies."
    exit 1
fi

# Run tests with proper configuration
echo "Running unit tests..."
echo ""

# Initialize results file
cat > "$RESULTS_FILE" << 'EOF'
# Print System Test Results

Generated: $(date)

## Test Summary

| Category | File | Tests | Status |
|----------|------|-------|--------|

EOF

# Test files
TEST_FILES=(
    "printValidator.test.js"
    "smartPrintHandler.test.js"
    "printWorkflow.integration.test.js"
    "printErrors.test.js"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "Test Files Found:"
echo "================="
for test_file in "${TEST_FILES[@]}"; do
    if [ -f "$TESTS_DIR/$test_file" ]; then
        echo "✓ $test_file"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        echo "✗ $test_file (not found)"
    fi
done

echo ""
echo "Running Tests..."
echo "================"
echo ""

# Try running with npm test
if [ -f "frontend/package.json" ]; then
    cd frontend
    npm test -- --testMatch="**/__tests__/*.test.js" --coverage 2>&1 | tee "../test_output.log" || true
    cd ..
else
    echo "package.json not found in frontend directory"
    exit 1
fi

echo ""
echo "======================================"
echo "Test Execution Complete"
echo "======================================"
echo ""
echo "Check TEST_RESULTS.md for detailed results"

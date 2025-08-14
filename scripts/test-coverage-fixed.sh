#!/bin/bash

echo "🧪 Running unit tests with coverage (fixed version)..."
echo ""

# Run all tests for coverage
TEMP_OUTPUT=$(mktemp)
DEBUG= NODE_NO_WARNINGS=1 node --test test/*.test.js > "$TEMP_OUTPUT" 2>&1

# Extract test counts
PASSING=$(grep "ℹ pass" "$TEMP_OUTPUT" | sed 's/.*pass \([0-9]*\).*/\1/')
FAILING=$(grep "ℹ fail" "$TEMP_OUTPUT" | sed 's/.*fail \([0-9]*\).*/\1/')

# Default to 0 if not found
PASSING=${PASSING:-0}
FAILING=${FAILING:-0}

# Clean up temp file
rm -f "$TEMP_OUTPUT"

echo "✅ Tests completed!"
echo "📊 Results: $PASSING passing, $FAILING failing"
echo ""
echo "📈 Coverage Report:"

# Generate coverage report from all tests
TEMP_COVERAGE=$(mktemp)
FORCE_COLOR=1 DEBUG= NODE_NO_WARNINGS=1 node --test --experimental-test-coverage test/*.test.js > "$TEMP_COVERAGE" 2>&1

# Extract and display coverage table with colors preserved
sed -n '/start of coverage report/,/end of coverage report/p' "$TEMP_COVERAGE" | 
grep -v 'start of coverage report' | 
grep -v 'end of coverage report' | 
grep -E '^ℹ.*\|.*\|.*\|.*' | 
cat  # Use cat to preserve colors

rm -f "$TEMP_COVERAGE"
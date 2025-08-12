#!/bin/bash

echo "🧪 Running unit tests with coverage..."
echo ""

# Run only unit tests silently and get counts
TEMP_OUTPUT=$(mktemp)
DEBUG= NODE_NO_WARNINGS=1 node --test test/index.test.js > "$TEMP_OUTPUT" 2>&1

PASSING=$(grep "ℹ pass" "$TEMP_OUTPUT" | sed 's/.*pass \([0-9]*\).*/\1/')
FAILING=$(grep "ℹ fail" "$TEMP_OUTPUT" | sed 's/.*fail \([0-9]*\).*/\1/')
PASSING=${PASSING:-0}
FAILING=${FAILING:-0}

rm -f "$TEMP_OUTPUT"

# Get coverage data from unit tests only
COVERAGE_OUTPUT=$(mktemp)
DEBUG= NODE_NO_WARNINGS=1 node --test --experimental-test-coverage test/index.test.js > "$COVERAGE_OUTPUT" 2>&1

# Extract coverage percentages from the coverage table
COVERAGE_LINE=$(grep "index.js" "$COVERAGE_OUTPUT" | grep "|")
LINE_COV=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $2}' | grep -o '[0-9]\+\.[0-9]\+')
BRANCH_COV=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $3}' | grep -o '[0-9]\+\.[0-9]\+')
FUNC_COV=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $4}' | grep -o '[0-9]\+\.[0-9]\+')

rm -f "$COVERAGE_OUTPUT"

# Display results
echo "✅ Tests: $PASSING passing, $FAILING failing"
echo "📊 Coverage: ${LINE_COV}% lines, ${BRANCH_COV}% branches, ${FUNC_COV}% functions"
echo ""

# Show coverage status with colors
if (( $(echo "$LINE_COV >= 90" | bc -l) )); then
    echo -e "🟢 Line coverage: ${LINE_COV}% (excellent)"
elif (( $(echo "$LINE_COV >= 80" | bc -l) )); then
    echo -e "🟡 Line coverage: ${LINE_COV}% (good)"
else
    echo -e "🔴 Line coverage: ${LINE_COV}% (needs improvement)"
fi
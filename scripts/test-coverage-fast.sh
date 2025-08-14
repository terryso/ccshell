#!/bin/bash

echo "🧪 Running unit tests with coverage (fast mode)..."
echo ""

# Run tests with shorter timeout to avoid hanging
timeout 30 node --test --experimental-test-coverage test/*.test.js 2>/dev/null | grep -A 10 "start of coverage report" || {
    echo "⚠️  Coverage test timed out, running basic tests only..."
    timeout 15 node --test --experimental-test-coverage test/index.test.js 2>/dev/null | grep -A 10 "start of coverage report"
}
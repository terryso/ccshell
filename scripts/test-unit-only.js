#!/usr/bin/env node

const { execSync } = require('child_process');

// Run only unit tests (avoiding integration tests that call actual CLI)
try {
  console.log('🧪 Running unit tests only...\n');
  
  // Run only the logic tests, not the integration CLI tests
  const output = execSync('DEBUG= NODE_NO_WARNINGS=1 node --test test/index.test.js', {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, DEBUG: undefined, NODE_NO_WARNINGS: '1' }
  });
  
  // Parse and display clean results
  const lines = output.split('\n');
  let passing = 0;
  let failing = 0;
  let suites = 0;
  
  lines.forEach(line => {
    if (line.includes('✔') && !line.includes('ms)') && !line.includes('▶')) {
      suites++;
    }
    if (line.includes('ℹ pass ')) {
      passing = parseInt(line.match(/ℹ pass (\d+)/)[1]);
    }
    if (line.includes('ℹ fail ')) {
      failing = parseInt(line.match(/ℹ fail (\d+)/)[1]);
    }
  });
  
  console.log(`✅ Unit tests completed successfully!`);
  console.log(`📊 Results: ${passing} passing, ${failing} failing`);
  
  // Show coverage if requested
  if (process.argv.includes('--coverage')) {
    console.log('\n📈 Coverage Report:');
    
    try {
      execSync('DEBUG= NODE_NO_WARNINGS=1 node --test --experimental-test-coverage test/index.test.js 2>/dev/null | sed -n "/start of coverage report/,/end of coverage report/p" | grep -v "start of coverage report" | grep -v "end of coverage report" | sed "s/^ℹ  *//"', {
        stdio: 'inherit',
        env: { ...process.env, DEBUG: undefined, NODE_NO_WARNINGS: '1', FORCE_COLOR: '1' }
      });
    } catch (coverageError) {
      console.log('⚠️  Coverage report not available');
    }
  }
  
} catch (error) {
  console.error('❌ Tests failed:');
  
  // Show only the important error information
  const errorOutput = error.stdout || error.stderr || error.message;
  const lines = errorOutput.split('\n');
  
  lines.forEach(line => {
    if (line.includes('✖') || line.includes('AssertionError') || line.includes('Error:')) {
      console.error(line);
    }
  });
  
  process.exit(1);
}
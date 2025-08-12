#!/usr/bin/env node

const { execSync } = require('child_process');

// Run tests with minimal output
try {
  console.log('🧪 Running unit tests...\n');
  
  // Run tests and capture output
  const output = execSync('DEBUG= NODE_NO_WARNINGS=1 node --test test/*.test.js', {
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
    if (line.includes('✔') && !line.includes('ms)')) {
      suites++;
    }
    if (line.includes('ℹ pass ')) {
      passing = parseInt(line.match(/ℹ pass (\d+)/)[1]);
    }
    if (line.includes('ℹ fail ')) {
      failing = parseInt(line.match(/ℹ fail (\d+)/)[1]);
    }
  });
  
  console.log(`✅ Tests completed successfully!`);
  console.log(`📊 Results: ${passing} passing, ${failing} failing, ${suites} test suites`);
  
  // Show coverage if requested
  if (process.argv.includes('--coverage')) {
    console.log('\n📈 Coverage Report:');
    
    // Run coverage with colors forced and direct output
    try {
      execSync('DEBUG= node --test --experimental-test-coverage test/*.test.js 2>/dev/null | sed -n "/start of coverage report/,/end of coverage report/p" | grep -v "start of coverage report" | grep -v "end of coverage report" | sed "s/^ℹ  *//"', {
        stdio: 'inherit',
        env: { ...process.env, DEBUG: undefined, FORCE_COLOR: '1' }
      });
    } catch (coverageError) {
      // Fallback to basic coverage display
      const coverageOutput = execSync('DEBUG= node --test --experimental-test-coverage test/*.test.js 2>/dev/null', {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: undefined }
      });
      
      const coverageLines = coverageOutput.split('\n');
      let inCoverageReport = false;
      
      coverageLines.forEach(line => {
        if (line.includes('start of coverage report')) {
          inCoverageReport = true;
          return;
        }
        if (line.includes('end of coverage report')) {
          inCoverageReport = false;
          return;
        }
        if (inCoverageReport && line.trim()) {
          const cleanLine = line.replace(/^ℹ\s+/, '');
          if (cleanLine) {
            console.log(cleanLine);
          }
        }
      });
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
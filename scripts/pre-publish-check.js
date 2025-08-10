#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-publish checks...');

// Check required files exist
const requiredFiles = [
  'package.json',
  'README.md', 
  'LICENSE',
  'index.js'
];

let hasErrors = false;

console.log('\n📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (missing)`);
    hasErrors = true;
  }
});

// Check package.json validity
console.log('\n📦 Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'bin'];
  requiredFields.forEach(field => {
    if (pkg[field]) {
      console.log(`  ✅ ${field}: ${typeof pkg[field] === 'object' ? JSON.stringify(pkg[field]) : pkg[field]}`);
    } else {
      console.log(`  ❌ ${field} (missing)`);
      hasErrors = true;
    }
  });

  // Check index.js is executable
  console.log('\n🔧 Checking executable...');
  try {
    const stats = fs.statSync('index.js');
    if (stats.mode & parseInt('111', 8)) {
      console.log('  ✅ index.js is executable');
    } else {
      console.log('  ⚠️  index.js may not be executable');
    }
  } catch (e) {
    console.log('  ❌ Cannot check index.js permissions');
    hasErrors = true;
  }

} catch (e) {
  console.log('  ❌ package.json is invalid JSON');
  hasErrors = true;
}

// Check README has content
console.log('\n📖 Checking README...');
try {
  const readme = fs.readFileSync('README.md', 'utf8');
  if (readme.length > 100) {
    console.log('  ✅ README.md has content');
  } else {
    console.log('  ⚠️  README.md seems too short');
  }
} catch (e) {
  console.log('  ❌ Cannot read README.md');
  hasErrors = true;
}

if (hasErrors) {
  console.log('\n❌ Pre-publish checks failed. Please fix the issues above.');
  process.exit(1);
} else {
  console.log('\n✅ All pre-publish checks passed!');
  process.exit(0);
}
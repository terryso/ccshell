#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Parse command line arguments
const versionType = process.argv[2] || 'patch';
const validTypes = ['patch', 'minor', 'major'];

if (!validTypes.includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

console.log(`🚀 Starting ${versionType} release...`);

try {
  // Step 1: Run pre-publish checks
  console.log('\n🔍 Running pre-publish checks...');
  execSync('npm run prepublish-check', { stdio: 'inherit' });
  
  // Step 2: Update version
  console.log(`\n📦 Bumping ${versionType} version...`);
  const output = execSync(`npm version ${versionType} --no-git-tag-version`, { encoding: 'utf8' });
  const newVersion = output.trim();
  console.log(`  ✅ Version updated to ${newVersion}`);

  // Step 3: Read updated package.json to get the exact version
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = pkg.version;

  // Step 4: Commit changes
  console.log('\n📝 Committing changes...');
  execSync('git add package.json package-lock.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to v${version}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"`, { stdio: 'inherit' });

  // Step 5: Create and push tag
  console.log('\n🏷️  Creating and pushing tag...');
  execSync(`git tag v${version}`, { stdio: 'inherit' });
  execSync('git push origin develop', { stdio: 'inherit' });
  execSync(`git push origin v${version}`, { stdio: 'inherit' });

  console.log(`\n✅ Release v${version} completed successfully!`);
  console.log('\n🔗 What happens next:');
  console.log('  1. GitHub Actions will run tests');
  console.log('  2. If tests pass, package will be published to npm');
  console.log('  3. GitHub Release will be created automatically');
  console.log('\n📊 Monitor progress at:');
  console.log('  https://github.com/terryso/ccshell/actions');
  
} catch (error) {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
}
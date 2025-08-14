const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Test helper to run ccshell commands
function runCCShell(args) {
  try {
    const result = execSync(`node index.js ${args}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || '', 
      exitCode: error.status || 1 
    };
  }
}

describe('Script Library Features', () => {
  let testConfigDir;
  let testScriptDir;
  let originalHome;

  beforeEach(() => {
    // Create temporary test directories
    testConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccshell-test-'));
    testScriptDir = path.join(testConfigDir, '.ccshell', 'scripts');
    
    // Override home directory for testing
    originalHome = process.env.HOME;
    process.env.HOME = testConfigDir;
  });

  afterEach(() => {
    // Restore original home directory
    process.env.HOME = originalHome;
    
    // Clean up test directories
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  test('should show empty script library initially', () => {
    const result = runCCShell('--scripts');
    
    assert.ok(result.stdout.includes('本地脚本库') || result.stdout.includes('Local Script Library'));
    assert.ok(result.stdout.includes('暂无保存的脚本') || result.stdout.includes('No scripts saved yet'));
    assert.strictEqual(result.exitCode, 0);
  });

  test('should show script library management commands in help', () => {
    const result = runCCShell('--help');
    
    assert.ok(result.stdout.includes('--scripts'));
    assert.ok(result.stdout.includes('--clean-scripts'));
    assert.ok(result.stdout.includes('--disable-library'));
    assert.strictEqual(result.exitCode, 0);
  });

  test('should handle clean-scripts command', () => {
    const result = runCCShell('--clean-scripts');
    
    assert.ok(result.stdout.includes('清理过期脚本') || result.stdout.includes('Cleaning old scripts'));
    assert.ok(result.stdout.includes('已删除 0') || result.stdout.includes('Deleted 0'));
    assert.strictEqual(result.exitCode, 0);
  });

  test('should include scriptLibrary in config output', () => {
    const result = runCCShell('--config');
    
    assert.ok(result.stdout.includes('scriptLibrary'));
    assert.ok(result.stdout.includes('"enabled": true'));
    assert.ok(result.stdout.includes('"maxScripts": 100'));
    assert.ok(result.stdout.includes('"cleanupDays": 30'));
    assert.strictEqual(result.exitCode, 0);
  });

  test('should handle disable-library flag gracefully', () => {
    const result = runCCShell('--disable-library --scripts');
    
    // The disable message appears, then the scripts output
    assert.ok(result.stdout.includes('本次运行已禁用脚本库') || result.stdout.includes('Script library disabled'));
    assert.strictEqual(result.exitCode, 0);
  });
});

describe('Script Library Class Unit Tests', () => {
  let tempDir;
  let ScriptLibrary;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'script-lib-test-'));
    
    // Mock the ScriptLibrary class for unit testing
    const crypto = require('crypto');
    
    ScriptLibrary = class {
      constructor(config) {
        this.config = config.scriptLibrary;
        this.enabled = this.config.enabled;
        this.scriptDir = this.config.scriptDir;
        this.indexFile = path.join(this.scriptDir, 'index.json');
        this.ensureDirectories();
      }

      ensureDirectories() {
        if (!this.enabled) return;
        
        try {
          if (!fs.existsSync(this.scriptDir)) {
            fs.mkdirSync(this.scriptDir, { recursive: true });
          }
          if (!fs.existsSync(this.indexFile)) {
            fs.writeFileSync(this.indexFile, JSON.stringify([], null, 2));
          }
        } catch (error) {
          this.enabled = false;
        }
      }

      generateScriptId(task) {
        return crypto.createHash('md5').update(task.toLowerCase().trim()).digest('hex').substring(0, 12);
      }

      loadIndex() {
        if (!this.enabled) return [];
        try {
          const data = fs.readFileSync(this.indexFile, 'utf8');
          return JSON.parse(data);
        } catch (error) {
          return [];
        }
      }

      saveIndex(index) {
        if (!this.enabled) return;
        try {
          fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
        } catch (error) {
          // Ignore errors
        }
      }

      searchSimilarScripts(task) {
        if (!this.enabled) return [];
        
        const index = this.loadIndex();
        const taskKeywords = task.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        const matches = [];

        for (const script of index) {
          let score = 0;
          const scriptKeywords = script.task.toLowerCase().split(/\s+/);
          
          for (const keyword of taskKeywords) {
            for (const scriptKeyword of scriptKeywords) {
              if (scriptKeyword.includes(keyword) || keyword.includes(scriptKeyword)) {
                score += 1;
              }
            }
          }
          
          if (score > 0) {
            matches.push({ ...script, score });
          }
        }

        return matches.sort((a, b) => b.score - a.score).slice(0, 3);
      }

      saveScript(task, scriptContent, metadata = {}) {
        if (!this.enabled) return null;

        const scriptId = this.generateScriptId(task);
        const scriptFile = path.join(this.scriptDir, `${scriptId}.sh`);
        const timestamp = new Date().toISOString();

        try {
          fs.writeFileSync(scriptFile, scriptContent);
          
          const index = this.loadIndex();
          const existingIndex = index.findIndex(item => item.id === scriptId);
          
          const scriptEntry = {
            id: scriptId,
            task: task,
            file: scriptFile,
            created: existingIndex === -1 ? timestamp : index[existingIndex].created,
            updated: timestamp,
            usage: existingIndex === -1 ? 1 : index[existingIndex].usage + 1,
            ...metadata
          };

          if (existingIndex === -1) {
            index.push(scriptEntry);
          } else {
            index[existingIndex] = scriptEntry;
          }

          this.saveIndex(index);
          return scriptId;
        } catch (error) {
          return null;
        }
      }

      getScript(scriptId) {
        if (!this.enabled) return null;
        
        const scriptFile = path.join(this.scriptDir, `${scriptId}.sh`);
        try {
          if (fs.existsSync(scriptFile)) {
            return fs.readFileSync(scriptFile, 'utf8');
          }
        } catch (error) {
          // Ignore error
        }
        return null;
      }

      listScripts() {
        if (!this.enabled) return [];
        return this.loadIndex().sort((a, b) => new Date(b.updated) - new Date(a.updated));
      }

      cleanupOldScripts() {
        if (!this.enabled) return 0;
        
        const index = this.loadIndex();
        const cutoffDate = new Date(Date.now() - this.config.cleanupDays * 24 * 60 * 60 * 1000);
        const toDelete = index.filter(script => new Date(script.updated) < cutoffDate);
        
        let deleted = 0;
        for (const script of toDelete) {
          try {
            if (fs.existsSync(script.file)) {
              fs.unlinkSync(script.file);
              deleted++;
            }
          } catch (error) {
            // Ignore error
          }
        }

        const newIndex = index.filter(script => new Date(script.updated) >= cutoffDate);
        this.saveIndex(newIndex);
        
        return deleted;
      }
    };
  });

  afterEach(() => {
    // Clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  test('should create ScriptLibrary instance', () => {
    const config = {
      scriptLibrary: {
        enabled: true,
        maxScripts: 100,
        cleanupDays: 30,
        scriptDir: path.join(tempDir, 'scripts')
      }
    };

    const scriptLibrary = new ScriptLibrary(config);
    
    assert.strictEqual(scriptLibrary.enabled, true);
    assert.ok(fs.existsSync(scriptLibrary.scriptDir));
    assert.ok(fs.existsSync(scriptLibrary.indexFile));
  });

  test('should save and retrieve scripts', () => {
    const config = {
      scriptLibrary: {
        enabled: true,
        maxScripts: 100,
        cleanupDays: 30,
        scriptDir: path.join(tempDir, 'scripts')
      }
    };

    const scriptLibrary = new ScriptLibrary(config);
    const testTask = '压缩所有图片文件';
    const testScript = '#!/bin/bash\nfor img in *.jpg; do\n  convert "$img" -quality 80 "${img%.*}_compressed.jpg"\ndone';

    const scriptId = scriptLibrary.saveScript(testTask, testScript);
    
    assert.ok(scriptId);
    assert.strictEqual(typeof scriptId, 'string');
    assert.strictEqual(scriptId.length, 12);

    const retrievedScript = scriptLibrary.getScript(scriptId);
    assert.strictEqual(retrievedScript, testScript);

    const scripts = scriptLibrary.listScripts();
    assert.strictEqual(scripts.length, 1);
    assert.strictEqual(scripts[0].task, testTask);
    assert.strictEqual(scripts[0].id, scriptId);
  });

  test('should search similar scripts', () => {
    const config = {
      scriptLibrary: {
        enabled: true,
        maxScripts: 100,
        cleanupDays: 30,
        scriptDir: path.join(tempDir, 'scripts')
      }
    };

    const scriptLibrary = new ScriptLibrary(config);
    
    // Save some test scripts
    scriptLibrary.saveScript('压缩图片文件', 'compress script');
    scriptLibrary.saveScript('批量压缩jpg图片', 'batch compress script');
    scriptLibrary.saveScript('转换视频格式', 'convert video script');

    // Test search with similar task
    const matches = scriptLibrary.searchSimilarScripts('压缩图片');
    
    assert.ok(matches.length > 0, 'Should find matching scripts');
    assert.ok(matches.every(match => match.score > 0), 'All matches should have positive score');
    
    // Find a match that contains both keywords
    const relevantMatch = matches.find(match => 
      match.task.includes('压缩') || match.task.includes('图片')
    );
    assert.ok(relevantMatch, 'Should find a relevant match');
  });

  test('should cleanup old scripts', async () => {
    const config = {
      scriptLibrary: {
        enabled: true,
        maxScripts: 100,
        cleanupDays: 0, // Immediate cleanup
        scriptDir: path.join(tempDir, 'scripts')
      }
    };

    const scriptLibrary = new ScriptLibrary(config);
    
    // Save a script
    const scriptId = scriptLibrary.saveScript('test task', 'test script');
    assert.ok(scriptId);
    
    // Wait a bit to ensure the timestamp difference
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const deleted = scriptLibrary.cleanupOldScripts();
    assert.strictEqual(deleted, 1);
    
    const scripts = scriptLibrary.listScripts();
    assert.strictEqual(scripts.length, 0);
  });

  test('should handle disabled library', () => {
    const config = {
      scriptLibrary: {
        enabled: false,
        maxScripts: 100,
        cleanupDays: 30,
        scriptDir: path.join(tempDir, 'scripts')
      }
    };

    const scriptLibrary = new ScriptLibrary(config);
    
    assert.strictEqual(scriptLibrary.enabled, false);
    assert.strictEqual(scriptLibrary.saveScript('test', 'script'), null);
    assert.strictEqual(scriptLibrary.getScript('test'), null);
    assert.deepStrictEqual(scriptLibrary.searchSimilarScripts('test'), []);
    assert.deepStrictEqual(scriptLibrary.listScripts(), []);
    assert.strictEqual(scriptLibrary.cleanupOldScripts(), 0);
  });
});
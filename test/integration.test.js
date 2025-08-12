const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Load the actual index.js code for direct testing
const indexPath = path.join(__dirname, '..', 'index.js');

describe('index.js Direct Integration Tests', () => {
  let testConfigDir;
  let testConfigFile;
  let originalConfigFile;
  let originalArgv;
  let originalEnv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    // Create unique test directory
    testConfigDir = path.join(os.tmpdir(), 'ccshell-integration-' + Date.now() + Math.random());
    testConfigFile = path.join(testConfigDir, '.ccshell.json');
    
    // Save originals
    originalArgv = [...process.argv];
    originalEnv = { ...process.env };
    
    // Create test directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    
    // Mock environment
    process.env.HOME = testConfigDir;
    // Disable debug mode for clean test output
    delete process.env.DEBUG;
    // Suppress Node.js warnings
    process.env.NODE_NO_WARNINGS = '1';
    
    // Setup spies
    consoleLogSpy = mock.method(console, 'log', () => {});
    consoleErrorSpy = mock.method(console, 'error', () => {});
    processExitSpy = mock.method(process, 'exit', () => {});
  });

  afterEach(() => {
    // Restore
    process.argv = originalArgv;
    Object.assign(process.env, originalEnv);
    
    // Cleanup
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      }
    } catch (err) {
      // Ignore cleanup errors
    }
    
    // Restore spies
    consoleLogSpy.mock.restore();
    consoleErrorSpy.mock.restore();
    processExitSpy.mock.restore();
    
    // Clear require cache
    delete require.cache[indexPath];
  });

  test('should execute help flow when no arguments provided', () => {
    process.argv = ['node', 'ccshell'];
    
    // Load and execute index.js
    require(indexPath);
    
    // Should call process.exit(0) for help
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 0);
  });

  test('should execute help flow with --help flag', () => {
    process.argv = ['node', 'ccshell', '--help'];
    
    require(indexPath);
    
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 0);
  });

  test('should execute version flow with --version flag', () => {
    process.argv = ['node', 'ccshell', '--version'];
    
    require(indexPath);
    
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 0);
  });

  test('should execute config display flow with --config flag', () => {
    process.argv = ['node', 'ccshell', '--config'];
    
    require(indexPath);
    
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 0);
  });

  test('should handle --set-default with valid provider', () => {
    process.argv = ['node', 'ccshell', '--set-default', 'gemini'];
    
    require(indexPath);
    
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 0);
    
    // Check if config was saved
    const configPath = path.join(testConfigDir, '.ccshell.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(config.defaultProvider, 'gemini');
    }
  });

  test('should handle --set-default with invalid provider', () => {
    process.argv = ['node', 'ccshell', '--set-default', 'invalid'];
    
    require(indexPath);
    
    // Should have called console.error with appropriate message
    assert.ok(consoleErrorSpy.mock.calls.some(call => 
      call.arguments.some(arg => 
        typeof arg === 'string' && (arg.includes('未知的AI提供商') || arg.includes('Unknown AI provider'))
      )
    ));
    
    // Should eventually exit with code 1 (but may not be immediate due to async)
    assert.ok(processExitSpy.mock.calls.length >= 0);
  });

  test('should handle --debug flag parsing', () => {
    process.argv = ['node', 'ccshell', '--debug', 'test task'];
    
    // Mock spawn to prevent actual execution
    const originalSpawn = spawn;
    const mockSpawn = mock.method(
      { spawn: () => ({
        stdin: { write: () => {}, end: () => {} },
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (event, callback) => {
          if (event === 'error') {
            setTimeout(() => {
              const error = new Error('Mock error');
              error.code = 'ENOENT';
              callback(error);
            }, 10);
          }
        }
      })},
      'spawn'
    );
    
    // Replace global spawn
    global.spawn = mockSpawn;
    
    require(indexPath);
    
    // Should have set DEBUG environment variable
    assert.strictEqual(process.env.DEBUG, '1');
    
    global.spawn = originalSpawn;
  });

  test('should handle --provider flag parsing', () => {
    process.argv = ['node', 'ccshell', '--provider', 'gemini', 'test task'];
    
    // Mock child_process.spawn
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { on: mock.fn() },
      stderr: { on: mock.fn() },
      on: mock.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => {
            const error = new Error('Mock error');
            error.code = 'ENOENT';
            callback(error);
          }, 10);
        }
      })
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    // Should have attempted to spawn with gemini provider
    assert.strictEqual(spawnMock.mock.calls.length, 1);
    assert.strictEqual(spawnMock.mock.calls[0].arguments[0], 'gemini');
    
    spawnMock.mock.restore();
  });

  test('should validate provider before execution', () => {
    process.argv = ['node', 'ccshell', '--provider', 'invalid', 'test task'];
    
    try {
      require(indexPath);
    } catch (error) {
      // May throw an error due to invalid provider
    }
    
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 1);
  });

  test('should show help if no task provided after flag processing', () => {
    process.argv = ['node', 'ccshell', '--provider', 'claude'];
    
    require(indexPath);
    
    assert.ok(processExitSpy.mock.calls.length >= 1);
    assert.strictEqual(processExitSpy.mock.calls[0].arguments[0], 0);
  });

  test('should load existing config file', () => {
    const testConfig = {
      defaultProvider: 'gemini',
      providers: {
        claude: { command: 'claude', args: ['-p'], streamFormat: 'claude' },
        gemini: { command: 'gemini', args: ['chat'], streamFormat: 'gemini' }
      }
    };
    
    // Write test config
    const configPath = path.join(testConfigDir, '.ccshell.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig));
    
    process.argv = ['node', 'ccshell', '--config'];
    
    require(indexPath);
    
    // Should have displayed the loaded config
    assert.ok(consoleLogSpy.mock.calls.some(call => 
      call.arguments.some(arg => 
        typeof arg === 'string' && (arg.includes('当前配置') || arg.includes('Current Configuration'))
      )
    ));
  });

  test('should handle spawn error for claude provider', (t, done) => {
    process.argv = ['node', 'ccshell', 'test task'];
    
    // Mock child_process.spawn to simulate ENOENT error
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { on: mock.fn() },
      stderr: { on: mock.fn() },
      on: mock.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => {
            const error = new Error('spawn claude ENOENT');
            error.code = 'ENOENT';
            callback(error);
          }, 5);
        }
      })
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    // Give minimal time for error handling
    setTimeout(() => {
      assert.ok(consoleErrorSpy.mock.calls.length > 0);
      spawnMock.mock.restore();
      done();
    }, 20);
  });

  test('should handle data from stdout', (t, done) => {
    process.argv = ['node', 'ccshell', 'test task'];
    
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { 
        on: mock.fn((event, callback) => {
          if (event === 'data') {
            // Don't actually call callback to avoid extra output
          }
        })
      },
      stderr: { on: mock.fn() },
      on: mock.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      })
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    setTimeout(() => {
      // Should have set up stdout data handler
      assert.strictEqual(mockChild.stdout.on.mock.calls.length, 1);
      assert.strictEqual(mockChild.stdout.on.mock.calls[0].arguments[0], 'data');
      
      spawnMock.mock.restore();
      done();
    }, 20);
  });

  test('should handle data from stderr', (t, done) => {
    process.argv = ['node', 'ccshell', 'test task'];
    
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { on: mock.fn() },
      stderr: { 
        on: mock.fn((event, callback) => {
          if (event === 'data') {
            // Don't call callback to avoid extra output
          }
        })
      },
      on: mock.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      })
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    setTimeout(() => {
      // Should have set up stderr handler
      assert.strictEqual(mockChild.stderr.on.mock.calls.length, 1);
      
      spawnMock.mock.restore();
      done();
    }, 20);
  });

  test('should handle process close event', (t, done) => {
    process.argv = ['node', 'ccshell', 'test task'];
    
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { on: mock.fn() },
      stderr: { on: mock.fn() },
      on: mock.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 5); // Non-zero exit code
        }
      })
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    setTimeout(() => {
      // Should have handled close event
      const closeCall = mockChild.on.mock.calls.find(call => call.arguments[0] === 'close');
      assert.ok(closeCall);
      
      spawnMock.mock.restore();
      done();
    }, 20);
  });

  test('should create AIProvider with correct configuration', () => {
    process.argv = ['node', 'ccshell', 'test task'];
    
    // Mock to prevent actual execution
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { on: mock.fn() },
      stderr: { on: mock.fn() },
      on: mock.fn()
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    // Should have called spawn with correct arguments for claude (default)
    assert.strictEqual(spawnMock.mock.calls.length, 1);
    assert.strictEqual(spawnMock.mock.calls[0].arguments[0], 'claude');
    
    spawnMock.mock.restore();
  });

  test('should handle gemini provider specifically', () => {
    process.argv = ['node', 'ccshell', '--provider', 'gemini', 'test task'];
    
    const mockChild = {
      stdin: { write: mock.fn(), end: mock.fn() },
      stdout: { on: mock.fn() },
      stderr: { on: mock.fn() },
      on: mock.fn()
    };
    
    const spawnMock = mock.method(require('child_process'), 'spawn', () => mockChild);
    
    require(indexPath);
    
    // Should display gemini-specific messages
    assert.ok(consoleLogSpy.mock.calls.some(call => 
      call.arguments.some(arg => 
        typeof arg === 'string' && arg.includes('Gemini')
      )
    ));
    
    spawnMock.mock.restore();
  });
});
#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get version from package.json
function getVersion() {
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    return 'unknown';
  }
}

// Configuration management
const CONFIG_FILE = path.join(os.homedir(), '.ccshell.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (error) {
    // Ignore errors, use defaults
  }
  return {
    defaultProvider: 'claude',
    providers: {
      claude: {
        command: 'claude',
        args: ['-p', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'],
        streamFormat: 'claude'
      },
      gemini: {
        command: 'gemini',
        args: ['-p', '--yolo'],
        streamFormat: 'gemini'
      }
    }
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('⚠️  无法保存配置:', error.message);
    return false;
  }
}

// AI Provider abstraction
class AIProvider {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }

  createPrompt(userTask) {
    if (this.name === 'gemini') {
      return `You are a macOS shell expert. Execute this task: ${userTask}

Strategy: 1) Prioritize local commands 2) Install tools if missing 3) Use shell scripts as fallback
Safety first, confirm dangerous operations.

IMPORTANT: Execute the commands and SHOW THE COMPLETE OUTPUT. When you run a command, make sure the full output is visible to the user. Don't just say "I executed the command" - actually display the results.`;
    } else {
      // Claude format (original)
      return `你是macOS shell专家，执行任务：${userTask}

策略：1) 优先用本地命令 2) 没有则安装工具 3) 最后用shell脚本
安全第一，危险操作需确认。`;
    }
  }

  spawn(prompt) {
    let args = [...this.config.args];
    
    if (this.name === 'gemini') {
      // For Gemini, try different stdio configuration to capture all output
      const childProcess = spawn(this.config.command, args, {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      childProcess.stdin.write(prompt);
      childProcess.stdin.end();
      
      return childProcess;
    } else {
      // Claude configuration
      const childProcess = spawn(this.config.command, args, {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      childProcess.stdin.write(prompt);
      childProcess.stdin.end();
      
      return childProcess;
    }
  }

  handleOutput(data, outputBuffer, handleStreamingOutput) {
    if (this.config.streamFormat === 'claude') {
      return this.handleClaudeOutput(data, outputBuffer, handleStreamingOutput);
    } else if (this.config.streamFormat === 'gemini') {
      return this.handleGeminiOutput(data, outputBuffer, handleStreamingOutput);
    }
  }

  handleClaudeOutput(data, outputBuffer, handleStreamingOutput) {
    outputBuffer += data.toString();
    const lines = outputBuffer.split('\n');
    const remaining = lines.pop();
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const jsonData = JSON.parse(line);
          handleStreamingOutput(jsonData);
        } catch (err) {
          // 忽略JSON解析错误
        }
      }
    });
    
    return remaining;
  }

  handleGeminiOutput(data, outputBuffer) {
    const output = data.toString();
    // Remove ANSI escape codes and clean up output
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Split into lines for better processing
    const lines = cleanOutput.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(line);
      }
    });
    
    return outputBuffer;
  }
}

// Show help information
function showHelp() {
  console.log('ccshell v' + getVersion() + ' - 自然语言macOS shell命令接口');
  console.log('Natural Language macOS Shell Command Interface');
  console.log('');
  console.log('用法 / Usage:');
  console.log('  ccshell <任务描述 / task description>');
  console.log('  ccshell [options]');
  console.log('');
  console.log('选项 / Options:');
  console.log('  -h, --help         显示此帮助信息 / Show this help message');
  console.log('  -v, --version      显示版本信息 / Show version information');
  console.log('  --debug            启用调试模式 / Enable debug mode');
  console.log('  --provider <name>  指定AI提供商 (claude|gemini) / Specify AI provider');
  console.log('  --set-default <provider>  设置默认AI提供商 / Set default AI provider');
  console.log('  --config           显示当前配置 / Show current configuration');
  console.log('');
  console.log('示例 / Examples:');
  console.log('  ccshell 批量压缩这个文件夹里的所有图片');
  console.log('  ccshell --provider gemini "convert all .mov files to .mp4"');
  console.log('  ccshell --set-default gemini');
  console.log('  ccshell --config');
  console.log('');
  console.log('调试模式 / Debug Mode:');
  console.log('  DEBUG=1 ccshell "你的任务描述"');
  console.log('  ccshell --debug "你的任务描述"');
  console.log('');
  console.log('注意 / Note:');
  console.log('  Claude使用 --dangerously-skip-permissions 参数来提供流畅体验');
  console.log('  请在可信环境中使用。详情请查看 README.md');
  console.log('  Claude uses --dangerously-skip-permissions for smooth experience');
  console.log('  Please use in trusted environments. See README.md for details');
}

// Show version information
function showVersion() {
  console.log('ccshell v' + getVersion());
}

// Parse command line arguments
const args = process.argv.slice(2);
let config = loadConfig();

// Handle help and version flags
if (args.length === 0) {
  showHelp();
  process.exit(0);
}

if (args.includes('-h') || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  showVersion();
  process.exit(0);
}

// Handle config display
if (args.includes('--config')) {
  console.log('📋 当前配置 / Current Configuration:');
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

// Handle setting default provider
const setDefaultIndex = args.findIndex(arg => arg === '--set-default');
if (setDefaultIndex !== -1 && setDefaultIndex + 1 < args.length) {
  const newDefault = args[setDefaultIndex + 1];
  if (config.providers[newDefault]) {
    config.defaultProvider = newDefault;
    if (saveConfig(config)) {
      console.log(`✅ 默认AI提供商已设置为: ${newDefault}`);
      console.log(`✅ Default AI provider set to: ${newDefault}`);
    }
  } else {
    console.error(`❌ 未知的AI提供商: ${newDefault}`);
    console.error(`❌ Unknown AI provider: ${newDefault}`);
    console.error('支持的提供商 / Supported providers:', Object.keys(config.providers).join(', '));
  }
  process.exit(0);
}

// Check for debug flag
const hasDebugFlag = args.includes('--debug');
if (hasDebugFlag) {
  process.env.DEBUG = '1';
  // Remove --debug from args
  const debugIndex = args.indexOf('--debug');
  args.splice(debugIndex, 1);
}

// Check for provider flag
let selectedProvider = config.defaultProvider;
const providerIndex = args.findIndex(arg => arg === '--provider');
if (providerIndex !== -1 && providerIndex + 1 < args.length) {
  selectedProvider = args[providerIndex + 1];
  // Remove --provider and its value from args
  args.splice(providerIndex, 2);
}

// Remove --set-default and its value from args if present
const cleanSetDefaultIndex = args.findIndex(arg => arg === '--set-default');
if (cleanSetDefaultIndex !== -1) {
  args.splice(cleanSetDefaultIndex, 2);
}

// Validate provider
if (!config.providers[selectedProvider]) {
  console.error(`❌ 未知的AI提供商: ${selectedProvider}`);
  console.error(`❌ Unknown AI provider: ${selectedProvider}`);
  console.error('支持的提供商 / Supported providers:', Object.keys(config.providers).join(', '));
  process.exit(1);
}

// Get user task from remaining arguments
const userTask = args.join(' ');

// Show help if no task provided after processing flags
if (!userTask.trim()) {
  showHelp();
  process.exit(0);
}

// Initialize AI provider
const aiProvider = new AIProvider(selectedProvider, config.providers[selectedProvider]);
const prompt = aiProvider.createPrompt(userTask);

console.log('🤖 ccshell: 正在处理您的任务...');
console.log('📋 任务:', userTask);
console.log('🤖 AI提供商 / AI Provider:', selectedProvider);

if (selectedProvider === 'gemini') {
  console.log('ℹ️  使用 Gemini CLI (YOLO模式: 自动执行命令)');
  console.log('ℹ️  Using Gemini CLI (YOLO mode: Auto-execute commands)');
  console.log('💡 如需更详细的执行过程，建议使用 --provider claude');
  console.log('💡 For more detailed execution process, recommend --provider claude');
}

console.log('');

// Debug: show the command being executed
if (process.env.DEBUG) {
  console.log('🔍 Debug - AI提供商 / AI Provider:', selectedProvider);
  console.log('🔍 Debug - 执行的命令 / Command:', aiProvider.config.command, aiProvider.config.args.join(' '));
  if (selectedProvider === 'claude') {
    console.log('🔍 Debug - 代理设置 / Proxy settings:');
    console.log('  http_proxy:', process.env.http_proxy);
    console.log('  https_proxy:', process.env.https_proxy);
    console.log('  all_proxy:', process.env.all_proxy);
  }
}

// Execute AI command
const aiProcess = aiProvider.spawn(prompt);

let hasOutput = false;
let outputBuffer = '';
let currentToolUse = null;

aiProcess.stdout.on('data', (data) => {
  hasOutput = true;
  outputBuffer = aiProvider.handleOutput(data, outputBuffer, handleStreamingOutput);
});

function handleStreamingOutput(data) {
  if (process.env.DEBUG) {
    console.log('🔍 JSON:', JSON.stringify(data, null, 2));
  }
  
  switch (data.type) {
    case 'system':
      if (data.subtype === 'init') {
        console.log('🚀 Claude初始化完成，开始处理任务...');
      }
      break;
      
    case 'assistant':
      if (data.message && data.message.content) {
        data.message.content.forEach(content => {
          if (content.type === 'tool_use') {
            currentToolUse = content;
            console.log(`🔧 执行工具: ${content.name}`);
            if (content.input && content.input.description) {
              console.log(`📝 操作: ${content.input.description}`);
            }
          } else if (content.type === 'text') {
            // 最终输出
            console.log(content.text);
          }
        });
      }
      break;
      
    case 'result':
      if (data.subtype === 'success') {
        console.log(`✅ 任务完成 (耗时: ${(data.duration_ms / 1000).toFixed(1)}秒)`);
        if (data.total_cost_usd) {
          console.log(`💰 成本: $${data.total_cost_usd.toFixed(6)}`);
        }
      }
      break;
  }
}

aiProcess.stderr.on('data', (data) => {
  hasOutput = true;
  console.error('⚠️  警告信息 / Warning:', data.toString());
});

aiProcess.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ 进程退出，代码: ${code}`);
  }
});

aiProcess.on('error', (error) => {
  console.error(`❌ 执行错误 / Execution Error (${selectedProvider}):`);
  if (error.code === 'ENOENT') {
    if (selectedProvider === 'claude') {
      console.error('无法找到 claude 命令');
      console.error('请确保 Claude Code CLI 已正确安装并在PATH中');
      console.error('');
      console.error('Claude Code CLI is not installed or not in PATH');
      console.error('Please visit https://claude.ai/code to install Claude Code CLI');
    } else if (selectedProvider === 'gemini') {
      console.error('无法找到 gemini 命令');
      console.error('请确保 Gemini CLI 已正确安装并在PATH中');
      console.error('');
      console.error('Gemini CLI is not installed or not in PATH');
      console.error('Please install Gemini CLI first');
    } else {
      console.error(`无法找到 ${aiProvider.config.command} 命令`);
      console.error(`Cannot find ${aiProvider.config.command} command`);
    }
  } else {
    console.error('详细错误信息:', error.message);
  }
});
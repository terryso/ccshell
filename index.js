#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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

// Script Library Management
class ScriptLibrary {
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
      console.warn('⚠️  无法创建脚本目录:', error.message);
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
      const index = JSON.parse(data);
      return this.migrateIndex(index);
    } catch (error) {
      return [];
    }
  }

  migrateIndex(index) {
    let needsSave = false;
    const migratedIndex = [];

    for (const entry of index) {
      // Check if this is a legacy entry (has 'name' field instead of 'id')
      if (entry.name && !entry.id) {
        // Skip legacy entries - they should be manually cleaned up
        needsSave = true;
        continue;
      }

      // Ensure all current entries have required fields
      if (entry.id && entry.task) {
        const migratedEntry = {
          id: entry.id,
          task: entry.task,
          filePath: entry.filePath || entry.file, // Support both field names
          created: entry.created || new Date().toISOString(),
          updated: entry.updated || new Date().toISOString(),
          usage: entry.usage || 1,
          type: entry.type || 'text'
        };
        migratedIndex.push(migratedEntry);
        
        // Check if migration was needed
        if (!entry.created || !entry.updated || !entry.type || entry.file) {
          needsSave = true;
        }
      }
    }

    // Save migrated index if changes were made
    if (needsSave) {
      this.saveIndex(migratedIndex);
    }

    return migratedIndex;
  }

  saveIndex(index) {
    if (!this.enabled) return;
    try {
      fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
    } catch (error) {
      console.warn('⚠️  无法保存脚本索引:', error.message);
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
    const timestamp = new Date().toISOString();

    try {
      let scriptFile;
      
      if (metadata.filePath && metadata.type === 'file') {
        // 对于AI通过Write工具创建的文件：只记录索引，不创建新文件
        scriptFile = metadata.filePath;
        
        // 确保AI创建的文件有执行权限
        if (fs.existsSync(scriptFile)) {
          fs.chmodSync(scriptFile, 0o755);
        }
      } else {
        // 对于从文本提取的脚本：创建新文件
        const fileName = `${scriptId}.sh`;
        scriptFile = path.join(this.scriptDir, fileName);
        fs.writeFileSync(scriptFile, scriptContent, { mode: 0o755 });
      }
      
      // 更新索引
      const index = this.loadIndex();
      const existingIndex = index.findIndex(item => item.id === scriptId);
      
      const scriptEntry = {
        id: scriptId,
        task: task,
        filePath: scriptFile,
        created: existingIndex === -1 ? timestamp : index[existingIndex].created,
        updated: timestamp,
        usage: existingIndex === -1 ? 1 : index[existingIndex].usage + 1,
        type: metadata.type || 'text'
      };

      if (existingIndex === -1) {
        index.push(scriptEntry);
      } else {
        index[existingIndex] = scriptEntry;
      }

      this.saveIndex(index);
      return scriptId;
    } catch (error) {
      console.warn('⚠️  无法保存脚本:', error.message);
      return null;
    }
  }

  getScript(scriptId) {
    if (!this.enabled) return null;
    
    const index = this.loadIndex();
    const script = index.find(item => item.id === scriptId);
    if (!script) return null;
    
    // 兼容新旧格式：优先使用filePath，回退到file
    const scriptPath = script.filePath || script.file;
    if (!scriptPath) return null;
    
    try {
      if (fs.existsSync(scriptPath)) {
        return fs.readFileSync(scriptPath, 'utf8');
      }
    } catch (error) {
      console.warn('⚠️  无法读取脚本:', error.message);
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
        console.warn(`⚠️  无法删除脚本文件 ${script.file}:`, error.message);
      }
    }

    const newIndex = index.filter(script => new Date(script.updated) >= cutoffDate);
    this.saveIndex(newIndex);
    
    return deleted;
  }

  cleanupOrphanedFiles() {
    if (!this.enabled) return 0;

    try {
      const index = this.loadIndex();
      const indexedFiles = new Set();
      
      // 收集所有在索引中的文件路径
      for (const script of index) {
        if (script.filePath) indexedFiles.add(path.basename(script.filePath));
        if (script.file) indexedFiles.add(path.basename(script.file));
      }
      
      // 扫描脚本目录
      const files = fs.readdirSync(this.scriptDir);
      let deleted = 0;
      
      for (const file of files) {
        if (file === 'index.json') continue; // 跳过索引文件
        
        const filePath = path.join(this.scriptDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && !indexedFiles.has(file)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  已删除孤儿文件: ${file}`);
          deleted++;
        }
      }
      
      return deleted;
    } catch (error) {
      console.warn('⚠️  清理孤儿文件失败:', error.message);
      return 0;
    }
  }

  deleteScript(scriptId) {
    if (!this.enabled) return false;
    
    try {
      const index = this.loadIndex();
      const scriptIndex = index.findIndex(item => item.id === scriptId);
      
      if (scriptIndex === -1) {
        console.log(`⚠️  脚本 ${scriptId} 不存在`);
        return false;
      }
      
      const script = index[scriptIndex];
      
      // 删除所有相关文件（处理新旧格式兼容）
      const filesToDelete = [];
      if (script.filePath) filesToDelete.push(script.filePath);
      if (script.file && script.file !== script.filePath) filesToDelete.push(script.file);
      
      for (const filePath of filesToDelete) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  已删除脚本文件: ${filePath}`);
        }
      }
      
      // 从索引中移除
      index.splice(scriptIndex, 1);
      this.saveIndex(index);
      
      console.log(`✅ 脚本 ${scriptId} (${script.task}) 已删除`);
      return true;
    } catch (error) {
      console.warn('⚠️  删除脚本失败:', error.message);
      return false;
    }
  }
}

function loadConfig() {
  const defaultConfig = {
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
    },
    scriptLibrary: {
      enabled: true,
      maxScripts: 100,
      cleanupDays: 30,
      scriptDir: path.join(os.homedir(), '.ccshell', 'scripts')
    }
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      // 合并默认配置和用户配置，确保新字段存在
      return {
        ...defaultConfig,
        ...userConfig,
        scriptLibrary: {
          ...defaultConfig.scriptLibrary,
          ...(userConfig.scriptLibrary || {})
        }
      };
    }
  } catch (error) {
    // Ignore errors, use defaults
  }
  return defaultConfig;
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
  constructor(name, config, scriptLibrary) {
    this.name = name;
    this.config = config;
    this.scriptLibrary = scriptLibrary;
  }

  createPrompt(userTask) {
    let libraryPrompt = '';
    
    if (this.scriptLibrary && this.scriptLibrary.enabled) {
      const similarScripts = this.scriptLibrary.searchSimilarScripts(userTask);
      if (similarScripts.length > 0) {
        libraryPrompt = this.name === 'gemini' ? 
          '\n\nAvailable scripts in local library:\n' :
          '\n\n本地脚本库中的相关脚本：\n';
        
        for (const script of similarScripts) {
          const scriptContent = this.scriptLibrary.getScript(script.id);
          if (scriptContent) {
            libraryPrompt += this.name === 'gemini' ? 
              `- Task: "${script.task}" (Score: ${script.score})\n  Content: ${scriptContent.substring(0, 200)}${scriptContent.length > 200 ? '...' : ''}\n` :
              `- 任务："${script.task}"（匹配度：${script.score}）\n  内容：${scriptContent.substring(0, 200)}${scriptContent.length > 200 ? '...' : ''}\n`;
          }
        }
      }
    }

    if (this.name === 'gemini') {
      return `You are a macOS shell expert. Execute this task: ${userTask}

Strategy: 1) Prioritize local commands 2) Search online for command solutions and install if needed 3) Check local script library for similar solutions 4) Write new shell scripts as fallback
Safety first, confirm dangerous operations.${libraryPrompt}

IMPORTANT: If you find a suitable script in the library, try to reuse it or adapt it. If you need to create new script files, please create them directly in ${this.scriptLibrary.scriptDir} directory so they will be automatically managed by the local library.
Execute the commands and SHOW THE COMPLETE OUTPUT. When you run a command, make sure the full output is visible to the user.`;
    } else {
      // Claude format (original)
      return `你是macOS shell专家，执行任务：${userTask}

策略：1) 优先用本地命令 2) 网上搜索命令方案并安装使用 3) 检查本地脚本库相似解决方案 4) 最后写新shell脚本
安全第一，危险操作需确认。${libraryPrompt}

重要：如果在脚本库中找到合适的脚本，请尝试重用或改编。如果需要创建新脚本文件，请直接创建在 ${this.scriptLibrary.scriptDir} 目录中，这样脚本将自动纳入本地库管理。`;
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
  console.log('  --scripts          显示本地脚本库 / Show local script library');
  console.log('  --clean-scripts    清理过期脚本 / Clean old scripts');
  console.log('  --clean-orphaned   清理孤儿文件 / Clean orphaned files');
  console.log('  --delete-script <id>  删除指定脚本 / Delete specific script');
  console.log('  --disable-library  临时禁用脚本库 / Temporarily disable script library');
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
let scriptLibrary = new ScriptLibrary(config);

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

// Handle disable library flag (needs to be before other script library commands)
if (args.includes('--disable-library')) {
  scriptLibrary.enabled = false;
  console.log('⚠️  本次运行已禁用脚本库 / Script library disabled for this run');
}

// Handle script library commands
if (args.includes('--scripts')) {
  console.log('📚 本地脚本库 / Local Script Library:');
  if (!scriptLibrary.enabled) {
    console.log('❌ 脚本库已禁用 / Script library is disabled');
    process.exit(0);
  }
  
  const scripts = scriptLibrary.listScripts();
  if (scripts.length === 0) {
    console.log('📭 暂无保存的脚本 / No scripts saved yet');
  } else {
    console.log(`总计 ${scripts.length} 个脚本：`);
    console.log(`Total ${scripts.length} scripts:`);
    console.log('');
    
    scripts.forEach((script, index) => {
      console.log(`${index + 1}. ${script.task}`);
      console.log(`   ID: ${script.id}`);
      console.log(`   创建: ${new Date(script.created).toLocaleString()}`);
      console.log(`   更新: ${new Date(script.updated).toLocaleString()}`);
      console.log(`   使用次数: ${script.usage}`);
      console.log('');
    });
  }
  process.exit(0);
}

if (args.includes('--clean-scripts')) {
  if (!scriptLibrary.enabled) {
    console.log('❌ 脚本库已禁用 / Script library is disabled');
    process.exit(0);
  }
  
  console.log('🧹 清理过期脚本... / Cleaning old scripts...');
  const deleted = scriptLibrary.cleanupOldScripts();
  console.log(`✅ 已删除 ${deleted} 个过期脚本 / Deleted ${deleted} old scripts`);
  process.exit(0);
}

if (args.includes('--clean-orphaned')) {
  if (!scriptLibrary.enabled) {
    console.log('❌ 脚本库已禁用 / Script library is disabled');
    process.exit(0);
  }
  
  console.log('🧹 清理孤儿文件... / Cleaning orphaned files...');
  const deleted = scriptLibrary.cleanupOrphanedFiles();
  console.log(`✅ 已删除 ${deleted} 个孤儿文件 / Deleted ${deleted} orphaned files`);
  process.exit(0);
}

// Handle delete script command
const deleteScriptIndex = args.findIndex(arg => arg === '--delete-script');
if (deleteScriptIndex !== -1 && deleteScriptIndex + 1 < args.length) {
  if (!scriptLibrary.enabled) {
    console.log('❌ 脚本库已禁用 / Script library is disabled');
    process.exit(0);
  }
  
  const scriptId = args[deleteScriptIndex + 1];
  console.log(`🗑️  删除脚本 ${scriptId}... / Deleting script ${scriptId}...`);
  const success = scriptLibrary.deleteScript(scriptId);
  process.exit(success ? 0 : 1);
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

// Remove script library management flags from args
const flagsToRemove = ['--scripts', '--clean-scripts', '--clean-orphaned', '--disable-library'];
flagsToRemove.forEach(flag => {
  const index = args.indexOf(flag);
  if (index !== -1) {
    args.splice(index, 1);
  }
});

// Remove --delete-script and its value from args if present
const cleanDeleteIndex = args.findIndex(arg => arg === '--delete-script');
if (cleanDeleteIndex !== -1) {
  args.splice(cleanDeleteIndex, 2);
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
const aiProvider = new AIProvider(selectedProvider, config.providers[selectedProvider], scriptLibrary);
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
let generatedScripts = [];
let currentTaskDescription = userTask;

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
            
            // 检测并保存Write工具生成的脚本
            if (content.name === 'Write' && content.input && content.input.file_path && content.input.content) {
              detectAndSaveScript(content.input.file_path, content.input.content);
            }
          } else if (content.type === 'text') {
            // 最终输出
            console.log(content.text);
            
            // 从文本中提取shell脚本
            extractScriptsFromText(content.text);
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
        
        // 保存收集到的脚本
        saveCollectedScripts();
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

// Script detection and saving functions
function detectAndSaveScript(filePath, content) {
  if (!scriptLibrary.enabled) return;
  
  // 检测是否是脚本文件
  const scriptExtensions = ['.sh', '.bash', '.zsh', '.py', '.js', '.pl'];
  const isScript = scriptExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  
  if (isScript && content.length > 20) { // 至少20个字符才算有效脚本
    generatedScripts.push({
      type: 'file',
      content: content,
      filePath: filePath
    });
  }
}

function extractScriptsFromText(text) {
  if (!scriptLibrary.enabled) return;
  
  // 从文本中提取shell脚本代码块
  const scriptPattern = /```(?:bash|sh|shell)?\s*\n([\s\S]*?)\n```/gi;
  let match;
  
  while ((match = scriptPattern.exec(text)) !== null) {
    const scriptContent = match[1].trim();
    if (scriptContent.length > 20 && scriptContent.includes('\n')) { // 多行脚本
      generatedScripts.push({
        type: 'text',
        content: scriptContent
      });
    }
  }
  
  // 提取单行shell命令
  const commandPattern = /(?:^|\n)\$\s+(.+)/g;
  let commands = [];
  while ((match = commandPattern.exec(text)) !== null) {
    commands.push(match[1].trim());
  }
  
  if (commands.length > 1) { // 多个相关命令组合成脚本
    const combinedScript = commands.join('\n');
    generatedScripts.push({
      type: 'commands',
      content: combinedScript
    });
  }
}

function saveCollectedScripts() {
  if (!scriptLibrary.enabled || generatedScripts.length === 0) return;
  
  console.log('\n📚 保存脚本到本地库... / Saving scripts to local library...');
  
  let savedCount = 0;
  const uniqueScripts = new Map();
  
  // 去重：相同内容的脚本只保存一次
  for (const script of generatedScripts) {
    const hash = crypto.createHash('md5').update(script.content).digest('hex');
    if (!uniqueScripts.has(hash)) {
      uniqueScripts.set(hash, script);
    }
  }
  
  for (const script of uniqueScripts.values()) {
    const scriptId = scriptLibrary.saveScript(currentTaskDescription, script.content, {
      type: script.type,
      filePath: script.filePath
    });
    
    if (scriptId) {
      savedCount++;
      console.log(`💾 已保存脚本: ${scriptId}`);
    }
  }
  
  if (savedCount > 0) {
    console.log(`✅ 共保存了 ${savedCount} 个脚本到本地库 / Saved ${savedCount} scripts to local library`);
    console.log('💡 使用 "ccshell --scripts" 查看所有脚本 / Use "ccshell --scripts" to view all scripts');
  }
}
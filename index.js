#!/usr/bin/env node

const { spawn } = require('child_process');

// Get user task from command line arguments
const userTask = process.argv.slice(2).join(' ');

// Show usage if no task provided
if (!userTask) {
  console.log('用法 / Usage: ccshell <任务描述 / task description>');
  console.log('');
  console.log('示例 / Examples:');
  console.log('  ccshell 批量压缩这个文件夹里的所有图片');
  console.log('  ccshell download the highest quality version of this YouTube video');
  console.log('  ccshell convert all .mov files to .mp4 format');
  console.log('  ccshell 设置一个本地HTTPS服务器，端口8443');
  process.exit(1);
}

// Construct the prompt for Claude Code
const prompt = `你是macOS shell专家，执行任务：${userTask}

策略：1) 优先用本地命令 2) 没有则安装工具 3) 最后用shell脚本
安全第一，危险操作需确认。`;

// Escape single quotes in the prompt for shell execution
const escapedPrompt = prompt.replace(/'/g, "'\"'\"'");

console.log('🤖 ccshell: 正在处理您的任务...');
console.log('📋 任务:', userTask);
console.log('');

// Debug: show the command being executed
if (process.env.DEBUG) {
  console.log('🔍 Debug - 执行的命令:', `claude -p '${escapedPrompt}'`);
  console.log('🔍 Debug - 代理设置:');
  console.log('  http_proxy:', process.env.http_proxy);
  console.log('  https_proxy:', process.env.https_proxy);
  console.log('  all_proxy:', process.env.all_proxy);
}

// Execute claude command with streaming output and bypass permissions
const claude = spawn('claude', [
  '-p', 
  '--output-format', 'stream-json',
  '--verbose',
  '--dangerously-skip-permissions'
], {
  env: { ...process.env },  // 确保传递所有环境变量，包括代理设置
  stdio: ['pipe', 'pipe', 'pipe']
});

// Write prompt to stdin
claude.stdin.write(prompt);
claude.stdin.end();

let hasOutput = false;
let outputBuffer = '';
let currentToolUse = null;

claude.stdout.on('data', (data) => {
  hasOutput = true;
  outputBuffer += data.toString();
  
  // 处理JSON流 - 每行是一个JSON对象
  const lines = outputBuffer.split('\n');
  outputBuffer = lines.pop(); // 保留可能不完整的最后一行
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const jsonData = JSON.parse(line);
        handleStreamingOutput(jsonData);
      } catch (err) {
        // 忽略JSON解析错误，可能是不完整的行
      }
    }
  });
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

claude.stderr.on('data', (data) => {
  hasOutput = true;
  console.error('⚠️  警告信息 / Warning:', data.toString());
});

claude.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ 进程退出，代码: ${code}`);
  }
});

claude.on('error', (error) => {
  console.error('❌ 执行错误 / Execution Error:');
  if (error.code === 'ENOENT') {
    console.error('无法找到 claude 命令');
    console.error('请确保 Claude Code CLI 已正确安装并在PATH中');
    console.error('');
    console.error('Claude Code CLI is not installed or not in PATH');
    console.error('Please visit https://claude.ai/code to install Claude Code CLI');
  } else {
    console.error('详细错误信息:', error.message);
  }
});
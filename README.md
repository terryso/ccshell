# ccshell

🤖 **Natural Language macOS Shell Command Interface**

[**中文文档**](README.zh.md) | **English**

ccshell allows you to describe tasks in natural language and automatically converts them to shell commands for execution. Built on Claude Code CLI with intelligent prompt engineering, it simplifies complex command-line operations into intuitive natural language interactions.

## ✨ Key Features

- **🗣️ Natural Language Interface**: Describe tasks in natural language without memorizing command syntax
- **🔧 Intelligent Tool Management**: Automatically detect, install and use the most suitable command-line tools
- **⚡ One-Click Execution**: Seamless automation from task description to result output
- **📊 Real-Time Progress**: Display execution progress, tool usage and task status
- **🔓 Automatic Authorization**: Automatically skip permission checks for smooth execution
- **🍎 macOS Optimized**: Optimized for macOS environment and toolchain

## ⚠️ Important Security Notice

**ccshell uses `--dangerously-skip-permissions` parameter by default to provide a smooth user experience, but this poses potential security risks:**

### 🚨 Security Risks
- **Bypass Permission Checks**: Automatically execute all operations without user confirmation
- **File System Access**: May modify, delete or create arbitrary files
- **System Command Execution**: May install software or modify system configurations
- **Network Access**: May download files or access network resources

### 🛡️ Security Recommendations
- **Use in Trusted Environments Only**: Recommended for sandbox environments or personal development machines
- **Avoid Production Environments**: Do not use on production servers or critical data environments
- **Backup Important Data**: Please backup important files and data before use
- **Review Task Content**: Carefully review task descriptions before executing complex tasks

### 📖 Learn More
Check [Claude Code Security Documentation](https://docs.anthropic.com/en/docs/claude-code/security) for detailed information on permission control.

## 📋 Prerequisites

1. **Node.js** (>= 14.0.0)
2. **Claude Code CLI**: Visit [https://claude.ai/code](https://claude.ai/code) for installation

## 🚀 Quick Start

### Installation

```bash
# Install from source
git clone https://github.com/terryso/ccshell.git
cd ccshell
npm install -g .

# Or via npm package
npm install -g ccshell
```

### Basic Usage

```bash
# Get Help
ccshell --help
ccshell -h

# Check Version
ccshell --version
ccshell -v

# Examples
ccshell "list all files in the current directory"
ccshell "compress all images in this folder"
ccshell "convert all .mov files to .mp4 format"
ccshell "download the highest quality version of this YouTube video"

# Real-time Progress Example
🤖 ccshell: Processing your task...
📋 Task: list all files in the current directory
🚀 Claude initialization complete, starting task...
🔧 Executing tool: Bash
📝 Operation: List all files with details
[execution results]
✅ Task completed (Duration: 12.4s)
💰 Cost: $0.023047
```

## 🎯 Use Cases

### 📁 File Operations
```bash
ccshell "batch rename files with timestamp prefix"
ccshell "find all files larger than 100MB"
ccshell "create a backup folder with current date"
```

### 🎬 Media Processing
```bash
ccshell "convert all HEIC photos to JPEG"
ccshell "compress video file size while maintaining reasonable quality"
ccshell "extract audio from video file"
```

### 🌐 Network Tasks
```bash
ccshell "download all images from a webpage"
ccshell "set up a local HTTP server on port 8080"
ccshell "check website response time"
```

### ⚙️ System Management
```bash
ccshell "clean system cache files"
ccshell "monitor CPU and memory usage"
ccshell "check port 8080 usage"
```

## 🔧 How It Works

ccshell uses an intelligent **three-tier tool strategy**:

1. **Prioritize Local Commands**: Use built-in system tools
2. **Intelligent Tool Installation**: Auto-install via package managers like brew
3. **Generate Shell Scripts**: Create custom scripts as fallback option

```
User Input → ccshell Prompt Construction → Claude Code Analysis & Execution → Results
```

## ⚠️ Security Considerations

- ccshell focuses on **safe file processing operations**
- Avoids dangerous system-level operations
- Seeks user confirmation before executing potentially risky operations
- Recommend backing up important data first

## 🐛 Troubleshooting

### Claude Command Not Found
```bash
# Ensure Claude Code CLI is installed
claude --version

# If not installed, visit:
# https://claude.ai/code
```

### Permission Issues
```bash
# Ensure index.js has execution permissions
chmod +x index.js
```

### Task Execution Timeout
- Complex tasks may require more time
- Check network connection (for tool downloads)
- Ensure sufficient disk space

### Proxy Configuration Issues
```bash
# If you use HTTP proxy, ensure environment variables are set correctly
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# Test if Claude Code can access network properly
claude --version

# If still having issues, try temporarily disabling proxy
unset http_proxy https_proxy all_proxy
ccshell "echo test"
```

### Debug Mode
```bash
# Enable detailed debug information to see full JSON stream
DEBUG=1 ccshell "your task description"
ccshell --debug "your task description"

# Debug output shows detailed Claude execution information
🔍 Debug - Command executed: claude -p --output-format stream-json --verbose --dangerously-skip-permissions
🔍 Debug - Proxy settings:
  http_proxy: http://127.0.0.1:7890
  https_proxy: http://127.0.0.1:7890
  all_proxy: socks5://127.0.0.1:7890
🔍 JSON: {...}
```

## 📊 MVP Success Metrics

- ✅ Support for 20+ common task types
- ✅ Task execution success rate >75%
- ✅ Average response time <45 seconds
- ✅ First-time use within 5 minutes

## 🤝 Contributing

Welcome to contribute code, report issues, or suggest improvements!

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🗺️ Roadmap

### Phase 2: Intelligence Enhancement
- Personalized learning and user preference memory
- Context understanding and task template system
- Batch processing optimization

### Phase 3: Ecosystem Building
- Plugin architecture and community contributions
- Cross-platform support (Linux, Windows)
- API interfaces and deep integration

## 📞 Support

- 🐛 [Issues](https://github.com/terryso/ccshell/issues)
- 💬 [Discussions](https://github.com/terryso/ccshell/discussions)

---

**Making Command Line Simple** 🚀
# ccshell

🤖 **自然语言macOS shell命令接口** | **Natural Language macOS Shell Command Interface**

ccshell 让您通过自然语言描述任务，自动转换为shell命令并执行。基于Claude Code CLI的智能提示词工程，将复杂的命令行操作简化为直观的自然语言交互。

ccshell allows you to describe tasks in natural language and automatically converts them to shell commands for execution. Built on Claude Code CLI with intelligent prompt engineering, it simplifies complex command-line operations into intuitive natural language interactions.

## ✨ 核心特性 | Key Features

- **🗣️ 自然语言接口**: 用自然语言描述任务，无需记忆命令语法
- **🔧 智能工具管理**: 自动检测、安装和使用最适合的命令行工具
- **⚡ 一键执行**: 从任务描述到结果输出的无缝自动化流程
- **📊 实时进度**: 显示执行进度、工具使用和任务状态
- **⏱️ 无超时限制**: 支持长时间运行的复杂任务
- **🔓 自动授权**: 自动跳过权限检查，流畅执行
- **🛡️ 安全优先**: 专注于安全的文件处理和转换操作  
- **🍎 macOS优化**: 针对macOS环境和工具链优化

## ⚠️ 重要安全提醒 | Important Security Notice

**ccshell 默认使用 `--dangerously-skip-permissions` 参数来提供流畅的用户体验，但这存在潜在的安全风险：**

### 🚨 安全风险 | Security Risks
- **绕过权限检查**: 自动执行所有操作，无需用户确认
- **文件系统访问**: 可能修改、删除或创建任意文件
- **系统命令执行**: 可能安装软件、修改系统配置
- **网络访问**: 可能下载文件或访问网络资源

### 🛡️ 安全建议 | Security Recommendations
- **仅在可信环境使用**: 推荐在沙盒环境或个人开发机器使用
- **避免生产环境**: 不要在生产服务器或重要数据环境中使用
- **备份重要数据**: 使用前请备份重要文件和数据
- **审查任务内容**: 执行复杂任务前请仔细审查任务描述

### 📖 了解更多 | Learn More
查看 [Claude Code 安全文档](https://docs.anthropic.com/en/docs/claude-code/security) 了解权限控制的详细信息。

## 📋 前置条件 | Prerequisites

1. **Node.js** (>= 14.0.0)
2. **Claude Code CLI**: 访问 [https://claude.ai/code](https://claude.ai/code) 安装

## 🚀 快速开始 | Quick Start

### 安装 | Installation

```bash
# 从源码安装 | Install from source
git clone https://github.com/terryso/ccshell.git
cd ccshell
npm install -g .

# 或者使用npm包 (未来发布后) | Or via npm package (when published)
# npm install -g ccshell
```

### 基础使用 | Basic Usage

```bash
# 中文示例 | Chinese Examples
ccshell 列出当前目录下的所有文件
ccshell 批量压缩这个文件夹里的所有图片
ccshell 把所有.mov文件转换成.mp4格式
ccshell 下载这个YouTube视频的最高清版本

# English Examples
ccshell list all files in the current directory
ccshell compress all images in this folder
ccshell convert all .mov files to .mp4 format
ccshell download the highest quality version of this YouTube video

# 实时进度显示示例 | Real-time Progress Example
🤖 ccshell: 正在处理您的任务...
📋 任务: 列出当前目录下的所有文件
🚀 Claude初始化完成，开始处理任务...
🔧 执行工具: Bash
📝 操作: List all files with details
[执行结果]
✅ 任务完成 (耗时: 12.4秒)
💰 成本: $0.023047
```

## 🎯 使用场景 | Use Cases

### 📁 文件操作 | File Operations
```bash
ccshell 批量重命名文件，添加时间戳前缀
ccshell 查找所有大于100MB的文件
ccshell 创建一个包含当前日期的备份文件夹
```

### 🎬 媒体处理 | Media Processing
```bash
ccshell 将所有HEIC格式的照片转换为JPEG
ccshell 压缩视频文件大小，保持合理质量
ccshell 从视频中提取音频文件
```

### 🌐 网络任务 | Network Tasks
```bash
ccshell 下载网页中的所有图片
ccshell 设置一个本地HTTP服务器，端口8080
ccshell 检测网站的响应时间
```

### ⚙️ 系统管理 | System Management
```bash
ccshell 清理系统缓存文件
ccshell 监控CPU和内存使用情况
ccshell 查看端口8080的使用情况
```

## 🔧 工作原理 | How It Works

ccshell 使用智能的**三层工具策略**:

1. **优先使用本地已有命令**: 利用系统内置工具
2. **智能安装缺失工具**: 通过brew等包管理器自动安装
3. **生成shell脚本**: 作为降级方案编写定制脚本

```
用户输入 → ccshell构造提示词 → Claude Code分析执行 → 返回结果
User Input → ccshell Prompt Construction → Claude Code Analysis & Execution → Results
```

## ⚠️ 安全考虑 | Security Considerations

- ccshell专注于**安全的文件处理操作**
- 避免系统级别的危险操作
- 在执行潜在风险操作前会寻求用户确认
- 建议在重要数据上首先进行备份

## 🐛 故障排除 | Troubleshooting

### Claude Command Not Found
```bash
# 确保Claude Code CLI已安装
# Ensure Claude Code CLI is installed
claude --version

# 如果未安装，访问 | If not installed, visit:
# https://claude.ai/code
```

### 权限问题 | Permission Issues
```bash
# 确保index.js有执行权限
# Ensure index.js has execution permissions
chmod +x index.js
```

### 任务执行超时 | Task Execution Timeout
- 复杂任务可能需要更长时间
- 检查网络连接（用于工具下载）
- 确保有足够的磁盘空间

### 代理配置问题 | Proxy Configuration Issues
```bash
# 如果您使用HTTP代理，请确保环境变量正确设置
# If you use HTTP proxy, ensure environment variables are set correctly
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 测试Claude Code是否能正常访问网络
# Test if Claude Code can access network properly
claude --version

# 如果仍有问题，尝试临时禁用代理测试
# If still having issues, try temporarily disabling proxy
unset http_proxy https_proxy all_proxy
ccshell "echo test"
```

### 调试模式 | Debug Mode
```bash
# 开启详细调试信息，查看完整的JSON流
# Enable detailed debug information to see full JSON stream
DEBUG=1 ccshell "你的任务描述"

# 调试输出将显示Claude的详细执行信息
# Debug output shows detailed Claude execution information
🔍 Debug - 执行的命令: claude -p --output-format stream-json --verbose --dangerously-skip-permissions
🔍 Debug - 代理设置:
  http_proxy: http://127.0.0.1:7890
  https_proxy: http://127.0.0.1:7890
  all_proxy: socks5://127.0.0.1:7890
🔍 JSON: {...}
```

## 📊 MVP成功指标 | MVP Success Metrics

- ✅ 支持20+种常见任务类型
- ✅ 任务执行成功率 >75%
- ✅ 平均响应时间 <45秒
- ✅ 5分钟内完成首次使用

## 🤝 贡献 | Contributing

欢迎贡献代码、报告问题或提出建议！

Welcome to contribute code, report issues, or suggest improvements!

1. Fork 项目 | Fork the project
2. 创建功能分支 | Create feature branch (`git checkout -b feature/AmazingFeature`)
3. 提交更改 | Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 | Push to branch (`git push origin feature/AmazingFeature`)
5. 开启Pull Request | Open a Pull Request

## 📝 许可证 | License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🗺️ 路线图 | Roadmap

### Phase 2: 智能化增强
- 个性化学习和用户偏好记忆
- 上下文理解和任务模板系统
- 批量处理优化

### Phase 3: 生态系统建设  
- 插件架构和社区贡献
- 跨平台支持 (Linux, Windows)
- API接口和深度集成

## 📞 支持 | Support

- 🐛 [Issues](https://github.com/terryso/ccshell/issues)
- 💬 [Discussions](https://github.com/terryso/ccshell/discussions)
- 📧 Email: support@ccshell.dev

---

**让命令行变得简单 | Making Command Line Simple** 🚀
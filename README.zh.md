# ccshell

🤖 **自然语言 macOS Shell 命令接口**

[**English**](README.md) | **中文文档**

ccshell 让你能够用自然语言描述任务，并自动转换为 shell 命令执行。基于 Claude Code CLI 和智能提示工程，将复杂的命令行操作简化为直观的自然语言交互。

## ✨ 主要特性

- **🗣️ 自然语言接口**：用自然语言描述任务，无需记忆命令语法
- **🔧 智能工具管理**：自动检测、安装和使用最合适的命令行工具
- **⚡ 一键执行**：从任务描述到结果输出的无缝自动化
- **📊 实时进度显示**：显示执行进度、工具使用情况和任务状态
- **🔓 自动授权**：自动跳过权限检查，确保执行流畅
- **🍎 macOS 优化**：针对 macOS 环境和工具链进行优化

## ⚠️ 重要安全提示

**ccshell 默认使用 `--dangerously-skip-permissions` 参数提供流畅的用户体验，但这会带来潜在的安全风险：**

### 🚨 安全风险
- **绕过权限检查**：自动执行所有操作而不需要用户确认
- **文件系统访问**：可能修改、删除或创建任意文件
- **系统命令执行**：可能安装软件或修改系统配置
- **网络访问**：可能下载文件或访问网络资源

### 🛡️ 安全建议
- **仅在可信环境中使用**：建议在沙盒环境或个人开发机器上使用
- **避免生产环境**：不要在生产服务器或关键数据环境中使用
- **备份重要数据**：使用前请备份重要文件和数据
- **审查任务内容**：执行复杂任务前请仔细审查任务描述

### 📖 了解更多
查看 [Claude Code 安全文档](https://docs.anthropic.com/en/docs/claude-code/security) 了解权限控制的详细信息。

## 📋 系统要求

1. **Node.js** (>= 14.0.0)
2. **Claude Code CLI**：访问 [https://claude.ai/code](https://claude.ai/code) 进行安装

## 🚀 快速开始

### 安装

```bash
# 从源码安装
git clone https://github.com/terryso/ccshell.git
cd ccshell
npm install -g .

# 或通过 npm 包安装
npm install -g ccshell
```

### 基本用法

```bash
# 获取帮助
ccshell --help
ccshell -h

# 查看版本
ccshell --version
ccshell -v

# 使用示例
ccshell "列出当前目录下的所有文件"
ccshell "压缩此文件夹中的所有图片"
ccshell "将所有 .mov 文件转换为 .mp4 格式"
ccshell "下载这个 YouTube 视频的最高质量版本"

# 实时进度示例
🤖 ccshell: 正在处理你的任务...
📋 任务：列出当前目录下的所有文件
🚀 Claude 初始化完成，开始执行任务...
🔧 执行工具：Bash
📝 操作：列出所有文件并显示详情
[执行结果]
✅ 任务完成 (耗时: 12.4秒)
💰 费用: $0.023047
```

## 🎯 使用场景

### 📁 文件操作
```bash
ccshell "批量重命名文件并添加时间戳前缀"
ccshell "查找所有大于 100MB 的文件"
ccshell "创建以当前日期命名的备份文件夹"
```

### 🎬 媒体处理
```bash
ccshell "将所有 HEIC 照片转换为 JPEG"
ccshell "在保持合理质量的情况下压缩视频文件大小"
ccshell "从视频文件中提取音频"
```

### 🌐 网络任务
```bash
ccshell "下载网页上的所有图片"
ccshell "在 8080 端口设置本地 HTTP 服务器"
ccshell "检查网站响应时间"
```

### ⚙️ 系统管理
```bash
ccshell "清理系统缓存文件"
ccshell "监控 CPU 和内存使用情况"
ccshell "查看 8080 端口的使用情况"
```

## 🔧 工作原理

ccshell 使用智能的**三层工具策略**：

1. **优先使用本地命令**：使用内置系统工具
2. **智能工具安装**：通过 brew 等包管理器自动安装
3. **生成 Shell 脚本**：创建自定义脚本作为后备选项

```
用户输入 → ccshell 提示构建 → Claude Code 分析执行 → 结果输出
```

## ⚠️ 安全考虑

- ccshell 专注于**安全的文件处理操作**
- 避免危险的系统级操作
- 在执行潜在风险操作前寻求用户确认
- 建议先备份重要数据

## 🐛 问题排查

### Claude 命令未找到
```bash
# 确保 Claude Code CLI 已安装
claude --version

# 如果未安装，请访问：
# https://claude.ai/code
```

### 权限问题
```bash
# 确保 index.js 有执行权限
chmod +x index.js
```

### 任务执行超时
- 复杂任务可能需要更多时间
- 检查网络连接（用于工具下载）
- 确保有足够的磁盘空间

### 代理配置问题
```bash
# 如果使用 HTTP 代理，确保环境变量设置正确
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 测试 Claude Code 是否能正常访问网络
claude --version

# 如果仍有问题，尝试临时禁用代理
unset http_proxy https_proxy all_proxy
ccshell "echo test"
```

### 调试模式
```bash
# 启用详细调试信息，查看完整的 JSON 流
DEBUG=1 ccshell "你的任务描述"
ccshell --debug "你的任务描述"

# 调试输出显示详细的 Claude 执行信息
🔍 Debug - 执行的命令：claude -p --output-format stream-json --verbose --dangerously-skip-permissions
🔍 Debug - 代理设置：
  http_proxy: http://127.0.0.1:7890
  https_proxy: http://127.0.0.1:7890
  all_proxy: socks5://127.0.0.1:7890
🔍 JSON: {...}
```

## 📊 MVP 成功指标

- ✅ 支持 20+ 种常见任务类型
- ✅ 任务执行成功率 >75%
- ✅ 平均响应时间 <45 秒
- ✅ 首次使用上手时间 <5 分钟

## 🤝 贡献

欢迎贡献代码、报告问题或建议改进！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🗺️ 发展路线图

### 第二阶段：智能增强
- 个性化学习和用户偏好记忆
- 上下文理解和任务模板系统
- 批处理优化

### 第三阶段：生态建设
- 插件架构和社区贡献
- 跨平台支持（Linux、Windows）
- API 接口和深度集成

## 📞 支持

- 🐛 [问题反馈](https://github.com/terryso/ccshell/issues)
- 💬 [讨论区](https://github.com/terryso/ccshell/discussions)

---

**让命令行变得简单** 🚀
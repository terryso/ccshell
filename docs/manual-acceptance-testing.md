# ccshell 手工验收测试指南

**版本**: v0.1.6+
**测试目标**: 验证多 AI 提供商支持功能
**测试环境**: macOS 
**前置条件**: Node.js >= 14.0.0

---

## 📋 测试前准备

### 环境检查
```bash
# 检查 Node.js 版本
node --version

# 检查 AI CLI 可用性
claude --version  # Claude Code CLI
gemini --version  # Gemini CLI (可选)
```

### 安装测试版本
```bash
# 方式一：本地测试
cd /path/to/ccshell
chmod +x index.js

# 方式二：全局安装测试
npm install -g .
```

---

## 🧪 核心功能验收测试

### 1. 基础功能测试

#### 1.1 帮助信息
```bash
# 测试命令
ccshell --help
ccshell -h

# 预期结果
✅ 显示完整帮助信息
✅ 包含新的提供商相关选项：
   - --provider <name>
   - --set-default <provider>
   - --config
✅ 双语显示（中英文）
```

#### 1.2 版本信息
```bash
# 测试命令
ccshell --version
ccshell -v

# 预期结果
✅ 显示当前版本号
✅ 格式: ccshell vX.X.X
```

### 2. 配置管理测试

#### 2.1 默认配置生成
```bash
# 测试命令
ccshell --config

# 预期结果
✅ 显示默认配置结构
✅ defaultProvider: "claude"
✅ 包含 claude 和 gemini 提供商配置
✅ 自动创建 ~/.ccshell.json 文件
```

#### 2.2 设置默认提供商
```bash
# 测试命令
ccshell --set-default gemini

# 预期结果
✅ 显示成功消息（中英文）
✅ "默认AI提供商已设置为: gemini"
✅ "Default AI provider set to: gemini"

# 验证配置更改
ccshell --config
✅ defaultProvider 改为 "gemini"
```

#### 2.3 重置默认提供商
```bash
# 测试命令
ccshell --set-default claude

# 预期结果
✅ 成功重置为 claude
✅ 配置文件正确更新
```

#### 2.4 错误处理测试
```bash
# 测试命令
ccshell --set-default invalid-provider

# 预期结果
✅ 显示错误消息
✅ "未知的AI提供商: invalid-provider"
✅ 列出支持的提供商: claude, gemini
✅ 进程退出码非0
```

### 3. AI 提供商选择测试

#### 3.1 使用默认提供商
```bash
# 测试命令
ccshell "echo hello world"

# 预期结果
✅ 显示当前使用的 AI 提供商
✅ "AI提供商 / AI Provider: claude" (或当前默认值)
✅ 正常执行任务
```

#### 3.2 指定 Claude 提供商
```bash
# 测试命令
ccshell --provider claude "echo hello world"

# 预期结果
✅ 显示 "AI提供商 / AI Provider: claude"
✅ 正常初始化 Claude
✅ 显示流式 JSON 输出
✅ 任务执行成功
```

#### 3.3 指定 Gemini 提供商
```bash
# 测试命令
ccshell --provider gemini "echo hello world"

# 预期结果
✅ 显示 "AI提供商 / AI Provider: gemini"
✅ 正常调用 Gemini CLI
✅ 如果 Gemini CLI 未安装，显示相应错误信息
```

#### 3.4 无效提供商测试
```bash
# 测试命令
ccshell --provider invalid "echo hello"

# 预期结果
✅ 显示错误消息
✅ 列出支持的提供商
✅ 进程退出码非0
```

### 4. Debug 模式测试

#### 4.1 Claude Debug 模式
```bash
# 测试命令
ccshell --debug --provider claude "echo test"

# 预期结果
✅ 显示 Debug 信息
✅ "Debug - AI提供商 / AI Provider: claude"
✅ "Debug - 执行的命令 / Command: claude ..."
✅ 显示代理设置信息
✅ 显示 JSON 流数据
```

#### 4.2 Gemini Debug 模式
```bash
# 测试命令
ccshell --debug --provider gemini "echo test"

# 预期结果
✅ 显示 Debug 信息
✅ "Debug - AI提供商 / AI Provider: gemini"
✅ 显示对应的命令执行信息
```

#### 4.3 环境变量 Debug
```bash
# 测试命令
DEBUG=1 ccshell --provider claude "echo test"

# 预期结果
✅ 效果与 --debug 相同
✅ Debug 信息正确显示
```

### 5. 参数组合测试

#### 5.1 多参数组合
```bash
# 测试命令
ccshell --debug --provider gemini "list files"

# 预期结果
✅ 正确解析所有参数
✅ 优先级正确（提供商 > 默认设置）
✅ Debug 信息包含指定的提供商
```

#### 5.2 参数顺序测试
```bash
# 测试命令
ccshell --provider claude --debug "test task"
ccshell --debug --provider claude "test task"

# 预期结果
✅ 两种顺序都能正确解析
✅ 功能表现一致
```

### 6. 错误处理验收

#### 6.1 CLI 不存在错误
```bash
# 测试前：临时重命名 claude 命令
# 测试命令
ccshell --provider claude "test"

# 预期结果
✅ 显示 Claude CLI 未安装错误
✅ 提供安装链接信息
✅ 友好的错误提示
```

#### 6.2 空任务处理
```bash
# 测试命令
ccshell --provider claude
ccshell --provider claude ""

# 预期结果
✅ 显示帮助信息
✅ 不执行任何 AI 调用
```

### 7. 配置文件验证

#### 7.1 配置文件位置
```bash
# 验证命令
ls -la ~/.ccshell.json
cat ~/.ccshell.json

# 预期结果
✅ 文件存在于用户主目录
✅ JSON 格式正确
✅ 包含所有必需字段
```

#### 7.2 配置文件权限
```bash
# 验证命令
ls -la ~/.ccshell.json

# 预期结果
✅ 文件权限合理 (rw- for owner)
✅ 普通用户可读写
```

---

## 🎯 场景化测试

### 场景 1: 新用户首次使用
```bash
# 删除配置文件
rm ~/.ccshell.json

# 首次使用
ccshell "echo hello"

# 验证
✅ 自动创建配置文件
✅ 使用默认设置 (claude)
✅ 正常执行任务
```

### 场景 2: 切换 AI 提供商
```bash
# 设置为 Gemini
ccshell --set-default gemini

# 使用默认提供商
ccshell "list current directory"

# 临时使用 Claude
ccshell --provider claude "same task"

# 验证
✅ 默认提供商正确切换
✅ 临时指定提供商有效
✅ 配置持久保存
```

### 场景 3: 开发者调试
```bash
# Debug 模式查看详细信息
ccshell --debug --provider claude "complex task"

# 验证
✅ 详细的执行信息
✅ 命令行参数显示
✅ 网络设置信息
✅ 流式数据输出
```

---

## 📊 性能验收标准

### 响应时间
- ✅ 帮助信息显示: < 1秒
- ✅ 配置查看/修改: < 2秒  
- ✅ AI 任务执行启动: < 5秒

### 资源使用
- ✅ 内存占用合理 (< 50MB)
- ✅ 无内存泄漏
- ✅ CPU 使用正常

---

## 🔍 回归测试检查点

### 原有功能保持
- ✅ 不带参数显示帮助
- ✅ 原有命令行选项正常工作
- ✅ 错误处理机制保持
- ✅ 流式输出格式保持

### 向后兼容性
- ✅ 旧的使用方式仍然有效
- ✅ 配置文件格式向后兼容
- ✅ 默认行为保持一致

---

## 📝 测试报告模板

### 测试执行记录
```
测试日期: ___________
测试环境: ___________
测试人员: ___________

基础功能测试: ☐ 通过 ☐ 失败
配置管理测试: ☐ 通过 ☐ 失败  
AI提供商测试: ☐ 通过 ☐ 失败
Debug模式测试: ☐ 通过 ☐ 失败
错误处理测试: ☐ 通过 ☐ 失败
性能验收测试: ☐ 通过 ☐ 失败
回归测试: ☐ 通过 ☐ 失败

总体结论: ☐ 验收通过 ☐ 需要修复

备注：
_________________________
```

### 发现问题记录模板
```
问题编号: #____
严重级别: [高/中/低]
问题描述: 
复现步骤:
1. 
2. 
3. 
预期结果:
实际结果:
影响范围:
建议处理:
```

---

## 🚀 发布前最终检查

- ☐ 所有测试用例通过
- ☐ 性能指标符合要求
- ☐ 错误处理完善
- ☐ 文档更新完整
- ☐ 向后兼容性确认
- ☐ 安全性检查通过

---

**注意事项**:
1. 测试过程中遇到问题及时记录
2. 每个功能都要测试正常和异常情况
3. 特别关注多 AI 提供商切换的稳定性
4. 验证配置文件的持久性和正确性
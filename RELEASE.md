# ccshell Release Guide

## 发布流程 | Release Process

### 自动发布 | Automatic Release

ccshell 使用GitHub Actions自动发布到npm。当推送版本标签时会自动触发发布流程。

### 发布步骤 | Release Steps

#### 方式一：使用发布脚本（推荐）| Method 1: Use Release Script (Recommended)
```bash
npm run release:patch  # 补丁版本 0.1.0 -> 0.1.1
npm run release:minor  # 次版本 0.1.0 -> 0.2.0  
npm run release:major  # 主版本 0.1.0 -> 1.0.0
npm run release        # 默认补丁版本
```

#### 方式二：手动发布 | Method 2: Manual Release  
1. **更新版本号 | Update Version**
   ```bash
   npm version patch  # 补丁版本 0.1.0 -> 0.1.1
   npm version minor  # 次版本 0.1.0 -> 0.2.0  
   npm version major  # 主版本 0.1.0 -> 1.0.0
   ```

2. **推送标签 | Push Tags**
   ```bash
   git push origin develop --tags
   ```

3. **自动流程 | Automatic Process**
   - ✅ 运行测试和质量检查
   - 📦 构建并发布到npm
   - 🏷️ 创建GitHub Release
   - 📝 生成发布说明

### 🔧 发布脚本功能 | Release Script Features

发布脚本 (`npm run release:*`) 会自动执行以下步骤：
- ✅ 运行发布前检查 (pre-publish checks)
- 📦 更新版本号
- 📝 创建提交和标签  
- 🚀 推送到远程仓库
- 🤖 触发GitHub Actions自动发布

### 发布前检查清单 | Pre-Release Checklist

- [ ] 代码已合并到main分支
- [ ] README.md已更新
- [ ] 功能已充分测试
- [ ] 版本号符合语义化版本规范
- [ ] NPM_TOKEN已配置在GitHub Secrets中

### NPM Token配置 | NPM Token Setup

1. 登录npm：`npm login`
2. 创建访问令牌：`npm token create`
3. 在GitHub仓库设置中添加Secret：`NPM_TOKEN`

### 发布后验证 | Post-Release Verification

```bash
# 检查npm包
npm info ccshell

# 安装并测试
npm install -g ccshell
ccshell --help
ccshell "echo hello world"
```

### 发布问题排查 | Troubleshooting

- **权限错误**: 检查NPM_TOKEN是否正确配置
- **测试失败**: 检查CI日志，修复问题后重新打标签
- **版本冲突**: 确保版本号未被使用

---

更多信息请参考 [GitHub Actions文档](https://docs.github.com/en/actions) 和 [npm发布指南](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
# 标准初始化注意事项 v1.0.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-22 | 初始版本 | 创建标准初始化注意事项文档，包含环境准备、项目初始化、开发服务器启动、项目结构验证、常见问题处理、开发工具配置、测试环境准备、构建验证、性能基准、安全检查、部署前检查清单和故障排除 |

## 全局要求

**重要提醒：本文档遵循全局时间处理要求，任何涉及时间的操作必须先查询系统时间或使用MCP服务确认后方可执行。详细规范请参考 [00-global-requirements-v1.0.0.md](00-global-requirements-v1.0.0.md)**

## 环境准备

### 系统要求
- 操作系统：Windows 10+、macOS 10.15+、Ubuntu 18.04+
- 内存：最低8GB，推荐16GB
- 存储：至少10GB可用空间
- 网络：稳定的互联网连接

### 开发工具安装
```bash
# Node.js安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应显示v18.x.x
npm --version   # 应显示9.x.x

# Git安装
sudo apt-get install git
git --version   # 应显示2.30+
```

## 项目初始化

### 克隆项目
```bash
git clone <repository-url>
cd matrix
```

### 依赖安装
```bash
npm install
```

### 开发环境配置
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

### 配置文件设置
```env
# 开发环境配置
NODE_ENV=development
ELECTRON_IS_DEV=true

# API配置
COMFYUI_API_URL=http://localhost:8188
N8N_API_URL=http://localhost:5678

# 文件路径配置
PROJECTS_ROOT=./projects
TEMP_DIR=./temp
LOGS_DIR=./logs
```

## 开发服务器启动

### 开发模式
```bash
npm run dev
```

### 调试模式
```bash
npm run debug
```

### 测试模式
```bash
npm run test
```

## 项目结构验证

### 必需目录检查
```bash
# 确保以下目录存在
ls -la src/
ls -la src/main/
ls -la src/renderer/
ls -la docs/
```

### 配置文件验证
```bash
# 检查package.json
cat package.json | jq .name
cat package.json | jq .version

# 检查TypeScript配置
cat tsconfig.json

# 检查Webpack配置
cat webpack.config.js
```

## 常见问题处理

### 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

### Electron启动失败
```bash
# 重新构建Electron
npm rebuild electron

# 检查系统兼容性
npm run electron:check
```

### 权限问题
```bash
# 修复文件权限
chmod -R 755 .
chown -R $USER:$USER .
```

## 开发工具配置

### VSCode配置
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### ESLint配置
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

### Prettier配置
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 测试环境准备

### 单元测试
```bash
npm run test:unit
```

### 集成测试
```bash
npm run test:integration
```

### E2E测试
```bash
npm run test:e2e
```

## 构建验证

### 开发构建
```bash
npm run build:dev
```

### 生产构建
```bash
npm run build:prod
```

### 打包测试
```bash
npm run package
```

## 性能基准

### 启动时间
- 冷启动：<5秒
- 热启动：<2秒

### 内存使用
- 空闲状态：<200MB
- 正常使用：<500MB

### 文件操作
- 项目加载：<1秒
- 大文件导入：<10秒

## 安全检查

### 依赖安全扫描
```bash
npm audit
npm audit fix
```

### 代码安全检查
```bash
npm run security:check
```

### 配置安全验证
- API密钥存储验证
- 文件访问权限检查
- 网络请求安全验证

## 部署前检查清单

- [ ] 所有测试通过
- [ ] 构建无错误
- [ ] 性能基准达标
- [ ] 安全检查通过
- [ ] 文档更新完整
- [ ] 版本号正确
- [ ] 变更日志完整

## 故障排除

### 日志收集
```bash
# 应用日志
tail -f logs/app.log

# 错误日志
tail -f logs/error.log

# 系统日志
tail -f logs/system.log
```

### 调试模式
```bash
# 启用详细日志
DEBUG=* npm run dev

# 启用性能监控
npm run dev:profile
```

### 问题报告
收集以下信息：
- 操作系统版本
- Node.js版本
- Electron版本
- 错误日志
- 重现步骤
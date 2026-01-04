# 标准初始化注意事项 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 重大更新 | 更新技术栈，精简冗余章节 |
| 1.0.0 | 2025-12-22 | 初始版本 | 创建标准初始化注意事项文档 |

---

## 系统要求

- **操作系统**: Windows 10+、macOS 10.15+、Ubuntu 18.04+
- **内存**: 最低8GB，推荐16GB
- **存储**: 至少10GB可用空间
- **网络**: 稳定的互联网连接

---

## 开发工具

### 安装

```bash
# Node.js 20+（验证）
node --version  # v20.x.x
npm --version   # 9.x.x

# Git 2.30+
git --version
```

### 技术栈

- Node.js 20+
- Electron 39+
- React 18+
- TypeScript 5+
- Webpack 5+
- Vitest（测试）

---

## 项目初始化

```bash
# 克隆项目
git clone <repository-url>
cd matrix

# 安装依赖
npm install

# 配置环境
cp .env.example .env
```

### 环境变量

```env
NODE_ENV=development
ELECTRON_IS_DEV=true

# API端点（如使用外部服务）
COMFYUI_API_URL=http://localhost:8188
```

---

## 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建所有进程
npm run build

# 运行测试
npm test                 # 所有测试
npm run test:unit        # 仅单元测试
npm run test:integration # 仅集成测试
npm run test:watch       # 监听模式

# 代码质量
npm run lint
npm run lint:fix
npm run format
```

---

## 常见问题

### 依赖安装失败

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Electron启动失败

```bash
npm rebuild electron
```

### 端口被占用

默认开发服务器端口：3000。如需修改，编辑 `webpack.renderer.config.js`。

---

## 性能基准

- **冷启动**: <5秒
- **热启动**: <2秒
- **内存（空闲）**: <200MB
- **内存（活跃）**: <500MB

---

**English Version**: `docs/en/04-initialization-guidelines-v1.1.0.md`

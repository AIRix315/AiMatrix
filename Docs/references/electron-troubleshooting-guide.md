# Electron 故障排除指南

## 📋 目录
- [环境问题](#环境问题)
- [安装问题](#安装问题)
- [配置问题](#配置问题)
- [构建问题](#构建问题)
- [运行时问题](#运行时问题)
- [打包问题](#打包问题)
- [性能问题](#性能问题)
- [调试技巧](#调试技巧)

---

## 🔧 环境问题

### Node.js 版本不兼容
**症状**: 
```
Error: The module was compiled against a different Node.js version
```

**解决方案**:
```bash
# 检查当前版本
node -v

# 需要 Node.js >= 18.0.0
# 推荐使用 nvm 管理 Node.js 版本
nvm install 18
nvm use 18
```

### npm 版本过低
**症状**:
```
npm WARN deprecated package
npm ERR! peer dep missing
```

**解决方案**:
```bash
# 升级 npm
npm install -g npm@latest

# 或使用 yarn
npm install -g yarn
yarn --version
```

### 环境变量问题
**症状**:
```
ELECTRON_IS_DEV is not defined
NODE_ENV conflicts
```

**解决方案**:
```bash
# 设置开发环境变量
export NODE_ENV=development
export ELECTRON_IS_DEV=true

# Windows
set NODE_ENV=development
set ELECTRON_IS_DEV=true
```

---

## 📦 安装问题

### Electron 二进制文件下载失败
**症状**:
```
Error: Electron failed to install correctly
```

**解决方案**:

#### 方案一：使用国内镜像
```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set electron_custom_dir "{{ version }}"

# 重新安装
rimraf node_modules/electron
npm install electron@39.2.7
```

#### 方案二：清理重装
```bash
# 完全清理
npm cache clean --force
rimraf node_modules
rimraf package-lock.json

# 重新安装
npm install
```

#### 方案三：代理设置
```bash
# 设置代理
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 或使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### 依赖冲突
**症状**:
```
npm ERR! peer dep conflicting
npm ERR! resolution conflicts
```

**解决方案**:
```bash
# 检查冲突
npm ls

# 使用 npm-force
npm install --force

# 或使用 yarn resolutions
# 在 package.json 中添加:
"resolutions": {
  "conflicting-package": "compatible-version"
}
```

---

## ⚙️ 配置问题

### Webpack 配置错误
**症状**:
```
Module not found: Error: Can't resolve 'electron'
```

**解决方案**:

#### 主进程配置 (webpack.main.config.js)
```javascript
module.exports = {
  target: 'electron-main',
  externals: {
    electron: 'commonjs electron',
    // 其他 Node.js 内置模块
    fs: 'commonjs fs',
    path: 'commonjs path'
  }
};
```

#### 渲染进程配置 (webpack.renderer.config.js)
```javascript
module.exports = {
  target: 'electron-renderer',
  // 不要外部化 electron，渲染进程通过 preload 脚本访问
};
```

#### 预加载配置 (webpack.preload.config.js)
```javascript
module.exports = {
  target: 'electron-preload',
  externals: {
    electron: 'commonjs electron'
  }
};
```

### TypeScript 配置问题
**症状**:
```
Cannot find module 'electron' or its corresponding type declarations
```

**解决方案**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["node", "electron"],
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}
```

### 窗口配置错误
**症状**:
```
Security warning: nodeIntegration is disabled
contextBridge is not defined
```

**解决方案**:
```javascript
// src/main/window.ts
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,        // 必须为 false
    contextIsolation: true,        // 必须为 true
    enableRemoteModule: false,      // 已废弃
    preload: path.join(__dirname, '../preload/index.js')
  }
});
```

---

## 🔨 构建问题

### TypeScript 编译错误
**症状**:
```
error TS2307: Cannot find module
error TS2339: Property does not exist
```

**解决方案**:
```bash
# 检查类型定义
npm install --save-dev @types/node @types/electron

# 更新 TypeScript
npm install --save-dev typescript@latest

# 检查 tsconfig.json 路径映射
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### CSS 加载问题
**症状**:
```
Module parse failed: Unexpected token
CSS import error
```

**解决方案**:
```javascript
// webpack.renderer.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

### 端口冲突
**症状**:
```
Error: listen EADDRINUSE :::3001
```

**解决方案**:
```bash
# 查找占用端口的进程
# Windows
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3001

# 终止进程
taskkill /PID <PID> /F
# 或
kill -9 <PID>

# 或更改端口
# config/webpack.renderer.config.js
devServer: {
  port: 3002  // 更改为其他端口
}
```

---

## 🚀 运行时问题

### 应用白屏
**症状**: Electron 窗口打开但显示空白

**解决方案**:
```javascript
// 检查开发者工具
mainWindow.webContents.openDevTools();

// 检查控制台错误
mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
  console.log('Renderer console:', message);
});

// 检查加载错误
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
  console.error('Failed to load:', errorCode, errorDescription);
});
```

### IPC 通信失败
**症状**:
```
Error: An object could not be cloned.
ipcRenderer.invoke is not a function
```

**解决方案**:
```javascript
// 确保预加载脚本正确加载
// src/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // 暴露的 API
});

// 渲染进程中使用
window.electronAPI.someMethod();
```

### 文件路径问题
**症状**:
```
Error: ENOENT: no such file or directory
```

**解决方案**:
```javascript
// 使用 path.join 和 __dirname
const path = require('path');

// 开发环境
if (process.env.NODE_ENV === 'development') {
  mainWindow.loadURL('http://localhost:3001');
} else {
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}
```

---

## 📦 打包问题

### electron-builder 配置冲突
**症状**:
```
Configuration validation error
Multiple build configurations found
```

**解决方案**:
```json
// 统一使用 package.json 中的 build 配置
// 移除 config/electron-builder.json 或确保配置一致

{
  "build": {
    "appId": "com.matrix.ai-workflow",
    "files": [
      "build/**/*",
      "resources/**/*"
      // 不要包含 "node_modules/**/*"
    ]
  }
}
```

### 文件包含/排除问题
**症状**:
```
Module not found in production
Application files missing
```

**解决方案**:
```json
{
  "build": {
    "files": [
      "build/**/*",
      "resources/**/*",
      "package.json"
      // 明确指定需要的文件
    ],
    "extraResources": [
      {
        "from": "resources",
        "to": "resources"
      }
    ]
  }
}
```

### 代码签名问题 (macOS)
**症状**:
```
ERROR: Failed to code sign
Identity not found
```

**解决方案**:
```bash
# 列出可用证书
security find-identity -v -p codesigning

# 在配置中指定证书
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name"
    }
  }
}
```

---

## ⚡ 性能问题

### 启动速度慢
**解决方案**:
```javascript
// 延迟加载非关键模块
// 优化预加载脚本大小
// 使用代码分割

// main.ts
async function onReady() {
  // 先显示窗口
  const window = createWindow();
  
  // 后台加载服务
  setTimeout(async () => {
    await initializeServices();
  }, 100);
}
```

### 内存占用高
**解决方案**:
```javascript
// 及时清理资源
mainWindow.on('closed', () => {
  // 清理引用
  mainWindow = null;
  
  // 清理定时器
  clearInterval(intervalId);
  
  // 清理事件监听器
  ipcMain.removeAllListeners();
});
```

### 渲染性能差
**解决方案**:
```javascript
// 使用虚拟滚动
// 避免频繁的 DOM 操作
// 使用 React.memo 和 useMemo

// 启用硬件加速
app.commandLine.appendSwitch('enable-gpu-rasterization');
```

---

## 🐛 调试技巧

### 主进程调试
```bash
# 启动时添加调试参数
electron --inspect=5858 build/main/index.js

# 或在 package.json 中
{
  "scripts": {
    "debug": "electron --inspect=5858 build/main/index.js"
  }
}
```

### 渲染进程调试
```javascript
// 自动打开开发者工具
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}

// 或使用快捷键
mainWindow.webContents.on('before-input-event', (event, input) => {
  if (input.key === 'F12') {
    mainWindow.webContents.toggleDevTools();
  }
});
```

### 日志记录
```javascript
// 使用 electron-log
const log = require('electron-log');

log.info('应用启动');
log.error('错误信息');
log.warn('警告信息');

// 日志文件位置
// Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\
// macOS: ~/Library/Logs/{app name}/
// Linux: ~/.config/{app name}/logs/
```

### 性能分析
```javascript
// 启用性能监控
mainWindow.webContents.on('did-finish-load', () => {
  mainWindow.webContents.enableNetworkEmulation(false);
  mainWindow.webContents.startFrameRateMonitoring(60);
});

// 监控内存使用
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', usage);
}, 5000);
```

---

## 📊 常见错误代码

| 错误代码 | 描述 | 解决方案 |
|----------|------|----------|
| EADDRINUSE | 端口被占用 | 更换端口或终止占用进程 |
| ENOENT | 文件不存在 | 检查文件路径 |
| EACCES | 权限不足 | 检查文件权限 |
| MODULE_NOT_FOUND | 模块未找到 | 安装缺失的依赖 |
| CERT_HAS_EXPIRED | 证书过期 | 更新系统证书或使用 http |

---

## 🆘 获取帮助

### 官方资源
- [Electron 官方文档](https://www.electronjs.org/docs)
- [Electron Builder 文档](https://www.electron.build/configuration)
- [Webpack 配置参考](https://webpack.js.org/configuration/)

### 社区支持
- [Electron GitHub Issues](https://github.com/electron/electron/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/electron)
- [Electron Discord](https://discord.gg/electron)

### 项目特定资源
- 项目文档: `docs/` 目录
- 配置文件: `config/` 目录
- 日志文件: `logs/` 目录

---

**最后更新**: 2025-12-24  
**维护者**: 开发团队  
**版本**: 1.0.0
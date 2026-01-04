# 技术蓝图 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 重大更新 | 更新技术栈（Electron 39+、Vitest），移除Redux，补充Electron导入规范 |
| 1.0.0 | 2025-12-22 | 初始版本 | 创建技术蓝图文档 |

**全局要求**: 详见 [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## 代码规范标准

### Electron 模块导入规范 ⚠️ 强制

```typescript
// ✅ 正确 - 命名导入
import { app, BrowserWindow, ipcMain } from 'electron';
import { useState, useEffect } from 'react';

// ❌ 错误 - 默认导入
import electron from 'electron';
```

**强制执行**: ESLint规则 `no-restricted-imports`

### TypeScript
- 严格模式: `"strict": true`
- 所有代码必须通过类型检查
- 避免 `any` 类型（ESLint警告级别）

### 测试规范
- 框架: **Vitest**（非Jest）
- 模拟Electron模块（见 `tests/utils/setup.ts`）
- 文件命名: `*.test.ts` 或 `*.spec.ts`
- 目录结构:
  - `tests/unit/`: 服务和工具函数测试
  - `tests/integration/`: 服务间交互、IPC通道测试
- 超时设置: 10秒（可在vitest.config.ts配置）

---

## 开发环境

### 系统要求
- Node.js 20+
- npm 9+
- Git 2.30+

### 技术栈
- Electron 39+
- React 18+
- TypeScript 5+
- Webpack 5+
- Vitest（测试）

---

## 核心模块接口

### ProjectManager
```typescript
interface ProjectManager {
  createProject(name: string, template?: string): Promise<ProjectConfig>
  loadProject(projectId: string): Promise<ProjectConfig>
  saveProject(config: ProjectConfig): Promise<void>
  deleteProject(projectId: string): Promise<void>
  listProjects(): Promise<ProjectConfig[]>
}
```

### AssetManager
```typescript
interface AssetManager {
  addAsset(scope: AssetScope, containerId: string, data: AssetData): Promise<AssetMetadata>
  removeAsset(scope: AssetScope, containerId: string, assetId: string): Promise<void>
  updateAsset(assetId: string, updates: Partial<AssetMetadata>): Promise<void>
  searchAssets(filter: AssetFilter): Promise<AssetScanResult>
  promoteAssetToGlobal(projectId: string, assetId: string): Promise<AssetMetadata>
}
```

### PluginManager
```typescript
interface PluginManager {
  loadPlugin(pluginId: string): Promise<Plugin>
  unloadPlugin(pluginId: string): Promise<void>
  installPlugin(package: PluginPackage): Promise<void>
  listPlugins(type?: 'official' | 'community'): Promise<PluginInfo[]>
  executePluginAction(pluginId: string, action: string, params: any): Promise<any>
}
```

### TaskScheduler
```typescript
interface TaskScheduler {
  createTask(config: TaskConfig): Promise<string>
  executeTask(taskId: string): Promise<string>
  getTaskStatus(taskId: string): Promise<TaskStatus>
  cancelTask(taskId: string): Promise<void>
}
```

---

## 数据模型

### AssetMetadata
```typescript
interface AssetMetadata {
  id: string
  scope: 'global' | 'project'
  type: AssetType
  filePath: string              // 物理路径
  uri?: string                  // asset:// URI
  projectId?: string            // 项目作用域时必需
  tags: string[]
  createdAt: string             // ISO 8601
  modifiedAt: string
  customFields?: Record<string, unknown>
}
```

### WorkflowDefinition
```typescript
interface WorkflowDefinition {
  id: string
  name: string
  type: string                  // 唯一类型标识符
  steps: WorkflowStep[]
  version?: string
}
```

---

## IPC通信协议

### 主进程处理器
```typescript
// 项目操作
ipcMain.handle('project:create', (_, name) => projectManager.createProject(name))
ipcMain.handle('project:load', (_, id) => projectManager.loadProject(id))

// 资产操作
ipcMain.handle('asset:list', (_, filter) => assetManager.searchAssets(filter))
ipcMain.handle('asset:upload', (_, data) => assetManager.addAsset(data))
```

### 渲染进程API
```typescript
const api = {
  project: {
    create: (name: string) => ipcRenderer.invoke('project:create', name),
    load: (id: string) => ipcRenderer.invoke('project:load', id)
  },
  asset: {
    list: (filter: AssetFilter) => ipcRenderer.invoke('asset:list', filter),
    upload: (data: AssetData) => ipcRenderer.invoke('asset:upload', data)
  }
}
```

**通道分类**: 见 `src/main/ipc/channels.ts` 共61个IPC通道。

---

## 错误处理

### 错误分类
- 文件系统错误
- 网络连接错误
- 工作流执行错误
- 配置验证错误

### 错误处理器
```typescript
interface ServiceError {
  code: ErrorCode          // 37个错误码之一
  message: string
  service: string
  operation: string
  timestamp: Date
}
```

---

## 构建配置

### 三个Webpack配置
- `webpack.main.config.js`: 主进程（target: electron-main）
- `webpack.renderer.config.js`: 渲染进程（target: electron-renderer，开发服务器）
- `webpack.preload.config.js`: 预加载脚本（target: electron-preload）

所有配置都使用 `ts-loader` 进行TypeScript编译。

---

**English Version**: `docs/en/02-technical-blueprint-v1.1.0.md`

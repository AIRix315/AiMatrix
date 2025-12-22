# 技术蓝图 v1.0.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-22 | 初始版本 | 创建技术蓝图文档，包含开发环境配置、核心模块实现、数据模型设计、IPC通信协议、错误处理机制和测试策略 |

## 全局要求

**重要提醒：本文档遵循全局时间处理要求，任何涉及时间的操作必须先查询系统时间或使用MCP服务确认后方可执行。详细规范请参考 [00-global-requirements-v1.0.0.md](00-global-requirements-v1.0.0.md)**

## 开发环境配置

### 系统要求
- Node.js 18.0+
- npm 9.0+
- Git 2.30+

### 开发工具链
- TypeScript 5.0+
- Electron 25.0+
- React 18.0+
- Webpack 5.0+

## 项目初始化

### 依赖安装
```json
{
  "dependencies": {
    "electron": "^25.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/node": "^18.0.0",
    "webpack": "^5.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### 构建配置
- 开发环境：webpack-dev-server + electron
- 生产环境：webpack打包 + electron-builder
- 代码分割：主进程与渲染进程分离打包

## 核心模块实现

### 文件系统管理器
```typescript
interface FileManager {
  createProject(name: string): Promise<string>
  loadProject(path: string): Promise<ProjectConfig>
  saveProject(config: ProjectConfig): Promise<void>
  watchProject(path: string, callback: FileChangeCallback): void
}
```

### 工作流适配器
```typescript
interface WorkflowAdapter {
  execute(config: WorkflowConfig): Promise<WorkflowResult>
  getStatus(jobId: string): Promise<JobStatus>
  cancel(jobId: string): Promise<void>
}

class ComfyUIAdapter implements WorkflowAdapter {
  private apiEndpoint: string
  constructor(endpoint: string) {
    this.apiEndpoint = endpoint
  }
}
```

### MCP服务管理
```typescript
interface MCPService {
  connect(config: MCPConfig): Promise<void>
  disconnect(): Promise<void>
  call(method: string, params: any): Promise<any>
}
```

## 数据模型设计

### 项目配置
```typescript
interface ProjectConfig {
  name: string
  path: string
  createdAt: Date
  updatedAt: Date
  settings: ProjectSettings
  workflows: WorkflowConfig[]
  assets: AssetConfig[]
}

interface ProjectSettings {
  defaultWorkflow: string
  outputFormat: string
  quality: number
}
```

### 工作流配置
```typescript
interface WorkflowConfig {
  id: string
  name: string
  type: 'comfyui' | 'n8n' | 'mcp'
  config: Record<string, any>
  inputs: WorkflowInput[]
  outputs: WorkflowOutput[]
}
```

### 资产配置
```typescript
interface AssetConfig {
  id: string
  name: string
  type: 'text' | 'image' | 'video'
  path: string
  metadata: Record<string, any>
  createdAt: Date
}
```

## IPC通信协议

### 主进程API
```typescript
// 文件操作
ipcMain.handle('project:create', (_, name) => fileManager.createProject(name))
ipcMain.handle('project:load', (_, path) => fileManager.loadProject(path))
ipcMain.handle('project:save', (_, config) => fileManager.saveProject(config))

// 工作流操作
ipcMain.handle('workflow:execute', (_, config) => workflowManager.execute(config))
ipcMain.handle('workflow:status', (_, jobId) => workflowManager.getStatus(jobId))
```

### 渲染进程调用
```typescript
const api = {
  project: {
    create: (name: string) => ipcRenderer.invoke('project:create', name),
    load: (path: string) => ipcRenderer.invoke('project:load', path),
    save: (config: ProjectConfig) => ipcRenderer.invoke('project:save', config)
  },
  workflow: {
    execute: (config: WorkflowConfig) => ipcRenderer.invoke('workflow:execute', config),
    status: (jobId: string) => ipcRenderer.invoke('workflow:status', jobId)
  }
}
```

## 错误处理机制

### 错误分类
- 文件系统错误
- 网络连接错误
- 工作流执行错误
- 配置验证错误

### 错误处理策略
- 统一错误格式
- 错误日志记录
- 用户友好提示
- 自动重试机制

## 测试策略

### 单元测试
- 核心模块功能测试
- 工具函数测试
- 数据模型验证

### 集成测试
- IPC通信测试
- 文件操作测试
- 工作流执行测试

### 端到端测试
- 完整用户流程测试
- 跨平台兼容性测试
- 性能基准测试

## 部署配置

### 打包配置
```json
{
  "build": {
    "appId": "com.matrix.ai-workflow",
    "productName": "Matrix AI Workflow",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

### 自动更新
- 使用electron-updater
- 增量更新支持
- 回滚机制
- 更新通知策略
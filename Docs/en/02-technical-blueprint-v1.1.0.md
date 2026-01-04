# Technical Blueprint v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Major | Updated tech stack (Electron 39+, Vitest), removed Redux, added Electron import standards |
| 1.0.0 | 2025-12-22 | Initial | Created technical blueprint |

**Time Handling Requirement**: See [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## Code Standards

### Electron Module Import ⚠️ MANDATORY

```typescript
// ✅ Correct - Named imports
import { app, BrowserWindow, ipcMain } from 'electron';
import { useState, useEffect } from 'react';

// ❌ Wrong - Default import
import electron from 'electron';
```

**Enforcement**: ESLint rule `no-restricted-imports`

### TypeScript
- Strict mode: `"strict": true`
- All code must pass type checking
- Avoid `any` type (ESLint warning level)

### Testing
- Framework: **Vitest** (NOT Jest)
- Mock Electron modules (see `tests/utils/setup.ts`)
- File naming: `*.test.ts` or `*.spec.ts`
- Directories:
  - `tests/unit/`: Service and utility tests
  - `tests/integration/`: Service interaction and IPC tests
- Timeout: 10s (configurable in vitest.config.ts)

---

## Development Environment

### System Requirements
- Node.js 20+
- npm 9+
- Git 2.30+

### Tech Stack
- Electron 39+
- React 18+
- TypeScript 5+
- Webpack 5+
- Vitest (testing)

---

## Core Module Interfaces

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

## Data Models

### AssetMetadata
```typescript
interface AssetMetadata {
  id: string
  scope: 'global' | 'project'
  type: AssetType
  filePath: string              // Physical path
  uri?: string                  // asset:// URI
  projectId?: string            // For project scope
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
  type: string                  // Unique type identifier
  steps: WorkflowStep[]
  version?: string
}
```

---

## IPC Communication Protocol

### Main Process Handlers
```typescript
// Project operations
ipcMain.handle('project:create', (_, name) => projectManager.createProject(name))
ipcMain.handle('project:load', (_, id) => projectManager.loadProject(id))

// Asset operations
ipcMain.handle('asset:list', (_, filter) => assetManager.searchAssets(filter))
ipcMain.handle('asset:upload', (_, data) => assetManager.addAsset(data))
```

### Renderer Process API
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

**Channel Categories**: See `src/main/ipc/channels.ts` for 61 IPC channels.

---

## Error Handling

### Error Classification
- File system errors
- Network errors
- Workflow execution errors
- Configuration validation errors

### Error Handler
```typescript
interface ServiceError {
  code: ErrorCode          // 1 of 37 error codes
  message: string
  service: string
  operation: string
  timestamp: Date
}
```

---

## Build Configuration

### Three Webpack Configs
- `webpack.main.config.js`: Main process (target: electron-main)
- `webpack.renderer.config.js`: Renderer (target: electron-renderer, dev server)
- `webpack.preload.config.js`: Preload (target: electron-preload)

All use `ts-loader` for TypeScript compilation.

---

**中文版本**: `docs/02-technical-blueprint-v1.1.0.md`

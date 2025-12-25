# Matrix Studio - 资产库视图实施计划 (Phase 4 [E01])

**版本**: v2.0
**创建时间**: 2025-12-25
**目标版本**: v0.3.0
**预计工期**: 5-7个工作日

---

## 一、项目背景

### 当前状态
- **版本**: v0.2.0 (核心服务MVP完成)
- **完成度**: 约90% (核心服务完整，UI待完善)
- **阻塞任务**: Phase 4 [E01] 资产库视图 (20%完成度)

### 核心目标
实现**通用的文件管理和资产浏览系统**，为Matrix Studio提供统一的资产管理能力，支持：
- 任意文件类型（图片/视频/音频/文本/JSON等）
- 全局和项目双作用域
- 实时文件监听和自动刷新
- 标准化元数据管理
- 插件自定义扩展

### 参考项目
已完成对 `E:\Projects\ai-playlet-master` 的深入调研，关键借鉴：
- **FileSystemService**: 统一路径管理和文件操作
- **标准化目录结构**: 按项目ID分层，资源类型独立文件夹
- **状态追踪**: none/generating/success/failed 四态管理
- **级联删除**: 自动清理关联文件
- **Sidecar元数据**: .json伴生文件存储元数据

### 设计原则 ⭐
1. **项目资产为主**: UI左侧栏位核心显示项目相关资产（多样类型） - ai-playlet不存在的部分
2. **全局资产复用**: 用于跨项目复用，节省反复生成成本 - 仅需按类别分类+时间排序
3. **JSON索引汇总**: 项目级别索引（如"A项目63张图片，编号..."）- 高效且易于操作
4. **分批按需加载**: 即使4K显示器也只加载可见区域（最多10x10=100个）
5. **作用域安全**: 启动时已设定资源路径文件夹，以项目划分子文件夹

---

## 二、技术方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        渲染进程                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Assets Page (资产库页面)                              │ │
│  │  ┌─────────────┬──────────────────────────────────┐   │ │
│  │  │ 左侧栏位    │  主内容区域                       │   │ │
│  │  │ (分类导航)  │                                  │   │ │
│  │  │             │  ┌─ TabBar (全局/项目切换) ─┐   │   │ │
│  │  │ □ Scenes    │  │ [搜索框] [导入] [刷新]  │   │   │ │
│  │  │ □ Characters│  └────────────────────────┘   │   │ │
│  │  │ □ Videos    │                                  │   │ │
│  │  │ □ Audio     │  ┌─ AssetGrid (虚拟滚动) ─┐   │   │ │
│  │  │ □ Images    │  │ [卡片] [卡片] [卡片]   │   │   │ │
│  │  │ □ Text      │  │ [卡片] [卡片] [卡片]   │   │   │ │
│  │  │ □ Other     │  │ (分页: 第1页/共10页)  │   │   │ │
│  │  └─────────────┴  └────────────────────────┘   │   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                        主进程                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AssetManager (资产管理器)                             │ │
│  │  - scanAssets(): 扫描资产并生成JSON索引               │ │
│  │  - getAssetIndex(): 读取JSON索引（快速）              │ │
│  │  - import(): 导入资产                                  │ │
│  │  - delete(): 删除资产 (级联)                           │ │
│  │  - getMetadata(): 读取元数据                           │ │
│  │  - updateMetadata(): 更新元数据                        │ │
│  │  - watchChanges(): 文件监听 (chokidar)                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FileSystemService (文件系统服务)                      │ │
│  │  - getAssetDir(projectId, type): 获取资产目录         │ │
│  │  - copyFile(), moveFile(), deleteFile()               │ │
│  │  - saveJSON(), readJSON()                             │ │
│  │  - normalizePath(): 路径标准化                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     文件系统                                 │
│  - 全局资产库: {dataDir}/assets/                           │
│    ├── images/ (按时间排序)                                │
│    ├── videos/                                             │
│    ├── audio/                                              │
│    └── index.json (全局索引: 统计数量、类别列表)          │
│                                                             │
│  - 项目资产库: {dataDir}/projects/{projectId}/assets/      │
│    ├── scenes/                                             │
│    │   ├── scene-001.png                                   │
│    │   └── scene-001.png.meta.json (Sidecar)              │
│    ├── characters/                                         │
│    ├── videos/                                             │
│    ├── audio/                                              │
│    ├── images/                                             │
│    ├── text/                                               │
│    ├── other/                                              │
│    └── index.json (项目索引: "A项目63张图片，编号...")    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构标准

```
{dataDir}/
├── assets/                          # 全局资产库
│   ├── images/
│   │   ├── bg-001.png
│   │   ├── bg-001.png.meta.json    # Sidecar元数据
│   │   └── ...
│   ├── videos/
│   ├── audio/
│   └── index.json                   # 全局索引汇总
│
└── projects/
    └── project-{uuid}/
        ├── project.json             # 项目元数据
        └── assets/                  # 项目资产库
            ├── scenes/              # 场景（小说插件特定）
            │   ├── scene-001.png
            │   └── scene-001.png.meta.json
            ├── characters/          # 角色（小说插件特定）
            ├── storyboards/         # 分镜（小说插件特定）
            ├── videos/              # 通用视频
            ├── audio/               # 通用音频
            ├── images/              # 通用图片
            ├── text/                # 通用文本
            ├── other/               # 其他文件
            └── index.json           # 项目资产索引汇总
```

### 2.3 JSON索引文件格式

#### 全局索引 (assets/index.json)

```json
{
  "version": "1.0",
  "lastUpdated": "2025-12-25T10:30:00Z",
  "statistics": {
    "total": 156,
    "byType": {
      "image": 89,
      "video": 34,
      "audio": 21,
      "text": 8,
      "other": 4
    }
  },
  "categories": [
    {
      "name": "images",
      "count": 89,
      "lastModified": "2025-12-24T15:20:00Z"
    },
    {
      "name": "videos",
      "count": 34,
      "lastModified": "2025-12-25T09:15:00Z"
    }
  ],
  "assets": []  // 不存储详细列表，按需加载
}
```

#### 项目索引 (projects/{id}/assets/index.json)

```json
{
  "projectId": "project-123",
  "projectName": "小说项目A",
  "version": "1.0",
  "lastUpdated": "2025-12-25T10:30:00Z",
  "statistics": {
    "total": 63,
    "byCategory": {
      "scenes": 25,
      "characters": 12,
      "storyboards": 18,
      "audio": 8
    },
    "byType": {
      "image": 55,
      "audio": 8
    }
  },
  "categories": [
    {
      "name": "scenes",
      "type": "image",
      "count": 25,
      "items": [
        "scene-001.png",
        "scene-002.png",
        "..."
      ]
    },
    {
      "name": "characters",
      "type": "image",
      "count": 12,
      "items": [
        "char-主角.png",
        "char-反派.png",
        "..."
      ]
    }
  ]
}
```

### 2.4 数据模型

#### AssetMetadata (标准Schema)

```typescript
// src/shared/types/asset.ts

/**
 * 资产元数据标准Schema
 * 平台预定义字段 + 插件可扩展字段
 */
export interface AssetMetadata {
  // === 核心字段 (必需) ===
  id: string                        // 资产唯一ID (UUID)
  name: string                      // 文件名 (含扩展名)
  filePath: string                  // 完整文件路径
  type: AssetType                   // 资产类型
  category?: string                 // 自定义分类 (scenes/characters/etc)
  scope: 'global' | 'project'       // 作用域

  // === 时间字段 ===
  createdAt: string                 // 创建时间 (ISO 8601)
  modifiedAt: string                // 修改时间 (ISO 8601)
  importedAt?: string               // 导入时间 (如果是导入的)

  // === 文件信息 ===
  size: number                      // 文件大小 (bytes)
  mimeType: string                  // MIME类型
  extension: string                 // 文件扩展名

  // === 项目关联 ===
  projectId?: string                // 所属项目ID (scope=project时必需)

  // === 组织字段 ===
  tags: string[]                    // 标签数组
  description?: string              // 描述

  // === AI生成相关 (可选) ===
  status?: ResourceStatus           // 生成状态 (none/generating/success/failed)
  prompt?: string                   // AI生成提示词
  error?: string                    // 错误信息
  sourceId?: string                 // 复用来源ID

  // === 媒体特定字段 (可选) ===
  width?: number                    // 图片/视频宽度
  height?: number                   // 图片/视频高度
  duration?: number                 // 视频/音频时长 (秒)
  aspectRatio?: AspectRatio         // 宽高比 (3:4, 4:3, 16:9, 9:16)
  thumbnailPath?: string            // 缩略图路径

  // === 插件扩展字段 ===
  customFields?: Record<string, any>  // 插件自定义字段 (JSON)
}

/**
 * 资产类型枚举
 */
export type AssetType =
  | 'image'      // 图片: .png, .jpg, .jpeg, .gif, .webp, .bmp
  | 'video'      // 视频: .mp4, .mov, .avi, .mkv, .webm
  | 'audio'      // 音频: .mp3, .wav, .aac, .m4a, .ogg
  | 'text'       // 文本: .txt, .md, .json, .xml, .csv
  | 'other'      // 其他未分类文件

/**
 * 宽高比枚举（卡片设计支持）
 */
export type AspectRatio = '3:4' | '4:3' | '16:9' | '9:16' | 'custom'

/**
 * 资源生成状态
 */
export type ResourceStatus = 'none' | 'generating' | 'success' | 'failed'

/**
 * 资产查询过滤器
 */
export interface AssetFilter {
  scope?: 'global' | 'project' | 'all'
  projectId?: string
  category?: string | string[]      // 支持自定义分类过滤
  type?: AssetType | AssetType[]
  tags?: string[]
  status?: ResourceStatus
  search?: string                   // 搜索关键词 (匹配name/tags/description)
  sortBy?: 'name' | 'createdAt' | 'modifiedAt' | 'size'
  sortOrder?: 'asc' | 'desc'
  page?: number                     // 分页页码（从1开始）
  pageSize?: number                 // 每页数量（默认100）
}

/**
 * 资产扫描结果（分页）
 */
export interface AssetScanResult {
  total: number
  page: number
  pageSize: number
  totalPages: number
  assets: AssetMetadata[]
  errors?: Array<{
    path: string
    error: string
  }>
}

/**
 * 资产索引信息
 */
export interface AssetIndex {
  projectId?: string
  version: string
  lastUpdated: string
  statistics: {
    total: number
    byType: Record<AssetType, number>
    byCategory?: Record<string, number>
  }
  categories: Array<{
    name: string
    type?: AssetType
    count: number
    lastModified?: string
    items?: string[]  // 文件名列表（项目索引才有）
  }>
}
```

---

## 三、实施计划

### 3.1 Phase 1: 基础服务层 (2天)

#### 任务 1.1: 创建 FileSystemService

**文件**: `src/main/services/FileSystemService.ts`

**参考**: `ai-playlet-master/src/main/services/FileSystemService.ts`

**功能**:
```typescript
export class FileSystemService {
  private dataDir: string

  // 初始化 (启动时设定作用域路径)
  async initialize(customDataDirectory?: string): Promise<void>

  // 路径管理
  getDataDir(): string
  getGlobalAssetDir(type?: AssetType): string
  getProjectAssetDir(projectId: string, category?: string): string
  getAssetMetadataPath(filePath: string): string
  getAssetIndexPath(projectId?: string): string
  normalizePath(path: string): string

  // 文件操作
  async copyFile(sourcePath: string, targetPath: string): Promise<void>
  async moveFile(sourcePath: string, targetPath: string): Promise<void>
  async deleteFile(filePath: string): Promise<void>
  async deleteDir(dirPath: string): Promise<void>
  async exists(path: string): Promise<boolean>
  async ensureDir(dirPath: string): Promise<void>

  // JSON操作
  async saveJSON<T>(filePath: string, data: T): Promise<void>
  async readJSON<T>(filePath: string): Promise<T | null>

  // 文件信息
  async getFileInfo(filePath: string): Promise<{
    size: number
    mimeType: string
    extension: string
    createdAt: string
    modifiedAt: string
  }>
}
```

**实现要点**:
- 使用 `app.getPath('userData')` 作为默认数据目录
- 自动创建必要的目录结构（包括自定义分类目录）
- 路径标准化处理 (统一斜杠、解析相对路径)
- 错误处理和日志记录 (集成Logger)
- 使用 `mime-types` 库识别MIME类型

#### 任务 1.2: 完善 AssetManager（重点：JSON索引）

**文件**: `src/main/services/AssetManager.ts` (已存在，需重构)

**新增功能**:
```typescript
export class AssetManager {
  private fsService: FileSystemService
  private logger: Logger
  private watchers: Map<string, FSWatcher>  // chokidar watchers
  private indexCache: Map<string, AssetIndex>  // 索引缓存

  // 初始化
  async initialize(): Promise<void>

  // === 索引管理（核心） ===
  async buildIndex(projectId?: string): Promise<AssetIndex>
  async getIndex(projectId?: string): Promise<AssetIndex>
  async updateIndex(projectId?: string): Promise<void>

  // === 扫描和查询（分页） ===
  async scanAssets(filter: AssetFilter): Promise<AssetScanResult>
  private async scanDirectory(
    dirPath: string,
    scope: 'global' | 'project',
    projectId?: string,
    category?: string
  ): Promise<AssetMetadata[]>

  // === 导入资产 ===
  async importAsset(params: {
    sourcePath: string
    scope: 'global' | 'project'
    projectId?: string
    category?: string        // scenes/characters/images等
    type?: AssetType         // 可选，自动检测
    tags?: string[]
    metadata?: Partial<AssetMetadata>
  }): Promise<AssetMetadata>

  // === 元数据管理 ===
  async getMetadata(filePath: string): Promise<AssetMetadata | null>
  async updateMetadata(
    filePath: string,
    updates: Partial<AssetMetadata>
  ): Promise<AssetMetadata>
  private async createDefaultMetadata(
    filePath: string,
    scope: 'global' | 'project',
    projectId?: string,
    category?: string
  ): Promise<AssetMetadata>

  // === 删除资产 (级联删除) ===
  async deleteAsset(filePath: string, deleteMetadata = true): Promise<void>

  // === 文件监听 ===
  async startWatching(projectId?: string): Promise<void>
  async stopWatching(projectId?: string): Promise<void>
  private handleFileChange(
    eventType: 'add' | 'change' | 'unlink',
    filePath: string,
    projectId?: string
  ): void

  // === 辅助方法 ===
  private detectAssetType(filePath: string): AssetType
  private detectAspectRatio(width: number, height: number): AspectRatio
  private shouldIgnoreFile(filePath: string): boolean
  private async generateThumbnail(
    filePath: string,
    type: AssetType,
    targetRatio?: AspectRatio
  ): Promise<string | undefined>
}
```

**实现要点**:

1. **JSON索引构建**:
   ```typescript
   async buildIndex(projectId?: string): Promise<AssetIndex> {
     const indexPath = this.fsService.getAssetIndexPath(projectId)
     const baseDir = projectId
       ? this.fsService.getProjectAssetDir(projectId)
       : this.fsService.getGlobalAssetDir()

     const index: AssetIndex = {
       projectId,
       version: '1.0',
       lastUpdated: new Date().toISOString(),
       statistics: { total: 0, byType: {}, byCategory: {} },
       categories: []
     }

     // 扫描所有子目录（scenes, characters, images等）
     const categories = await fs.readdir(baseDir)
     for (const category of categories) {
       const categoryPath = path.join(baseDir, category)
       const files = await this.scanDirectory(categoryPath, ...)

       index.categories.push({
         name: category,
         count: files.length,
         items: projectId ? files.map(f => f.name) : undefined
       })

       index.statistics.total += files.length
     }

     // 保存索引
     await this.fsService.saveJSON(indexPath, index)
     this.indexCache.set(projectId || 'global', index)

     return index
   }
   ```

2. **分页查询**:
   ```typescript
   async scanAssets(filter: AssetFilter): Promise<AssetScanResult> {
     // 1. 读取索引（快速）
     const index = await this.getIndex(filter.projectId)

     // 2. 根据filter筛选分类
     let targetCategories = index.categories
     if (filter.category) {
       targetCategories = targetCategories.filter(c =>
         filter.category.includes(c.name)
       )
     }

     // 3. 按需加载资产详情（仅加载当前页）
     const page = filter.page || 1
     const pageSize = filter.pageSize || 100
     const startIndex = (page - 1) * pageSize

     const assets: AssetMetadata[] = []
     let loaded = 0

     for (const category of targetCategories) {
       if (loaded >= startIndex + pageSize) break

       // 仅加载需要的文件元数据
       const items = category.items || []
       for (const fileName of items) {
         if (loaded < startIndex) {
           loaded++
           continue
         }
         if (loaded >= startIndex + pageSize) break

         const filePath = path.join(baseDir, category.name, fileName)
         const metadata = await this.getMetadata(filePath)
         if (metadata) assets.push(metadata)
         loaded++
       }
     }

     return {
       total: index.statistics.total,
       page,
       pageSize,
       totalPages: Math.ceil(index.statistics.total / pageSize),
       assets
     }
   }
   ```

3. **文件监听自动更新索引**:
   ```typescript
   private handleFileChange(
     eventType: string,
     filePath: string,
     projectId?: string
   ) {
     // 1. 更新索引
     this.updateIndex(projectId)

     // 2. 通知渲染进程
     BrowserWindow.getAllWindows().forEach(window => {
       window.webContents.send('asset:file-changed', {
         eventType,
         filePath,
         projectId
       })
     })
   }
   ```

4. **宽高比检测**:
   ```typescript
   private detectAspectRatio(width: number, height: number): AspectRatio {
     const ratio = width / height
     if (Math.abs(ratio - 0.75) < 0.01) return '3:4'
     if (Math.abs(ratio - 1.33) < 0.01) return '4:3'
     if (Math.abs(ratio - 1.78) < 0.01) return '16:9'
     if (Math.abs(ratio - 0.56) < 0.01) return '9:16'
     return 'custom'
   }
   ```

#### 任务 1.3: 定义共享类型

**文件**: `src/shared/types/asset.ts` (新建)

**内容**: 见 2.4 数据模型章节的完整定义

#### 任务 1.4: IPC处理器

**文件**: `src/main/ipc/handlers/asset.ts` (需完善)

**IPC通道**:
```typescript
// === 索引管理 ===
ipcMain.handle('asset:get-index', async (_event, projectId?: string) => {
  return await assetManager.getIndex(projectId)
})

ipcMain.handle('asset:rebuild-index', async (_event, projectId?: string) => {
  return await assetManager.buildIndex(projectId)
})

// === 扫描资产（分页） ===
ipcMain.handle('asset:scan', async (_event, filter: AssetFilter) => {
  return await assetManager.scanAssets(filter)
})

// === 导入资产 ===
ipcMain.handle('asset:import', async (_event, params) => {
  return await assetManager.importAsset(params)
})

// === 删除资产 ===
ipcMain.handle('asset:delete', async (_event, filePath: string) => {
  await assetManager.deleteAsset(filePath)
  return { success: true }
})

// === 元数据管理 ===
ipcMain.handle('asset:get-metadata', async (_event, filePath: string) => {
  return await assetManager.getMetadata(filePath)
})

ipcMain.handle('asset:update-metadata', async (
  _event,
  filePath: string,
  updates: Partial<AssetMetadata>
) => {
  return await assetManager.updateMetadata(filePath, updates)
})

// === 文件监听 ===
ipcMain.handle('asset:start-watching', async (_event, projectId?: string) => {
  await assetManager.startWatching(projectId)
  return { success: true }
})

ipcMain.handle('asset:stop-watching', async (_event, projectId?: string) => {
  await assetManager.stopWatching(projectId)
  return { success: true }
})

// === 打开文件选择对话框 ===
ipcMain.handle('asset:show-import-dialog', async (_event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '所有文件', extensions: ['*'] },
      { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      { name: '视频', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: '音频', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg'] },
      { name: '文本', extensions: ['txt', 'md', 'json', 'xml', 'csv'] }
    ]
  })
  return result.filePaths
})
```

**更新预加载脚本** (`src/preload/index.ts`):
```typescript
const api = {
  // ... 现有API

  // === 资产索引 ===
  getAssetIndex: (projectId?: string) =>
    ipcRenderer.invoke('asset:get-index', projectId),

  rebuildAssetIndex: (projectId?: string) =>
    ipcRenderer.invoke('asset:rebuild-index', projectId),

  // === 资产管理 ===
  scanAssets: (filter: AssetFilter) =>
    ipcRenderer.invoke('asset:scan', filter),

  importAsset: (params: any) =>
    ipcRenderer.invoke('asset:import', params),

  deleteAsset: (filePath: string) =>
    ipcRenderer.invoke('asset:delete', filePath),

  getAssetMetadata: (filePath: string) =>
    ipcRenderer.invoke('asset:get-metadata', filePath),

  updateAssetMetadata: (filePath: string, updates: Partial<AssetMetadata>) =>
    ipcRenderer.invoke('asset:update-metadata', filePath, updates),

  startAssetWatching: (projectId?: string) =>
    ipcRenderer.invoke('asset:start-watching', projectId),

  stopAssetWatching: (projectId?: string) =>
    ipcRenderer.invoke('asset:stop-watching', projectId),

  showImportDialog: () =>
    ipcRenderer.invoke('asset:show-import-dialog'),

  // === 监听文件变动 ===
  onAssetFileChanged: (callback: (event: {
    eventType: 'add' | 'change' | 'unlink'
    filePath: string
    projectId?: string
  }) => void) => {
    ipcRenderer.on('asset:file-changed', (_event, data) => callback(data))
  }
}
```

---

### 3.2 Phase 2: 前端UI实现 (2-3天)

#### 任务 2.1: 左侧栏位分类导航组件

**文件**: `src/renderer/components/AssetSidebar/AssetSidebar.tsx` (新建)

**参考**: `docs/references/UI/matrix/src/renderer/views/assets.html`

**功能**:
- 显示资产分类列表（基于项目索引）
- 支持选中状态
- 显示每个分类的资产数量
- 动态加载分类（插件可扩展）

**实现**:
```tsx
import React, { useEffect, useState } from 'react'
import { AssetIndex } from '@/shared/types/asset'
import './AssetSidebar.css'

interface AssetSidebarProps {
  projectId?: string
  selectedCategory?: string
  onCategorySelect: (category: string) => void
}

export function AssetSidebar({
  projectId,
  selectedCategory,
  onCategorySelect
}: AssetSidebarProps) {
  const [index, setIndex] = useState<AssetIndex | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载资产索引
  useEffect(() => {
    loadIndex()
  }, [projectId])

  const loadIndex = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getAssetIndex(projectId)
      setIndex(data)
    } catch (error) {
      console.error('加载索引失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !index) {
    return <div className="asset-sidebar loading">加载中...</div>
  }

  return (
    <div className="asset-sidebar">
      <div className="sidebar-header">
        <h3>分类</h3>
        <span className="total-count">{index.statistics.total} 个资产</span>
      </div>

      <div className="category-list">
        {index.categories.map(category => (
          <div
            key={category.name}
            className={`category-item ${selectedCategory === category.name ? 'active' : ''}`}
            onClick={() => onCategorySelect(category.name)}
          >
            <span className="category-name">{category.name}</span>
            <span className="category-count">{category.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**样式**: `src/renderer/components/AssetSidebar/AssetSidebar.css`

```css
.asset-sidebar {
  width: 200px;
  border-right: 1px solid var(--border-primary);
  padding-right: 20px;
  height: 100%;
  overflow-y: auto;
}

.sidebar-header {
  padding: 10px 0;
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: 10px;
}

.sidebar-header h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 5px 0;
}

.total-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.category-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.category-item.active {
  background: var(--accent-primary);
  color: #000;
  font-weight: 500;
}

.category-name {
  flex: 1;
  font-size: 13px;
}

.category-count {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.category-item.active .category-count {
  background: rgba(0, 0, 0, 0.2);
}
```

#### 任务 2.2: 资产卡片组件（支持4种比例）

**文件**: `src/renderer/components/AssetCard/AssetCard.tsx` (新建)

**功能**:
- 显示缩略图或文件类型图标
- 支持4种宽高比 (3:4, 4:3, 16:9, 9:16)
- 显示资产名称
- 显示类型标签
- 显示状态徽章
- 元数据指示器
- 悬停效果和选中状态

**实现**:
```tsx
import React from 'react'
import { AssetMetadata, AspectRatio } from '@/shared/types/asset'
import { toLocalFileUrl } from '@/renderer/utils/file'
import './AssetCard.css'

interface AssetCardProps {
  asset: AssetMetadata
  selected?: boolean
  displayRatio?: AspectRatio  // 卡片显示比例
  onSelect?: (asset: AssetMetadata) => void
  onPreview?: (asset: AssetMetadata) => void
  onDelete?: (asset: AssetMetadata) => void
}

export function AssetCard({
  asset,
  selected,
  displayRatio = '16:9',  // 默认16:9
  onSelect,
  onPreview,
  onDelete
}: AssetCardProps) {
  const handleClick = () => {
    onSelect?.(asset)
  }

  const handleDoubleClick = () => {
    onPreview?.(asset)
  }

  // 根据宽高比设置卡片样式类
  const ratioClass = `ratio-${displayRatio.replace(':', '-')}`

  const renderThumbnail = () => {
    switch (asset.type) {
      case 'image':
        return (
          <img
            src={toLocalFileUrl(asset.thumbnailPath || asset.filePath)}
            alt={asset.name}
            className="asset-thumbnail"
          />
        )
      case 'video':
        return (
          <div className="asset-icon video-icon">
            <i className="icon-video"></i>
          </div>
        )
      case 'audio':
        return (
          <div className="asset-icon audio-icon">
            <i className="icon-audio"></i>
          </div>
        )
      case 'text':
        return (
          <div className="asset-icon text-icon">
            <i className="icon-file-text"></i>
          </div>
        )
      default:
        return (
          <div className="asset-icon other-icon">
            <i className="icon-file"></i>
          </div>
        )
    }
  }

  return (
    <div
      className={`asset-card ${ratioClass} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="asset-card-thumbnail">
        {renderThumbnail()}

        {/* 状态徽章 */}
        {asset.status && asset.status !== 'none' && (
          <div className={`status-badge status-${asset.status}`}>
            {asset.status === 'generating' && '生成中'}
            {asset.status === 'success' && '✓'}
            {asset.status === 'failed' && '✗'}
          </div>
        )}

        {/* 元数据指示器 */}
        {asset.prompt && (
          <div className="metadata-indicator" title="包含AI元数据">
            <i className="icon-info"></i>
          </div>
        )}
      </div>

      <div className="asset-card-info">
        <div className="asset-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-meta">
          <span className={`type-tag type-${asset.type}`}>
            {asset.type}
          </span>
          {asset.tags.length > 0 && (
            <span className="tags">
              {asset.tags.slice(0, 2).join(', ')}
              {asset.tags.length > 2 && '...'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

**样式**: `src/renderer/components/AssetCard/AssetCard.css`

```css
.asset-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.asset-card:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.asset-card.selected {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary-alpha);
}

/* === 宽高比支持 === */
.asset-card-thumbnail {
  position: relative;
  width: 100%;
  background: var(--bg-tertiary);
  overflow: hidden;
}

/* 16:9 (默认) */
.asset-card.ratio-16-9 .asset-card-thumbnail {
  aspect-ratio: 16 / 9;
}

/* 9:16 (竖版视频) */
.asset-card.ratio-9-16 .asset-card-thumbnail {
  aspect-ratio: 9 / 16;
}

/* 4:3 (传统) */
.asset-card.ratio-4-3 .asset-card-thumbnail {
  aspect-ratio: 4 / 3;
}

/* 3:4 (竖版海报) */
.asset-card.ratio-3-4 .asset-card-thumbnail {
  aspect-ratio: 3 / 4;
}

.asset-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: var(--text-tertiary);
}

.status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-generating {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.status-success {
  background: var(--success-bg);
  color: var(--success-text);
}

.status-failed {
  background: var(--error-bg);
  color: var(--error-text);
}

.metadata-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
}

.asset-card-info {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asset-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.type-tag {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.type-image { background: #4caf50; color: white; }
.type-video { background: #2196f3; color: white; }
.type-audio { background: #ff9800; color: white; }
.type-text { background: #9c27b0; color: white; }
.type-other { background: #607d8b; color: white; }

.tags {
  color: var(--text-secondary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

#### 任务 2.3: 资产网格组件 (虚拟滚动)

**文件**: `src/renderer/components/AssetGrid/AssetGrid.tsx` (新建)

**技术选型**: 使用 `react-window` 实现虚拟滚动

**安装依赖**:
```bash
npm install react-window
npm install --save-dev @types/react-window
```

**实现**:
```tsx
import React, { useEffect, useState, useRef } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { AssetMetadata, AspectRatio } from '@/shared/types/asset'
import { AssetCard } from '../AssetCard/AssetCard'
import './AssetGrid.css'

interface AssetGridProps {
  assets: AssetMetadata[]
  selectedAssetId?: string
  displayRatio?: AspectRatio
  onAssetSelect?: (asset: AssetMetadata) => void
  onAssetPreview?: (asset: AssetMetadata) => void
  onAssetDelete?: (asset: AssetMetadata) => void
}

export function AssetGrid({
  assets,
  selectedAssetId,
  displayRatio = '16:9',
  onAssetSelect,
  onAssetPreview,
  onAssetDelete
}: AssetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // 计算网格参数
  const columnWidth = 280
  const gap = 16
  const columnCount = Math.max(1, Math.floor((containerSize.width + gap) / (columnWidth + gap)))
  const rowCount = Math.ceil(assets.length / columnCount)

  // 根据显示比例计算行高
  const getRowHeight = () => {
    const ratios: Record<AspectRatio, number> = {
      '16:9': 240,
      '9:16': 480,
      '4:3': 260,
      '3:4': 420,
      'custom': 240
    }
    return ratios[displayRatio] || 240
  }

  const rowHeight = getRowHeight()

  // 单元格渲染器
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex
    if (index >= assets.length) return null

    const asset = assets[index]

    return (
      <div style={style} className="asset-grid-cell">
        <AssetCard
          asset={asset}
          displayRatio={displayRatio}
          selected={asset.id === selectedAssetId}
          onSelect={onAssetSelect}
          onPreview={onAssetPreview}
          onDelete={onAssetDelete}
        />
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="asset-grid-empty">
        <p>暂无资产</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="asset-grid-container">
      {containerSize.width > 0 && (
        <Grid
          columnCount={columnCount}
          columnWidth={columnWidth + gap}
          height={containerSize.height}
          rowCount={rowCount}
          rowHeight={rowHeight + gap}
          width={containerSize.width}
        >
          {Cell}
        </Grid>
      )}
    </div>
  )
}
```

**样式**: `src/renderer/components/AssetGrid/AssetGrid.css`

```css
.asset-grid-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.asset-grid-cell {
  padding: 8px;
  box-sizing: border-box;
}

.asset-grid-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: 16px;
}
```

#### 任务 2.4: Assets页面重构

**文件**: `src/renderer/pages/Assets/Assets.tsx` (需重构)

**布局结构**:
```
┌─────────────────────────────────────────────────────────┐
│  [搜索框]  [比例选择器]           [刷新] [导入]         │  <- Toolbar
├──────────┬──────────────────────────────────────────────┤
│  全局    │                                              │
│  ─────   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  images  │  │ 资产1 │ │ 资产2 │ │ 资产3 │ │ 资产4 │       │
│  videos  │  └──────┘ └──────┘ └──────┘ └──────┘       │
│  audio   │                                              │
│          │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  项目    │  │ 资产5 │ │ 资产6 │ │ 资产7 │ │ 资产8 │       │
│  ─────   │  └──────┘ └──────┘ └──────┘ └──────┘       │
│  scenes  │                                              │
│  charac..│          [分页: 1 2 3 ... 10]                │
│  images  │                                              │
│  videos  │                                              │
└──────────┴──────────────────────────────────────────────┘
   侧边栏                  主内容区 (虚拟滚动网格)
```

**实现**:
```tsx
import React, { useState, useEffect, useMemo } from 'react'
import { AssetMetadata, AssetFilter, AspectRatio, AssetIndex } from '@/shared/types/asset'
import { AssetSidebar } from '@/renderer/components/AssetSidebar/AssetSidebar'
import { AssetGrid } from '@/renderer/components/AssetGrid/AssetGrid'
import { AssetPreview } from '@/renderer/components/AssetPreview/AssetPreview'
import { Button } from '@/renderer/components/Button/Button'
import { Input } from '@/renderer/components/Input/Input'
import { Loading } from '@/renderer/components/Loading/Loading'
import { useToast } from '@/renderer/hooks/useToast'
import './Assets.css'

export function Assets() {
  // 状态管理
  const [scope, setScope] = useState<'global' | 'project'>('project')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [assets, setAssets] = useState<AssetMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string>()
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string>()
  const [displayRatio, setDisplayRatio] = useState<AspectRatio>('16:9')
  const [globalIndex, setGlobalIndex] = useState<AssetIndex | null>(null)
  const [projectIndex, setProjectIndex] = useState<AssetIndex | null>(null)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 100

  const { showToast } = useToast()

  // 加载当前项目ID
  useEffect(() => {
    // TODO: 从全局状态或URL参数获取当前项目ID
    // 暂时从localStorage获取
    const projectId = localStorage.getItem('currentProjectId')
    if (projectId) {
      setCurrentProjectId(projectId)
    }
  }, [])

  // 加载索引
  const loadIndexes = async () => {
    try {
      const globalIdx = await window.electronAPI.getAssetIndex()
      setGlobalIndex(globalIdx)

      if (currentProjectId) {
        const projectIdx = await window.electronAPI.getAssetIndex(currentProjectId)
        setProjectIndex(projectIdx)

        // 默认选中第一个项目分类
        if (projectIdx.categories.length > 0 && !selectedCategory) {
          setSelectedCategory(projectIdx.categories[0].name)
        }
      }
    } catch (error) {
      showToast('加载索引失败: ' + error.message, 'error')
    }
  }

  // 初始加载索引
  useEffect(() => {
    loadIndexes()
  }, [currentProjectId])

  // 加载资产
  const loadAssets = async () => {
    setLoading(true)
    try {
      const filter: AssetFilter = {
        scope: scope,
        projectId: scope === 'project' ? currentProjectId : undefined,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        page: currentPage,
        pageSize: pageSize,
        sortBy: scope === 'global' ? 'createdAt' : 'name',
        sortOrder: scope === 'global' ? 'desc' : 'asc'
      }

      const result = await window.electronAPI.scanAssets(filter)
      setAssets(result.assets)
      setTotalPages(Math.ceil(result.total / pageSize))

      if (result.errors && result.errors.length > 0) {
        showToast(`扫描完成，但有 ${result.errors.length} 个文件失败`, 'warning')
      }
    } catch (error) {
      showToast('加载资产失败: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 作用域或分类变化时重新加载
  useEffect(() => {
    if (!selectedCategory && scope === 'project') return
    setCurrentPage(1)
    loadAssets()
  }, [scope, selectedCategory, currentProjectId])

  // 分页变化时加载
  useEffect(() => {
    loadAssets()
  }, [currentPage])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      loadAssets()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 监听文件变动
  useEffect(() => {
    window.electronAPI.onAssetFileChanged((event) => {
      // 实时更新资产列表
      if (event.eventType === 'add' && event.metadata) {
        // 重新加载索引和当前页
        loadIndexes()
        if (currentPage === 1) {
          loadAssets()
        }
        showToast(`新增资产: ${event.metadata.name}`, 'success')
      } else if (event.eventType === 'unlink') {
        setAssets(prev => prev.filter(a => a.filePath !== event.filePath))
        loadIndexes()
        showToast('资产已删除', 'info')
      } else if (event.eventType === 'change' && event.metadata) {
        setAssets(prev => prev.map(a =>
          a.filePath === event.filePath ? event.metadata : a
        ))
      }
    })

    // 启动文件监听
    window.electronAPI.startAssetWatching(
      scope === 'project' ? currentProjectId : undefined
    )

    return () => {
      // 停止文件监听
      window.electronAPI.stopAssetWatching(
        scope === 'project' ? currentProjectId : undefined
      )
    }
  }, [scope, currentProjectId])

  // 导入资产
  const handleImport = async () => {
    try {
      const filePaths = await window.electronAPI.showImportDialog()
      if (!filePaths || filePaths.length === 0) return

      setLoading(true)

      for (const sourcePath of filePaths) {
        await window.electronAPI.importAsset({
          sourcePath,
          scope,
          projectId: scope === 'project' ? currentProjectId : undefined,
          category: scope === 'project' ? selectedCategory : undefined
        })
      }

      showToast(`成功导入 ${filePaths.length} 个资产`, 'success')
      await loadIndexes()
      await loadAssets()
    } catch (error) {
      showToast('导入失败: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 删除资产
  const handleDelete = async (asset: AssetMetadata) => {
    if (!confirm(`确定要删除 "${asset.name}" 吗？`)) return

    try {
      await window.electronAPI.deleteAsset(asset.filePath)
      showToast('删除成功', 'success')
      await loadIndexes()
    } catch (error) {
      showToast('删除失败: ' + error.message, 'error')
    }
  }

  // 预览资产
  const handlePreview = (asset: AssetMetadata) => {
    setPreviewAsset(asset)
  }

  // 分页控制
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // 生成分页器
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages: (number | string)[] = []

    // 始终显示第一页
    pages.push(1)

    // 当前页附近的页码
    const start = Math.max(2, currentPage - 2)
    const end = Math.min(totalPages - 1, currentPage + 2)

    if (start > 2) pages.push('...')

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages - 1) pages.push('...')

    // 始终显示最后一页
    if (totalPages > 1) pages.push(totalPages)

    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          上一页
        </button>

        {pages.map((page, index) => (
          typeof page === 'number' ? (
            <button
              key={page}
              className={currentPage === page ? 'active' : ''}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ) : (
            <span key={`ellipsis-${index}`} className="ellipsis">
              {page}
            </span>
          )
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          下一页
        </button>
      </div>
    )
  }

  return (
    <div className="assets-page">
      <div className="assets-toolbar">
        {/* 搜索框 */}
        <Input
          placeholder="搜索资产..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        {/* 比例选择器 */}
        <select
          value={displayRatio}
          onChange={(e) => setDisplayRatio(e.target.value as AspectRatio)}
          className="ratio-selector"
        >
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
        </select>

        {/* 操作按钮 */}
        <div className="toolbar-actions">
          <Button onClick={loadAssets} variant="ghost" disabled={loading}>
            刷新
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            导入资产
          </Button>
        </div>
      </div>

      <div className="assets-content">
        {/* 左侧边栏 */}
        <AssetSidebar
          globalIndex={globalIndex}
          projectIndex={projectIndex}
          currentScope={scope}
          selectedCategory={selectedCategory}
          onScopeChange={setScope}
          onCategorySelect={(category) => {
            setSelectedCategory(category)
            setCurrentPage(1)
          }}
        />

        {/* 主内容区 */}
        <div className="assets-main">
          {loading && <Loading />}

          {!loading && assets.length === 0 && (
            <div className="empty-state">
              <p>暂无资产</p>
              <Button onClick={handleImport}>导入第一个资产</Button>
            </div>
          )}

          {!loading && assets.length > 0 && (
            <>
              <AssetGrid
                assets={assets}
                displayRatio={displayRatio}
                selectedAssetId={selectedAssetId}
                onAssetSelect={(asset) => setSelectedAssetId(asset.id)}
                onAssetPreview={handlePreview}
                onAssetDelete={handleDelete}
              />

              {renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* 预览Modal */}
      <AssetPreview
        asset={previewAsset}
        open={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
    </div>
  )
}
```

**样式**: `src/renderer/pages/Assets/Assets.css`

```css
.assets-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.assets-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.ratio-selector {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.assets-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.assets-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

.empty-state p {
  font-size: 18px;
  margin-bottom: 24px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
}

.pagination button {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.pagination button.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination .ellipsis {
  padding: 0 8px;
  color: var(--text-tertiary);
}
```

#### 任务 2.5: 预览Modal

**文件**: `src/renderer/components/AssetPreview/AssetPreview.tsx` (新建)

**功能**:
- 大图预览 (图片)
- 视频播放器 (视频)
- 音频播放器 (音频)
- 文本查看器 (文本)
- 显示完整元数据
- 编辑元数据 (tags、description等)

**实现**:
```tsx
import React, { useState, useEffect } from 'react'
import { AssetMetadata } from '@/shared/types/asset'
import { Modal } from '@/renderer/components/Modal/Modal'
import { Button } from '@/renderer/components/Button/Button'
import { toLocalFileUrl } from '@/renderer/utils/file'
import { useToast } from '@/renderer/hooks/useToast'
import './AssetPreview.css'

interface AssetPreviewProps {
  asset: AssetMetadata | null
  open: boolean
  onClose: () => void
}

export function AssetPreview({ asset, open, onClose }: AssetPreviewProps) {
  const [editMode, setEditMode] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [newTag, setNewTag] = useState('')
  const [textContent, setTextContent] = useState('')

  const { showToast } = useToast()

  // 加载资产数据
  useEffect(() => {
    if (!asset) return

    setTags(asset.tags || [])
    setDescription(asset.description || '')

    // 如果是文本文件，加载内容
    if (asset.type === 'text') {
      loadTextContent()
    }
  }, [asset])

  // 加载文本内容
  const loadTextContent = async () => {
    if (!asset) return
    try {
      const content = await window.electronAPI.readTextFile(asset.filePath)
      setTextContent(content)
    } catch (error) {
      showToast('加载文本失败: ' + error.message, 'error')
    }
  }

  // 保存元数据
  const handleSave = async () => {
    if (!asset) return

    try {
      await window.electronAPI.updateAssetMetadata(asset.filePath, {
        tags,
        description
      })
      showToast('保存成功', 'success')
      setEditMode(false)
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error')
    }
  }

  // 添加标签
  const handleAddTag = () => {
    if (!newTag.trim()) return
    if (tags.includes(newTag.trim())) {
      showToast('标签已存在', 'warning')
      return
    }
    setTags([...tags, newTag.trim()])
    setNewTag('')
  }

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // 渲染预览内容
  const renderPreview = () => {
    if (!asset) return null

    switch (asset.type) {
      case 'image':
        return (
          <img
            src={toLocalFileUrl(asset.filePath)}
            alt={asset.name}
            className="preview-image"
          />
        )
      case 'video':
        return (
          <video
            src={toLocalFileUrl(asset.filePath)}
            controls
            className="preview-video"
          />
        )
      case 'audio':
        return (
          <div className="preview-audio-container">
            <div className="audio-icon">
              <i className="icon-audio"></i>
            </div>
            <audio
              src={toLocalFileUrl(asset.filePath)}
              controls
              className="preview-audio"
            />
          </div>
        )
      case 'text':
        return (
          <div className="preview-text">
            <pre>{textContent}</pre>
          </div>
        )
      default:
        return (
          <div className="preview-unsupported">
            <i className="icon-file"></i>
            <p>不支持预览此类型文件</p>
            <p className="file-path">{asset.filePath}</p>
          </div>
        )
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  }

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!asset) return null

  return (
    <Modal open={open} onClose={onClose} size="large">
      <div className="asset-preview">
        <div className="preview-header">
          <h2>{asset.name}</h2>
          <div className="header-actions">
            {editMode ? (
              <>
                <Button onClick={handleSave} size="small">
                  保存
                </Button>
                <Button onClick={() => setEditMode(false)} variant="ghost" size="small">
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)} variant="ghost" size="small">
                编辑元数据
              </Button>
            )}
            <Button onClick={onClose} variant="ghost" size="small">
              关闭
            </Button>
          </div>
        </div>

        <div className="preview-body">
          <div className="preview-content">
            {renderPreview()}
          </div>

          <div className="preview-metadata">
            <h3>元数据</h3>

            <div className="metadata-grid">
              <div className="metadata-item">
                <label>类型</label>
                <span className={`type-tag type-${asset.type}`}>
                  {asset.type}
                </span>
              </div>

              <div className="metadata-item">
                <label>大小</label>
                <span>{formatFileSize(asset.size)}</span>
              </div>

              <div className="metadata-item">
                <label>创建时间</label>
                <span>{new Date(asset.createdAt).toLocaleString()}</span>
              </div>

              <div className="metadata-item">
                <label>修改时间</label>
                <span>{new Date(asset.modifiedAt).toLocaleString()}</span>
              </div>

              {asset.width && asset.height && (
                <div className="metadata-item">
                  <label>尺寸</label>
                  <span>{asset.width} × {asset.height}</span>
                </div>
              )}

              {asset.aspectRatio && (
                <div className="metadata-item">
                  <label>比例</label>
                  <span>{asset.aspectRatio}</span>
                </div>
              )}

              {asset.duration && (
                <div className="metadata-item">
                  <label>时长</label>
                  <span>{formatDuration(asset.duration)}</span>
                </div>
              )}

              {asset.category && (
                <div className="metadata-item">
                  <label>分类</label>
                  <span>{asset.category}</span>
                </div>
              )}

              {asset.status && asset.status !== 'none' && (
                <div className="metadata-item">
                  <label>状态</label>
                  <span className={`status-badge status-${asset.status}`}>
                    {asset.status}
                  </span>
                </div>
              )}

              {asset.prompt && (
                <div className="metadata-item full-width">
                  <label>AI提示词</label>
                  <p className="prompt-text">{asset.prompt}</p>
                </div>
              )}

              <div className="metadata-item full-width">
                <label>标签</label>
                {editMode ? (
                  <div className="tags-editor">
                    <div className="tags-list">
                      {tags.map(tag => (
                        <span key={tag} className="tag editable">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="tag-input-wrapper">
                      <input
                        type="text"
                        placeholder="添加标签..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag()
                          }
                        }}
                      />
                      <Button onClick={handleAddTag} size="small">
                        添加
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="tags-list">
                    {tags.length > 0 ? (
                      tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))
                    ) : (
                      <span className="empty-text">暂无标签</span>
                    )}
                  </div>
                )}
              </div>

              <div className="metadata-item full-width">
                <label>描述</label>
                {editMode ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="添加描述..."
                    rows={4}
                  />
                ) : (
                  <p className="description-text">
                    {description || <span className="empty-text">暂无描述</span>}
                  </p>
                )}
              </div>

              <div className="metadata-item full-width">
                <label>文件路径</label>
                <p className="file-path">{asset.filePath}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

**样式**: `src/renderer/components/AssetPreview/AssetPreview.css`

```css
.asset-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-primary);
}

.preview-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.preview-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  overflow: auto;
  padding: 24px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
}

.preview-audio-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.audio-icon {
  font-size: 96px;
  color: var(--accent-primary);
}

.preview-audio {
  width: 100%;
  max-width: 600px;
}

.preview-text {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.preview-text pre {
  margin: 0;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--text-tertiary);
}

.preview-unsupported i {
  font-size: 64px;
}

.preview-metadata {
  width: 400px;
  padding: 24px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  overflow-y: auto;
}

.preview-metadata h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.metadata-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metadata-item.full-width {
  grid-column: 1 / -1;
}

.metadata-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metadata-item span,
.metadata-item p {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
}

.prompt-text,
.description-text,
.file-path {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}

.empty-text {
  color: var(--text-tertiary);
  font-style: italic;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--accent-primary-alpha);
  border: 1px solid var(--accent-primary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--accent-primary);
}

.tag.editable {
  padding-right: 6px;
}

.tag button {
  background: none;
  border: none;
  color: var(--accent-primary);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tags-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-input-wrapper {
  display: flex;
  gap: 8px;
}

.tag-input-wrapper input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.metadata-item textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-generating {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.status-success {
  background: var(--success-bg);
  color: var(--success-text);
}

.status-failed {
  background: var(--error-bg);
  color: var(--error-text);
}
```

#### 任务 2.6: 本地文件协议

**文件**: `src/main/protocols/local-file.ts` (新建)

**目的**: 安全加载本地文件，支持中文路径

**实现**:
```typescript
import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import path from 'path'
import mime from 'mime-types'
import { Logger } from '../services/Logger'

const logger = new Logger('LocalFileProtocol')

/**
 * 注册本地文件协议
 * 允许渲染进程安全地访问项目作用域内的本地文件
 */
export function registerLocalFileProtocol() {
  protocol.registerBufferProtocol('local-file', async (request, callback) => {
    try {
      const url = request.url.replace('local-file://', '')
      const filePath = decodeURIComponent(url)

      // 安全检查: 禁止路径遍历攻击
      const normalizedPath = path.normalize(filePath)
      if (normalizedPath.includes('..')) {
        logger.warn(`拒绝访问包含路径遍历的文件: ${filePath}`)
        callback({ error: -10 })  // net::ERR_ACCESS_DENIED
        return
      }

      // 安全检查: 必须是绝对路径
      if (!path.isAbsolute(normalizedPath)) {
        logger.warn(`拒绝访问相对路径: ${filePath}`)
        callback({ error: -10 })
        return
      }

      // 读取文件
      const data = await readFile(normalizedPath)
      const mimeType = mime.lookup(normalizedPath) || 'application/octet-stream'

      logger.debug(`加载本地文件: ${normalizedPath} (${mimeType})`)

      callback({
        mimeType,
        data
      })
    } catch (error) {
      logger.error('加载本地文件失败:', error)
      callback({ error: -2 })  // net::ERR_FAILED
    }
  })

  logger.info('本地文件协议已注册')
}
```

**注册协议** (在 `src/main/index.ts`):
```typescript
import { registerLocalFileProtocol } from './protocols/local-file'

app.whenReady().then(() => {
  registerLocalFileProtocol()
  // ...其他初始化
})
```

**前端工具函数**: `src/renderer/utils/file.ts` (新建)

```typescript
/**
 * 将文件系统路径转换为本地文件协议URL
 * @param filePath - 文件系统绝对路径
 * @returns 本地文件协议URL
 */
export function toLocalFileUrl(filePath: string): string {
  // Windows路径转换 (反斜杠 -> 正斜杠)
  const normalized = filePath.replace(/\\/g, '/')

  // URL编码 (支持中文文件名)
  const encoded = encodeURIComponent(normalized)

  return `local-file://${encoded}`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

/**
 * 格式化时长 (秒 -> HH:MM:SS 或 MM:SS)
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

---

### 3.3 Phase 3: 集成测试和优化 (1天)

#### 任务 3.1: 集成测试

**文件**: `tests/integration/asset-management.test.ts` (新建)

**测试场景**:

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import path from 'path'
import fs from 'fs/promises'
import { AssetManager } from '@/main/services/AssetManager'
import { FileSystemService } from '@/main/services/FileSystemService'
import { Logger } from '@/main/services/Logger'

describe('Asset Management Integration Tests', () => {
  let assetManager: AssetManager
  let fsService: FileSystemService
  let testDataDir: string

  beforeAll(async () => {
    // 创建测试数据目录
    testDataDir = path.join(__dirname, '../fixtures/test-data')
    await fs.mkdir(testDataDir, { recursive: true })

    // 初始化服务
    fsService = new FileSystemService()
    await fsService.initialize(testDataDir)

    assetManager = new AssetManager(fsService, new Logger('AssetManagerTest'))
    await assetManager.initialize()
  })

  afterAll(async () => {
    // 清理测试数据
    await fs.rm(testDataDir, { recursive: true, force: true })
  })

  describe('索引构建', () => {
    it('应该正确构建空项目的索引', async () => {
      const projectId = 'test-project-1'
      const index = await assetManager.buildIndex(projectId)

      expect(index.total).toBe(0)
      expect(index.categories).toHaveLength(0)
    })

    it('应该正确扫描全局资产库', async () => {
      // 创建测试文件
      const globalImagesDir = fsService.getGlobalAssetDir('images')
      await fs.mkdir(globalImagesDir, { recursive: true })
      await fs.writeFile(path.join(globalImagesDir, 'test1.png'), Buffer.from('fake-png'))
      await fs.writeFile(path.join(globalImagesDir, 'test2.jpg'), Buffer.from('fake-jpg'))

      const index = await assetManager.buildIndex()

      expect(index.total).toBe(2)
      expect(index.categories).toContainEqual({
        name: 'images',
        count: 2
      })
    })
  })

  describe('资产导入', () => {
    it('应该成功导入图片资产', async () => {
      const sourcePath = path.join(__dirname, '../fixtures/test-image.png')
      await fs.writeFile(sourcePath, Buffer.from('fake-png-data'))

      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        type: 'image'
      })

      expect(result.name).toBe('test-image.png')
      expect(result.type).toBe('image')
      expect(result.scope).toBe('global')
      expect(await fs.access(result.filePath)).resolves.toBeUndefined()
    })

    it('应该拒绝导入不存在的文件', async () => {
      await expect(assetManager.importAsset({
        sourcePath: '/path/to/nonexistent/file.png',
        scope: 'global'
      })).rejects.toThrow()
    })
  })

  describe('分页扫描', () => {
    it('应该正确分页返回资产', async () => {
      // 创建100个测试文件
      const projectId = 'test-project-pagination'
      const imagesDir = fsService.getProjectAssetDir(projectId, 'images')
      await fs.mkdir(imagesDir, { recursive: true })

      for (let i = 1; i <= 100; i++) {
        await fs.writeFile(
          path.join(imagesDir, `image-${i.toString().padStart(3, '0')}.png`),
          Buffer.from('fake-png')
        )
      }

      // 重建索引
      await assetManager.buildIndex(projectId)

      // 第一页 (前50个)
      const page1 = await assetManager.scanAssets({
        scope: 'project',
        projectId,
        page: 1,
        pageSize: 50
      })

      expect(page1.total).toBe(100)
      expect(page1.assets).toHaveLength(50)
      expect(page1.assets[0].name).toBe('image-001.png')

      // 第二页 (后50个)
      const page2 = await assetManager.scanAssets({
        scope: 'project',
        projectId,
        page: 2,
        pageSize: 50
      })

      expect(page2.total).toBe(100)
      expect(page2.assets).toHaveLength(50)
      expect(page2.assets[0].name).toBe('image-051.png')
    })
  })

  describe('元数据管理', () => {
    it('应该创建和读取Sidecar元数据', async () => {
      const testFile = path.join(testDataDir, 'assets', 'images', 'test-meta.png')
      await fs.mkdir(path.dirname(testFile), { recursive: true })
      await fs.writeFile(testFile, Buffer.from('fake-png'))

      // 更新元数据
      const updated = await assetManager.updateMetadata(testFile, {
        tags: ['test', 'sample'],
        description: '测试图片'
      })

      expect(updated.tags).toEqual(['test', 'sample'])
      expect(updated.description).toBe('测试图片')

      // 读取元数据
      const metadata = await assetManager.getMetadata(testFile)
      expect(metadata?.tags).toEqual(['test', 'sample'])
      expect(metadata?.description).toBe('测试图片')

      // 检查Sidecar文件存在
      const metaPath = fsService.getAssetMetadataPath(testFile)
      await expect(fs.access(metaPath)).resolves.toBeUndefined()
    })
  })

  describe('级联删除', () => {
    it('应该同时删除资产文件和元数据', async () => {
      const testFile = path.join(testDataDir, 'assets', 'images', 'to-delete.png')
      await fs.mkdir(path.dirname(testFile), { recursive: true })
      await fs.writeFile(testFile, Buffer.from('fake-png'))

      // 创建元数据
      await assetManager.updateMetadata(testFile, { tags: ['test'] })

      const metaPath = fsService.getAssetMetadataPath(testFile)
      await expect(fs.access(metaPath)).resolves.toBeUndefined()

      // 删除资产
      await assetManager.deleteAsset(testFile)

      // 验证文件和元数据都被删除
      await expect(fs.access(testFile)).rejects.toThrow()
      await expect(fs.access(metaPath)).rejects.toThrow()
    })
  })

  describe('文件监听', () => {
    it('应该检测到新增文件', async (done) => {
      const projectId = 'test-watch-project'

      // 启动监听
      await assetManager.startWatching(projectId)

      // 监听文件变动事件
      const handler = (event: any) => {
        if (event.eventType === 'add' && event.metadata?.name === 'new-file.png') {
          assetManager.stopWatching(projectId)
          done()
        }
      }

      // 注册事件监听器 (实际项目中通过IPC)
      // 这里简化为直接调用

      // 创建新文件
      const newFile = path.join(
        fsService.getProjectAssetDir(projectId, 'images'),
        'new-file.png'
      )
      await fs.mkdir(path.dirname(newFile), { recursive: true })

      setTimeout(async () => {
        await fs.writeFile(newFile, Buffer.from('fake-png'))
      }, 100)
    }, 5000)
  })

  describe('比例检测', () => {
    it('应该正确检测16:9图片比例', async () => {
      // 模拟导入1920x1080图片
      const metadata = {
        width: 1920,
        height: 1080
      }

      // 测试比例检测逻辑
      const ratio = 1920 / 1080
      let aspectRatio: string

      if (Math.abs(ratio - 1.78) < 0.01) {
        aspectRatio = '16:9'
      } else {
        aspectRatio = 'custom'
      }

      expect(aspectRatio).toBe('16:9')
    })

    it('应该正确检测3:4竖屏比例', async () => {
      const ratio = 1080 / 1440
      let aspectRatio: string

      if (Math.abs(ratio - 0.75) < 0.01) {
        aspectRatio = '3:4'
      } else {
        aspectRatio = 'custom'
      }

      expect(aspectRatio).toBe('3:4')
    })
  })
})
```

#### 任务 3.2: 性能优化

**优化要点**:

1. **索引构建优化**:
```typescript
// src/main/services/AssetManager.ts

async buildIndex(projectId?: string): Promise<AssetIndex> {
  const startTime = Date.now()

  // 并行扫描所有分类目录
  const categoryPromises = categories.map(async (category) => {
    const categoryPath = path.join(baseDir, category)

    // 仅获取文件列表，不读取元数据
    const files = await fs.readdir(categoryPath)
    const validFiles = files.filter(f => !this.shouldIgnoreFile(f))

    return {
      name: category,
      count: validFiles.length,
      items: projectId ? validFiles : undefined
    }
  })

  const categoryData = await Promise.all(categoryPromises)

  this.logger.info(`索引构建完成，耗时 ${Date.now() - startTime}ms`)

  return index
}
```

2. **虚拟滚动性能**:
```typescript
// src/renderer/components/AssetGrid/AssetGrid.tsx

// 使用React.memo防止不必要的重渲染
const AssetCard = React.memo(AssetCardComponent)

// 防抖容器尺寸变化
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

useEffect(() => {
  let timeoutId: NodeJS.Timeout

  const resizeObserver = new ResizeObserver((entries) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    }, 100)  // 100ms防抖
  })

  if (containerRef.current) {
    resizeObserver.observe(containerRef.current)
  }

  return () => {
    clearTimeout(timeoutId)
    resizeObserver.disconnect()
  }
}, [])
```

3. **缩略图懒加载** (可选，后期优化):
```typescript
// 使用IntersectionObserver延迟加载缩略图

const AssetCard = ({ asset, ... }: AssetCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setImageLoaded(true)
          observer.disconnect()
        }
      },
      { rootMargin: '50px' }  // 提前50px开始加载
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <img
      ref={imgRef}
      src={imageLoaded ? toLocalFileUrl(asset.filePath) : placeholderImage}
      alt={asset.name}
    />
  )
}
```

#### 任务 3.3: 错误处理增强

**统一错误处理**:

```typescript
// src/main/services/AssetManager.ts

import { ServiceErrorHandler, ErrorCodes } from './ServiceErrorHandler'

export class AssetManager {
  private errorHandler: ServiceErrorHandler

  async importAsset(params: ImportAssetParams): Promise<AssetMetadata> {
    try {
      // 验证源文件存在
      if (!(await this.fsService.exists(params.sourcePath))) {
        throw this.errorHandler.createError(
          ErrorCodes.FILE_NOT_FOUND,
          `源文件不存在: ${params.sourcePath}`
        )
      }

      // 验证项目存在 (如果是项目作用域)
      if (params.scope === 'project' && !params.projectId) {
        throw this.errorHandler.createError(
          ErrorCodes.INVALID_PARAMETER,
          '项目作用域必须提供projectId'
        )
      }

      // ... 导入逻辑

    } catch (error) {
      this.logger.error('导入资产失败:', error)
      throw this.errorHandler.wrapError(error, '导入资产失败')
    }
  }
}
```

---

## 四、依赖清单

### NPM包

```json
{
  "dependencies": {
    "chokidar": "^3.6.0",        // 文件监听
    "mime-types": "^2.1.35"      // MIME类型检测
  },
  "devDependencies": {
    "@types/mime-types": "^2.1.4"
  }
}
```

### 前端依赖

```json
{
  "dependencies": {
    "react-window": "^1.8.10"    // 虚拟滚动
  },
  "devDependencies": {
    "@types/react-window": "^1.8.8"
  }
}
```

### 安装命令

```bash
# 主进程依赖
npm install chokidar mime-types

# 前端依赖
npm install react-window

# TypeScript类型
npm install --save-dev @types/mime-types @types/react-window
```

---

## 五、文件清单

### 新建文件 (18个)

#### 主进程 (4个)
1. `src/main/services/FileSystemService.ts` - 文件系统服务 (✨核心)
2. `src/main/protocols/local-file.ts` - 本地文件协议
3. `src/shared/types/asset.ts` - 资产类型定义 (✨核心)
4. `tests/integration/asset-management.test.ts` - 集成测试

#### 渲染进程 (14个)
5. `src/renderer/components/AssetSidebar/AssetSidebar.tsx` - 侧边栏组件 (✨核心)
6. `src/renderer/components/AssetSidebar/AssetSidebar.css` - 侧边栏样式
7. `src/renderer/components/AssetCard/AssetCard.tsx` - 资产卡片 (✨核心)
8. `src/renderer/components/AssetCard/AssetCard.css` - 卡片样式
9. `src/renderer/components/AssetGrid/AssetGrid.tsx` - 资产网格 (✨核心)
10. `src/renderer/components/AssetGrid/AssetGrid.css` - 网格样式
11. `src/renderer/components/AssetPreview/AssetPreview.tsx` - 预览Modal (✨核心)
12. `src/renderer/components/AssetPreview/AssetPreview.css` - 预览样式
13. `src/renderer/pages/Assets/Assets.tsx` - Assets页面 (✨核心 - 重构)
14. `src/renderer/pages/Assets/Assets.css` - 页面样式
15. `src/renderer/utils/file.ts` - 文件工具函数
16. `src/renderer/hooks/useToast.ts` - Toast钩子 (如果不存在)

### 修改文件 (4个)
17. `src/main/services/AssetManager.ts` - 完善实现 (✨核心)
18. `src/main/ipc/handlers/asset.ts` - 完善IPC处理器
19. `src/preload/index.ts` - 添加资产管理API
20. `src/main/index.ts` - 注册本地文件协议

---

## 六、实施优先级

### P0 - 核心功能 (必须完成，2-3天)
1. ✅ FileSystemService 实现
2. ✅ AssetManager 完善 (buildIndex, scanAssets分页)
3. ✅ 类型定义 (asset.ts, AspectRatio)
4. ✅ IPC通信层 (get-index, rebuild-index, scan)
5. ✅ AssetSidebar 组件 (动态分类)
6. ✅ AssetCard 组件 (4种比例支持)
7. ✅ Assets 页面重构 (左侧栏+网格+分页)
8. ✅ 基础样式

### P1 - 高优先级 (提升体验，1-2天)
1. ✅ 虚拟滚动 (AssetGrid + react-window)
2. ✅ 文件监听 (chokidar)
3. ✅ 实时推送 (IPC事件)
4. ✅ 预览Modal (图片/视频/音频/文本)
5. ✅ 本地文件协议 (支持中文路径)
6. ✅ 元数据编辑 (tags, description)

### P2 - 中优先级 (优化，1天)
1. 集成测试 (核心场景)
2. 性能优化 (索引并行构建、防抖)
3. 错误处理增强
4. 缩略图懒加载 (IntersectionObserver)

### P3 - 低优先级 (增强，后期迭代)
1. 批量操作 (批量删除、批量编辑标签)
2. 高级搜索 (多条件组合)
3. 资产统计分析
4. 拖拽排序

---

## 七、潜在风险与解决方案

### 风险1: 大量文件扫描性能问题
**症状**: 扫描10000+文件导致UI卡顿

**解决方案**:
- ✅ 使用JSON索引代替实时扫描
- ✅ 分页加载 (默认100项)
- ✅ 仅加载当前页元数据
- 并行扫描分类目录 (Promise.all)
- 显示加载进度条

### 风险2: 文件监听器内存泄漏
**症状**: 长时间运行内存占用过高

**解决方案**:
- 页面卸载时停止监听
- 限制同时监听的目录数量 (最多10个分类)
- 定期检查和清理无效watcher
- 使用防抖避免频繁触发

### 风险3: 本地文件协议安全问题
**症状**: 可能访问敏感系统文件

**解决方案**:
- ✅ 路径规范化和验证 (path.normalize)
- ✅ 禁止 `..` 路径遍历
- ✅ 仅允许绝对路径
- 限制访问范围 (仅项目数据目录)
- 日志记录所有访问

### 风险4: 跨平台路径兼容性
**症状**: Windows/macOS/Linux路径格式不同

**解决方案**:
- ✅ 统一使用 `path.normalize()`
- ✅ Windows反斜杠转正斜杠 (URL使用)
- 存储相对路径而非绝对路径
- 测试三大平台

### 风险5: Sidecar元数据冲突
**症状**: 多进程同时写入导致数据丢失

**解决方案**:
- 写入前读取最新版本 (读-修改-写)
- 原子写入 (先写临时文件再重命名)
- 添加写入锁 (lockfile库)
- 错误重试机制 (最多3次)

### 风险6: 虚拟滚动白屏
**症状**: 快速滚动时出现空白区域

**解决方案**:
- ✅ 使用react-window库 (成熟方案)
- 设置合理的overscanCount (默认1)
- 图片懒加载防止阻塞
- 使用placeholder占位

---

## 八、验收标准

### 功能验收
- [ ] 全局资产库扫描和显示 (按类别+时间排序)
- [ ] 项目资产库扫描和显示 (按分类+文件名排序)
- [ ] 左侧边栏动态显示分类 (从index.json读取)
- [ ] 导入功能 (单文件/多文件，自动分类)
- [ ] 删除功能 (带确认，级联删除元数据)
- [ ] 搜索过滤 (按名称/标签/描述)
- [ ] 实时文件监听 (1秒内刷新)
- [ ] 预览功能 (图片/视频/音频/文本)
- [ ] 元数据编辑 (tags, description)
- [ ] 分页控制 (上一页/下一页/页码跳转)
- [ ] 4种比例显示 (3:4, 4:3, 16:9, 9:16)

### 性能验收
- [ ] 1000个资产索引加载 < 500ms
- [ ] 100个资产卡片渲染 < 1秒
- [ ] 虚拟滚动流畅 (60fps)
- [ ] 文件变动响应 < 1秒
- [ ] 内存占用 < 300MB (10000个资产索引)
- [ ] 翻页响应 < 500ms

### 用户体验验收
- [ ] 界面美观，遵循V14设计系统
- [ ] 操作流畅，无明显卡顿
- [ ] 错误提示友好 (Toast通知)
- [ ] 支持中文文件名和路径
- [ ] 快捷键支持 (Ctrl+F搜索等)
- [ ] 响应式布局 (支持不同窗口大小)

### 代码质量验收
- [ ] 所有TypeScript类型完整
- [ ] 0个ESLint错误
- [ ] 核心功能有单元测试 (覆盖率>70%)
- [ ] 集成测试通过
- [ ] 中文注释完整
- [ ] 代码可维护性良好

---

## 九、后续规划

### v0.3.1 增强 (1-2周)
- 批量编辑元数据
- 资产统计分析 (按类型/大小/时间)
- 高级筛选 (多条件组合)
- 缩略图自动生成 (sharp/ffmpeg)
- 拖拽排序
- 收藏夹功能

### v0.4.0 高级功能 (2-3周)
- 资产复用推荐 (AI相似度匹配)
- 智能标签建议 (基于文件名/内容分析)
- 版本历史 (资产修改记录)
- 资产关联 (显示被哪些项目使用)
- 导出功能 (打包下载)

### v1.0.0 完善 (长期)
- 云存储集成 (OSS/S3)
- 资产分享 (生成分享链接)
- 权限管理 (只读/读写)
- 多语言支持 (英文/日文)
- 插件扩展 (自定义资产类型)

---

## 十、总结

本实施计划基于对 ai-playlet-master 项目的深入调研，借鉴其成熟的文件管理模式，结合Matrix Studio的通用化需求和用户的6点核心要求，设计了一套完整的资产库解决方案。

### 核心亮点

1. **JSON索引架构** ⭐
   - 无数据库依赖，轻量高效
   - 全局索引仅统计，项目索引含文件列表
   - 支持按需重建，保证数据一致性

2. **双作用域设计** ⭐
   - 项目资产: 左侧栏动态分类 (scenes/characters/images/videos等)
   - 全局资产: 跨项目复用，按类别+时间排序
   - 平衡隔离性和复用性

3. **多比例卡片支持** ⭐
   - 4种预定义比例 (3:4, 4:3, 16:9, 9:16)
   - CSS aspect-ratio原生支持
   - 自动检测图片/视频比例
   - 窗口自适应网格布局

4. **高性能分页** ⭐
   - 默认100项/页，最多10x10卡片
   - 仅加载当前页元数据
   - 虚拟滚动优化渲染
   - 支持10000+资产无压力

5. **实时文件监听** ⭐
   - chokidar监听文件变动
   - 1秒内自动刷新UI
   - 支持外部工具编辑
   - 自动更新索引

6. **安全文件访问** ⭐
   - 作用域限定 (项目数据目录)
   - 路径验证防遍历
   - 本地文件协议支持中文
   - 级联删除保证完整性

7. **Sidecar元数据** ⭐
   - .meta.json伴生文件
   - 标准化Schema (18个预定义字段)
   - 插件扩展字段 (customFields)
   - 与小说插件完全兼容

8. **用户体验优化** ⭐
   - 预览Modal (图片/视频/音频/文本)
   - 元数据编辑 (tags/description)
   - Toast友好提示
   - 响应式布局

### 技术选型

| 技术 | 用途 | 优势 |
|------|------|------|
| JSON索引 | 资产索引 | 无DB依赖，易维护 |
| chokidar | 文件监听 | 跨平台，性能好 |
| react-window | 虚拟滚动 | 成熟稳定，性能优 |
| CSS aspect-ratio | 比例控制 | 原生支持，简洁 |
| local-file协议 | 本地文件 | 安全，支持中文 |
| Sidecar元数据 | 元数据存储 | 独立性好，易管理 |

### 兼容性验证

✅ 与小说转视频插件完全兼容:
- 支持 scenes/characters/storyboards 分类
- 支持 prompt/status/sourceId 字段
- 支持 customFields 扩展
- 项目作用域隔离

✅ 与Matrix系统完全集成:
- 使用 ProjectManager 获取项目列表
- 使用 TimeService 统一时间处理
- 使用 Logger 统一日志
- 使用 ServiceErrorHandler 统一错误

### 预计交付

- **工期**: 5-7个工作日
  - Phase 1 (后端): 2天
  - Phase 2 (前端): 2天
  - Phase 3 (测试): 1天

- **功能完成度**: 100% (P0+P1优先级)
- **代码质量**: 生产就绪
- **测试覆盖**: 核心功能>70%

### 实施建议

1. **严格按Phase顺序**: Phase 1 → Phase 2 → Phase 3
2. **每日自测**: 完成一个任务立即测试
3. **频繁提交**: 小步快跑，方便回退
4. **文档同步**: 代码和注释同步更新
5. **性能监控**: 使用Chrome DevTools监控性能

---

**最后更新**: 2025-12-25
**文档版本**: v1.0
**状态**: 待审核

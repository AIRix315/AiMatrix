# Matrix Studio - 资产库视图实施计划 (Phase 4 [E01])

**版本**: v1.0
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

---

## 二、技术方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        渲染进程                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Assets Page (资产库页面)                              │ │
│  │  - TabBar: 全局/项目作用域切换                         │ │
│  │  - SearchBar: 搜索和过滤                               │ │
│  │  - AssetGrid: 虚拟滚动网格布局                         │ │
│  │    └─ AssetCard: 资产卡片组件                         │ │
│  │  - ImportButton: 导入资产                              │ │
│  │  - PreviewModal: 预览和元数据编辑                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                        主进程                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AssetManager (资产管理器)                             │ │
│  │  - scan(): 扫描资产                                    │ │
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
│  ┌────────────────────────────────────────────────────────┐ │
│  │  IndexService (索引服务 - 可选)                        │ │
│  │  - SQLite缓存资产索引，加速查询                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     文件系统                                 │
│  - 全局资产库: {dataDir}/assets/                           │
│  - 项目资产库: {dataDir}/projects/{projectId}/assets/      │
│    ├── images/                                             │
│    ├── videos/                                             │
│    ├── audio/                                              │
│    ├── text/                                               │
│    └── other/                                              │
│  - Sidecar元数据: {assetPath}.meta.json                    │
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
│   ├── text/
│   └── other/
│
└── projects/
    └── project-{uuid}/
        ├── project.json             # 项目元数据
        └── assets/                  # 项目资产库
            ├── images/
            ├── videos/
            ├── audio/
            ├── text/
            └── other/
```

### 2.3 数据模型

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
  category?: string                 // 自定义分类
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
 * 资源生成状态
 */
export type ResourceStatus = 'none' | 'generating' | 'success' | 'failed'

/**
 * 资产查询过滤器
 */
export interface AssetFilter {
  scope?: 'global' | 'project' | 'all'
  projectId?: string
  type?: AssetType | AssetType[]
  tags?: string[]
  status?: ResourceStatus
  search?: string               // 搜索关键词 (匹配name/tags/description)
  sortBy?: 'name' | 'createdAt' | 'modifiedAt' | 'size'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * 资产扫描结果
 */
export interface AssetScanResult {
  total: number
  assets: AssetMetadata[]
  errors?: Array<{
    path: string
    error: string
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

  // 初始化
  async initialize(customDataDirectory?: string): Promise<void>

  // 路径管理
  getDataDir(): string
  getGlobalAssetDir(type?: AssetType): string
  getProjectAssetDir(projectId: string, type?: AssetType): string
  getAssetMetadataPath(filePath: string): string
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
- 自动创建必要的目录结构
- 路径标准化处理 (统一斜杠、解析相对路径)
- 错误处理和日志记录 (集成Logger)
- 使用 `mime-types` 库识别MIME类型

#### 任务 1.2: 完善 AssetManager

**文件**: `src/main/services/AssetManager.ts` (已存在，需重构)

**新增功能**:
```typescript
export class AssetManager {
  private fsService: FileSystemService
  private logger: Logger
  private watchers: Map<string, FSWatcher>  // chokidar watchers
  private assetCache: Map<string, AssetMetadata>  // 内存缓存

  // 初始化
  async initialize(): Promise<void>

  // 扫描和索引
  async scanAssets(filter: AssetFilter): Promise<AssetScanResult>
  private async scanDirectory(
    dirPath: string,
    scope: 'global' | 'project',
    projectId?: string
  ): Promise<AssetMetadata[]>

  // 导入资产
  async importAsset(params: {
    sourcePath: string
    scope: 'global' | 'project'
    projectId?: string
    type?: AssetType          // 可选，自动检测
    category?: string
    tags?: string[]
    metadata?: Partial<AssetMetadata>
  }): Promise<AssetMetadata>

  // 元数据管理
  async getMetadata(filePath: string): Promise<AssetMetadata | null>
  async updateMetadata(
    filePath: string,
    updates: Partial<AssetMetadata>
  ): Promise<AssetMetadata>
  private async createDefaultMetadata(
    filePath: string,
    scope: 'global' | 'project',
    projectId?: string
  ): Promise<AssetMetadata>

  // 删除资产 (级联删除)
  async deleteAsset(filePath: string, deleteMetadata = true): Promise<void>

  // 文件监听
  async startWatching(projectId?: string): Promise<void>
  async stopWatching(projectId?: string): Promise<void>
  private handleFileChange(eventType: 'add' | 'change' | 'unlink', filePath: string): void

  // 辅助方法
  private detectAssetType(filePath: string): AssetType
  private shouldIgnoreFile(filePath: string): boolean  // 忽略 .meta.json 等
  private async generateThumbnail(filePath: string, type: AssetType): Promise<string | undefined>
}
```

**实现要点**:
- **扫描策略**:
  - 启动时全量扫描一次，构建内存缓存
  - 使用 `chokidar` 监听文件变动
  - 支持增量更新缓存

- **文件类型检测**:
  ```typescript
  private detectAssetType(filePath: string): AssetType {
    const ext = path.extname(filePath).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    const audioExts = ['.mp3', '.wav', '.aac', '.m4a', '.ogg']
    const textExts = ['.txt', '.md', '.json', '.xml', '.csv']

    if (imageExts.includes(ext)) return 'image'
    if (videoExts.includes(ext)) return 'video'
    if (audioExts.includes(ext)) return 'audio'
    if (textExts.includes(ext)) return 'text'
    return 'other'
  }
  ```

- **忽略规则**:
  - `.meta.json` 文件 (Sidecar元数据)
  - 系统临时文件 (`.DS_Store`, `Thumbs.db`)
  - 隐藏文件 (以 `.` 开头)

- **Chokidar配置**:
  ```typescript
  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../,  // 忽略点文件
    persistent: true,
    ignoreInitial: true,       // 跳过初始扫描
    awaitWriteFinish: {
      stabilityThreshold: 2000,  // 等待2秒确保文件写入完成
      pollInterval: 100
    }
  })

  watcher
    .on('add', path => this.handleFileChange('add', path))
    .on('change', path => this.handleFileChange('change', path))
    .on('unlink', path => this.handleFileChange('unlink', path))
  ```

- **实时推送**: 使用 `webContents.send()` 推送变动到渲染进程
  ```typescript
  private handleFileChange(eventType: string, filePath: string) {
    // 1. 更新内存缓存
    // 2. 通知所有监听的窗口
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('asset:file-changed', {
        eventType,
        filePath,
        metadata: this.assetCache.get(filePath)
      })
    })
  }
  ```

- **缩略图生成** (可选，后期优化):
  - 图片: 使用 `sharp` 生成缩略图
  - 视频: 使用 `fluent-ffmpeg` 提取第一帧
  - 存储在 `.thumbnails/` 目录

#### 任务 1.3: 定义共享类型

**文件**: `src/shared/types/asset.ts` (新建)

**内容**:
- `AssetMetadata` 接口
- `AssetType` 枚举
- `ResourceStatus` 枚举
- `AssetFilter` 接口
- `AssetScanResult` 接口

(详见 2.3 数据模型)

#### 任务 1.4: IPC处理器

**文件**: `src/main/ipc/handlers/asset.ts` (需完善)

**IPC通道**:
```typescript
// 扫描资产
ipcMain.handle('asset:scan', async (_event, filter: AssetFilter) => {
  return await assetManager.scanAssets(filter)
})

// 导入资产
ipcMain.handle('asset:import', async (_event, params: {
  sourcePath: string
  scope: 'global' | 'project'
  projectId?: string
  type?: AssetType
  category?: string
  tags?: string[]
}) => {
  return await assetManager.importAsset(params)
})

// 删除资产
ipcMain.handle('asset:delete', async (_event, filePath: string) => {
  await assetManager.deleteAsset(filePath)
  return { success: true }
})

// 获取元数据
ipcMain.handle('asset:get-metadata', async (_event, filePath: string) => {
  return await assetManager.getMetadata(filePath)
})

// 更新元数据
ipcMain.handle('asset:update-metadata', async (
  _event,
  filePath: string,
  updates: Partial<AssetMetadata>
) => {
  return await assetManager.updateMetadata(filePath, updates)
})

// 启动文件监听
ipcMain.handle('asset:start-watching', async (_event, projectId?: string) => {
  await assetManager.startWatching(projectId)
  return { success: true }
})

// 停止文件监听
ipcMain.handle('asset:stop-watching', async (_event, projectId?: string) => {
  await assetManager.stopWatching(projectId)
  return { success: true }
})

// 打开文件选择对话框
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

**更新预加载脚本**:

**文件**: `src/preload/index.ts`

```typescript
// 添加资产管理API
const api = {
  // ... 现有API

  // 资产管理
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

  // 监听文件变动
  onAssetFileChanged: (callback: (event: {
    eventType: 'add' | 'change' | 'unlink'
    filePath: string
    metadata?: AssetMetadata
  }) => void) => {
    ipcRenderer.on('asset:file-changed', (_event, data) => callback(data))
  }
}
```

---

### 3.2 Phase 2: 前端UI实现 (2天)

#### 任务 2.1: 资产卡片组件

**文件**: `src/renderer/components/AssetCard/AssetCard.tsx` (新建)

**功能**:
- 显示缩略图或文件类型图标
- 显示资产名称
- 显示类型标签 (image/video/audio/text)
- 显示状态徽章 (generating/success/failed)
- 元数据指示器 (如果有Sidecar)
- 悬停效果和选中状态
- 支持右键菜单 (删除、编辑元数据、复制路径等)

**实现**:
```tsx
import React from 'react'
import { AssetMetadata } from '@/shared/types/asset'
import { toLocalFileUrl } from '@/renderer/utils/file'
import './AssetCard.css'

interface AssetCardProps {
  asset: AssetMetadata
  selected?: boolean
  onSelect?: (asset: AssetMetadata) => void
  onPreview?: (asset: AssetMetadata) => void
  onDelete?: (asset: AssetMetadata) => void
}

export function AssetCard({
  asset,
  selected,
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
      className={`asset-card ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="asset-card-thumbnail">
        {renderThumbnail()}

        {/* 状态徽章 */}
        {asset.status && asset.status !== 'none' && (
          <div className={`status-badge status-${asset.status}`}>
            {asset.status === 'generating' && '生成中'}
            {asset.status === 'success' && '成功'}
            {asset.status === 'failed' && '失败'}
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

.asset-card-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--bg-tertiary);
  overflow: hidden;
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
}

.asset-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.asset-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
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
}
```

#### 任务 2.2: 资产网格组件 (虚拟滚动)

**文件**: `src/renderer/components/AssetGrid/AssetGrid.tsx` (新建)

**技术选型**: 使用 `react-window` 实现虚拟滚动

**安装依赖**:
```bash
npm install react-window
npm install --save-dev @types/react-window
```

**实现**:
```tsx
import React, { useMemo } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { AssetMetadata } from '@/shared/types/asset'
import { AssetCard } from '../AssetCard/AssetCard'
import './AssetGrid.css'

interface AssetGridProps {
  assets: AssetMetadata[]
  selectedAssetId?: string
  onAssetSelect?: (asset: AssetMetadata) => void
  onAssetPreview?: (asset: AssetMetadata) => void
  onAssetDelete?: (asset: AssetMetadata) => void
}

export function AssetGrid({
  assets,
  selectedAssetId,
  onAssetSelect,
  onAssetPreview,
  onAssetDelete
}: AssetGridProps) {
  // 计算网格参数
  const columnCount = 4
  const columnWidth = 280
  const rowHeight = 240
  const rowCount = Math.ceil(assets.length / columnCount)

  // 单元格渲染器
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex
    if (index >= assets.length) return null

    const asset = assets[index]

    return (
      <div style={style} className="asset-grid-cell">
        <AssetCard
          asset={asset}
          selected={asset.id === selectedAssetId}
          onSelect={onAssetSelect}
          onPreview={onAssetPreview}
          onDelete={onAssetDelete}
        />
      </div>
    )
  }

  return (
    <div className="asset-grid-container">
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={window.innerHeight - 200}  // 减去头部高度
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={window.innerWidth - 100}    // 减去侧边栏宽度
      >
        {Cell}
      </Grid>
    </div>
  )
}
```

#### 任务 2.3: Assets页面重构

**文件**: `src/renderer/pages/Assets/Assets.tsx` (需重构)

**布局结构**:
```
┌─────────────────────────────────────────────────────┐
│  [全局] [项目]  [搜索框]              [导入] [刷新]  │  <- TabBar + Toolbar
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │  资产1  │ │  资产2  │ │  资产3  │ │  资产4  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                     │  <- AssetGrid (虚拟滚动)
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │  资产5  │ │  资产6  │ │  资产7  │ │  资产8  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**实现**:
```tsx
import React, { useState, useEffect, useMemo } from 'react'
import { AssetMetadata, AssetFilter } from '@/shared/types/asset'
import { AssetGrid } from '@/renderer/components/AssetGrid/AssetGrid'
import { Button } from '@/renderer/components/Button/Button'
import { Input } from '@/renderer/components/Input/Input'
import { Loading } from '@/renderer/components/Loading/Loading'
import { useToast } from '@/renderer/hooks/useToast'
import './Assets.css'

export function Assets() {
  const [scope, setScope] = useState<'global' | 'project'>('global')
  const [assets, setAssets] = useState<AssetMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string>()
  const [currentProjectId, setCurrentProjectId] = useState<string>()

  const { showToast } = useToast()

  // 加载当前项目ID
  useEffect(() => {
    // 从全局状态或URL参数获取当前项目ID
    // TODO: 实现项目上下文管理
  }, [])

  // 加载资产
  const loadAssets = async () => {
    setLoading(true)
    try {
      const filter: AssetFilter = {
        scope: scope === 'global' ? 'global' : 'project',
        projectId: scope === 'project' ? currentProjectId : undefined,
        search: searchQuery || undefined,
        sortBy: 'modifiedAt',
        sortOrder: 'desc'
      }

      const result = await window.electronAPI.scanAssets(filter)
      setAssets(result.assets)

      if (result.errors && result.errors.length > 0) {
        showToast(`扫描完成，但有 ${result.errors.length} 个文件失败`, 'warning')
      }
    } catch (error) {
      showToast('加载资产失败: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadAssets()
  }, [scope, currentProjectId])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAssets()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 监听文件变动
  useEffect(() => {
    window.electronAPI.onAssetFileChanged((event) => {
      // 实时更新资产列表
      if (event.eventType === 'add' && event.metadata) {
        setAssets(prev => [event.metadata, ...prev])
        showToast(`新增资产: ${event.metadata.name}`, 'success')
      } else if (event.eventType === 'unlink') {
        setAssets(prev => prev.filter(a => a.filePath !== event.filePath))
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
          projectId: scope === 'project' ? currentProjectId : undefined
        })
      }

      showToast(`成功导入 ${filePaths.length} 个资产`, 'success')
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
    } catch (error) {
      showToast('删除失败: ' + error.message, 'error')
    }
  }

  // 预览资产
  const handlePreview = (asset: AssetMetadata) => {
    // TODO: 打开预览Modal
  }

  return (
    <div className="assets-page">
      <div className="assets-toolbar">
        {/* Tab切换 */}
        <div className="scope-tabs">
          <button
            className={scope === 'global' ? 'active' : ''}
            onClick={() => setScope('global')}
          >
            全局资产库
          </button>
          <button
            className={scope === 'project' ? 'active' : ''}
            onClick={() => setScope('project')}
            disabled={!currentProjectId}
          >
            项目资产库
          </button>
        </div>

        {/* 搜索框 */}
        <Input
          placeholder="搜索资产..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        {/* 操作按钮 */}
        <div className="toolbar-actions">
          <Button onClick={handleImport} disabled={loading}>
            导入资产
          </Button>
          <Button onClick={loadAssets} variant="ghost" disabled={loading}>
            刷新
          </Button>
        </div>
      </div>

      <div className="assets-content">
        {loading && <Loading />}

        {!loading && assets.length === 0 && (
          <div className="empty-state">
            <p>暂无资产</p>
            <Button onClick={handleImport}>导入第一个资产</Button>
          </div>
        )}

        {!loading && assets.length > 0 && (
          <AssetGrid
            assets={assets}
            selectedAssetId={selectedAssetId}
            onAssetSelect={(asset) => setSelectedAssetId(asset.id)}
            onAssetPreview={handlePreview}
            onAssetDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
```

#### 任务 2.4: 预览Modal

**文件**: `src/renderer/components/AssetPreview/AssetPreview.tsx` (新建)

**功能**:
- 大图预览 (图片)
- 视频播放器 (视频)
- 音频播放器 (音频)
- 文本查看器 (文本)
- 显示完整元数据
- 编辑元数据 (tags、description等)

**实现** (简化版):
```tsx
import React, { useState } from 'react'
import { AssetMetadata } from '@/shared/types/asset'
import { Modal } from '@/renderer/components/Modal/Modal'
import { Button } from '@/renderer/components/Button/Button'
import { toLocalFileUrl } from '@/renderer/utils/file'
import './AssetPreview.css'

interface AssetPreviewProps {
  asset: AssetMetadata | null
  open: boolean
  onClose: () => void
}

export function AssetPreview({ asset, open, onClose }: AssetPreviewProps) {
  if (!asset) return null

  const renderPreview = () => {
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
          <audio
            src={toLocalFileUrl(asset.filePath)}
            controls
            className="preview-audio"
          />
        )
      case 'text':
        // TODO: 异步加载文本内容
        return <div className="preview-text">文本预览</div>
      default:
        return <div className="preview-unsupported">不支持预览</div>
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="large">
      <div className="asset-preview">
        <div className="preview-header">
          <h2>{asset.name}</h2>
          <Button onClick={onClose} variant="ghost">关闭</Button>
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
                <span>{asset.type}</span>
              </div>
              <div className="metadata-item">
                <label>大小</label>
                <span>{(asset.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="metadata-item">
                <label>创建时间</label>
                <span>{new Date(asset.createdAt).toLocaleString()}</span>
              </div>
              {asset.width && asset.height && (
                <div className="metadata-item">
                  <label>尺寸</label>
                  <span>{asset.width} × {asset.height}</span>
                </div>
              )}
              {asset.prompt && (
                <div className="metadata-item full-width">
                  <label>AI提示词</label>
                  <p>{asset.prompt}</p>
                </div>
              )}
              <div className="metadata-item full-width">
                <label>标签</label>
                <div className="tags-editor">
                  {asset.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

#### 任务 2.5: 本地文件协议 (可选)

**文件**: `src/main/protocols/local-file.ts` (新建)

**目的**: 安全加载本地文件，支持中文路径

**实现**:
```typescript
import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import path from 'path'
import mime from 'mime-types'

export function registerLocalFileProtocol() {
  protocol.registerBufferProtocol('local-file', async (request, callback) => {
    try {
      const url = request.url.replace('local-file://', '')
      const filePath = decodeURIComponent(url)

      // 安全检查: 禁止访问系统敏感目录
      const normalizedPath = path.normalize(filePath)
      if (normalizedPath.includes('..')) {
        throw new Error('Invalid path')
      }

      const data = await readFile(filePath)
      const mimeType = mime.lookup(filePath) || 'application/octet-stream'

      callback({
        mimeType,
        data
      })
    } catch (error) {
      console.error('Failed to load local file:', error)
      callback({ error: -2 })  // net::ERR_FAILED
    }
  })
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

**前端工具函数**: `src/renderer/utils/file.ts`

```typescript
export function toLocalFileUrl(filePath: string): string {
  // Windows路径转换
  const normalized = filePath.replace(/\\/g, '/')
  return `local-file://${encodeURIComponent(normalized)}`
}
```

---

### 3.3 Phase 3: 集成测试和优化 (1天)

#### 任务 3.1: 集成测试

**测试场景**:
1. **扫描测试**:
   - 全局资产库扫描
   - 项目资产库扫描
   - 空目录处理
   - 大量文件性能测试 (1000+)

2. **导入测试**:
   - 单文件导入
   - 多文件批量导入
   - 重复文件处理
   - 中文文件名支持

3. **实时监听测试**:
   - 外部新增文件自动显示
   - 外部删除文件自动移除
   - 外部修改文件自动更新
   - 监听器资源释放

4. **元数据测试**:
   - Sidecar读写
   - 元数据更新
   - 自定义字段扩展

5. **删除测试**:
   - 单文件删除
   - 级联删除 (资产+元数据)

**文件**: `tests/integration/asset-management.test.ts`

#### 任务 3.2: 性能优化

1. **扫描优化**:
   - 使用Worker线程异步扫描大目录
   - 结果分批返回 (每100个资产推送一次)
   - 缓存扫描结果，避免重复扫描

2. **渲染优化**:
   - 虚拟滚动已实现 (react-window)
   - 缩略图懒加载
   - 图片预加载优化

3. **内存优化**:
   - 限制内存缓存大小 (LRU策略)
   - 及时释放未使用的watcher

#### 任务 3.3: 错误处理

1. **文件系统错误**:
   - 文件不存在
   - 权限不足
   - 磁盘空间不足

2. **网络错误** (如果使用远程存储):
   - 超时重试
   - 降级策略

3. **用户友好提示**:
   - Toast通知
   - 错误日志记录

---

## 四、依赖清单

### NPM包

```json
{
  "dependencies": {
    "chokidar": "^3.5.3",        // 文件监听
    "mime-types": "^2.1.35",     // MIME类型检测
    "react-window": "^1.8.10"    // 虚拟滚动
  },
  "devDependencies": {
    "@types/mime-types": "^2.1.1",
    "@types/react-window": "^1.8.8"
  },
  "optionalDependencies": {
    "sharp": "^0.33.0",          // 图片缩略图生成 (可选)
    "fluent-ffmpeg": "^2.1.2"    // 视频缩略图生成 (可选)
  }
}
```

### 安装命令

```bash
# 核心依赖
npm install chokidar mime-types react-window

# TypeScript类型
npm install --save-dev @types/mime-types @types/react-window

# 可选依赖 (缩略图生成)
npm install sharp fluent-ffmpeg
```

---

## 五、文件清单

### 新建文件 (13个)

#### 主进程 (4个)
- `src/main/services/FileSystemService.ts` - 文件系统服务
- `src/main/protocols/local-file.ts` - 本地文件协议
- `src/shared/types/asset.ts` - 资产类型定义
- `tests/integration/asset-management.test.ts` - 集成测试

#### 渲染进程 (9个)
- `src/renderer/components/AssetCard/AssetCard.tsx` - 资产卡片
- `src/renderer/components/AssetCard/AssetCard.css` - 卡片样式
- `src/renderer/components/AssetGrid/AssetGrid.tsx` - 资产网格
- `src/renderer/components/AssetGrid/AssetGrid.css` - 网格样式
- `src/renderer/components/AssetPreview/AssetPreview.tsx` - 预览Modal
- `src/renderer/components/AssetPreview/AssetPreview.css` - 预览样式
- `src/renderer/pages/Assets/Assets.tsx` - Assets页面 (重构)
- `src/renderer/pages/Assets/Assets.css` - 页面样式
- `src/renderer/utils/file.ts` - 文件工具函数

### 修改文件 (4个)
- `src/main/services/AssetManager.ts` - 完善实现
- `src/main/ipc/handlers/asset.ts` - 完善IPC处理器
- `src/preload/index.ts` - 添加资产管理API
- `src/main/index.ts` - 注册本地文件协议

---

## 六、实施优先级

### P0 - 核心功能 (必须完成)
1. ✅ FileSystemService 实现
2. ✅ AssetManager 完善 (扫描、导入、删除)
3. ✅ 类型定义 (asset.ts)
4. ✅ IPC通信层
5. ✅ AssetCard 组件
6. ✅ Assets 页面重构
7. ✅ 基础样式

### P1 - 高优先级 (提升体验)
1. ✅ 虚拟滚动 (AssetGrid)
2. ✅ 文件监听 (chokidar)
3. ✅ 实时推送
4. ✅ 预览Modal
5. ✅ 本地文件协议

### P2 - 中优先级 (优化)
1. 缩略图生成
2. 元数据编辑
3. 批量操作
4. 性能优化

### P3 - 低优先级 (增强)
1. SQLite索引缓存
2. 标签管理
3. 分类管理
4. 高级搜索

---

## 七、潜在风险与解决方案

### 风险1: 大量文件扫描性能问题
**症状**: 扫描10000+文件导致UI卡顿
**解决方案**:
- 使用Worker线程异步扫描
- 分批返回结果 (每100个)
- 显示进度条

### 风险2: 文件监听器内存泄漏
**症状**: 长时间运行内存占用过高
**解决方案**:
- 页面卸载时停止监听
- 限制同时监听的目录数量
- 定期检查和清理无效watcher

### 风险3: 本地文件协议安全问题
**症状**: 可能访问敏感系统文件
**解决方案**:
- 路径规范化和验证
- 禁止 `..` 路径遍历
- 限制访问范围 (仅项目目录)

### 风险4: 跨平台路径兼容性
**症状**: Windows/macOS/Linux路径格式不同
**解决方案**:
- 统一使用 `path.normalize()`
- 存储相对路径而非绝对路径
- 测试三大平台

### 风险5: Sidecar元数据冲突
**症状**: 多进程同时写入导致数据丢失
**解决方案**:
- 使用文件锁 (lockfile)
- 写入前读取最新版本
- 原子写入 (先写临时文件再重命名)

---

## 八、验收标准

### 功能验收
- [ ] 全局资产库扫描和显示
- [ ] 项目资产库扫描和显示
- [ ] 导入功能 (单文件/多文件)
- [ ] 删除功能 (带确认)
- [ ] 搜索过滤
- [ ] 实时文件监听 (1秒内刷新)
- [ ] 预览功能 (图片/视频/音频)
- [ ] 元数据显示

### 性能验收
- [ ] 1000个资产加载 < 2秒
- [ ] 虚拟滚动流畅 (60fps)
- [ ] 文件变动响应 < 1秒
- [ ] 内存占用 < 500MB (10000个资产)

### 用户体验验收
- [ ] 界面美观，遵循V14设计系统
- [ ] 操作流畅，无明显卡顿
- [ ] 错误提示友好
- [ ] 支持中文文件名

### 代码质量验收
- [ ] 所有TypeScript类型完整
- [ ] 0个ESLint错误
- [ ] 核心功能有单元测试
- [ ] 中文注释完整

---

## 九、后续规划

### v0.3.1 增强
- 标签管理系统
- 自定义分类
- 批量编辑元数据
- 资产统计分析

### v0.4.0 高级功能
- 资产复用 (参考ai-playlet的AssetReuseService)
- AI智能标签
- 相似资产查找
- 资产导出

### v1.0.0 完善
- 云存储集成
- 资产分享
- 权限管理
- 多语言支持

---

## 十、总结

本实施计划基于对 ai-playlet-master 项目的深入调研，借鉴其成熟的文件管理模式，结合Matrix Studio的通用化需求，设计了一套完整的资产库解决方案。

**核心亮点**:
1. **高度通用**: 支持任意文件类型，不限定业务领域
2. **双作用域**: 全局资产库 + 项目资产库，平衡复用和隔离
3. **实时响应**: chokidar文件监听，1秒内自动刷新
4. **标准化Schema**: 预定义字段 + 插件扩展，兼顾规范和灵活性
5. **性能优化**: 虚拟滚动、内存缓存、异步扫描
6. **安全可靠**: 路径验证、级联删除、错误处理

**预计交付**:
- 工期: 5-7个工作日
- 功能完成度: 100% (P0+P1优先级)
- 代码质量: 生产就绪

实施过程中建议严格按照Phase 1 → Phase 2 → Phase 3的顺序进行，每个阶段完成后进行自测，确保质量。

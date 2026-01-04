# 核心服务设计文档 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 更新 | 明确服务数量（23个），精简冗余章节 |
| 1.0.1 | 2025-12-22 | 逻辑升级 | AssetManager作用域支持，AI属性，Plugin类型标识 |
| 1.0.0 | 2025-12-22 | 初始版本 | 创建核心服务设计文档 |

**全局要求**: 详见 [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## 服务概览（共23个）

### 1. 项目管理
- **ProjectManager**: CRUD、生命周期管理

### 2. 资产管理
- **AssetManager**: 全局/项目作用域、JSON索引、文件监听（chokidar）
- **GenericAssetHelper**: 资产查询和元数据操作
- **FileSystemService**: 统一文件系统操作

### 3. 工作流编排（Workbench模式）
- **WorkflowRegistry**: 工作流定义注册表
- **WorkflowStateManager**: 执行状态追踪
- **SchemaRegistry**: JSON Schema验证
- **TaskScheduler**: 任务队列和调度
- **AsyncTaskManager**: 异步任务协调

### 4. 插件系统
- **PluginManager**: 插件生命周期
- **PluginContext**: 上下文注入
- **PluginSandbox**: 安全隔离（vm2）
- **PluginMarketService**: 市场集成
- **ProjectPluginConfigManager**: 项目级插件配置

### 5. Provider管理
- **APIManager**: 统一Provider接口（BYOK）
- **ProviderRegistry**: Provider注册
- **ProviderRouter**: 智能路由
- **ModelRegistry**: AI模型注册表

### 6. 辅助服务
- **TimeService**: NTP同步
- **Logger**: 4级日志
- **ServiceErrorHandler**: 37个错误码
- **ConfigManager**: 应用配置
- **TemplateManager**: 模板管理
- **ShortcutManager**: 快捷键管理
- **AIService**: AI服务协调

---

## 核心接口

### AssetManager

```typescript
interface AssetManager {
  // 添加资产（指定作用域）
  addAsset(
    scope: 'global' | 'project',
    containerId: string,
    data: AssetData
  ): Promise<AssetMetadata>

  // 提升项目资产到全局库
  promoteAssetToGlobal(
    projectId: string,
    assetId: string
  ): Promise<AssetMetadata>

  // 查询（带过滤器）
  searchAssets(filter: AssetFilter): Promise<AssetScanResult>
}
```

**AssetMetadata**（关键字段）：
- `scope`: 'global' | 'project'
- `uri`: `asset://` URI
- `customFields`: 插件可扩展字段，用于存储AI属性

**AI属性**（在customFields中）：
- `baseModelHash`、`baseModelName`
- `loraRefs`: [{ name, strength, hash }]
- `triggerWords`: string[]
- `seed`、`cfgScale`、`sampler`
- `positivePrompt`、`negativePrompt`

### PluginManager

```typescript
interface PluginManifest {
  id: string
  name: string
  version: string
  type: 'official' | 'partner' | 'community'  // 权限等级
  verificationSignature?: string              // 官方插件验证
  permissions: PluginPermission[]
}

type PluginPermission =
  | 'file-system:read'
  | 'file-system:write'
  | 'network:any'
  | 'network:official-api'
  | 'shell:exec'
```

---

## 错误处理

```typescript
interface ServiceError {
  code: ErrorCode          // 37个错误码之一
  message: string
  service: string
  operation: string
  timestamp: Date
  details?: any
}
```

---

## IPC通道

### 资产管理
```typescript
'asset:upload'
'asset:delete'
'asset:list'
'asset:metadata'
```

### 全局库管理（通过asset:*，指定scope）
- 使用 `AssetFilter.scope: 'global'` 查询全局库
- `AssetManager.promoteAssetToGlobal()` 进行提升

---

**English Version**: `docs/en/06-core-services-design-v1.1.0.md`

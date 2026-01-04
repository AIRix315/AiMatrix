# Core Services Design v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Update | Clarified service count (23), removed redundant sections |
| 1.0.1 | 2025-12-22 | Logic Upgrade | AssetManager scope support, AI attributes, Plugin type flag |
| 1.0.0 | 2025-12-22 | Initial | Created core services design document |

**Time Handling**: See [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## Service Overview (23 Total)

### 1. Project Management
- **ProjectManager**: CRUD, lifecycle management

### 2. Asset Management
- **AssetManager**: Global/Project scope, JSON index, file watcher (chokidar)
- **GenericAssetHelper**: Asset query and metadata operations
- **FileSystemService**: Unified file system operations

### 3. Workflow Orchestration (Workbench Pattern)
- **WorkflowRegistry**: Workflow definition registry
- **WorkflowStateManager**: Execution state tracking
- **SchemaRegistry**: JSON Schema validation
- **TaskScheduler**: Task queue and scheduling
- **AsyncTaskManager**: Async task coordination

### 4. Plugin System
- **PluginManager**: Plugin lifecycle
- **PluginContext**: Context injection
- **PluginSandbox**: Security isolation (vm2)
- **PluginMarketService**: Marketplace integration
- **ProjectPluginConfigManager**: Per-project plugin config

### 5. Provider Management
- **APIManager**: Unified Provider interface (BYOK)
- **ProviderRegistry**: Provider registration
- **ProviderRouter**: Intelligent routing
- **ModelRegistry**: AI model registry

### 6. Supporting Services
- **TimeService**: NTP sync
- **Logger**: 4-level logging
- **ServiceErrorHandler**: 37 error codes
- **ConfigManager**: App configuration
- **TemplateManager**: Template management
- **ShortcutManager**: Keyboard shortcuts
- **AIService**: AI service coordination

---

## Key Interfaces

### AssetManager

```typescript
interface AssetManager {
  // Add asset with scope
  addAsset(
    scope: 'global' | 'project',
    containerId: string,
    data: AssetData
  ): Promise<AssetMetadata>

  // Promote project asset to global
  promoteAssetToGlobal(
    projectId: string,
    assetId: string
  ): Promise<AssetMetadata>

  // Query with filter
  searchAssets(filter: AssetFilter): Promise<AssetScanResult>
}
```

**AssetMetadata** (Key Fields):
- `scope`: 'global' | 'project'
- `uri`: `asset://` URI
- `customFields`: Plugin-extensible fields for AI attributes

**AI Attributes** (in customFields):
- `baseModelHash`, `baseModelName`
- `loraRefs`: [{ name, strength, hash }]
- `triggerWords`: string[]
- `seed`, `cfgScale`, `sampler`
- `positivePrompt`, `negativePrompt`

### PluginManager

```typescript
interface PluginManifest {
  id: string
  name: string
  version: string
  type: 'official' | 'partner' | 'community'  // Permission level
  verificationSignature?: string              // Official plugin verification
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

## Error Handling

```typescript
interface ServiceError {
  code: ErrorCode          // 1 of 37 codes
  message: string
  service: string
  operation: string
  timestamp: Date
  details?: any
}
```

---

## IPC Channels

### Asset Management
```typescript
'asset:upload'
'asset:delete'
'asset:list'
'asset:metadata'
```

### Library Management (via asset:* with scope)
- Use `AssetFilter.scope: 'global'` for global library queries
- `AssetManager.promoteAssetToGlobal()` for promotion

---

**中文版本**: `docs/06-core-services-design-v1.1.0.md`

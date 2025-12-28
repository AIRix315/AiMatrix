# 设计规范 vs 实际实现对比分析

**生成时间**: 2025-12-29
**目的**: 对比 docs/ 设计文档与实际代码实现，为准确编写测试用例提供依据

---

## 1. ProjectManager

### 设计文档要求（docs/02 & docs/06）
```typescript
interface ProjectManager {
  createProject(name: string, template?: string): Promise<ProjectConfig>
  loadProject(projectId: string): Promise<ProjectConfig>
  saveProject(config: ProjectConfig): Promise<void>
  deleteProject(projectId: string): Promise<void>
  listProjects(): Promise<ProjectConfig[]>
  // 新增 (docs/06)
  linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void>
  getLinkedAssets(projectId: string): Promise<AssetConfig[]>
}
```

### 实际实现（src/main/services/ProjectManager.ts）
```typescript
✅ initialize(): Promise<void>
✅ cleanup(): Promise<void>
✅ createProject(name: string, template?: string): Promise<ProjectConfig>
✅ loadProject(projectId: string): Promise<ProjectConfig>
⚠️  saveProject(projectId: string, config: ProjectConfig): Promise<void>  // 多了projectId参数
✅ addInputAsset(projectId: string, assetId: string): Promise<void>
✅ addOutputAsset(projectId: string, assetId: string): Promise<void>
✅ deleteProject(projectId: string, deleteOutputs: boolean = false): Promise<void>  // 多了deleteOutputs参数
✅ listProjects(): Promise<ProjectConfig[]>
✅ linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void>
✅ getLinkedAssets(projectId: string): Promise<AssetConfig[]>
```

**差异分析**：
1. ✅ `saveProject` 签名不同：设计要求只有config参数，实际有projectId + config
2. ✅ 新增了 `addInputAsset` 和 `addOutputAsset` 方法（符合Phase 9 H0.1需求）
3. ✅ `deleteProject` 增加了 `deleteOutputs` 参数（符合H0.1安全删除需求）
4. ✅ 实现了 `linkGlobalAsset` 和 `getLinkedAssets`（符合docs/06新增要求）

**测试策略**：测试用例应遵循实际实现的签名，不是设计文档的旧签名

---

## 2. AssetManager

### 设计文档要求（docs/06 v1.0.1）
```typescript
interface AssetManager {
  addAsset(target: { scope: 'project' | 'global'; id: string }, assetData: AssetData): Promise<AssetConfig>
  getAsset(scope: 'project' | 'global', containerId: string, assetId: string): Promise<AssetConfig>
  promoteAssetToGlobal(projectId: string, assetId: string, category: string): Promise<AssetConfig>
}
```

### 实际实现（src/main/services/AssetManager.ts）
```typescript
✅ initialize(): Promise<void>
✅ cleanup(): Promise<void>
✅ buildIndex(projectId?: string): Promise<AssetIndex>
✅ getIndex(projectId?: string): Promise<AssetIndex>
✅ updateIndex(projectId?: string): Promise<void>
✅ scanAssets(filter: AssetFilter): Promise<AssetScanResult>
✅ getMetadata(filePath: string): Promise<AssetMetadata | null>
✅ updateMetadata(filePath: string, metadata: Partial<AssetMetadata>): Promise<void>
✅ getAssetReferences(assetId: string): Promise<string[]>
✅ importAsset(params: AssetImportParams): Promise<AssetMetadata>
✅ deleteAsset(filePath: string, deleteMetadata = true): Promise<void>
✅ startWatching(projectId?: string): Promise<void>
✅ stopWatching(projectId?: string): Promise<void>
✅ createSceneAsset(params: {...}): Promise<AssetMetadata>
✅ createCharacterAsset(params: {...}): Promise<AssetMetadata>
✅ searchScenes(filter: {...}): Promise<AssetScanResult>
✅ searchCharacters(filter: {...}): Promise<AssetScanResult>
```

**差异分析**：
1. ❌ 缺少 `addAsset(target, assetData)` - 但有 `importAsset(params)` 作为替代
2. ❌ 缺少 `getAsset(scope, containerId, assetId)` - 但有 `getMetadata(filePath)` 作为替代
3. ❌ 缺少 `promoteAssetToGlobal()` 方法
4. ✅ 实现了索引系统（buildIndex, getIndex, updateIndex）
5. ✅ 实现了文件监听（startWatching, stopWatching）
6. ✅ 实现了场景/角色专用管理（createSceneAsset, searchScenes等）

**测试策略**：
- 测试实际存在的方法（不测试不存在的addAsset/getAsset/promoteAssetToGlobal）
- 重点测试索引、查询、监听功能
- 测试场景/角色customFields功能

---

## 3. PluginManager

### 设计文档要求（docs/02 & docs/06）
```typescript
interface PluginManager {
  loadPlugin(pluginId: string): Promise<Plugin>
  unloadPlugin(pluginId: string): Promise<void>
  installPlugin(pluginPackage: PluginPackage): Promise<void>
  uninstallPlugin(pluginId: string): Promise<void>
  listPlugins(): Promise<PluginInfo[]>
  executePluginAction(pluginId: string, action: string, params: any): Promise<any>
  // 新增 (docs/06)
  listPlugins(type?: 'official' | 'community'): Promise<PluginInfo[]>
  verifySignature(pluginId: string): Promise<boolean>
}
```

### 实际实现（src/main/services/PluginManager.ts）
```typescript
✅ initialize(): Promise<void>
✅ loadPlugin(pluginId: string): Promise<PluginInfo>  // 返回值不同
✅ unloadPlugin(pluginId: string): Promise<void>
⚠️  executePlugin(pluginId: string, action: string, params: unknown): Promise<unknown>  // 方法名不同
✅ listPlugins(type?: PluginType): Promise<PluginInfo[]>
⚠️  togglePlugin(pluginId: string, enabled: boolean): Promise<void>  // 不是enable/disable
✅ installPluginFromZip(zipPath: string): Promise<string>
✅ cleanup(): Promise<void>
```

**差异分析**：
1. ⚠️  `executePluginAction` vs `executePlugin` - 方法名不同
2. ❌ 没有独立的 `installPlugin/uninstallPlugin`，只有 `installPluginFromZip`
3. ⚠️  使用 `togglePlugin(id, enabled)` 而不是 `enablePlugin/disablePlugin`
4. ❌ 缺少 `verifySignature()` 方法

**测试策略**：
- ❌ **我的测试错误**：写了 `enablePlugin/disablePlugin`，应该用 `togglePlugin`
- 测试 `executePlugin` 而不是 `executePluginAction`
- 不测试不存在的 `verifySignature`

---

## 4. TaskScheduler

### 设计文档要求（docs/02）
```typescript
interface TaskScheduler {
  createTask(config: TaskConfig): Promise<string>
  executeTask(taskId: string): Promise<string>
  pauseTask(taskId: string): Promise<void>
  resumeTask(taskId: string): Promise<void>
  cancelTask(taskId: string): Promise<void>
  getTaskStatus(taskId: string): Promise<TaskStatus>
  getTaskResults(taskId: string): Promise<TaskResults>
  // 新增 (docs/06)
  estimateCost(taskConfig: TaskConfig): Promise<{...}>
}
```

### 实际实现（src/main/services/TaskScheduler.ts）
```typescript
✅ initialize(): Promise<void>
✅ createTask(config: TaskConfig): Promise<string>
⚠️  executeTask(taskId: string, inputs?: unknown): Promise<string>  // 返回executionId，不是taskId
⚠️  getTaskStatus(executionId: string): Promise<TaskExecution>  // 参数是executionId！
⚠️  cancelTask(executionId: string): Promise<void>  // 参数是executionId！
✅ getTaskResults(executionId: string): Promise<unknown>
✅ listTasks(): Promise<Task[]>
✅ getTask(taskId: string): Promise<Task>
✅ getExecution(executionId: string): Promise<TaskExecution | null>
✅ cancelExecution(executionId: string): Promise<void>
✅ cleanup(): Promise<void>
```

**差异分析**：
1. ⚠️  **核心概念不同**：设计文档混淆了 Task 和 Execution 概念
   - **Task** = 任务配置（可以执行多次）
   - **Execution** = 某次执行实例
2. ⚠️  `executeTask` 返回的是 `executionId`，不是 `taskId`
3. ⚠️  `getTaskStatus(executionId)` - 实际是获取执行状态，不是任务状态
4. ❌ 缺少 `pauseTask/resumeTask`
5. ❌ 缺少 `estimateCost`

**测试策略**：
- ❌ **我的测试错误**：写了 `getExecutionStatus`，应该用 `getTaskStatus`（虽然名字有误导性）
- ❌ **我的测试错误**：写了 `listExecutions`，但该方法不存在
- 正确理解：一个Task可以有多个Execution
- 应该测试 Task 和 Execution 的关系

---

## 5. APIManager

### 设计文档要求（docs/02 & docs/06）
```typescript
interface APIManager {
  registerAPI(name: string, config: APIConfig): void
  callAPI(name: string, params: any): Promise<any>
  setAPIKey(name: string, key: string): void
  getAPIStatus(name: string): Promise<APIStatus>
}

interface APIProviderConfig {  // docs/06 新增
  id: string
  name: string
  type: 'cloud' | 'local'
  baseUrl: string
  authType: 'bearer' | 'apikey' | 'none'
  costPerUnit?: number
}
```

### 实际实现（src/main/services/APIManager.ts）
```typescript
// 旧版API（向后兼容）
✅ registerAPI(name: string, config: APIConfig): Promise<void>
✅ setAPIKey(name: string, apiKey: string): Promise<void>
✅ getAPIConfig(name: string): Promise<APIConfig>
✅ callAPI(name: string, params: APICallParams): Promise<unknown>
✅ getAPIStatus(name: string): Promise<APIStatus>
✅ listAPIs(): Promise<APIConfig[]>
✅ removeAPI(name: string): Promise<void>

// v2.0 新版Provider API
✅ addProvider(config: APIProviderConfig): Promise<void>
✅ removeProvider(providerId: string): Promise<void>
✅ getProvider(providerId: string): Promise<APIProviderConfig>
✅ listProviders(filter?: {...}): Promise<APIProviderConfig[]>
✅ getProviderStatus(providerId: string): Promise<APIProviderStatus>
✅ testProviderConnection(providerId: string, params?: {...}): Promise<ConnectionTestResult>
```

**差异分析**：
1. ✅ 实现了设计文档的基础API
2. ✅ 新增了 v2.0 Provider 系统（符合Phase 9 H2.8要求）
3. ✅ 支持多Provider、按category分类
4. ✅ 实现了API密钥加密（Phase 9 H2.14）

**测试策略**：
- 测试新版Provider API（addProvider, listProviders等）
- 测试加密功能
- 测试多Provider支持

---

## 总结：我的测试用例错误清单

### 必须修正的错误：

1. **PluginManager.test.ts**
   - ❌ `enablePlugin()` → ✅ `togglePlugin(id, true)`
   - ❌ `disablePlugin()` → ✅ `togglePlugin(id, false)`

2. **TaskScheduler.test.ts**
   - ❌ `getExecutionStatus(id)` → ✅ `getTaskStatus(executionId)`
   - ❌ `listExecutions(taskId)` → ❌ 该方法不存在，应删除相关测试

3. **Mock配置问题**
   - Logger.info() 等方法应返回 `Promise.resolve()`，而不是 `undefined`
   - APIKeyEncryption 初始化顺序问题

### 不应测试的功能（设计文档有但实际未实现）：
- AssetManager.promoteAssetToGlobal()
- PluginManager.verifySignature()
- TaskScheduler.pauseTask/resumeTask()
- TaskScheduler.estimateCost()

---

## 下一步行动计划

1. ✅ 已完成：阅读设计文档
2. ⏭️  修正测试用例中的方法名错误
3. ⏭️  删除测试不存在的方法
4. ⏭️  修复Mock配置问题
5. ⏭️  运行测试，达到95%通过率
6. ⏭️  根据测试发现的问题，决定是否需要补充服务实现

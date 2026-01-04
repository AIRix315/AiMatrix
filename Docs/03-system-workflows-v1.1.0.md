# 系统工作流规范 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 初始版本 | 基于99号规范的系统级操作流程 |

**全局要求**: 详见 [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## 概述

系统工作流定义核心操作的标准操作程序（SOP）。这些是**数据流**和**模块协调模式**，而非步骤化执行模板。

---

## 工作流 I: 资产导入（Asset Ingestion）

**目的**: 将外部文件导入全局库并分配 `asset://` URI。

### 流程

```
1. 用户拖入文件 → FileSystemService.copyToGlobalLibrary()
2. 生成唯一 asset_id (UUID)
3. AssetManager.addAsset(scope: 'global', ...)
4. 写入元数据到 index.json
5. 广播IPC事件: 'event:asset:added'
6. UI更新全局库视图
```

### 实现

**服务**: AssetManager + FileSystemService

**IPC通道**:
- `asset:upload` (渲染进程 → 主进程)
- `event:asset:added` (主进程 → 渲染进程)

**数据流**:
```
外部文件 (file://)
  ↓ [复制]
全局库 (asset://global/{type}/{YYYYMMDD}/{filename})
  ↓ [索引]
index.json (AssetMetadata)
  ↓ [事件]
UI更新
```

---

## 工作流 II: 插件执行（"契约"流程）

**目的**: 执行插件，验证Provider能力并保证原子事务。

### 流程（Workbench模式）

```
1. 用户在项目(X)中选择插件(P)
2. [预检查] ProviderRouter验证:
   - ProviderRegistry是否有满足P.requirements的活跃Provider?
3. 如果是，TaskScheduler创建TaskRunner
4. [上下文注入] PluginContext提供:
   - 解析后的 asset:// → 操作系统路径
   - 输出目标: {project}/outputs/
5. [请求路由] ProviderRouter转发到特定Provider
6. Provider返回数据 → FileSystemService写入磁盘
7. [原子事务] 仅在文件写入成功后:
   - AssetManager.addAsset(scope: 'project', ...)
   - ProjectManager.updateIndex()
8. 广播IPC事件: 'event:workflow:completed'
```

### 协调服务（Workbench）

- **ProviderRouter**: 预检查 + 请求路由
- **TaskScheduler**: 任务队列管理
- **PluginContext**: 上下文注入
- **AssetManager**: 原子事务协调

### 错误处理

**失败时清理**:
```typescript
try {
  const filePath = await provider.execute(params);
  await assetManager.addAsset({ filePath, ... }); // 仅当文件存在时
} catch (error) {
  await fileSystemService.deleteFile(filePath); // 清理孤立文件
  throw error;
}
```

---

## 工作流 III: 项目生命周期

**目的**: 创建、加载、保存和删除项目，维护资产引用完整性。

### 流程: 创建项目

```
1. ProjectManager.createProject(name)
2. FileSystemService创建目录:
   - {workspace}/projects/{project-id}/
   - {workspace}/projects/{project-id}/materials/inputs/
   - {workspace}/projects/{project-id}/materials/outputs/
   - {workspace}/projects/{project-id}/workflows/
3. 写入project.json（含元数据）
4. 返回ProjectConfig
```

### 流程: 加载项目

```
1. ProjectManager.loadProject(projectId)
2. 读取project.json
3. 验证资产引用（asset:// URIs）
4. 从{project}/workflows/加载工作流状态
5. 返回ProjectConfig + WorkflowState[]
```

### 流程: 删除项目

```
1. ProjectManager.deleteProject(projectId)
2. 检查全局资产依赖
3. 递归删除项目目录
4. 更新最近项目列表
```

---

## 工作流 IV: 资产提升

**目的**: 将项目作用域资产提升到全局库以实现跨项目复用。

### 流程

```
1. 用户选择项目资产 → "提升到全局库"
2. AssetManager.promoteAssetToGlobal(projectId, assetId)
3. FileSystemService复制文件:
   {project}/outputs/file.png → {library}/global/image/{date}/file.png
4. AssetManager创建全局AssetMetadata（新UUID）
5. 更新project.json: 添加全局资产引用
6. 广播事件: 'event:asset:promoted'
```

**URI转换**:
```
asset://project/{project-id}/outputs/file.png
  ↓ [提升]
asset://global/image/20260104/file.png
```

---

## 协调规则

### 并发控制

**写前锁（WAL）**用于 `project.json` 更新：
```typescript
// 顺序队列防止竞态条件
const updateQueue = new AsyncQueue();
await updateQueue.enqueue(() => projectManager.saveProject(config));
```

### 解耦规则

**PluginSystem 禁止直接导入 ProviderHub**。所有通信必须通过Workbench（ProviderRouter + TaskScheduler）代理。

### 路径安全

**禁止存储绝对路径**。使用：
- `asset://` URIs（优先）
- 从工作区根目录的相对路径

### 幂等性

重复运行相同任务不应创建重复索引条目（如果输出文件未变）：
```typescript
// 添加到索引前检查文件哈希
const existingAsset = await assetManager.findByHash(fileHash);
if (existingAsset) return existingAsset;
```

---

## 参考实现

- **资产导入**: `src/main/services/AssetManager.ts:addAsset()`
- **插件执行**: `src/main/services/ProviderRouter.ts:route()`
- **项目生命周期**: `src/main/services/ProjectManager.ts`

---

**English Version**: `docs/en/03-system-workflows-v1.1.0.md`

# 核心服务设计文档 v1.0.0
## 版本记录
| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-22 | 初始版本 | 创建核心服务设计文档 |
| 1.0.1 | 2025-12-22 | 逻辑升级 | **AssetManager 增加 Scope 支持全局库**；**AssetMetadata 增加 AI 属性**；**PluginManifest 增加 Official/UGC 标识** |

## 全局要求
**重要提醒：本文档遵循全局时间处理要求，任何涉及时间的操作必须先查询系统时间或使用MCP服务确认后方可执行。详细规范请参考 [00-global-requirements-v1.0.0.md](00-global-requirements-v1.0.0.md)**

## 一 核心服务架构

### 1. 项目管理器 (ProjectManager)

#### 1.1 职责
- 管理项目生命周期
- **维护项目与全局库的引用关系**

#### 1.2 核心接口更新
```typescript
interface ProjectManager {
  // ... 原有接口保持不变
  
  // [新增] 引用管理
  linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void>
  getLinkedAssets(projectId: string): Promise<AssetConfig[]>
}
```

### 2. 物料管理器 (AssetManager) - [核心升级]

#### 2.1 职责
- 统一管理“项目私有资产”与“全局复用资产”
- 维护 AI 生成所需的元数据（Prompt, Seed, LoRA等）

#### 2.2 核心接口
```TYPESCRIPT
interface AssetManager {
  // [修改] 增加 scope 参数，区分是存入当前项目还是存入全局库
  addAsset(
    target: { scope: 'project' | 'global'; id: string }, // id为projectId或libraryCategoryId
    assetData: AssetData
  ): Promise<AssetConfig>
  // [修改] 增加 scope 参数
  getAsset(scope: 'project' | 'global', containerId: string, assetId: string): Promise<AssetConfig>
  
  // [新增] 资产提升：将项目私有资产升级为全局资产
  promoteAssetToGlobal(projectId: string, assetId: string, category: string): Promise<AssetConfig>
  
  // ... 其他接口
}
```

#### 2.3 数据模型更新 (关键商业逻辑)
```TYPESCRIPT
interface AssetConfig {
  id: string
  scope: 'project' | 'global'  // [新增] 作用域
  type: 'text' | 'image' | 'video' | 'audio' | 'model' | 'workflow'
  path: string
  metadata: AssetMetadata
  aiAttributes?: AIAssetAttributes // [新增] AI 专用属性
  tags: string[]
  // ...
}
// [新增] AI 专用属性 - 复用的关键
interface AIAssetAttributes {
  baseModelHash?: string       // 底模 Hash
  baseModelName?: string       // 底模名称 (如 Sora2, SDXL)
  loraRefs?: {                 // LoRA 引用
    name: string
    strength: number
    hash: string
  }[]
  triggerWords?: string[]      // 触发词 (拖入即自动填入Prompt)
  seed?: number                // 种子
  cfgScale?: number
  sampler?: string
  positivePrompt?: string      // 正向提示词
  negativePrompt?: string      // 负向提示词
  generationParams?: any       // 完整生成参数包 (JSON)
}
interface AssetMetadata {
  // 传统媒体属性
  duration?: number
  dimensions?: { width: number; height: number }
  // ...
}
```

### 3. 插件管理器 (PluginManager) - [核心升级]

#### 3.1 职责
- 区分 Official (官方) 与 Community (社区) 插件的权限与展示
- 插件沙箱执行环境

#### 3.2 数据模型更新
```TYPESCRIPT
interface PluginManifest {
  id: string
  name: string
  version: string
  // [新增] 插件类型：决定权限等级和展示权重
  type: 'official' | 'partner' | 'community' 
  // [新增] 官方签名：用于验证 Official 插件未被篡改
  verificationSignature?: string
  
  description: string
  author: string
  permissions: PluginPermission[] // 细化权限列表
  // ...
}
type PluginPermission = 
  | 'file-system:read' 
  | 'file-system:write' 
  | 'network:any' 
  | 'network:official-api' 
  | 'shell:exec'
```

#### 3.3 核心接口
```TYPESCRIPT
interface PluginManager {
  // ... 原有接口
  
  // [新增] 根据类型获取插件列表
  listPlugins(type?: 'official' | 'community'): Promise<PluginInfo[]>
  
  // [新增] 验证插件签名
  verifySignature(pluginId: string): Promise<boolean>
}
```

### 4. 任务调度器 (TaskScheduler)

#### 4.1 职责
- 支持 BYOK (Bring Your Own Key) 模式的任务分发
- 智能路由 (Smart Routing)

#### 4.2 核心接口
```TYPESCRIPT
interface TaskScheduler {
  // ... 原有接口
  
  // [新增] 成本估算
  estimateCost(taskConfig: TaskConfig): Promise<{
    provider: string,
    estimatedCost: number,
    currency: string
  }>
}
```

### 5. API调用管理器 (APIManager)

#### 5.1 职责
- 外部API统一接口
- 支持多供应商切换 (BYOK)

#### 5.2 数据模型
```TYPESCRIPT
interface APIProviderConfig {
  id: string
  name: string      // e.g., "OpenAI", "Runway", "Local-ComfyUI"
  type: 'cloud' | 'local'
  baseUrl: string
  authType: 'bearer' | 'apikey' | 'none'
  costPerUnit?: number // 用于成本估算
}
```

#### 5.3 服务间通信
（保持原有设计，增加 LIBRARY 相关通道）

```TYPESCRIPT
// 全局库管理
export const LIBRARY_CHANNELS = {
  ADD: 'library:add',
  GET: 'library:get',
  PROMOTE: 'library:promote', // 项目资产 -> 全局资产
  LIST: 'library:list'
}
```
## 二 错误处理与日志

### 统一错误处理
```typescript
interface ServiceError {
  code: string
  message: string
  details?: any
  timestamp: Date
  service: string
  operation: string
}

class ServiceErrorHandler {
  static handleError(error: ServiceError): void
  static logError(error: ServiceError): void
  static reportError(error: ServiceError): Promise<void>
  static getUserFriendlyMessage(error: ServiceError): string
}
```

### 日志系统
```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: Date
  service: string
  operation?: string
  data?: any
}

class Logger {
  static debug(message: string, data?: any): void
  static info(message: string, data?: any): void
  static warn(message: string, data?: any): void
  static error(message: string, error?: Error): void
}
```

## 2性能优化策略

### 1. 插件按需加载
- 延迟加载插件，减少启动时间
- 插件预编译，提高执行效率
- 插件资源池管理，避免重复加载

### 2. API调用优化
- 请求合并，减少网络开销
- 响应缓存，避免重复请求
- 智能重试，提高成功率

### 3. 任务执行优化
- 并行执行独立任务
- 智能调度，优化资源使用
- 结果缓存，避免重复计算

### 4. 内存管理
- 定期清理未使用的资源
- 流式处理大文件
- 分块加载大型数据集

## 安全性设计

### 1. 插件安全
- 插件沙箱执行环境
- API权限控制
- 代码签名验证
- 恶意行为检测

### 2. API安全
- 密钥加密存储
- 请求签名验证
- 响应数据验证
- 访问日志记录

### 3. 数据安全
- 敏感数据加密
- 文件访问控制
- 数据备份机制
- 隐私保护措施

## 扩展性设计

### 1. 插件生态系统
- 标准化插件接口
- 插件开发工具包
- 插件市场平台
- 社区贡献机制

### 2. API集成
- 标准化API接口
- 自定义API适配器
- API配置管理
- 第三方服务集成

### 3. 任务扩展
- 自定义任务类型
- 任务模板市场
- 任务配置界面
- 批处理支持

## 测试策略

### 1. 单元测试
- 每个服务的核心功能
- 边界条件测试
- 错误处理测试
- 性能基准测试

### 2. 集成测试
- 服务间通信测试
- 插件加载测试
- API调用测试
- 任务执行测试

### 3. 端到端测试
- 完整用户流程
- 跨平台兼容性
- 性能压力测试
- 安全性测试

## 三 安全性设计 (针对 UGC 的增强)

###1. 插件分级沙箱
Official 插件：运行在主进程或拥有完全 Node.js 访问权限的子进程中。
Community 插件：运行在受限的 QuickJS 或 V8 沙箱中，禁止访问非白名单的文件路径和网络域名。

### 2. 资产防污染
全局库 (Library) 的写权限默认仅对用户本人开放，插件若需写入全局库需经过用户明确授权。

-扩展性设计
1. 资产包 (Asset Bundle) 格式
定义标准 .matrix 文件格式，允许用户将 Library 中的一组资产（如：一套角色LoRA + 对应的Prompt预设）打包导出/导入，便于在社群中交易。
# MATRIX Studio 通用插件平台改造计划

## 核心目标

构建**通用插件平台**，支持：
1. 任意步骤数量的插件（2步、5步、10步...）
2. 工作流编辑器 → 插件的转换机制
3. 同一步骤内的批量并行处理（优于N8N/Dify的串行模式）
4. 模板化组件系统（文生图、图生图、图生视频、文生音频）
5. 重试机制和失败补全

## 架构定位澄清

**小说转视频** = 通用插件平台的**第一个参考实现**，而非特例。

---

## 一、当前架构评估（基于代码探索）

### 1.1 已实现的功能 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| WorkflowExecutor动态步骤 | ✅ 完整 | 支持任意数量步骤，通过`definition.steps`数组 |
| 工作流编辑器 | ✅ 完整 | 基于@xyflow/react，支持节点拖拽和连接 |
| 插件系统 | ✅ 完整 | PluginManager、manifest.json、生命周期钩子 |
| 状态管理 | ✅ 完整 | WorkflowStateManager持久化到文件系统 |
| Schema验证 | ✅ 完整 | SchemaRegistry + JSON Schema |
| 时间规范 | ✅ 完整 | TimeService统一时间处理 |

### 1.2 核心缺失的功能 ❌

| 功能 | 状态 | 影响 |
|------|------|------|
| **动态组件注册** | ❌ 缺失 | componentMap硬编码，无法运行时扩展 |
| **工作流→插件转换** | ❌ 缺失 | 无法将编辑器创建的工作流打包成插件 |
| **TaskScheduler批处理** | ❌ 缺失 | 不支持10个分镜同时生成 |
| **重试机制** | ❌ 缺失 | 任务失败后无法自动重试 |
| **失败补全** | ❌ 缺失 | 无法恢复中断的批量任务 |
| **模板组件库** | ⚠️ 部分 | 5个面板存在但未抽象为模板 |

---

## 二、架构设计方案

### 2.1 核心理念

```
工作流编辑器 (@xyflow/react)
  ↓ 用户拖拽InputNode、ExecuteNode、OutputNode
  ↓ 定义节点连接和参数
  ↓ 保存为 WorkflowDefinition
  ↓
  ↓ 【打包转换工具】（核心要实现）
  ↓
  ↓ 生成插件包:
  ↓   - manifest.json（自动生成）
  ↓   - 业务逻辑服务（代码生成）
  ↓   - Schema定义（自动提取）
  ↓   - 前端组件（模板化）
  ↓
插件 (Plugin)
  ↓ PluginManager加载
  ↓ WorkflowExecutor通用执行引擎
  ↓ 使用模板化Panel组件（文生图/图生图/图生视频/文生音频）
  ↓ TaskScheduler批量调度（支持并行/重试/补全）
  ↓
执行结果
```

### 2.2 关键设计决策

#### 决策1：插件 vs 工作流定位

**工作流（Workflow）**：
- 定位：用户在编辑器中自由组装的流程
- 用途：快速原型、实验、一次性任务
- 执行：图形化编辑器界面
- 分享：不支持（或导出为JSON）

**插件（Plugin）**：
- 定位：打包后的完整产品
- 用途：固定流程、可重复使用、可分发
- 执行：专用执行器（WorkflowExecutor）
- 分享：ZIP打包 + 插件市场

**转换关系**：
```
工作流 (可编辑) --打包--> 插件 (固定流程)
```

#### 决策2：组件系统设计

**模板化组件库**：

| 模板类型 | 小说转视频中的名称 | 其他插件可能的名称 | 复用性 |
|---------|------------------|------------------|--------|
| 文生图 | ChapterSplitPanel | PromptToImagePanel | 高 |
| 图生图 | SceneCharacterPanel | ImageVariationPanel | 高 |
| 图生视频 | StoryboardPanel | Image2VideoPanel | 高 |
| 文生音频 | VoiceoverPanel | Text2SpeechPanel | 高 |
| 导出 | ExportPanel | ExportPanel | 通用 |

**组件注册机制**（需实现）：
```typescript
class TemplateComponentRegistry {
  // 注册模板组件
  register(type: string, component: ComponentTemplate)

  // 实例化组件（传入配置）
  instantiate(type: string, config: ComponentConfig): React.ComponentType

  // 列出所有模板
  list(): TemplateInfo[]
}
```

#### 决策3：并行执行架构

**TaskScheduler增强**（需实现）：

```typescript
class EnhancedTaskScheduler {
  // 批量执行（并行）
  executeBatch(tasks: Task[], options: {
    maxConcurrency: number  // 最大并发数（如10）
    retryPolicy: RetryPolicy // 重试策略
    onProgress: (completed, total) => void
  }): Promise<BatchResult>

  // 失败补全
  resumeBatch(batchId: string): Promise<BatchResult>

  // 重试单个任务
  retryTask(taskId: string, maxRetries: number): Promise<TaskResult>
}
```

**重试策略**：
```typescript
interface RetryPolicy {
  maxRetries: 3           // 最多重试3次
  backoff: 'exponential'  // 指数退避（1s, 2s, 4s）
  retryableErrors: [      // 可重试的错误类型
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMIT'
  ]
}
```

---

## 三、核心改造任务

### 3.1 任务1：动态组件注册系统（P0）

**目标**：解除componentMap硬编码限制

**实现**：

#### 文件：`src/renderer/utils/ComponentRegistry.ts`（新建）

```typescript
/**
 * 动态组件注册表
 * 解决componentMap硬编码问题
 */
export class ComponentRegistry {
  private components: Map<string, React.ComponentType<any>> = new Map()

  /**
   * 注册组件
   * @param type 组件类型标识（如"ChapterSplitPanel"）
   * @param component React组件
   */
  register(type: string, component: React.ComponentType<any>): void {
    if (this.components.has(type)) {
      console.warn(`Component ${type} already registered, overwriting`)
    }
    this.components.set(type, component)
  }

  /**
   * 获取组件
   * @param type 组件类型标识
   * @returns React组件或undefined
   */
  get(type: string): React.ComponentType<any> | undefined {
    return this.components.get(type)
  }

  /**
   * 批量注册（插件激活时调用）
   */
  registerBatch(components: Record<string, React.ComponentType<any>>): void {
    Object.entries(components).forEach(([type, component]) => {
      this.register(type, component)
    })
  }

  /**
   * 卸载组件（插件卸载时调用）
   */
  unregister(type: string): void {
    this.components.delete(type)
  }

  /**
   * 列出所有已注册组件
   */
  list(): string[] {
    return Array.from(this.components.keys())
  }
}

// 全局单例
export const componentRegistry = new ComponentRegistry()

// 初始化时注册内置组件
componentRegistry.registerBatch({
  ChapterSplitPanel,
  SceneCharacterPanel,
  StoryboardPanel,
  VoiceoverPanel,
  ExportPanel,
  RemoteControlPanel
})
```

#### 文件：`src/renderer/pages/workflows/WorkflowExecutor.tsx`（修改）

**修改点**：删除硬编码的componentMap，使用ComponentRegistry

```typescript
// 删除：
const componentMap: Record<string, React.ComponentType<any>> = {
  ChapterSplitPanel,
  SceneCharacterPanel,
  // ...
};

// 替换为：
import { componentRegistry } from '../../utils/ComponentRegistry'

const workflow: WorkflowState = {
  steps: definition.steps.map((step: any) => ({
    component: componentRegistry.get(step.componentType) ||
               (() => <div>组件未找到: {step.componentType}</div>)
  }))
}
```

---

### 3.2 任务2：TaskScheduler批处理和重试（P0）

**目标**：支持批量并行执行和失败恢复

**实现**：

#### 文件：`src/main/services/TaskScheduler.ts`（扩展）

```typescript
/**
 * 批处理结果
 */
interface BatchResult {
  batchId: string
  total: number
  completed: number
  failed: number
  results: Map<string, TaskResult>
}

/**
 * 重试策略
 */
interface RetryPolicy {
  maxRetries: number
  backoffMs: number[]  // [1000, 2000, 4000] 指数退避
  retryableErrors: string[]
}

class TaskScheduler {
  // 现有代码...

  /**
   * 批量执行任务（核心新功能）
   */
  async executeBatch(
    tasks: Task[],
    options: {
      maxConcurrency?: number  // 默认10
      retryPolicy?: RetryPolicy
      onProgress?: (completed: number, total: number) => void
    }
  ): Promise<BatchResult> {
    const batchId = `batch-${Date.now()}`
    const maxConcurrency = options.maxConcurrency || 10
    const results: Map<string, TaskResult> = new Map()

    // 创建任务池
    const taskQueue = [...tasks]
    const executing: Promise<void>[] = []
    let completed = 0
    let failed = 0

    while (taskQueue.length > 0 || executing.length > 0) {
      // 控制并发数
      while (executing.length < maxConcurrency && taskQueue.length > 0) {
        const task = taskQueue.shift()!

        const promise = this.executeTaskWithRetry(task, options.retryPolicy)
          .then(result => {
            results.set(task.id, result)
            completed++
            options.onProgress?.(completed, tasks.length)
          })
          .catch(error => {
            results.set(task.id, { status: 'failed', error })
            failed++
            options.onProgress?.(completed, tasks.length)
          })
          .finally(() => {
            const index = executing.indexOf(promise)
            executing.splice(index, 1)
          })

        executing.push(promise)
      }

      // 等待至少一个任务完成
      if (executing.length > 0) {
        await Promise.race(executing)
      }
    }

    return {
      batchId,
      total: tasks.length,
      completed,
      failed,
      results
    }
  }

  /**
   * 带重试的任务执行
   */
  private async executeTaskWithRetry(
    task: Task,
    policy?: RetryPolicy
  ): Promise<TaskResult> {
    const maxRetries = policy?.maxRetries || 0
    const backoff = policy?.backoffMs || [1000, 2000, 4000]

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const executionId = await this.executeTask(task.id)

        // 轮询等待完成
        const result = await this.waitForCompletion(executionId)

        if (result.status === 'completed') {
          return result
        }

        // 检查是否可重试
        if (this.isRetryable(result.error, policy)) {
          await this.sleep(backoff[attempt] || backoff[backoff.length - 1])
          continue
        }

        throw result.error
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }

        await this.sleep(backoff[attempt])
      }
    }

    throw new Error('Max retries exceeded')
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryable(error: any, policy?: RetryPolicy): boolean {
    if (!policy?.retryableErrors) return true

    const errorType = error?.code || error?.type
    return policy.retryableErrors.includes(errorType)
  }

  /**
   * 等待任务完成
   */
  private async waitForCompletion(executionId: string): Promise<TaskResult> {
    while (true) {
      const execution = this.executions.get(executionId)
      if (!execution) throw new Error('Execution not found')

      if (execution.status === 'completed' || execution.status === 'failed') {
        return {
          status: execution.status,
          result: execution.result,
          error: execution.error
        }
      }

      await this.sleep(500) // 每500ms轮询一次
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

---

### 3.3 任务3：工作流→插件转换工具（P0）

**目标**：自动将工作流编辑器创建的流程转换为可分发插件

**实现**：

#### 文件：`src/main/services/WorkflowToPluginConverter.ts`（新建）

```typescript
/**
 * 工作流到插件转换器
 */
export class WorkflowToPluginConverter {
  constructor(
    private fsService: FileSystemService,
    private schemaRegistry: SchemaRegistry
  ) {}

  /**
   * 转换工作流为插件
   * @param workflowId 工作流ID
   * @param pluginMeta 插件元数据
   */
  async convert(
    workflowId: string,
    pluginMeta: {
      id: string
      name: string
      description: string
      author: string
    }
  ): Promise<string> {
    // 1. 加载工作流定义
    const workflow = await this.loadWorkflow(workflowId)

    // 2. 生成插件目录结构
    const pluginDir = path.join('plugins', 'community', pluginMeta.id)
    await this.fsService.ensureDir(pluginDir)

    // 3. 生成manifest.json
    await this.generateManifest(pluginDir, workflow, pluginMeta)

    // 4. 提取Schema定义
    await this.extractSchemas(pluginDir, workflow)

    // 5. 生成服务代码
    await this.generateServices(pluginDir, workflow)

    // 6. 生成插件入口
    await this.generatePluginIndex(pluginDir, workflow)

    // 7. 创建ZIP包
    const zipPath = await this.packagePlugin(pluginDir)

    return zipPath
  }

  /**
   * 生成manifest.json
   */
  private async generateManifest(
    pluginDir: string,
    workflow: WorkflowDefinition,
    meta: any
  ): Promise<void> {
    const manifest: PluginManifest = {
      id: meta.id,
      name: meta.name,
      version: '1.0.0',
      description: meta.description,
      author: meta.author,
      type: 'community',
      category: 'workflow',
      main: 'dist/index.js',
      permissions: this.extractPermissions(workflow),
      schemas: workflow.steps.map(s => s.id)
    }

    await fs.writeFile(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    )
  }

  /**
   * 提取所需权限
   */
  private extractPermissions(workflow: WorkflowDefinition): string[] {
    const permissions = new Set<string>()

    // 分析步骤，提取权限
    workflow.steps.forEach(step => {
      if (step.componentType.includes('Split') || step.componentType.includes('Extract')) {
        permissions.add('file:read')
      }
      if (step.componentType.includes('Generate') || step.componentType.includes('Export')) {
        permissions.add('file:write')
        permissions.add('api:call')
      }
      permissions.add('asset:create')
      permissions.add('asset:update')
    })

    return Array.from(permissions)
  }

  /**
   * 提取Schema定义
   */
  private async extractSchemas(
    pluginDir: string,
    workflow: WorkflowDefinition
  ): Promise<void> {
    // 从workflow.steps中提取Schema
    // 生成schemas/目录和schema文件
  }

  /**
   * 生成服务代码（代码生成）
   */
  private async generateServices(
    pluginDir: string,
    workflow: WorkflowDefinition
  ): Promise<void> {
    // 为每个步骤生成Service类
    // 使用模板引擎生成代码
  }

  /**
   * 打包为ZIP
   */
  private async packagePlugin(pluginDir: string): Promise<string> {
    // 使用archiver或jszip打包
  }
}
```

#### 文件：`src/renderer/pages/workflows/WorkflowEditor.tsx`（修改）

**新增功能**：导出为插件

```typescript
const handleExportAsPlugin = async () => {
  // 打开对话框，输入插件元数据
  const pluginMeta = await showPluginMetaDialog()

  // 调用转换API
  const zipPath = await window.electronAPI.convertWorkflowToPlugin(
    workflowId,
    pluginMeta
  )

  // 提示用户下载
  showToast(`插件已导出: ${zipPath}`)
}

// UI中添加按钮
<Button onClick={handleExportAsPlugin}>
  导出为插件
</Button>
```

---

### 3.4 任务4：模板化组件抽象（P1）

**目标**：将5个面板抽象为可复用的模板

**实现策略**：

#### 组件模板接口

| 维度 | 工作流 | 插件（小说转视频） |
|------|-------|-----------------|
| **定位** | 用户创作工具 | 完整产品解决方案 |
| **流程控制** | 用户自由组装 | 固定5步，不可修改 |
| **UI入口** | `/workflows` + 编辑器 | `/plugins` + 专用执行器 |
| **状态管理** | WorkflowStateManager（集中） | 插件内部（自主） |
| **注册方式** | WorkflowRegistry.register() | PluginManager 自动扫描 |
| **生命周期** | 无 | activate/deactivate |
| **分发方式** | 不支持 | ZIP打包 + 市场安装 |
| **版本管理** | 与主应用耦合 | 独立版本号 |
| **权限管理** | 无 | manifest.json 声明 |
| **卸载能力** | 不支持 | 完整支持 |
| **商业化** | 不支持 | 支持市场销售 |
| **目标用户** | 技术用户（会用编辑器） | 普通用户（向导式） |
| **示例** | Comfy工作流、N8N工作流 | Photoshop插件、VSCode扩展 |

---

## 明确建议：采用插件架构

### 理由

1. **设计初衷符合**
   - 你当初设计时就称之为"插件"
   - `novel-to-video-definition.ts` 注释明确说是插件
   - 固定流程与工作流"自由组装"理念冲突

2. **技术成熟**
   - PluginManager 已完整实现
   - 打包分发机制已完整实现
   - IPC 通道已完整实现

3. **未来扩展**
   - 支持插件市场（已有基础）
   - 支持在线安装
   - 支持版本更新

4. **商业价值**
   - 可作为付费插件销售
   - 可分享给其他用户
   - 可独立迭代版本

---

## 改造计划

### 阶段1：明确架构定位（立即执行）

**目标**：彻底分离工作流和插件的概念

**操作**：
1. ✅ 保留 `novel-to-video-definition.ts` 仅作为参考文档
2. ✅ 确认不注册到 `WorkflowRegistry`
3. ✅ 在 WorkflowExecutor 中保留对插件工作流的支持（向后兼容）

### 阶段2：完善插件实现（核心改造）

**文件结构**：
```
plugins/official/novel-to-video/
├── manifest.json          # 插件配置
├── package.json
├── README.md
├── src/
│   ├── index.ts          # 实现 Plugin 接口
│   ├── services/
│   │   ├── NovelVideoService.ts      # 核心业务逻辑（NEW）
│   │   ├── ChapterService.ts
│   │   ├── SceneCharacterService.ts
│   │   ├── StoryboardService.ts
│   │   ├── VoiceoverService.ts
│   │   └── ExportService.ts
│   ├── schemas/          # JSON Schema（已存在）
│   │   └── novel-video-schemas.ts
│   └── ipc/
│       └── handlers.ts   # IPC 处理器（NEW）
└── dist/                 # 编译输出
    └── index.js
```

**关键实现**：

#### `manifest.json`（新增模型依赖声明）
```json
{
  "id": "novel-to-video",
  "name": "小说转视频",
  "version": "1.0.0",
  "description": "将小说文本转换为短视频作品",
  "author": "Matrix Team",
  "license": "MIT",
  "type": "official",
  "category": "workflow",
  "main": "dist/index.js",
  "permissions": [
    "file:read",
    "file:write",
    "asset:create",
    "asset:update",
    "api:call",
    "workflow:create",
    "workflow:update"
  ],
  "tools": ["ffmpeg"],
  "schemas": ["chapter", "scene", "character", "storyboard", "voiceover"],

  // 新增：模型依赖声明
  "modelDependencies": [
    {
      "stepId": "extract-scenes",
      "category": "llm",
      "recommendedProvider": "gemini",
      "recommendedModel": "gemini-1.5-pro",
      "alternatives": ["openai/gpt-4", "anthropic/claude-3"],
      "required": true,
      "reason": "场景角色提取需要强大的文本理解能力"
    },
    {
      "stepId": "generate-storyboard",
      "category": "image-generation",
      "recommendedProvider": "gemini",
      "recommendedModel": "nano-banana-pro",
      "alternatives": ["openai/dall-e-3", "stability/sdxl"],
      "required": true,
      "reason": "分镜画面生成"
    },
    {
      "stepId": "generate-voiceover",
      "category": "tts",
      "recommendedProvider": "openai",
      "recommendedModel": "tts-1-hd",
      "alternatives": ["elevenlabs/multilingual-v2"],
      "required": true,
      "reason": "高质量语音合成"
    }
  ]
}
```

#### `src/index.ts`（插件入口）
```typescript
import { Plugin, PluginContext } from '@matrix/sdk'
import { NovelVideoService } from './services/NovelVideoService'
import { NovelVideoSchemas } from './schemas/novel-video-schemas'

export default class NovelToVideoPlugin implements Plugin {
  private service: NovelVideoService

  async activate(context: PluginContext): Promise<void> {
    // 1. 注册Schema
    await context.schemaRegistry.registerSchemas(
      'novel-to-video',
      NovelVideoSchemas
    )

    // 2. 初始化业务服务
    this.service = new NovelVideoService(context)

    // 3. 注册IPC处理器
    context.ipc.handle('novel-video:split-chapters',
      this.service.splitChapters.bind(this.service))
    context.ipc.handle('novel-video:extract-scenes',
      this.service.extractScenesAndCharacters.bind(this.service))
    // ... 其他处理器
  }

  async deactivate(context: PluginContext): Promise<void> {
    // 清理资源
    await this.service.cleanup()
  }

  async execute(action: string, params: unknown): Promise<unknown> {
    // 插件动作分发
    switch(action) {
      case 'startWorkflow':
        return await this.service.createWorkflowInstance(params)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }
}
```

### 阶段3：IPC 通道实现

**新增通道**（在插件内部注册）：
- `novel-video:split-chapters`
- `novel-video:extract-scenes`
- `novel-video:generate-storyboards`
- `novel-video:regenerate-storyboard`
- `novel-video:generate-voiceovers`
- `novel-video:regenerate-voiceover`
- `novel-video:export-video`

**关键点**：
- 这些通道由插件在 `activate()` 时注册
- 插件卸载时自动清理
- 不污染全局 IPC 命名空间

### 阶段4：前端改造

#### WorkflowExecutor 保留兼容性
```typescript
// WorkflowExecutor.tsx
// 继续支持插件工作流的执行（向后兼容）

const loadWorkflow = async () => {
  // 1. 加载工作流实例
  const instance = await window.electronAPI.loadWorkflow(workflowId)

  // 2. 获取定义
  const definition = await window.electronAPI.getWorkflowDefinition(instance.type)

  // 3. 检查是否为插件工作流
  if (definition.isPlugin) {
    // 使用插件执行器
    const pluginId = definition.pluginId
    await window.electronAPI.executePlugin(pluginId, 'loadWorkflow', { workflowId })
  } else {
    // 普通工作流
    setWorkflowState(...)
  }
}
```

#### Plugins 页面调整

**现状分析**（`src/renderer/pages/plugins/Plugins.tsx`）：
- ✅ 已支持官方/社区插件分类
- ✅ 已支持从ZIP安装插件
- ✅ 已支持插件启动（导航到 `/plugins/${plugin.id}`）
- ⚠️ 插件市场标记为"开发中"

**需要调整的内容**：

1. **新增插件类型分类**：
```typescript
interface PluginInfo {
  // ... 现有字段
  type: 'official' | 'community' | 'user-created';  // 新增 user-created
  source?: 'workflow-export' | 'zip-install';       // 来源标识
}
```

2. **支持工作流转插件后自动刷新**：
```typescript
// 监听插件导出完成事件
useEffect(() => {
  const handlePluginExported = () => {
    loadPlugins();  // 刷新插件列表
    setToast({
      type: 'success',
      message: '工作流已成功转换为插件'
    });
  };

  // 订阅IPC事件
  window.electronAPI?.onPluginExported(handlePluginExported);

  return () => {
    window.electronAPI?.offPluginExported(handlePluginExported);
  };
}, []);
```

3. **插件市场集成工作流导出插件**：
```typescript
// 在插件市场标签页中新增"我的插件"子标签
const [marketView, setMarketView] = useState<'discover' | 'my-plugins'>('discover');

// 显示用户创建的插件
const userCreatedPlugins = plugins.filter(p => p.type === 'user-created');
```

4. **插件卡片UI优化**：
```typescript
// 为用户创建的插件添加特殊标识
<Card
  tag={
    plugin.type === 'official' ? 'Official' :
    plugin.type === 'user-created' ? 'My Plugin' :
    'Community'
  }
  // ...
/>
```

**改造优先级**：
- P1（核心）：支持工作流转插件后的列表刷新
- P2（增强）：插件类型分类和UI标识
- P3（未来）：插件市场功能完善

#### 步骤执行时的模型选择机制（新增 - P0 核心）

**问题描述**：
- 插件的某些步骤依赖特定AI模型（如"场景角色提取"推荐使用deepseek）
- 用户可能没有推荐模型的API，但有其他同类模型（ollama、ChatGPT等）
- 需要让用户灵活选择已配置的模型，实现"用户参与的调优和适配"

**设计原则**：
- ✅ 插件可以正常启动，不做任何阻拦
- ✅ 只在执行具体步骤时才检查模型
- ✅ 提示推荐模型，但允许用户选择替代方案
- ✅ 用户有完全的选择权，不强制配置

**解决方案**：

1. **模型选择服务**（新建 `src/main/services/ModelSelector.ts`）：
```typescript
export class ModelSelector {
  constructor(private apiManager: APIManager) {}

  /**
   * 获取某个步骤的可用模型列表
   * @param stepConfig 步骤的模型配置（来自manifest.json）
   * @returns 可用模型列表
   */
  async getAvailableModels(stepConfig: {
    category: string;
    recommendedProvider: string;
    recommendedModel: string;
    alternatives?: string[];
  }): Promise<ModelOption[]> {
    const options: ModelOption[] = [];

    // 1. 检查推荐模型是否可用
    const recommendedProvider = await this.apiManager.getProvider(
      stepConfig.recommendedProvider
    );
    if (recommendedProvider && recommendedProvider.enabled && recommendedProvider.apiKey) {
      options.push({
        providerId: stepConfig.recommendedProvider,
        modelId: stepConfig.recommendedModel,
        displayName: `${stepConfig.recommendedProvider}/${stepConfig.recommendedModel}`,
        isRecommended: true,
        isConfigured: true
      });
    } else {
      // 推荐模型未配置，但仍显示（标记为未配置）
      options.push({
        providerId: stepConfig.recommendedProvider,
        modelId: stepConfig.recommendedModel,
        displayName: `${stepConfig.recommendedProvider}/${stepConfig.recommendedModel}`,
        isRecommended: true,
        isConfigured: false
      });
    }

    // 2. 查找同类别的所有已配置Provider
    const categoryProviders = await this.apiManager.listProviders({
      category: stepConfig.category,
      enabledOnly: true
    });

    for (const provider of categoryProviders) {
      if (provider.apiKey && provider.id !== stepConfig.recommendedProvider) {
        // 获取该Provider的可用模型列表
        const models = await this.apiManager.listModels(provider.id);

        for (const model of models) {
          options.push({
            providerId: provider.id,
            modelId: model.id,
            displayName: `${provider.name} / ${model.name}`,
            isRecommended: false,
            isConfigured: true,
            description: model.description
          });
        }
      }
    }

    return options;
  }
}

interface ModelOption {
  providerId: string;
  modelId: string;
  displayName: string;
  isRecommended: boolean;  // 是否为推荐模型
  isConfigured: boolean;   // 是否已配置
  description?: string;
}
```

2. **Panel组件中的模型选择逻辑**（以 `SceneCharacterPanel` 为例）：
```typescript
// src/renderer/pages/workflows/panels/SceneCharacterPanel.tsx

const SceneCharacterPanel: React.FC<PanelProps> = ({ workflowId, onComplete }) => {
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);

  /**
   * 执行场景角色提取
   */
  const handleExtract = async () => {
    // 1. 获取该步骤的推荐模型配置
    const stepConfig = {
      category: 'llm',
      recommendedProvider: 'deepseek',
      recommendedModel: 'deepseek-chat',
      reason: '强大的中文理解能力，适合小说场景分析'
    };

    // 2. 获取可用模型列表
    const models = await window.electronAPI.getAvailableModels(stepConfig);
    setAvailableModels(models);

    // 3. 检查推荐模型是否已配置
    const recommendedModel = models.find(m => m.isRecommended && m.isConfigured);

    if (recommendedModel) {
      // 推荐模型已配置，直接使用
      setSelectedModel(recommendedModel);
      await executeExtraction(recommendedModel);
    } else {
      // 推荐模型未配置，显示模型选择对话框
      setShowModelSelector(true);
    }
  };

  /**
   * 用户选择模型后执行
   */
  const handleModelSelected = async (model: ModelOption) => {
    setSelectedModel(model);
    setShowModelSelector(false);

    if (!model.isConfigured) {
      // 用户选择了未配置的模型，引导去配置
      Toast.show({
        type: 'warning',
        message: '请先在Settings中配置该模型的API',
        action: {
          text: '前往配置',
          onClick: () => navigate('/settings')
        }
      });
      return;
    }

    // 执行提取
    await executeExtraction(model);
  };

  /**
   * 执行实际的提取操作
   */
  const executeExtraction = async (model: ModelOption) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.novelVideo.extractScenes({
        workflowId,
        chapters,
        model: {
          provider: model.providerId,
          modelId: model.modelId
        }
      });

      setScenes(result.scenes);
      setCharacters(result.characters);
      onComplete(result);
    } catch (error) {
      Toast.show({
        type: 'error',
        message: `提取失败: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scene-character-panel">
      {/* ... 现有UI ... */}

      <Button onClick={handleExtract}>
        提取场景和角色
      </Button>

      {/* 模型选择对话框 */}
      {showModelSelector && (
        <ModelSelectorDialog
          title="选择AI模型"
          stepConfig={stepConfig}
          availableModels={availableModels}
          onSelect={handleModelSelected}
          onCancel={() => setShowModelSelector(false)}
        />
      )}
    </div>
  );
};
```

3. **模型选择对话框**（新建组件 `src/renderer/components/common/ModelSelectorDialog.tsx`）：
```typescript
interface ModelSelectorDialogProps {
  title: string;
  stepConfig: {
    category: string;
    recommendedProvider: string;
    recommendedModel: string;
    reason: string;
  };
  availableModels: ModelOption[];
  onSelect: (model: ModelOption) => void;
  onCancel: () => void;
}

export const ModelSelectorDialog: React.FC<ModelSelectorDialogProps> = ({
  title,
  stepConfig,
  availableModels,
  onSelect,
  onCancel
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // 推荐模型（可能未配置）
  const recommendedModel = availableModels.find(m => m.isRecommended);

  // 其他已配置的模型
  const otherModels = availableModels.filter(m => !m.isRecommended && m.isConfigured);

  return (
    <Modal isOpen={true} title={title} onClose={onCancel} width="600px">
      <div className="model-selector-dialog">
        {/* 说明推荐模型 */}
        <div className="recommended-section">
          <h3>💡 推荐模型</h3>
          <div className="model-card recommended">
            <div className="model-info">
              <strong>{stepConfig.recommendedProvider} / {stepConfig.recommendedModel}</strong>
              <p className="model-reason">{stepConfig.reason}</p>
            </div>

            {recommendedModel?.isConfigured ? (
              <div className="status-badge configured">✓ 已配置</div>
            ) : (
              <div className="status-badge not-configured">
                ⚠️ 未配置
                <Button
                  size="sm"
                  variant="link"
                  onClick={() => navigate('/settings')}
                >
                  前往配置
                </Button>
              </div>
            )}

            {recommendedModel?.isConfigured && (
              <Button
                variant="primary"
                onClick={() => onSelect(recommendedModel)}
              >
                使用推荐模型
              </Button>
            )}
          </div>
        </div>

        {/* 其他可用模型 */}
        {otherModels.length > 0 && (
          <div className="alternatives-section">
            <h3>🔄 其他已配置的模型</h3>
            <p className="alternatives-hint">
              您也可以选择以下同类别的模型，但可能影响效果
            </p>

            <div className="model-list">
              {otherModels.map((model) => (
                <div
                  key={`${model.providerId}/${model.modelId}`}
                  className={`model-card ${selectedModelId === `${model.providerId}/${model.modelId}` ? 'selected' : ''}`}
                  onClick={() => setSelectedModelId(`${model.providerId}/${model.modelId}`)}
                >
                  <div className="model-info">
                    <strong>{model.displayName}</strong>
                    {model.description && <p className="model-desc">{model.description}</p>}
                  </div>
                  <input
                    type="radio"
                    name="model"
                    checked={selectedModelId === `${model.providerId}/${model.modelId}`}
                    onChange={() => {}}
                  />
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              disabled={!selectedModelId}
              onClick={() => {
                const selected = otherModels.find(
                  m => `${m.providerId}/${m.modelId}` === selectedModelId
                );
                if (selected) onSelect(selected);
              }}
            >
              使用选中的模型
            </Button>
          </div>
        )}

        {/* 无可用模型时的提示 */}
        {!recommendedModel?.isConfigured && otherModels.length === 0 && (
          <div className="no-models-warning">
            <p>⚠️ 当前没有可用的 {stepConfig.category} 类型模型</p>
            <p>请先在Settings中配置至少一个模型</p>
            <Button variant="primary" onClick={() => navigate('/settings')}>
              前往Settings配置
            </Button>
          </div>
        )}

        {/* 取消按钮 */}
        <div className="dialog-footer">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

4. **IPC通道新增**：
```typescript
// 主进程（src/main/ipc/model-handlers.ts）
ipcMain.handle('model:get-available', async (_, stepConfig) => {
  return await modelSelector.getAvailableModels(stepConfig);
});

// 预加载脚本（src/preload/index.ts）
contextBridge.exposeInMainWorld('electronAPI', {
  getAvailableModels: (stepConfig) =>
    ipcRenderer.invoke('model:get-available', stepConfig)
});
```

5. **用户体验流程**（修正版）：
```
用户启动插件
  ↓
插件正常启动，无阻拦
  ↓
用户进入某个步骤（如"场景角色提取"）
  ↓
点击"提取场景和角色"按钮
  ↓
检查推荐模型（deepseek）是否已配置
  ↓
推荐模型已配置？
  ├─ 是 → 直接使用推荐模型执行
  │
  └─ 否 → 显示模型选择对话框
          ├─ 显示推荐模型（deepseek）和原因
          ├─ 提示未配置，提供"前往配置"按钮
          ├─ 显示其他已配置的同类模型（ollama、ChatGPT等）
          ├─ 用户选择后继续执行
          └─ 用户可以取消
```

**改造优先级**：
- **P0（必须实现）**：模型选择对话框和执行时检查
- **P1（核心）**：支持选择同类别的其他已配置模型
- **P2（增强）**：记住用户的模型选择偏好（下次自动使用）
- **P3（优化）**：模型性能统计和推荐优化

### 阶段5：删除 Mock 数据

**所有面板改造**：
- ✅ ChapterSplitPanel
- ✅ SceneCharacterPanel
- ✅ StoryboardPanel
- ✅ VoiceoverPanel
- ✅ ExportPanel

**改造策略**：
```typescript
// 删除：
const mockData = [...]

// 替换为：
const data = await window.electronAPI.novelVideo.splitChapters(...)
```

---

## 实施步骤

### Step 1: 架构确认（1天）
- [ ] 确认插件架构方案
- [ ] 更新文档说明
- [ ] 删除 WorkflowRegistry 注册代码（如果有）

### Step 2: 插件骨架搭建（2-3天）
- [ ] 创建完整的插件目录结构
- [ ] 编写 manifest.json（包含 modelDependencies 声明）
- [ ] 实现 Plugin 接口（activate/deactivate）
- [ ] 注册 Schema
- [ ] 实现 ModelSelector 服务（P0）
- [ ] 实现模型查询 IPC 通道（`model:get-available`）
- [ ] 创建 ModelSelectorDialog 通用组件

### Step 3: 业务服务实现（10-15天）
- [ ] NovelVideoService（核心）
- [ ] ChapterService
- [ ] SceneCharacterService
- [ ] StoryboardService
- [ ] VoiceoverService
- [ ] ExportService

### Step 4: IPC 通道实现（3-5天）
- [ ] 在插件内注册 IPC 处理器
- [ ] 删除全局 IPC 通道（如果有）
- [ ] 测试 IPC 通信

### Step 5: 前端改造（5-7天）
- [ ] 删除所有面板的 Mock 数据
- [ ] 调用真实 IPC API
- [ ] **集成模型选择机制到各个Panel**：
  - [ ] ChapterSplitPanel（如需AI辅助）
  - [ ] SceneCharacterPanel（LLM模型选择）
  - [ ] StoryboardPanel（图像生成模型选择）
  - [ ] VoiceoverPanel（TTS模型选择）
- [ ] 右侧面板集成
- [ ] 状态持久化
- [ ] 实现用户模型选择偏好记忆（可选，P2）

### Step 6: 测试和优化（3-5天）
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 用户体验优化

**总计**：约 24-36 个工作日

---

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 插件加载失败 | 高 | 完善错误处理和日志 |
| IPC 通道冲突 | 中 | 使用插件命名空间 |
| 状态管理复杂 | 中 | 插件内部自主管理 |
| 向后兼容问题 | 低 | WorkflowExecutor 保留兼容 |
| **模型依赖未配置** | **高** | **执行时提示 + 灵活选择 + 引导配置** |
| 替代模型效果不佳 | 中 | 明确说明推荐模型原因 + 允许用户选择 |
| 用户配置门槛高 | 低 | 允许使用任何同类模型 + 不强制配置 |

---

## 关键决策点

### Q: 是否需要 WorkflowRegistry 注册？

**答**：**不需要**

**理由**：
- 小说转视频是插件，不是普通工作流
- 插件通过 PluginManager 自动扫描加载
- 避免概念混淆

### Q: WorkflowExecutor 是否继续支持？

**答**：**是，保留兼容**

**理由**：
- UI 组件已完全实现，复用成本低
- 通过 `definition.isPlugin` 标记区分
- 插件工作流可以复用 WorkflowExecutor 的 UI

### Q: 如何访问小说转视频？

**答**：三种入口

1. **插件页面**：`/plugins` → 选择"小说转视频"
2. **快捷方式**：Dashboard → "小说转视频"快捷方式（ShortcutType.PLUGIN）
3. **项目内部**：打开项目 → 新建工作流/文件夹 → 选择插件"小说转视频" → 自动跳转到执行器

---

## 结论

**小说转视频应该作为插件，不应该注册到 WorkflowRegistry**

这是基于：
1. 设计初衷（你当初就叫它"插件"）
2. 功能定位（完整产品 vs 组件编排）
3. 技术成熟度（插件系统已完整实现）
4. 未来扩展（支持市场分发和商业化）

插件架构清晰地分离了两个概念：
- **工作流** = 用户的创作工具（自由组装）
- **插件** = 平台的扩展产品（固定流程）

这种分离使系统更加清晰、可扩展、可商业化。

---

## 模型选择机制设计理念

**核心原则**：**用户参与的调优和适配**

### 设计要点

1. **不阻拦用户使用插件**
   - ❌ 错误：启动插件前检查所有依赖，缺失就阻止
   - ✅ 正确：插件自由启动，在执行具体步骤时才检查模型

2. **推荐而不强制**
   - 明确说明推荐模型（如deepseek）和推荐原因
   - 但允许用户选择任何同类别的已配置模型（ollama、ChatGPT等）
   - 用户有完全的选择权

3. **灵活性优于强制性**
   - 即使没有推荐模型，只要有同类模型就能继续
   - 降低用户使用门槛，避免强制配置特定API
   - 让用户根据自己的资源情况做调整

4. **引导而不命令**
   - 提供"前往Settings配置"的便捷入口
   - 但不强制用户必须配置
   - 尊重用户的选择和现有资源

### 用户体验对比

| 维度 | ❌ 错误设计（启动前检查） | ✅ 正确设计（执行时提示） |
|------|------------------------|----------------------|
| **启动** | 检查依赖，缺失则阻止 | 自由启动，无阻拦 |
| **时机** | 启动前全量检查 | 执行时按需检查 |
| **态度** | 强制配置 | 建议推荐 |
| **灵活性** | 必须配置推荐模型 | 允许使用任何同类模型 |
| **门槛** | 高（必须配置API） | 低（可用现有资源） |
| **用户体验** | 阻碍性、强制性 | 引导性、灵活性 |

这种设计让用户在使用插件时，能够根据自己的实际情况（是否有某个API、是否愿意付费、是否有本地模型等）灵活调整，实现**真正的用户参与式调优**。

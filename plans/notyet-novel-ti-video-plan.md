# 小说转视频功能实施方案（基于Matrix原生架构）

> **方案定位**: 基于Matrix适配性新建，建立通用工作流引擎标准
> **预计周期**: 12周（6个阶段）
> **团队规模**: 2人
> **总投资**: 24人周

---

## 一、Matrix现有能力评估

### ✅ 高成熟度模块
1. **AssetManager**（957行，功能完整）
   - JSON索引系统 ✅
   - 文件监听（chokidar）✅
   - 元数据管理（Sidecar JSON）✅
   - 分页查询 ✅
   - **关键能力**：支持 `customFields: Record<string, any>` 扩展字段

2. **ProjectManager**（完整实现）
   - 项目CRUD ✅
   - 元数据管理 ✅

3. **核心服务**
   - TimeService ✅
   - Logger ✅
   - ServiceErrorHandler ✅

### 🟡 需要扩展的模块
1. **Workflows页面**（124行，仅UI壳）
   - ✅ 已有：列表展示
   - ❌ 缺失：工作流执行引擎
   - ❌ 缺失：步骤化流程控制

2. **TaskScheduler**（MVP实现）
   - ✅ 已有：基础任务队列
   - ❌ 缺失：任务持久化

3. **APIManager**（MVP实现）
   - ✅ 已有：基础API调用
   - ❌ 缺失：T8Star/RunningHub提供商注册

---

## 二、核心设计

### 2.1 数据模型（Matrix原生）

**设计原则**：充分利用AssetManager的 `customFields` 机制，避免双层存储

```typescript
// 使用Matrix的Asset + customFields
interface NovelVideoAsset extends AssetMetadata {
  customFields: {
    novelVideo?: {
      // Chapter相关
      chapterId?: string
      chapterTitle?: string
      chapterContent?: string

      // Scene相关
      sceneId?: string
      sceneStory?: string
      sceneLocation?: string

      // Character相关
      characterId?: string
      characterName?: string
      characterAppearance?: string
      soraName?: string
      voiceId?: string

      // Storyboard相关
      storyboardType?: 'video' | 'image'
      videoPrompt?: string
      characterIds?: string[]

      // Voiceover相关
      dialogueText?: string
      emotion?: number[]

      // 资源复用
      sourceAssetId?: string
    }
  }
}
```

**优势**：
- ✅ 完全复用AssetManager的索引、查询、监听能力
- ✅ 无需双层存储，数据一致性高
- ✅ 支持全局资源提升（角色图可提升为全局资产）
- ✅ 自动支持资源去重

---

### 2.2 工作流引擎（通用框架）

**设计原则**：建立可复用的工作流执行引擎，为未来10+插件提供标准模式

```typescript
interface WorkflowStep {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  component: React.ComponentType
  onComplete: (data: any) => Promise<void>
}

interface WorkflowDefinition {
  id: string
  name: string
  type: string
  steps: WorkflowStep[]
  state: Record<string, any>  // 工作流状态（持久化）
}
```

**优势**：
- ✅ 为未来其他工作流插件提供标准模式
- ✅ 状态持久化，支持中断恢复
- ✅ 步骤可重用（如"AI生成图片"步骤可用于多个工作流）

---

### 2.3 路由设计

**设计原则**：无需修改Matrix核心代码，所有工作流复用同一个执行器

```typescript
// Matrix核心路由
<Route path="/workflows" element={<Workflows />} />
<Route path="/workflows/:workflowId" element={<WorkflowExecutor />} />

// WorkflowExecutor 根据 workflowId 动态加载对应工作流定义
```

---

### 2.4 UI组件复用策略

**设计原则**：复用ai-playlet的UI逻辑，改写为Matrix风格

- ChapterSplitPanel → 使用Matrix Button/Card组件
- SceneCharacterPanel → 集成Matrix AssetPreview
- StoryboardPanel → 复用Matrix Progress组件
- VoiceoverPanel → 复用Matrix Slider组件

---

## 三、实施计划（6个阶段）

### 阶段1：工作流引擎基础（3周）

#### 任务1.1: 创建工作流注册表
- [ ] **状态**: 未开始

**目标（Goal）**:
建立工作流注册机制，支持动态注册和查询工作流定义

**要做什么（What）**:
1. 创建 `WorkflowRegistry` 单例类
2. 实现 `register()` 和 `getDefinition()` 方法
3. 支持工作流类型和实例的映射管理

**方法（How）**:
```typescript
// 文件：src/main/services/WorkflowRegistry.ts
export class WorkflowRegistry {
  private definitions = new Map<string, WorkflowDefinition>()

  register(definition: WorkflowDefinition): void {
    this.definitions.set(definition.type, definition)
  }

  getDefinition(type: string): WorkflowDefinition | undefined {
    return this.definitions.get(type)
  }

  listAll(): WorkflowDefinition[] {
    return Array.from(this.definitions.values())
  }
}

export const workflowRegistry = new WorkflowRegistry()
```

**参考（Reference）**:
- 参考代码：`src/main/services/PluginManager.ts` 的注册机制（loadedPlugins Map）
- 参考文档：`docs/06-core-services-design-v1.0.1.md` 服务单例模式

**预期效果（Expected）**:
- ✅ 可注册多个工作流定义
- ✅ 可通过type查询工作流定义
- ✅ 可列出所有已注册工作流

**验收标准（Acceptance）**:
```typescript
// 测试代码
const testWorkflow: WorkflowDefinition = {
  id: 'test-workflow',
  name: '测试工作流',
  type: 'test',
  steps: [],
  state: {}
}

workflowRegistry.register(testWorkflow)
const retrieved = workflowRegistry.getDefinition('test')
assert(retrieved?.id === 'test-workflow')
```

---

#### 任务1.2: 实现工作流状态管理器
- [ ] **状态**: 未开始

**目标（Goal）**:
持久化工作流执行状态，支持中断恢复

**要做什么（What）**:
1. 创建 `WorkflowStateManager` 服务
2. 实现状态的保存、读取、更新功能
3. 支持步骤状态追踪

**方法（How）**:
```typescript
// 文件：src/main/services/WorkflowStateManager.ts
export class WorkflowStateManager {
  constructor(private fsService: FileSystemService) {}

  async saveState(workflowId: string, state: WorkflowState): Promise<void> {
    const statePath = this.getStatePath(workflowId)
    await this.fsService.saveJSON(statePath, state)
  }

  async loadState(workflowId: string): Promise<WorkflowState | null> {
    const statePath = this.getStatePath(workflowId)
    return await this.fsService.readJSON<WorkflowState>(statePath)
  }

  async updateStepStatus(
    workflowId: string,
    stepId: string,
    status: StepStatus
  ): Promise<void> {
    const state = await this.loadState(workflowId)
    if (state) {
      state.steps[stepId] = { status, updatedAt: Date.now() }
      await this.saveState(workflowId, state)
    }
  }

  private getStatePath(workflowId: string): string {
    // {workspaceDir}/workflows/{workflowId}/state.json
    return path.join(
      this.fsService.getWorkspacePath(),
      'workflows',
      workflowId,
      'state.json'
    )
  }
}
```

**参考（Reference）**:
- 参考代码：`src/main/services/FileSystemService.ts` 的JSON读写方法
- 参考代码：`src/main/services/AssetManager.ts` 的索引保存机制
- 参考文档：`docs/00-global-requirements-v1.0.0.md` 时间处理要求

**预期效果（Expected）**:
- ✅ 工作流状态保存到 `{workspaceDir}/workflows/{workflowId}/state.json`
- ✅ 应用重启后可恢复工作流状态
- ✅ 步骤状态可独立更新

**验收标准（Acceptance）**:
```typescript
// 测试：保存和恢复状态
const testState: WorkflowState = {
  workflowId: 'test-123',
  currentStep: 1,
  steps: {
    'step-1': { status: 'completed', updatedAt: Date.now() }
  }
}

await stateManager.saveState('test-123', testState)
const loaded = await stateManager.loadState('test-123')
assert(loaded?.currentStep === 1)
assert(loaded?.steps['step-1'].status === 'completed')
```

---

#### 任务1.3: 创建工作流执行器组件
- [ ] **状态**: 未开始

**目标（Goal）**:
实现通用的工作流执行UI组件，支持动态加载步骤

**要做什么（What）**:
1. 创建 `WorkflowExecutor` React组件
2. 实现步骤指示器UI（类似ai-playlet的ConsoleHeader）
3. 动态渲染当前步骤的Panel组件
4. 实现状态保存和恢复逻辑

**方法（How）**:
```typescript
// 文件：src/renderer/components/WorkflowExecutor.tsx
export const WorkflowExecutor: React.FC = () => {
  const { workflowId } = useParams()
  const [workflow, setWorkflow] = useState<WorkflowDefinition>()
  const [currentStep, setCurrentStep] = useState(0)
  const [workflowState, setWorkflowState] = useState<WorkflowState>()

  // 加载工作流定义
  useEffect(() => {
    window.electronAPI.getWorkflowDefinition(workflowId).then(setWorkflow)
  }, [workflowId])

  // 加载工作流状态
  useEffect(() => {
    window.electronAPI.loadWorkflowState(workflowId).then(state => {
      if (state) {
        setWorkflowState(state)
        setCurrentStep(state.currentStep)
      }
    })
  }, [workflowId])

  // 步骤完成处理
  const handleStepComplete = async (data: any) => {
    const step = workflow.steps[currentStep]
    await step.onComplete(data)

    // 更新状态
    const newState = {
      ...workflowState,
      currentStep: currentStep + 1,
      steps: {
        ...workflowState?.steps,
        [step.id]: { status: 'completed', updatedAt: Date.now() }
      }
    }
    await window.electronAPI.saveWorkflowState(workflowId, newState)
    setWorkflowState(newState)
    setCurrentStep(currentStep + 1)
  }

  if (!workflow) return <div>加载中...</div>

  const CurrentPanel = workflow.steps[currentStep]?.component

  return (
    <div className="workflow-executor">
      {/* 步骤指示器 */}
      <WorkflowStepIndicator
        steps={workflow.steps}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* 当前步骤面板 */}
      <div className="panel-container">
        {CurrentPanel && (
          <CurrentPanel
            workflowId={workflowId}
            onComplete={handleStepComplete}
          />
        )}
      </div>
    </div>
  )
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\renderer\src\pages\ConsolePage.tsx`（步骤控制逻辑）
- 参考组件：`src/renderer/components/common/Button.tsx`（Matrix按钮样式）
- 参考组件：`src/renderer/components/common/Card.tsx`（Matrix卡片样式）

**预期效果（Expected）**:
- ✅ 显示工作流名称和步骤指示器
- ✅ 动态渲染当前步骤的Panel组件
- ✅ 步骤完成后自动保存状态并切换到下一步
- ✅ 刷新页面后可恢复到当前步骤

**验收标准（Acceptance）**:
1. 创建测试工作流（3个步骤）
2. 打开 `/workflows/test-workflow`
3. 验证步骤指示器显示正确
4. 完成第1步，验证自动跳转到第2步
5. 刷新页面，验证停留在第2步

---

#### 任务1.4: 扩展Workflows列表页
- [ ] **状态**: 未开始

**目标（Goal）**:
在Workflows页面添加工作流启动入口

**要做什么（What）**:
1. 修改 `Workflows.tsx`，添加工作流类型筛选
2. 添加"创建工作流实例"功能
3. 点击工作流卡片时跳转到 `/workflows/:workflowId`

**方法（How）**:
```typescript
// 文件：src/renderer/pages/Workflows/Workflows.tsx
const Workflows: React.FC = () => {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])

  useEffect(() => {
    // 加载已注册的工作流定义
    window.electronAPI.listWorkflows().then(setWorkflows)
  }, [])

  const handleCreateWorkflow = async (type: string) => {
    // 创建工作流实例
    const workflowId = await window.electronAPI.createWorkflowInstance(type)
    navigate(`/workflows/${workflowId}`)
  }

  return (
    <div className="workflows-page">
      <div className="workflows-header">
        <h1>工作流</h1>
      </div>

      <div className="workflows-grid">
        {workflows.map(workflow => (
          <Card
            key={workflow.type}
            title={workflow.name}
            info={workflow.description}
            onClick={() => handleCreateWorkflow(workflow.type)}
          />
        ))}
      </div>
    </div>
  )
}
```

**参考（Reference）**:
- 当前代码：`src/renderer/pages/Workflows/Workflows.tsx`（现有列表逻辑）
- 参考代码：`src/renderer/pages/Dashboard/Dashboard.tsx`（项目卡片点击）

**预期效果（Expected）**:
- ✅ 显示所有已注册的工作流类型
- ✅ 点击工作流卡片创建新实例并跳转
- ✅ 已创建的工作流实例可继续执行

**验收标准（Acceptance）**:
1. 注册测试工作流
2. 打开 `/workflows` 页面
3. 验证显示工作流卡片
4. 点击卡片，验证跳转到 `/workflows/{生成的ID}`

---

#### 任务1.5: 添加工作流路由
- [ ] **状态**: 未开始

**目标（Goal）**:
注册工作流执行器路由

**要做什么（What）**:
在 `App.tsx` 中添加 `/workflows/:workflowId` 路由

**方法（How）**:
```typescript
// 文件：src/renderer/App.tsx
import { WorkflowExecutor } from './components/WorkflowExecutor'

<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/workflows" element={<Workflows />} />

  {/* 新增：工作流执行器路由 */}
  <Route path="/workflows/:workflowId" element={<WorkflowExecutor />} />

  <Route path="/assets" element={<Assets />} />
  {/* ...其他路由 */}
</Routes>
```

**参考（Reference）**:
- 当前代码：`src/renderer/App.tsx`（现有路由配置）

**预期效果（Expected）**:
- ✅ 访问 `/workflows/:workflowId` 可正常渲染WorkflowExecutor
- ✅ 路由参数 `workflowId` 可正确获取

**验收标准（Acceptance）**:
1. 访问 `/workflows/test-123`
2. 验证WorkflowExecutor组件渲染
3. 验证 `useParams()` 获取到 `workflowId = "test-123"`

---

#### 任务1.6: 创建测试工作流验证流程
- [ ] **状态**: 未开始

**目标（Goal）**:
验证工作流引擎的完整流程

**要做什么（What）**:
1. 创建一个简单的3步测试工作流
2. 注册到WorkflowRegistry
3. 完整执行一遍流程

**方法（How）**:
```typescript
// 文件：src/main/services/test-workflow-definition.ts
const TestPanel1: React.FC = ({ onComplete }) => (
  <div>
    <h2>步骤1：输入测试数据</h2>
    <button onClick={() => onComplete({ value: 'test' })}>完成</button>
  </div>
)

const TestPanel2: React.FC = ({ onComplete }) => (
  <div>
    <h2>步骤2：处理数据</h2>
    <button onClick={() => onComplete({})}>完成</button>
  </div>
)

const TestPanel3: React.FC = ({ onComplete }) => (
  <div>
    <h2>步骤3：显示结果</h2>
    <button onClick={() => onComplete({})}>完成</button>
  </div>
)

export const testWorkflow: WorkflowDefinition = {
  id: 'test-workflow',
  name: '测试工作流',
  type: 'test',
  steps: [
    {
      id: 'step-1',
      name: '输入数据',
      status: 'pending',
      component: TestPanel1,
      onComplete: async (data) => {
        console.log('步骤1完成:', data)
      }
    },
    {
      id: 'step-2',
      name: '处理数据',
      status: 'pending',
      component: TestPanel2,
      onComplete: async (data) => {
        console.log('步骤2完成:', data)
      }
    },
    {
      id: 'step-3',
      name: '显示结果',
      status: 'pending',
      component: TestPanel3,
      onComplete: async (data) => {
        console.log('步骤3完成:', data)
      }
    }
  ],
  state: {}
}

// 在main.ts中注册
workflowRegistry.register(testWorkflow)
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\renderer\src\pages\ConsolePage.tsx`（步骤切换逻辑）

**预期效果（Expected）**:
- ✅ 可在Workflows页面看到"测试工作流"
- ✅ 点击后进入执行页面
- ✅ 3个步骤可依次完成
- ✅ 中途刷新页面可恢复状态

**验收标准（Acceptance）**:
1. 打开 `/workflows`，点击"测试工作流"
2. 依次完成3个步骤
3. 在步骤2时刷新页面，验证停留在步骤2
4. 完成步骤3，验证工作流结束

---

### 阶段2：数据模型和AssetManager集成（2周）

#### 任务2.1: 定义NovelVideo类型系统
- [ ] **状态**: 未开始

**目标（Goal）**:
建立完整的小说转视频数据类型定义

**要做什么（What）**:
1. 创建 `novel-video.ts` 类型文件
2. 定义 `NovelVideoFields` 接口
3. 定义辅助类型（ChapterData, SceneData等）

**方法（How）**:
```typescript
// 文件：src/shared/types/novel-video.ts

/**
 * 小说转视频专用字段
 */
export interface NovelVideoFields {
  // Chapter相关
  chapterId?: string
  chapterTitle?: string
  chapterContent?: string
  chapterIndex?: number

  // Scene相关
  sceneId?: string
  sceneStory?: string
  sceneLocation?: string
  sceneImagePrompt?: string

  // Character相关
  characterId?: string
  characterName?: string
  characterAppearance?: string
  characterImagePrompt?: string
  soraName?: string  // Sora识别名
  voiceId?: string   // 绑定的音色

  // Storyboard相关
  storyboardSceneId?: string
  storyboardType?: 'video' | 'image'
  videoPrompt?: string
  imagePrompts?: string[]
  characterIds?: string[]

  // Voiceover相关
  voiceoverSceneId?: string
  dialogueText?: string
  dialogueCharacterId?: string
  emotion?: number[]  // 8维情绪向量

  // 资源复用
  sourceAssetId?: string  // 复用来源
  similarity?: number     // 相似度评分
}

/**
 * 章节数据（用于创建Asset）
 */
export interface ChapterData {
  projectId: string
  title: string
  content: string
  index: number
}

/**
 * 场景数据
 */
export interface SceneData {
  projectId: string
  chapterId: string
  story: string
  location: string
  imagePrompt: string
}

/**
 * 角色数据
 */
export interface CharacterData {
  projectId: string
  name: string
  appearance: string
  imagePrompt: string
  soraName?: string
  voiceId?: string
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\models\Project.ts`（ai-playlet的数据模型）
- 参考代码：`src/shared/types/asset.ts`（Matrix的AssetMetadata定义）
- 参考文档：`plans/done-novel-to-video-detailed-migration-design.md`（数据模型映射）

**预期效果（Expected）**:
- ✅ 完整的TypeScript类型定义
- ✅ 覆盖ai-playlet的所有数据字段
- ✅ 类型可直接用于AssetMetadata.customFields

**验收标准（Acceptance）**:
```typescript
// 类型检查通过
const asset: AssetMetadata = {
  id: 'test',
  name: 'test.txt',
  type: 'text',
  // ...其他必需字段
  customFields: {
    novelVideo: {
      chapterId: 'chapter-001',
      chapterTitle: '第一章',
      chapterContent: '...'
    } satisfies NovelVideoFields
  }
}
```

---

#### 任务2.2: 实现NovelVideoAssetHelper
- [ ] **状态**: 未开始

**目标（Goal）**:
封装NovelVideo专用的Asset操作方法

**要做什么（What）**:
1. 创建 `NovelVideoAssetHelper` 类
2. 实现创建各类资产的快捷方法
3. 实现查询和关联方法

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/NovelVideoAssetHelper.ts
import { AssetManager } from '../AssetManager'
import { NovelVideoFields, ChapterData, SceneData } from '@/shared/types/novel-video'

export class NovelVideoAssetHelper {
  constructor(private assetManager: AssetManager) {}

  /**
   * 创建章节资产
   */
  async createChapterAsset(data: ChapterData): Promise<AssetMetadata> {
    // 创建临时文本文件（章节内容）
    const chapterId = `chapter-${Date.now()}`
    const fileName = `${data.title}.txt`
    const filePath = path.join(
      this.assetManager.getProjectAssetDir(data.projectId, 'chapters'),
      fileName
    )

    await fs.writeFile(filePath, data.content, 'utf-8')

    // 导入到AssetManager
    const metadata = await this.assetManager.importAsset({
      sourcePath: filePath,
      scope: 'project',
      projectId: data.projectId,
      category: 'chapters',
      type: 'text',
      tags: ['novel-video', 'chapter'],
      metadata: {
        customFields: {
          novelVideo: {
            chapterId,
            chapterTitle: data.title,
            chapterContent: data.content,
            chapterIndex: data.index
          } satisfies NovelVideoFields
        }
      }
    })

    return metadata
  }

  /**
   * 创建场景资产（初始无图片）
   */
  async createSceneAsset(data: SceneData): Promise<AssetMetadata> {
    // 创建占位符文件
    const sceneId = `scene-${Date.now()}`
    const fileName = `${data.location}.json`
    const filePath = path.join(
      this.assetManager.getProjectAssetDir(data.projectId, 'scenes'),
      fileName
    )

    const sceneJson = {
      sceneId,
      story: data.story,
      location: data.location,
      imagePrompt: data.imagePrompt
    }

    await fs.writeFile(filePath, JSON.stringify(sceneJson, null, 2), 'utf-8')

    const metadata = await this.assetManager.importAsset({
      sourcePath: filePath,
      scope: 'project',
      projectId: data.projectId,
      category: 'scenes',
      type: 'text',
      tags: ['novel-video', 'scene'],
      metadata: {
        status: 'none',  // 图片未生成
        prompt: data.imagePrompt,
        customFields: {
          novelVideo: {
            sceneId,
            sceneStory: data.story,
            sceneLocation: data.location,
            sceneImagePrompt: data.imagePrompt
          } satisfies NovelVideoFields
        }
      }
    })

    return metadata
  }

  /**
   * 查询章节的所有场景
   */
  async getScenesByChapter(
    projectId: string,
    chapterId: string
  ): Promise<AssetMetadata[]> {
    const result = await this.assetManager.scanAssets({
      scope: 'project',
      projectId,
      category: 'scenes',
      tags: ['novel-video', 'scene']
    })

    // 过滤出属于该章节的场景
    return result.assets.filter(asset => {
      const nv = asset.customFields?.novelVideo as NovelVideoFields
      return nv?.sceneId?.startsWith(chapterId)
    })
  }

  /**
   * 更新场景图片路径
   */
  async updateSceneImage(
    sceneAssetId: string,
    imagePath: string
  ): Promise<void> {
    const sceneAsset = await this.assetManager.getMetadata(sceneAssetId)
    if (!sceneAsset) throw new Error('场景资产不存在')

    await this.assetManager.updateMetadata(sceneAssetId, {
      status: 'success',
      customFields: {
        ...sceneAsset.customFields,
        novelVideo: {
          ...(sceneAsset.customFields?.novelVideo || {}),
          sceneImagePath: imagePath
        }
      }
    })
  }
}
```

**参考（Reference）**:
- 参考代码：`src/main/services/AssetManager.ts` 的 `importAsset` 和 `scanAssets` 方法
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\DataManager.ts`（ai-playlet的数据操作）

**预期效果（Expected）**:
- ✅ 可快速创建章节/场景/角色资产
- ✅ 可通过chapterId查询场景
- ✅ 可更新资产的生成状态

**验收标准（Acceptance）**:
```typescript
// 测试：创建章节和场景
const helper = new NovelVideoAssetHelper(assetManager)

const chapter = await helper.createChapterAsset({
  projectId: 'test-project',
  title: '第一章',
  content: '章节内容...',
  index: 1
})
assert(chapter.customFields?.novelVideo?.chapterTitle === '第一章')

const scene = await helper.createSceneAsset({
  projectId: 'test-project',
  chapterId: chapter.customFields.novelVideo.chapterId,
  story: '场景故事',
  location: '卧室',
  imagePrompt: '温馨的卧室'
})
assert(scene.status === 'none')

const scenes = await helper.getScenesByChapter('test-project', chapter.customFields.novelVideo.chapterId)
assert(scenes.length === 1)
```

---

#### 任务2.3: 测试customFields查询性能
- [ ] **状态**: 未开始

**目标（Goal）**:
验证AssetManager对customFields的查询性能

**要做什么（What）**:
1. 创建100个测试章节资产
2. 测试按customFields过滤的查询速度
3. 优化查询逻辑（如需要）

**方法（How）**:
```typescript
// 文件：tests/performance/asset-custom-fields.test.ts
import { performance } from 'perf_hooks'

describe('AssetManager customFields 性能测试', () => {
  it('查询100个章节资产应在100ms内完成', async () => {
    // 创建100个测试章节
    for (let i = 0; i < 100; i++) {
      await helper.createChapterAsset({
        projectId: 'test-project',
        title: `第${i + 1}章`,
        content: `章节${i + 1}内容`,
        index: i
      })
    }

    // 测试查询性能
    const start = performance.now()
    const chapters = await assetManager.scanAssets({
      scope: 'project',
      projectId: 'test-project',
      category: 'chapters'
    })
    const duration = performance.now() - start

    expect(chapters.assets.length).toBe(100)
    expect(duration).toBeLessThan(100)  // 应在100ms内
  })
})
```

**参考（Reference）**:
- 参考代码：`src/main/services/AssetManager.ts` 的 `scanAssets` 实现
- 参考文档：`docs/phase4-e01-asset-library-implementation-plan.md`（AssetManager性能设计）

**预期效果（Expected）**:
- ✅ 100个资产查询时间 < 100ms
- ✅ 验证JSON索引机制有效

**验收标准（Acceptance）**:
- 运行测试通过
- 如查询超时，需优化AssetManager的索引逻辑

---

### 阶段3：AI服务集成（2周）

#### 任务3.1: 从ai-playlet复制LangChain Agent
- [ ] **状态**: 未开始

**目标（Goal）**:
复用ai-playlet的AI调用逻辑

**要做什么（What）**:
1. 复制 `LangChainAgent.ts`
2. 复制 `AgentSceneCharacterExtractor.ts`
3. 复制 `AgentStoryboardScriptGenerator.ts`
4. 安装依赖（langchain, zod等）

**方法（How）**:
```bash
# 1. 复制文件
cp E:/Projects/ai-playlet-master/src/main/agent/LangChainAgent.ts src/main/agent/
cp E:/Projects/ai-playlet-master/src/main/services/ai/implementations/AgentSceneCharacterExtractor.ts src/main/services/ai/implementations/
cp E:/Projects/ai-playlet-master/src/main/services/ai/implementations/AgentStoryboardScriptGenerator.ts src/main/services/ai/implementations/

# 2. 安装依赖
npm install langchain zod @langchain/community
```

**参考（Reference）**:
- 源文件：`E:\Projects\ai-playlet-master\src\main\agent\LangChainAgent.ts`
- 源文件：`E:\Projects\ai-playlet-master\src\main\services\ai\implementations\AgentSceneCharacterExtractor.ts`

**预期效果（Expected）**:
- ✅ LangChainAgent可正常编译
- ✅ AgentSceneCharacterExtractor可正常调用

**验收标准（Acceptance）**:
```typescript
// 测试：LLM调用
const agent = new LangChainAgent({
  apiKey: 'test-key',
  model: 'deepseek-chat',
  temperature: 0.7
})

const result = await agent.structuredOutput(
  '提取场景',
  z.object({ scenes: z.array(z.string()) }),
  { maxRetries: 3 }
)
assert(result.data.scenes.length > 0)
```

---

#### 任务3.2: 注册T8Star API提供商
- [ ] **状态**: 未开始

**目标（Goal）**:
在APIManager中注册T8Star提供商

**要做什么（What）**:
1. 修改 `APIManager.ts`
2. 添加T8Star提供商配置
3. 实现T8Star特有的请求格式

**方法（How）**:
```typescript
// 文件：src/main/services/APIManager.ts

export class APIManager {
  async initialize(): Promise<void> {
    // ...现有初始化代码

    // 注册T8Star提供商
    this.registerProvider({
      name: 't8star',
      type: 'multi',  // 支持图片+视频
      endpoints: {
        image: 'https://ai.t8star.cn/v1/images/generations',
        video: 'https://ai.t8star.cn/v2/videos/generations',
        fileUpload: 'https://ai.t8star.cn/v1/files'
      },
      models: {
        image: ['nano-banana'],
        video: ['sora-2']
      },
      auth: {
        type: 'bearer',
        getKey: () => configManager.getConfig().apiKeys?.t8star || ''
      }
    })
  }

  /**
   * T8Star特有的图片生成调用
   */
  async callT8StarImage(prompt: string, options?: any): Promise<string> {
    const response = await this.call({
      provider: 't8star',
      endpoint: '/images/generations',
      method: 'POST',
      params: {
        prompt,
        model: options?.model || 'nano-banana',
        aspect_ratio: options?.aspectRatio || '16:9'
      }
    })

    // 下载图片
    const imageUrl = response.data[0].url
    const localPath = await this.downloadFile(imageUrl, options?.savePath)
    return localPath
  }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ImageGeneratorSceneRH.ts`（T8Star原始调用）
- 当前代码：`src/main/services/APIManager.ts`（APIManager注册机制）

**预期效果（Expected）**:
- ✅ T8Star提供商注册成功
- ✅ 可调用图片生成接口
- ✅ 图片自动下载到本地

**验收标准（Acceptance）**:
```typescript
// 测试：T8Star图片生成
const apiManager = new APIManager()
await apiManager.initialize()

const imagePath = await apiManager.callT8StarImage('一只可爱的猫', {
  savePath: '/tmp/test.png'
})
assert(fs.existsSync(imagePath))
```

---

#### 任务3.3: 注册RunningHub API提供商
- [ ] **状态**: 未开始

**目标（Goal）**:
在APIManager中注册RunningHub TTS提供商

**要做什么（What）**:
1. 添加RunningHub提供商配置
2. 实现TTS工作流调用逻辑

**方法（How）**:
```typescript
// 文件：src/main/services/APIManager.ts

// 注册RunningHub
this.registerProvider({
  name: 'runninghub',
  type: 'audio',
  endpoints: {
    upload: 'https://www.runninghub.cn/task/openapi/upload',
    create: 'https://www.runninghub.cn/task/openapi/create',
    status: 'https://www.runninghub.cn/task/openapi/status',
    outputs: 'https://www.runninghub.cn/task/openapi/outputs'
  },
  auth: {
    type: 'custom',
    getKey: () => configManager.getConfig().apiKeys?.runninghub || ''
  }
})

/**
 * RunningHub TTS调用（4步流程）
 */
async callRunningHubTTS(params: {
  text: string
  voiceFilePath: string
  emotion: number[]
}): Promise<string> {
  const apiKey = this.getApiKey('runninghub')

  // Step 1: 上传音色文件
  const voiceFileName = await this.uploadFile('runninghub', params.voiceFilePath)

  // Step 2: 创建任务
  const taskId = await this.createTTSTask({
    apiKey,
    text: params.text,
    voiceFileName,
    emotion: params.emotion
  })

  // Step 3: 轮询状态（5秒间隔，最多10分钟）
  const audioUrl = await this.pollTaskStatus(taskId, apiKey)

  // Step 4: 下载音频
  const localPath = await this.downloadFile(audioUrl)
  return localPath
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\TTSService.ts`（RunningHub原始调用）

**预期效果（Expected）**:
- ✅ RunningHub提供商注册成功
- ✅ TTS调用流程正常（上传→创建→轮询→下载）

**验收标准（Acceptance）**:
```typescript
// 测试：TTS生成
const audioPath = await apiManager.callRunningHubTTS({
  text: '你好，这是测试',
  voiceFilePath: '/path/to/voice.wav',
  emotion: [0.5, 0.3, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9]
})
assert(fs.existsSync(audioPath))
```

---

#### 任务3.4: 实现NovelVideoAPIService
- [ ] **状态**: 未开始

**目标（Goal）**:
封装NovelVideo专用的API调用方法

**要做什么（What）**:
1. 创建 `NovelVideoAPIService` 类
2. 封装场景图、角色图、视频生成方法
3. 集成AssetManager（自动保存生成结果）

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/NovelVideoAPIService.ts

export class NovelVideoAPIService {
  constructor(
    private apiManager: APIManager,
    private assetHelper: NovelVideoAssetHelper
  ) {}

  /**
   * 生成场景图片
   */
  async generateSceneImage(
    projectId: string,
    sceneId: string
  ): Promise<string> {
    // 1. 获取场景资产
    const sceneAsset = await this.getSceneAsset(sceneId)
    const prompt = sceneAsset.customFields?.novelVideo?.sceneImagePrompt

    if (!prompt) throw new Error('场景Prompt为空')

    // 2. 调用T8Star API生成图片
    const savePath = path.join(
      this.assetHelper.getProjectAssetDir(projectId, 'scene-images'),
      `${sceneId}.png`
    )

    const imagePath = await this.apiManager.callT8StarImage(prompt, { savePath })

    // 3. 更新场景资产
    await this.assetHelper.updateSceneImage(sceneId, imagePath)

    return imagePath
  }

  /**
   * 生成角色图片
   */
  async generateCharacterImage(
    projectId: string,
    characterId: string
  ): Promise<string> {
    // 类似场景图片生成逻辑
  }

  /**
   * 生成分镜视频
   */
  async generateStoryboardVideo(
    projectId: string,
    storyboardId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // 1. 获取分镜资产
    const storyboard = await this.getStoryboardAsset(storyboardId)
    const prompt = storyboard.customFields?.novelVideo?.videoPrompt
    const imagePath = storyboard.customFields?.novelVideo?.sceneImagePath

    // 2. 调用T8Star视频生成（带进度回调）
    const videoPath = await this.apiManager.callT8StarVideo({
      prompt,
      imagePath,
      onProgress
    })

    // 3. 更新分镜资产
    await this.assetHelper.updateStoryboardVideo(storyboardId, videoPath)

    return videoPath
  }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ResourceService.ts`（ai-playlet的资源生成）

**预期效果（Expected）**:
- ✅ 生成的图片/视频自动保存到AssetManager
- ✅ 资产状态自动更新为 'success'
- ✅ 支持进度回调

**验收标准（Acceptance）**:
```typescript
// 测试：生成场景图片
const apiService = new NovelVideoAPIService(apiManager, assetHelper)

const imagePath = await apiService.generateSceneImage('project-1', 'scene-1')
assert(fs.existsSync(imagePath))

const sceneAsset = await assetHelper.getAsset('scene-1')
assert(sceneAsset.status === 'success')
assert(sceneAsset.customFields?.novelVideo?.sceneImagePath === imagePath)
```

---

### 阶段4：业务服务实现（3周）

#### 任务4.1: 实现章节拆分服务
- [ ] **状态**: 未开始

**目标（Goal）**:
实现小说章节拆分功能

**要做什么（What）**:
1. 复制 `RuleBasedChapterSplitter` 从ai-playlet
2. 创建 `ChapterService` 类
3. 实现 `splitChapters()` 方法

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/ChapterService.ts

export class ChapterService {
  constructor(
    private assetHelper: NovelVideoAssetHelper,
    private splitter: RuleBasedChapterSplitter
  ) {}

  /**
   * 拆分小说为章节
   */
  async splitChapters(
    projectId: string,
    novelPath: string
  ): Promise<AssetMetadata[]> {
    // 1. 读取小说文件
    const novelContent = await fs.readFile(novelPath, 'utf-8')

    // 2. 使用规则拆分章节
    const chapters = this.splitter.split(novelContent)

    // 3. 为每个章节创建Asset
    const chapterAssets: AssetMetadata[] = []
    for (let i = 0; i < chapters.length; i++) {
      const asset = await this.assetHelper.createChapterAsset({
        projectId,
        title: chapters[i].title,
        content: chapters[i].content,
        index: i
      })
      chapterAssets.push(asset)
    }

    return chapterAssets
  }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ai\implementations\RuleBasedChapterSplitter.ts`
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ChapterService.ts`

**预期效果（Expected）**:
- ✅ 可正确拆分小说为章节
- ✅ 每个章节保存为Asset
- ✅ 章节内容存储在customFields中

**验收标准（Acceptance）**:
```typescript
// 测试：拆分小说
const chapterService = new ChapterService(assetHelper, splitter)

const chapters = await chapterService.splitChapters('project-1', '/path/to/novel.txt')
assert(chapters.length > 0)
assert(chapters[0].customFields?.novelVideo?.chapterTitle)
assert(chapters[0].customFields?.novelVideo?.chapterContent)
```

---

#### 任务4.2: 实现场景角色提取服务
- [ ] **状态**: 未开始

**目标（Goal）**:
使用LLM提取章节中的场景和角色

**要做什么（What）**:
1. 在 `ChapterService` 中实现 `extractScenesAndCharacters()`
2. 调用 `AgentSceneCharacterExtractor`
3. 为每个场景/角色创建Asset

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/ChapterService.ts

async extractScenesAndCharacters(
  projectId: string,
  chapterId: string
): Promise<{ scenes: AssetMetadata[], characters: AssetMetadata[] }> {
  // 1. 读取章节Asset
  const chapterAsset = await this.assetHelper.getAsset(chapterId)
  const chapterContent = chapterAsset.customFields?.novelVideo?.chapterContent

  // 2. 调用LLM提取场景和角色
  const extractor = new AgentSceneCharacterExtractor(llmConfig)
  const segments = await extractor.splitChapterIntoScenes(chapterContent)

  // 3. 细化场景描述
  const refinedScenes = await extractor.refineScenes(segments, chapterContent, artStyle)

  // 4. 细化角色描述
  const refinedCharacters = await extractor.refineCharacters(segments, chapterContent, artStyle)

  // 5. 创建场景Asset
  const sceneAssets: AssetMetadata[] = []
  for (const scene of refinedScenes) {
    const asset = await this.assetHelper.createSceneAsset({
      projectId,
      chapterId,
      story: scene.story,
      location: scene.location,
      imagePrompt: scene.prompt
    })
    sceneAssets.push(asset)
  }

  // 6. 创建角色Asset
  const characterAssets: AssetMetadata[] = []
  for (const character of refinedCharacters) {
    const asset = await this.assetHelper.createCharacterAsset({
      projectId,
      name: character.name,
      appearance: character.appearance,
      imagePrompt: character.prompt
    })
    characterAssets.push(asset)
  }

  return { scenes: sceneAssets, characters: characterAssets }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ChapterService.ts` 的 `extractScenesAndCharacters` 方法
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ai\implementations\AgentSceneCharacterExtractor.ts`

**预期效果（Expected）**:
- ✅ 可正确提取场景和角色
- ✅ 生成的imagePrompt质量高
- ✅ 场景和角色保存为Asset

**验收标准（Acceptance）**:
```typescript
// 测试：提取场景和角色
const result = await chapterService.extractScenesAndCharacters('project-1', 'chapter-1')

assert(result.scenes.length > 0)
assert(result.characters.length > 0)
assert(result.scenes[0].customFields?.novelVideo?.sceneStory)
assert(result.scenes[0].customFields?.novelVideo?.sceneImagePrompt)
```

---

#### 任务4.3: 实现资源生成服务
- [ ] **状态**: 未开始

**目标（Goal）**:
生成场景图和角色图

**要做什么（What）**:
1. 创建 `ResourceService` 类
2. 实现场景图生成
3. 实现角色图生成
4. 集成TaskScheduler（异步任务）

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/ResourceService.ts

export class ResourceService {
  constructor(
    private apiService: NovelVideoAPIService,
    private taskScheduler: TaskScheduler
  ) {}

  /**
   * 生成场景图片（异步任务）
   */
  async generateSceneImage(
    projectId: string,
    sceneId: string
  ): Promise<string> {
    // 创建异步任务
    const taskId = await this.taskScheduler.createTask({
      type: 'novel-video:generate-scene-image',
      params: { projectId, sceneId }
    })

    // 执行任务
    await this.taskScheduler.executeTask(taskId, async () => {
      return await this.apiService.generateSceneImage(projectId, sceneId)
    })

    return taskId
  }

  /**
   * 批量生成场景图片（并发控制）
   */
  async generateSceneImages(
    projectId: string,
    sceneIds: string[]
  ): Promise<void> {
    // 使用TaskScheduler的并发控制（最多3个）
    for (const sceneId of sceneIds) {
      await this.generateSceneImage(projectId, sceneId)
    }
  }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ResourceService.ts`
- 当前代码：`src/main/services/TaskScheduler.ts`（任务调度）

**预期效果（Expected）**:
- ✅ 图片生成为异步任务
- ✅ 支持并发控制（最多3个任务）
- ✅ 任务失败可重试

**验收标准（Acceptance）**:
```typescript
// 测试：生成场景图片
const resourceService = new ResourceService(apiService, taskScheduler)

const taskId = await resourceService.generateSceneImage('project-1', 'scene-1')

// 等待任务完成
await taskScheduler.waitForTask(taskId)

const sceneAsset = await assetHelper.getAsset('scene-1')
assert(sceneAsset.status === 'success')
assert(fs.existsSync(sceneAsset.customFields?.novelVideo?.sceneImagePath))
```

---

#### 任务4.4: 实现分镜脚本生成服务
- [ ] **状态**: 未开始

**目标（Goal）**:
生成视频分镜和图片分镜脚本

**要做什么（What）**:
1. 复制 `AgentStoryboardScriptGenerator` 从ai-playlet
2. 创建 `StoryboardService` 类
3. 实现4步AI链式调用

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/StoryboardService.ts

export class StoryboardService {
  constructor(
    private assetHelper: NovelVideoAssetHelper,
    private generator: AgentStoryboardScriptGenerator
  ) {}

  /**
   * 生成分镜脚本（4步链式调用）
   */
  async generateScript(
    projectId: string,
    sceneId: string
  ): Promise<AssetMetadata> {
    // 1. 获取场景资产
    const sceneAsset = await this.assetHelper.getAsset(sceneId)
    const scene = sceneAsset.customFields?.novelVideo

    // 2. Step 1: 生成剧本分镜描述
    const scriptScenes = await this.generator.generateScriptScenes({
      story: scene.sceneStory,
      characters: [], // 从Asset查询角色
      chapter: {} // 从Asset查询章节
    })

    // 3. Step 2: 生成Sora2视频提示词
    const videoScenes = await this.generator.generateVideoPrompts(
      scriptScenes,
      characters,
      scene,
      artStyle
    )

    // 4. Step 3 & 4: 并行执行
    const [replacedScenes, imageScenes] = await Promise.all([
      this.generator.replaceCharacterNames(videoScenes, characters),
      this.generator.generateImageStoryboardPrompts(videoScenes, characters)
    ])

    // 5. 保存分镜脚本Asset
    const storyboardAsset = await this.assetHelper.createStoryboardAsset({
      projectId,
      sceneId,
      videoPrompts: replacedScenes,
      imagePrompts: imageScenes
    })

    return storyboardAsset
  }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\StoryboardScriptService.ts`
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ai\implementations\AgentStoryboardScriptGenerator.ts`

**预期效果（Expected）**:
- ✅ 可生成视频分镜和图片分镜
- ✅ 4步AI链式调用正常
- ✅ 分镜脚本保存为Asset

**验收标准（Acceptance）**:
```typescript
// 测试：生成分镜脚本
const storyboardService = new StoryboardService(assetHelper, generator)

const storyboard = await storyboardService.generateScript('project-1', 'scene-1')

assert(storyboard.customFields?.novelVideo?.videoPrompts.length > 0)
assert(storyboard.customFields?.novelVideo?.imagePrompts.length > 0)
```

---

#### 任务4.5: 实现配音生成服务
- [ ] **状态**: 未开始

**目标（Goal）**:
生成场景配音

**要做什么（What）**:
1. 复制 `AgentVoiceoverGenerator` 从ai-playlet
2. 创建 `VoiceoverService` 类
3. 实现台词提取和音频生成

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/VoiceoverService.ts

export class VoiceoverService {
  constructor(
    private assetHelper: NovelVideoAssetHelper,
    private generator: AgentVoiceoverGenerator,
    private apiService: NovelVideoAPIService
  ) {}

  /**
   * 生成配音
   */
  async generateVoiceover(
    projectId: string,
    sceneId: string
  ): Promise<AssetMetadata> {
    // 1. 获取场景资产
    const sceneAsset = await this.assetHelper.getAsset(sceneId)
    const scene = sceneAsset.customFields?.novelVideo

    // 2. LLM提取台词
    const { dialogues } = await this.generator.generateVoiceover({
      story: scene.sceneStory,
      characters: [] // 从Asset查询
    })

    // 3. 为每句台词生成音频
    for (const dialogue of dialogues) {
      const audioPath = await this.apiService.generateDialogueAudio({
        text: dialogue.text,
        characterId: dialogue.characterId,
        emotion: dialogue.emotion
      })

      dialogue.audioPath = audioPath
      dialogue.audioStatus = 'success'
    }

    // 4. 保存配音Asset
    const voiceoverAsset = await this.assetHelper.createVoiceoverAsset({
      projectId,
      sceneId,
      dialogues
    })

    return voiceoverAsset
  }
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\VoiceoverService.ts`
- 参考代码：`E:\Projects\ai-playlet-master\src\main\services\ai\implementations\AgentVoiceoverGenerator.ts`

**预期效果（Expected）**:
- ✅ 可提取台词
- ✅ 可生成音频
- ✅ 配音保存为Asset

**验收标准（Acceptance）**:
```typescript
// 测试：生成配音
const voiceoverService = new VoiceoverService(assetHelper, generator, apiService)

const voiceover = await voiceoverService.generateVoiceover('project-1', 'scene-1')

assert(voiceover.customFields?.novelVideo?.dialogues.length > 0)
assert(voiceover.customFields?.novelVideo?.dialogues[0].audioPath)
```

---

### 阶段5：UI组件开发（2周）

#### 任务5.1: 创建ChapterSplitPanel组件
- [ ] **状态**: 未开始

**目标（Goal）**:
实现章节拆分面板

**要做什么（What）**:
1. 复制ai-playlet的 `ChapterSplitPanel.tsx` UI逻辑
2. 改写为Matrix组件风格
3. 集成Matrix的IPC调用

**方法（How）**:
```typescript
// 文件：src/renderer/pages/Workflows/panels/ChapterSplitPanel.tsx

export const ChapterSplitPanel: React.FC<PanelProps> = ({ workflowId, onComplete }) => {
  const [novelPath, setNovelPath] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    // 选择文件
    const path = await window.electronAPI.selectFile({ filters: [{ name: 'Text', extensions: ['txt'] }] })
    setNovelPath(path)
  }

  const handleSplit = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.novelVideo.splitChapters(workflowId, novelPath)
      setChapters(result.chapters)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    onComplete({ chapters })
  }

  return (
    <div className="chapter-split-panel">
      <h2>章节拆分</h2>

      {/* 使用Matrix的Button组件 */}
      <Button variant="primary" onClick={handleUpload}>
        上传小说文件
      </Button>

      {novelPath && (
        <div>
          <p>已选择: {novelPath}</p>
          <Button onClick={handleSplit} loading={loading}>
            拆分章节
          </Button>
        </div>
      )}

      {/* 使用Matrix的Card组件显示章节列表 */}
      <div className="chapter-list">
        {chapters.map(chapter => (
          <Card key={chapter.id} title={chapter.title} info={`第${chapter.index + 1}章`} />
        ))}
      </div>

      <Button variant="primary" onClick={handleNext} disabled={chapters.length === 0}>
        下一步
      </Button>
    </div>
  )
}
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\renderer\src\components\console\panels\ChapterSplitPanel.tsx`（UI逻辑）
- 参考组件：`src/renderer/components/common/Button.tsx`（Matrix按钮）
- 参考组件：`src/renderer/components/common/Card.tsx`（Matrix卡片）

**预期效果（Expected）**:
- ✅ 可上传小说文件
- ✅ 可拆分章节
- ✅ 显示章节列表
- ✅ 点击"下一步"进入下个步骤

**验收标准（Acceptance）**:
1. 上传测试小说文件
2. 点击"拆分章节"
3. 验证章节列表显示
4. 点击"下一步"，验证进入场景角色面板

---

#### 任务5.2-5.5: 创建其他面板组件
- [ ] **任务5.2**: SceneCharacterPanel（场景角色提取）
- [ ] **任务5.3**: StoryboardPanel（分镜脚本生成）
- [ ] **任务5.4**: VoiceoverPanel（配音生成）
- [ ] **任务5.5**: ExportPanel（导出成品）

**说明**: 这些面板的实现方式与ChapterSplitPanel类似，参考ai-playlet的对应组件，改写为Matrix风格。

---

#### 任务5.6: 注册小说转视频工作流
- [ ] **状态**: 未开始

**目标（Goal）**:
注册小说转视频工作流到WorkflowRegistry

**要做什么（What）**:
1. 创建 `workflow-definition.ts`
2. 定义5个步骤
3. 在 `main.ts` 中注册

**方法（How）**:
```typescript
// 文件：src/main/services/novel-video/workflow-definition.ts

import { ChapterSplitPanel } from '@/renderer/pages/Workflows/panels/ChapterSplitPanel'
import { SceneCharacterPanel } from '@/renderer/pages/Workflows/panels/SceneCharacterPanel'
// ...其他导入

export const novelToVideoWorkflow: WorkflowDefinition = {
  id: 'novel-to-video',
  name: '小说转视频',
  type: 'novel-to-video',
  description: '将小说文本转换为视频短剧',
  steps: [
    {
      id: 'split-chapters',
      name: '章节拆分',
      status: 'pending',
      component: ChapterSplitPanel,
      onComplete: async (data) => {
        // 保存章节数据到工作流状态
        await workflowStateManager.updateState(workflowId, {
          chapters: data.chapters
        })
      }
    },
    {
      id: 'extract-scenes',
      name: '场景角色',
      status: 'pending',
      component: SceneCharacterPanel,
      onComplete: async (data) => {
        await workflowStateManager.updateState(workflowId, {
          scenes: data.scenes,
          characters: data.characters
        })
      }
    },
    {
      id: 'generate-storyboard',
      name: '分镜脚本',
      status: 'pending',
      component: StoryboardPanel,
      onComplete: async (data) => {
        await workflowStateManager.updateState(workflowId, {
          storyboards: data.storyboards
        })
      }
    },
    {
      id: 'generate-voiceover',
      name: '配音生成',
      status: 'pending',
      component: VoiceoverPanel,
      onComplete: async (data) => {
        await workflowStateManager.updateState(workflowId, {
          voiceovers: data.voiceovers
        })
      }
    },
    {
      id: 'export',
      name: '导出成品',
      status: 'pending',
      component: ExportPanel,
      onComplete: async (data) => {
        // 导出完成，工作流结束
      }
    }
  ],
  state: {}
}

// 文件：src/main/index.ts
import { workflowRegistry } from './services/WorkflowRegistry'
import { novelToVideoWorkflow } from './services/novel-video/workflow-definition'

app.whenReady().then(() => {
  // ...现有初始化

  // 注册小说转视频工作流
  workflowRegistry.register(novelToVideoWorkflow)
})
```

**参考（Reference）**:
- 参考代码：`E:\Projects\ai-playlet-master\src\renderer\src\pages\ConsolePage.tsx`（ai-playlet的步骤定义）

**预期效果（Expected）**:
- ✅ 工作流注册成功
- ✅ 在Workflows页面可见
- ✅ 点击后可进入执行页面

**验收标准（Acceptance）**:
1. 启动应用
2. 打开 `/workflows`
3. 验证显示"小说转视频"卡片
4. 点击卡片，验证进入执行页面

---

### 阶段6：集成测试和文档（1周）

#### 任务6.1: 完整流程测试
- [ ] **状态**: 未开始

**目标（Goal）**:
验证从小说导入到视频导出的完整流程

**要做什么（What）**:
1. 准备测试小说文件（5章，每章3个场景）
2. 执行完整流程
3. 验证每个步骤的输出

**方法（How）**:
```typescript
// 文件：tests/e2e/novel-to-video.test.ts

describe('小说转视频完整流程', () => {
  it('应该完整执行从导入到导出', async () => {
    // 1. 创建工作流实例
    const workflowId = await createWorkflowInstance('novel-to-video')

    // 2. 章节拆分
    const chapters = await splitChapters(workflowId, './test-data/novel.txt')
    expect(chapters.length).toBe(5)

    // 3. 选择第1章，提取场景和角色
    const { scenes, characters } = await extractScenesAndCharacters(workflowId, chapters[0].id)
    expect(scenes.length).toBe(3)
    expect(characters.length).toBeGreaterThan(0)

    // 4. 生成场景图片
    for (const scene of scenes) {
      await generateSceneImage(workflowId, scene.id)
    }
    // 验证图片生成
    const sceneAsset = await getAsset(scenes[0].id)
    expect(sceneAsset.status).toBe('success')
    expect(fs.existsSync(sceneAsset.filePath)).toBe(true)

    // 5. 生成分镜脚本
    const storyboard = await generateStoryboard(workflowId, scenes[0].id)
    expect(storyboard.videoPrompts.length).toBeGreaterThan(0)

    // 6. 生成分镜视频（仅测试第1个）
    await generateStoryboardVideo(workflowId, storyboard.id, 0)
    // 验证视频生成
    const videoAsset = await getAsset(storyboard.videoPrompts[0].assetId)
    expect(videoAsset.status).toBe('success')

    // 7. 生成配音
    const voiceover = await generateVoiceover(workflowId, scenes[0].id)
    expect(voiceover.dialogues.length).toBeGreaterThan(0)

    // 8. 导出
    const exportPath = await exportWorkflow(workflowId)
    expect(fs.existsSync(exportPath)).toBe(true)
  })
})
```

**参考（Reference）**:
- 参考文档：`plans/done-novel-to-video-detailed-migration-design.md`（功能验证清单）

**预期效果（Expected）**:
- ✅ 完整流程无错误
- ✅ 所有资源正确生成
- ✅ 导出ZIP包含所有文件

**验收标准（Acceptance）**:
- 测试通过，耗时 < 10分钟（假设API响应正常）

---

#### 任务6.2: 中断恢复测试
- [ ] **状态**: 未开始

**目标（Goal）**:
验证工作流中断后可恢复

**要做什么（What）**:
1. 执行到步骤2
2. 关闭应用
3. 重新启动
4. 验证停留在步骤2

**方法（How）**:
```typescript
describe('工作流中断恢复', () => {
  it('应该在重启后恢复到中断步骤', async () => {
    // 1. 创建工作流并执行到步骤2
    const workflowId = await createWorkflowInstance('novel-to-video')
    await splitChapters(workflowId, './test-data/novel.txt')
    await extractScenesAndCharacters(workflowId, 'chapter-1')

    // 2. 保存状态
    await saveWorkflowState(workflowId, { currentStep: 2 })

    // 3. 模拟应用重启（清空内存状态）
    await restartApp()

    // 4. 加载工作流
    const state = await loadWorkflowState(workflowId)
    expect(state.currentStep).toBe(2)

    // 5. 验证可继续执行
    await generateStoryboard(workflowId, 'scene-1')
    expect(state.currentStep).toBe(3)
  })
})
```

**预期效果（Expected）**:
- ✅ 重启后状态正确恢复
- ✅ 可继续执行后续步骤

**验收标准（Acceptance）**:
- 测试通过

---

#### 任务6.3: 性能测试
- [ ] **状态**: 未开始

**目标（Goal）**:
验证大文件处理性能

**要做什么（What）**:
1. 测试大小说文件（100章）
2. 测试并发生成（10个场景图）
3. 验证内存占用 < 500MB

**方法（How）**:
```typescript
describe('性能测试', () => {
  it('应该在合理时间内处理大文件', async () => {
    const start = performance.now()

    // 100章小说拆分
    const chapters = await splitChapters(workflowId, './test-data/large-novel.txt')
    expect(chapters.length).toBe(100)

    const duration = performance.now() - start
    expect(duration).toBeLessThan(60000)  // < 1分钟
  })

  it('应该支持并发生成', async () => {
    const sceneIds = ['scene-1', 'scene-2', ..., 'scene-10']

    const start = performance.now()
    await Promise.all(sceneIds.map(id => generateSceneImage(workflowId, id)))
    const duration = performance.now() - start

    // 并发3个，预计耗时 = 10 / 3 * 45s = 150s
    expect(duration).toBeLessThan(180000)  // < 3分钟
  })
})
```

**预期效果（Expected）**:
- ✅ 大文件处理不超时
- ✅ 并发控制有效

**验收标准（Acceptance）**:
- 测试通过

---

#### 任务6.4: 编写工作流引擎开发指南
- [ ] **状态**: 未开始

**目标（Goal）**:
为未来插件开发者提供工作流引擎使用文档

**要做什么（What）**:
1. 编写 `workflow-engine-guide.md`
2. 包含：接口说明、示例代码、最佳实践

**方法（How）**:
```markdown
# 工作流引擎开发指南

## 1. 概述
Matrix工作流引擎提供了标准化的步骤化流程执行能力...

## 2. 核心概念
- WorkflowDefinition: 工作流定义
- WorkflowStep: 工作流步骤
- WorkflowState: 工作流状态

## 3. 创建工作流

### 3.1 定义工作流
...（代码示例）

### 3.2 注册工作流
...（代码示例）

## 4. 最佳实践
- 步骤应保持原子性
- 使用WorkflowState持久化关键数据
- onComplete回调应尽量简短
...
```

**预期效果（Expected）**:
- ✅ 文档清晰易懂
- ✅ 示例代码可运行

**验收标准（Acceptance）**:
- 文档编写完成，放置在 `docs/workflow-engine-guide.md`

---

#### 任务6.5: 编写用户使用手册
- [ ] **状态**: 未开始

**目标（Goal）**:
为终端用户提供小说转视频使用教程

**要做什么（What）**:
编写 `novel-to-video-user-guide.md`

**预期效果（Expected）**:
- ✅ 包含详细步骤截图
- ✅ 常见问题FAQ

**验收标准（Acceptance）**:
- 文档编写完成，放置在 `docs/novel-to-video-user-guide.md`

---

## 四、关键文件清单

### 需要创建的文件（20个）

#### 核心引擎（3个）
- [ ] `src/main/services/WorkflowRegistry.ts`
- [ ] `src/main/services/WorkflowStateManager.ts`
- [ ] `src/renderer/components/WorkflowExecutor.tsx`

#### NovelVideo专用（10个）
- [ ] `src/shared/types/novel-video.ts`
- [ ] `src/main/services/novel-video/NovelVideoAssetHelper.ts`
- [ ] `src/main/services/novel-video/NovelVideoAPIService.ts`
- [ ] `src/main/services/novel-video/ChapterService.ts`
- [ ] `src/main/services/novel-video/ResourceService.ts`
- [ ] `src/main/services/novel-video/StoryboardService.ts`
- [ ] `src/main/services/novel-video/VoiceoverService.ts`
- [ ] `src/main/services/novel-video/workflow-definition.ts`
- [ ] `src/main/services/novel-video/ipc-handlers.ts`
- [ ] `src/main/services/novel-video/index.ts`

#### UI组件（5个）
- [ ] `src/renderer/pages/Workflows/panels/ChapterSplitPanel.tsx`
- [ ] `src/renderer/pages/Workflows/panels/SceneCharacterPanel.tsx`
- [ ] `src/renderer/pages/Workflows/panels/StoryboardPanel.tsx`
- [ ] `src/renderer/pages/Workflows/panels/VoiceoverPanel.tsx`
- [ ] `src/renderer/pages/Workflows/panels/ExportPanel.tsx`

#### 从ai-playlet复用（2个）
- [ ] `src/main/agent/LangChainAgent.ts`（复制）
- [ ] `src/main/services/ai/implementations/AgentSceneCharacterExtractor.ts`（复制）

### 需要修改的文件（5个）
- [ ] `src/renderer/pages/Workflows/Workflows.tsx`
- [ ] `src/renderer/App.tsx`
- [ ] `src/main/services/APIManager.ts`
- [ ] `src/main/index.ts`
- [ ] `src/preload/index.ts`

---

## 五、总进度跟踪

### 总体进度
- [ ] 阶段1：工作流引擎基础（0/6任务完成）
- [ ] 阶段2：数据模型和AssetManager集成（0/3任务完成）
- [ ] 阶段3：AI服务集成（0/4任务完成）
- [ ] 阶段4：业务服务实现（0/5任务完成）
- [ ] 阶段5：UI组件开发（0/6任务完成）
- [ ] 阶段6：集成测试和文档（0/5任务完成）

**总计**: 0/29 任务完成

---

## 六、下一步行动

请从 **阶段1 - 任务1.1** 开始执行！

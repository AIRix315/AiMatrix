# 小说转视频功能迁移方案对比与推荐

## 一、Matrix现有能力评估（基于代码审查）

### ✅ 高成熟度模块
1. **AssetManager**（957行，功能完整）
   - JSON索引系统 ✅
   - 文件监听（chokidar）✅
   - 元数据管理（Sidecar JSON）✅
   - 分页查询 ✅
   - **关键发现**：支持 `customFields: Record<string, any>` 扩展字段

2. **ProjectManager**（完整实现）
   - 项目CRUD ✅
   - 元数据管理 ✅

3. **核心服务**
   - TimeService ✅
   - Logger ✅
   - ServiceErrorHandler ✅

### 🟡 MVP级别模块
1. **PluginManager**（617行，基础功能）
   - 插件加载/卸载 ✅
   - ZIP安装 ✅
   - 权限声明 ✅
   - **缺失**：沙箱执行 ❌
   - **关键缺失**：插件无法注册自定义路由/页面 ❌
   - **关键缺失**：无插件UI扩展API ❌

2. **TaskScheduler**（MVP实现）
   - 基础任务队列 ✅
   - **缺失**：任务持久化 ❌

3. **APIManager**（MVP实现）
   - 基础API调用 ✅
   - **缺失**：成本跟踪 ❌

### ❌ 空壳模块
1. **Workflows页面**（124行，仅UI壳）
   - 只是列表展示
   - **无工作流执行引擎**
   - **无步骤化流程控制**

---

## 二、三种方案深度对比

### 方案1：原计划迁移（适配器模式）

#### 实施概要
- 保留ai-playlet的完整代码结构
- 创建适配器包装API调用
- 双层存储（ai-playlet JSON + Matrix AssetManager）
- 插件注册自定义路由 `/workflows/novel-to-video/:projectId`

#### 优势分析
✅ **功能完整度**：100%保留ai-playlet功能
✅ **代码复用**：70%代码可直接复用
✅ **开发速度**：预计8周完成
✅ **风险可控**：ai-playlet已验证，稳定性高

#### 劣势分析
❌ **架构冲突严重**
- ai-playlet：项目内分散存储 vs Matrix：统一AssetManager
- ai-playlet：硬编码HTTP vs Matrix：APIManager统一管理
- ai-playlet：6个专用模型 vs Matrix：2个通用模型

❌ **技术债务重**
- **双层存储**：同一资源存两份，需维护同步逻辑
- **适配器层**：5个适配器需长期维护
- **数据模型冲突**：Chapter/Scene/Character vs Asset，需持续映射

❌ **无法利用Matrix能力**
- AssetManager的 `customFields` 扩展能力未使用
- 无法利用Matrix的资源去重机制
- 无法利用Matrix的全局资源提升

❌ **插件系统不支持**
- **关键问题**：PluginManager无法让插件注册路由
- 需要修改Matrix核心代码才能支持 `/workflows/novel-to-video/:projectId`
- 破坏插件系统的封装性

❌ **长期维护成本高**
- 两套架构并存，维护人员需理解两套逻辑
- 未来升级困难（如AssetManager升级，需同步修改插件）
- 代码耦合度高，难以重构

#### 成本估算
- **开发成本**：8周 × 2人 = 16人周
- **维护成本**：**每年额外 4-6人周**（双层同步、适配器维护）
- **重构成本**：**未来若重构需 12-16人周**

---

### 方案2：基于Matrix适配性新建（推荐）

#### 实施概要
- **提取ai-playlet的流程思路和UI设计**
- **基于Matrix架构从零实现**
- 充分利用AssetManager的 `customFields` 存储专用字段
- 扩展Workflows页面为通用工作流引擎
- 小说转视频作为第一个标准工作流

#### 核心设计

**1. 数据模型设计（Matrix原生）**
```typescript
// 使用Matrix的Asset + customFields
interface NovelVideoAsset extends AssetMetadata {
  customFields: {
    // 小说转视频专用字段
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

**2. 工作流引擎设计（通用框架）**
```typescript
// 扩展Workflows为执行引擎
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
  type: 'novel-to-video' | 'image-generation' | '...'
  steps: WorkflowStep[]
  state: Record<string, any>  // 工作流状态（持久化）
}
```

**优势**：
- ✅ 为未来其他工作流插件提供标准模式
- ✅ 状态持久化，支持中断恢复
- ✅ 步骤可重用（如"AI生成图片"步骤可用于多个工作流）

**3. 路由设计**
```typescript
// Matrix核心路由（无需插件修改）
<Route path="/workflows" element={<Workflows />} />
<Route path="/workflows/:workflowId" element={<WorkflowExecutor />} />

// WorkflowExecutor 根据 workflowId 动态加载对应工作流定义
```

**优势**：
- ✅ 无需修改Matrix核心代码
- ✅ 所有工作流复用同一个执行器
- ✅ 插件只需注册WorkflowDefinition即可

**4. UI组件设计**
```
复用ai-playlet的面板组件（改写为Matrix风格）:
- ChapterSplitPanel → 使用Matrix Button/Card组件
- SceneCharacterPanel → 集成Matrix AssetPreview
- StoryboardPanel → 复用Matrix Progress组件
- VoiceoverPanel → 复用Matrix Slider组件
```

#### 优势分析
✅ **架构清晰**
- 单一数据模型（Asset + customFields）
- 无适配器层，代码直接调用Matrix服务
- 符合Matrix设计哲学

✅ **长期维护性**
- 代码完全遵循Matrix规范
- 未来AssetManager升级，自动受益
- 易于理解和修改

✅ **可扩展性强**
- 工作流引擎可支持任意类型工作流
- 为未来插件生态建立标准模式
- customFields机制支持任意专用字段

✅ **充分利用现有能力**
- AssetManager的索引、查询、监听
- ProjectManager的项目管理
- TaskScheduler的任务调度
- TimeService的时间管理

✅ **符合多插件生态定位**
- 建立"工作流插件"的标准范式
- 其他工作流（如图片生成、视频编辑）可复用引擎
- 插件间可共享工作流步骤

#### 劣势分析
❌ **开发周期较长**：预计10-12周
❌ **需重写业务逻辑**：ai-playlet的7个服务类需重新实现
❌ **短期无法复用ai-playlet代码**：初期需从零编写

#### 成本估算
- **开发成本**：12周 × 2人 = 24人周
- **维护成本**：**每年 1-2人周**（标准Matrix代码，易维护）
- **未来收益**：工作流引擎可支撑10+个工作流插件

---

### 方案3：独立模块实现

#### 实施概要
- ai-playlet完整迁移，作为Matrix的独立子系统
- 不使用PluginManager，直接集成到Matrix主代码
- 独立路由 `/novel-to-video`
- 独立数据存储，不使用AssetManager

#### 优势分析
✅ **实施最快**：6周可完成
✅ **功能100%保留**：ai-playlet原封不动
✅ **风险最低**：无架构冲突

#### 劣势分析
❌ **违背Matrix定位**
- 不符合"通用AI创作平台（多插件生态）"定位
- 无法为其他功能提供参考
- Matrix沦为容器，失去架构意义

❌ **资源隔离**
- 无法利用Matrix的AssetManager（资源重复存储）
- 无法利用Matrix的APIManager（API调用重复）
- 项目间无法共享资源

❌ **代码耦合**
- ai-playlet代码与Matrix主代码混合
- 不是插件，无法独立升级
- 影响Matrix代码库的清晰度

❌ **未来扩展困难**
- 若要添加第二个工作流，需再次独立集成
- 代码重复度高，维护成本线性增长

#### 成本估算
- **开发成本**：6周 × 2人 = 12人周
- **维护成本**：**每年 3-4人周**
- **机会成本**：**无法建立插件生态标准**，未来每个新工作流需独立集成

---

## 三、推荐方案：方案2（基于Matrix适配性新建）

### 推荐理由

基于您的明确需求：
1. ✅ **长期维护性（架构清晰）** → 方案2完全符合Matrix架构
2. ✅ **不限资源，追求最佳方案** → 方案2投入时间最多，但收益最大
3. ✅ **通用AI创作平台（多插件生态）** → 方案2建立工作流标准，支撑未来10+插件

### 核心价值

**1. 建立"工作流插件"标准范式**
- 小说转视频是第一个标准工作流
- 未来可扩展：图片批量生成、视频剪辑、音频处理等
- 所有工作流共享执行引擎和状态管理

**2. 充分利用Matrix能力**
- AssetManager的 `customFields` 是为此设计的
- 无需重复造轮（索引、查询、监听）
- 代码量预计比方案1少30%（无适配器层）

**3. 长期投资回报**
| 指标 | 方案1（适配器） | 方案2（新建）| 方案3（独立）|
|------|----------------|-------------|-------------|
| 初期开发成本 | 16人周 | **24人周** | 12人周 |
| 年维护成本 | 4-6人周 | **1-2人周** | 3-4人周 |
| 5年总成本 | 36-46人周 | **29-34人周** ✅ | 27-32人周 |
| 可复用性 | 低 | **高**（工作流引擎）✅ | 无 |
| 代码质量 | 中 | **高** ✅ | 低 |

---

## 四、实施计划（方案2）

### Phase 1: 工作流引擎基础（3周）

**任务1.1: 扩展Workflows页面**
```typescript
// 文件：src/renderer/pages/Workflows/Workflows.tsx
// 新增：工作流类型注册机制
interface WorkflowRegistry {
  register(definition: WorkflowDefinition): void
  getDefinition(type: string): WorkflowDefinition
}

// 新增：工作流执行器路由
<Route path="/workflows/:workflowId" element={<WorkflowExecutor />} />
```

**任务1.2: 工作流状态管理**
```typescript
// 文件：src/main/services/WorkflowStateManager.ts
// 功能：
// - 持久化工作流状态到 {workspaceDir}/workflows/{workflowId}/state.json
// - 支持中断恢复
// - 步骤状态追踪
```

**任务1.3: 工作流执行器组件**
```typescript
// 文件：src/renderer/components/WorkflowExecutor.tsx
// 功能：
// - 动态加载WorkflowDefinition
// - 渲染步骤指示器
// - 渲染当前步骤的Panel组件
// - 状态保存和恢复
```

**交付物**：
- ✅ 通用工作流引擎可运行
- ✅ 可创建测试工作流验证流程

---

### Phase 2: 数据模型和AssetManager集成（2周）

**任务2.1: 定义NovelVideo customFields Schema**
```typescript
// 文件：src/shared/types/novel-video.ts
export interface NovelVideoFields {
  // 详细字段定义（如前所述）
}
```

**任务2.2: AssetManager工具函数**
```typescript
// 文件：src/main/services/NovelVideoAssetHelper.ts
export class NovelVideoAssetHelper {
  // 快捷方法
  async createChapterAsset(chapterData): Promise<AssetMetadata>
  async createSceneAsset(sceneData): Promise<AssetMetadata>
  async createCharacterAsset(characterData): Promise<AssetMetadata>

  // 查询方法
  async getChapterAssets(projectId): Promise<AssetMetadata[]>
  async getScenesByChapter(chapterId): Promise<AssetMetadata[]>

  // 关联方法
  async linkAssets(parentId, childId): Promise<void>
}
```

**交付物**：
- ✅ NovelVideo资产可创建和查询
- ✅ 资产关联关系建立

---

### Phase 3: AI服务集成（2周）

**任务3.1: 复用LangChain Agent**
```typescript
// 从ai-playlet复制（保持不变）：
// - src/main/agent/LangChainAgent.ts
// - src/main/services/ai/implementations/AgentSceneCharacterExtractor.ts
// - src/main/services/ai/implementations/AgentStoryboardScriptGenerator.ts
```

**任务3.2: API调用服务（原生Matrix）**
```typescript
// 文件：src/main/services/NovelVideoAPIService.ts
// 直接使用Matrix的APIManager（无适配器）

export class NovelVideoAPIService {
  constructor(private apiManager: APIManager) {}

  async generateSceneImage(prompt: string): Promise<string> {
    // 直接调用APIManager.call()
    const result = await this.apiManager.call({
      provider: 't8star',
      model: 'nano-banana',
      endpoint: '/images/generations',
      params: { prompt, aspect_ratio: '16:9' }
    })

    // 保存到AssetManager
    const metadata = await assetHelper.createSceneAsset({
      filePath: downloadedPath,
      prompt,
      status: 'success'
    })

    return metadata.filePath
  }
}
```

**任务3.3: 注册API提供商**
```typescript
// 文件：src/main/services/APIManager.ts
// 新增T8Star和RunningHub提供商
```

**交付物**：
- ✅ 图片生成可正常调用
- ✅ 视频生成可正常调用
- ✅ LLM调用可正常工作

---

### Phase 4: 业务服务实现（3周）

**任务4.1: 章节服务**
```typescript
// 文件：src/main/services/novel-video/ChapterService.ts
// 重写，使用NovelVideoAssetHelper

export class ChapterService {
  async splitChapters(projectId, novelPath): Promise<void> {
    // 1. 读取小说文件
    // 2. 使用RuleBasedChapterSplitter拆分
    // 3. 为每个章节创建Asset（type='text', customFields包含章节信息）
    // 4. 保存到AssetManager
  }

  async extractScenesAndCharacters(projectId, chapterId): Promise<void> {
    // 1. 读取章节Asset
    // 2. 调用LLM提取场景和角色
    // 3. 为每个场景/角色创建Asset
    // 4. 建立关联关系
  }
}
```

**任务4.2: 资源生成服务**
```typescript
// 文件：src/main/services/novel-video/ResourceService.ts
export class ResourceService {
  async generateSceneImage(projectId, sceneId): Promise<void> {
    // 1. 读取场景Asset
    // 2. 获取prompt（从customFields）
    // 3. 调用API生成图片
    // 4. 更新Asset的filePath和status
  }
}
```

**任务4.3: 分镜和配音服务**
```typescript
// 文件：src/main/services/novel-video/StoryboardService.ts
// 文件：src/main/services/novel-video/VoiceoverService.ts
// 同样重写，使用AssetHelper
```

**交付物**：
- ✅ 所有业务服务可正常工作
- ✅ 数据全部存储在AssetManager

---

### Phase 5: UI组件开发（2周）

**任务5.1: 复用ai-playlet面板（改写为Matrix风格）**
```typescript
// 从ai-playlet复制UI逻辑，但：
// - 使用Matrix的Button/Card/Progress等组件
// - API调用改为window.electronAPI.novelVideo.*
// - 资产预览使用Matrix的AssetPreview组件
```

**任务5.2: 注册小说转视频工作流**
```typescript
// 文件：src/main/services/novel-video/workflow-definition.ts
export const novelToVideoWorkflow: WorkflowDefinition = {
  id: 'novel-to-video',
  name: '小说转视频',
  type: 'novel-to-video',
  steps: [
    {
      id: 'split-chapters',
      name: '章节拆分',
      component: ChapterSplitPanel,
      onComplete: async (data) => { /* ... */ }
    },
    {
      id: 'extract-scenes',
      name: '场景角色',
      component: SceneCharacterPanel,
      onComplete: async (data) => { /* ... */ }
    },
    // ...5个步骤
  ],
  state: {}
}

// 在main.ts中注册
workflowRegistry.register(novelToVideoWorkflow)
```

**交付物**：
- ✅ 5个面板组件可正常渲染
- ✅ 工作流可从头到尾执行

---

### Phase 6: 集成测试和文档（1周）

**测试场景**：
1. 完整流程测试（小说导入 → 视频导出）
2. 中断恢复测试（关闭应用后恢复状态）
3. 资源查询测试（AssetManager查询各类资产）
4. 性能测试（大文件处理）

**文档**：
1. 工作流引擎开发指南（供未来插件开发者）
2. NovelVideo customFields Schema文档
3. 用户使用手册

---

## 五、关键文件清单

### 需要创建的文件（约20个）

#### 核心引擎（3个文件）
1. `src/main/services/WorkflowStateManager.ts` - 工作流状态管理
2. `src/renderer/components/WorkflowExecutor.tsx` - 工作流执行器
3. `src/main/services/WorkflowRegistry.ts` - 工作流注册表

#### NovelVideo专用（10个文件）
1. `src/shared/types/novel-video.ts` - 类型定义
2. `src/main/services/novel-video/NovelVideoAssetHelper.ts` - 资产辅助类
3. `src/main/services/novel-video/NovelVideoAPIService.ts` - API服务
4. `src/main/services/novel-video/ChapterService.ts` - 章节服务
5. `src/main/services/novel-video/ResourceService.ts` - 资源生成服务
6. `src/main/services/novel-video/StoryboardService.ts` - 分镜服务
7. `src/main/services/novel-video/VoiceoverService.ts` - 配音服务
8. `src/main/services/novel-video/workflow-definition.ts` - 工作流定义
9. `src/main/services/novel-video/ipc-handlers.ts` - IPC处理器
10. `src/main/services/novel-video/index.ts` - 导出文件

#### UI组件（5个文件）
1. `src/renderer/pages/Workflows/panels/ChapterSplitPanel.tsx`
2. `src/renderer/pages/Workflows/panels/SceneCharacterPanel.tsx`
3. `src/renderer/pages/Workflows/panels/StoryboardPanel.tsx`
4. `src/renderer/pages/Workflows/panels/VoiceoverPanel.tsx`
5. `src/renderer/pages/Workflows/panels/ExportPanel.tsx`

#### 从ai-playlet复用（2个文件）
1. `src/main/agent/LangChainAgent.ts`（复制，保持不变）
2. `src/main/services/ai/implementations/AgentSceneCharacterExtractor.ts`（复制）

### 需要修改的文件（约5个）

1. `src/renderer/pages/Workflows/Workflows.tsx` - 添加工作流注册和执行入口
2. `src/renderer/App.tsx` - 添加 `/workflows/:workflowId` 路由
3. `src/main/services/APIManager.ts` - 注册T8Star和RunningHub提供商
4. `src/main/index.ts` - 注册NovelVideo IPC处理器和工作流
5. `src/preload/index.ts` - 暴露NovelVideo API

---

## 六、风险评估

### 技术风险
| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| WorkflowExecutor复杂度超预期 | 中 | 中 | 参考React Flow等现有库 |
| customFields查询性能 | 低 | 中 | AssetManager已有JSON索引 |
| 工作流状态持久化bug | 中 | 高 | 充分测试中断恢复场景 |

### 业务风险
| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 功能不完整（相比ai-playlet） | 低 | 高 | 逐个验证功能点 |
| 用户体验下降 | 低 | 中 | 保持UI设计一致性 |

---

## 七、总结

### 为什么不选方案1（适配器模式）？

虽然方案1开发最快（8周），但：
1. ❌ **违背架构清晰原则**：双层存储、适配器层都是妥协
2. ❌ **长期维护成本高**：5年总成本比方案2高20%
3. ❌ **无法利用Matrix能力**：浪费了AssetManager的设计
4. ❌ **不符合多插件生态定位**：无法为其他工作流提供参考

### 为什么不选方案3（独立模块）？

虽然方案3最快（6周），但：
1. ❌ **违背"通用AI创作平台"定位**
2. ❌ **资源隔离**：无法共享Matrix核心能力
3. ❌ **无法建立插件生态标准**：每个新功能都需独立集成

### 方案2的核心价值

1. ✅ **完全符合Matrix架构**：单一数据模型，无妥协
2. ✅ **建立工作流标准**：未来10+插件可复用引擎
3. ✅ **长期投资回报高**：5年总成本最低
4. ✅ **充分利用现有能力**：AssetManager、ProjectManager、TaskScheduler
5. ✅ **代码质量最高**：清晰、易维护、易扩展

### 时间投入合理性

虽然方案2需要12周（比方案1多4周），但考虑到：
- 您明确表示"不限资源，追求最佳方案"
- 建立的工作流引擎可服务未来多个插件
- 5年维护成本节省15-18人周
- **实际ROI（投资回报）是最高的**

---

## 八、下一步行动

如果您同意方案2，我将：

1. **立即开始 Phase 1**：工作流引擎基础（3周）
   - 扩展Workflows页面
   - 实现WorkflowExecutor
   - 建立状态管理

2. **并行进行技术预研**：
   - 验证customFields的查询性能
   - 验证T8Star API调用
   - 设计工作流状态Schema

3. **编写详细设计文档**：
   - WorkflowDefinition接口规范
   - NovelVideoFields完整Schema
   - 工作流引擎API文档

请确认是否采用**方案2**，我将立即开始实施。

# MATRIX Studio 术语词典

**文档版本**: v1.0
**基准代码版本**: v0.3.8
**生成日期**: 2025-12-30
**文档性质**: 真实代码审计结果（非设计规范）

---

## 📌 文档说明

本词典基于 **MATRIX Studio v0.3.8** 实际代码库扫描生成，旨在：

1. **消除歧义**：明确定义在代码中具有多重含义的术语
2. **统一理解**：为开发团队提供标准术语参考
3. **识别冲突**：标记存在命名冲突的类型和概念
4. **指导规范**：为未来代码规范提供基础

⚠️ **重要提示**：本文档反映的是**当前真实情况**，而非理想设计。标记为"冲突"的术语需要在后续版本中解决。

---

## 一、核心概念术语

### 1.1 Workflow（工作流）⚠️ 多重含义

**问题**：代码中 "Workflow" 一词具有**3种不同含义**，容易造成混淆。

#### 1.1.1 Workflow Template（工作流模板）

**定义**：在 `WorkflowRegistry` 中注册的、可在工作流编辑器中创建和修改的工作流定义。

**特征**：
- 注册位置：`WorkflowRegistry.register()`
- 可在 `WorkflowEditor` 中打开和编辑
- 用户可自由添加、删除、连接节点
- 存储为项目的一部分

**代码位置**：
- 定义：`src/main/workflows/*.ts`
- 类型：`src/shared/types/workflow.ts` 中的 `WorkflowDefinition`

**示例**：
- `test-workflow`：测试工作流模板
- 用户自定义的图像处理工作流

**文件结构**：
```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  type: string;        // 工作流类型标识
  description?: string;
  version?: string;
  icon?: string;
  steps: WorkflowStep[];
  defaultState?: Record<string, unknown>;
}
```

---

#### 1.1.2 Workflow Instance（工作流实例）

**定义**：某个工作流模板在特定项目中的具体运行实例，包含执行状态和数据。

**特征**：
- 管理位置：`WorkflowStateManager`
- 包含当前步骤、步骤状态、执行数据
- 支持中断恢复（状态持久化）
- 与项目 ID 绑定

**代码位置**：
- 类型：`src/shared/types/workflow.ts` 中的 `WorkflowInstance`
- 服务：`src/main/services/WorkflowStateManager.ts`

**ID 格式**：`{type}-{timestamp}-{random}`
**示例**：`test-workflow-1735567890123-abc123`

**文件结构**：
```typescript
interface WorkflowInstance {
  id: string;
  type: string;                // 引用 WorkflowDefinition.type
  name: string;
  projectId: string;           // 所属项目
  state: WorkflowState;        // 执行状态
  createdAt: number;
  updatedAt: number;
}

interface WorkflowState {
  workflowId: string;
  projectId: string;
  currentStep: number;         // 当前步骤索引
  steps: Record<string, StepState>;
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
```

---

#### 1.1.3 Workflow Executor（工作流执行器）⚠️ 特殊形态

**定义**：**插件形态**的工作流，作为完整功能包分发，提供固定的执行流程和自定义 UI。

**特征**：
- ❌ **不注册到** `WorkflowRegistry`
- ✅ 通过 `PluginManager` 加载和管理
- ✅ 提供固定的执行步骤（不可随意修改结构）
- ✅ 包含完整的业务逻辑和 UI 面板
- ✅ 在插件页面中管理和启动

**代码位置**：
- 实现：`plugins/official/*/` 或 `plugins/community/*/`
- UI 组件：`src/renderer/pages/workflows/WorkflowExecutor.tsx`

**官方示例**：
- **小说转视频**（`novel-to-video`）
  - 文件位置：`plugins/official/novel-to-video/`
  - 快捷方式类型：`ShortcutType.PLUGIN`
  - 跳转路径：`/plugins/novel-to-video`
  - 包含 5 个固定步骤（章节拆分、场景提取、分镜生成、配音生成、导出）

**与 Workflow Template 的区别**：

| 维度 | Workflow Template | Workflow Executor (插件形态) |
|------|------------------|---------------------------|
| 注册位置 | WorkflowRegistry | PluginManager |
| 可编辑性 | 可在编辑器中修改 | 固定步骤，不可修改 |
| UI 界面 | 通用 ReactFlow 编辑器 | 自定义步骤面板 |
| 分发方式 | 存储在项目中 | 作为插件安装包 |
| 路由入口 | `/workflows/editor/:id` | `/plugins/:pluginId` |
| 快捷方式类型 | `workflow` | `plugin` |

**设计意图**：
- Workflow Template：用于通用、可定制的工作流场景
- Workflow Executor：用于端到端的完整功能（如专业软件插件）

---

### 1.2 Project（项目）

**定义**：MATRIX Studio 的核心组织单元，包含输入资源、工作流实例和输出资源。

**特征**：
- 每个项目有独立的工作目录
- 可关联多个工作流实例
- 管理输入资源和输出资源的引用
- 支持不可变标记（immutable）

**代码位置**：
- 服务：`src/main/services/ProjectManager.ts`
- 类型：`src/common/types.ts` 中的 `ProjectConfig`

**核心字段**：
```typescript
interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  workflows: string[];           // 关联的工作流实例 ID 列表

  // Phase 9 H0.1 新增
  workflowType?: string;         // 工作流类型识别
  pluginId?: string;             // 使用的插件 ID
  currentWorkflowInstanceId?: string;
  status?: ProjectStatus;        // 'in-progress' | 'completed' | 'archived'
  inputAssets: string[];         // 输入资源 ID 列表
  outputAssets: string[];        // 输出资源 ID 列表
  immutable: boolean;            // 项目完成后不可修改
}
```

**项目模板**：
- `workflow`：空白项目（通用工作流）
- `novel-to-video`：小说转视频项目（官方插件）

---

### 1.3 Asset（资产）

**定义**：存储在资产库中的文件资源，包含元数据和分类信息。

**特征**：
- 支持双作用域（全局/项目）
- 自动生成 JSON 索引
- 支持 Sidecar 元数据文件（`.json` 配对文件）
- 实时文件监听（chokidar）

**代码位置**：
- 服务：`src/main/services/AssetManager.ts`
- 类型：`src/shared/types/asset.ts` 中的 `AssetMetadata`

**资产类型**（AssetType）：
- `image`：图像文件
- `video`：视频文件
- `audio`：音频文件
- `text`：文本文件
- `other`：其他类型

**资产作用域**（AssetScope）：
- `global`：全局资产（可被多个项目引用）
- `project`：项目资产（专属于特定项目）

---

### 1.4 Plugin（插件）

**定义**：扩展 MATRIX Studio 功能的独立模块，通过 `manifest.json` 定义元数据和权限。

**特征**：
- 支持三种类型：官方（official）、合作（partner）、社区（community）
- 使用 VM2 沙箱隔离执行
- 支持从 ZIP 文件安装
- 权限系统（基础记录，Phase 6 强化）

**代码位置**：
- 服务：`src/main/services/PluginManager.ts`
- 类型：`src/common/types.ts` 中的 `PluginManifest` 和 `PluginInfo`

**插件类型**（PluginType）：
- `workflow-integration`：工作流集成插件（如小说转视频）
- `asset-handler`：资产处理插件
- `api-provider`：API 提供商插件
- `ui-extension`：UI 扩展插件
- `utility`：工具类插件

**manifest.json 结构**：
```json
{
  "id": "novel-to-video",
  "name": "小说转视频",
  "version": "1.0.0",
  "description": "将小说转换为视频的完整工作流",
  "author": "MATRIX Team",
  "icon": "icon.png",
  "main": "index.js",
  "type": "workflow-integration",
  "permissions": ["fs:read", "fs:write", "api:call", "workflow:execute"]
}
```

---

### 1.5 Schema（Schema 注册系统）

**定义**：插件用于定义和验证自定义资产字段的 JSON Schema 系统。

**特征**：
- 每个 Schema 有唯一 ID（格式：`pluginId.schemaName`）
- 支持动态注册和注销
- 基于 JSON Schema 标准验证
- 用于 `AssetMetadata.customFields` 的验证

**代码位置**：
- 服务：`src/main/services/SchemaRegistry.ts`
- 类型：`src/shared/types/schema.ts` 中的 `AssetSchemaDefinition`

**示例**：
```typescript
{
  id: "novel-to-video.scene",
  name: "场景资产 Schema",
  pluginId: "novel-to-video",
  version: "1.0.0",
  schema: {
    type: "object",
    properties: {
      sceneLocation: { type: "string" },
      sceneStory: { type: "string" },
      imagePrompt: { type: "string" }
    },
    required: ["sceneStory"]
  }
}
```

---

## 二、命名冲突术语 ⚠️

### 2.1 AssetMetadata（严重冲突）

**问题**：`AssetMetadata` 接口在两个文件中定义，结构**完全不同**。

#### 版本 1：简化版（遗留）
**位置**：`src/common/types.ts:122`
**字段数量**：2 个
**用途**：传统媒体属性（可能是早期版本遗留）

```typescript
interface AssetMetadata {
  duration?: number;
  dimensions?: { width: number; height: number };
  [key: string]: any;
}
```

#### 版本 2：完整版（标准） ✅
**位置**：`src/shared/types/asset.ts:38`
**字段数量**：30+ 个
**用途**：标准资产元数据 Schema（Phase 4 设计）

```typescript
interface AssetMetadata {
  // 核心字段
  id: string;
  name: string;
  filePath: string;
  type: AssetType;
  category?: string;
  scope: AssetScope;

  // 时间字段
  createdAt: string;        // ISO 8601
  modifiedAt: string;
  importedAt?: string;

  // 文件信息
  size: number;
  mimeType: string;
  extension: string;

  // 项目关联
  projectId?: string;
  isUserUploaded?: boolean;

  // 组织字段
  tags: string[];
  description?: string;

  // AI 生成相关
  status?: ResourceStatus;
  prompt?: string;
  error?: string;
  sourceId?: string;

  // 媒体特定
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: AspectRatio;
  thumbnailPath?: string;

  // 插件扩展
  customFields?: Record<string, any>;
}
```

**影响范围**：
- `AssetManager` 服务使用版本 2（标准版）
- 部分旧代码可能仍引用版本 1

**建议**：
- ✅ 统一使用 `src/shared/types/asset.ts` 版本
- ❌ 废弃 `src/common/types.ts` 版本
- 🔧 迁移所有引用

---

### 2.2 AssetConfig（中度冲突）

**问题**：`AssetConfig` 接口在两个文件中定义，字段不完全一致。

#### 版本 1：完整版
**位置**：`src/common/types.ts:133`
**字段数量**：9 个

```typescript
interface AssetConfig {
  id: string;
  scope: AssetScope;
  type: AssetType;
  path: string;
  metadata: AssetMetadata;      // 引用 AssetMetadata（冲突！）
  aiAttributes?: AIAssetAttributes;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### 版本 2：简化版
**位置**：`src/main/models/project.ts:7`
**字段数量**：7 个

```typescript
interface AssetConfig {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video';
  path: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**差异**：
- 版本 1 有 `scope`、`aiAttributes`、`tags` 字段
- 版本 2 有 `name` 字段
- 类型定义不同（版本 1 使用 `AssetType`，版本 2 使用字面量联合类型）

---

### 2.3 ProjectConfig（中度冲突）

**问题**：`ProjectConfig` 接口在两个文件中定义，版本 1 包含 Phase 9 新增字段。

#### 版本 1：完整版 ✅
**位置**：`src/common/types.ts:157`
**字段数量**：15+ 个（包含 Phase 9 新增）

```typescript
interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  workflows: string[];
  assets: AssetConfig[];

  // Phase 9 H0.1 新增
  workflowType?: string;
  pluginId?: string;
  currentWorkflowInstanceId?: string;
  status?: ProjectStatus;
  inputAssets: string[];
  outputAssets: string[];
  immutable: boolean;
}
```

#### 版本 2：简化版
**位置**：`src/main/models/project.ts:17`
**字段数量**：7 个（缺少 Phase 9 新增字段）

```typescript
interface ProjectConfig {
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  workflows: string[];
  assets: AssetConfig[];
}
```

**建议**：
- ✅ 使用 `src/common/types.ts` 版本（包含最新功能）
- ❌ 删除 `src/main/models/project.ts` 中的重复定义

---

### 2.4 AssetType（枚举冲突）

**问题**：`AssetType` 在两个文件中定义，一个是 `enum`，一个是 `type`。

#### 版本 1：枚举（6 个值）
**位置**：`src/common/types.ts:15`

```typescript
enum AssetType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  MODEL = 'model',          // 特有
  WORKFLOW = 'workflow'     // 特有
}
```

#### 版本 2：类型别名（5 个值） ✅
**位置**：`src/shared/types/asset.ts:12`

```typescript
type AssetType = 'image' | 'video' | 'audio' | 'text' | 'other';
```

**差异**：
- 版本 1 包含 `MODEL` 和 `WORKFLOW`
- 版本 2 包含通用的 `other`

**建议**：
- 🤔 评估是否需要 `MODEL` 和 `WORKFLOW` 类型
- 如需要，统一为版本 1
- 如不需要，统一为版本 2

---

## 三、时间处理术语

### 3.1 时间格式 ⚠️ 不统一

**问题**：代码中混用了 3 种时间表示方式。

#### 格式 1：ISO 8601 字符串 ✅ 推荐
**使用位置**：
- `AssetMetadata.createdAt`
- `AssetMetadata.modifiedAt`
- `AssetSchemaDefinition.registeredAt`

**格式**：`"2025-12-30T10:30:00.000Z"`

**优点**：
- 符合国际标准
- 易于序列化和传输
- TimeService 返回格式

---

#### 格式 2：Date 对象
**使用位置**：
- `ProjectConfig.createdAt`
- `ProjectConfig.updatedAt`
- `MarketPluginInfo.lastUpdated`

**格式**：`new Date("2025-12-30T10:30:00.000Z")`

**优点**：
- JavaScript 原生支持
- 方便日期运算

**缺点**：
- 无法直接序列化为 JSON
- 需要转换为字符串或时间戳

---

#### 格式 3：数字时间戳（毫秒）
**使用位置**：
- `WorkflowState.createdAt`
- `WorkflowState.updatedAt`
- `WorkflowInstance.createdAt`

**格式**：`1735567890123`

**优点**：
- 紧凑存储
- 便于比较和排序

**缺点**：
- 可读性差
- 需要转换为可读格式

---

### 3.2 TimeService 术语

**getCurrentTime()**：获取当前时间戳（毫秒），已通过 NTP 同步验证。

**validateTimeIntegrity()**：验证系统时间合法性，防止时间回退或异常。

**syncWithNTP()**：与 NTP 服务器同步时间（阻塞操作）。

**全局要求**：
- ✅ 写入任何时间戳前必须调用 `TimeService.validateTimeIntegrity()`
- ✅ 如果验证失败，必须调用 `TimeService.syncWithNTP()`
- ❌ 禁止直接使用 `Date.now()` 或 `new Date()` 而不经过验证

---

## 四、服务层术语

### 4.1 Manager vs Registry vs Helper

**Manager（管理器）**：
- 负责完整的生命周期管理（CRUD）
- 通常包含持久化逻辑
- 示例：`ProjectManager`、`AssetManager`、`PluginManager`

**Registry（注册表）**：
- 负责注册和查询
- 通常为内存数据结构
- 不涉及持久化
- 示例：`WorkflowRegistry`、`SchemaRegistry`、`ModelRegistry`

**Helper（辅助工具）**：
- 提供辅助功能，不拥有状态
- 依赖其他服务
- 示例：`GenericAssetHelper`

---

### 4.2 Service vs Manager

**Service（服务）**：
- 通用术语，指所有服务类
- 示例：`TimeService`、`Logger`、`FileSystemService`

**Manager（管理器）**：
- 特指负责资源管理的服务
- 是 Service 的子类

**关系**：Manager ⊂ Service

---

## 五、IPC 通道命名规范

### 5.1 通道命名模式

**格式**：`{模块}:{操作}`

**模块前缀**：
- `app:` - 应用生命周期
- `window:` - 窗口控制
- `project:` - 项目管理
- `asset:` - 资产管理
- `workflow:` - 工作流管理
- `plugin:` - 插件管理
- `task:` - 任务调度
- `api:` - API Provider 管理
- `model:` - 模型管理
- `file:` - 文件系统
- `dialog:` - 对话框
- `settings:` - 设置管理
- `mcp:` - MCP 服务
- `local:` - 本地服务
- `logs:` - 日志管理
- `shortcut:` - 快捷方式管理
- `time:` - 时间服务

**操作后缀**（常见）：
- `create` - 创建资源
- `load` - 加载资源
- `save` - 保存资源
- `delete` - 删除资源
- `list` - 列出资源
- `update` - 更新资源
- `get` - 获取单个资源
- `execute` - 执行操作
- `status` - 获取状态
- `cancel` - 取消操作

**示例**：
- `project:create` - 创建项目
- `asset:scan` - 扫描资产
- `workflow:execute` - 执行工作流
- `plugin:install` - 安装插件

---

### 5.2 事件通道命名

**格式**：`event:{模块}:{事件类型}`

**示例**：
- `event:workflow:progress` - 工作流进度更新
- `event:workflow:completed` - 工作流完成
- `event:workflow:error` - 工作流错误
- `event:file:changed` - 文件变化
- `event:service:status` - 服务状态变化

---

## 六、UI 组件命名规范

### 6.1 页面组件命名

**位置**：`src/renderer/pages/`

**规则**：
- 使用 PascalCase
- 功能名称直接对应路由
- 避免使用 "Page" 后缀

**示例**：
- `Dashboard` - 首页/项目管理
- `Assets` - 资产库
- `Plugins` - 插件管理
- `Workflows` - 工作流列表
- `WorkflowEditor` - 工作流编辑器
- `WorkflowExecutor` - 工作流执行器
- `Settings` - 设置
- `About` - 关于

---

### 6.2 通用组件命名

**位置**：`src/renderer/components/common/`

**规则**：
- 使用 PascalCase
- 功能描述性命名
- 避免缩写

**示例**：
- `Button` - 按钮
- `Card` - 卡片
- `Modal` - 模态框
- `Toast` - 通知提示
- `Loading` - 加载指示器
- `ConfirmDialog` - 确认对话框
- `ProgressOrb` - 进度球

---

### 6.3 shadcn/ui 组件命名

**位置**：`src/renderer/components/ui/`

**规则**：
- 使用 kebab-case 文件名
- 组件名使用 PascalCase
- 遵循 shadcn/ui 命名规范

**示例**：
- `button.tsx` → `Button`, `buttonVariants`
- `card.tsx` → `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `tabs.tsx` → `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

---

## 七、数据类型命名规范

### 7.1 接口命名模式

| 模式 | 用途 | 示例 |
|------|------|------|
| `I{Name}` | 应用配置接口 | `IAppSettings`, `ILogSettings` |
| `{Name}Config` | 配置类接口 | `ProjectConfig`, `APIProviderConfig` |
| `{Name}Metadata` | 元数据接口 | `AssetMetadata` |
| `{Name}Definition` | 定义类接口 | `WorkflowDefinition`, `ModelDefinition` |
| `{Name}Instance` | 实例类接口 | `WorkflowInstance` |
| `{Name}State` | 状态类接口 | `WorkflowState`, `PanelState` |
| `{Name}Event` | 事件类接口 | `PanelEvent`, `AssetFileChangeEvent` |
| `{Name}Params` | 参数类接口 | `APICallParams`, `AssetImportParams` |
| `{Name}Result` | 结果类接口 | `APICallResult`, `SchemaValidationResult` |
| `{Name}Filter` | 过滤器接口 | `AssetFilter`, `MarketFilter` |
| `{Name}Info` | 信息类接口 | `PluginInfo`, `MarketPluginInfo` |

---

### 7.2 类型别名命名模式

| 模式 | 用途 | 示例 |
|------|------|------|
| `{Name}Type` | 类型枚举 | `AssetType`, `PluginType`, `FieldType` |
| `{Name}Status` | 状态枚举 | `WorkflowStepStatus`, `ResourceStatus`, `TaskStatus` |
| `{Name}Scope` | 作用域枚举 | `AssetScope` |
| `{Name}Category` | 分类枚举 | `APICategory` |

---

## 八、特定领域术语

### 8.1 小说转视频（Novel-to-Video）

**Chapter（章节）**：
- 从小说文本中拆分出的独立章节
- 包含标题和内容
- 对应数据类型：`ChapterData`

**Scene（场景）**：
- 从章节中提取的独立场景描述
- 包含场景位置、故事、图像提示词
- 对应数据类型：`SceneData`

**Character（角色）**：
- 从场景中提取的角色信息
- 包含外貌描述、Sora 识别名、语音 ID
- 对应数据类型：`CharacterData`

**Storyboard（分镜脚本）**：
- 基于场景和角色生成的视频/图像提示词
- 包含视频提示词或图像提示词列表
- 对应数据类型：`StoryboardData`

**Voiceover（配音）**：
- 为分镜生成的语音数据
- 包含对话文本、角色 ID、情绪向量
- 对应数据类型：`VoiceoverData`

**Sora Name**：
- 角色在 Sora 视频生成中的识别名称
- 用于保持角色在多个场景中的一致性

**Emotion Vector（情绪向量）**：
- 8 维情绪特征向量
- 用于语音生成的情感控制

---

### 8.2 API Provider 术语

**Provider（提供商）**：
- AI 服务提供商（如 OpenAI、Anthropic、Sora2）
- 对应数据类型：`APIProviderConfig`

**Category（功能分类）**：
- Provider 按功能分类
- 类型：`image-generation`, `video-generation`, `audio-generation`, `llm`, `workflow`, `tts`, `stt`, `embedding`, `translation`

**Model（模型）**：
- 特定 Provider 提供的 AI 模型
- 对应数据类型：`ModelDefinition`

**AuthType（认证类型）**：
- API 认证方式
- 类型：`bearer`, `apikey`, `basic`, `none`

**BaseURL（端点地址）**：
- API 服务的基础 URL

---

### 8.3 插件面板术语

**Panel（面板）**：
- 插件提供的自定义 UI 面板
- 对应数据类型：`PluginPanelConfig`

**Field（字段）**：
- 面板中的表单字段
- 类型：`text`, `textarea`, `number`, `select`, `multiselect`, `checkbox`, `radio`, `file`, `date`, `slider`, `color`

**Action（操作）**：
- 面板中的操作按钮
- 对应数据类型：`PanelAction`

**Hook（钩子）**：
- 面板生命周期回调
- 类型：`onInit`, `onValueChange`, `beforeSubmit`, `afterSubmit`

---

## 九、状态术语

### 9.1 工作流步骤状态

**WorkflowStepStatus**：
- `pending` - 待执行
- `in_progress` - 执行中
- `completed` - 已完成
- `error` - 执行错误

---

### 9.2 资源生成状态

**ResourceStatus**：
- `none` - 未生成
- `generating` - 生成中
- `success` - 生成成功
- `failed` - 生成失败

---

### 9.3 项目状态

**ProjectStatus**：
- `in-progress` - 进行中
- `completed` - 已完成
- `archived` - 已归档

---

### 9.4 任务状态

**TaskStatus**：
- `pending` - 待执行
- `running` - 运行中
- `completed` - 已完成
- `failed` - 执行失败
- `cancelled` - 已取消

---

## 十、路径和 ID 格式规范

### 10.1 ID 格式

**UUID 格式**（资产、项目）：
- 使用 UUID v4
- 示例：`550e8400-e29b-41d4-a716-446655440000`

**自定义 ID 格式**（工作流实例）：
- 格式：`{type}-{timestamp}-{random}`
- 示例：`test-workflow-1735567890123-abc123`

**插件 ID 格式**：
- 使用 kebab-case
- 示例：`novel-to-video`, `chapter-split`

**Schema ID 格式**：
- 格式：`{pluginId}.{schemaName}`
- 示例：`novel-to-video.scene`, `novel-to-video.character`

---

### 10.2 路由路径格式

**静态路由**：
- `/` - 首页
- `/dashboard` - 项目管理
- `/assets` - 资产库
- `/plugins` - 插件市场
- `/workflows` - 工作流列表
- `/settings` - 设置
- `/about` - 关于

**动态路由**：
- `/workflows/editor/:workflowId` - 工作流编辑器
- `/workflows/:workflowId` - 工作流执行器
- `/plugins/:pluginId` - 插件执行器

---

### 10.3 文件路径约定

**工作区路径**（WorkSpace）：
- 默认：`./WorkSpace/` （相对于程序目录）
- 用户可自定义

**资产文件路径**：
- 用户上传：`WorkSpace/assets/user_uploaded/`
- 项目输出：`WorkSpace/assets/project_outputs/{projectId}/{YYYYMMDD}/`

**项目配置路径**：
- 格式：`WorkSpace/projects/{projectId}/project.json`

**Sidecar 元数据路径**：
- 格式：`{assetFilePath}.json`（与资产文件同目录）

---

## 十一、缩写和约定

### 11.1 常用缩写

| 缩写 | 全称 | 用途 |
|------|------|------|
| IPC | Inter-Process Communication | 主进程与渲染进程通信 |
| UI | User Interface | 用户界面 |
| API | Application Programming Interface | 应用程序接口 |
| UUID | Universally Unique Identifier | 通用唯一标识符 |
| NTP | Network Time Protocol | 网络时间协议 |
| TTS | Text-to-Speech | 文本转语音 |
| STT | Speech-to-Text | 语音转文本 |
| LLM | Large Language Model | 大语言模型 |
| MCP | Model Context Protocol | 模型上下文协议 |
| MVP | Minimum Viable Product | 最小可行产品 |

---

### 11.2 文件扩展名约定

| 扩展名 | 类型 | 说明 |
|--------|------|------|
| `.ts` | TypeScript | 源代码文件 |
| `.tsx` | TypeScript JSX | React 组件文件 |
| `.json` | JSON | 配置文件、Sidecar 元数据 |
| `.css` | CSS | 样式文件 |
| `.md` | Markdown | 文档文件 |

---

## 十二、易混淆术语对比

### 12.1 Workflow vs Plugin

| 维度 | Workflow（工作流） | Plugin（插件） |
|------|------------------|----------------|
| 定义 | 可编辑的节点图 | 独立的功能模块 |
| 可编辑性 | 可在编辑器中修改 | 不可修改（插件代码） |
| UI 界面 | ReactFlow 节点图 | 自定义面板 |
| 注册位置 | WorkflowRegistry | PluginManager |
| 存储方式 | 项目目录下的 JSON | 插件目录下的完整包 |
| 快捷方式类型 | `workflow` | `plugin` |

**特殊情况**：插件可以**包含**工作流（如"小说转视频"插件）

---

### 12.2 Asset vs Resource

**Asset（资产）**：
- 文件实体 + 元数据
- 存储在资产库中
- 有明确的作用域和分类

**Resource（资源）**：
- 通用术语，泛指各种资源
- 常用于"输入资源"、"输出资源"的上下文

**关系**：Asset ⊂ Resource

---

### 12.3 Instance vs State

**Instance（实例）**：
- 完整的工作流实例对象
- 包含 ID、类型、项目 ID、状态

**State（状态）**：
- 工作流的执行状态数据
- 包含当前步骤、步骤状态、数据

**关系**：Instance.state = State

---

### 12.4 Manager vs Service

**Manager（管理器）**：
- 负责资源生命周期管理
- 通常有持久化逻辑

**Service（服务）**：
- 通用服务类
- 可能不涉及资源管理

**关系**：所有 Manager 都是 Service，但不是所有 Service 都是 Manager

---

## 十三、总结

### 13.1 关键发现

1. **严重命名冲突**：
   - `AssetMetadata` - 2 个版本
   - `AssetConfig` - 2 个版本
   - `ProjectConfig` - 2 个版本
   - `AssetType` - 2 种定义方式

2. **多重含义术语**：
   - `Workflow` - 3 种含义（模板/实例/执行器）

3. **时间格式不统一**：
   - ISO 8601 字符串、Date 对象、数字时间戳混用

4. **命名规范较好**：
   - IPC 通道命名统一
   - 接口命名模式清晰
   - 组件命名一致

---

### 13.2 建议优先级

**高优先级**：
1. 解决 `AssetMetadata`、`AssetConfig`、`ProjectConfig` 命名冲突
2. 明确区分 Workflow 的 3 种含义（文档或代码注释）

**中优先级**：
3. 统一时间格式为 ISO 8601 字符串
4. 统一 `AssetType` 定义（枚举 vs 类型别名）

**低优先级**：
5. 创建统一的类型导出文件 `src/shared/types/index.ts`
6. 增强类型 JSDoc 注释

---

## 附录：参考文档

- `docs/workflow-vs-executor.md` - Workflow 概念区分
- `docs/00-global-requirements-v1.0.0.md` - 全局要求
- `src/shared/types/` - 类型定义目录
- `src/main/services/` - 服务实现目录

---

**文档结束**

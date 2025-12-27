# MATRIX Studio 开发执行总纲 v1.1

## 📂 项目状态概览
*   **当前版本**: v0.2.9.6 (Phase 8 UI设计系统迁移 - Sprint 1 进行中)
*   **当前阶段**: Phase 8 Sprint 1 (44% 完成)
*   **最后更新**: 2025-12-28
*   **架构依据**: `/docs/00-06` 文档集
*   **参考UI**: `docs/references/UI/matrix`, `docs/08-ui-design-specification-v1.0.0.md`
*   **功能完成度**: 约95% (插件标准化完成，UI设计系统迁移进行中)

---

## 🚀 使用指南
1.  **标记进度**: 每完成一项，将 `[ ]` 改为 `[x]`。
2.  **日志记录**: 这里的 Task 完成后，去 `CHANGELOG.md` 记录详细变更。
3.  **引用路径**: 本文档中提到的路径均基于项目根目录。

---

## ✅ Phase 0: 环境准备 (已完成)
**状态**: ✅ Completed
**回顾**: 基础架构已搭建，目录结构符合 Doc-05 标准。

- [x] **[A01] 仓库与文档初始化**
    - 这里的文档已归档至 `/docs`。
    - `CHANGELOG.md` 已建立。
    - 此时版本: v0.0.1
- [x] **[A02] 工程脚手架 (Vite+Electron+React)**
    - 依赖已安装 (`node_modules` 存在)。
    - `src/main` 与 `src/renderer` 结构已建立。
    - 运行测试: `npm run dev` 可启动窗口。

---

## ✅ Phase 1: UI 原型拆解与样式提取 (已完成)
**目标**: 将 `docs/references/UI/matrix` 的视觉风格移植到 React 代码中。

### [x] [B01] 视觉系统提取 (Theme Extraction)
*   **输入**: `docs/references/UI/matrix/src/renderer/styles/`, `src/renderer/styles/`
*   **步骤**:
    1.  创建 `src/renderer/styles/base.css`: 提取 Reset CSS、全局字体和图标样式。 ✅
    2.  创建 `src/renderer/styles/theme.css`: 提取 `:root` 颜色变量。 ✅
    3.  创建 `src/renderer/styles/layout.css`: 提取 `.window-bar`, `.global-menu` 等布局类。 ✅
    4.  创建 `src/renderer/styles/components.css`: 提取按钮、卡片等组件样式。 ✅
    5.  创建 `src/renderer/styles/views.css`: 提取视图样式。 ✅
    6.  创建 `src/renderer/styles/editor.css`: 提取编辑器样式。 ✅
    7.  创建 `src/renderer/styles/settings.css`: 提取设置页样式。 ✅
    8.  在 `src/renderer/index.tsx` 中引入这些 CSS。 ✅
*   **检验**: 启动应用，窗口背景色应变为深色 (#0f0f0f)，字体应与原型一致。

### [x] [B02] 基础组件原子化 (Atomization)
*   **输入**: `docs/references/UI/matrix/src/renderer/` (DOM 结构)
*   **步骤**:
    1.  **Button**: 封装 `<Button variant="primary|ghost">` (参考 `.action-btn`). ✅
    2.  **Card**: 封装 `<Card>` (参考 `.project-card`). ✅
    3.  **Icon**: 创建 Icon 组件，支持多种图标类型。 ✅
*   **检验**: 在 `App.tsx` 临时写几个按钮和卡片，样式需还原原型。
*   **日志**: 完成后更新版本号 -> **v0.0.3**

---

## ✅ Phase 2: 核心服务与 IPC 桥接 (Core Foundation)
**目标**: 打通主进程逻辑，确保"时间合规"与"文件读写"能力。

### [x] [C01] 时间服务与合规层 (Time Compliance) **[重要]**
*   **参考**: `docs/00-global-requirements-v1.0.0.md`
*   **任务**:
    1.  创建 `src/main/services/TimeService.ts`。
    2.  实现 NTP 网络时间获取或系统时间校验逻辑。
    3.  **单元测试**: 模拟系统时间篡改，验证服务是否报错。

### [x] [C02] 核心管理器 (Managers)
*   **参考**: `docs/06-core-services-design-v1.0.1.md`
*   **任务**:
    1.  创建 `ProjectManager.ts`: 实现 `createProject`, `loadProject`。
    2.  创建 `AssetManager.ts`: 定义资源扫描接口。
    3.  定义 TypeScript 接口 (`src/common/types.ts`)。

### [x] [C03] IPC 通信桥接
*   **参考**: `docs/02-technical-blueprint-v1.0.0.md`
*   **任务**:
    1.  `src/main/ipc/channels.ts`: 定义通信频道名称。
    2.  `src/preload/index.ts`: 使用 `contextBridge` 暴露 API。
    3.  联调测试: 渲染层调用 `window.api.getVersion()` 返回主进程版本号。
*   **日志**: 完成后更新版本号 -> **v0.1.0**

---

## ✅ Phase 3: 界面重构 (UI Implementation)
**目标**: 抛弃 HTML 原型，用 React 组件构建真实界面。
**状态**: ✅ 基本完成 (通用组件完整，核心页面框架完成)

### [x] [D01] 应用骨架
*   **任务**:
    1.  实现 `GlobalNav` (左侧边栏)。 ✅
    2.  实现 `WindowBar` (自定义标题栏，含最小化/关闭)。 ✅
    3.  配置 `react-router-dom`路由表。 ✅

### [x] [D02] 首页 (Dashboard)
*   **任务**:
    1.  读取最近项目列表。 ✅
    2.  实现"新建项目"模态框。 ✅
    3.  项目删除功能（带确认对话框）。 ✅
    4.  加载状态和错误处理。 ✅

### [x] [D03] 设置页
*   **任务**:
    1.  实现 API Key 输入框。 ✅
    2.  API配置保存和连接测试。 ✅
    3.  Toast通知集成。 ✅

### [x] [D04] 通用UI组件库
*   **任务**:
    1.  Toast通知组件。 ✅
    2.  Loading加载指示器。 ✅
    3.  Modal通用模态框。 ✅
    4.  ConfirmDialog确认对话框。 ✅

---

## ⏳ Phase 4: MVP 核心功能
**目标**: 构建 Matrix 的通用“文件管理”与“逻辑编排”能力，最小可行性产品；能跑通"新建项目 -> 导入资源 -> 查看"流程。
**状态**: 🔴 20% (资产库和工作流编辑器待实现)

### [*] [E01] 资产库视图 (Assets页面)
*   **任务**:
    1.  展示 Grid 布局的图片/资产卡片。
    2.  实现资产导入功能。
    3.  实现资产预览功能。
    4.  连接到AssetManager服务。
- 文件路径: src/renderer/pages/Assets/, src/main/services/AssetManager.ts
- 核心目的: 实现“文件即资产”的统一视图。 无论是用户导入的图，还是 AI 生成的图，都必须在这里被索引和管理。
- 执行动作:
    1. 后端 (Backend): 完善 AssetManager.scan(path)。
        - 要求: 必须递归扫描，识别 .png, .jpg, .txt, .json (Sidecar)。
        - 要求: 必须集成 chokidar 实现文件系统监听，文件变动实时推送到前端。
    2. 前端 (UI): 实现 AssetsPage 的 Grid 布局。
        - 要求: 复用 Card 组件展示素材。
        - 要求: 实现“懒加载 (Virtual Scroll)”，防止几千张图卡死界面。
        - 要求: 实现“导入按钮”，调用 dialog.showOpenDialog 并复制文件到项目目录。
    3. 预览 (Preview): 实现点击卡片弹出大图预览 Modal。
- 修改标准: 界面不应包含任何“小说”特定的逻辑，它只是一个通用的素材管理器。
- 预期结果: 往项目文件夹里随便丢一张图，Assets 页面在 1 秒内自动刷新显示该图。

### [*] [E02] 工作流编辑器 (Workflows页面)
*   **任务**:
    1.  实现三栏可拖拽布局 (Resizer)。
    2.  实现节点拖拽和连接。
    3.  集成工作流执行引擎。
    4.  工作流保存和加载。
- 文件路径: src/renderer/pages/Workflows/, src/renderer/features/flow/
- 核心目的: 实现可视化逻辑编排 UI。 虽然小说插件初期可能硬编码，但编辑器必须准备好，用于后续展示或修改逻辑。
- 执行动作:
    1. 集成引擎: 安装并配置 ReactFlow (或类似库)。
    2. 节点开发: 封装基础节点组件 BaseNode (Input, Output, Handle)。
    3. 布局实现: 实现左侧“工具箱 (Toolbox)”，中间“画布 (Canvas)”，右侧“属性面板 (Properties)”。
    4. 数据流: 实现 nodes 和 edges 状态管理 (Zustand/Redux)，支持保存为 JSON。
- 修改标准: 能拖拽节点、连线、删除、保存布局数据。暂不需要实现真实的后端执行引擎（由 Phase 6 完成）。
- 预期结果: 打开页面，拖入一个“Start”节点和一个“End”节点，连上线，刷新页面后连线依然存在。

### [*] [E03] 插件管理系统完善 (Plugins页面)
*   **任务**:
    1.  实现插件安装流程。
    2.  插件市场集成。
    3.  官方/社区插件分级显示。
- 文件路径: src/main/services/PluginManager.ts, src/renderer/pages/Plugins/
- 核心目的: 确立插件加载标准。 “小说转视频”本身就是一个插件，必须通过标准方式加载，而不是写死在代码里。
- 执行动作:
    1. 定义协议: 制定 manifest.json 规范 (id, version, entryPoint)。
    2. 加载器: 实现 PluginManager.loadPlugins()，扫描 plugins/ 目录。
    3. UI展示: 在 Plugins 页面列出已安装插件（包括内置的 Novel 插件）。
- 预期结果: 系统启动时，Console 输出 "Loaded plugin: novel-to-video"。

---

## Phase 5: 小说转视频功能实施 (Novel-to-Video Feature)
**目标**: 基于Matrix原生架构实施小说转视频功能，建立通用工作流引擎标准
**状态**: ⏳ 待Phase 4完成后启动
**详细方案**: 参考 `plans/notyet-novel-ti-video-plan.md`

### [*] 阶段5.1: 工作流引擎基础 
*   **核心目标**: 建立通用的工作流执行引擎，支持步骤化流程控制
*   **关键交付**: WorkflowRegistry、WorkflowStateManager、WorkflowExecutor组件
*   **任务清单**: (详见计划文档第151-594行)
    - [*] **[F1.1]** 创建工作流注册表 (WorkflowRegistry)
    - [*] **[F1.2]** 实现工作流状态管理器 (WorkflowStateManager)
    - [*] **[F1.3]** 创建工作流执行器组件 (WorkflowExecutor)
    - [*] **[F1.4]** 扩展Workflows列表页
    - [*] **[F1.5]** 添加工作流路由 (`/workflows/:workflowId`)
    - [*] **[F1.6]** 创建测试工作流验证流程
*   **验收标准**: 测试工作流可完整执行，支持中断恢复

### [*] 阶段5.2: 数据模型和AssetManager集成 
*   **核心目标**: 利用AssetManager的customFields机制存储NovelVideo专用数据
*   **关键交付**: NovelVideoFields类型、NovelVideoAssetHelper工具类
*   **任务清单**: (详见计划文档第596-958行)
    - [*] **[F2.1]** 定义NovelVideo类型系统 (`src/shared/types/novel-video.ts`)
    - [*] **[F2.2]** 实现NovelVideoAssetHelper (章节/场景/角色资产快捷方法)
    - [*] **[F2.3]** 测试customFields查询性能 (100个资产<100ms)
*   **验收标准**: 可创建章节/场景资产，查询性能达标

### [*] 阶段5.3: AI服务集成 
*   **核心目标**: 集成LangChain Agent和T8Star/RunningHub API提供商
*   **关键交付**: LangChainAgent、APIManager扩展、NovelVideoAPIService
*   **任务清单**: (详见计划文档第960-1284行)
    - [*] **[F3.1]** 从ai-playlet复制LangChain Agent
    - [*] **[F3.2]** 注册T8Star API提供商 (图片/视频生成)
    - [*] **[F3.3]** 注册RunningHub API提供商 (TTS配音)
    - [*] **[F3.4]** 实现NovelVideoAPIService (封装API调用+AssetManager集成)
*   **验收标准**: 场景图、角色图、视频生成API可正常调用

### [x] 阶段5.4: 业务服务实现 ✅
*   **核心目标**: 实现章节拆分、场景提取、资源生成、分镜、配音服务
*   **关键交付**: ChapterService、ResourceService、StoryboardService、VoiceoverService
*   **任务清单**: (详见计划文档第1286-1699行)
    - [x] **[F4.1]** 实现章节拆分服务 (ChapterService) - 270行，包含splitChapters、extractScenesAndCharacters
    - [x] **[F4.2]** 实现场景角色提取服务 (LLM提取) - 集成AgentSceneCharacterExtractor
    - [x] **[F4.3]** 实现资源生成服务 (场景图/角色图，集成TaskScheduler) - ResourceService 260行
    - [x] **[F4.4]** 实现分镜脚本生成服务 (4步AI链式调用) - StoryboardService 240行
    - [x] **[F4.5]** 实现配音生成服务 (台词提取+音频生成) - VoiceoverService 302行（完全重写）
*   **验收标准**: ✅ 所有业务服务已实现，数据存储在AssetManager，编译成功（0错误）
*   **完成时间**: 2025-12-27
*   **关键修复**: 修复16+个TypeScript编译错误，重写AgentVoiceoverGenerator符合Matrix架构

### [x] 阶段5.5: UI组件开发 ✅
*   **核心目标**: 实现5个工作流面板组件，复用Matrix组件风格
*   **关键交付**: ChapterSplitPanel、SceneCharacterPanel等5个面板
*   **任务清单**: (详见计划文档第1702-1916行)
    - [x] **[F5.1]** 创建ChapterSplitPanel组件 (章节拆分)
    - [x] **[F5.2]** 创建SceneCharacterPanel组件 (场景角色提取)
    - [x] **[F5.3]** 创建StoryboardPanel组件 (分镜脚本生成)
    - [x] **[F5.4]** 创建VoiceoverPanel组件 (配音生成)
    - [x] **[F5.5]** 创建ExportPanel组件 (导出成品)
    - [x] **[F5.6]** 注册小说转视频工作流 (WorkflowDefinition)
*   **验收标准**: ✅ 5个步骤可依次完成，UI符合Matrix风格
*   **完成时间**: 2025-12-27
*   **新增文件**: 13个文件（5个组件+5个CSS+工作流执行器+工作流定义）
*   **代码量**: 约1,200行UI代码 + 70行工作流定义

### [ ] 阶段5.6: 集成测试和文档 
*   **核心目标**: 完整流程验证、性能测试、编写开发者文档
*   **关键交付**: E2E测试、工作流引擎开发指南、用户手册
*   **任务清单**: (详见计划文档第1918-2148行)
    - [ ] **[F6.1]** 完整流程测试 (小说导入→视频导出)
    - [ ] **[F6.2]** 中断恢复测试 (应用重启恢复状态)
    - [ ] **[F6.3]** 性能测试 (100章处理<1分钟，并发控制有效)
    - [ ] **[F6.4]** 编写工作流引擎开发指南 (`docs/workflow-engine-guide.md`)
    - [ ] **[F6.5]** 编写用户使用手册 (`docs/novel-to-video-user-guide.md`)
*   **验收标准**: 所有测试通过，文档完整

---

## 🏗️ Phase 6: 内核重构与基础设施 (基建先行)
**目标**: 为 Phase 7 的解耦做准备，构建高可用的底层服务。
**状态**: ✅ 核心完成 (85% - v0.2.9.4)
**执行原则**: **Side-by-Side Implementation (旁路建设)**。在建设新基建时，**严禁**直接修改 Phase 5 已有的业务代码。新旧逻辑暂时共存，直到 Phase 7 统一迁移。
**完成日期**: 2025-12-27
**详细报告**: `plans/done-phase6-infrastructure-v0.2.9.4.md`

### [x] [G01] PluginManager 增强 (沙箱与加载器) ✅
*   **任务**:
    1.  **沙箱环境**: 实现 `PluginContext` 隔离层，确保插件无法直接 `import` 主进程内部类。 ✅
    2.  **生命周期**: 完善 `load/unload` 逻辑，确保卸载插件时能清理其注册的 Service。 ✅
    3.  **验证**: 编写一个简单的 `manifest.json` 测试用例，确保能读取插件元数据，**但暂时不要去动 Novel 插件的加载逻辑**。 ✅
*   **实现**:
    - `PluginContext.ts` (260行) - 插件上下文隔离层，支持权限管理和资源追踪
    - `PluginSandbox.ts` (230行) - 基于VM2的沙箱执行环境
    - `PluginManagerV2.ts` (580行) - 增强版插件管理器，向后兼容
    - 测试用例和示例插件完整

### [x] [G02] TaskScheduler 增强 (持久化队列) ✅
*   **任务**:
    1.  **持久化存储**: 引入 NeDB 或 SQLite，将内存队列改造为磁盘队列，防止崩贵丢失。 ✅
    2.  **并发控制**: 实现 `ConcurrencyManager`，允许为不同类型的任务（如生图 vs 文本处理）设置不同的并发数。 ✅
    3.  **兼容层**: 保持 `addTask` 接口签名不变，或者提供一个 `LegacyAdapter`，确保 Phase 5 的硬编码调用此时仍能运行（即使它还没用到新特性）。 ✅
*   **实现**:
    - `TaskPersistence.ts` (360行) - 基于NeDB的任务持久化，支持断点续传
    - `ConcurrencyManager.ts` (350行) - 智能并发控制，支持优先级队列
    - 完全兼容原有TaskScheduler接口

### [x] [G03] APIManager 增强 (网关模式) ✅
*   **任务**:
    1.  **统一注册表**: 建立 `ServiceRegistry`，所有核心能力（File, System, Network）必须在启动时注册。 ✅
    2.  **API 暴露**: 实现 `exposeAPI(namespace, method)`，为 Phase 7 的插件提供标准调用入口。 ✅
    3.  **成本监控**: 针对 LLM 和 生图 API，实现基础的 Token/Credit 计数器。 ✅
*   **实现**:
    - `ServiceRegistry.ts` (210行) - 统一服务注册表，支持命名空间和调用追踪
    - `CostMonitor.ts` (330行) - 完整的API成本监控，支持预算预警

---
## ✅ Phase 7: 架构标准化与 API 固化 (基于"小说转视频"的提炼)
**目标**: 将 Phase 5 中验证通过的业务逻辑，提炼为标准 SDK 能力，确保第三方开发者能复刻同等体验。
**状态**: ✅ 已完成 (2025-12-27)
**执行顺序**: H01 → H02 → H03 → H04 → H05
**详细报告**: `docs/PHASE7_SUMMARY.md`

**🧪 Phase 7 执行与验证协议 (已完成)**

### 1. 零时刻：基准快照
- [x] **动作**: 执行 `npm run test:integration:novel-baseline`。
- [x] **要求**: 记录下当前"小说转视频"流程的输入（JSON）和输出（Asset Metadata）。
- [x] **目的**: 确保重构不丢失业务逻辑。
- [x] **结果**: 4个基准测试全部通过，生成6个快照文件

### 2. 过程控制：类型栅栏 (Type Fencing)
- [x] **动作**: 插件代码物理隔离到 `plugins/official/novel-to-video/`
- [x] **要求**: 插件只引用 `@matrix/sdk` 公共API，通过 PluginContext 依赖注入
- [x] **目的**: 物理强制解耦，显式定义公共 API
- [x] **结果**: 所有插件代码无法访问 `src/main/services` 内部实现

### 3. 终局验收：双盲测试
- [x] **动作 A**: 插件代码重构完成，使用 GenericAssetHelper 和标准化API
- [x] **动作 B**: 建立插件脚手架模板，支持第三方插件开发
- [x] **动作 C**: TypeScript编译0错误，ESLint 0错误
- [x] **结果**: 27个测试用例100%通过

---

### [x] [H01] 数据结构泛化 (Asset System Refactor) ✅
*   **背景**: 目前 `NovelVideoAssetHelper` 里硬编码了 `ChapterData` 等类型。
*   **完成内容**:
    1.  **Schema 注册机制**: 实现 `SchemaRegistry.ts` (500行) - 支持Schema注册、验证、查询 ✅
    2.  **数据迁移**: 创建5个JSON Schema定义 (Chapter, Scene, Character, Storyboard, Voiceover) ✅
    3.  **通用读写器**: 实现 `GenericAssetHelper.ts` (450行) - 类型安全的泛型CRUD操作 ✅
    4.  **验证**: 插件使用 `context.assetHelper.queryAssets({ schemaId })` 查询数据 ✅
*   **测试**: 17个单元测试100%通过

### [x] [H02] 任务调度标准化 (Task System Refactor) ✅
*   **背景**: `ResourceService` 和 `StoryboardService` 目前可能直接调用了底层队列，或者拥有特权。
*   **完成内容**:
    1.  **任务模板化**: 实现 `TaskTemplate.ts` (600行) - 3个预置模板 (ImageGeneration, TTS, VideoGeneration) ✅
    2.  **链式任务 SDK**: 实现 `ChainTask.ts` (500行) - 任务依赖管理、拓扑排序、条件分支 ✅
    3.  **断点续传**: 集成Phase 6的 `TaskPersistence`，支持断点续传 ✅
    4.  **并发控制**: 集成Phase 6的 `ConcurrencyManager`，智能并发控制 ✅
*   **测试**: 10个集成测试100%通过

### [x] [H03] 插件包体隔离与工具标准化 (Physical Isolation & Tool Standardization) ✅
*   **背景**: 目前代码混杂在 `src/main/services/novel-video`，且直接调用本地工具（FFmpeg、ComfyUI）。
*   **完成内容**:
    1.  **物理移动**: 创建 `plugins/official/novel-to-video/` 完整目录结构 ✅
    2.  **依赖注入**: 5个业务服务移动到插件目录，通过 PluginContext 依赖注入 ✅
    3.  **API 边界**: 所有插件代码仅使用 `@matrix/sdk` 公共API ✅
    4.  **MCP 工具封装**:
        - 实现 `FFmpegTool.ts` (240行) - 7种操作 ✅
        - 实现 `ComfyUITool.ts` (277行) - 6种工作流 ✅
    5.  **构建配置**: 完整的 package.json, tsconfig.json, manifest.json ✅
*   **验证**: 插件物理隔离，API边界清晰

### [x] [H04] UI 组件与交互协议 (UI/UX Standardization) ✅
*   **背景**: 5 个业务面板 (`ChapterSplitPanel` 等) 可能包含无法复用的私有 UI 逻辑。
*   **完成内容**:
    1.  **通用组件**: 实现 `PanelBase.tsx` (150行), `ListSection.tsx` (150行) ✅
    2.  **动态面板协议**: 实现 `PluginPanelProtocol` (250行) - JSON配置协议 ✅
    3.  **自动渲染器**: 实现 `PluginPanelRenderer.tsx` (300行) ✅
    4.  **自定义视图**: 实现 `CustomView` 接口 (200行), `ViewContainer.tsx` (150行) ✅
*   **成果**: 支持3种UI开发方式（JSON配置、React组件、混合模式）

### [x] [H05] 开发者体验文档 (DX & Demo) ✅
*   **完成内容**:
    1.  **源码注释**: 插件入口文件添加60+行详细注释 ✅
    2.  **脚手架模板**: 创建 `templates/plugin/` 完整模板（8个文件）✅
    3.  **开发者指南**: 编写 `docs/07-plugin-development-guide.md` (600行) ✅
    4.  **总结报告**: 编写 `docs/PHASE7_SUMMARY.md` 完整总结 ✅
*   **成果**: 5分钟快速上手，完整的API参考和示例代码 

------

## 🎨 Phase 8: UI 设计系统迁移与三栏布局实现 (v0.3.0核心功能)
**目标**: 应用 V2 设计规范，实现 WorkflowExecutor 完整三栏布局与交互控件
**状态**: 🔄 进行中 (Sprint 1: 44% 完成)
**当前版本**: v0.2.9.6
**基准文档**: `docs/08-ui-design-specification-v1.0.0.md`, `plans/ui-optimization-plan.md`
**参考实现标准** (重要):
- **主题系统**: `src/renderer/pages/about/ThemeShowcase.tsx` - OKLCH色彩、字体、圆角规范
- **组件库**: `src/renderer/pages/demo/UIDemo.tsx` - Button、Card、Input、Badge、Icons等标准实现
**版本**: v0.3.0-ui-upgrade

### [🔄] [H01] Sprint 1: 核心页面 V2 设计迁移 (44% 完成)
*   **目标**: 全局应用 V2 赛博朋克暗黑主题，实现侧边栏收缩控制
*   **参考**: `docs/08-ui-design-specification-v1.0.0.md`
*   **任务清单**:
    - [x] **[H1.1]** 删除冗余 Projects 页面 ✅ v0.2.9.6
        - 删除 `src/renderer/pages/projects/Projects.tsx`
        - 删除 `App.tsx` 中的 `/projects` 路由
        - **验收**: 应用启动无报错，路由表干净

    - [x] **[H1.2]** 全局样式文件更新 ✅ v0.2.9.6
        - 创建 `src/renderer/styles/globals.css`（OKLCH色彩系统）
        - 从 `docs/references/UI/V2/app/globals.css` 迁移所有CSS变量
        - 配置自定义滚动条样式
        - 在 `index.html` 添加 Google Fonts（Inter + JetBrains Mono）
        - **参考**: `ThemeShowcase.tsx` colorTokens/chartColors/sidebarColors 数组定义
        - **验收**: 页面背景变为 `oklch(0.12 0 0)`，字体应用 Inter

    - [x] **[H1.3]** WindowBar V2 迁移 + 侧边栏收缩按钮 ✅ v0.2.9.6
        - 应用 V2 Header 设计（h-14 / 56px）
        - 添加左侧收缩按钮（`PanelLeftOpen/Close` 图标）
        - 创建 SidebarContext 全局状态管理
        - 集成 Framer Motion 弹簧动画
        - **参考**: `UIDemo.tsx` Button组件（size="icon"变体）
        - **验收**: 按钮可见，点击触发侧边栏收缩（动画流畅）

    - [x] **[H1.4]** GlobalNav V2 迁移（可收缩）✅ v0.2.9.6
        - 应用 V2 Sidebar 设计（w-64 / 256px，bg-sidebar）
        - 支持收缩状态（width: 0，opacity: 0）
        - 集成 Framer Motion 弹簧动画（damping: 25, stiffness: 300）
        - **参考**: `ThemeShowcase.tsx` sidebarColors 色彩定义
        - **验收**: 侧边栏样式符合规范，收缩动画流畅

    - [ ] **[H1.5]** Dashboard V2 迁移
        - 项目卡片应用 V2 SceneCard 风格
        - 使用 Framer Motion 悬停动画（scale: 1.02）
        - **参考**: `UIDemo.tsx` Card组件（CardHeader/CardContent/CardFooter结构）
        - **验收**: 卡片圆角 8px，悬停有缩放效果

    - [ ] **[H1.6]** Assets 左侧分类导航
        - 创建左侧 Sidebar（w-64），包含资产类型分类树
        - 实现作用域切换（全局/项目资源）
        - 分类项：文本📝、图像🖼️、音频🎵、视频🎬、脚本📜
        - **验收**: 点击分类过滤资产，作用域切换正常
        
    - [ ] **[H1.7]** Workflows 视图切换按钮
        - 添加 `Grid3x3` / `List` 图标按钮组
        - 添加全屏切换按钮（`Maximize2`）
        - **参考**: `UIDemo.tsx` Button（variant切换）和Icons（lucide-react图标）
        - **验收**: 按钮可见，切换功能正常

    - [ ] **[H1.8]** ProgressOrb 状态球组件
        - 创建 `src/renderer/components/common/ProgressOrb.tsx`
        - 实现 SVG 圆环进度（64x64px）
        - 中心显示队列数，外圈显示进度百分比
        - 生成时播放脉动动画
        - 固定定位：`fixed bottom-6 right-6`
        - **参考**: `ThemeShowcase.tsx` primary色彩（电绿 oklch(0.85 0.22 160)）
        - **验收**: 状态球显示在右下角，数字和圆环正常渲染

    - [ ] **[H1.9]** 侧边栏收缩快捷键
        - 实现 `Ctrl+B`（切换左侧边栏）
        - 实现 `Ctrl+Alt+B`（切换右侧边栏）
        - 实现 `Ctrl+\`（切换所有侧边栏）
        - 安装 `react-hotkeys-hook` 依赖
        - **验收**: 快捷键生效，侧边栏收缩/展开正常
*   **里程碑**: 所有页面应用 V2 设计风格，侧边栏可收缩

### [ ] [H02] Sprint 2: 三栏布局与功能补齐 
*   **目标**: 实现 WorkflowExecutor 完整三栏布局（左项目树 + 中内容区 + 右属性面板）
*   **参考**: `plans/ui-optimization-plan.md` Phase 1.4
*   **任务清单**:
    - [ ] **[H2.1]** WorkflowExecutor 三栏布局重构
        - 修改 `WorkflowExecutor.tsx`，实现左中右三栏布局
        - 左侧：项目资源树（可收缩，宽度 256px）
        - 中间：工作流步骤内容区（flex-1）
        - 右侧：属性面板（可收缩，宽度 320px）
        - **验收**: 三栏布局渲染正常，比例协调

    - [ ] **[H2.2]** RightSettingsPanel 右侧属性面板
        - 创建 `src/renderer/components/workflow/RightSettingsPanel.tsx`
        - 实现 Tab 切换：【属性】|【工具】
        - 实现检查器区域（显示当前选中项信息）
        - 实现 Prompt 编辑器（Textarea，h-24）
        - 实现生成设置表单（模型、步数、CFG、种子）
        - 实现关联资产显示（Tag 列表）
        - 实现底部绿色"生成 (GENERATE)"按钮（w-full, size-lg）
        - **参考**: `UIDemo.tsx` Tabs/Input/Label/Button组件（完整表单实现示例）
        - **验收**: 面板完整显示，字段可编辑，按钮可点击

    - [ ] **[H2.3]** 视图模式切换（卡片/列表）
        - 创建 `SceneCardGrid.tsx`（卡片网格视图，grid-cols-1/2/3）
        - 创建 `SceneListView.tsx`（列表视图，紧凑行布局）
        - 实现视图切换按钮逻辑（Grid3x3 / List）
        - 实现用户偏好持久化（localStorage）
        - **参考**: `UIDemo.tsx` Card组件和Button状态切换示例
        - **验收**: 两种视图正常切换，刷新后保持上次选择

    - [ ] **[H2.4]** 右侧面板与卡片联动
        - 点击分镜卡片时，右侧面板显示其详细信息
        - 修改 Prompt/参数后，数据同步到状态
        - 支持批量选中（Shift/Ctrl点击）
        - **验收**: 点击卡片，右侧面板立即更新

    - [ ] **[H2.5]** 实现 ChapterSplitPanel 业务逻辑
        - 实现小说文件上传（txt/docx）
        - 实现 AI 章节识别（调用 ChapterService）
        - 实现章节列表展示（可编辑标题）
        - 实现"下一步"按钮（保存数据，跳转下一面板）
        - **验收**: 上传小说后自动拆分章节，可手动调整

    - [ ] **[H2.6]** 实现 SceneCharacterPanel 业务逻辑
        - 实现场景卡片网格展示
        - 实现角色管理（添加、编辑、删除）
        - 调用后端服务提取场景和角色
        - **验收**: 显示场景列表，角色可管理

    - [ ] **[H2.7]** 实现 StoryboardPanel 业务逻辑
        - 实现分镜卡片/列表双视图
        - 实现"重生成"按钮（单个分镜）
        - 集成右侧属性面板（编辑 Prompt）
        - 调用后端生成分镜图（ComfyUI）
        - **验收**: 分镜可生成，可编辑，支持两种视图

    - [ ] **[H2.8]** 实现 VoiceoverPanel 业务逻辑
        - 实现旁白列表展示
        - 实现音色选择下拉框
        - 实现试听按钮（播放音频）
        - 调用后端 TTS 服务生成音频
        - **验收**: 可生成配音，可试听
*   **里程碑**: WorkflowExecutor 三栏布局完整，5 个面板功能可用

### [ ] [H03] Sprint 3: 交互优化与测试
*   **目标**: 完善交互细节，添加动画，进行全面测试
*   **任务清单**:
    - [ ] **[H3.1]** ProgressOrb 点击展开任务列表
        - 实现任务列表底部抽屉（Sheet 组件）
        - 显示所有队列任务、进度、预计时间
        - 支持取消/重试单个任务
        - **验收**: 点击状态球，抽屉弹出，任务列表完整

    - [ ] **[H3.2]** Framer Motion 动画全局应用
        - 卡片悬停动画（whileHover: scale 1.02）
        - 侧边栏展开动画（弹簧参数：damping 25, stiffness 300）
        - 模态框弹出动画（initial: opacity 0, scale 0.95）
        - 选项卡切换动画（layoutId="activeTab"）
        - **参考**: `ThemeShowcase.tsx` Tab切换动画实现
        - **验收**: 所有动画流畅，参数符合规范

    - [ ] **[H3.3]** 键盘快捷键完善
        - `Ctrl+Shift+G`: 切换视图模式（卡片/列表）
        - `F11`: 全屏切换
        - `Ctrl+N`: 新建项目
        - `Ctrl+,`: 打开设置
        - **验收**: 所有快捷键生效

    - [ ] **[H3.4]** UI 一致性检查
        - 检查所有页面色彩符合 `08-ui-design-specification-v1.0.0.md`
        - 检查字体统一使用 Inter / JetBrains Mono
        - 检查间距统一使用 4px 基准（gap-1/2/3/4）
        - 检查圆角统一使用 8px 基准（rounded-lg）
        - **验收**: 无视觉不一致问题

    - [ ] **[H3.5]** 性能优化
        - 实现资产网格懒加载（react-window 或 react-virtualized）
        - 优化图片加载（WebP 格式 + 占位符）
        - 优化动画性能（使用 transform 代替 left/top）
        - **验收**: 大量资产加载流畅，无卡顿

    - [ ] **[H3.6]** 无障碍测试
        - 为所有图标按钮添加 `aria-label`
        - 测试键盘导航（Tab / Enter / Escape）
        - 测试屏幕阅读器兼容性
        - **验收**: 符合 WCAG 2.1 AA 级标准
*   **里程碑**: UI/UX 打磨完成，交互细节完善

---

### 📋 Phase 8 验收标准
- [ ] **功能完整性**
    - [ ] WorkflowExecutor 三栏布局完整（左项目树 + 中内容区 + 右属性面板）
    - [ ] 右侧属性面板功能完整（检查器、Prompt、生成设置、关联资产）
    - [ ] 状态球正常工作（显示队列数、进度圆环、点击展开任务列表）
    - [ ] 侧边栏收缩功能（左右侧独立控制，动画流畅，快捷键有效）
    - [ ] 视图模式切换（卡片/列表两种布局，用户偏好持久化）
    - [ ] 5 个工作流面板业务逻辑完整
- [ ] **UI 规范符合性**
    - [ ] 色彩系统符合 `08-ui-design-specification-v1.0.0.md`（OKLCH色彩空间）
    - [ ] 字体使用 Inter（主字体）+ JetBrains Mono（等宽）
    - [ ] 所有动画使用 Framer Motion（弹簧参数：damping 25, stiffness 300）
    - [ ] 图标统一使用 lucide-react
    - [ ] 圆角 8px、间距 4px 基准、按钮高度 32/40/48px
    - [ ] 对比度满足 WCAG 2.1 AAA 级（正文 7:1）
- [ ] **代码质量**
    - [ ] TypeScript 严格模式通过（0 错误）
    - [ ] ESLint 0 错误
    - [ ] 组件类型定义完整（Props 接口清晰）
    - [ ] 无 console.log 残留
    - [ ] 注释完整（中文）
- [ ] **性能指标**
    - [ ] 页面加载 < 1s
    - [ ] 资产网格渲染 1000+ 项无卡顿
    - [ ] 动画帧率 > 60fps
    - [ ] 内存占用增长 < 50MB

---

## 📋 Phase 9: 测试覆盖与交付验证 (v0.3.0规划)
**目标**: 提升测试覆盖率至80%+，完成交付前验证
**状态**: ⏳ 待Phase 8完成后启动

### [ ] [J01] 服务层单元测试
*   **任务**:
    1.  ProjectManager单元测试 (CRUD、元数据管理)。
    2.  AssetManager单元测试 (索引、查询、监听、customFields)。
    3.  PluginManager单元测试 (加载、卸载、权限)。
    4.  TaskScheduler单元测试 (任务调度、优先级、持久化)。
    5.  APIManager单元测试 (多提供商、路由、成本)。
*   **验收**: 核心服务测试覆盖率>80%

### [ ] [J02] IPC通信集成测试
*   **任务**:
    1.  扩展IPC通信集成测试覆盖 (所有80个处理器)。
    2.  测试错误处理和边界条件。
    3.  测试并发调用和性能。
*   **验收**: IPC测试覆盖率>90%

### [ ] [I03] 端到端测试
*   **任务**:
    1.  创建E2E测试框架 (Playwright/Spectron)。
    2.  完整用户流程测试 (项目创建→资产导入→工作流执行→导出)。
    3.  跨平台兼容性测试 (Windows/macOS/Linux)。
*   **验收**: 关键用户流程可自动化测试

### [ ] [I04] 交付前验证
*   **任务**:
    1.  **规范自查**: 检查是否满足 docs/00-global-requirements-v1.0.0.md 的所有强制要求。
    2.  **构建打包**: 生成 Windows 安装包 (.exe)。
    3.  **性能优化**: 启动时间<3s、内存占用<500MB、响应速度<100ms。
    4.  **安全审计**: 检查文件系统路径遍历、XSS、注入等漏洞。
*   **验收**: 可发布生产就绪版本

### [ ] [I05] 文档完善
*   **任务**:
    1.  完善用户文档 (安装、配置、使用教程)。
    2.  完善开发者文档 (架构、API、插件开发)。
    3.  编写发布说明 (Release Notes)。
    4.  录制演示视频。
*   **验收**: 文档完整，新用户可快速上手

---

### [ ] [J01] 工作流生态建设
*   **任务**:
    1.  基于工作流引擎实现第二个工作流插件 (如图片批量生成)。
    2.  编写插件开发规范文档。
    3.  建立插件模板项目。
    4.  实现工作流步骤复用机制。
*   **验收**: 第三方开发者可独立开发工作流插件

## 🎯 里程碑与版本规划

### v0.2.0 ✅ (当前版本 - 2025-12-24)
- ✅ 5个核心服务MVP实现
- ✅ 80个IPC处理器（51完整+20部分+9模拟）
- ✅ 10个通用UI组件
- ✅ Dashboard页面完整功能
- ✅ 安全漏洞修复
- ✅ 代码质量提升（0 ESLint错误）

### v0.3.0 📋 (下一版本 - 预计2周后)
**重点**: 服务增强 + UI功能完善
- [ ] PluginManager、TaskScheduler、APIManager高级特性
- [ ] MCP和本地服务真实集成
- [ ] 工作流执行引擎实现
- [ ] Assets和Workflows页面功能完整
- [ ] 测试覆盖率提升至80%+

### v0.4.0 📋 (预计1个月后)
**重点**: 用户体验优化
- [ ] 工作流可视化编辑器
- [ ] 资产库完整功能
- [ ] 插件市场集成
- [ ] 性能优化
- [ ] 用户文档完善

### v1.0.0 🎯 (正式发布 - 预计2-3个月后)
**重点**: 生产就绪
- [ ] 所有核心功能完整
- [ ] 完整的测试覆盖
- [ ] 性能和稳定性验证
- [ ] 完整的用户文档
- [ ] 跨平台打包和分发

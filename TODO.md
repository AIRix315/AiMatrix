# MATRIX Studio 开发执行总纲 v1.1

## 📂 项目状态概览
*   **当前版本**: v0.2.0 (核心服务实现与UI功能连接)
*   **当前阶段**: Phase 3 - 界面重构 (基本完成) & Phase 4 - MVP核心功能 (进行中)
*   **最后更新**: 2025-12-24
*   **架构依据**: `/docs/00-06` 文档集
*   **参考UI**: `docs/references/UI/matrix`
*   **功能完成度**: 约90% (核心服务完整，UI待完善)

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
- CHANGELOG: feat(assets): implemented real-time asset grid with file system watcher

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
- CHANGELOG: feat(workflow): integrated react-flow with drag-and-drop node editing

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
- CHANGELOG: feat(core): implemented plugin loading system and manifest validation

---

## Phase 5: 纵向业务整合 - 小说转视频 (Novel Plugin)
目标: 作为第一个“官方插件”，调用 Phase 4 建立的 Asset/Workflow/Plugin 能力，跑通业务闭环。

### [ ] [F01] 剧本解析逻辑 (Script Logic Integration)
- 文件路径: src/main/features/novel/ (作为插件逻辑)
- 核心目的: 验证 API 调用能力和文本处理能力。
- 执行动作:
    1. 调用 APIManager 进行剧本拆解 (Splitter)。
    2. 关键: 拆解生成的文件夹结构 (Chapter/Scene) 必须能被 [E01] 资产库 自动识别并显示。
- 验证: 运行解析后，去 Assets 页面搜索 "Scene"，能看到新生成的文件夹。
- CHANGELOG: feat(novel): implemented script splitter utilizing core api services

### [ ] [F02] 分镜生图与元数据 (Generation & Sidecar)
- 文件路径: src/main/features/novel/generation/
- 核心目的: 验证 TaskScheduler 和“伴生文件”规范。
- 执行动作:
    1. 提交 TXT2IMG 任务到 TaskScheduler。
    2. 生成图片时，同步写入 .json Sidecar。
    3. 关键: [E01] 资产库 的卡片必须能读取这个 .json，在 Tooltip 中显示 Prompt。
- 验证: 只要小说插件生了图，Assets 页面的图片卡片上就应该出现一个小图标，提示“包含元数据”。
- CHANGELOG: feat(novel): integrated image generation with sidecar metadata standard

### [ ] [F03] 专用界面绑定 (Novel UI)
- 文件路径: src/renderer/features/novel/
- 核心目的: 提供特定业务的高效操作界面（区别于通用的 Workflow Editor）。
- 执行动作:
    1. 移植 V14 的 Sidebar 和 Storyboard。
    2. 数据源替换: 强制让 Sidebar 读取 AssetManager 的索引数据，而不是私有 State。
    3. 操作绑定: "生成"按钮不再直接调 API，而是通过 IPC 发送任务给 TaskScheduler。
- CHANGELOG: ui(novel): ported specific novel interface utilizing platform managers

---

## ⏳ Phase 6: 交付前验证
**状态**: ⏳ 待Phase 4完成后启动

- [ ] **[G01] 规范自查**: 检查是否满足 docs/00-global-requirements-v1.0.0.md 的所有强制要求。
- [ ] **[G02] 构建打包**: 生成 Windows 安装包 (.exe)。
- [ ] **[G03] 端到端测试**: 完整用户流程验证。
- [ ] **[G04] 性能优化**: 启动时间、内存占用、响应速度优化。

---

## 📋 Phase 6: 服务增强 (v0.3.0规划)
**目标**: 完善MVP服务的高级特性
**预计时间**: 约10个工作日

### [ ] [H01] PluginManager 增强
*   **任务**:
    1.  实现插件沙箱执行环境。
    2.  添加插件签名验证机制。
    3.  实现插件市场API集成。
    4.  完善官方/社区插件权限分级。

### [ ] [H02] TaskScheduler 增强
*   **任务**:
    1.  实现任务队列持久化。
    2.  添加成本估算功能 (estimateCost)。
    3.  实现智能优先级调度算法。
    4.  支持任务断点续传。

### [ ] [H03] APIManager 增强
*   **任务**:
    1.  实现API使用量实时跟踪。
    2.  添加成本统计和分析功能。
    3.  实现智能路由选择机制。
    4.  支持更多AI服务提供商。

### [ ] [H04] MCP和本地服务集成
*   **任务**:
    1.  替换mcp:* IPC处理器的模拟实现。
    2.  替换local:* IPC处理器的模拟实现。
    3.  实现真实的MCP协议通信。
    4.  集成本地服务管理功能。

### [ ] [H05] 工作流执行引擎
*   **任务**:
    1.  替换workflow:execute的演示数据。
    2.  实现真实的工作流执行逻辑。
    3.  支持ComfyUI、N8N、MCP工作流。
    4.  工作流状态实时监控。

---

## 📋 Phase 7: 测试覆盖完善 (v0.3.0规划)
**目标**: 提升测试覆盖率至80%+
**预计时间**: 约5个工作日

### [ ] [I01] 服务层单元测试
*   **任务**:
    1.  ProjectManager单元测试。
    2.  AssetManager单元测试。
    3.  PluginManager单元测试。
    4.  TaskScheduler单元测试。
    5.  APIManager单元测试。

### [ ] [I02] IPC通信集成测试
*   **任务**:
    1.  扩展IPC通信集成测试覆盖。
    2.  测试所有实际IPC处理器。
    3.  错误处理和边界条件测试。

### [ ] [I03] 端到端测试
*   **任务**:
    1.  创建E2E测试框架。
    2.  完整用户流程测试。
    3.  跨平台兼容性测试。

---

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

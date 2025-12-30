# MATRIX Studio 系统结构文档

**文档版本**: v1.0
**基准代码版本**: v0.3.8
**生成日期**: 2025-12-30
**文档性质**: 真实代码审计结果

---

## 📌 文档说明

本文档基于 **MATRIX Studio v0.3.8** 实际代码库扫描生成，完整记录当前系统的真实架构结构，包括：

1. **服务层架构**：17 个核心服务及其依赖关系
2. **IPC 通信层**：105 个 IPC 通道及其分类
3. **前端架构**：11 条路由、50+ 组件及其层级关系
4. **类型系统**：80+ 接口/类型/枚举定义
5. **文件组织**：完整的目录结构和文件清单

⚠️ **重要提示**：本文档反映的是**当前真实情况**，而非设计蓝图。所有数据基于代码扫描，不包含计划功能。

---

## 一、整体架构概览

### 1.1 Electron 三进程模型

MATRIX Studio 采用标准的 Electron 三进程架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process (主进程)                    │
│                      Node.js Runtime                         │
├─────────────────────────────────────────────────────────────┤
│  核心服务 (17个)                                              │
│  ├─ ProjectManager       ├─ WorkflowRegistry                │
│  ├─ AssetManager         ├─ WorkflowStateManager            │
│  ├─ PluginManager        ├─ SchemaRegistry                  │
│  ├─ TimeService          ├─ ModelRegistry                   │
│  ├─ Logger               ├─ TaskScheduler                   │
│  ├─ ConfigManager        ├─ APIManager                      │
│  ├─ ServiceErrorHandler  ├─ ShortcutManager                 │
│  ├─ FileSystemService    ├─ GenericAssetHelper              │
│  └─ PluginMarketService                                     │
│                                                              │
│  IPC 处理器 (105个通道)                                       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ IPC 通信
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Preload Script (预加载脚本)                 │
│                   Context Bridge (安全层)                     │
├─────────────────────────────────────────────────────────────┤
│  window.electronAPI                                         │
│  ├─ app.*         ├─ workflow.*    ├─ api.*                │
│  ├─ project.*     ├─ plugin.*      ├─ model.*              │
│  ├─ asset.*       ├─ task.*        ├─ file.*               │
│  └─ ... (105个方法)                                          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ 调用
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Renderer Process (渲染进程)                  │
│                  Browser Environment                         │
├─────────────────────────────────────────────────────────────┤
│  React 应用                                                   │
│  ├─ 路由系统 (11条路由)                                       │
│  ├─ 页面组件 (9个核心页面)                                    │
│  ├─ UI组件库 (50+组件)                                        │
│  └─ 状态管理 (Context API + Hooks)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、主进程服务层架构

### 2.1 服务分类和清单

MATRIX Studio 主进程共有 **17 个核心服务**，按功能分为 6 大类：

#### 分类 1：基础设施服务（4 个）

| 服务名称 | 文件路径 | 代码行数 | 主要职责 |
|---------|---------|---------|---------|
| Logger | `src/main/services/Logger.ts` | 400+ | 统一日志管理（4级日志、文件轮转、Session ID）|
| TimeService | `src/main/services/TimeService.ts` | 300+ | 时间服务与合规层（NTP同步、时间验证）|
| ServiceErrorHandler | `src/main/services/ServiceErrorHandler.ts` | 200+ | 统一错误处理（37个错误码、错误分类）|
| FileSystemService | `src/main/services/FileSystemService.ts` | 370 | 文件系统操作（路径管理、JSON读写）|

#### 分类 2：配置与管理服务（2 个）

| 服务名称 | 文件路径 | 代码行数 | 主要职责 |
|---------|---------|---------|---------|
| ConfigManager | `src/main/services/ConfigManager.ts` | 500+ | 应用配置管理（加密存储、热更新）|
| ShortcutManager | `src/main/services/ShortcutManager.ts` | 150+ | 快捷方式管理（菜单栏快捷方式）|

#### 分类 3：项目与资产服务（3 个）

| 服务名称 | 文件路径 | 代码行数 | 主要职责 |
|---------|---------|---------|---------|
| ProjectManager | `src/main/services/ProjectManager.ts` | 500+ | 项目生命周期管理（CRUD、模板系统）|
| AssetManager | `src/main/services/AssetManager.ts` | 1300+ | 资产库管理（索引、监听、分页查询）|
| GenericAssetHelper | `src/main/services/GenericAssetHelper.ts` | 450 | 通用资产助手（Schema驱动操作）|

#### 分类 4：工作流服务（3 个）

| 服务名称 | 文件路径 | 代码行数 | 主要职责 |
|---------|---------|---------|---------|
| WorkflowRegistry | `src/main/services/WorkflowRegistry.ts` | 200+ | 工作流注册表（模板注册与查询）|
| WorkflowStateManager | `src/main/services/WorkflowStateManager.ts` | 400+ | 工作流状态管理（实例持久化、中断恢复）|
| SchemaRegistry | `src/main/services/SchemaRegistry.ts` | 500 | Schema注册表（插件Schema验证）|

#### 分类 5：插件与任务服务（3 个）

| 服务名称 | 文件路径 | 代码行数 | 主要职责 |
|---------|---------|---------|---------|
| PluginManager | `src/main/services/PluginManager.ts` | 600+ | 插件管理（加载/卸载、沙箱执行、ZIP安装）|
| PluginMarketService | `src/main/services/PluginMarketService.ts` | 280+ | 插件市场服务（官方/社区插件列表）|
| TaskScheduler | `src/main/services/TaskScheduler.ts` | 400+ | 任务调度（任务执行、状态追踪）|

#### 分类 6：API 与模型服务（2 个）

| 服务名称 | 文件路径 | 代码行数 | 主要职责 |
|---------|---------|---------|---------|
| APIManager | `src/main/services/APIManager.ts` | 400+ | API Provider管理（连接测试、密钥加密）|
| ModelRegistry | `src/main/services/ModelRegistry.ts` | 300+ | 模型注册表（模型定义、用户配置）|

---

### 2.2 服务依赖关系图

```
                    ┌──────────────┐
                    │ TimeService  │ ◄─── 所有服务（时间验证/时间戳）
                    └──────────────┘
                           ▲
                           │
                    ┌──────────────┐
                    │    Logger    │ ◄─── 所有服务（日志记录）
                    └──────────────┘
                           ▲
                           │
                ┌──────────────────────┐
                │ ServiceErrorHandler  │ ◄─── 所有服务（错误处理）
                └──────────────────────┘
                           ▲
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│FileSystemService│  │ConfigManager │  │WorkflowRegistry│
└────────────────┘  └──────────────┘  └──────────────┘
         ▲                 ▲                 ▲
         │                 │                 │
    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
    │         │      │         │      │         │
AssetManager  │  PluginMgr  ShortcutMgr  WorkflowStateMgr
SchemaRegistry│  APIManager ProjectMgr
GenericHelper │  TaskScheduler
              │  ModelRegistry
         (依赖关系)
```

---

### 2.3 服务初始化顺序

根据依赖关系，服务初始化顺序（`src/main/index.ts`）：

```typescript
// 第一层：基础设施（无依赖）
1. Logger
2. ServiceErrorHandler
3. TimeService

// 第二层：系统服务（依赖基础设施）
4. FileSystemService
5. ConfigManager

// 第三层：功能注册表（依赖文件系统）
6. SchemaRegistry
7. WorkflowRegistry

// 第四层：业务服务（依赖配置和注册表）
8. AssetManager          // 依赖 FileSystemService, ConfigManager
9. ProjectManager        // 依赖 ConfigManager, TimeService
10. WorkflowStateManager // 依赖 WorkflowRegistry, FileSystemService

// 第五层：高级服务（依赖业务服务）
11. APIManager           // 依赖 ConfigManager
12. ModelRegistry        // 依赖 APIManager
13. PluginManager        // 依赖 ConfigManager
14. PluginMarketService  // 独立服务
15. TaskScheduler        // 依赖 APIManager
16. ShortcutManager      // 依赖 ConfigManager, TimeService

// 第六层：辅助服务（依赖多个服务）
17. GenericAssetHelper   // 依赖 AssetManager, SchemaRegistry
```

---

### 2.4 服务公开接口统计

| 服务名称 | 公共方法数量 | 关键方法 |
|---------|------------|---------|
| ProjectManager | 10+ | create, load, save, delete, list, addInputAsset, addOutputAsset |
| AssetManager | 15+ | buildIndex, scanAssets, importAsset, deleteAsset, updateMetadata, startWatching |
| WorkflowRegistry | 8 | register, getDefinition, has, listAll, filter, unregister |
| WorkflowStateManager | 10+ | createInstance, saveState, loadState, updateStepStatus, deleteInstance |
| PluginManager | 10+ | initialize, loadPlugin, executePlugin, installFromZip, togglePlugin |
| APIManager | 12+ | addProvider, removeProvider, testConnection, getProviderStatus, listProviders |
| ConfigManager | 8+ | get, set, save, load, watchChanges |
| TimeService | 5 | getCurrentTime, validateTimeIntegrity, syncWithNTP, getTimeWithValidation |
| Logger | 4 | debug, info, warn, error |
| ShortcutManager | 6 | addShortcut, removeShortcut, reorderShortcuts, listShortcuts |

---

## 三、IPC 通信层架构

### 3.1 IPC 通道统计

MATRIX Studio 共有 **105 个 IPC 通道**，分为 **17 个模块**：

| 模块 | 通道前缀 | 通道数量 | 占比 |
|-----|---------|---------|------|
| 应用相关 | `app:*` | 4 | 3.8% |
| 时间服务 | `time:*` | 1 | 1.0% |
| 窗口控制 | `window:*` | 4 | 3.8% |
| 快捷方式 | `shortcut:*` | 4 | 3.8% |
| 项目管理 | `project:*` | 7 | 6.7% |
| 资产管理 | `asset:*` | 13 | 12.4% |
| 工作流管理 | `workflow:*` | 17 | 16.2% |
| 插件管理 | `plugin:*` | 9 | 8.6% |
| 任务调度 | `task:*` | 5 | 4.8% |
| API与模型 | `api:*`, `model:*` | 20 | 19.0% |
| 文件系统 | `file:*` | 9 | 8.6% |
| 对话框 | `dialog:*` | 2 | 1.9% |
| 日志管理 | `logs:*` | 1 | 1.0% |
| 设置管理 | `settings:*` | 2 | 1.9% |
| MCP服务 | `mcp:*` | 5 | 4.8% |
| 本地服务 | `local:*` | 4 | 3.8% |
| 事件通知 | `event:*` | 5 | 4.8% |
| **总计** | - | **105** | **100%** |

---

### 3.2 重点模块通道清单

#### 3.2.1 项目管理（project:*）- 7 个

```typescript
project:create          // 创建项目
project:load            // 加载项目
project:save            // 保存项目
project:delete          // 删除项目
project:list            // 列出项目
project:add-input-asset // 添加输入资产
project:add-output-asset// 添加输出资产
```

#### 3.2.2 资产管理（asset:*）- 13 个

```typescript
asset:get-index         // 获取资产索引
asset:rebuild-index     // 重建资产索引
asset:scan              // 扫描资产（分页）
asset:import            // 导入资产
asset:delete            // 删除资产
asset:get-metadata      // 获取元数据
asset:update-metadata   // 更新元数据
asset:start-watching    // 开始监听
asset:stop-watching     // 停止监听
asset:show-import-dialog// 打开导入对话框
asset:get-references    // 获取引用关系
asset:file-changed (event)  // 文件变化事件
```

#### 3.2.3 工作流管理（workflow:*）- 17 个

```typescript
// 执行相关
workflow:execute        // 执行工作流
workflow:status         // 获取状态
workflow:cancel         // 取消执行

// 定义管理
workflow:listDefinitions// 列出定义
workflow:getDefinition  // 获取定义
workflow:save           // 保存工作流
workflow:delete         // 删除工作流
workflow:load           // 加载工作流

// 实例管理
workflow:createInstance // 创建实例
workflow:loadInstance   // 加载实例
workflow:deleteInstance // 删除实例
workflow:listInstances  // 列出实例

// 状态管理
workflow:saveState      // 保存状态
workflow:loadState      // 加载状态
workflow:updateCurrentStep    // 更新当前步骤
workflow:updateStepStatus     // 更新步骤状态
```

#### 3.2.4 API 与模型（api:*, model:*）- 20 个

**API Provider（11 个）**：
```typescript
api:call                    // 调用 API
api:set-key                 // 设置密钥
api:get-status              // 获取状态
api:get-usage               // 获取使用情况
api:test-connection         // 测试连接
api:list-providers          // 列出 Providers
api:get-provider            // 获取单个 Provider
api:add-provider            // 添加 Provider
api:remove-provider         // 移除 Provider
api:test-provider-connection// 测试 Provider 连接
api:get-provider-status     // 获取 Provider 状态
```

**Model（7 个）**：
```typescript
model:list                  // 列出模型
model:get                   // 获取模型
model:add-custom            // 添加自定义模型
model:remove-custom         // 移除自定义模型
model:toggle-visibility     // 切换可见性
model:toggle-favorite       // 切换收藏
model:set-alias             // 设置别名
```

---

### 3.3 IPC 通道实现位置

| 组件 | 文件路径 | 职责 |
|------|---------|------|
| 通道定义 | `src/main/ipc/channels.ts` | 定义 85 个通道常量 |
| 主进程处理器 | `src/main/index.ts` (行276-824) | 注册 105 个 `ipcMain.handle()` |
| 工作流处理器 | `src/main/ipc/workflow-handlers.ts` | 专门处理工作流相关通道 |
| 预加载脚本 | `src/preload/index.ts` | 暴露 `window.electronAPI` |
| 类型声明 | `src/preload/index.ts` (行713-826) | 全局类型声明 |

---

## 四、前端架构

### 4.1 路由系统

**路由库**：React Router DOM v6 (HashRouter)
**路由总数**：11 条

#### 路由清单

| 路径 | 组件 | 功能说明 |
|------|------|----------|
| `/` | Dashboard | 首页/项目管理 |
| `/dashboard` | Dashboard | 项目管理（同上） |
| `/assets` | Assets | 资产库管理 |
| `/plugins` | Plugins | 插件市场 |
| `/plugins/:pluginId` | WorkflowExecutor | 插件执行器（如"小说转视频"） |
| `/workflow` | Workflows | 工作流列表 |
| `/workflows` | Workflows | 工作流列表（同上） |
| `/workflows/new` | WorkflowEditor | 新建自定义工作流 |
| `/workflows/editor/:workflowId` | WorkflowEditor | 编辑自定义工作流 |
| `/workflows/:workflowId` | WorkflowExecutor | 工作流执行器 |
| `/settings` | Settings | 设置页面 |
| `/about` | About | 关于页面 |
| `/demo` | UIDemo | UI 组件演示 |

---

### 4.2 页面组件清单

**页面目录**：`src/renderer/pages/`
**页面总数**：9 个核心页面

| 页面组件 | 文件路径 | 代码行数 | 功能描述 |
|---------|---------|---------|---------|
| Dashboard | `pages/dashboard/Dashboard.tsx` | 289 | 项目列表、新建项目、快捷方式管理 |
| Assets | `pages/assets/Assets.tsx` | 222 | 资产库、三栏布局、预览编辑 |
| Plugins | `pages/plugins/Plugins.tsx` | 456 | 插件列表、插件市场、ZIP 安装 |
| Workflows | `pages/workflows/Workflows.tsx` | 283 | 工作流列表、模板管理 |
| WorkflowEditor | `pages/workflows/WorkflowEditor.tsx` | 600+ | 节点图编辑器（ReactFlow） |
| WorkflowExecutor | `pages/workflows/WorkflowExecutor.tsx` | 576 | 工作流执行器、步骤面板 |
| Settings | `pages/settings/Settings.tsx` | 463 | 设置管理、Provider 配置 |
| About | `pages/about/About.tsx` | 100+ | 关于信息、主题展示 |
| UIDemo | `pages/demo/UIDemo.tsx` | 200+ | UI 组件演示 |

---

### 4.3 UI 组件体系

#### 4.3.1 布局组件（4 个）

| 组件 | 文件路径 | 职责 |
|------|---------|------|
| Layout | `components/common/Layout.tsx` | 应用主布局容器（包含 WindowBar、GlobalNav、StatusBar） |
| WindowBar | `components/common/WindowBar.tsx` | 自定义窗口标题栏（无边框窗口控制） |
| GlobalNav | `components/common/GlobalNav.tsx` | 全局导航栏（固定区域 + 快捷方式区域） |
| StatusBar | `components/layout/StatusBar.tsx` | 底部状态栏 + 日志查看器 |

#### 4.3.2 shadcn/ui 组件（12 个）

**目录**：`src/renderer/components/ui/`

| 组件 | 文件 | 用途 |
|------|------|------|
| Button | button.tsx | 按钮（5种变体） |
| Card | card.tsx | 卡片容器（Header、Title、Content、Footer） |
| Input | input.tsx | 输入框 |
| Label | label.tsx | 标签 |
| Checkbox | checkbox.tsx | 复选框（Radix UI） |
| Switch | switch.tsx | 开关（Radix UI） |
| Badge | badge.tsx | 徽章（4种变体） |
| Alert | alert.tsx | 警告框 |
| Separator | separator.tsx | 分隔线（Radix UI） |
| Tabs | tabs.tsx | 选项卡（Radix UI） |
| Sheet | sheet.tsx | 侧边抽屉（Radix UI） |
| Select | select.tsx | 下拉选择（Radix UI） |

#### 4.3.3 业务组件（30+ 个）

**公共组件**（`components/common/`）：

| 组件 | 职责 |
|------|------|
| Button | 业务按钮（primary/ghost/danger 变体） |
| Card | 业务卡片（tag、image、title、info） |
| Icon | 图标组件 |
| Toast | 通知提示（success/error/warning/info） |
| Loading | 加载指示器（3种尺寸、全屏模式） |
| Modal | 模态框 |
| ConfirmDialog | 确认对话框（info/warning/danger 类型） |
| ProgressOrb | 进度球（任务队列可视化） |
| TaskQueueSheet | 任务队列抽屉 |
| Collapsible | 可折叠面板（支持 localStorage 持久化） |
| ViewSwitcher | 视图切换器（List/Grid） |
| ListView | 列表视图 |
| ShortcutNavItem | 快捷方式导航项（支持编辑模式） |

**工作流组件**（`components/workflow/`）：

| 组件 | 职责 |
|------|------|
| WorkflowHeader | 工作流执行器头部（项目选择器、步骤条、侧栏控制） |
| RightSettingsPanel | 右侧属性面板（检查器、Prompt、生成设置、任务队列） |
| WorkflowListItem | 工作流列表项 |
| ProjectSelectorDialog | 项目选择对话框 |
| InputNode | 输入节点（ReactFlow） |
| ExecuteNode | 执行节点（ReactFlow） |
| OutputNode | 输出节点（ReactFlow） |

**资产组件**（`components/AssetGrid/`, `components/AssetCard/`, etc.）：

| 组件 | 职责 |
|------|------|
| AssetGrid | 资产网格（响应式布局、无限滚动、过滤） |
| AssetGridVirtualized | 虚拟化资产网格（性能优化） |
| AssetCard | 资产卡片（预览、选择、删除） |
| AssetPreview | 资产预览对话框（支持上一个/下一个导航） |
| AssetSidebar | 资产侧边栏 |

---

### 4.4 组件层级关系

```
App (入口)
└── ThemeProvider (主题上下文)
    └── SidebarProvider (侧边栏上下文)
        └── Router (HashRouter)
            └── Layout (布局容器)
                ├── WindowBar (窗口栏)
                ├── GlobalNav (全局导航)
                │   ├── 固定上方区域 (4个菜单项)
                │   ├── 可编辑区域 (用户快捷方式)
                │   └── 固定下方区域 (设置、关于)
                ├── Outlet (路由出口)
                │   ├── Dashboard
                │   │   ├── ProjectCard (项目卡片)
                │   │   └── NewProjectModal (新建项目对话框)
                │   ├── Assets
                │   │   ├── AssetSidebar (左侧分类导航)
                │   │   ├── AssetGrid (中间资产网格)
                │   │   │   └── AssetCard (资产卡片)
                │   │   └── AssetPreview (右侧预览)
                │   ├── Plugins
                │   │   ├── PluginCard (插件卡片)
                │   │   └── PluginDetailModal (插件详情对话框)
                │   ├── Workflows
                │   │   ├── WorkflowListItem (工作流列表项)
                │   │   └── TaskQueueSheet (任务队列抽屉)
                │   ├── WorkflowEditor
                │   │   ├── ReactFlow (节点图画布)
                │   │   │   ├── InputNode (输入节点)
                │   │   │   ├── ExecuteNode (执行节点)
                │   │   │   └── OutputNode (输出节点)
                │   │   ├── LeftPanel (节点库)
                │   │   └── RightPanel (属性面板)
                │   ├── WorkflowExecutor
                │   │   ├── WorkflowHeader (头部)
                │   │   │   ├── ProjectSelector (项目选择器)
                │   │   │   └── StepBar (步骤条)
                │   │   ├── LeftPanel (项目资源树)
                │   │   ├── CenterPanel (步骤面板)
                │   │   │   ├── ChapterSplitPanel (章节拆分)
                │   │   │   ├── SceneCharacterPanel (场景角色)
                │   │   │   ├── StoryboardPanel (分镜脚本)
                │   │   │   ├── VoiceoverPanel (配音生成)
                │   │   │   └── ExportPanel (导出管理)
                │   │   └── RightSettingsPanel (属性面板)
                │   ├── Settings
                │   │   ├── SettingsSidebar (设置侧边栏)
                │   │   ├── GlobalSettings (全局设置)
                │   │   ├── ModelSelector (模型选择器)
                │   │   └── ProviderConfigCard (Provider 配置卡片)
                │   ├── About
                │   │   └── ThemeShowcase (主题展示)
                │   └── UIDemo
                │       └── shadcn/ui 组件演示
                └── StatusBar (状态栏)
                    └── LogViewer (日志查看器)

ProgressOrb (全局浮动，不在 Layout 内)
```

---

### 4.5 状态管理

**策略**：使用 Context API + React Hooks，**无 Redux/Zustand**

**全局 Context**：
1. `ThemeProvider` - 主题管理（明暗主题切换）
2. `SidebarProvider` - 侧边栏状态管理

**本地状态管理**：
- `useState` - 组件内部状态
- `useEffect` - 副作用处理
- `useCallback` - 回调函数优化
- `useMemo` - 计算值缓存

**示例**（WorkflowExecutor）：
```typescript
const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
const [currentProjectId, setCurrentProjectId] = useState<string>('');
const [projects, setProjects] = useState([]);
const [tasks, setTasks] = useState([]);
```

---

## 五、类型系统架构

### 5.1 类型文件分布

**核心类型目录**：`src/shared/types/`
**全局类型文件**：`src/common/types.ts`
**总类型数量**：80+ 接口/类型/枚举

| 类型文件 | 主要内容 | 导出数量 |
|---------|---------|---------|
| `asset.ts` | 资产管理类型 | 13 个 |
| `api.ts` | API Provider 配置 | 12 个 |
| `workflow.ts` | 工作流系统 | 6 个 |
| `plugin-panel.ts` | 插件面板协议 | 10 个 |
| `plugin-view.ts` | 插件视图协议 | 11 个 |
| `plugin-market.ts` | 插件市场 | 3 个 |
| `schema.ts` | Schema 注册系统 | 6 个 |
| `novel-video.ts` | 小说转视频专用 | 6 个 |
| `common/types.ts` | 全局类型定义 | 30+ 个 |

---

### 5.2 核心接口清单

**项目相关**：
- `ProjectConfig` - 项目配置
- `ProjectSettings` - 项目设置
- `ProjectStatus` - 项目状态枚举

**资产相关**：
- `AssetMetadata` - 资产元数据（⚠️ 存在命名冲突）
- `AssetConfig` - 资产配置（⚠️ 存在命名冲突）
- `AssetFilter` - 资产过滤器
- `AssetScanResult` - 扫描结果
- `AssetIndex` - 资产索引

**工作流相关**：
- `WorkflowDefinition` - 工作流定义
- `WorkflowInstance` - 工作流实例
- `WorkflowState` - 工作流状态
- `WorkflowStep` - 工作流步骤

**插件相关**：
- `PluginManifest` - 插件清单
- `PluginInfo` - 插件信息
- `PluginPanelConfig` - 插件面板配置
- `ViewRegistration` - 视图注册

**API 相关**：
- `APIProviderConfig` - API Provider 配置
- `ModelDefinition` - 模型定义
- `APICallParams` - API 调用参数
- `APICallResult` - API 调用结果

---

### 5.3 枚举类型清单

| 枚举名称 | 值 | 用途 |
|---------|---|------|
| `AssetType` | image, video, audio, text, other | 资产类型 |
| `AssetScope` | global, project | 资产作用域 |
| `ResourceStatus` | none, generating, success, failed | 资源生成状态 |
| `AspectRatio` | 3:4, 4:3, 16:9, 9:16, custom | 宽高比 |
| `WorkflowStepStatus` | pending, in_progress, completed, error | 步骤状态 |
| `ProjectStatus` | in-progress, completed, archived | 项目状态 |
| `TaskStatus` | pending, running, completed, failed, cancelled | 任务状态 |
| `PluginType` | workflow-integration, asset-handler, api-provider, ui-extension, utility | 插件类型 |
| `APICategory` | image-generation, video-generation, audio-generation, llm, workflow, tts, stt, embedding, translation | API 功能分类 |
| `AuthType` | bearer, apikey, basic, none | 认证类型 |
| `FieldType` | text, textarea, number, select, multiselect, checkbox, radio, file, date, slider, color | 面板字段类型 |
| `ShortcutType` | workflow, plugin | 快捷方式类型 |

---

## 六、文件组织结构

### 6.1 项目根目录结构

```
E:\Projects\Matrix\
├── config/                      # Webpack 配置
│   ├── webpack.main.config.js   # 主进程配置
│   ├── webpack.renderer.config.js # 渲染进程配置
│   └── webpack.preload.config.js  # 预加载脚本配置
├── src/                         # 源代码
│   ├── main/                    # 主进程
│   ├── renderer/                # 渲染进程
│   ├── preload/                 # 预加载脚本
│   ├── shared/                  # 共享类型
│   └── common/                  # 全局类型
├── build/                       # 编译输出
│   ├── main/
│   ├── renderer/
│   └── preload/
├── dist/                        # 打包输出
├── tests/                       # 测试文件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # E2E 测试
├── docs/                        # 文档
│   ├── audit/                   # 审计文档（本次生成）
│   ├── ref/                     # 参考文档和归档
│   └── *.md                     # 架构文档
├── plugins/                     # 插件目录
│   ├── official/                # 官方插件
│   │   └── novel-to-video/      # 小说转视频插件
│   ├── partner/                 # 合作插件
│   └── community/               # 社区插件
├── resources/                   # 应用资源
│   └── images/                  # 图标、Logo
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── vitest.config.ts             # Vitest 测试配置
└── README.md                    # 项目说明
```

---

### 6.2 主进程目录结构

```
src/main/
├── index.ts                     # 主进程入口（服务初始化、IPC 注册）
├── services/                    # 服务层（17 个服务）
│   ├── ProjectManager.ts
│   ├── AssetManager.ts
│   ├── WorkflowRegistry.ts
│   ├── WorkflowStateManager.ts
│   ├── PluginManager.ts
│   ├── PluginMarketService.ts
│   ├── TaskScheduler.ts
│   ├── APIManager.ts
│   ├── ModelRegistry.ts
│   ├── SchemaRegistry.ts
│   ├── GenericAssetHelper.ts
│   ├── TimeService.ts
│   ├── Logger.ts
│   ├── ServiceErrorHandler.ts
│   ├── FileSystemService.ts
│   ├── ConfigManager.ts
│   └── ShortcutManager.ts
├── ipc/                         # IPC 处理器
│   ├── channels.ts              # 通道定义（85 个常量）
│   └── workflow-handlers.ts     # 工作流专用处理器
├── workflows/                   # 工作流定义
│   ├── test-workflow.ts
│   └── novel-to-video-definition.ts (已废弃)
├── models/                      # 数据模型（简化版，⚠️ 存在冲突）
│   └── project.ts
├── utils/                       # 工具函数
│   ├── workflowValidator.ts     # 工作流验证
│   └── apiKeyEncryption.ts      # API 密钥加密
└── agent/                       # LangChain Agent
    ├── BaseAgent.ts
    ├── ChapterAgent.ts
    ├── SceneAgent.ts
    └── types.ts
```

---

### 6.3 渲染进程目录结构

```
src/renderer/
├── index.tsx                    # 渲染进程入口
├── App.tsx                      # 应用根组件（路由配置）
├── pages/                       # 页面组件（9 个核心页面）
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   └── Dashboard.css
│   ├── assets/
│   │   ├── Assets.tsx
│   │   └── Assets.css
│   ├── plugins/
│   │   ├── Plugins.tsx
│   │   └── Plugins.css
│   ├── workflows/
│   │   ├── Workflows.tsx
│   │   ├── WorkflowEditor.tsx
│   │   ├── WorkflowExecutor.tsx
│   │   └── panels/              # 工作流步骤面板
│   │       ├── ChapterSplitPanel.tsx
│   │       ├── SceneCharacterPanel.tsx
│   │       ├── StoryboardPanel.tsx
│   │       ├── VoiceoverPanel.tsx
│   │       └── ExportPanel.tsx
│   ├── settings/
│   │   ├── Settings.tsx
│   │   └── Settings.css
│   ├── about/
│   │   ├── About.tsx
│   │   └── ThemeShowcase.tsx
│   └── demo/
│       └── UIDemo.tsx
├── components/                  # UI 组件
│   ├── common/                  # 公共业务组件
│   │   ├── Layout.tsx
│   │   ├── WindowBar.tsx
│   │   ├── GlobalNav.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Loading.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ProgressOrb.tsx
│   │   ├── TaskQueueSheet.tsx
│   │   ├── Collapsible.tsx
│   │   ├── ViewSwitcher.tsx
│   │   ├── ListView.tsx
│   │   └── ShortcutNavItem.tsx
│   ├── ui/                      # shadcn/ui 组件（12 个）
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── checkbox.tsx
│   │   ├── switch.tsx
│   │   ├── badge.tsx
│   │   ├── alert.tsx
│   │   ├── separator.tsx
│   │   ├── tabs.tsx
│   │   ├── sheet.tsx
│   │   └── select.tsx
│   ├── workflow/                # 工作流组件
│   │   ├── WorkflowHeader.tsx
│   │   ├── RightSettingsPanel.tsx
│   │   ├── WorkflowListItem.tsx
│   │   ├── ProjectSelectorDialog.tsx
│   │   └── nodes/               # ReactFlow 节点
│   │       ├── InputNode.tsx
│   │       ├── ExecuteNode.tsx
│   │       └── OutputNode.tsx
│   ├── layout/                  # 布局组件
│   │   ├── StatusBar.tsx
│   │   └── LogViewer.tsx
│   ├── AssetGrid/               # 资产网格
│   │   ├── AssetGrid.tsx
│   │   └── AssetGridVirtualized.tsx
│   ├── AssetCard/               # 资产卡片
│   │   └── AssetCard.tsx
│   ├── AssetPreview/            # 资产预览
│   │   └── AssetPreview.tsx
│   └── AssetSidebar/            # 资产侧边栏
│       └── AssetSidebar.tsx
├── hooks/                       # 自定义 Hooks
│   ├── use-sidebar.tsx
│   └── use-toast.ts
├── lib/                         # 工具库
│   └── utils.ts                 # 工具函数（cn 等）
└── styles/                      # 全局样式
    ├── index.css                # 全局样式入口
    └── theme.css                # 主题变量
```

---

### 6.4 共享类型目录结构

```
src/shared/types/
├── asset.ts                     # 资产管理类型（13 个导出）
├── api.ts                       # API Provider 配置（12 个导出）
├── workflow.ts                  # 工作流系统（6 个导出）
├── plugin-panel.ts              # 插件面板协议（10 个导出）
├── plugin-view.ts               # 插件视图协议（11 个导出）
├── plugin-market.ts             # 插件市场（3 个导出）
├── schema.ts                    # Schema 注册系统（6 个导出）
└── novel-video.ts               # 小说转视频专用（6 个导出）
```

---

## 七、技术栈总结

### 7.1 主进程技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 39.x | 应用框架 |
| Node.js | 20.x+ | 运行时 |
| TypeScript | 5.x | 编程语言 |
| chokidar | 4.x | 文件监听 |
| mime-types | 2.x | MIME 类型检测 |
| adm-zip | 0.5.x | ZIP 文件处理 |
| machine-id | - | 机器 ID 获取 |
| @langchain/* | 1.x | LangChain Agent |

### 7.2 渲染进程技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| React Router | 6.x | 路由管理 |
| TypeScript | 5.x | 编程语言 |
| Tailwind CSS | 3.x | CSS 框架 |
| shadcn/ui | - | UI 组件库 |
| Radix UI | - | 无样式 UI 原语 |
| Lucide React | - | 图标库 |
| Framer Motion | 11.x | 动画库 |
| ReactFlow | (@xyflow/react) | 节点图编辑器 |
| react-resizable-panels | - | 可调整大小的面板 |

### 7.3 测试和工具

| 技术 | 版本 | 用途 |
|------|------|------|
| Vitest | 2.x | 测试框架 |
| Playwright | - | E2E 测试 |
| ESLint | 9.x | 代码检查 |
| Prettier | 3.x | 代码格式化 |
| Webpack | 5.x | 构建工具 |
| ts-loader | - | TypeScript 加载器 |

---

## 八、关键文件路径索引

### 8.1 主进程核心文件

| 文件 | 路径 | 行数 | 说明 |
|------|------|------|------|
| 主进程入口 | `src/main/index.ts` | 1000+ | 服务初始化、IPC 注册（行276-824） |
| IPC 通道定义 | `src/main/ipc/channels.ts` | 200+ | 85 个通道常量 |
| 工作流处理器 | `src/main/ipc/workflow-handlers.ts` | 300+ | 工作流专用 IPC 处理器 |

### 8.2 渲染进程核心文件

| 文件 | 路径 | 行数 | 说明 |
|------|------|------|------|
| 渲染进程入口 | `src/renderer/index.tsx` | 50+ | 渲染进程入口点 |
| 应用根组件 | `src/renderer/App.tsx` | 150+ | 路由配置、全局快捷键 |
| 主布局 | `src/renderer/components/common/Layout.tsx` | 100+ | 应用主布局容器 |
| 全局导航 | `src/renderer/components/common/GlobalNav.tsx` | 400+ | 全局导航栏、快捷方式 |

### 8.3 配置文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目配置 | `package.json` | NPM 包配置、脚本命令 |
| TypeScript 配置 | `tsconfig.json` | TypeScript 编译配置、路径别名 |
| 测试配置 | `vitest.config.ts` | Vitest 测试配置 |
| 主进程 Webpack | `config/webpack.main.config.js` | 主进程构建配置 |
| 渲染进程 Webpack | `config/webpack.renderer.config.js` | 渲染进程构建配置 |
| 预加载 Webpack | `config/webpack.preload.config.js` | 预加载脚本构建配置 |

---

## 九、架构特色总结

### 9.1 优势

1. **清晰的分层架构**：主进程服务层、IPC 通信层、前端 UI 层分离明确
2. **完善的类型系统**：80+ 类型定义，TypeScript 严格模式
3. **统一的服务模式**：所有服务遵循单例模式、依赖注入
4. **标准的 IPC 通信**：105 个通道，命名规范统一
5. **组件化 UI**：shadcn/ui + 自定义业务组件，复用性强
6. **全局时间处理**：TimeService 统一时间管理，防止时间相关问题
7. **插件系统完善**：支持沙箱隔离、权限管理、ZIP 安装

### 9.2 待改进

1. **类型定义冲突**：`AssetMetadata`、`AssetConfig`、`ProjectConfig` 存在重复定义
2. **时间格式不统一**：混用 ISO 8601 字符串、Date 对象、数字时间戳
3. **状态管理分散**：前端使用本地状态，缺少全局状态管理方案
4. **缺少统一的类型导出**：`src/shared/types/` 没有 `index.ts` 统一导出文件

### 9.3 架构亮点

1. **工作流双模式**：Workflow Template（可编辑）+ Workflow Executor（插件形态）
2. **资产双作用域**：全局资产 + 项目资产，支持跨项目复用
3. **Schema 驱动**：插件可注册自定义 Schema，扩展资产元数据
4. **快捷方式系统**：支持项目/工作流/插件快捷方式，菜单栏可自定义
5. **Provider 抽象**：统一的 API Provider 管理，支持 9 大功能分类

---

## 十、统计数据汇总

| 维度 | 数量 |
|------|------|
| **主进程服务** | 17 个 |
| **IPC 通道** | 105 个 |
| **前端路由** | 11 条 |
| **核心页面** | 9 个 |
| **UI 组件** | 50+ 个 |
| **类型定义** | 80+ 个 |
| **代码总行数** | 20000+ 行（估算） |
| **测试文件** | 30+ 个 |

---

**文档结束**

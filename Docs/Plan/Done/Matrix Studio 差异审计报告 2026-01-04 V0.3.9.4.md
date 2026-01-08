# Matrix Studio 差异审计报告（细化分析）
**对比基准**: 《99-Technical Specification Matrix Studio Architecture.md》+ 《MatrixMenuFlow.jpg》
**审计日期**: 2026-01-04
**代码库版本**: v0.3.9.4
**分析重点**: 逐一核对设计意图与实现必要性

---

## 一、Matrix URI深度分析：目的、问题、必要性

### 1.1 99号文档的设计意图

**Matrix URI的声明**（第12-16行）：
> "To ensure location independence, all modules must communicate using a virtual URI scheme"

**URI规范**：
```
matrix://global/inputs/{YYYYMMDD}/{filename}      # 全局资产
matrix://project/{project_id}/outputs/{filename}  # 项目资产
file://{absolute_path}                            # 外部文件（导入后转换）
```

**设计理念**（第8-10行）：
- **File-as-Data (Decentralized)**: 文件系统即数据库
- **Portability**: "Moving a project folder must preserve all its internal logic and asset references"

### 1.2 当前实现的实际架构

**存储结构**（基于FileSystemService.ts:36）：
```
C:\Users\{username}\AppData\Roaming\Matrix\    ← Electron固定userData路径
├── assets/                                     ← 集中式资产库
│   ├── user_uploaded/                          ← 全局用户上传
│   └── project_outputs/                        ← 项目输出（按projectId分类）
│       └── {projectId}/
│           └── {YYYYMMDD}/
│               └── output.mp4
└── projects/                                   ← 项目配置
    └── {projectId}/
        ├── project.json
        ├── inputs/                             ← (可能为空)
        └── outputs/                            ← (可能为空)
```

**路径存储方式**（AssetMetadata.ts:42）：
```typescript
export interface AssetMetadata {
  filePath: string;  // ← 存储的是绝对路径
  // 例如：C:\Users\username\AppData\Roaming\Matrix\assets\project_outputs\abc123\20260104\video.mp4
}
```

### 1.3 核心矛盾：集中式 vs 分散式架构

#### 99号文档期望的架构（分散式）：
```
{自定义workspace}/
├── Global_Inputs/                              ← 全局资产池
│   └── {YYYYMMDD}/
│       └── char.png
└── {projectFolder}/                            ← 项目自包含文件夹
    ├── project.json
    ├── inputs/                                 ← 项目专属输入
    │   └── script.txt
    └── outputs/                                ← 项目专属输出
        └── scene01.mp4
```

**特点**：
- 项目文件夹可以**独立移动**（所有资产在项目内）
- project.json中引用使用`matrix://`虚拟URI
- 移动workspace后，只需更新PathResolver的basePath

#### 当前实现的架构（集中式）：
```
{固定userData}/
├── assets/                                     ← 所有资产集中存储
│   ├── user_uploaded/
│   └── project_outputs/{projectId}/
└── projects/{projectId}/                       ← 仅存配置，不含资产
```

**特点**：
- 项目配置和资产**物理分离**
- 资产路径固定在userData下
- **无法**单独移动项目文件夹（资产引用会失效）

### 1.4 场景分析：什么时候Matrix URI是必要的？

#### 🟢 场景A：单机固定工作区（当前实现完全满足）
**用户行为**：
- 在一台电脑上使用Matrix Studio
- 不更改userData位置
- 不需要分享项目

**当前实现**：
```typescript
// userData固定：C:\Users\username\AppData\Roaming\Matrix
filePath: "C:\\Users\\username\\AppData\\Roaming\\Matrix\\assets\\project_outputs\\abc\\video.mp4"
```

**是否需要Matrix URI**：❌ **不需要**
- userData路径固定不变
- 绝对路径永远有效
- 性能更好（无需URI解析）

---

#### 🔴 场景B：更改工作区位置（当前实现失败）
**用户行为**：
- 用户想把数据从C盘移到D盘（空间不足）
- 例如：`C:\Users\...\Matrix` → `D:\MatrixProjects\`

**当前实现的问题**：
1. userData由Electron控制，用户**无法**在UI中更改
2. 如果用户手动移动文件：
   ```typescript
   // metadata中的路径仍然指向旧位置
   filePath: "C:\\Users\\...\\video.mp4"  // ← 文件已不存在
   ```
3. Matrix Studio启动后找不到文件 → ❌ **失败**

**Matrix URI的解决方案**：
```typescript
// metadata中存储虚拟URI
matrixUri: "matrix://project/abc123/outputs/20260104/video.mp4"

// PathResolver根据当前workspace位置解析
PathResolver.resolve(matrixUri)
  → "D:\\MatrixProjects\\projects\\abc123\\outputs\\20260104\\video.mp4"
```

**是否需要Matrix URI**：✅ **必须** （如果要支持此功能）

---

#### 🔴 场景C：多人协作/跨机器同步（当前实现失败）
**用户行为**：
- 用户在公司电脑创建项目
- 通过云盘同步到家里电脑继续工作

**问题**：
```
# 公司电脑
userData: C:\Users\work\AppData\Roaming\Matrix
filePath: C:\Users\work\AppData\...\video.mp4

# 家里电脑
userData: C:\Users\home\AppData\Roaming\Matrix
filePath: C:\Users\work\AppData\...\video.mp4  ← 路径不存在！
```

**是否需要Matrix URI**：✅ **必须** （如果要支持此功能）

---

#### 🔴 场景D：项目打包分享（当前实现失败）
**用户行为**：
- 用户想把项目文件夹打包发给同事
- 同事解压后应该能直接使用

**99号文档的期望**（第10行）：
> "Moving a project folder must preserve all its internal logic"

**当前实现的问题**：
```
# 用户打包的内容
projects/abc123/
├── project.json          ← 包含绝对路径引用
├── inputs/               ← 可能为空
└── outputs/              ← 可能为空（实际文件在assets/目录）

# 同事解压后
- project.json中的filePath指向发送者的路径
- 资产文件不在项目文件夹内 → ❌ 无法使用
```

**Matrix URI的解决方案**：
```
# 项目文件夹自包含
projects/abc123/
├── project.json          ← matrixUri: "matrix://project/abc123/outputs/..."
├── inputs/
└── outputs/
    └── video.mp4         ← 实际文件

# 同事解压后
PathResolver.resolve("matrix://project/abc123/outputs/video.mp4")
  → "{解压路径}/projects/abc123/outputs/video.mp4"  ✅ 正常工作
```

**是否需要Matrix URI**：✅ **必须** （如果要支持此功能）

---

### 1.5 关键结论：Matrix URI = 架构转型的前提

**Matrix URI不是简单的路径虚拟化，而是以下架构变革的基础**：

| 需求 | 当前集中式架构 | 99号分散式架构 | 是否必须Matrix URI |
|-----|--------------|--------------|------------------|
| 单机固定工作区 | ✅ 完美支持 | ✅ 支持 | ❌ 不需要 |
| 更改工作区位置 | ❌ 不支持 | ✅ 支持 | ✅ **必须** |
| 跨机器协作 | ❌ 不支持 | ✅ 支持 | ✅ **必须** |
| 项目打包分享 | ❌ 不支持 | ✅ 支持 | ✅ **必须** |
| 全局资产复用 | ✅ 完美支持 | ✅ 支持 | 🟡 可选（简化引用） |

**核心问题**：当前实现与99号文档的基本架构理念**不兼容**！

### 1.6 实施Matrix URI的前置条件

如果要实施Matrix URI，必须先完成**架构重构**：

#### 步骤1：更改存储结构（破坏性变更）
```
当前：
{userData}/
├── assets/               ← 集中存储
└── projects/{id}/        ← 仅配置

目标：
{workspace}/              ← 用户可自定义
├── Global_Inputs/        ← 全局资产池
└── projects/{id}/        ← 项目自包含
    ├── inputs/
    └── outputs/
```

#### 步骤2：数据迁移
- 将现有`assets/project_outputs/{id}/`移动到`projects/{id}/outputs/`
- 更新所有metadata中的路径为matrixUri

#### 步骤3：实现PathResolver
```typescript
class PathResolver {
  constructor(private workspaceRoot: string) {}

  resolve(uri: string): string {
    // matrix://project/abc/outputs/file.mp4
    // → {workspaceRoot}/projects/abc/outputs/file.mp4
  }
}
```

**工作量估算**：2-3周（重大重构）

---

## 二、讨论议题与决策记录

### 议题1：Matrix URI虚拟路径系统

**99号文档定义**：
- `matrix://global/inputs/{YYYYMMDD}/{filename}`
- `matrix://project/{project_id}/outputs/{filename}`
- 目的：位置独立性，项目可移植

**讨论分析**：
- 当前实现：集中式架构（所有资产在userData/assets/）
- 99号期望：分散式架构（资产随项目文件夹分布）
- 场景对比：
  - 单机固定工作区：当前架构完全满足，不需要Matrix URI
  - 工作区迁移/跨机器协作/项目打包：必须Matrix URI + 架构重构（2-3周）

**决策**：
- ❌ **暂不实施Matrix URI**
- 理由：当前集中式架构满足MVP需求，虚拟化需要破坏性重构
- 未来：产品成熟后再考虑架构升级

---

### 议题2：A4模块定义纠正

**原99号文档定义**：
- A4模块名称：Workbench（执行编排器）
- 职责：插件与Provider的中介者

**讨论澄清**：
- A4应为UI模块：**Workbench**（ReactFlow节点编辑器）
- 执行编排职责应整合进**A3: PluginManager**

**决策**：
- ✅ A4 = Workbench（节点编辑器UI，用户工作空间）
- ✅ A3 = PluginManager（整合：加载、编排、Pre-flight Check、任务追踪）
- ✅ 避免创建独立的PluginScheduler服务

---

### 议题3：插件配置注入机制

**设计流程**：
```
用户通过菜单快捷方式 → 创建项目

系统自动执行：
1. 读取插件default-config.json
2. 提取providers → 添加到全局Provider列表（去重）
3. 提取文件夹结构定义 → 创建物理目录
4. 写入project.json：
   - pluginId
   - selectedProviders（引用全局Provider ID）
   - folders（文件夹路径映射）
   - prompts、params等
```

**关键决策**：

**Provider管理**：
- 全局统一管理（不是项目级）
- 命名规范：`[插件名]LLM-Deepseek`
- 重复策略：自动去重跳过
- 删除策略：Provider删除不影响项目文件（仅执行时检查）

**配置注入时机**：
- ✅ 时机B：用户添加插件到项目时（不是首次运行时）
- UI处理：后台自动执行（高阶用户），缺少配置时弹窗（新手）

**项目-插件关系**：
- 一个项目对应一个插件（暂不考虑多插件）
- 插件 = 配置模板 + 执行代码
- 项目 = 配置实例 + 资产文件

**文件夹结构**：
- 插件定义folders（如["scene", "output", "audio"]）
- 必须持久化到project.json（否则找不到中间产物）

---

### 议题4：Pre-flight Check全局健康监控

**99号文档定义**：
- 执行前验证Provider可用性

**讨论扩展**：
- ✅ **全局Provider健康监控系统**，不仅仅是执行前验证

**完整机制**：
```
Provider状态机：
1. 用户添加配置 → API Key, URL, Model
2. 手动测试按钮 → 触发Pre-flight Check
3. 测试通过 → 验证灯亮起（绿色）
4. 软件启动时 → 批量检查所有已启用Provider
5. 不通过 → 灯灭，自动关闭启用开关

亮灯逻辑 = 激活开关 ON + 测试通过
```

**关键决策**：

**检查时机**：
- 软件启动时一次性检查（无需定期后台检查）

**验证分级**：
- 厂商API：基础验证（测试请求验证API Key）
- 本地服务：快速验证（连通性检查）
- 具体策略：实施时细化

**状态持久化**：
- Provider列表 + 激活状态存储
- 亮灯状态不存储（启动时重新计算）

**UI影响**：
- 已有手动测试按钮和激活开关
- 项目执行时：只显示"亮灯"Provider供选择
- 配置失效：执行按钮灰色/弹窗提示重新选择

---

### 议题5：并发安全与任务追踪

**99号文档要求**：
- WAL或队列保护project.json并发写入

**讨论澄清**：
- 并发安全不是核心问题
- **任务状态追踪和失败补救才是关键**

**并发安全决策**：
- ✅ 队列方案（简单够用）
- ❌ WAL（过度设计）
- 实现：每个项目维护更新队列，串行化写入

**任务追踪决策**：

**存储位置**：
```
log/Task/{YYYYMMDD}/
├── task-uuid-001.json
├── task-uuid-002.json
└── ...
```

**任务状态文件结构**：
```json
{
  "taskId": "uuid-001",
  "projectId": "project-abc",
  "pluginId": "novel-to-video",
  "providerId": "openai",
  "status": "failed",  // pending/processing/completed/failed
  "createdAt": "2026-01-04T10:00:00Z",
  "updatedAt": "2026-01-04T10:05:00Z",
  "error": {
    "code": "rate_limit",
    "message": "API限流，请稍后重试"
  },
  "retryCount": 0
}
```

**异步Provider适配**：
- 支持轮询 + webhook双模式
- 根据厂商特性自适应选择

**UI展示**：
- 浮动球队列页（已有）
- 右下角小铃铛日志（已有）
- 无需额外任务管理界面

**任务依赖和串行并行**：
- 由插件定义控制（插件专用工作页面）
- 不属于系统层面职责

---

### 议题6：原子性保证

**99号文档要求**：
- 文件写入后才更新索引
- Cleanup on Failure

**决策**：
- ✅ **部分必要，不需要数据库级事务**

**实现方案**：
```typescript
临时目录策略：
1. 生成过程使用temp/
2. 成功后移动到正式目录
3. 更新project.json索引

失败清理：
catch异常 → 删除临时文件
```

**必要性理由**：
- 防止重复消耗API配额
- 防止磁盘空间泄漏
- 用户体验（清晰的成功/失败状态）

---

### 议题7：Sidecar元数据（AI参数存储）

**99号文档提及**：
- .meta.json存储AI生成参数

**讨论分析**：
- 无法标准化（每个Provider参数格式不同）
- 功能重叠（project.json、log/Task/已有参数）
- 脆弱性（文件移动/重命名导致配对断裂）
- 低频需求（用户很少需要复现单张图）

**决策**：
- ❌ **完全不需要Sidecar元数据**
- 删除.meta.json相关实现
- 不记录生成参数（更简洁）

---

### 议题8：Provider架构整合

**当前状态**：
- ProviderRegistry：注册查询
- APIManager：配置管理
- ProviderRouter：请求路由
- 职责分散

**决策**：
- ✅ **Facade模式：统一对外接口 + 内部职责分离**

**整合方案**：
```typescript
// 内部职责分离
ProviderRegistry: 注册管理
ProviderConfigManager: 配置管理（含Pre-flight Check）
ProviderRouter: 请求路由

// 统一门面
ProviderHub {
  execute(request)
  healthCheck(providerId)
  listAvailable(operationType)
}
```

**类比PluginManager模式**：
- 内部分离 → 单一职责、可测试
- 对外统一 → 简化调用

---

### 议题9：架构解耦规则验证

**99号文档要求**：
- "PluginSystem MUST NOT import ProviderHub"

**验证结果**：
- ✅ 当前代码遵守
- PluginManager没有直接导入APIManager/ProviderRegistry
- 通过PluginScheduler中介者调用ProviderHub

---

## 三、最终决策总结

| 差异项 | 99号原定义 | 决策结果 | 优先级 |
|-------|-----------|---------|--------|
| Matrix URI | 虚拟路径系统 | ❌ 暂不实施 | P3 延后 |
| A4模块定义 | Workbench（执行编排器） | ✅ 改为UI模块（节点编辑器） | P0 修正 |
| 执行编排职责 | 独立A4服务 | ✅ 整合进A3 PluginManager | P0 修正 |
| 配置注入机制 | 未详述 | ✅ A3负责：插件→项目自动化 | P0 必须 |
| Pre-flight Check | 执行前验证 | ✅ A3负责：全局健康监控 | P0 必须 |
| 并发安全 | WAL/队列 | ✅ A1队列方案 | P1 重要 |
| 任务追踪 | 未提及 | ✅ A3负责：log/Task/存储 | P0 必须 |
| 原子性保证 | 事务机制 | ✅ A3负责：临时目录+清理 | P1 重要 |
| Sidecar元数据 | AI参数存储 | ❌ 不需要 | P3 删除 |
| Provider整合 | ProviderHub | ✅ A5 Facade模式 | P1 重构 |
| workflow术语 | 混用导致歧义 | ✅ 改用Flow/执行流程 | P2 规范 |

---

## 四、需要修正的99号文档内容

### 修正1：A4模块重新定义
```
原定义：A4: Workbench (执行编排器/后端服务)
修正为：A4: Workbench (节点编辑器/UI模块)
```

### 修正2：A3职责扩展
```
原职责：
1. 插件加载/卸载
2. Manifest解析

扩展职责：
3. Configuration Injection (插件配置注入)
4. Pre-flight Check (Provider健康监控)
5. Execution Orchestration (执行编排)
6. Task Tracking (任务状态追踪)
7. Atomic Transaction (原子性保证)
8. Async Provider Adaptation (异步Provider适配)
```

### 修正3：Pre-flight Check定义
```
当前：执行前验证
修正：全局Provider健康监控系统
- 软件启动时批量检查
- 手动测试触发
- 状态灯机制
```

### 修正4：删除不实施内容
```
删除：
- Matrix URI详细设计（标注为Future Enhancement）
- Sidecar元数据相关描述
```

### 修正5：新增Task Tracking章节
```
新增：
- log/Task/目录结构
- 任务状态Schema
- 异步Provider适配机制
```

### 修正6：Provider架构说明
```
修正：
A5: ProviderHub (Facade)
  - ProviderRegistry (内部)
  - ProviderConfigManager (内部)
  - ProviderRouter (内部)
```

### 修正7：术语规范化
```
删除/替换：
- Workflow → Flow / Execution Pipeline / Node Graph
- WorkflowEditor → Workbench / Node Editor
- WorkflowStateManager → ExecutionStateManager

保留清晰术语：
- Plugin Execution Flow
- Node Editor Graph
```

### 6.2 实施计划

**P0 - 核心修正（1-2周）**：
1. A3 PluginManager扩展
   - 新增配置注入逻辑
   - 新增Pre-flight Check健康监控
   - 新增任务追踪（log/Task/）
   - 新增原子性保证（temp目录+清理）

2. A1 ProjectManager并发安全
   - 实现per-project更新队列

3. 术语规范化
   - 代码中workflow → 明确术语
   - UI组件重命名

**P1 - 架构优化（2-3周）**：
4. A5 ProviderHub整合
   - 创建ProviderHub门面类
   - 整合现有3个服务

5. A2 AssetManager简化
   - 删除.meta.json sidecar逻辑

**P2 - 文档完善（1周）**：
6. 更新代码注释和类型定义
7. 更新开发文档
8. 更新测试用例

**Future - 扩展功能**：
9. A4 Workbench插件打包功能
10. Matrix URI虚拟路径系统
11. 在线功能（插件分发/社交）

---

## 七、修正后的99号技术规范文档

```markdown
This is the **Technical Specification Document** for **Matrix Studio**, optimized for AI coding assistants. It uses precise engineering terminology to ensure maximum code accuracy and architectural integrity.

---

# Technical Specification: Matrix Studio Architecture

## 1. Core Philosophy & Data Model
*   **Paradigm:** File-as-Data (Centralized for MVP).
*   **Storage Strategy:** No central database. Filesystem as "Single Source of Truth." Logic maintained via local JSON indices.
*   **Centralized Assets:** All assets stored in `{userData}/assets/` for MVP phase. Project folders contain configuration only.

### 1.1 Matrix URI Scheme (Future Enhancement)
**Status:** Deferred to post-MVP phase.
*   **Rationale:** Current centralized architecture meets single-machine use cases. Virtual URI scheme requires decentralized architecture refactoring (2-3 weeks).
*   **Future Scope:** Enable project portability, cross-machine collaboration, and workspace migration.

---

## 2. Module Definitions

### A1: Project Manager (`ProjectManager`)
**Definition:** Governs the lifecycle of individual project containers.
*   **Responsibilities:**
    *   **Scaffolding:** Initialize standard directories.
    *   **Index Maintenance:** Manage `project.json` with sequential queue for concurrency safety.
    *   **Configuration Storage:** Store plugin configurations, provider selections, and folder mappings.
*   **Data Schema (`project.json`):**
    ```json
    {
      "project_id": "uuid",
      "name": "string",
      "pluginId": "string",
      "selectedProviders": {
        "llm": "provider-id",
        "image": "provider-id"
      },
      "folders": {
        "scene": "./scene",
        "output": "./output"
      },
      "params": {},
      "prompts": {}
    }
    ```

### A2: Asset Manager (`AssetManager`)
**Definition:** Cross-project asset indexing and lifecycle management.
*   **Responsibilities:**
    *   **Centralized Storage:** Manage `{userData}/assets/user_uploaded/` and `{userData}/assets/project_outputs/{projectId}/`.
    *   **Indexing:** Build in-memory search tree from file system.
    *   **Metadata:** Basic file metadata only (no sidecar AI parameters).

### A3: Plugin Manager (`PluginManager`)
**Definition:** Plugin lifecycle management, execution orchestration, and health monitoring.
*   **Responsibilities:**
    *   **Loading:** Load plugin from `plugins/{official|partner|community}/{pluginId}/`.
    *   **Manifest Parsing:** Read `manifest.json` and `default-config.json`.
    *   **Configuration Injection:** Extract plugin `default-config.json` → inject into global Providers + `project.json`.
    *   **Pre-flight Check:** Validate Provider health and availability (global monitoring system).
    *   **Execution Orchestration:** Coordinate plugin execution with ProviderHub (A5).
    *   **Task Tracking:** Log execution state to `log/Task/{YYYYMMDD}/task-{uuid}.json`.
    *   **Atomic Transaction:** Use temp directory + cleanup on failure.
*   **Health Monitoring:**
    *   **Trigger:** Application startup + manual test button.
    *   **Status Light Logic:** `enabled AND health_check_passed`.
    *   **Stratified Validation:** API vendors (test request), local services (connectivity check).

### A4: Workbench (`Workbench`)
**Definition:** Visual node editor for testing and configuring Provider execution pipelines.
*   **Implementation:** React-based node editor using ReactFlow library.
*   **Responsibilities:**
    *   **Node Composition:** Drag-and-drop interface for building execution graphs.
    *   **Provider Testing:** Direct Provider invocation for experimentation.
    *   **Asset Integration:** Access A2 (AssetManager) for input/output resources.
    *   **Export to Plugin:** (Future) Package node graph as reusable plugin template.
*   **Note:** This is a UI module for user workspace, not a backend service.

### A5: Provider Hub (`ProviderHub`)
**Definition:** Unified facade for Provider management (Adapter + Registry + Config).
*   **Internal Components:**
    *   `ProviderRegistry`: Registration and querying.
    *   `ProviderConfigManager`: Configuration and health checks.
    *   `ProviderRouter`: Request routing.
*   **External Interface:**
    *   `execute(request)`: Execute Provider call.
    *   `healthCheck(providerId)`: Validate Provider availability.
    *   `listAvailable(operationType)`: Query compatible Providers.

---

## 3. System Workflows

### Flow I: Plugin Configuration Injection
1.  User creates project via menu shortcut (e.g., "Novel-to-Video").
2.  **A3** reads plugin `default-config.json`.
3.  **A3** extracts `providers` → adds to global Provider list (skip duplicates).
4.  **A3** extracts `folders` → creates physical directories.
5.  **A3** writes to `project.json`: `pluginId`, `selectedProviders`, `folders`, `params`, `prompts`.
6.  Project ready for execution.

### Flow II: Plugin Execution
1.  User triggers execution.
2.  **A3.Pre-flight Check:** Verify `selectedProviders` in `project.json` are healthy.
    *   If failed: Gray out execute button / show provider selection dialog.
3.  **A3** loads plugin code.
4.  **A3** creates temp directory for outputs.
5.  **A3** routes request to **A5.ProviderHub**.
6.  **A5** executes via selected Providers.
7.  **A3** moves temp files to project output directory (atomic).
8.  **A3** updates `project.json` index.
9.  **A3** writes task log to `log/Task/{date}/task-{uuid}.json`.

### Flow III: Provider Health Monitoring
1.  Application startup → **A3** batch checks all enabled Providers.
2.  For each Provider:
    *   API vendors: Send test request, validate API key.
    *   Local services: Check connectivity (ping).
3.  Update status light: `enabled AND check_passed` → green light.
4.  Failed Providers → red light, disable automatically.
5.  UI displays only green-light Providers in selection dropdowns.

---

## 4. Task Tracking System

### Storage Structure
```
log/Task/{YYYYMMDD}/
├── task-{uuid-001}.json
├── task-{uuid-002}.json
└── ...
```

### Task State Schema
```json
{
  "taskId": "uuid",
  "projectId": "project-id",
  "pluginId": "plugin-id",
  "providerId": "provider-id",
  "status": "pending|processing|completed|failed",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "error": {
    "code": "string",
    "message": "string"
  },
  "retryCount": 0
}
```

### Async Provider Adaptation
*   Support both polling and webhook modes.
*   Adapter auto-selects based on Provider capabilities.

---

## 5. Coordination & Constraints

*   **Concurrency:** Use sequential queue for `project.json` updates (per-project queue).
*   **Decoupling Rule:** `PluginManager` manages execution orchestration. Direct Provider calls go through `ProviderHub` facade.
*   **Path Management:** Centralized storage in `{userData}/assets/`. Relative paths in `project.json`.
*   **Atomic Execution:** Use temp directory → move on success → cleanup on failure.
*   **No Sidecar Metadata:** Do not store AI generation parameters (removed for simplicity).

---

## 6. Implementation Priorities

1.  **Phase 1:** Enhance `PluginManager` (A3) with configuration injection and orchestration logic.
2.  **Phase 2:** Implement Pre-flight Check health monitoring system in A3.
3.  **Phase 3:** Implement Task Tracking (`log/Task/` storage) in A3.
4.  **Phase 4:** Refactor Provider architecture into `ProviderHub` facade.
5.  **Phase 5:** Add concurrency queue to `ProjectManager`.
6.  **Future:** Implement Workbench (A4) plugin export/packaging feature.
```

---

## 六、最终模块映射与实施计划

### 6.1 模块对照表

| 模块编号 | 99号定义 | 现有实现 | 文件路径 | 差异等级 | 修正建议 |
|:--------|:--------|:--------|:---------|:--------|:--------|
| **A1** | ProjectManager | ProjectManager | src/main/services/ProjectManager.ts | 🟢 符合 | 新增并发队列 |
| **A2** | AssetManager | AssetManager | src/main/services/AssetManager.ts | 🟢 符合 | 删除Sidecar逻辑 |
| **A3** | PluginManager | PluginManager | src/main/services/PluginManager.ts | 🟡 扩展 | 新增7项职责 |
| **A4** | Workbench (UI) | WorkflowEditor | src/renderer/pages/workflows/WorkflowEditor.tsx | 🟡 重命名 | 术语规范化 |
| **A5** | ProviderHub | ProviderRegistry + APIManager + ProviderRouter | src/main/services/{3文件} | 🟡 整合 | Facade模式 |
| **PathResolver** | **不存在** | 无 | 🔴 **缺失** | 关键工具缺失 | **新增PathResolver工具类** |

---

## 二、三维差异详解

### 2.1 语义层差异（Semantic）

#### 命名不一致清单

| 概念 | 99号规范 | 现有代码 | 功能重合度 | 处理建议 |
|-----|---------|---------|----------|---------|
| 资产库 | AssetLibrary | AssetManager | 90% | 保留AssetManager，添加AssetLibrary类型别名 |
| 供应商中心 | ProviderHub | ProviderRegistry + APIManager | 75% | 创建ProviderHub门面类整合 |
| 执行编排器 | Workbench | WorkflowExecutor (职责不符) | 30% | 新增WorkflowOrchestrator |
| 能力需求 | Capability Requirements | requiredProviders (未验证) | 50% | 实现验证逻辑 |

**代码证据**:
```typescript
// src/main/services/AssetManager.ts:1
export class AssetManager {
  // 功能完全符合AssetLibrary定义，仅名称不同
}

// 应添加别名：
export { AssetManager as AssetLibrary };
```

---

### 2.2 结构层差异（Structural）

#### ⚠️ 关键架构违规：缺少中介者模式

**99号规范要求**:
```
Plugin → Workbench → Provider
         ↑
    (Pre-flight Check, Context Injection, Request Routing)
```

**现有实现**:
```
Plugin → PluginManager.executePlugin() → Plugin.execute()
         ↓ (直接执行，无检查)
```

**违规证据** (src/main/services/PluginManager.ts:325-370):
```typescript
public async executePlugin(pluginId: string, action: string, params: unknown): Promise<unknown> {
  const loaded = this.loadedPlugins.get(pluginId);
  // ❌ 无能力验证
  // ❌ 无Provider可用性检查
  // ❌ 无路径虚拟化
  const result = await loaded.instance.execute(action, params);
  return result;
}
```

**正确实现应为**:
```typescript
// 应调用Workbench
const result = await workbench.orchestrateExecution({
  pluginId,
  action,
  params,
  preflightCheck: true,  // 验证Provider能力
  pathResolution: true,  // Matrix URI → OS Path
  atomicTransaction: true // 原子性保证
});
```

#### 模块依赖检查

**解耦规则验证**:
> "PluginSystem MUST NOT import ProviderHub"

✅ **通过检查**:
```bash
# src/main/services/PluginManager.ts 导入分析
import { Logger } from './Logger';
import { ServiceErrorHandler } from './ServiceErrorHandler';
# ✅ 未导入APIManager或ProviderRegistry
```

❌ **但缺少中介者导致的问题**:
- Plugin直接执行，Provider调用被绕过
- 无统一的Request Routing机制
- 缺少Pre-flight Check

---

### 2.3 功能层差异（Functional）

#### 🔴 关键缺失 #1: Matrix URI虚拟路径系统

**99号规范**:
```
matrix://global/inputs/{YYYYMMDD}/{filename}
matrix://project/{project_id}/outputs/{filename}
file://{absolute_path} → 转换为matrix://
```

**现有代码** (src/main/services/AssetManager.ts:738-745):
```typescript
// ❌ 使用绝对路径，违反虚拟化原则
const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '');
targetDir = path.join(
  this.fsService.getDataDir(),  // C:\Users\...\Matrix\data
  'assets',
  'project_outputs',
  projectId,
  dateFolder
);
```

**影响**:
- ❌ 项目文件夹无法移动（路径硬编码）
- ❌ 无法实现跨项目资产引用
- ❌ 外部文件导入后无虚拟化

**证据文件**:
- src/main/services/AssetManager.ts (全文使用绝对路径)
- src/shared/types/asset.ts:15 (`filePath: string` 应为 `matrixUri: string`)

---

#### 🔴 关键缺失 #2: Pre-flight Check能力验证

**99号Workflow II要求**:
```
Step 2: A4.Pre-flight Check
- 验证: ProviderHub是否有active providers满足Plugin需求？
- 示例: Plugin需要 "text-gen: high-reasoning"
       → 检查是否有GPT-4或Claude-3配置
```

**插件声明存在但未被验证**:
```json
// plugins/official/novel-to-video/manifest.json:24-45
{
  "requiredProviders": [
    {
      "category": "llm",
      "purpose": "章节拆分和场景提取",
      "required": true
    },
    {
      "category": "image-generation",
      "purpose": "场景图片生成",
      "required": true
    }
  ]
}
```

**但PluginManager完全忽略**:
```typescript
// src/main/services/PluginManager.ts:205-293
async loadPlugin(pluginId: string): Promise<void> {
  const manifest = await this.loadManifest(manifestPath);
  // manifest.requiredProviders ← 读取但未验证
  this.loadedPlugins.set(pluginId, { manifest, instance, ... });
  // ❌ 无任何能力检查
}
```

**结果**: 用户执行插件时可能因Provider未配置而崩溃

---

#### 🔴 关键缺失 #3: 并发安全（WAL/队列）

**99号约束**:
> "Use Write-Ahead-Lock (WAL) or Sequential Queue for project.json updates"

**现有代码** (src/main/services/ProjectManager.ts:671-673):
```typescript
private async saveProjectConfig(config: ProjectConfig): Promise<void> {
  const configPath = path.join(config.path, 'project.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  // ❌ 无锁
  // ❌ 无队列
  // ❌ 批量操作时可能数据竞争
}
```

**风险场景**:
1. 用户批量生成10个视频
2. 10个任务同时调用 `updateProjectConfig()`
3. 最后一次写入覆盖前9次 → 数据丢失

---

#### 🟡 部分实现 #4: Sidecar元数据系统

**实现状态**: 🟡 50% 完成

✅ **已实现**:
```typescript
// src/main/services/AssetManager.ts:560-598
async updateAssetMetadata(assetId: string, updates: Partial<AssetMetadata>): Promise<void> {
  const sidecarPath = `${metadata.filePath}.meta.json`;
  await this.fsService.writeJson(sidecarPath, updatedMetadata);
  // ✅ 支持.meta.json sidecar
}
```

❌ **缺失AI生成参数**:
```typescript
// src/shared/types/asset.ts:13-45
export interface AssetMetadata {
  id: string;
  filePath: string;
  tags: string[];
  // ❌ 无以下字段：
  // generationParams?: {
  //   prompt?: string;
  //   negativePrompt?: string;
  //   seed?: number;
  //   lora?: string[];
  //   model?: string;
  // }
}
```

---

#### 🔴 缺失 #5: 原子性与回滚机制

**99号要求**:
> "Atomic Transaction: File written BEFORE index update"
> "Cleanup on Failure: Prevent orphan files"

**现有代码** (src/main/services/AssetManager.ts:790-870):
```typescript
async importAsset(sourcePath: string, scope: AssetScope, projectId?: string): Promise<AssetMetadata> {
  // Step 1: 复制文件
  await this.fsService.copyFile(sourcePath, targetPath);

  // Step 2: 创建元数据
  const metadata = await this.createImportedMetadata(...);

  // ❌ 如果Step 2失败，Step 1的文件成为孤儿
  // ❌ 无try-catch回滚
  return metadata;
}
```

**应改为**:
```typescript
try {
  await this.fsService.copyFile(sourcePath, targetPath);
  const metadata = await this.createImportedMetadata(...);
  return metadata;
} catch (error) {
  // Cleanup on Failure
  await this.fsService.deleteFile(targetPath);
  throw error;
}
```

---

## 三、IPC层映射分析

### Workflow II流程对比

**99号文档标准流程**:
```
1. User selects Plugin → UI
2. A4.Pre-flight Check (验证能力)
3. A4.Create TaskRunner
4. A4.Path Resolution (matrix:// → OS path)
5. Provider.execute()
6. A1.UpdateIndex() (原子性)
```

**现有IPC实现** (src/main/index.ts):

| 步骤 | IPC通道 | 处理函数 | 状态 | 缺陷 |
|-----|--------|---------|------|------|
| 1 | `plugin:execute` | 667行 | ✅ 存在 | 直接调用PluginManager |
| 2 | `workbench:pre-flight` | - | ❌ **不存在** | 无能力检查 |
| 3 | `task:create` | 690行 | ✅ 存在 | TaskScheduler处理 |
| 4 | `path:resolve-matrix-uri` | - | ❌ **不存在** | 使用绝对路径 |
| 5 | `provider:execute` | - | 🟡 分散 | 无标准化接口 |
| 6 | `asset:rebuild-index` | 524行 | ✅ 存在 | 非原子操作 |

**缺失的IPC通道**:
```typescript
// 应添加：
ipcMain.handle('workbench:orchestrate', async (_, request: OrchestrationRequest) => {
  return await workbench.orchestrateExecution(request);
});

ipcMain.handle('path:resolve', async (_, matrixUri: string) => {
  return pathResolver.matrixToOS(matrixUri);
});
```

---

## 四、详细差异清单（手术清单）

### 🔴 P0: 阻断性缺失（必须修复）

| # | 项目 | 99号要求 | 现有状态 | 影响范围 | 修复工作量 | 优先级 |
|---|-----|---------|---------|---------|-----------|-------|
| 1 | **Workbench中介者** | A4核心模块 | 完全不存在 | 插件执行流程 | 3-5天 | **P0** |
| 2 | **Matrix URI系统** | 全局路径虚拟化 | 完全不存在 | 项目可移植性 | 2-3天 | **P0** |
| 3 | **Pre-flight Check** | 能力验证机制 | 完全不存在 | 用户体验（防崩溃） | 1-2天 | **P0** |
| 4 | **并发安全（WAL）** | project.json保护 | 无锁/队列 | 数据完整性 | 2-3天 | **P0** |
| 5 | **Cleanup on Failure** | 事务回滚 | 无异常处理 | 磁盘空间泄漏 | 1天 | **P0** |

**文件涉及**:
- 新增: `src/main/services/WorkflowOrchestrator.ts` (Workbench实现)
- 新增: `src/main/utils/PathResolver.ts` (Matrix URI工具)
- 修改: `src/main/services/PluginManager.ts` (集成Pre-flight Check)
- 修改: `src/main/services/ProjectManager.ts` (添加WAL队列)
- 修改: `src/main/services/AssetManager.ts` (异常回滚)

---

### 🟡 P1: 中优先级偏差（建议修复）

| # | 项目 | 99号要求 | 现有状态 | 修复难度 | 建议方案 |
|---|-----|---------|---------|---------|---------|
| 6 | **AI参数元数据** | Sidecar存储生成参数 | 无Schema字段 | 低 | 扩展AssetMetadata接口 |
| 7 | **ProviderHub统一** | 单一门面模式 | 分散在3个服务 | 中 | 创建ProviderHub门面类 |
| 8 | **模块命名一致性** | AssetLibrary | AssetManager | 低 | 添加类型别名 |
| 9 | **Index原子性** | 文件写入后立即更新索引 | 异步分离 | 低 | 同步调用updateIndex |
| 10 | **路径相对化** | 禁止绝对路径持久化 | 大量绝对路径 | 中 | 批量替换为Matrix URI |

---

### 🟢 P2: 符合设计（无需修改）

| 项目 | 实现质量 | 说明 |
|-----|---------|------|
| ProjectManager CRUD | ✅ 优秀 | 完全符合A1定义 |
| AssetManager索引 | ✅ 良好 | 核心功能完整 |
| Sidecar .meta.json | ✅ 良好 | 基础实现到位 |
| Plugin加载/卸载 | ✅ 优秀 | 沙箱隔离正确 |
| TimeService集成 | ✅ 优秀 | 严格遵守时间规范 |

---

## 五、架构违规实例分析

### 违规 #1: 绕过中介者直接执行

**位置**: src/main/services/PluginManager.ts:325-370

```typescript
public async executePlugin(pluginId: string, action: string, params: unknown): Promise<unknown> {
  const loaded = this.loadedPlugins.get(pluginId);
  if (!loaded) {
    throw new Error(`Plugin ${pluginId} not loaded`);
  }

  // ❌ 违规点1: 无Pre-flight Check
  // ❌ 违规点2: 无路径虚拟化
  // ❌ 违规点3: 无Provider路由

  try {
    const result = await loaded.instance.execute(action, params);
    return result;
  } catch (error) {
    // ❌ 违规点4: 无资源清理
    throw error;
  }
}
```

**正确实现** (应通过Workbench):
```typescript
// 重构为：
public async executePlugin(request: PluginExecutionRequest): Promise<unknown> {
  // 委托给Workbench
  return await this.workbench.orchestrateExecution({
    pluginId: request.pluginId,
    action: request.action,
    params: request.params,
    projectContext: request.projectId ? await this.getProjectContext(request.projectId) : null
  });
}

// Workbench内部实现Pre-flight Check
```

---

### 违规 #2: 路径硬编码破坏可移植性

**位置**: src/main/services/AssetManager.ts:738-745

```typescript
// ❌ 当前实现
const targetDir = path.join(
  this.fsService.getDataDir(),  // C:\Users\...\Matrix\data (硬编码)
  'assets',
  'project_outputs',
  projectId,
  dateFolder
);
```

**正确实现** (Matrix URI):
```typescript
// ✅ 应使用虚拟URI
const matrixUri = `matrix://project/${projectId}/outputs/${dateFolder}/${fileName}`;
const targetPath = this.pathResolver.resolve(matrixUri);

// PathResolver内部处理：
// matrix://project/{id}/outputs/* → {workspace}/{projects}/{id}/outputs/*
```

---

### 违规 #3: 能力声明未验证

**位置**: plugins/official/novel-to-video/manifest.json:24-45

```json
{
  "requiredProviders": [
    { "category": "llm", "required": true },
    { "category": "image-generation", "required": true }
  ]
}
```

**但验证逻辑不存在**:
```typescript
// src/main/services/PluginManager.ts:205
async loadPlugin(pluginId: string): Promise<void> {
  const manifest = await this.loadManifest(manifestPath);
  // manifest.requiredProviders ← 读取但未做任何检查

  // ❌ 缺少:
  // const canRun = await this.verifyCapabilities(manifest.requiredProviders);
  // if (!canRun) throw new Error('Required providers not available');
}
```

---

## 六、修复路线图

### Phase 1: 基础设施（1周）
**目标**: 建立虚拟化和中介者基础

#### Task 1.1: PathResolver工具类
**文件**: `src/main/utils/PathResolver.ts`
```typescript
export class PathResolver {
  constructor(private workspaceRoot: string) {}

  // matrix://global/inputs/{date}/{file} → {workspace}/Global_Inputs/{date}/{file}
  matrixToOS(uri: string): string;

  // C:\...\Global_Inputs\20260104\a.png → matrix://global/inputs/20260104/a.png
  osToMatrix(absPath: string, scope: 'global' | 'project', projectId?: string): string;

  // 验证URI格式
  validateMatrixUri(uri: string): boolean;
}
```

**测试**: `tests/unit/utils/PathResolver.test.ts`

---

#### Task 1.2: WorkflowOrchestrator服务（Workbench）
**文件**: `src/main/services/WorkflowOrchestrator.ts`

**职责**:
```typescript
export class WorkflowOrchestrator {
  constructor(
    private pluginManager: PluginManager,
    private providerHub: ProviderHub,
    private pathResolver: PathResolver
  ) {}

  // 核心编排方法
  async orchestrateExecution(request: OrchestrationRequest): Promise<unknown> {
    // Step 1: Pre-flight Check
    await this.preflightCheck(request.pluginId);

    // Step 2: Context Injection (Path Resolution)
    const context = await this.buildContext(request);

    // Step 3: Request Routing
    const provider = await this.routeToProvider(request);

    // Step 4: Execute with Atomic Transaction
    return await this.executeWithRollback(provider, context);
  }

  private async preflightCheck(pluginId: string): Promise<void> {
    const manifest = this.pluginManager.getManifest(pluginId);
    for (const req of manifest.requiredProviders) {
      const available = await this.providerHub.hasCapability(req.category);
      if (!available && req.required) {
        throw new PreflightError(`Required provider ${req.category} not available`);
      }
    }
  }

  private async executeWithRollback(provider, context): Promise<unknown> {
    const tempFiles: string[] = [];
    try {
      const result = await provider.execute(context);
      return result;
    } catch (error) {
      // Cleanup on Failure
      await this.cleanup(tempFiles);
      throw error;
    }
  }
}
```

---

#### Task 1.3: 并发安全队列
**文件**: `src/main/services/ProjectManager.ts`

**添加写入队列**:
```typescript
export class ProjectManager {
  private updateQueue = new Map<string, Promise<void>>();

  private async saveProjectConfig(config: ProjectConfig): Promise<void> {
    // 使用队列串行化写入
    const projectId = config.id;
    const prevTask = this.updateQueue.get(projectId);

    const task = (async () => {
      if (prevTask) await prevTask;

      const configPath = path.join(config.path, 'project.json');
      // 原子写入：先写临时文件，再重命名
      const tempPath = `${configPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(config, null, 2), 'utf-8');
      await fs.rename(tempPath, configPath);
    })();

    this.updateQueue.set(projectId, task);
    await task;
  }
}
```

---

### Phase 2: 核心功能迁移（1周）
**目标**: 将现有逻辑迁移到新架构

#### Task 2.1: AssetManager路径虚拟化
**修改**: `src/main/services/AssetManager.ts`

**批量替换**:
```typescript
// 前: 绝对路径
const targetPath = path.join(this.fsService.getDataDir(), 'assets', ...);

// 后: Matrix URI
const matrixUri = `matrix://project/${projectId}/outputs/${dateFolder}/${fileName}`;
const targetPath = this.pathResolver.resolve(matrixUri);
```

**更新元数据Schema**:
```typescript
// src/shared/types/asset.ts
export interface AssetMetadata {
  id: string;
  matrixUri: string;  // ← 替换 filePath
  filePath?: string;  // ← 废弃，仅用于向后兼容
  // ...
  generationParams?: {  // ← 新增AI参数
    prompt?: string;
    seed?: number;
    model?: string;
  };
}
```

---

#### Task 2.2: PluginManager集成Workbench
**修改**: `src/main/services/PluginManager.ts`

```typescript
export class PluginManager {
  constructor(
    private workbench: WorkflowOrchestrator  // ← 注入
  ) {}

  async executePlugin(request: PluginExecutionRequest): Promise<unknown> {
    // 委托给Workbench
    return await this.workbench.orchestrateExecution(request);
  }
}
```

---

#### Task 2.3: ProviderHub门面类
**新增**: `src/main/services/ProviderHub.ts`

**整合现有服务**:
```typescript
export class ProviderHub {
  constructor(
    private providerRegistry: ProviderRegistry,
    private apiManager: APIManager,
    private providerRouter: ProviderRouter
  ) {}

  // 统一接口
  async hasCapability(category: string): Promise<boolean> {
    const providers = await this.providerRegistry.getByCategory(category);
    return providers.some(p => p.status === 'active');
  }

  async executeRequest(request: ProviderRequest): Promise<unknown> {
    const provider = await this.providerRouter.route(request);
    return await provider.execute(request);
  }
}
```

---

### Phase 3: IPC层更新（2天）
**目标**: 暴露新功能到UI

#### Task 3.1: 新增IPC通道
**修改**: `src/main/index.ts`

```typescript
// Workbench通道
ipcMain.handle('workbench:orchestrate', async (_, request: OrchestrationRequest) => {
  return await services.workbench.orchestrateExecution(request);
});

// 路径解析通道
ipcMain.handle('path:resolve-matrix-uri', async (_, uri: string) => {
  return services.pathResolver.matrixToOS(uri);
});

ipcMain.handle('path:to-matrix-uri', async (_, absPath: string, scope, projectId?) => {
  return services.pathResolver.osToMatrix(absPath, scope, projectId);
});
```

---

#### Task 3.2: 预加载脚本暴露
**修改**: `src/preload/index.ts`

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // ...
  workbench: {
    orchestrate: (request: OrchestrationRequest) =>
      ipcRenderer.invoke('workbench:orchestrate', request)
  },
  path: {
    resolveMatrixUri: (uri: string) =>
      ipcRenderer.invoke('path:resolve-matrix-uri', uri),
    toMatrixUri: (path: string, scope: string, projectId?: string) =>
      ipcRenderer.invoke('path:to-matrix-uri', path, scope, projectId)
  }
});
```

---

### Phase 4: 测试与验证（2天）

#### Task 4.1: 单元测试
```
tests/unit/utils/PathResolver.test.ts
tests/unit/services/WorkflowOrchestrator.test.ts
tests/unit/services/ProviderHub.test.ts
```

#### Task 4.2: 集成测试
```
tests/integration/workflow-orchestration.test.ts
tests/integration/matrix-uri-resolution.test.ts
tests/integration/concurrent-project-updates.test.ts
```

#### Task 4.3: E2E测试
```
- 完整插件执行流程（含Pre-flight Check）
- 项目文件夹移动后功能完整性
- 批量任务并发安全性
```

---

## 七、风险评估

| 风险项 | 概率 | 影响 | 缓解措施 |
|-------|------|------|---------|
| 现有项目迁移困难 | 高 | 中 | 提供兼容层（支持旧路径格式） |
| Workbench性能开销 | 中 | 低 | 异步Pre-flight Check，缓存验证结果 |
| 路径解析错误 | 中 | 高 | 完善单元测试，添加路径验证 |
| 破坏现有功能 | 低 | 高 | 保持现有API兼容，分阶段迁移 |

---

## 八、向后兼容策略

### 8.1 路径兼容层
```typescript
// AssetManager支持双格式
async getAssetPath(metadata: AssetMetadata): Promise<string> {
  if (metadata.matrixUri) {
    return this.pathResolver.resolve(metadata.matrixUri);
  } else if (metadata.filePath) {
    // 向后兼容旧格式
    return metadata.filePath;
  }
  throw new Error('Invalid asset metadata');
}
```

### 8.2 渐进式迁移
1. **阶段1**: 新功能使用Matrix URI，旧数据保持不变
2. **阶段2**: 后台任务渐进式转换旧数据
3. **阶段3**: 弃用绝对路径（v1.0.0）

---

## 九、成功指标

完成后应达到的状态：

- ✅ 所有新资产使用Matrix URI（100%）
- ✅ 插件执行前通过Pre-flight Check（100%）
- ✅ 并发写入project.json无数据丢失（测试10000次）
- ✅ 项目文件夹移动后功能完整（E2E验证）
- ✅ 插件与Provider完全解耦（无直接导入）
- ✅ 99号文档符合度提升至85%+

---

## 十、关键文件清单

### 需新增的文件
```
src/main/utils/PathResolver.ts
src/main/services/WorkflowOrchestrator.ts
src/main/services/ProviderHub.ts
tests/unit/utils/PathResolver.test.ts
tests/unit/services/WorkflowOrchestrator.test.ts
tests/integration/workflow-orchestration.test.ts
```

### 需修改的文件
```
src/main/services/AssetManager.ts (路径虚拟化)
src/main/services/PluginManager.ts (集成Workbench)
src/main/services/ProjectManager.ts (并发安全)
src/main/index.ts (IPC通道)
src/preload/index.ts (API暴露)
src/shared/types/asset.ts (Schema扩展)
src/shared/types/electron-api.d.ts (类型定义)
```

### 需审查的文件
```
src/main/services/ProviderRegistry.ts
src/main/services/APIManager.ts
src/main/services/ProviderRouter.ts
plugins/official/novel-to-video/manifest.json
```

---

## 十一、总结与建议

### 当前状态
Matrix Studio的**基础服务层**（A1-A3, A5）实现质量优秀，但**编排层**（A4）和**虚拟化层**（PathResolver）完全缺失，导致：
1. 无法保证插件执行前的Provider可用性
2. 项目可移植性受损（硬编码路径）
3. 并发场景下数据完整性风险

### 建议优先级
1. **P0级（2周内完成）**: Workbench + PathResolver + 并发安全
2. **P1级（4周内完成）**: AI参数元数据 + ProviderHub整合
3. **P2级（随后）**: 旧数据迁移 + 性能优化

### 架构演进方向
从当前的"分散式服务调用"向99号文档定义的"中介者编排模式"演进，确保：
- 所有跨模块通信经过Workbench
- 所有路径使用Matrix URI虚拟化
- 所有写操作具备原子性保证

---

**审计完成时间**: 2026-01-04
**下一步**: 等待评审确认后制定详细实施计划

# 小说转视频架构定位分析与改造计划

## 核心问题

用户质疑："小说转视频"是否应该算作工作流（Workflow），还是应该独立作为插件（Plugin）？

## 探索结论

基于代码库的深入探索，**小说转视频应该作为插件（Plugin），而非工作流（Workflow）**。

---

## 架构对比分析

### 方案A：作为工作流（当前混乱状态）

**实现方式**：
- 注册到 `WorkflowRegistry`
- 通过 `/workflows` 路由访问
- 使用 `WorkflowExecutor` 执行

**优点**：
- ✓ 可以复用 `WorkflowStateManager` 的状态管理
- ✓ 可以在工作流列表中显示
- ✓ 开发成本低（复用现有基础设施）

**缺点**（严重）：
- ✗ **违反设计初衷**：用户不能修改5步固定流程，与工作流"自由组装"理念冲突
- ✗ **概念混淆**：工作流 = 用户创作工具，小说转视频 = 完整产品
- ✗ **无法分发**：WorkflowRegistry 不支持插件市场和打包分发
- ✗ **权限管理缺失**：工作流没有权限声明机制
- ✗ **生命周期管理缺失**：无法独立启用/禁用/卸载
- ✗ **版本管理困难**：与主应用版本耦合
- ✗ **商业化受限**：无法在市场销售/分享

**当前状态**：
- `novel-to-video-definition.ts` 已标记 `@deprecated`
- 文件注释明确说："不应该注册到 WorkflowRegistry"
- 代码中已经过滤掉：`workflowList.filter(w => w.type !== 'novel-to-video')`

---

### 方案B：作为插件（推荐）✅

**实现方式**：
- 通过 `PluginManager` 加载
- 存储在 `plugins/official/novel-to-video/`
- 通过 `/plugins` 路由访问
- 使用 `manifest.json` 声明配置

**优点**（决定性）：
- ✓ **概念清晰**：插件 = 完整产品，工作流 = 组件编排
- ✓ **固定流程保证**：5步流程无法被用户修改
- ✓ **完整隔离**：业务逻辑封装在插件内部
- ✓ **独立版本管理**：可单独升级，不影响主应用
- ✓ **支持分发**：可打包成ZIP，在插件市场分享
- ✓ **权限声明**：manifest.json 声明所需权限
- ✓ **生命周期完整**：activate/deactivate 钩子
- ✓ **可卸载**：完整的清理机制
- ✓ **商业化友好**：可在市场销售

**缺点**（可接受）：
- ✗ 需要单独的插件目录结构
- ✗ 需要编写 manifest.json
- ✗ 需要实现 Plugin 接口

**当前状态**：
- ✅ `PluginManager` 已完整实现
- ✅ 插件打包分发机制已完整实现
- ✅ `plugins/official/novel-to-video/` 目录已存在
- ✅ IPC 通道已实现（`plugin:*`）
- ⚠️ 插件市场为 MVP（硬编码数据）

---

## 关键差异对比表

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

#### `manifest.json`
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
  "schemas": ["chapter", "scene", "character", "storyboard", "voiceover"]
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

#### Plugins 页面
```typescript
// 显示"小说转视频"插件
// 点击后跳转到 WorkflowExecutor（复用现有UI）
```

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
- [ ] 编写 manifest.json
- [ ] 实现 Plugin 接口（activate/deactivate）
- [ ] 注册 Schema

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
- [ ] 右侧面板集成
- [ ] 状态持久化

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

**答**：两种入口

1. **插件页面**：`/plugins` → 选择"小说转视频"
2. **快捷方式**：Dashboard → "小说转视频"快捷方式（ShortcutType.PLUGIN）

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

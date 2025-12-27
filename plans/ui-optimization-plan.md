# MATRIX Studio 全局版面与功能优化方案

> **制定日期**: 2025-12-28
> **当前版本**: v0.2.9.5
> **目标版本**: v0.3.0
> **基准文档**: `docs/08-ui-design-specification-v1.0.0.md`, `docs/references/UI/Matrix Meun Flow.jpg`

## 📌 重要参考实现标准

本优化方案的所有UI实现都应参考项目内"关于"页面下的两个演示页面作为**标准实现**：

### 1. 主题系统演示 (ThemeShowcase.tsx)
- **路径**: `src/renderer/pages/about/ThemeShowcase.tsx`
- **展示内容**:
  - 基础色彩（11个OKLCH色彩Token）
  - 图表色彩（5个Chart色彩Token）
  - 侧边栏色彩（5个Sidebar色彩Token）
  - 字体系统（Inter + JetBrains Mono）
  - 圆角规范（4px, 6px, 8px, 12px）
  - 技术栈标签（Tailwind CSS v4, shadcn/ui, Radix UI, Framer Motion, OKLCH）
- **使用方式**: 所有色彩、字体、圆角相关实现必须严格遵循此处定义的Token值

### 2. UI组件库演示 (UIDemo.tsx)
- **路径**: `src/renderer/pages/demo/UIDemo.tsx`
- **展示内容**:
  - **Button**: 6种变体（default/secondary/destructive/outline/ghost/link）+ 4种尺寸（sm/default/lg/icon）
  - **Card**: CardHeader/CardTitle/CardDescription/CardContent/CardFooter完整结构
  - **Input**: 标准输入框、邮箱、密码、禁用状态、文件上传
  - **表单控件**: Label、Checkbox、Switch完整使用示例
  - **Badge**: 4种变体（default/secondary/destructive/outline）
  - **Icons**: Lucide React图标库完整使用（24个常用图标+按钮组合示例）
  - **Alert**: 默认和destructive两种样式
  - **Tabs**: TabsList/TabsTrigger/TabsContent完整实现
  - **Separator**: 分隔线组件
  - **组合示例**: 登录表单（Input + Button组合）
- **使用方式**: 所有UI组件实现必须参考此处的标准用法和样式风格

### 3. 访问方式
- **开发环境**: `npm run dev` 后访问 `/about` 页面
- **查看主题**: 点击"🌈 查看全局主题"按钮
- **查看组件**: 点击"🎨 查看 UI 组件演示"按钮（跳转到 `/demo` 页面）

---

## 📊 现状分析

### 已实现页面（除"关于"外）

| 页面 | 路由 | 实现状态 | UI 风格 | 功能完整度 |
|------|------|---------|---------|-----------|
| **Dashboard** | `/dashboard` | ✅ 完整 | 旧版 | 90% - 项目 CRUD 完整 |
| **Projects** | `/projects` | ⚠️ 冗余 | 旧版 | 20% - 仅占位符，与 Dashboard 功能重复 |
| **Assets** | `/assets` | ✅ 完整 | 旧版 | 85% - 资产管理、预览完整 |
| **Plugins** | `/plugins` | ✅ 完整 | 旧版 | 90% - 市场+安装完整 |
| **Workflows** | `/workflows` | ✅ 完整 | 旧版 | 80% - 模板选择+实例管理完整 |
| **WorkflowExecutor** | `/workflows/:id` | ✅ 完整 | 旧版 | 70% - 5步骤面板框架完整，实际执行逻辑待实现 |
| **Settings** | `/settings` | ✅ 完整 | 旧版 | 85% - API 供应商配置完整 |
| **WorkflowEditor** | `/workflows/new` | ⚠️ 占位 | 未实现 | 10% - 可视化编辑器未实现 |

### 全局布局组件

| 组件 | 文件 | 实现状态 | UI 风格 |
|------|------|---------|---------|
| **Layout** | `Layout.tsx` | ✅ 完整 | 旧版 |
| **WindowBar** | `WindowBar.tsx` | ✅ 完整 | 旧版 - 自定义标题栏 |
| **GlobalNav** | `GlobalNav.tsx` | ✅ 完整 | 旧版 - 侧边导航 |

### UI 组件库状态

| 类别 | 实现状态 | 备注 |
|------|---------|------|
| **通用组件** | ✅ 10/10 | Button, Card, Modal, Toast, Loading 等 |
| **shadcn/ui 组件** | ⚠️ 部分 | 已安装但未全面应用 |
| **V2 设计风格** | ❌ 未应用 | 仅在 `docs/references/UI/V2` 参考中存在 |

---

## 🎯 Menu Flow 功能需求对照

### A1: 项目管理

**流程图需求**:
- 剧本上传 → 格式化预处理
- 数据驱动 → 进入人员配置
- 项目归档 → 提档归档存储

**当前实现**:
- ✅ 项目创建、列表、删除
- ❌ 缺失: 剧本上传入口
- ❌ 缺失: 项目详情页（点击项目后的页面）
- ❌ 缺失: 人员配置（角色、场景管理）
- ❌ 缺失: 项目归档功能

### A2: 资源库

**流程图需求**:
- 本地/全局资源切换
- 以资源类型组织层级（文本、图像、音频、视频、脚本）
- 列表/卡片视图切换

**当前实现**:
- ✅ 资产网格展示、预览
- ⚠️ 部分: 支持 scope（全局/项目），但 UI 未明显区分
- ❌ 缺失: 左侧分类导航（按资源类型）
- ✅ 视图切换（List/Grid）

### A3: 插件

**流程图需求**:
- 本地服务管理（ComfyUI, N8N, Ollama）
- 未来工作流服务扩展

**当前实现**:
- ✅ 插件市场、搜索、安装
- ✅ 官方/社区插件分类
- ⚠️ 部分: 本地服务管理在 Settings 页面，未在 Plugins 页面体现

### A4: 工作流

**流程图需求**:
- 工作流评估（选择合适流程）
- 执行模式选择：
  - 本地 LLM（文本、图像、音频）
  - 本地 API（用户配置）
  - 独立容器服务（ComfyUI, N8N, Ollama）
- 厂商 API（中继路由）

**当前实现**:
- ✅ 工作流模板选择
- ✅ 工作流实例管理
- ✅ 小说转视频 5 步骤执行器
- ❌ 缺失: 工作流评估引导
- ❌ 缺失: 执行模式选择 UI
- ❌ 缺失: 可视化流程编辑器（WorkflowEditor 仅占位）

### A5: 设置

**流程图需求**:
- 本地服务配置（ComfyUI, N8N, Ollama）
- 工作流服务注册
- 各种厂商 API 配置

**当前实现**:
- ✅ API 供应商配置（Ollama, OpenAI, SiliconFlow 等）
- ✅ 连接测试、模型拉取
- ✅ 工作区路径设置
- ⚠️ 部分: 本地服务配置混在 API 供应商中，未单独分类

---

## 🔧 优化方案

### Phase 1: 页面结构重构（优先级: 🔴 高）

#### 1.1 合并/删除冗余页面

**问题**: `Projects.tsx` 与 `Dashboard.tsx` 功能重复

**方案**:
```
选项 A（推荐）: 删除 Projects 页面，Dashboard 作为唯一项目管理入口
- 删除: src/renderer/pages/projects/Projects.tsx
- 删除路由: App.tsx 中的 /projects 路由

选项 B: 重新定位 Projects 为项目详情页
- 重命名: Projects → ProjectDetail
- 路由改为: /projects/:projectId
- 功能: 显示项目内容（剧本、场景、角色、资产）
```

**推荐**: 选项 A，因为项目详情可在新页面实现

#### 1.2 新增项目详情页

**需求**: 点击 Dashboard 中的项目卡片后，进入项目工作区

**页面**: `ProjectWorkspace.tsx`
**路由**: `/projects/:projectId`

**布局**:
```
┌─────────────────────────────────────────┐
│  Header: 项目名称 | 返回按钮             │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Tabs: 剧本 | 场景 | 角色 ...│
│          ├──────────────────────────────┤
│  - 剧本  │                              │
│  - 场景  │     Tab Content Area         │
│  - 角色  │                              │
│  - 资产  │                              │
│  - 工作流│                              │
└──────────┴──────────────────────────────┘
```

**核心功能**:
- 剧本上传与管理
- 场景列表（从剧本拆分）
- 角色库（提取角色信息）
- 项目资产（筛选当前项目的资产）
- 快速启动工作流

#### 1.3 Assets 页面优化

**当前问题**: 缺少左侧分类导航

**优化方案**:
```tsx
<div className="assets-layout">
  {/* 左侧分类导航 */}
  <aside className="w-64 border-r bg-sidebar">
    <div className="category-list">
      <CategoryItem icon="📝" label="文本" count={12} />
      <CategoryItem icon="🖼️" label="图像" count={156} />
      <CategoryItem icon="🎵" label="音频" count={45} />
      <CategoryItem icon="🎬" label="视频" count={23} />
      <CategoryItem icon="📜" label="脚本" count={8} />
    </div>
    <div className="scope-switcher">
      <button>全局资源</button>
      <button>项目资源</button>
    </div>
  </aside>

  {/* 右侧资产网格 */}
  <main className="flex-1">
    <AssetGrid ... />
  </main>
</div>
```

**新增功能**:
- ✅ 左侧分类树（可折叠）
- ✅ 作用域切换（全局/当前项目）
- ✅ 分类过滤
- ✅ 拖拽上传

#### 1.4 WorkflowExecutor 三栏布局与交互控件

**当前问题**:
- ❌ 缺少右侧属性面板
- ❌ 缺少进度状态指示器
- ❌ 缺少侧边栏收缩控制
- ❌ 缺少视图模式切换（卡片/列表）

**优化方案 - 完整三栏布局**:

```
┌──┬────────────────────────────────────────────────┬──┐
│📁│ [1] 剧本分析  [2] 场景构色  [3] 分镜生成...   │🔲│← 收缩按钮
├──┴────────────────────────────────────────────────┴──┤
│                                                       │
│  ┌─────┬───────────────────────────┬──────────────┐ │
│  │     │ 3.1 分镜生成  3.2 运镜控制 │  【属性】工具  │ │
│  │ P   ├───────────────────────────┤              │ │
│  │ R   │                           │ 检查器       │ │
│  │ O   │   [分镜] [列表] 🔍 🔲    │              │ │
│  │ J   │                           │ 当前选中:    │ │
│  │ E   │  ┌──────┐  ┌──────┐      │ 镜头-01     │ │
│  │ C   │  │#1 镜01│  │#2 镜02│     │              │ │
│  │ T   │  │预览图 │  │预览图 │     │ Prompt:     │ │
│  │     │  │描述.. │  │主角待.│     │ Cyberpunk.. │ │
│  │ L   │  │[重生成]│  │[重生成]│    │              │ │
│  │ O   │  └──────┘  └──────┘      │ 生成设置:   │ │
│  │ C   │                           │ 模型: Sora  │ │
│  │ A   │  ┌──────┐  ┌──────┐      │ 步数: 30    │ │
│  │ L   │  │#3 镜03│  │#4 镜04│     │ CFG: 7.0    │ │
│  │     │  │...    │  │...    │     │ 种子: -1    │ │
│  │资源 │  └──────┘  └──────┘      │              │ │
│  │树   │                           │ 关联资产:   │ │
│  │     │                           │ [CyberSty]  │ │
│  │(可  │   列表视图模式:           │              │ │
│  │折叠)│  ────────────────────    │ 内部参数    │ │
│  │     │  ▶ #1 镜01  描述... [重]  │ 10/34       │ │
│  │     │  ▶ #2 镜02  主角待. [重]  │              │ │
│  │     │  ▶ #3 镜03  ...     [重]  │ ┌──────────┐ │ │
│  └─────┴───────────────────────────┤ │ 生成     │ │ │
│                                     │ │(GENERATE)│ │ │
│                                     │ └──────────┘ │ │
│                                     │              │ │
│                                     │              │ │
│                                     │      ┌─────┐│ │
│                                     │      │  0  ││ │← 状态球
│                                     │      └─────┘│ │
│                                     └──────────────┘ │
└───────────────────────────────────────────────────────┘
```

**关键 UI 元素**:

##### 1.4.1 右侧属性面板（Settings Panel）

**组件**: `RightSettingsPanel.tsx`
**宽度**: `w-80` (320px)
**背景**: `bg-sidebar`

**结构**:
```tsx
<aside className="w-80 border-l border-border bg-sidebar flex flex-col">
  {/* Tab 切换：属性 | 工具 */}
  <div className="tabs">
    <button className={activeTab === 'properties' ? 'active' : ''}>属性</button>
    <button className={activeTab === 'tools' ? 'active' : ''}>工具</button>
  </div>

  {/* 检查器区域 */}
  <ScrollArea className="flex-1 p-4">
    <div className="inspector">
      <label className="text-xs text-muted-foreground">检查器</label>
      <h3 className="text-sm font-medium">当前选中: 镜头-01</h3>
    </div>

    {/* Prompt 编辑器 */}
    <div className="prompt-editor">
      <label>Prompt</label>
      <textarea
        className="w-full h-24 bg-input border-border"
        value={currentPrompt}
        onChange={handlePromptChange}
      />
    </div>

    {/* 生成设置 */}
    <div className="generation-settings">
      <label>生成设置 (GENERATION SETTINGS)</label>
      <Select label="模型" value="Sora v2 (Cloud)" />
      <InputNumber label="步数" value={30} />
      <InputNumber label="CFG" value={7.0} step={0.1} />
      <InputNumber label="种子 (Seed)" value={-1} />
    </div>

    {/* 关联资产 */}
    <div className="linked-assets">
      <label>关联资产 (LINKED ASSETS)</label>
      <div className="asset-tags">
        <Tag>Global CyberStyle_v2</Tag>
        <Tag>Prop: Hero_Face</Tag>
      </div>
    </div>

    {/* 内部参数 */}
    <div className="internal-params">
      <label>内部参数</label>
      <span className="text-xs">10/34</span>
    </div>
  </ScrollArea>

  {/* 底部生成按钮 */}
  <div className="p-4 border-t border-border">
    <Button
      className="w-full bg-primary hover:bg-primary/90"
      size="lg"
      onClick={handleGenerate}
    >
      生成 (GENERATE)
    </Button>
  </div>
</aside>
```

**交互逻辑**:
- 点击场景/分镜卡片时，右侧面板显示其详细信息
- 修改 Prompt/参数后，点击"生成"按钮触发 AI 生成
- 支持批量选中多个项目，显示批量操作选项

##### 1.4.2 状态球（Progress Indicator）

**组件**: `ProgressOrb.tsx`
**位置**: 右下角固定定位（`fixed bottom-6 right-6`）
**尺寸**: `w-16 h-16` (64px)

**结构**:
```tsx
<motion.div
  className="fixed bottom-6 right-6 z-50"
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  whileHover={{ scale: 1.1 }}
>
  <div className="relative w-16 h-16">
    {/* 背景圆环（进度） */}
    <svg className="w-full h-full transform -rotate-90">
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="oklch(0.24 0 0)"
        strokeWidth="4"
        fill="none"
      />
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="oklch(0.85 0.22 160)"  // 电子绿
        strokeWidth="4"
        fill="none"
        strokeDasharray={`${progress * 176} 176`}  // 进度圆弧
        className="transition-all duration-300"
      />
    </svg>

    {/* 中心数字 */}
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-2xl font-mono font-semibold">{queueCount}</span>
    </div>

    {/* 脉动效果（生成中） */}
    {isGenerating && (
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary"
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />
    )}
  </div>

  {/* Tooltip */}
  <Tooltip>
    <TooltipTrigger asChild>
      <div />
    </TooltipTrigger>
    <TooltipContent>
      <p>队列中: {queueCount} 个任务</p>
      <p>进度: {Math.round(progress * 100)}%</p>
    </TooltipContent>
  </Tooltip>
</motion.div>
```

**状态说明**:
- **数字**: 队列中待生成的任务数量
- **圆环进度**: 当前任务的完成百分比（0-100%）
- **脉动动画**: 正在生成时播放
- **颜色变化**:
  - 灰色（无任务）: `oklch(0.24 0 0)`
  - 电子绿（生成中）: `oklch(0.85 0.22 160)`
  - 红色（错误）: `oklch(0.577 0.245 27.325)`

**点击交互**:
- 点击状态球展开任务列表（底部抽屉或模态框）
- 显示所有队列任务、进度、预计完成时间
- 支持取消/重试单个任务

##### 1.4.3 侧边栏收缩按钮

**位置**:
- 左侧收缩按钮: 标题栏左侧（靠近 Logo）
- 右侧收缩按钮: 标题栏右侧（视图切换按钮旁边）

**按钮设计**:
```tsx
{/* 左侧收缩按钮 */}
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
  aria-label={leftSidebarCollapsed ? '展开项目资源' : '收缩项目资源'}
>
  {leftSidebarCollapsed ? (
    <PanelLeftOpen className="h-4 w-4" />
  ) : (
    <PanelLeftClose className="h-4 w-4" />
  )}
</Button>

{/* 右侧收缩按钮 */}
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
  aria-label={rightPanelCollapsed ? '展开属性面板' : '收缩属性面板'}
>
  {rightPanelCollapsed ? (
    <PanelRightOpen className="h-4 w-4" />
  ) : (
    <PanelRightClose className="h-4 w-4" />
  )}
</Button>
```

**动画效果**:
```tsx
<motion.aside
  className="border-l bg-sidebar"
  animate={{
    width: rightPanelCollapsed ? 0 : 320,
    opacity: rightPanelCollapsed ? 0 : 1
  }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
>
```

**快捷键**:
- `Ctrl+B`: 切换左侧边栏
- `Ctrl+Alt+B`: 切换右侧边栏
- `Ctrl+\`: 切换所有侧边栏

##### 1.4.4 视图模式切换（卡片/列表）

**位置**: 顶部 Tab 栏右侧

**按钮组**:
```tsx
<div className="flex items-center gap-2">
  {/* 卡片视图 */}
  <Button
    variant={viewMode === 'grid' ? 'default' : 'ghost'}
    size="icon"
    className="h-8 w-8"
    onClick={() => setViewMode('grid')}
    aria-label="卡片视图"
  >
    <Grid3x3 className="h-4 w-4" />
  </Button>

  {/* 列表视图 */}
  <Button
    variant={viewMode === 'list' ? 'default' : 'ghost'}
    size="icon"
    className="h-8 w-8"
    onClick={() => setViewMode('list')}
    aria-label="列表视图"
  >
    <List className="h-4 w-4" />
  </Button>

  <Separator orientation="vertical" className="h-6" />

  {/* 全屏切换 */}
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    onClick={toggleFullscreen}
    aria-label="全屏"
  >
    <Maximize2 className="h-4 w-4" />
  </Button>

  {/* 右侧面板收缩按钮 */}
  <Button variant="ghost" size="icon" ... >
</div>
```

**卡片视图（Grid）布局**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
  {scenes.map(scene => (
    <SceneCard
      key={scene.id}
      scene={scene}
      isSelected={selectedScenes.has(scene.id)}
      onSelect={() => handleSelectScene(scene.id)}
    >
      {/* 预览图 */}
      <div className="relative aspect-video bg-muted">
        <Image src={scene.thumbnail} />
        <PlayButton />
        <Duration>{scene.duration}</Duration>
      </div>

      {/* 信息区 */}
      <div className="p-3">
        <h3>#{scene.number} {scene.title}</h3>
        <p className="text-sm text-muted-foreground">{scene.description}</p>
        <Button size="sm" variant="ghost">重生成</Button>
      </div>
    </SceneCard>
  ))}
</div>
```

**列表视图（List）布局**:
```tsx
<div className="flex flex-col gap-2 p-4">
  {scenes.map(scene => (
    <div
      key={scene.id}
      className="flex items-center gap-4 p-3 rounded-lg bg-card hover:bg-accent cursor-pointer"
      onClick={() => handleSelectScene(scene.id)}
    >
      {/* 播放按钮 */}
      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
        <Play className="h-4 w-4" />
      </Button>

      {/* 编号标题 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">#{scene.number}</span>
          <h3 className="font-medium truncate">{scene.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground truncate">{scene.description}</p>
      </div>

      {/* 时长 */}
      <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
        {scene.duration}
      </span>

      {/* 状态标签 */}
      <Badge variant={scene.status === 'completed' ? 'success' : 'warning'}>
        {scene.status === 'completed' ? '完成' : '重生成'}
      </Badge>
    </div>
  ))}
</div>
```

**视图模式持久化**:
```tsx
// 保存用户偏好到 localStorage
useEffect(() => {
  localStorage.setItem('workflow-view-mode', viewMode);
}, [viewMode]);

// 初始化时恢复用户偏好
useEffect(() => {
  const savedMode = localStorage.getItem('workflow-view-mode');
  if (savedMode === 'list' || savedMode === 'grid') {
    setViewMode(savedMode);
  }
}, []);
```

**新增依赖**:
```tsx
import {
  Grid3x3,
  List,
  Maximize2,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Play
} from 'lucide-react';
```

---

### Phase 2: UI 设计风格迁移（优先级: 🔴 高）

#### 2.1 应用 V2 设计系统

**基准**: `docs/08-ui-design-specification-v1.0.0.md`

**迁移清单**:

| 组件 | 当前状态 | 目标状态 | 工作量 |
|------|---------|---------|--------|
| **WindowBar** | 自定义实现 | V2 Header + 侧边栏收缩按钮 | 3h |
| **GlobalNav** | 旧版侧边栏 | V2 Sidebar 设计（可收缩） | 4h |
| **Dashboard** | 旧版卡片 | V2 SceneCard 风格 | 4h |
| **Assets** | 旧版网格 | V2 设计 + 左侧导航 | 6h |
| **Plugins** | 旧版卡片 | V2 MarketPluginCard 风格 | 3h |
| **Workflows** | 旧版 Tab | V2 WorkflowTabs + 视图切换 | 5h |
| **WorkflowExecutor** | 简单进度条 | V2 三栏布局 + 步骤指示器 | 8h |
| **RightSettingsPanel** | ❌ 不存在 | 🆕 右侧属性面板（检查器+生成设置） | 6h |
| **ProgressOrb** | ❌ 不存在 | 🆕 状态球（队列+进度指示） | 4h |
| **Settings** | 旧版表单 | V2 设置面板样式 | 4h |

**新增组件详细说明**:
- **RightSettingsPanel**: 包含 Tab 切换、检查器、Prompt 编辑器、生成设置、关联资产显示、生成按钮
- **ProgressOrb**: SVG 圆环进度、脉动动画、Tooltip、点击展开任务队列
- **侧边栏收缩**: 左右侧边栏独立控制，Framer Motion 动画，快捷键支持
- **视图切换**: 卡片/列表两种布局，用户偏好持久化

**总工作量**: ~47 小时（原 29h + 新增 18h）

#### 2.2 全局样式文件更新

**新增文件**: `src/renderer/styles/globals.css`

```css
@import "tailwindcss";

:root {
  /* 从 docs/references/UI/V2/app/globals.css 复制所有 CSS 变量 */
  --background: oklch(0.12 0 0);
  --foreground: oklch(0.92 0 0);
  /* ... */
}

/* 自定义滚动条 */
::-webkit-scrollbar { ... }

/* 基础样式 */
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

**修改**: `src/renderer/index.tsx`
```tsx
import './styles/globals.css';  // 替换旧样式
```

#### 2.3 字体加载

**修改**: `src/renderer/index.html`
```html
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
```

---

### Phase 3: 组件库标准化（优先级: 🟡 中）

#### 3.1 创建标准化组件

**基于**: `docs/references/UI/V2/components`

**新增组件**:
```
src/renderer/components/ui/v2/
├── Header.tsx           # V2 标题栏组件
├── Sidebar.tsx          # V2 侧边栏组件
├── SceneCard.tsx        # V2 场景卡片
├── WorkflowTabs.tsx     # V2 工作流选项卡
└── SettingsPanel.tsx    # V2 设置面板
```

#### 3.2 shadcn/ui 组件完整集成

**当前已安装**: 部分组件
**需要补充**:
```bash
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add select
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add separator
```

---

### Phase 4: 功能补齐（优先级: 🟢 中低）

#### 4.1 工作流执行器面板实现

**当前状态**: 5 个面板仅有框架，无实际逻辑

**优化方案**:

**ChapterSplitPanel（章节拆分）**:
```tsx
功能:
- 上传小说文件（txt/docx）
- AI 自动章节识别
- 手动调整章节边界
- 输出: 章节列表 JSON

UI:
- 左侧: 原文预览（高亮章节分隔）
- 右侧: 章节列表（可编辑标题）
- 底部: "AI 拆分" / "下一步" 按钮
```

**SceneCharacterPanel（场景角色提取）**:
```tsx
功能:
- 从章节文本提取场景
- 识别主要角色
- 生成场景描述（时间、地点、人物、事件）

UI:
- 场景卡片网格
- 每个场景显示: 时间、地点、角色列表
- 角色管理: 添加、编辑、删除
```

**StoryboardPanel（分镜脚本生成）**:
```tsx
功能:
- 基于场景生成分镜描述
- Prompt 工程（转换为图像生成提示词）
- 预览缩略图（ComfyUI 生成）

UI:
- Timeline 视图（横向滚动）
- 每个分镜: 编号、提示词、缩略图
- 批量生成/重新生成按钮
```

**VoiceoverPanel（配音生成）**:
```tsx
功能:
- 提取旁白和对话
- 角色语音分配（从 API 选择音色）
- TTS 生成音频

UI:
- 旁白列表（时间轴）
- 每条旁白: 文本、角色、音色选择、试听按钮
- 批量生成
```

**ExportPanel（导出成品）**:
```tsx
功能:
- 合成视频（分镜 + 配音 + 字幕）
- 导出格式选择（MP4, WebM）
- 分辨率/帧率设置

UI:
- 预览窗口
- 导出设置表单
- 进度条 + 导出按钮
```

#### 4.2 工作流可视化编辑器

**页面**: `WorkflowEditor.tsx`
**需求**: 拖拽式流程图编辑器

**技术方案**:
```
选项 A: React Flow
- 优点: 专业、文档齐全、社区活跃
- 缺点: 需要学习曲线

选项 B: 简化版
- 使用列表 + 表单配置节点
- 不做可视化流程图，仅配置步骤序列
```

**推荐**: 选项 B（MVP），后续升级到选项 A

---

### Phase 5: 交互优化（优先级: 🟢 低）

#### 5.1 Framer Motion 动画

**应用场景**:
- 页面切换: 淡入淡出
- 侧边栏展开: 侧滑动画
- 卡片悬停: 缩放 + 阴影
- 模态框: 弹出动画
- 选项卡切换: layoutId 滑动

**示例**（Dashboard 卡片）:
```tsx
<motion.div
  layout
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
>
  <Card ... />
</motion.div>
```

#### 5.2 键盘快捷键

**全局快捷键**:
```
Ctrl+N: 新建项目
Ctrl+O: 打开项目
Ctrl+S: 保存
Ctrl+W: 关闭当前窗口
Ctrl+,: 打开设置
F11: 全屏切换
```

**实现**: 使用 `react-hotkeys-hook`

---

## 📋 实施计划

### Sprint 1: 核心页面重构（6 天）

**目标**: 应用 V2 设计风格到主要页面 + 侧边栏收缩控制

| 任务 | 负责人 | 工期 | 优先级 |
|------|--------|------|--------|
| 删除 Projects 页面 | Dev | 0.5d | P0 |
| 更新全局样式（globals.css） | Dev | 1d | P0 |
| WindowBar V2 迁移 + 侧边栏收缩按钮 | Dev | 0.5d | P0 |
| GlobalNav V2 迁移（可收缩） | Dev | 0.5d | P0 |
| Dashboard V2 迁移 | Dev | 0.5d | P0 |
| Assets 左侧导航 | Dev | 1d | P0 |
| Workflows 视图切换按钮 | Dev | 0.5d | P0 |
| 侧边栏收缩动画 + 快捷键 | Dev | 0.5d | P0 |
| ProgressOrb 状态球组件 | Dev | 0.5d | P0 |

### Sprint 2: 三栏布局与功能补齐（8 天）

| 任务 | 负责人 | 工期 | 优先级 |
|------|--------|------|--------|
| WorkflowExecutor 三栏布局重构 | Dev | 1d | P0 |
| RightSettingsPanel 右侧属性面板 | Dev | 1d | P0 |
| 视图模式切换（卡片/列表） | Dev | 0.5d | P0 |
| 新增 ProjectWorkspace 页面 | Dev | 1.5d | P1 |
| 实现 ChapterSplitPanel | Dev | 1.5d | P1 |
| 实现 SceneCharacterPanel | Dev | 1d | P1 |
| 实现 StoryboardPanel | Dev | 1d | P1 |
| 实现 VoiceoverPanel | Dev | 0.5d | P1 |

### Sprint 3: 交互优化与测试（4 天）

| 任务 | 负责人 | 工期 | 优先级 |
|------|--------|------|--------|
| ProgressOrb 点击展开任务列表 | Dev | 0.5d | P1 |
| 右侧面板与卡片联动逻辑 | Dev | 1d | P1 |
| 添加 Framer Motion 动画 | Dev | 1d | P2 |
| 键盘快捷键支持（含侧边栏切换） | Dev | 0.5d | P2 |
| 全局 UI 一致性检查 | QA | 0.5d | P1 |
| 性能优化（懒加载、缓存） | Dev | 0.5d | P2 |

**总工期**: 18 天（原 15 天 + 新增功能 3 天）

### 关键里程碑

| 里程碑 | 完成日期 | 交付物 |
|--------|---------|--------|
| **M1: V2 设计风格应用** | Sprint 1 结束 | 所有页面应用 V2 设计，侧边栏可收缩 |
| **M2: 三栏布局完成** | Sprint 2 Day 3 | WorkflowExecutor 完整三栏布局 + 右侧面板 |
| **M3: 工作流面板功能完整** | Sprint 2 结束 | 5 个面板实际逻辑实现 |
| **M4: 交互细节打磨** | Sprint 3 结束 | 动画、快捷键、状态球完整交互 |

---

## 🎨 设计资产准备

### 需要准备的资源

1. **图标**:
   - 项目类型图标（小说、短视频、动画等）
   - 资产类型图标（文本、图像、音频、视频、脚本）
   - 状态图标（进行中、已完成、错误）

2. **占位图**:
   - 项目封面占位图
   - 资产缩略图占位图
   - 场景预览占位图

3. **Logo**:
   - 应用 Logo（SVG 格式）
   - 品牌图标（Favicon）

---

## ✅ 验收标准

### 功能验收

- [ ] 所有页面应用 V2 设计风格
- [ ] 项目创建到工作流执行全流程打通
- [ ] 资产库支持分类导航和作用域切换
- [ ] 工作流执行器 5 个面板功能完整
- [ ] **WorkflowExecutor 三栏布局完整**（左项目树 + 中内容区 + 右属性面板）
- [ ] **右侧属性面板功能完整**（检查器、Prompt 编辑、生成设置、关联资产）
- [ ] **状态球正常工作**（显示队列数、进度圆环、点击展开任务列表）
- [ ] **侧边栏收缩功能**（左右侧独立控制，动画流畅，快捷键有效）
- [ ] **视图模式切换**（卡片/列表两种布局，用户偏好持久化）
- [ ] 所有交互支持键盘导航
- [ ] 无明显性能问题（页面加载 < 1s）

### UI 验收

- [ ] 色彩系统符合 `08-ui-design-specification-v1.0.0.md`
- [ ] 字体使用 Inter + JetBrains Mono
- [ ] 所有动画使用 Framer Motion
- [ ] 图标统一使用 lucide-react
- [ ] 组件圆角、间距、字号符合规范
- [ ] 对比度满足 WCAG 2.1 AAA 级

### 代码质量

- [ ] TypeScript 严格模式通过
- [ ] ESLint 0 错误
- [ ] 组件类型定义完整
- [ ] 无 console.log 残留
- [ ] 注释完整（中文）

---

## 📝 附录

### A. 页面路由表（优化后）

| 路由 | 页面组件 | 功能 | 状态 |
|------|---------|------|------|
| `/` | Dashboard | 项目管理（首页） | ✅ 保留 |
| `/dashboard` | Dashboard | 同上（别名） | ✅ 保留 |
| `/projects/:id` | ProjectWorkspace | 项目工作区 | 🆕 新增 |
| `/assets` | Assets | 资产库 | ✅ 优化 |
| `/plugins` | Plugins | 插件市场 | ✅ 保留 |
| `/workflows` | Workflows | 工作流列表 | ✅ 保留 |
| `/workflows/new` | WorkflowEditor | 自定义工作流编辑 | ⚠️ 待实现 |
| `/workflows/:id` | WorkflowExecutor | 工作流执行器 | ✅ 优化 |
| `/settings` | Settings | 设置 | ✅ 保留 |
| `/about` | About | 关于 | ✅ 排除（不参与优化） |
| `/demo` | UIDemo | UI 演示 | ⚠️ 开发用，生产删除 |
| ~~`/projects`~~ | ~~Projects~~ | ~~项目管理~~ | ❌ 删除 |

### B. 核心依赖版本

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.x",
  "framer-motion": "^12.23.26",
  "lucide-react": "^0.344.0",
  "tailwindcss": "^4.0.0",
  "@radix-ui/react-*": "latest",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.0"
}
```

### C. 新增组件清单

| 组件名 | 文件路径 | 尺寸/位置 | 功能描述 |
|--------|---------|----------|---------|
| **RightSettingsPanel** | `components/workflow/RightSettingsPanel.tsx` | w-80 (320px) | 右侧属性面板：检查器、Prompt 编辑、生成设置、关联资产、生成按钮 |
| **ProgressOrb** | `components/common/ProgressOrb.tsx` | w-16 h-16 (64px)<br>固定右下角 | 状态球：队列数显示、进度圆环、脉动动画、点击展开任务列表 |
| **PanelCollapseButton** | 集成到 `WindowBar.tsx` | h-8 w-8 | 侧边栏收缩按钮（左/右独立控制） |
| **ViewModeToggle** | 集成到各页面 Header | - | 视图切换按钮组：卡片/列表切换 + 全屏 |
| **SceneCardGrid** | `components/workflow/SceneCardGrid.tsx` | Grid 布局 | 分镜卡片网格视图（响应式 3 列） |
| **SceneListView** | `components/workflow/SceneListView.tsx` | 列表布局 | 分镜列表视图（紧凑型） |

### D. 新增图标（lucide-react）

```tsx
import {
  Grid3x3,           // 卡片视图图标
  List,              // 列表视图图标
  PanelLeftOpen,     // 展开左侧栏
  PanelLeftClose,    // 收缩左侧栏
  PanelRightOpen,    // 展开右侧栏
  PanelRightClose,   // 收缩右侧栏
  Maximize2,         // 全屏
  Play,              // 播放
  Sparkles           // 生成/AI 操作
} from 'lucide-react';
```

### E. 快捷键映射表

| 快捷键 | 功能 | 作用范围 |
|--------|------|---------|
| `Ctrl+B` | 切换左侧边栏 | WorkflowExecutor |
| `Ctrl+Alt+B` | 切换右侧边栏 | WorkflowExecutor |
| `Ctrl+\` | 切换所有侧边栏 | WorkflowExecutor |
| `Ctrl+Shift+G` | 切换视图模式（卡片/列表） | WorkflowExecutor 各面板 |
| `F11` | 全屏切换 | 全局 |
| `Ctrl+N` | 新建项目 | Dashboard |
| `Ctrl+O` | 打开项目 | Dashboard |
| `Ctrl+,` | 打开设置 | 全局 |

### F. 参考文档

- `docs/08-ui-design-specification-v1.0.0.md` - UI 设计规范
- `docs/references/UI/V2/` - V2 设计参考实现
- `docs/references/UI/Matrix Meun Flow.jpg` - 功能流程图（用户提供）
- `docs/references/UI/pannel.png` - 右侧面板参考截图（用户提供）
- `docs/references/UI/ListView.png` - 列表视图参考截图（用户提供）
- `docs/01-architecture-design-v1.0.0.md` - 架构设计
- `docs/05-project-structure-v1.0.1.md` - 项目结构

---

**文档维护**: MATRIX Studio 开发团队
**最后更新**: 2025-12-28
**下次审查**: 功能实施前

**备注**: 本文档已根据用户提供的 UI 截图（pannel.png, ListView.png）更新，补充了三栏布局、右侧属性面板、状态球、侧边栏收缩、视图模式切换等关键功能设计。

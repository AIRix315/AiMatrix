# Phase 9 代码参考文档
**版本**: v1.0.0
**日期**: 2025-12-28
**用途**: 为 TODO.md 中的 Phase 9 任务提供详细的代码示例和架构设计参考

---

## 📋 索引

- [REF-001] ProjectConfig 扩展字段定义
- [REF-002] AssetMetadata 扩展字段定义
- [REF-003] WorkflowState 接口定义
- [REF-004] 项目选择对话框UI实现
- [REF-005] WorkflowHeader 组件完整实现
- [REF-006] 步骤条点击逻辑实现
- [REF-007] ProgressOrb 半圆形状和潮汐动画
- [REF-008] ViewSwitcher 全局组件
- [REF-009] react-window 虚拟滚动集成
- [REF-010] ShortcutManager 服务完整实现
- [REF-011] GlobalNav 三区域重构
- [REF-012] ShortcutNavItem 长按编辑组件
- [REF-013] API Provider 统一配置模型
- [REF-014] ModelRegistry 数据结构
- [REF-015] 场景/角色 customFields Schema
- [REF-016] API 密钥加密实现

---

## REF-001: ProjectConfig 扩展字段定义

**位置**: `src/common/types.ts` (ProjectConfig接口)
**审核报告参考**: A1.项目管理 - 核心架构缺失, UI-2

### 需要添加的字段

```typescript
export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  workflows: string[];
  assets: AssetConfig[];

  // ========== 新增字段 (H0.1) ==========

  // 工作流识别字段（UI-2）
  workflowType?: string;           // 'novel-to-video' | 'custom' | ...
  pluginId?: string;               // 使用的插件ID（如果是插件工作流）
  currentWorkflowInstanceId?: string; // 当前关联的工作流实例
  status?: 'in-progress' | 'completed' | 'archived'; // 项目状态

  // 资源绑定字段
  inputAssets: string[];   // 引用的输入资源ID列表（用户上传的原始资源）
  outputAssets: string[];  // 该项目生成的输出资源ID列表（AI生成资源）
  immutable: boolean;      // 项目完成后不可修改标志
}
```

### 实现方法签名

```typescript
// ProjectManager.ts 新增方法
class ProjectManager {
  /**
   * 添加输入资源引用
   * @param projectId 项目ID
   * @param assetId 资源ID
   */
  async addInputAsset(projectId: string, assetId: string): Promise<void> {
    const project = await this.loadProject(projectId);
    if (!project.inputAssets.includes(assetId)) {
      project.inputAssets.push(assetId);
      await this.saveProject(projectId, project);
    }
  }

  /**
   * 添加输出资源
   * @param projectId 项目ID
   * @param assetId 资源ID（项目生成的资源）
   */
  async addOutputAsset(projectId: string, assetId: string): Promise<void> {
    const project = await this.loadProject(projectId);
    if (!project.outputAssets.includes(assetId)) {
      project.outputAssets.push(assetId);
      await this.saveProject(projectId, project);
    }
  }

  /**
   * 安全删除项目
   * @param id 项目ID
   * @param deleteOutputs 是否删除输出资源（默认询问用户）
   */
  async deleteProject(id: string, deleteOutputs: boolean = false): Promise<void> {
    const project = await this.loadProject(id);

    // 严禁删除 inputAssets（可能被其他项目引用）
    // 仅在用户确认时删除 outputAssets
    if (deleteOutputs && project.outputAssets.length > 0) {
      for (const assetId of project.outputAssets) {
        // 确保只删除属于当前项目的资源
        const asset = await assetManager.getAsset(assetId);
        if (asset.projectId === id) {
          await assetManager.removeAsset(assetId);
        }
      }
    }

    // 删除项目元数据
    await this.removeProjectMetadata(id);
  }
}
```

---

## REF-002: AssetMetadata 扩展字段定义

**位置**: `src/shared/types/asset.ts`
**审核报告参考**: A2.资源库 - 核心架构缺失

### 扩展接口

```typescript
export interface AssetMetadata {
  id: string;
  type: AssetType;
  path: string;
  name: string;
  tags: string[];
  createdAt: string; // ISO 8601时间戳（TimeService提供）
  updatedAt: string;

  // ========== 新增字段 (H0.2) ==========

  projectId?: string;        // 项目ID（项目生成的资源必填）
  isUserUploaded: boolean;   // true: 用户上传, false: 项目生成

  // 传统媒体属性
  duration?: number;
  dimensions?: { width: number; height: number };

  // 其他元数据
  [key: string]: any;
}
```

### 文件组织结构

```
WorkSpace/
├── assets/
│   ├── user_uploaded/           # 用户上传的原始资源（全局池）
│   │   └── old_photo.jpg
│   └── project_outputs/         # 项目生成的资源
│       └── proj-001/
│           ├── 20250101/        # 按日期文件夹分隔
│           │   ├── scene_proj-001-scene-001.png
│           │   ├── scene_proj-001-scene-001.json  # Sidecar元数据
│           │   └── char_proj-001-char-001.png
│           ├── 20250102/
│           │   └── scene_proj-001-scene-002.png
│           └── index.json       # 项目资产轻量索引
└── projects/
    └── proj-001/
        └── project.json
```

### 资源保存路径逻辑

```typescript
// AssetManager.ts
class AssetManager {
  /**
   * 获取资源保存路径
   */
  private getAssetSavePath(asset: Partial<AssetMetadata>): string {
    if (asset.isUserUploaded) {
      // 用户上传资源
      return path.join(
        this.workspacePath,
        'assets',
        'user_uploaded',
        asset.name || `asset-${asset.id}`
      );
    } else {
      // 项目生成资源
      const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      return path.join(
        this.workspacePath,
        'assets',
        'project_outputs',
        asset.projectId!,
        today,
        `${asset.type}_${asset.id}.${this.getExtension(asset)}`
      );
    }
  }

  /**
   * 扩展scanAssets方法，支持项目作用域过滤
   */
  async scanAssets(
    scope: 'global' | 'project',
    projectId?: string,
    filter?: AssetFilter,
    page?: number,
    pageSize?: number
  ): Promise<AssetScanResult> {
    if (scope === 'project' && projectId) {
      // 项目作用域：读取 project.json 获取 inputAssets 和 outputAssets
      const project = await projectManager.loadProject(projectId);
      const assetIds = [...project.inputAssets, ...project.outputAssets];

      // 根据ID列表获取资源
      const assets = await this.getAssetsByIds(assetIds, filter);
      return this.paginateAssets(assets, page, pageSize);
    } else {
      // 全局作用域：返回所有资源
      return this.scanAllAssets(filter, page, pageSize);
    }
  }

  /**
   * 追踪资源引用关系
   */
  async getAssetReferences(assetId: string): Promise<ProjectConfig[]> {
    const allProjects = await projectManager.listProjects();
    return allProjects.filter(
      (project) => project.inputAssets.includes(assetId)
    );
  }
}
```

---

## REF-003: WorkflowState 接口定义

**位置**: `src/shared/types/workflow.ts`
**审核报告参考**: A4.工作台 - 核心架构缺失

### 完整接口定义

```typescript
export interface WorkflowState {
  instanceId: string;
  workflowType: string;        // 'novel-to-video', 'custom'
  currentStepIndex: number;

  // ========== 新增字段 (H0.3) ==========
  projectId: string;           // 必填！绑定的项目ID

  steps: WorkflowStep[];
  data: Record<string, any>;
  createdAt: string;           // ISO 8601时间戳
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  data?: Record<string, any>;
}
```

### WorkflowStateManager 方法签名修改

```typescript
// src/main/services/WorkflowStateManager.ts
class WorkflowStateManager {
  /**
   * 创建工作流实例（修改签名，增加 projectId 参数）
   * @param type 工作流类型
   * @param projectId 绑定的项目ID（必填）
   */
  async createInstance(type: string, projectId: string): Promise<WorkflowState> {
    const instanceId = this.generateInstanceId();
    const definition = workflowRegistry.getDefinition(type);

    const state: WorkflowState = {
      instanceId,
      workflowType: type,
      projectId,              // 记录项目绑定
      currentStepIndex: 0,
      steps: definition.steps.map(s => ({
        id: s.id,
        name: s.name,
        status: 'pending'
      })),
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveState(instanceId, state);
    return state;
  }

  /**
   * 保存工作流状态时记录 projectId
   */
  async saveState(instanceId: string, state: WorkflowState): Promise<void> {
    // 确保 projectId 存在
    if (!state.projectId) {
      throw new Error('WorkflowState must have projectId');
    }

    // 保存状态到文件
    const statePath = this.getStatePath(instanceId);
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  }
}
```

---

## REF-004: 项目选择对话框UI实现

**位置**: `src/renderer/pages/workflows/Workflows.tsx`
**审核报告参考**: A4.工作台 - 核心架构缺失

### 项目选择对话框组件

```tsx
// src/renderer/components/workflow/ProjectSelectorDialog.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Loading } from '../common';

interface ProjectSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (projectName: string) => void;
  workflowType: string;
  pluginId?: string;
}

export const ProjectSelectorDialog: React.FC<ProjectSelectorDialogProps> = ({
  isOpen,
  onClose,
  onSelectProject,
  onCreateProject,
  workflowType,
  pluginId
}) => {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, workflowType, pluginId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await window.electronAPI.listProjects();

      // 筛选：当前插件/工作流类型支持的项目
      const filteredProjects = allProjects.filter(
        (p) => p.workflowType === workflowType && p.pluginId === pluginId
      );

      setProjects(filteredProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const project = await window.electronAPI.createProject({
        name: newProjectName,
        workflowType,
        pluginId
      });
      onCreateProject(project.id);
      onClose();
    } catch (error) {
      console.error('创建项目失败:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="选择或创建项目">
      <div className="project-selector-dialog">
        {loading ? (
          <Loading message="加载项目列表..." />
        ) : (
          <>
            {/* 已有项目列表 */}
            <div className="project-list">
              <h3>选择已有项目</h3>
              {projects.length === 0 ? (
                <p className="empty-hint">暂无相关项目</p>
              ) : (
                <div className="project-grid">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      className="project-item"
                      onClick={() => {
                        onSelectProject(project.id);
                        onClose();
                      }}
                    >
                      <div className="project-name">{project.name}</div>
                      <div className="project-status">
                        状态: {project.status === 'in-progress' ? '进行中' : '已完成'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 新建项目表单 */}
            <div className="create-project-section">
              <Button
                variant="ghost"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                + 新建项目
              </Button>

              {showCreateForm && (
                <div className="create-form">
                  <input
                    type="text"
                    placeholder="输入项目名称"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <Button variant="primary" onClick={handleCreateProject}>
                    创建
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
```

### 集成到 Workflows.tsx

```tsx
// src/renderer/pages/workflows/Workflows.tsx (修改)
const Workflows: React.FC = () => {
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedWorkflowType, setSelectedWorkflowType] = useState('');

  const handleCreateWorkflowInstance = (type: string, name: string) => {
    // 先显示项目选择对话框
    setSelectedWorkflowType(type);
    setShowProjectSelector(true);
  };

  const handleProjectSelected = async (projectId: string) => {
    try {
      // 创建工作流实例（传入 projectId）
      const instance = await window.electronAPI.createWorkflowInstance({
        type: selectedWorkflowType,
        projectId  // 绑定项目
      });

      // 跳转到工作流执行页面
      navigate(`/workflows/${instance.id}`);
    } catch (error) {
      console.error('创建工作流实例失败:', error);
    }
  };

  return (
    <>
      {/* 原有UI */}

      {/* 项目选择对话框 */}
      <ProjectSelectorDialog
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        onSelectProject={handleProjectSelected}
        onCreateProject={(projectId) => handleProjectSelected(projectId)}
        workflowType={selectedWorkflowType}
      />
    </>
  );
};
```

---

## REF-005: WorkflowHeader 组件完整实现

**位置**: `src/renderer/components/workflow/WorkflowHeader.tsx` (新建)
**审核报告参考**: UI-1

### 完整组件代码

```tsx
import React from 'react';
import { PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { Button } from '../common';
import './WorkflowHeader.css';

interface WorkflowHeaderProps {
  workflowName: string;
  currentProjectId: string;
  projects: Array<{ id: string; name: string; status: string }>;
  onProjectChange: (projectId: string) => void;

  steps: Array<{ id: string; name: string; status: string }>;
  currentStepIndex: number;
  onStepClick: (index: number) => void;
  canClickStep: (index: number) => boolean;

  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onCloseAllPanels: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  workflowName,
  currentProjectId,
  projects,
  onProjectChange,
  steps,
  currentStepIndex,
  onStepClick,
  canClickStep,
  leftPanelCollapsed,
  rightPanelCollapsed,
  onToggleLeftPanel,
  onToggleRightPanel,
  onCloseAllPanels
}) => {
  return (
    <div className="workflow-header">
      {/* 左侧面板收缩按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="panel-toggle-btn"
        onClick={onToggleLeftPanel}
        title={leftPanelCollapsed ? '展开项目资源' : '收缩项目资源'}
      >
        {leftPanelCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </Button>

      {/* 项目选择器（下拉框）*/}
      <select
        className="project-selector"
        value={currentProjectId}
        onChange={(e) => onProjectChange(e.target.value)}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} {project.status === 'completed' ? '(已完成)' : ''}
          </option>
        ))}
      </select>

      {/* 工作流标题 */}
      <h2 className="workflow-title">{workflowName}</h2>

      {/* 步骤条（可点击）*/}
      <div className="step-bar">
        {steps.map((step, index) => (
          <button
            key={step.id}
            className={`step-item ${
              step.status === 'completed'
                ? 'completed'
                : index === currentStepIndex
                ? 'active'
                : 'pending'
            }`}
            onClick={() => onStepClick(index)}
            disabled={!canClickStep(index)}
          >
            {step.status === 'completed' ? '✓' : index + 1}
          </button>
        ))}
      </div>

      {/* 同时关闭两侧栏按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="close-all-btn"
        onClick={onCloseAllPanels}
        title="关闭所有侧边栏"
      >
        <X size={18} />
      </Button>

      {/* 右侧面板收缩按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="panel-toggle-btn"
        onClick={onToggleRightPanel}
        title={rightPanelCollapsed ? '展开属性面板' : '收缩属性面板'}
      >
        {rightPanelCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
      </Button>
    </div>
  );
};
```

---

## REF-006: 步骤条点击逻辑实现

**位置**: `src/renderer/pages/workflows/WorkflowExecutor.tsx`
**审核报告参考**: UI-5

### 步骤点击逻辑

```typescript
// WorkflowExecutor.tsx
const WorkflowExecutor: React.FC = () => {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>(null);

  /**
   * 判断步骤是否可点击
   */
  const canClickStep = (stepIndex: number): boolean => {
    if (!currentProject || !workflowState) return false;

    // 已完成项目: 所有步骤可点击
    if (currentProject.status === 'completed') {
      return true;
    }

    // 进行中项目: 当前步骤及之前的可点击
    return stepIndex <= workflowState.currentStepIndex;
  };

  /**
   * 处理步骤点击
   */
  const handleStepClick = (stepIndex: number) => {
    if (!canClickStep(stepIndex) || !workflowState) return;

    const steps = [...workflowState.steps];

    // 更新步骤状态
    steps[workflowState.currentStepIndex].status =
      stepIndex > workflowState.currentStepIndex ? 'completed' : 'pending';
    steps[stepIndex].status = 'in_progress';

    setWorkflowState({
      ...workflowState,
      currentStepIndex: stepIndex,
      steps
    });
  };

  return (
    <div className="workflow-executor">
      <WorkflowHeader
        steps={workflowState?.steps || []}
        currentStepIndex={workflowState?.currentStepIndex || 0}
        onStepClick={handleStepClick}
        canClickStep={canClickStep}
        {/* 其他props */}
      />
      {/* 其他内容 */}
    </div>
  );
};
```

---

## REF-007: ProgressOrb 半圆形状和潮汐动画

**位置**: `src/renderer/components/common/ProgressOrb.tsx`
**审核报告参考**: UI-3

### 组件完整实现

```tsx
import React, { useState } from 'react';
import Draggable from 'react-draggable';
import './ProgressOrb.css';

interface ProgressOrbProps {
  taskCount: number;
  progress: number; // 0-100
  isGenerating: boolean;
  onClickOrb: () => void; // 点击 → 打开右侧面板"队列"Tab
}

export const ProgressOrb: React.FC<ProgressOrbProps> = ({
  taskCount,
  progress,
  isGenerating,
  onClickOrb
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <Draggable
      axis="y"
      bounds="parent"
      position={position}
      onStop={(e, data) => setPosition({ x: 0, y: data.y })}
    >
      <div
        className={`progress-orb ${isGenerating ? 'generating' : ''}`}
        onClick={onClickOrb}
      >
        {/* 潮汐注水动画 */}
        <div className="water-container">
          <div
            className="water-fill"
            style={{ height: `${progress}%` }}
          >
            <div className="wave-animation" />
          </div>
        </div>

        {/* 任务数显示 */}
        <span className="task-count">{taskCount}</span>
      </div>
    </Draggable>
  );
};
```

### CSS 样式

```css
/* ProgressOrb.css */
.progress-orb {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);

  /* 半圆形状 */
  width: 80px;
  height: 80px;
  border-radius: 50% 0 0 50%; /* 左半圆 */

  background: var(--color-surface);
  border: 2px solid var(--color-border);
  cursor: pointer;
  overflow: hidden;

  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 1000;
}

/* 水位容器 */
.water-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 水位填充 */
.water-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(
    180deg,
    oklch(0.85 0.22 160) 0%,
    oklch(0.75 0.22 160) 100%
  );
  transition: height 0.3s ease;
}

/* 波浪动画 */
.wave-animation {
  position: absolute;
  top: -10px;
  left: -100%;
  width: 200%;
  height: 20px;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    oklch(0.9 0.22 160 / 0.5) 50%,
    transparent 100%
  );
  animation: wave 2s linear infinite;
}

@keyframes wave {
  0% {
    left: -100%;
  }
  100% {
    left: 0%;
  }
}

/* 任务数 */
.task-count {
  position: relative;
  z-index: 2;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text-primary);
}

/* 生成中脉动动画 */
.progress-orb.generating {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 oklch(0.85 0.22 160 / 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px oklch(0.85 0.22 160 / 0);
  }
}
```

---

## REF-008: ViewSwitcher 全局组件

**位置**: `src/renderer/components/common/ViewSwitcher.tsx` (新建)
**审核报告参考**: UI-6

### ViewSwitcher 组件

```tsx
import React from 'react';
import { Grid3x3, List } from 'lucide-react';
import './ViewSwitcher.css';

interface ViewSwitcherProps {
  viewMode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ viewMode, onChange }) => {
  return (
    <div className="view-switcher">
      <button
        className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => onChange('grid')}
        title="网格视图"
      >
        <Grid3x3 size={18} />
      </button>
      <button
        className={`view-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onChange('list')}
        title="列表视图"
      >
        <List size={18} />
      </button>
    </div>
  );
};
```

### ListView 组件（统一列表视图）

```tsx
// src/renderer/components/common/ListView.tsx
import React from 'react';
import './ListView.css';

interface ListViewItemProps {
  id: string;
  preview: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  onClick?: () => void;
}

export const ListViewItem: React.FC<ListViewItemProps> = ({
  preview,
  title,
  description,
  actions,
  onClick
}) => {
  return (
    <div className="list-item" onClick={onClick}>
      {/* 缩略图（64x64+ 等比缩放）*/}
      <img className="thumbnail" src={preview} alt={title} />

      <div className="info">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {actions && <div className="actions">{actions}</div>}
    </div>
  );
};
```

### CSS 样式

```css
/* ListView.css */
.list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.2s;
}

.list-item:hover {
  background: var(--color-surface-hover);
}

/* 响应式缩略图（最小64px，等比缩放）*/
.thumbnail {
  width: max(64px, calc(100vw / 40));
  height: max(64px, calc(100vw / 40));
  object-fit: contain; /* 等比缩放，保持宽高比 */
  background: var(--color-background);
  border-radius: 4px;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.info h3 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
```

---

## REF-009: react-window 虚拟滚动集成

**位置**: `src/renderer/components/AssetGrid/AssetGrid.tsx`
**审核报告参考**: A2.资源库 - 性能优化

### 完整实现方案

```bash
# 安装依赖
npm install react-window react-window-infinite-loader
npm install --save-dev @types/react-window
```

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { FixedSizeGrid } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import AutoSizer from 'react-virtualized-auto-sizer';

interface AssetGridVirtualizedProps {
  assets: AssetMetadata[];
  selectedIds: string[];
  onSelectAsset: (id: string) => void;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
}

export const AssetGridVirtualized: React.FC<AssetGridVirtualizedProps> = ({
  assets,
  selectedIds,
  onSelectAsset,
  onLoadMore,
  hasMore
}) => {
  const columnCount = 3;
  const rowCount = Math.ceil(assets.length / columnCount);
  const columnWidth = 320;
  const rowHeight = 280;

  // Cell渲染器
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= assets.length) return null;

    const asset = assets[index];
    const isSelected = selectedIds.includes(asset.id);

    return (
      <div style={style} className="asset-cell">
        <div
          className={`asset-card ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelectAsset(asset.id)}
        >
          <img
            src={asset.path}
            alt={asset.name}
            loading="lazy" // 懒加载
            className="asset-thumbnail"
          />
          <div className="asset-info">
            <h4>{asset.name}</h4>
            <span>{asset.type}</span>
          </div>
        </div>
      </div>
    );
  };

  // 判断某行是否已加载
  const isItemLoaded = (index: number) => {
    return !hasMore || index < rowCount;
  };

  // 加载更多行
  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    if (hasMore) {
      await onLoadMore();
    }
  };

  return (
    <div className="asset-grid-virtualized">
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={hasMore ? rowCount + 1 : rowCount}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <FixedSizeGrid
                ref={ref}
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={height}
                rowCount={rowCount}
                rowHeight={rowHeight}
                width={width}
                onItemsRendered={(gridData) => {
                  const {
                    visibleRowStartIndex,
                    visibleRowStopIndex,
                    overscanRowStartIndex,
                    overscanRowStopIndex
                  } = gridData;

                  onItemsRendered({
                    overscanStartIndex: overscanRowStartIndex,
                    overscanStopIndex: overscanRowStopIndex,
                    visibleStartIndex: visibleRowStartIndex,
                    visibleStopIndex: visibleRowStopIndex
                  });
                }}
              >
                {Cell}
              </FixedSizeGrid>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
};
```

### 父组件集成

```tsx
// Assets.tsx
const Assets: React.FC = () => {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const result = await window.electronAPI.scanAssets({
      page: nextPage,
      pageSize: 30
    });

    setAssets((prev) => [...prev, ...result.assets]);
    setHasMore(result.hasMore);
    setPage(nextPage);
  };

  return (
    <AssetGridVirtualized
      assets={assets}
      selectedIds={selectedAssetIds}
      onSelectAsset={handleSelectAsset}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
    />
  );
};
```

---

## REF-010: ShortcutManager 服务完整实现

**位置**: `src/main/services/ShortcutManager.ts` (新建)
**审核报告参考**: UI-7

### 完整服务代码

```typescript
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ShortcutItem, ShortcutType } from '../common/types';

export class ShortcutManager {
  private configPath: string;
  private shortcuts: ShortcutItem[] = [];

  constructor(private workspacePath: string) {
    this.configPath = path.join(workspacePath, 'config', 'shortcuts.json');
  }

  /**
   * 初始化（加载配置）
   */
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.shortcuts = JSON.parse(data);
    } catch (error) {
      // 配置文件不存在，使用空数组
      this.shortcuts = [];
    }
  }

  /**
   * 添加快捷方式
   */
  async addShortcut(
    type: ShortcutType,
    targetId: string,
    name: string,
    icon: string
  ): Promise<ShortcutItem> {
    // 检查是否已存在
    const existing = this.shortcuts.find(
      (s) => s.type === type && s.targetId === targetId
    );
    if (existing) {
      throw new Error('快捷方式已存在');
    }

    const shortcut: ShortcutItem = {
      id: uuidv4(),
      type,
      targetId,
      name,
      icon,
      order: this.shortcuts.length,
      createdAt: new Date().toISOString()
    };

    this.shortcuts.push(shortcut);
    await this.save();
    return shortcut;
  }

  /**
   * 删除快捷方式
   */
  async removeShortcut(shortcutId: string): Promise<void> {
    this.shortcuts = this.shortcuts.filter((s) => s.id !== shortcutId);

    // 重新调整order
    this.shortcuts.forEach((s, index) => {
      s.order = index;
    });

    await this.save();
  }

  /**
   * 调整快捷方式顺序
   * @param shortcutIds 新的顺序（快捷方式ID数组）
   */
  async reorderShortcuts(shortcutIds: string[]): Promise<void> {
    const newShortcuts: ShortcutItem[] = [];

    // 按新顺序重排
    shortcutIds.forEach((id, index) => {
      const shortcut = this.shortcuts.find((s) => s.id === id);
      if (shortcut) {
        shortcut.order = index;
        newShortcuts.push(shortcut);
      }
    });

    this.shortcuts = newShortcuts;
    await this.save();
  }

  /**
   * 列出所有快捷方式
   */
  async listShortcuts(): Promise<ShortcutItem[]> {
    return this.shortcuts.sort((a, b) => a.order - b.order);
  }

  /**
   * 初始化默认快捷方式（首次启动）
   */
  async initializeDefaultShortcuts(): Promise<void> {
    // 检查是否已有快捷方式
    if (this.shortcuts.length > 0) return;

    // 添加官方"小说转视频"插件
    await this.addShortcut(
      'plugin',
      'novel-to-video',
      '小说转视频',
      '📖'
    );
  }

  /**
   * 保存配置到文件
   */
  private async save(): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.shortcuts, null, 2),
      'utf-8'
    );
  }
}
```

---

## REF-011: GlobalNav 三区域重构

**位置**: `src/renderer/components/layout/GlobalNav.tsx`
**审核报告参考**: UI-7

### 重构后的组件

```tsx
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShortcutNavItem } from './ShortcutNavItem';
import type { ShortcutItem } from '../../common/types';
import './GlobalNav.css';

export const GlobalNav: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    const list = await window.electronAPI.listShortcuts();
    setShortcuts(list);
  };

  const handleDeleteShortcut = async (shortcutId: string) => {
    await window.electronAPI.removeShortcut(shortcutId);
    await loadShortcuts();
  };

  const handleReorderShortcuts = async (newOrder: string[]) => {
    await window.electronAPI.reorderShortcuts(newOrder);
    await loadShortcuts();
  };

  return (
    <nav className="global-nav">
      {/* ========== 固定区域（上方）========== */}
      <div className="nav-section-fixed nav-section-top">
        <NavLink to="/" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">项目</span>
        </NavLink>
        <NavLink to="/assets" className="nav-item">
          <span className="nav-icon">🗂️</span>
          <span className="nav-label">资产库</span>
        </NavLink>
        <NavLink to="/workflows" className="nav-item">
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">工作台</span>
        </NavLink>
        <NavLink to="/plugins" className="nav-item">
          <span className="nav-icon">🔌</span>
          <span className="nav-label">插件市场</span>
        </NavLink>
      </div>

      {/* ========== 可编辑区域（中间）========== */}
      <div className="nav-section-shortcuts">
        {shortcuts.map((shortcut) => (
          <ShortcutNavItem
            key={shortcut.id}
            shortcut={shortcut}
            editMode={editMode}
            onDelete={() => handleDeleteShortcut(shortcut.id)}
            onDragEnd={handleReorderShortcuts}
            onLongPress={() => setEditMode(true)}
          />
        ))}
      </div>

      {/* ========== 固定区域（下方）========== */}
      <div className="nav-section-fixed nav-section-bottom">
        <NavLink to="/settings" className="nav-item">
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">设置</span>
        </NavLink>
        <NavLink to="/about" className="nav-item">
          <span className="nav-icon">ℹ️</span>
          <span className="nav-label">关于</span>
        </NavLink>
      </div>

      {/* 退出编辑模式遮罩 */}
      {editMode && (
        <div
          className="edit-mode-overlay"
          onClick={() => setEditMode(false)}
        />
      )}
    </nav>
  );
};
```

### CSS 样式

```css
/* GlobalNav.css */
.global-nav {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-border);
}

/* 固定区域 */
.nav-section-fixed {
  flex-shrink: 0;
}

.nav-section-top {
  padding: 16px 8px;
  border-bottom: 1px solid var(--color-border);
}

.nav-section-bottom {
  padding: 16px 8px;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}

/* 可编辑区域（支持滚动）*/
.nav-section-shortcuts {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 支持鼠标滚轮 */
.nav-section-shortcuts::-webkit-scrollbar {
  width: 4px;
}

.nav-section-shortcuts::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

/* 导航项 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-primary);
  color: var(--color-background);
}

.nav-icon {
  font-size: 1.5rem;
}

.nav-label {
  font-size: 0.875rem;
  font-weight: 500;
}
```

---

## REF-012: ShortcutNavItem 长按编辑组件

**位置**: `src/renderer/components/layout/ShortcutNavItem.tsx` (新建)
**审核报告参考**: UI-7

### 完整组件代码

```tsx
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import type { ShortcutItem } from '../../common/types';
import './ShortcutNavItem.css';

interface ShortcutNavItemProps {
  shortcut: ShortcutItem;
  editMode: boolean;
  onDelete: () => void;
  onDragEnd: (newOrder: string[]) => void;
  onLongPress: () => void;
}

const ItemType = 'SHORTCUT';

export const ShortcutNavItem: React.FC<ShortcutNavItemProps> = ({
  shortcut,
  editMode,
  onDelete,
  onDragEnd,
  onLongPress
}) => {
  const navigate = useNavigate();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [, drag] = useDrag({
    type: ItemType,
    item: { id: shortcut.id },
    canDrag: editMode
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (item: { id: string }) => {
      // 拖拽排序逻辑
      if (item.id !== shortcut.id) {
        // TODO: 调用 onDragEnd 更新顺序
      }
    }
  });

  const handleMouseDown = () => {
    if (editMode) return;

    // 500ms长按检测
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (editMode) return;

    // 跳转逻辑
    switch (shortcut.type) {
      case 'project':
        navigate(`/projects/${shortcut.targetId}`);
        break;
      case 'workflow':
        navigate(`/workflows/${shortcut.targetId}`);
        break;
      case 'plugin':
        navigate(`/plugins/${shortcut.targetId}`);
        break;
    }
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`shortcut-nav-item ${editMode ? 'shake' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      draggable={editMode}
    >
      <span className="shortcut-icon">{shortcut.icon}</span>
      <span className="shortcut-name">{shortcut.name}</span>

      {/* 编辑模式：显示删除按钮 */}
      {editMode && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
```

### CSS 样式（闪动动画）

```css
/* ShortcutNavItem.css */
.shortcut-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.shortcut-nav-item:hover {
  background: var(--color-surface-hover);
}

/* 长按编辑模式：闪动动画 */
.shortcut-nav-item.shake {
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
}

.shortcut-icon {
  font-size: 1.5rem;
}

.shortcut-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.delete-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-danger);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.shortcut-nav-item.shake .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--color-danger-hover);
}
```

---

## REF-013: API Provider 统一配置模型

**位置**: 创建 `plans/api-provider-architecture-v1.0.0.md` (新建)
**源文档**: `docs/06-core-services-design-v1.0.1.md` (第154-171行)

### 架构设计文档

```markdown
# API Provider 统一架构设计文档

**版本**: v1.0.0
**日期**: 2025-12-28
**基准文档**: `docs/06-core-services-design-v1.0.1.md`

## 一、核心问题

当前Settings页面将服务错误分类为"本地服务"和"云服务"，这是不合理的架构设计。

**问题示例**:
- ComfyUI 可以部署在云端（RunPod、Replicate）
- N8N 可以使用官方云服务 (n8n.cloud)
- Ollama 既可以本地运行，也可以云端部署

**本质**: 它们都是 **HTTP API 调用**，只是 `baseUrl` 不同。

## 二、统一配置模型

### 2.1 数据结构定义

```typescript
/**
 * API功能分类枚举
 */
export enum APICategory {
  IMAGE_GENERATION = 'image-generation',  // 图像生成
  VIDEO_GENERATION = 'video-generation',  // 视频生成
  AUDIO_GENERATION = 'audio-generation',  // 音频生成
  LLM = 'llm',                            // 大语言模型
  WORKFLOW = 'workflow',                  // 工作流编排
  TTS = 'tts',                            // 文字转语音
  STT = 'stt'                             // 语音转文字
}

/**
 * API Provider 统一配置接口
 */
export interface APIProviderConfig {
  id: string;                  // 唯一标识（如：'comfyui-local', 'comfyui-runpod'）
  name: string;                // 显示名称（如：'ComfyUI (本地)', 'ComfyUI (RunPod)'）
  category: APICategory;       // 功能分类
  baseUrl: string;             // API端点
  authType: 'bearer' | 'apikey' | 'basic' | 'none'; // 认证方式
  apiKey?: string;             // API密钥（加密存储）
  enabled: boolean;            // 是否启用

  // 成本估算（可选）
  costPerUnit?: number;        // 单位成本
  currency?: string;           // 货币单位（USD, CNY）

  // 高级配置（可选）
  timeout?: number;            // 超时时间（毫秒）
  headers?: Record<string, string>; // 自定义请求头
  models?: string[];           // 支持的模型列表
}
```

### 2.2 预定义Provider示例

```typescript
const DEFAULT_PROVIDERS: APIProviderConfig[] = [
  // 图像生成
  {
    id: 'comfyui-local',
    name: 'ComfyUI (本地)',
    category: APICategory.IMAGE_GENERATION,
    baseUrl: 'http://localhost:8188',
    authType: 'none',
    enabled: false
  },
  {
    id: 'comfyui-runpod',
    name: 'ComfyUI (RunPod)',
    category: APICategory.IMAGE_GENERATION,
    baseUrl: 'https://xxx-comfyui.runpod.io',
    authType: 'apikey',
    enabled: false
  },
  {
    id: 'stability-ai',
    name: 'Stability AI',
    category: APICategory.IMAGE_GENERATION,
    baseUrl: 'https://api.stability.ai',
    authType: 'apikey',
    enabled: false,
    costPerUnit: 0.004,
    currency: 'USD'
  },

  // 视频生成
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3',
    category: APICategory.VIDEO_GENERATION,
    baseUrl: 'https://api.runwayml.com',
    authType: 'bearer',
    enabled: false
  },

  // LLM
  {
    id: 'ollama-local',
    name: 'Ollama (本地)',
    category: APICategory.LLM,
    baseUrl: 'http://localhost:11434',
    authType: 'none',
    enabled: false
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: APICategory.LLM,
    baseUrl: 'https://api.openai.com/v1',
    authType: 'bearer',
    enabled: false
  },

  // 工作流编排
  {
    id: 'n8n-local',
    name: 'N8N (本地)',
    category: APICategory.WORKFLOW,
    baseUrl: 'http://localhost:5678',
    authType: 'apikey',
    enabled: false
  },
  {
    id: 'n8n-cloud',
    name: 'N8N (云端)',
    category: APICategory.WORKFLOW,
    baseUrl: 'https://xxx.app.n8n.cloud',
    authType: 'apikey',
    enabled: false
  }
];
```

## 三、Settings 页面重构

### 3.1 按功能分类展示

```tsx
// Settings.tsx
const ProviderSettings: React.FC = () => {
  const [providers, setProviders] = useState<APIProviderConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<APICategory>(
    APICategory.IMAGE_GENERATION
  );

  const categorizedProviders = useMemo(() => {
    return providers.filter((p) => p.category === selectedCategory);
  }, [providers, selectedCategory]);

  return (
    <div className="provider-settings">
      {/* 左侧分类导航 */}
      <aside className="category-sidebar">
        <button
          className={selectedCategory === APICategory.IMAGE_GENERATION ? 'active' : ''}
          onClick={() => setSelectedCategory(APICategory.IMAGE_GENERATION)}
        >
          📦 图像生成
        </button>
        <button
          className={selectedCategory === APICategory.VIDEO_GENERATION ? 'active' : ''}
          onClick={() => setSelectedCategory(APICategory.VIDEO_GENERATION)}
        >
          🎬 视频生成
        </button>
        <button
          className={selectedCategory === APICategory.LLM ? 'active' : ''}
          onClick={() => setSelectedCategory(APICategory.LLM)}
        >
          🤖 LLM推理
        </button>
        <button
          className={selectedCategory === APICategory.WORKFLOW ? 'active' : ''}
          onClick={() => setSelectedCategory(APICategory.WORKFLOW)}
        >
          🔗 工作流编排
        </button>
      </aside>

      {/* 右侧Provider配置列表 */}
      <div className="provider-list">
        {categorizedProviders.map((provider) => (
          <ProviderConfigCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
};
```

## 四、迁移方案

### 4.1 数据迁移

```typescript
// src/main/services/ConfigManager.ts
class ConfigManager {
  /**
   * 从旧配置迁移到新配置
   */
  async migrateOldProviders(): Promise<void> {
    const oldConfig = await this.getOldSettings();
    const newProviders: APIProviderConfig[] = [];

    // 迁移本地服务
    if (oldConfig.local?.comfyui) {
      newProviders.push({
        id: 'comfyui-local',
        name: 'ComfyUI (本地)',
        category: APICategory.IMAGE_GENERATION,
        baseUrl: oldConfig.local.comfyui.baseUrl,
        authType: 'none',
        enabled: oldConfig.local.comfyui.enabled
      });
    }

    // 迁移云服务
    if (oldConfig.cloud?.openai) {
      newProviders.push({
        id: 'openai',
        name: 'OpenAI',
        category: APICategory.LLM,
        baseUrl: oldConfig.cloud.openai.baseUrl,
        authType: 'bearer',
        apiKey: oldConfig.cloud.openai.apiKey,
        enabled: oldConfig.cloud.openai.enabled
      });
    }

    // 保存新配置
    await this.saveProviders(newProviders);
  }
}
```

### 4.2 兼容性保证

- 旧配置文件自动备份（config.backup.json）
- 首次启动时自动迁移
- 迁移失败时提示用户手动配置

## 五、扩展性设计

### 5.1 添加自定义Provider

```typescript
// Settings 页面提供"添加Provider"按钮
const handleAddCustomProvider = async () => {
  const newProvider: APIProviderConfig = {
    id: `custom-${Date.now()}`,
    name: '自定义Provider',
    category: APICategory.IMAGE_GENERATION,
    baseUrl: 'http://localhost:8080',
    authType: 'apikey',
    enabled: false
  };

  await window.electronAPI.addProvider(newProvider);
};
```

### 5.2 支持同类型多Provider

```typescript
// 用户可以配置多个ComfyUI实例
const providers = [
  { id: 'comfyui-local', name: 'ComfyUI (本地)', baseUrl: 'localhost:8188' },
  { id: 'comfyui-runpod-1', name: 'ComfyUI (RunPod 1)', baseUrl: 'xxx.runpod.io' },
  { id: 'comfyui-runpod-2', name: 'ComfyUI (RunPod 2)', baseUrl: 'yyy.runpod.io' }
];

// TaskScheduler 自动选择可用Provider
const availableProvider = await taskScheduler.selectProvider(
  APICategory.IMAGE_GENERATION,
  { preferLocal: true }
);
```
```

---

## REF-014: ModelRegistry 数据结构

**位置**: `src/main/services/ModelRegistry.ts` (新建), `config/models/default-models.json` (新建)
**审核报告参考**: A5.设置 - 模型注册表系统

### 数据模型定义

```typescript
/**
 * 模型定义接口
 */
export interface ModelDefinition {
  id: string;                  // 模型ID（唯一）
  name: string;                // 显示名称
  provider: string;            // 提供商ID（关联APIProviderConfig）
  category: APICategory;       // 功能分类
  official: boolean;           // 是否官方模型

  // 模型参数
  parameters: {
    maxTokens?: number;        // 最大Token数（LLM）
    contextWindow?: number;    // 上下文窗口（LLM）
    dimensions?: string[];     // 支持的尺寸（图像/视频）
    aspectRatios?: string[];   // 支持的宽高比
    fps?: number[];            // 帧率（视频）
  };

  // 元数据
  description?: string;        // 描述
  tags?: string[];             // 标签
  costPerUnit?: number;        // 单位成本
  currency?: string;           // 货币单位
}

/**
 * 用户模型配置（自定义和隐藏）
 */
export interface UserModelConfig {
  modelId: string;             // 模型ID
  hidden: boolean;             // 是否隐藏
  customParams?: any;          // 自定义参数
  alias?: string;              // 别名
}
```

### 默认模型配置文件

```json
// config/models/default-models.json
{
  "version": "1.0",
  "lastUpdated": "2025-12-28",
  "models": [
    {
      "id": "sd-xl-base-1.0",
      "name": "Stable Diffusion XL",
      "provider": "comfyui-local",
      "category": "image-generation",
      "official": true,
      "parameters": {
        "dimensions": ["1024x1024", "1152x896", "896x1152"],
        "aspectRatios": ["1:1", "4:3", "3:4", "16:9", "9:16"]
      },
      "description": "高质量图像生成模型",
      "tags": ["stable-diffusion", "sdxl", "image"]
    },
    {
      "id": "gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "provider": "openai",
      "category": "llm",
      "official": true,
      "parameters": {
        "maxTokens": 128000,
        "contextWindow": 128000
      },
      "costPerUnit": 0.01,
      "currency": "USD",
      "tags": ["gpt-4", "llm", "openai"]
    },
    {
      "id": "runway-gen3-alpha",
      "name": "Runway Gen-3 Alpha",
      "provider": "runway-gen3",
      "category": "video-generation",
      "official": true,
      "parameters": {
        "dimensions": ["1280x768", "768x1280"],
        "aspectRatios": ["16:9", "9:16"],
        "fps": [24, 30]
      },
      "costPerUnit": 0.05,
      "currency": "USD",
      "tags": ["runway", "video", "gen-3"]
    }
  ]
}
```

### ModelRegistry 服务实现

```typescript
// src/main/services/ModelRegistry.ts
import fs from 'fs/promises';
import path from 'path';
import type { ModelDefinition, UserModelConfig, APICategory } from '../common/types';

export class ModelRegistry {
  private models: ModelDefinition[] = [];
  private userConfigs: UserModelConfig[] = [];
  private defaultModelsPath: string;
  private userConfigPath: string;

  constructor(private workspacePath: string) {
    this.defaultModelsPath = path.join(__dirname, '../config/models/default-models.json');
    this.userConfigPath = path.join(workspacePath, 'config', 'user-models.json');
  }

  /**
   * 初始化（加载默认模型和用户配置）
   */
  async initialize(): Promise<void> {
    // 加载默认模型
    const defaultData = await fs.readFile(this.defaultModelsPath, 'utf-8');
    const defaultModels = JSON.parse(defaultData);
    this.models = defaultModels.models;

    // 加载用户配置
    try {
      const userData = await fs.readFile(this.userConfigPath, 'utf-8');
      this.userConfigs = JSON.parse(userData);
    } catch (error) {
      this.userConfigs = [];
    }
  }

  /**
   * 获取模型列表（智能过滤：只显示已配置Provider的模型）
   */
  async listModels(
    category?: APICategory,
    enabledProvidersOnly: boolean = true
  ): Promise<ModelDefinition[]> {
    let filteredModels = this.models;

    // 按分类过滤
    if (category) {
      filteredModels = filteredModels.filter((m) => m.category === category);
    }

    // 过滤已配置Provider的模型
    if (enabledProvidersOnly) {
      const enabledProviders = await this.getEnabledProviders();
      filteredModels = filteredModels.filter((m) =>
        enabledProviders.includes(m.provider)
      );
    }

    // 过滤隐藏的模型
    const hiddenIds = this.userConfigs.filter((c) => c.hidden).map((c) => c.modelId);
    filteredModels = filteredModels.filter((m) => !hiddenIds.includes(m.id));

    return filteredModels;
  }

  /**
   * 添加自定义模型
   */
  async addCustomModel(model: ModelDefinition): Promise<void> {
    // 检查ID是否重复
    if (this.models.some((m) => m.id === model.id)) {
      throw new Error('模型ID已存在');
    }

    this.models.push({ ...model, official: false });
    await this.saveUserConfig();
  }

  /**
   * 隐藏/显示模型
   */
  async toggleModelVisibility(modelId: string, hidden: boolean): Promise<void> {
    const existingConfig = this.userConfigs.find((c) => c.modelId === modelId);

    if (existingConfig) {
      existingConfig.hidden = hidden;
    } else {
      this.userConfigs.push({ modelId, hidden });
    }

    await this.saveUserConfig();
  }

  /**
   * 获取已启用的Provider列表
   */
  private async getEnabledProviders(): Promise<string[]> {
    const allProviders = await configManager.getProviders();
    return allProviders.filter((p) => p.enabled).map((p) => p.id);
  }

  /**
   * 保存用户配置
   */
  private async saveUserConfig(): Promise<void> {
    const dir = path.dirname(this.userConfigPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.userConfigPath,
      JSON.stringify(this.userConfigs, null, 2),
      'utf-8'
    );
  }
}
```

---

## REF-015: 场景/角色 customFields Schema

**位置**: `src/shared/types/asset.ts`
**审核报告参考**: A2.资源库 - 场景/角色素材专用管理

### Schema 定义

```typescript
/**
 * 场景专用字段
 */
export interface SceneCustomFields {
  environment: 'indoor' | 'outdoor';               // 环境
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'; // 时间
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'snowy'; // 天气
  location: string;                                 // 地点描述
  mood?: 'calm' | 'tense' | 'joyful' | 'sad';     // 氛围
  lighting?: string;                                // 光照描述
}

/**
 * 角色专用字段
 */
export interface CharacterCustomFields {
  gender: 'male' | 'female' | 'other';             // 性别
  age: number;                                      // 年龄
  appearance: string;                               // 外貌描述
  personality?: string;                             // 性格描述
  clothing?: string;                                // 服装描述
  height?: number;                                  // 身高（cm）
  bodyType?: 'slim' | 'average' | 'muscular' | 'heavyset'; // 体型
}
```

### AssetManager 扩展方法

```typescript
// src/main/services/AssetManager.ts
class AssetManager {
  /**
   * 创建场景资产
   */
  async createSceneAsset(
    projectId: string,
    name: string,
    imagePath: string,
    sceneData: SceneCustomFields
  ): Promise<AssetMetadata> {
    const asset: Partial<AssetMetadata> = {
      type: AssetType.IMAGE,
      name,
      path: imagePath,
      projectId,
      isUserUploaded: false,
      customFields: {
        assetSubType: 'scene',
        ...sceneData
      }
    };

    return this.addAsset(asset);
  }

  /**
   * 创建角色资产
   */
  async createCharacterAsset(
    projectId: string,
    name: string,
    imagePath: string,
    characterData: CharacterCustomFields
  ): Promise<AssetMetadata> {
    const asset: Partial<AssetMetadata> = {
      type: AssetType.IMAGE,
      name,
      path: imagePath,
      projectId,
      isUserUploaded: false,
      customFields: {
        assetSubType: 'character',
        ...characterData
      }
    };

    return this.addAsset(asset);
  }

  /**
   * 智能过滤场景资产
   */
  async searchScenes(filter: {
    environment?: 'indoor' | 'outdoor';
    timeOfDay?: string;
    weather?: string;
    location?: string;
  }): Promise<AssetMetadata[]> {
    const allAssets = await this.scanAssets('global');

    return allAssets.filter((asset) => {
      if (asset.customFields?.assetSubType !== 'scene') return false;

      const sceneData = asset.customFields as SceneCustomFields;

      if (filter.environment && sceneData.environment !== filter.environment) return false;
      if (filter.timeOfDay && sceneData.timeOfDay !== filter.timeOfDay) return false;
      if (filter.weather && sceneData.weather !== filter.weather) return false;
      if (filter.location && !sceneData.location.includes(filter.location)) return false;

      return true;
    });
  }

  /**
   * 智能过滤角色资产
   */
  async searchCharacters(filter: {
    gender?: 'male' | 'female' | 'other';
    ageRange?: [number, number];
    bodyType?: string;
  }): Promise<AssetMetadata[]> {
    const allAssets = await this.scanAssets('global');

    return allAssets.filter((asset) => {
      if (asset.customFields?.assetSubType !== 'character') return false;

      const charData = asset.customFields as CharacterCustomFields;

      if (filter.gender && charData.gender !== filter.gender) return false;
      if (filter.ageRange) {
        const [min, max] = filter.ageRange;
        if (charData.age < min || charData.age > max) return false;
      }
      if (filter.bodyType && charData.bodyType !== filter.bodyType) return false;

      return true;
    });
  }
}
```

---

## REF-016: API 密钥加密实现

**位置**: `src/main/services/ConfigManager.ts`
**审核报告参考**: A5.设置 - 安全性改进

### 加密实现代码

```typescript
import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

/**
 * API密钥加密工具类
 */
export class APIKeyEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor() {
    // 使用机器ID作为密钥种子（确保密钥在同一台机器上保持一致）
    const machineId = machineIdSync();
    this.key = crypto.scryptSync(machineId, 'matrix-salt', 32);
  }

  /**
   * 加密API密钥
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 返回格式: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密API密钥
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

/**
 * ConfigManager 扩展（加密存储API密钥）
 */
class ConfigManager {
  private encryption = new APIKeyEncryption();

  /**
   * 保存Provider配置（自动加密API密钥）
   */
  async saveProvider(provider: APIProviderConfig): Promise<void> {
    const providerToSave = { ...provider };

    // 加密API密钥
    if (providerToSave.apiKey) {
      providerToSave.apiKey = this.encryption.encrypt(providerToSave.apiKey);
    }

    // 保存到配置文件
    await this.saveConfig(providerToSave);
  }

  /**
   * 读取Provider配置（自动解密API密钥）
   */
  async getProvider(id: string): Promise<APIProviderConfig> {
    const provider = await this.loadProviderFromFile(id);

    // 解密API密钥
    if (provider.apiKey) {
      try {
        provider.apiKey = this.encryption.decrypt(provider.apiKey);
      } catch (error) {
        // 解密失败，可能是旧版本明文配置
        console.warn('Failed to decrypt API key, using as plaintext');
      }
    }

    return provider;
  }

  /**
   * 自动迁移明文配置到加密配置
   */
  async migrateToEncryptedKeys(): Promise<void> {
    const allProviders = await this.getAllProviders();

    for (const provider of allProviders) {
      if (provider.apiKey && !this.isEncrypted(provider.apiKey)) {
        // 检测到明文密钥，重新加密保存
        await this.saveProvider(provider);
      }
    }
  }

  /**
   * 判断字符串是否已加密
   */
  private isEncrypted(str: string): boolean {
    // 加密格式: iv:authTag:encrypted (3个部分，每部分都是hex)
    const parts = str.split(':');
    if (parts.length !== 3) return false;

    return parts.every((part) => /^[0-9a-f]+$/i.test(part));
  }
}
```

### 首次启动自动迁移

```typescript
// src/main/index.ts
app.on('ready', async () => {
  // ... 其他初始化

  // 自动迁移明文API密钥到加密存储
  const configManager = new ConfigManager();
  await configManager.migrateToEncryptedKeys();

  logger.info('API keys migrated to encrypted storage');
});
```

---

## 📄 文档版本信息

- **创建日期**: 2025-12-28
- **基准文档**:
  - `docs/06-core-services-design-v1.0.1.md`
  - `docs/02-technical-blueprint-v1.0.0.md`
  - `plans/implementation-audit-report-2025-12-28.md`
- **对应TODO版本**: Phase 9 (v0.2.9.8 - v0.3.5)
- **下次更新触发条件**: TODO任务执行过程中发现代码示例不足时

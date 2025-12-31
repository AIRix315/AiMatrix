/**
 * WorkflowExecutor - 工作流执行器页面
 *
 * 功能：动态显示工作流的各个步骤面板
 * H02 重构：三栏布局(左项目树 + 中内容区 + 右属性面板)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftOpen,
  PanelLeftClose
} from 'lucide-react';
import { Button, Loading, Toast, Modal } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import { useSelection } from '../../contexts/SelectionContext';
import { WorkflowHeader } from '../../components/workflow/WorkflowHeader';
import {
  ChapterSplitPanel,
  SceneCharacterPanel,
  StoryboardPanel,
  VoiceoverPanel,
  ExportPanel
} from './panels';
import { UnifiedAssetPanel, AssetCategoryId } from '../../components/UnifiedAssetPanel';
import { AssetMetadata, AssetFilter, AssetType } from '@/shared/types';
import './WorkflowExecutor.css';

interface WorkflowStep {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  status: 'pending' | 'in_progress' | 'completed';
}

interface WorkflowState {
  name: string;
  currentStepIndex: number;
  steps: WorkflowStep[];
  data: Record<string, any>;
}

const WorkflowExecutor: React.FC = () => {
  const { workflowId, pluginId } = useParams<{ workflowId?: string; pluginId?: string }>();
  // 统一处理：pluginId 和 workflowId 都可以作为工作流ID使用
  const actualWorkflowId = pluginId || workflowId;
  const navigate = useNavigate();
  const { setSelectedItem, setSelectedCount } = useSelection();
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 左侧面板状态（右侧面板改用全局控制）
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // 资产相关状态
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectedScope, setSelectedScope] = useState<'global' | 'project'>('project');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryId>('all');

  // 项目相关状态
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [currentProject, setCurrentProject] = useState<{ id: string; status: string } | null>(
    null
  );

  // 新建项目对话框状态
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // 当前步骤选中的项目
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<string[]>([]);

  // 构建资产过滤器
  const getAssetFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: selectedScope,
      projectId: selectedScope === 'project' ? currentProjectId : undefined,
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };

    // 全局Tab分类过滤
    if (selectedScope === 'global') {
      if (selectedCategory === 'input') {
        // 输入分类：过滤用户上传的资产
        filter.isUserUploaded = true;
      } else if (selectedCategory !== 'all') {
        // 文件类型分类
        filter.type = selectedCategory as AssetType;
      }
    }
    // 项目Tab分类过滤
    else if (selectedScope === 'project') {
      if (selectedCategory !== 'all') {
        // 工作流分类
        filter.category = selectedCategory;
      }
    }

    return filter;
  }, [selectedScope, selectedCategory, currentProjectId]);

  // 处理资产选择
  const handleAssetSelect = useCallback((asset: AssetMetadata, multiSelect: boolean) => {
    setSelectedAssets((prev) => {
      const newSet = new Set(prev);
      if (multiSelect) {
        if (newSet.has(asset.id)) {
          newSet.delete(asset.id);
        } else {
          newSet.add(asset.id);
        }
      } else {
        newSet.clear();
        newSet.add(asset.id);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    loadWorkflow();
  }, [actualWorkflowId]);

  // 更新当前项目对象
  useEffect(() => {
    const project = projects.find((p) => p.id === currentProjectId);
    setCurrentProject(project || null);
  }, [currentProjectId, projects]);

  /**
   * 页面加载时获取项目列表
   */
  useEffect(() => {
    loadProjects();
  }, []);

  /**
   * 加载工作流
   */
  const loadWorkflow = async () => {
    if (!actualWorkflowId) {
      setToast({ type: 'error', message: '工作流ID不存在' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // eslint-disable-next-line no-console
      console.log('WorkflowExecutor: 加载工作流', { workflowId: actualWorkflowId, isPlugin: !!pluginId });

      // 步骤1：先加载工作流实例（从文件系统）
      const workflowInstance = await window.electronAPI.loadWorkflow(actualWorkflowId);
      // eslint-disable-next-line no-console
      console.log('WorkflowExecutor: 工作流实例加载成功', {
        type: workflowInstance.type,
        name: workflowInstance.name
      });

      // 步骤2：用type查询工作流定义（从Registry）
      const definition = await window.electronAPI.getWorkflowDefinition(workflowInstance.type);
      // eslint-disable-next-line no-console
      console.log('WorkflowExecutor: 工作流定义获取成功', {
        definitionName: definition.name,
        stepCount: definition.steps.length
      });

      if (!definition) {
        // eslint-disable-next-line no-console
        console.error('WorkflowExecutor: 工作流定义不存在', { type: workflowInstance.type });
        setToast({ type: 'error', message: `工作流定义不存在: ${workflowInstance.type}` });
        setLoading(false);
        return;
      }

      // 组件映射表（将 componentType 字符串映射到实际组件）
      const componentMap: Record<string, React.ComponentType<any>> = {
        ChapterSplitPanel,
        SceneCharacterPanel,
        StoryboardPanel,
        VoiceoverPanel,
        ExportPanel
      };

      // 步骤3：合并定义和实例，创建工作流状态
      const workflow: WorkflowState = {
        name: workflowInstance.name || definition.name || '未命名工作流',
        currentStepIndex: 0,
        steps: definition.steps.map((step: any, index: number) => ({
          id: step.id,
          name: step.name,
          component: componentMap[step.componentType] || (() => <div>组件未找到: {step.componentType}</div>),
          status: index === 0 ? 'in_progress' : 'pending'
        })),
        data: definition.defaultState || {}
      };

      setWorkflowState(workflow);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载工作流失败:', error);
      setToast({
        type: 'error',
        message: `加载工作流失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载项目列表
   */
  const loadProjects = async () => {
    try {
      if (window.electronAPI?.listProjects) {
        const projectList = await window.electronAPI.listProjects();

        // 过滤只显示"小说转视频"类型的项目
        const novelProjects = projectList
          .filter((p: any) => p.workflowType === 'novel-to-video')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status || 'in-progress'
          }));

        setProjects(novelProjects);

        // 如果当前项目ID为空且有项目列表，设置第一个为当前项目
        if (!currentProjectId && novelProjects.length > 0) {
          setCurrentProjectId(novelProjects[0].id);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载项目列表失败:', error);
      setToast({
        type: 'error',
        message: '加载项目列表失败'
      });
    }
  };

  /**
   * 处理创建新项目
   */
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setToast({
        type: 'error',
        message: '请输入项目名称'
      });
      return;
    }

    try {
      setIsCreatingProject(true);

      // 创建项目（使用 novel-to-video 模板）
      if (window.electronAPI?.createProject) {
        await window.electronAPI.createProject(newProjectName, 'novel-to-video');

        // 重新加载项目列表
        await loadProjects();

        // 自动选择新创建的项目
        const updatedProjects = await window.electronAPI.listProjects();
        const newProject = updatedProjects.find(
          (p: any) => p.name === newProjectName && p.workflowType === 'novel-to-video'
        );

        if (newProject) {
          setCurrentProjectId(newProject.id);
        }

        // 关闭对话框
        setShowCreateProjectModal(false);
        setNewProjectName('');

        setToast({
          type: 'success',
          message: `项目 "${newProjectName}" 创建成功`
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: `创建项目失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  /**
   * 处理步骤完成
   */
  const handleStepComplete = async (data: any) => {
    if (!workflowState) return;

    const newData = { ...workflowState.data, ...data };
    const currentStepIndex = workflowState.currentStepIndex;
    const steps = [...workflowState.steps];

    // 标记当前步骤为已完成
    steps[currentStepIndex].status = 'completed';

    // 移动到下一步
    if (currentStepIndex < steps.length - 1) {
      steps[currentStepIndex + 1].status = 'in_progress';
      setWorkflowState({
        ...workflowState,
        currentStepIndex: currentStepIndex + 1,
        steps,
        data: newData
      });

      setToast({
        type: 'success',
        message: `${steps[currentStepIndex].name} 完成！`
      });
    } else {
      // 工作流完成
      setToast({
        type: 'success',
        message: '工作流执行完成！'
      });

      // 延迟跳转回工作流列表
      setTimeout(() => {
        navigate('/workflows');
      }, 2000);
    }

    // TODO: 保存工作流状态到主进程
    // await window.electronAPI.saveWorkflow(workflowId, { ...workflowState, data: newData });
  };

  /**
   * 处理返回上一步
   */
  const handleGoBack = () => {
    if (!workflowState || workflowState.currentStepIndex === 0) return;

    const steps = [...workflowState.steps];
    const currentStepIndex = workflowState.currentStepIndex;

    steps[currentStepIndex].status = 'pending';
    steps[currentStepIndex - 1].status = 'in_progress';

    setWorkflowState({
      ...workflowState,
      currentStepIndex: currentStepIndex - 1,
      steps
    });
  };

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

  /**
   * 处理项目切换
   */
  const handleProjectChange = async (projectId: string) => {
    // 检测是否为"新建项目"特殊值
    if (projectId === '__CREATE_NEW__') {
      setShowCreateProjectModal(true);
      return;
    }

    try {
      setCurrentProjectId(projectId);

      // 重新加载工作流（切换到新项目的工作流）
      // 这里需要根据projectId加载对应的工作流
      // 暂时只切换ID，后续可以扩展
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('切换项目失败:', error);
      setToast({
        type: 'error',
        message: '切换项目失败'
      });
    }
  };

  /**
   * 处理分镜选择变化 - 更新全局选中项
   */
  const handleStoryboardSelectionChange = (selectedIds: string[]) => {
    setSelectedStoryboardIds(selectedIds);

    // 更新全局选中状态
    if (!workflowState) return;

    const storyboards = workflowState.data.storyboards || [];
    const selectedStoryboards = storyboards.filter((sb: any) => selectedIds.includes(sb.id));

    if (selectedStoryboards.length === 1) {
      setSelectedItem({
        id: selectedStoryboards[0].id,
        name: selectedStoryboards[0].description,
        type: selectedStoryboards[0].type === 'image' ? '图片分镜' : '视频分镜',
        prompt: selectedStoryboards[0].prompt || '',
      });
      setSelectedCount(1);
    } else if (selectedStoryboards.length > 1) {
      setSelectedItem({
        id: 'batch',
        name: `已选中 ${selectedStoryboards.length} 个分镜`,
        type: '批量编辑',
        prompt: selectedStoryboards[0]?.prompt || '',
      });
      setSelectedCount(selectedStoryboards.length);
    } else {
      setSelectedItem(null);
      setSelectedCount(0);
    }
  };

  /**
   * 处理Prompt更新
   */
  const handlePromptChange = (prompt: string) => {
    if (!workflowState || selectedStoryboardIds.length === 0) return;

    const storyboards = workflowState.data.storyboards || [];
    const updatedStoryboards = storyboards.map((sb: any) =>
      selectedStoryboardIds.includes(sb.id) ? { ...sb, prompt } : sb
    );

    setWorkflowState({
      ...workflowState,
      data: {
        ...workflowState.data,
        storyboards: updatedStoryboards
      }
    });
  };

  /**
   * 处理生成设置更新
   */
  const handleSettingsChange = (settings: any) => {
    if (!workflowState || selectedStoryboardIds.length === 0) return;

    const storyboards = workflowState.data.storyboards || [];
    const updatedStoryboards = storyboards.map((sb: any) =>
      selectedStoryboardIds.includes(sb.id) ? { ...sb, settings } : sb
    );

    setWorkflowState({
      ...workflowState,
      data: {
        ...workflowState.data,
        storyboards: updatedStoryboards
      }
    });
  };


  if (loading) {
    return <Loading size="lg" message="加载工作流..." fullscreen />;
  }

  if (!workflowState) {
    return (
      <div className="workflow-executor-error">
        <h2>工作流不存在</h2>
        <Button variant="primary" onClick={() => navigate('/workflows')}>
          返回工作流列表
        </Button>
      </div>
    );
  }

  const currentStep = workflowState.steps[workflowState.currentStepIndex];
  const CurrentPanelComponent = currentStep.component;

  return (
    <div className="workflow-executor">
      {/* 左侧：统一资源栏 */}
      <AnimatePresence>
        {!leftPanelCollapsed && (
          <motion.aside
            className="workflow-left-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <UnifiedAssetPanel
              selectedScope={selectedScope}
              selectedCategory={selectedCategory}
              currentProjectId={currentProjectId}
              showProjectSelector={false}
              onScopeChange={setSelectedScope}
              onCategoryChange={setSelectedCategory}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 中间：统一头部 + 内容区 */}
      <div className="workflow-middle-column">
        {/* 统一头部组件 */}
        <WorkflowHeader
          currentProjectId={currentProjectId}
          projects={projects}
          onProjectChange={handleProjectChange}
          steps={workflowState.steps}
          currentStepIndex={workflowState.currentStepIndex}
          onStepClick={handleStepClick}
          canClickStep={canClickStep}
          leftPanelCollapsed={leftPanelCollapsed}
          rightPanelCollapsed={false}
          onToggleLeftPanel={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          onToggleRightPanel={() => {}}
          onCloseAllPanels={() => setLeftPanelCollapsed(true)}
        />

        {/* 当前步骤面板 */}
        <div className="workflow-content-area">
          {!currentProjectId || currentProjectId === '__CREATE_NEW__' ? (
            // 空状态引导
            <div className="empty-state-guide">
              <div className="empty-icon">📁</div>
              <h2>开始使用小说转视频</h2>
              <p>请先创建或选择一个项目</p>
              <Button
                variant="primary"
                onClick={() => setShowCreateProjectModal(true)}
                className="mt-4"
              >
                + 新建项目
              </Button>
              {projects.length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  或从上方下拉框中选择现有项目
                </p>
              )}
            </div>
          ) : (
            // 原有的步骤面板组件
            <CurrentPanelComponent
              workflowId={actualWorkflowId || ''}
              onComplete={handleStepComplete}
              initialData={workflowState.data}
              onStoryboardSelectionChange={
                currentStep.id === 'generate-storyboard'
                  ? handleStoryboardSelectionChange
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* 新建项目对话框 */}
      <Modal
        isOpen={showCreateProjectModal}
        title="新建小说转视频项目"
        onClose={() => {
          setShowCreateProjectModal(false);
          setNewProjectName('');
        }}
        width="400px"
      >
        <div className="form-group">
          <label htmlFor="new-project-name">项目名称</label>
          <input
            id="new-project-name"
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="例如：我的第一个小说"
            className="input-field"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateProject();
              }
            }}
          />
          <p className="text-sm text-muted-foreground mt-2">
            项目将自动创建章节、场景、角色、分镜、配音等文件夹
          </p>
        </div>

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={() => {
              setShowCreateProjectModal(false);
              setNewProjectName('');
            }}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateProject}
            disabled={!newProjectName.trim() || isCreatingProject}
          >
            {isCreatingProject ? '创建中...' : '创建项目'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowExecutor;

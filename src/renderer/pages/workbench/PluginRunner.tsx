import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Loading, Toast, Modal } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import { useSelection } from '../../contexts/SelectionContext';
import { useProject } from '../../contexts/ProjectContext';
import { FlowHeader } from '../../components/flow/FlowHeader';
import {
  ChapterSplitPanel,
  SceneCharacterPanel,
  StoryboardPanel,
  VoiceoverPanel,
  ExportPanel,
  RemoteControlPanel
} from './panels';
import { UnifiedAssetPanel, AssetCategoryId } from '../../components/UnifiedAssetPanel';
import { AssetMetadata, AssetFilter, AssetType } from '@/shared/types';
import './PluginRunner.css';

interface WorkflowStep {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  status: 'pending' | 'in_progress' | 'completed';
  subSteps?: Array<{
    id: string;
    name: string;
    status: string;
    componentType: string;
    config?: Record<string, unknown>;
  }>;
  supportsViewSwitch?: boolean;
  componentType?: string;
}

interface WorkflowState {
  name: string;
  currentStepIndex: number;
  steps: WorkflowStep[];
  data: Record<string, unknown>;
}

const PluginRunner: React.FC = () => {
  const { workflowId, pluginId } = useParams<{ workflowId?: string; pluginId?: string }>();
  const navigate = useNavigate();
  const { setSelectedItem, setSelectedCount } = useSelection();
  const { updateProjectId } = useProject();
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [_leftPanelCollapsed, _setLeftPanelCollapsed] = useState(true);
  const [_selectedAssets, _setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectedScope, _setSelectedScope] = useState<'global' | 'project'>('project');
  const [selectedCategory, _setSelectedCategory] = useState<AssetCategoryId>('all');
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [actualWorkflowId, setActualWorkflowId] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; status: string; pluginId?: string; workflowType?: string }>>([]);
  const [currentProject, setCurrentProject] = useState<{ id: string; status: string } | null>(
    null
  );
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<string[]>([]);
  /** 当前子步骤索引（-1表示无子步骤或在主步骤视图） */
  const [currentSubStepIndex, setCurrentSubStepIndex] = useState(-1);

  /** 全局视图模式（提升到WorkflowExecutor层） */
  const [_viewMode, _setViewMode] = useState<'grid' | 'list'>('grid');

  /** 全屏状态 */
  const [_isFullscreen, _setIsFullscreen] = useState(false);
  const _getAssetFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: selectedScope,
      projectId: selectedScope === 'project' ? currentProjectId : undefined,
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };
    if (selectedScope === 'global') {
      if (selectedCategory === 'input') {
        filter.isUserUploaded = true;
      } else if (selectedCategory !== 'all') {
        filter.type = selectedCategory as AssetType;
      }
    }
    else if (selectedScope === 'project') {
      if (selectedCategory !== 'all') {
        filter.category = selectedCategory;
      }
    }

    return filter;
  }, [selectedScope, selectedCategory, currentProjectId]);
  const _handleAssetSelect = useCallback((asset: AssetMetadata, multiSelect: boolean) => {
    _setSelectedAssets((prev) => {
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
  }, [workflowId, pluginId, currentProjectId]);
  useEffect(() => {
    const project = projects.find((p) => p.id === currentProjectId);
    setCurrentProject(project || null);
  }, [currentProjectId, projects]);

  /**
   * 页面加载时获取项目列表
   */
  useEffect(() => {
    loadProjects();
  }, [workflowId, pluginId, currentProjectId]);
  useEffect(() => {
    const savedMode = localStorage.getItem('workflow-view-mode');
    if (savedMode === 'grid' || savedMode === 'list') {
      _setViewMode(savedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workflow-view-mode', _viewMode);
  }, [_viewMode]);
  useEffect(() => {
    const handleFullscreenChange = () => {
      _setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  useEffect(() => {
    if (!workflowState) return;

    const currentStep = workflowState.steps[workflowState.currentStepIndex];
    const hasSubSteps = currentStep?.subSteps && currentStep.subSteps.length > 0;
    setCurrentSubStepIndex(hasSubSteps ? 0 : -1);
  }, [workflowState?.currentStepIndex]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        const currentStep = workflowState?.steps[workflowState.currentStepIndex];
        if (currentStep?.supportsViewSwitch) {
          handleViewModeChange(_viewMode === 'grid' ? 'list' : 'grid');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [_viewMode, workflowState]);

  const loadWorkflow = async () => {
    if (pluginId && !workflowId) {
      await loadProjects();
      const matchedProjects = projects.filter(p => p.pluginId === pluginId || p.workflowType === pluginId);

      if (matchedProjects.length === 1) {
        setCurrentProjectId(matchedProjects[0].id);
      } else if (matchedProjects.length === 0) {
        setLoading(false);
        return;
      } else {
        setLoading(false);
        return;
      }
    }

    if (!currentProjectId && !workflowId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let resolvedWorkflowId;
      if (workflowId) {
        resolvedWorkflowId = workflowId;
      } else {
        const project = await window.electronAPI.loadProject(currentProjectId);
        resolvedWorkflowId = project.workflows[0];
      }

      setActualWorkflowId(resolvedWorkflowId);

      console.log('WorkflowExecutor: 加载工作流', { workflowId: resolvedWorkflowId, isPlugin: !!pluginId });
      const workflowInstance = await window.electronAPI.loadWorkflowInstance(resolvedWorkflowId) as any;
      console.log('WorkflowExecutor: 工作流实例加载成功', {
        type: (workflowInstance as any).type,
        name: (workflowInstance as any).name,
        projectId: (workflowInstance as any).projectId
      });
      const definition = await window.electronAPI.getWorkflowDefinition((workflowInstance as any).type) as any;
      console.log('WorkflowExecutor: 工作流定义获取成功', {
        definitionName: (definition as any).name,
        stepCount: (definition as any).steps.length
      });

      if (!definition) {
        console.error('WorkflowExecutor: 工作流定义不存在', { type: (workflowInstance as any).type });
        setToast({ type: 'error', message: `工作流定义不存在: ${(workflowInstance as any).type}` });
        setLoading(false);
        return;
      }
      const componentMap: Record<string, React.ComponentType<any>> = {
        ChapterSplitPanel,
        SceneCharacterPanel,
        StoryboardPanel,
        VoiceoverPanel,
        ExportPanel,
        RemoteControlPanel
      };
      let savedState: any = null;
      try {
        savedState = await window.electronAPI.loadWorkflowState(resolvedWorkflowId);
        console.log('WorkflowExecutor: 已保存状态加载成功', {
          currentStep: savedState?.currentStep,
          hasData: !!savedState?.data
        });
      } catch (error) {
        console.log('WorkflowExecutor: 无已保存状态，将创建新状态', { error });
      }

      let workflow: WorkflowState;
      if (savedState && savedState.currentStep !== undefined) {
        workflow = {
          name: (workflowInstance as any).name || (definition as any).name || '未命名工作流',
          currentStepIndex: savedState.currentStep,
          steps: (definition as any).steps.map((step: any, index: number) => ({
            id: (step as any).id,
            name: (step as any).name,
            component: componentMap[(step as any).componentType] || (() => <div>组件未找到: {(step as any).componentType}</div>),
            status: savedState.steps?.[step.id]?.status ||
                   (index < savedState.currentStep ? 'completed' :
                   index === savedState.currentStep ? 'in_progress' : 'pending')
          })),
          data: savedState.data || {}
        };
        console.log('WorkflowExecutor: 状态恢复完成', {
          currentStepIndex: workflow.currentStepIndex,
          dataKeys: Object.keys(workflow.data)
        });
      } else {
        workflow = {
          name: (workflowInstance as any).name || (definition as any).name || '未命名工作流',
          currentStepIndex: 0,
          steps: (definition as any).steps.map((step: any, index: number) => ({
            id: (step as any).id,
            name: (step as any).name,
            component: componentMap[(step as any).componentType] || (() => <div>组件未找到: {(step as any).componentType}</div>),
            status: index === 0 ? 'in_progress' : 'pending'
          })),
          data: (definition as any).defaultState || {}
        };

        try {
          await window.electronAPI.saveWorkflowState(resolvedWorkflowId, {
            flowId: resolvedWorkflowId,
            projectId: (workflowInstance as any).projectId,
            currentStep: 0,
            steps: {},
            data: workflow.data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log('WorkflowExecutor: 初始状态保存成功');
        } catch (saveError) {
          console.error('WorkflowExecutor: 保存初始状态失败', saveError);
        }
      }

      setWorkflowState(workflow);
    } catch (error) {
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
        const filteredProjects = projectList
          .filter((p: any) => {
            // 根据路由类型使用不同的筛选逻辑
            if (workflowId) {
              // 通过 /workflows/:workflowId 访问，查找包含该工作流的项目
              return p.workflows && p.workflows.includes(workflowId);
            }
            if (pluginId) {
              // 通过 /plugins/:pluginId 访问，按插件ID或工作流类型筛选
              return p.pluginId === pluginId || p.workflowType === pluginId;
            }
            // 默认筛选所有 novel-to-video 项目
            return p.workflowType === 'novel-to-video';
          })
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status || 'in-progress'
          }));

        setProjects(filteredProjects);
        if (!currentProjectId && filteredProjects.length > 0) {
          setCurrentProjectId(filteredProjects[0].id);
        }
      }
    } catch (error) {
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
      if (window.electronAPI?.createProject) {
        await window.electronAPI.createProject(newProjectName, 'novel-to-video');
        await loadProjects();
        const updatedProjects = await window.electronAPI.listProjects();
        const newProject = updatedProjects.find(
          (p: any) => p.name === newProjectName && p.workflowType === 'novel-to-video'
        );

        if (newProject) {
          setCurrentProjectId((newProject as any).id);
        }
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
  const handleStepComplete = async (data: unknown) => {
    if (!workflowState || !actualWorkflowId) return;

    const currentStepIndex = workflowState.currentStepIndex;
    const currentStep = workflowState.steps[currentStepIndex];
    const newData = { ...workflowState.data, ...(data as any) };
    const nextStepIndex = currentStepIndex + 1;

    try {
      // 持久化步骤状态到后端
      await window.electronAPI.updateWorkflowStepStatus(
        actualWorkflowId,
        currentStep.id,
        'completed',
        data
      );

      // 持久化全局工作流状态
      const updatedSteps = { ...workflowState.steps.reduce((acc, step) => {
        acc[step.id] = { status: step.status };
        return acc;
      }, {} as Record<string, any>) };
      updatedSteps[currentStep.id] = { status: 'completed', data };

      await window.electronAPI.saveWorkflowState(actualWorkflowId, {
        flowId: actualWorkflowId,
        projectId: currentProjectId,
        currentStep: nextStepIndex,
        steps: updatedSteps,
        data: newData,
        updatedAt: new Date().toISOString()
      });

      // 更新当前步骤索引
      await window.electronAPI.updateWorkflowCurrentStep(actualWorkflowId, nextStepIndex);

      console.log('WorkflowExecutor: 步骤状态保存成功', {
        stepId: currentStep.id,
        nextStepIndex
      });
    } catch (error) {
      console.error('WorkflowExecutor: 保存步骤状态失败', error);
      setToast({
        type: 'error',
        message: '保存状态失败，但可以继续操作'
      });
    }

    // 更新本地React状态
    const steps = [...workflowState.steps];
    steps[currentStepIndex].status = 'completed';

    if (currentStepIndex < steps.length - 1) {
      steps[nextStepIndex].status = 'in_progress';
      setWorkflowState({
        ...workflowState,
        currentStepIndex: nextStepIndex,
        steps,
        data: newData
      });

      setToast({
        type: 'success',
        message: `${currentStep.name} 完成！`
      });
    } else {
      // 最后一步完成
      setWorkflowState({
        ...workflowState,
        steps,
        data: newData
      });

      setToast({
        type: 'success',
        message: '工作流执行完成！'
      });

      setTimeout(() => {
        navigate('/workbench');
      }, 2000);
    }
  };

  /**
   * 处理返回上一步
   */
  const _handleGoBack = async () => {
    if (!workflowState || workflowState.currentStepIndex === 0 || !actualWorkflowId) return;

    const prevStepIndex = workflowState.currentStepIndex - 1;

    try {
      // 从后端重新加载状态，恢复到上一步的数据
      const savedState = await window.electronAPI.loadWorkflowState(actualWorkflowId);

      const steps = [...workflowState.steps];
      steps[workflowState.currentStepIndex].status = 'pending';
      steps[prevStepIndex].status = 'in_progress';

      setWorkflowState({
        ...workflowState,
        currentStepIndex: prevStepIndex,
        steps,
        data: savedState?.data || workflowState.data
      });

      // 更新后端当前步骤索引
      await window.electronAPI.updateWorkflowCurrentStep(actualWorkflowId, prevStepIndex);

      // 保存回退后的状态
      await window.electronAPI.saveWorkflowState(actualWorkflowId, {
        flowId: actualWorkflowId,
        projectId: currentProjectId,
        currentStep: prevStepIndex,
        steps: steps.reduce((acc, step) => {
          acc[step.id] = { status: step.status };
          return acc;
        }, {} as Record<string, any>),
        data: savedState?.data || workflowState.data,
        updatedAt: new Date().toISOString()
      });

      console.log('WorkflowExecutor: 回退到上一步', {
        prevStepIndex,
        stepId: steps[prevStepIndex].id
      });
    } catch (error) {
      console.error('WorkflowExecutor: 回退失败', error);
      setToast({
        type: 'error',
        message: '回退失败，请重试'
      });
    }
  };

  /**
   * 判断步骤是否可点击
   */
  const canClickStep = (stepIndex: number): boolean => {
    if (!currentProject || !workflowState) return false;
    if (currentProject.status === 'completed') {
      return true;
    }
    return stepIndex <= workflowState.currentStepIndex;
  };

  /**
   * 处理步骤点击
   */
  const handleStepClick = (stepIndex: number) => {
    if (!canClickStep(stepIndex) || !workflowState) return;

    const steps = [...workflowState.steps];
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
    if (projectId === '__CREATE_NEW__') {
      setShowCreateProjectModal(true);
      return;
    }

    try {
      setCurrentProjectId(projectId);
    } catch (error) {
      console.error('切换项目失败:', error);
      setToast({
        type: 'error',
        message: '切换项目失败'
      });
    }
  };

  /**
   * 同步当前项目ID到全局ProjectContext
   */
  useEffect(() => {
    if (currentProjectId) {
      updateProjectId(currentProjectId);
    }
  }, [currentProjectId, updateProjectId]);

  /**
   * 处理分镜选择变化 - 更新全局选中项
   */
  const handleStoryboardSelectionChange = (selectedIds: string[]) => {
    setSelectedStoryboardIds(selectedIds);
    if (!workflowState) return;
    const storyboards = (workflowState.data as any).storyboards || [];
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
  const _handlePromptChange = (prompt: string) => {
    if (!workflowState || selectedStoryboardIds.length === 0) return;
    const storyboards = (workflowState.data as any).storyboards || [];
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
  const _handleSettingsChange = (_settings: unknown) => {
    if (!workflowState || selectedStoryboardIds.length === 0) return;
  };

  /**
   * 处理子步骤点击
   */
  const handleSubStepClick = (stepIndex: number, subStepIndex: number) => {
    if (!workflowState) return;
    if (stepIndex !== workflowState.currentStepIndex) {
      handleStepClick(stepIndex);
    }
    setCurrentSubStepIndex(subStepIndex);
  };

  /**
   * 处理视图模式切换
   */
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    _setViewMode(mode);
  };

  /**
   * 处理全屏切换
   */
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('进入全屏失败:', err);
        setToast({
          type: 'error',
          message: '进入全屏失败，请检查浏览器权限'
        });
      });
    } else {
      document.exitFullscreen();
    }
  };

  /**
   * 获取当前渲染的面板组件
   * 根据子步骤索引决定渲染主步骤还是子步骤组件
   */
  const getCurrentPanelComponent = () => {
    if (!workflowState) return null;

    const currentStep = workflowState.steps[workflowState.currentStepIndex];
    const componentMap: Record<string, React.ComponentType<any>> = {
      ChapterSplitPanel,
      SceneCharacterPanel,
      StoryboardPanel,
      VoiceoverPanel,
      ExportPanel,
      RemoteControlPanel
    };
    if (
      currentStep.subSteps &&
      currentSubStepIndex >= 0 &&
      currentSubStepIndex < currentStep.subSteps.length
    ) {
      const currentSubStep = currentStep.subSteps[currentSubStepIndex];
      const SubPanelComponent = componentMap[currentSubStep.componentType];

      return {
        component: SubPanelComponent,
        props: {
          workflowId: actualWorkflowId || '',
          onComplete: handleStepComplete,
          initialData: workflowState.data,
          viewMode: _viewMode, // 传递视图模式
          onViewModeChange: handleViewModeChange,
          stepId: currentStep.id,
          subStepId: currentSubStep.id,
          config: currentSubStep.config
        }
      };
    }
    const CurrentPanelComponent = currentStep.component;
    return {
      component: CurrentPanelComponent,
      props: {
        workflowId: actualWorkflowId || '',
        onComplete: handleStepComplete,
        initialData: workflowState.data,
        viewMode: _viewMode, // 传递视图模式
        onViewModeChange: handleViewModeChange,
        onStoryboardSelectionChange:
          currentStep.id === 'generate-storyboard'
            ? handleStoryboardSelectionChange
            : undefined
      }
    };
  };


  if (loading) {
    return <Loading size="lg" message="加载工作流..." fullscreen />;
  }

  if (!workflowState) {
    return (
      <div className="workflow-executor-error">
        <h2>工作流不存在</h2>
        <Button variant="primary" onClick={() => navigate('/workbench')}>
          返回工作流列表
        </Button>
      </div>
    );
  }

  return (
    <div className="workflow-executor">
      {/* 左侧：统一资源栏 */}
      <AnimatePresence>
        {!_leftPanelCollapsed && (
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
              onScopeChange={_setSelectedScope}
              onCategoryChange={_setSelectedCategory}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 中间：统一头部 + 内容区 */}
      <div className="workflow-middle-column">
        {/* 统一头部组件（两行布局） */}
        <FlowHeader
          currentProjectId={currentProjectId}
          projects={projects}
          onProjectChange={handleProjectChange}
          steps={workflowState.steps}
          currentStepIndex={workflowState.currentStepIndex}
          currentSubStepIndex={currentSubStepIndex}
          onStepClick={handleStepClick}
          onSubStepClick={handleSubStepClick}
          canClickStep={canClickStep}
          viewMode={_viewMode}
          onViewModeChange={handleViewModeChange}
          onToggleFullscreen={handleToggleFullscreen}
        />

        {/* 当前步骤面板 */}
        <div className="workflow-content-area">
          {!currentProjectId || currentProjectId === '__CREATE_NEW__' ? (
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
            (() => {
              const panelConfig = getCurrentPanelComponent();
              if (!panelConfig) return null;

              const { component: PanelComponent, props } = panelConfig;
              return <PanelComponent {...props} />;
            })()
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

export default PluginRunner;

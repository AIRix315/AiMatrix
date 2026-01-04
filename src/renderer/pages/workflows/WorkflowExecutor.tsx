/**
 * WorkflowExecutor - 工作流执行器页面
 *
 * 功能：动态显示工作流的各个步骤面板
 * H02 重构：三栏布局(左项目树 + 中内容区 + 右属性面板)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// import {
//   PanelLeftOpen,
//   PanelLeftClose
// } from 'lucide-react'; // 暂时未使用
import { Button, Loading, Toast, Modal } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import { useSelection } from '../../contexts/SelectionContext';
import { useProject } from '../../contexts/ProjectContext';
import { WorkflowHeader } from '../../components/workflow/WorkflowHeader';
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
import './WorkflowExecutor.css';

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

const WorkflowExecutor: React.FC = () => {
  const { workflowId, pluginId } = useParams<{ workflowId?: string; pluginId?: string }>();
  // 统一处理：pluginId 和 workflowId 都可以作为工作流ID使用
  const actualWorkflowId = pluginId || workflowId;
  const navigate = useNavigate();
  const { setSelectedItem, setSelectedCount } = useSelection();
  const { updateProjectId } = useProject();
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 左侧面板状态（右侧面板改用全局控制）
  // 默认收缩，因为资源库已整合到全局
  const [_leftPanelCollapsed, _setLeftPanelCollapsed] = useState(true);

  // 资产相关状态
  const [_selectedAssets, _setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectedScope, _setSelectedScope] = useState<'global' | 'project'>('project');
  const [selectedCategory, _setSelectedCategory] = useState<AssetCategoryId>('all');

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

  // ========== 新增状态 ==========
  /** 当前子步骤索引（-1表示无子步骤或在主步骤视图） */
  const [currentSubStepIndex, setCurrentSubStepIndex] = useState(-1);

  /** 全局视图模式（提升到WorkflowExecutor层） */
  const [_viewMode, _setViewMode] = useState<'grid' | 'list'>('grid');

  /** 全屏状态 */
  const [_isFullscreen, _setIsFullscreen] = useState(false);

  // 构建资产过滤器
  const _getAssetFilter = useCallback((): AssetFilter => {
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

  // ========== 视图模式持久化 ==========
  useEffect(() => {
    const savedMode = localStorage.getItem('workflow-view-mode');
    if (savedMode === 'grid' || savedMode === 'list') {
      _setViewMode(savedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workflow-view-mode', _viewMode);
  }, [_viewMode]);

  // ========== 全屏监听 ==========
  useEffect(() => {
    const handleFullscreenChange = () => {
      _setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ========== 当前步骤改变时，重置子步骤索引 ==========
  useEffect(() => {
    if (!workflowState) return;

    const currentStep = workflowState.steps[workflowState.currentStepIndex];
    const hasSubSteps = currentStep?.subSteps && currentStep.subSteps.length > 0;

    // 如果新步骤有子步骤，默认选中第一个子步骤
    // 否则设置为 -1（无子步骤）
    setCurrentSubStepIndex(hasSubSteps ? 0 : -1);
  }, [workflowState?.currentStepIndex]);

  // ========== 快捷键监听 ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11: 全屏切换
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }

      // Ctrl+Shift+V: 视图切换
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
      // TODO: [中期改进] 定义准确的loadWorkflow返回类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflowInstance = await window.electronAPI.loadWorkflow(actualWorkflowId) as any;
      // eslint-disable-next-line no-console
      console.log('WorkflowExecutor: 工作流实例加载成功', {
        type: (workflowInstance as any).type,
        name: (workflowInstance as any).name
      });

      // 步骤2：用type查询工作流定义（从Registry）
      // TODO: [中期改进] 定义准确的getWorkflowDefinition返回类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const definition = await window.electronAPI.getWorkflowDefinition((workflowInstance as any).type) as any;
      // eslint-disable-next-line no-console
      console.log('WorkflowExecutor: 工作流定义获取成功', {
        definitionName: (definition as any).name,
        stepCount: (definition as any).steps.length
      });

      if (!definition) {
        // eslint-disable-next-line no-console
        console.error('WorkflowExecutor: 工作流定义不存在', { type: (workflowInstance as any).type });
        setToast({ type: 'error', message: `工作流定义不存在: ${(workflowInstance as any).type}` });
        setLoading(false);
        return;
      }

      // 组件映射表（将 componentType 字符串映射到实际组件）
      const componentMap: Record<string, React.ComponentType<any>> = {
        ChapterSplitPanel,
        SceneCharacterPanel,
        StoryboardPanel,
        VoiceoverPanel,
        ExportPanel,
        RemoteControlPanel
      };

      // 步骤3：合并定义和实例，创建工作流状态
      // TODO: [中期改进] 定义准确的WorkflowState类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflow: WorkflowState = {
        name: (workflowInstance as any).name || (definition as any).name || '未命名工作流',
        currentStepIndex: 0,
        // TODO: [中期改进] 定义准确的step类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps: (definition as any).steps.map((step: any, index: number) => ({
          id: (step as any).id,
          name: (step as any).name,
          component: componentMap[(step as any).componentType] || (() => <div>组件未找到: {(step as any).componentType}</div>),
          status: index === 0 ? 'in_progress' : 'pending'
        })),
        // TODO: [中期改进] 定义准确的defaultState类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (definition as any).defaultState || {}
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newProject = updatedProjects.find(
          (p: any) => p.name === newProjectName && p.workflowType === 'novel-to-video'
        );

        if (newProject) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCurrentProjectId((newProject as any).id);
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
  const handleStepComplete = async (data: unknown) => {
    if (!workflowState) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newData = { ...workflowState.data, ...(data as any) };
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
  const _handleGoBack = () => {
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

    // 更新全局选中状态
    if (!workflowState) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storyboards = (workflowState.data as any).storyboards || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // TODO: [中期改进] 定义准确的workflowState.data类型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storyboards = (workflowState.data as any).storyboards || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // const storyboards = workflowState.data.storyboards || [];
    // const updatedStoryboards = storyboards.map((sb: unknown) =>
    //   selectedStoryboardIds.includes(sb.id) ? { ...sb, settings } : sb
    // );

    // setWorkflowState({
    //   ...workflowState,
    //   data: {
    //     ...workflowState.data,
    //     storyboards: updatedStoryboards
    //   }
    // });
  };

  /**
   * 处理子步骤点击
   */
  const handleSubStepClick = (stepIndex: number, subStepIndex: number) => {
    if (!workflowState) return;

    // 如果点击的不是当前步骤的子步骤，先切换到该步骤
    if (stepIndex !== workflowState.currentStepIndex) {
      handleStepClick(stepIndex);
    }

    // 切换到指定子步骤
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
        // eslint-disable-next-line no-console
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

    // 组件映射表（将 componentType 字符串映射到实际组件）
    const componentMap: Record<string, React.ComponentType<any>> = {
      ChapterSplitPanel,
      SceneCharacterPanel,
      StoryboardPanel,
      VoiceoverPanel,
      ExportPanel,
      RemoteControlPanel
    };

    // 如果有子步骤且子步骤索引有效
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

    // 默认渲染主步骤组件
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
        <Button variant="primary" onClick={() => navigate('/workflows')}>
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
        <WorkflowHeader
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
            // 动态渲染步骤/子步骤面板组件
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

export default WorkflowExecutor;

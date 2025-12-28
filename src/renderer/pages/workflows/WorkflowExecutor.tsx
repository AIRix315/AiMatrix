/**
 * WorkflowExecutor - 工作流执行器页面
 *
 * 功能：动态显示工作流的各个步骤面板
 * H02 重构：三栏布局(左项目树 + 中内容区 + 右属性面板)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen
} from 'lucide-react';
import { Button, Loading, Toast } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import { RightSettingsPanel } from '../../components/workflow/RightSettingsPanel';
import {
  ChapterSplitPanel,
  SceneCharacterPanel,
  StoryboardPanel,
  VoiceoverPanel,
  ExportPanel
} from './panels';
import './WorkflowExecutor.css';

interface WorkflowStep {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  status: 'pending' | 'in_progress' | 'completed';
}

interface WorkflowState {
  currentStepIndex: number;
  steps: WorkflowStep[];
  data: Record<string, any>;
}

// 项目资源树节点类型
interface ResourceTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: ResourceTreeNode[];
}

// 资源树节点组件
interface TreeNodeProps {
  node: ResourceTreeNode;
  level: number;
  selectedResource: string | null;
  onSelectResource: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, selectedResource, onSelectResource }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedResource === node.id;

  return (
    <div>
      <div
        className={`resource-tree-node ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (node.type === 'folder' && hasChildren) {
            setIsExpanded(!isExpanded);
          } else {
            onSelectResource(node.id);
          }
        }}
      >
        {node.type === 'folder' ? (
          <>
            <ChevronRight
              className={`tree-chevron ${isExpanded ? 'expanded' : ''}`}
              size={14}
            />
            {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
          </>
        ) : (
          <>
            <span className="tree-spacer" />
            {node.name.includes('.txt') || node.name.includes('.docx') ? (
              <FileText size={16} />
            ) : (
              <File size={16} />
            )}
          </>
        )}
        <span className="tree-node-name">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedResource={selectedResource}
              onSelectResource={onSelectResource}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const WorkflowExecutor: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 三栏布局状态
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // 当前步骤选中的项目（用于右侧属性面板）
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<string[]>([]);

  // 模拟项目资源树数据
  const [resourceTree] = useState<ResourceTreeNode[]>([
    {
      id: 'chapters',
      name: '章节',
      type: 'folder',
      children: [
        { id: 'chapter-1', name: '第一章：开端', type: 'file' },
        { id: 'chapter-2', name: '第二章：冲突', type: 'file' },
        { id: 'chapter-3', name: '第三章：高潮', type: 'file' }
      ]
    },
    {
      id: 'scenes',
      name: '场景',
      type: 'folder',
      children: [
        { id: 'scene-1', name: '场景1：清晨的咖啡馆', type: 'file' },
        { id: 'scene-2', name: '场景2：雨夜街头', type: 'file' }
      ]
    },
    {
      id: 'characters',
      name: '角色',
      type: 'folder',
      children: [
        { id: 'char-1', name: '主角：李明', type: 'file' },
        { id: 'char-2', name: '女主：王芳', type: 'file' }
      ]
    },
    {
      id: 'storyboards',
      name: '分镜脚本',
      type: 'folder',
      children: []
    },
    {
      id: 'voiceovers',
      name: '配音文件',
      type: 'folder',
      children: []
    }
  ]);

  useEffect(() => {
    loadWorkflow();
  }, [workflowId]);

  /**
   * 加载工作流
   */
  const loadWorkflow = async () => {
    if (!workflowId) {
      setToast({ type: 'error', message: '工作流ID不存在' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // TODO: 从主进程加载工作流实例状态
      // const workflow = await window.electronAPI.loadWorkflow(workflowId);

      // 临时模拟小说转视频工作流
      const mockWorkflow: WorkflowState = {
        currentStepIndex: 0,
        steps: [
          {
            id: 'split-chapters',
            name: '章节拆分',
            component: ChapterSplitPanel,
            status: 'in_progress'
          },
          {
            id: 'extract-scenes',
            name: '场景角色提取',
            component: SceneCharacterPanel,
            status: 'pending'
          },
          {
            id: 'generate-storyboard',
            name: '分镜脚本生成',
            component: StoryboardPanel,
            status: 'pending'
          },
          {
            id: 'generate-voiceover',
            name: '配音生成',
            component: VoiceoverPanel,
            status: 'pending'
          },
          {
            id: 'export',
            name: '导出成品',
            component: ExportPanel,
            status: 'pending'
          }
        ],
        data: {}
      };

      setWorkflowState(mockWorkflow);
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
   * 处理分镜选择变化
   */
  const handleStoryboardSelectionChange = (selectedIds: string[]) => {
    setSelectedStoryboardIds(selectedIds);
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

  /**
   * 处理生成操作
   */
  const handleGenerate = () => {
    if (!workflowState || selectedStoryboardIds.length === 0) return;

    setToast({
      type: 'info',
      message: `开始生成 ${selectedStoryboardIds.length} 个分镜...`
    });

    // TODO: 调用实际的生成API
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

  // 获取当前选中的分镜数据（用于右侧面板）
  const selectedStoryboards =
    workflowState.data.storyboards?.filter((sb: any) =>
      selectedStoryboardIds.includes(sb.id)
    ) || [];

  // 构建右侧面板显示的item数据
  const selectedItem =
    selectedStoryboards.length === 1
      ? {
          id: selectedStoryboards[0].id,
          name: selectedStoryboards[0].description,
          type: selectedStoryboards[0].type === 'image' ? '图片分镜' : '视频分镜',
          prompt: selectedStoryboards[0].prompt || ''
        }
      : selectedStoryboards.length > 1
      ? {
          id: 'batch',
          name: `已选中 ${selectedStoryboards.length} 个分镜`,
          type: '批量编辑',
          prompt: selectedStoryboards[0]?.prompt || ''
        }
      : null;

  return (
    <div className="workflow-executor">
      {/* 左侧：项目资源树 */}
      <AnimatePresence>
        {!leftPanelCollapsed && (
          <motion.aside
            className="workflow-left-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="left-panel-header">
              <h3>项目资源</h3>
            </div>
            <div className="resource-tree">
              {resourceTree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  selectedResource={selectedResource}
                  onSelectResource={setSelectedResource}
                />
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 中间：步骤进度条 + 内容区 */}
      <div className="workflow-middle-column">
        {/* 步骤进度条 */}
        <div className="workflow-progress">
          <div className="progress-header">
            <div className="progress-title">
              <h2>小说转视频工作流</h2>
            </div>
            <div className="progress-controls">
              {/* 左侧面板收缩按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="panel-toggle-btn"
                onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                title={leftPanelCollapsed ? '展开项目资源' : '收缩项目资源'}
              >
                {leftPanelCollapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </Button>

              {/* 右侧面板收缩按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="panel-toggle-btn"
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                title={rightPanelCollapsed ? '展开属性面板' : '收缩属性面板'}
              >
                {rightPanelCollapsed ? (
                  <PanelRightOpen size={18} />
                ) : (
                  <PanelRightClose size={18} />
                )}
              </Button>

              <div className="progress-actions">
                {workflowState.currentStepIndex > 0 && (
                  <Button variant="ghost" onClick={handleGoBack}>
                    ← 上一步
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate('/workflows')}>
                  退出
                </Button>
              </div>
            </div>
          </div>

          <div className="steps-bar">
            {workflowState.steps.map((step, index) => (
              <div
                key={step.id}
                className={`step-item ${
                  step.status === 'completed'
                    ? 'completed'
                    : step.status === 'in_progress'
                    ? 'active'
                    : 'pending'
                }`}
              >
                <div className="step-indicator">
                  {step.status === 'completed' ? '✓' : index + 1}
                </div>
                <div className="step-name">{step.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 当前步骤面板 */}
        <div className="workflow-content-area">
          <CurrentPanelComponent
            workflowId={workflowId || ''}
            onComplete={handleStepComplete}
            initialData={workflowState.data}
            onStoryboardSelectionChange={
              currentStep.id === 'generate-storyboard'
                ? handleStoryboardSelectionChange
                : undefined
            }
          />
        </div>
      </div>

      {/* 右侧：属性面板 */}
      <AnimatePresence>
        {!rightPanelCollapsed && (
          <motion.aside
            className="workflow-right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <RightSettingsPanel
              selectedItem={selectedItem}
              onPromptChange={handlePromptChange}
              onSettingsChange={handleSettingsChange}
              onGenerate={handleGenerate}
              linkedAssets={
                selectedStoryboards.length > 0 && selectedStoryboards[0].linkedAssets
                  ? selectedStoryboards[0].linkedAssets
                  : []
              }
              onRemoveAsset={(assetId) => {
                // TODO: 实现移除关联资产
                // eslint-disable-next-line no-console
                console.log('Remove asset:', assetId);
              }}
              isGenerating={false}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default WorkflowExecutor;

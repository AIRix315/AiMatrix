/**
 * WorkflowExecutor - 工作流执行器页面
 *
 * 功能：动态显示工作流的各个步骤面板
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Loading, Toast } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
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

const WorkflowExecutor: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

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
      {/* 步骤进度条 */}
      <div className="workflow-progress">
        <div className="progress-header">
          <h2>小说转视频工作流</h2>
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
      <div className="workflow-panel">
        <CurrentPanelComponent
          workflowId={workflowId || ''}
          onComplete={handleStepComplete}
          initialData={workflowState.data}
        />
      </div>

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

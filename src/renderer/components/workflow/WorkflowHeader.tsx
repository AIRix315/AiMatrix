/**
 * WorkflowHeader - 工作流执行器统一头部组件
 * 包含：左侧收缩、项目下拉、标题、步骤条、关闭全部、右侧收缩
 */

import React from 'react';
import { PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { Button } from '../common';
import './WorkflowHeader.css';

interface WorkflowHeaderProps {
  workflowName: string;
  currentProjectId: string;
  projects: Array<{ id: string; name: string; status?: string }>;
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
            title={step.name}
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

/**
 * WorkflowHeader - 工作流执行器统一头部组件
 * 包含：左侧收缩、项目下拉、标题、步骤条、关闭全部、右侧收缩
 */

import React from 'react';
import { PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { Button } from '../common';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import './WorkflowHeader.css';

interface WorkflowHeaderProps {
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
      <Select value={currentProjectId} onValueChange={onProjectChange}>
        <SelectTrigger className="project-selector w-[180px]">
          <SelectValue placeholder="选择项目" />
        </SelectTrigger>
        <SelectContent>
          {/* 新建项目选项（特殊项） */}
          <SelectItem value="__CREATE_NEW__" className="text-primary font-medium">
            + 新建项目
          </SelectItem>

          {/* 现有项目列表 */}
          {projects.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                现有项目
              </div>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name} {project.status === 'completed' ? '(已完成)' : ''}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

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

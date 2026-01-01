/**
 * WorkflowHeader - 工作流执行器统一头部组件（两行布局）
 * 第一行：项目选择 + 文字步骤按钮 + 视图切换 + 全屏按钮
 * 第二行：子步骤选项卡（动态显示）
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { Button, ViewSwitcher } from '../common';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import './WorkflowHeader.css';

interface WorkflowHeaderProps {
  // 项目相关
  currentProjectId: string;
  projects: Array<{ id: string; name: string; status?: string }>;
  onProjectChange: (projectId: string) => void;

  // 步骤相关
  steps: Array<{
    id: string;
    name: string;
    status: string;
    subSteps?: Array<{ id: string; name: string; status: string }>;
    supportsViewSwitch?: boolean;
  }>;
  currentStepIndex: number;
  onStepClick: (index: number) => void;
  canClickStep: (index: number) => boolean;

  // 子步骤相关
  currentSubStepIndex: number;
  onSubStepClick: (stepIndex: number, subStepIndex: number) => void;

  // 视图模式相关
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;

  // 全屏相关
  onToggleFullscreen: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  currentProjectId,
  projects,
  onProjectChange,
  steps,
  currentStepIndex,
  currentSubStepIndex,
  onStepClick,
  onSubStepClick,
  canClickStep,
  viewMode,
  onViewModeChange,
  onToggleFullscreen
}) => {
  const currentStep = steps[currentStepIndex];
  const hasSubSteps = currentStep?.subSteps && currentStep.subSteps.length > 0;
  const supportsViewSwitch = currentStep?.supportsViewSwitch ?? false;

  return (
    <div className="workflow-header-container">
      {/* ========== 第一行：主步骤行 ========== */}
      <div className="workflow-header-main">
        {/* 左侧：项目选择器 */}
        <div className="project-selector-wrapper">
          <span className="project-label">当前项目：</span>
          <Select value={currentProjectId} onValueChange={onProjectChange}>
            <SelectTrigger className="project-selector w-[180px]">
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__CREATE_NEW__" className="text-primary font-medium">
                + 新建项目
              </SelectItem>
              {projects.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">现有项目</div>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} {project.status === 'completed' ? '(已完成)' : ''}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 中间：文字步骤按钮（支持滚动） */}
        <div className="step-buttons-bar">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = step.status === 'completed';
            const isClickable = canClickStep(index);

            // 判断是否为下一个可进入的步骤（当前步骤完成后，下一步闪烁提示）
            const currentStep = steps[currentStepIndex];
            const isNextAvailable =
              currentStep?.status === 'completed' &&
              index === currentStepIndex + 1 &&
              !isCompleted;

            return (
              <button
                key={step.id}
                className={`step-text-btn ${
                  isCompleted
                    ? 'completed'
                    : isActive
                    ? 'active'
                    : isNextAvailable
                    ? 'next-available'
                    : 'pending'
                }`}
                onClick={() => onStepClick(index)}
                disabled={!isClickable}
                title={step.name}
              >
                <span className="step-number">{index + 1}</span>
                <span className="step-name">{step.name}</span>
              </button>
            );
          })}
        </div>

        {/* 右侧：工具按钮组 */}
        <div className="header-tools">
          {/* 使用全局ViewSwitcher组件 */}
          <div className={`view-switcher-wrapper ${!supportsViewSwitch ? 'disabled' : ''}`}>
            <ViewSwitcher
              viewMode={viewMode}
              onChange={supportsViewSwitch ? onViewModeChange : () => {}}
            />
          </div>

          {/* 全屏按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="fullscreen-btn"
            onClick={onToggleFullscreen}
            title="全屏 (F11)"
          >
            <Maximize2 size={18} />
          </Button>
        </div>
      </div>

      {/* ========== 第二行：子步骤选项卡（动态显示） ========== */}
      <AnimatePresence>
        {hasSubSteps && (
          <motion.div
            className="workflow-header-substeps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              opacity: { duration: 0.2 }
            }}
          >
            <div className="substep-tabs">
              {currentStep.subSteps!.map((subStep, subIndex) => {
                const isActive = subIndex === currentSubStepIndex;

                return (
                  <button
                    key={subStep.id}
                    className={`substep-tab ${isActive ? 'active' : ''}`}
                    onClick={() => onSubStepClick(currentStepIndex, subIndex)}
                  >
                    <span className="substep-id">
                      {currentStepIndex + 1}.{subIndex + 1}
                    </span>
                    <span className="substep-name">{subStep.name}</span>
                    {isActive && <div className="substep-underline" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 工作流执行器组件
 * 用于执行步骤化工作流（如小说转视频的5个步骤）
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Toast, Loading } from '../common'
import type { ToastType } from '../common/Toast'
import './WorkflowExecutor.css'

interface WorkflowStep {
  id: string
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  componentType: string
}

interface WorkflowDefinition {
  id: string
  name: string
  type: string
  description?: string
  steps: WorkflowStep[]
}

interface WorkflowInstance {
  id: string
  type: string
  name: string
  projectId?: string
  state: {
    workflowId: string
    currentStep: number
    steps: Record<string, {
      status: string
      updatedAt: number
      data?: unknown
    }>
    data?: Record<string, unknown>
    createdAt: number
    updatedAt: number
  }
  createdAt: number
  updatedAt: number
}

export const WorkflowExecutor: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>()
  const navigate = useNavigate()

  const [instance, setInstance] = useState<WorkflowInstance | null>(null)
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)

  // 加载工作流实例和定义
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId)
    }
  }, [workflowId])

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true)

      // 加载工作流实例
      const workflowInstance = await window.electronAPI.loadWorkflowInstance(id)
      setInstance(workflowInstance)

      // 加载工作流定义
      const workflowDefinition = await window.electronAPI.getWorkflowDefinition(workflowInstance.type)
      setDefinition(workflowDefinition)

      // 设置当前步骤
      setCurrentStep(workflowInstance.state.currentStep || 0)

      setToast({
        type: 'success',
        message: '工作流加载成功'
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载工作流失败:', error)
      setToast({
        type: 'error',
        message: `加载工作流失败: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 前往下一步
  const handleNextStep = async () => {
    if (!instance || !definition) return

    const nextStep = currentStep + 1
    if (nextStep >= definition.steps.length) {
      setToast({
        type: 'info',
        message: '已是最后一步'
      })
      return
    }

    try {
      // 更新当前步骤状态为completed
      const currentStepDef = definition.steps[currentStep]
      await window.electronAPI.updateWorkflowStepStatus(
        instance.id,
        currentStepDef.id,
        'completed'
      )

      // 更新当前步骤索引
      await window.electronAPI.updateWorkflowCurrentStep(instance.id, nextStep)

      // 更新下一步状态为in_progress
      const nextStepDef = definition.steps[nextStep]
      await window.electronAPI.updateWorkflowStepStatus(
        instance.id,
        nextStepDef.id,
        'in_progress'
      )

      setCurrentStep(nextStep)

      setToast({
        type: 'success',
        message: `已进入步骤: ${nextStepDef.name}`
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('切换步骤失败:', error)
      setToast({
        type: 'error',
        message: `切换步骤失败: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // 前往上一步
  const handlePrevStep = async () => {
    if (!instance || !definition) return

    const prevStep = currentStep - 1
    if (prevStep < 0) {
      setToast({
        type: 'info',
        message: '已是第一步'
      })
      return
    }

    try {
      // 更新当前步骤索引
      await window.electronAPI.updateWorkflowCurrentStep(instance.id, prevStep)

      // 更新上一步状态为in_progress
      const prevStepDef = definition.steps[prevStep]
      await window.electronAPI.updateWorkflowStepStatus(
        instance.id,
        prevStepDef.id,
        'in_progress'
      )

      setCurrentStep(prevStep)

      setToast({
        type: 'success',
        message: `已返回步骤: ${prevStepDef.name}`
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('切换步骤失败:', error)
      setToast({
        type: 'error',
        message: `切换步骤失败: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // 跳转到指定步骤
  const handleGotoStep = async (stepIndex: number) => {
    if (!instance || !definition) return

    try {
      // 更新当前步骤索引
      await window.electronAPI.updateWorkflowCurrentStep(instance.id, stepIndex)

      // 更新步骤状态为in_progress
      const targetStepDef = definition.steps[stepIndex]
      await window.electronAPI.updateWorkflowStepStatus(
        instance.id,
        targetStepDef.id,
        'in_progress'
      )

      setCurrentStep(stepIndex)

      setToast({
        type: 'success',
        message: `已跳转到步骤: ${targetStepDef.name}`
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('跳转步骤失败:', error)
      setToast({
        type: 'error',
        message: `跳转步骤失败: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // 获取步骤状态
  const getStepStatus = (stepIndex: number): string => {
    if (!instance || !definition) return 'pending'

    const step = definition.steps[stepIndex]
    const stepState = instance.state.steps[step.id]

    return stepState?.status || 'pending'
  }

  if (isLoading) {
    return <Loading size="lg" message="加载工作流..." fullscreen />
  }

  if (!instance || !definition) {
    return (
      <div className="workflow-executor-error">
        <h2>工作流不存在</h2>
        <Button variant="primary" onClick={() => navigate('/workflows')}>
          返回工作流列表
        </Button>
      </div>
    )
  }

  const currentStepDef = definition.steps[currentStep]

  return (
    <div className="workflow-executor">
      {/* 工作流头部 */}
      <div className="workflow-header">
        <div className="workflow-title">
          <h2>{instance.name}</h2>
          <p className="workflow-description">{definition.description}</p>
        </div>
        <div className="workflow-actions">
          <Button variant="ghost" onClick={() => navigate('/workflows')}>
            返回
          </Button>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="workflow-steps">
        {definition.steps.map((step, index) => {
          const status = getStepStatus(index)
          const isCurrent = index === currentStep

          return (
            <div
              key={step.id}
              className={`workflow-step ${isCurrent ? 'current' : ''} ${status}`}
              onClick={() => handleGotoStep(index)}
            >
              <div className="step-indicator">
                <div className="step-number">{index + 1}</div>
                <div className="step-status-icon">
                  {status === 'completed' && '✓'}
                  {status === 'error' && '✗'}
                  {status === 'in_progress' && '●'}
                </div>
              </div>
              <div className="step-info">
                <div className="step-name">{step.name}</div>
                {step.description && (
                  <div className="step-description">{step.description}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 当前步骤内容区 */}
      <div className="workflow-content">
        <div className="content-header">
          <h3>{currentStepDef.name}</h3>
          {currentStepDef.description && (
            <p className="content-description">{currentStepDef.description}</p>
          )}
        </div>

        <div className="content-body">
          <div className="placeholder-panel">
            <p>步骤内容区域</p>
            <p className="text-muted">组件类型: {currentStepDef.componentType}</p>
            <p className="text-muted">此区域将在后续版本中实现动态面板加载功能</p>
          </div>
        </div>

        {/* 步骤导航按钮 */}
        <div className="content-footer">
          <Button
            variant="ghost"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
          >
            上一步
          </Button>

          <div className="step-progress">
            第 {currentStep + 1} / {definition.steps.length} 步
          </div>

          <Button
            variant="primary"
            onClick={handleNextStep}
            disabled={currentStep === definition.steps.length - 1}
          >
            下一步
          </Button>
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
    </div>
  )
}

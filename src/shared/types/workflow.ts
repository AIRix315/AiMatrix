/**
 * 工作流类型定义
 * 用于定义可复用的步骤化流程执行引擎
 */

/**
 * 工作流步骤状态
 */
export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'error'

/**
 * 工作流步骤定义
 */
export interface WorkflowStep {
  /** 步骤ID */
  id: string
  /** 步骤名称 */
  name: string
  /** 步骤描述 */
  description?: string
  /** 步骤状态 */
  status: WorkflowStepStatus
  /** 步骤组件类型标识 (用于前端动态加载) */
  componentType: string
  /** 步骤完成时的回调数据结构 */
  onComplete?: (data: unknown) => Promise<void>
  /** 步骤可选配置 */
  config?: Record<string, unknown>
}

/**
 * 工作流状态
 */
export interface WorkflowState {
  /** 工作流实例ID */
  workflowId: string
  /** 当前步骤索引 */
  currentStep: number
  /** 步骤状态映射 */
  steps: Record<string, {
    status: WorkflowStepStatus
    updatedAt: number
    data?: unknown
  }>
  /** 工作流全局数据 */
  data?: Record<string, unknown>
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  /** 工作流定义ID */
  id: string
  /** 工作流名称 */
  name: string
  /** 工作流类型 (用于注册和查询) */
  type: string
  /** 工作流描述 */
  description?: string
  /** 工作流版本 */
  version?: string
  /** 工作流图标 */
  icon?: string
  /** 工作流步骤列表 */
  steps: WorkflowStep[]
  /** 工作流默认状态 */
  defaultState?: Record<string, unknown>
  /** 工作流元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 工作流实例
 */
export interface WorkflowInstance {
  /** 实例ID */
  id: string
  /** 工作流类型 */
  type: string
  /** 工作流名称 */
  name: string
  /** 项目ID */
  projectId?: string
  /** 当前状态 */
  state: WorkflowState
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/**
 * 创建工作流实例参数
 */
export interface CreateWorkflowInstanceParams {
  /** 工作流类型 */
  type: string
  /** 项目ID (可选) */
  projectId?: string
  /** 自定义名称 (可选) */
  name?: string
  /** 初始数据 (可选) */
  initialData?: Record<string, unknown>
}

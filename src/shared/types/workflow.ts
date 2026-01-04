/**
 * 工作流类型定义
 * 用于定义可复用的步骤化流程执行引擎
 */

/**
 * 工作流步骤状态
 */
export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'error'

/**
 * 工作流子步骤定义
 */
export interface WorkflowSubStep {
  /** 子步骤ID (如 "3.1", "3.2") */
  id: string
  /** 子步骤名称 */
  name: string
  /** 子步骤描述 */
  description?: string
  /** 子步骤组件类型标识 */
  componentType: string
  /** 子步骤状态 */
  status: WorkflowStepStatus
  /** 子步骤配置 */
  config?: Record<string, unknown>
}

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
  /** 子步骤列表（可选，用于多阶段步骤） */
  subSteps?: WorkflowSubStep[]
  /** 是否支持视图切换（grid/list） */
  supportsViewSwitch?: boolean
}

/**
 * Flow实例执行状态
 * 记录Flow执行过程中的步骤状态和数据
 */
export interface FlowState {
  /** Flow实例ID */
  flowId: string
  /** 绑定的项目ID */
  projectId: string
  /** 当前步骤索引 */
  currentStep: number
  /** 当前子步骤索引（-1表示无子步骤或主步骤视图） */
  currentSubStep: number
  /** 步骤状态映射 */
  steps: Record<string, {
    status: WorkflowStepStatus
    updatedAt: string // ISO 8601
    data?: unknown
    /** 子步骤状态映射 */
    subSteps?: Record<string, {
      status: WorkflowStepStatus
      updatedAt: string
      data?: unknown
    }>
  }>
  /** Flow全局数据 */
  data?: Record<string, unknown>
  /** 创建时间 (ISO 8601) */
  createdAt: string
  /** 更新时间 (ISO 8601) */
  updatedAt: string
}

/** @deprecated 使用FlowState代替 */
export type WorkflowState = FlowState;

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  /** 工作流定义ID */
  id?: string
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
  steps?: WorkflowStep[]
  /** 工作流默认状态 */
  defaultState?: Record<string, unknown>
  /** 工作流元数据 */
  metadata?: Record<string, unknown>
  /** 前端特定字段 */
  nodes?: unknown[]
  edges?: unknown[]
  config?: Record<string, unknown>
  mode?: string
  prompt?: string
  status?: string
  lastModified?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown  // 索引签名，允许额外字段
}

/**
 * Flow实例 - 工作流的实际执行实例
 * 包含执行状态和运行时数据
 */
export interface FlowInstance {
  /** 实例ID */
  id: string
  /** 工作流模板类型 */
  type: string
  /** Flow实例名称 */
  name: string
  /** 关联的项目ID */
  projectId: string
  /** 当前执行状态 */
  state: FlowState
  /** 创建时间 (ISO 8601) */
  createdAt: string
  /** 更新时间 (ISO 8601) */
  updatedAt: string
}

/** @deprecated 使用FlowInstance代替 */
export type WorkflowInstance = FlowInstance;

/**
 * 创建Flow实例的参数
 */
export interface CreateFlowInstanceParams {
  /** 工作流模板类型 */
  type: string
  /** 关联的项目ID */
  projectId: string
  /** 自定义名称 (可选) */
  name?: string
  /** 初始数据 (可选) */
  initialData?: Record<string, unknown>
}

/** @deprecated 使用CreateFlowInstanceParams代替 */
export type CreateWorkflowInstanceParams = CreateFlowInstanceParams;

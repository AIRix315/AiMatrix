/**
 * WorkflowStateManager 服务 - 工作流状态管理器
 *
 * 功能：
 * - 持久化工作流执行状态
 * - 支持中断恢复
 * - 步骤状态追踪
 * - 工作流实例管理
 */

import * as path from 'path'
import { logger } from './Logger'
import { errorHandler, ErrorCode } from './ServiceErrorHandler'
import { timeService } from './TimeService'
import { FileSystemService } from './FileSystemService'
import {
  WorkflowState,
  WorkflowStepStatus,
  WorkflowInstance,
  CreateWorkflowInstanceParams
} from '../../shared/types/workflow'
import { workflowRegistry } from './WorkflowRegistry'

/**
 * WorkflowStateManager 服务类
 */
export class WorkflowStateManager {
  private fsService: FileSystemService
  private instances: Map<string, WorkflowInstance> = new Map()

  constructor(fsService: FileSystemService) {
    this.fsService = fsService
  }

  /**
   * 创建工作流实例
   * @param params 创建参数
   * @returns 工作流实例
   */
  async createInstance(params: CreateWorkflowInstanceParams): Promise<WorkflowInstance> {
    try {
      // 获取工作流定义
      const definition = workflowRegistry.getDefinition(params.type)
      if (!definition) {
        throw errorHandler.createError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'WorkflowStateManager',
          'createInstance',
          `工作流类型不存在: ${params.type}`
        )
      }

      // 获取当前时间（转换为时间戳）
      const currentTime = (await timeService.getCurrentTime()).getTime()

      // 生成实例ID
      const instanceId = this.generateInstanceId(params.type)

      // 创建初始状态
      const initialState: WorkflowState = {
        workflowId: instanceId,
        projectId: params.projectId,
        currentStep: 0,
        steps: {},
        data: params.initialData || {},
        createdAt: currentTime,
        updatedAt: currentTime
      }

      // 初始化步骤状态
      definition.steps.forEach(step => {
        initialState.steps[step.id] = {
          status: 'pending',
          updatedAt: currentTime
        }
      })

      // 创建实例
      const instance: WorkflowInstance = {
        id: instanceId,
        type: params.type,
        name: params.name || definition.name,
        projectId: params.projectId,
        state: initialState,
        createdAt: currentTime,
        updatedAt: currentTime
      }

      // 保存实例
      await this.saveInstance(instance)

      // 缓存实例
      this.instances.set(instanceId, instance)

      logger.info(
        `工作流实例已创建: ${instance.name} (${instanceId})`,
        'WorkflowStateManager',
        { type: params.type, projectId: params.projectId }
      )

      return instance
    } catch (error) {
      logger.error(
        '创建工作流实例失败',
        'WorkflowStateManager',
        { params, error }
      )
      throw error
    }
  }

  /**
   * 保存工作流状态
   * @param workflowId 工作流实例ID
   * @param state 工作流状态
   */
  async saveState(workflowId: string, state: WorkflowState): Promise<void> {
    try {
      if (!state.projectId) {
        throw new Error('WorkflowState must have projectId')
      }

      const statePath = this.getStatePath(workflowId)

      // 更新时间戳
      state.updatedAt = (await timeService.getCurrentTime()).getTime()

      // 保存状态文件
      await this.fsService.saveJSON(statePath, state)

      logger.debug(
        `工作流状态已保存: ${workflowId}`,
        'WorkflowStateManager',
        { currentStep: state.currentStep }
      )
    } catch (error) {
      logger.error(
        '保存工作流状态失败',
        'WorkflowStateManager',
        { workflowId, error }
      )
      throw errorHandler.createError(
        ErrorCode.WORKFLOW_SAVE_ERROR,
        'WorkflowStateManager',
        'saveState',
        `保存工作流状态失败: ${workflowId}`
      )
    }
  }

  /**
   * 加载工作流状态
   * @param workflowId 工作流实例ID
   * @returns 工作流状态，如果不存在则返回 null
   */
  async loadState(workflowId: string): Promise<WorkflowState | null> {
    try {
      const statePath = this.getStatePath(workflowId)
      const state = await this.fsService.readJSON<WorkflowState>(statePath)

      if (state) {
        logger.debug(
          `工作流状态已加载: ${workflowId}`,
          'WorkflowStateManager',
          { currentStep: state.currentStep }
        )
      }

      return state
    } catch (error) {
      logger.error(
        '加载工作流状态失败',
        'WorkflowStateManager',
        { workflowId, error }
      )
      return null
    }
  }

  /**
   * 更新步骤状态
   * @param workflowId 工作流实例ID
   * @param stepId 步骤ID
   * @param status 步骤状态
   * @param data 可选的步骤数据
   */
  async updateStepStatus(
    workflowId: string,
    stepId: string,
    status: WorkflowStepStatus,
    data?: unknown
  ): Promise<void> {
    try {
      // 加载当前状态
      const state = await this.loadState(workflowId)
      if (!state) {
        throw errorHandler.createError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'WorkflowStateManager',
          'updateStepStatus',
          `工作流状态不存在: ${workflowId}`
        )
      }

      // 获取当前时间（转换为时间戳）
      const currentTime = (await timeService.getCurrentTime()).getTime()

      // 更新步骤状态
      state.steps[stepId] = {
        status,
        updatedAt: currentTime,
        data
      }

      // 保存状态
      await this.saveState(workflowId, state)

      logger.info(
        `步骤状态已更新: ${stepId} -> ${status}`,
        'WorkflowStateManager',
        { workflowId }
      )
    } catch (error) {
      logger.error(
        '更新步骤状态失败',
        'WorkflowStateManager',
        { workflowId, stepId, status, error }
      )
      throw error
    }
  }

  /**
   * 更新当前步骤索引
   * @param workflowId 工作流实例ID
   * @param stepIndex 步骤索引
   */
  async updateCurrentStep(workflowId: string, stepIndex: number): Promise<void> {
    try {
      const state = await this.loadState(workflowId)
      if (!state) {
        throw errorHandler.createError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'WorkflowStateManager',
          'updateCurrentStep',
          `工作流状态不存在: ${workflowId}`
        )
      }

      state.currentStep = stepIndex
      await this.saveState(workflowId, state)

      logger.info(
        `当前步骤已更新: ${stepIndex}`,
        'WorkflowStateManager',
        { workflowId }
      )
    } catch (error) {
      logger.error(
        '更新当前步骤失败',
        'WorkflowStateManager',
        { workflowId, stepIndex, error }
      )
      throw error
    }
  }

  /**
   * 保存工作流实例
   * @param instance 工作流实例
   */
  private async saveInstance(instance: WorkflowInstance): Promise<void> {
    try {
      const instancePath = this.getInstancePath(instance.id)
      await this.fsService.saveJSON(instancePath, instance)

      logger.debug(
        `工作流实例已保存: ${instance.id}`,
        'WorkflowStateManager'
      )
    } catch (error) {
      logger.error(
        '保存工作流实例失败',
        'WorkflowStateManager',
        { instanceId: instance.id, error }
      )
      throw errorHandler.createError(
        ErrorCode.WORKFLOW_SAVE_ERROR,
        'WorkflowStateManager',
        'saveInstance',
        `保存工作流实例失败: ${instance.id}`
      )
    }
  }

  /**
   * 加载工作流实例
   * @param workflowId 工作流实例ID
   * @returns 工作流实例，如果不存在则返回 null
   */
  async loadInstance(workflowId: string): Promise<WorkflowInstance | null> {
    try {
      // 先从缓存查找
      if (this.instances.has(workflowId)) {
        return this.instances.get(workflowId)!
      }

      // 从文件加载
      const instancePath = this.getInstancePath(workflowId)
      const instance = await this.fsService.readJSON<WorkflowInstance>(instancePath)

      if (instance) {
        // 缓存实例
        this.instances.set(workflowId, instance)

        logger.debug(
          `工作流实例已加载: ${workflowId}`,
          'WorkflowStateManager'
        )
      }

      return instance
    } catch (error) {
      logger.error(
        '加载工作流实例失败',
        'WorkflowStateManager',
        { workflowId, error }
      )
      return null
    }
  }

  /**
   * 获取状态文件路径
   * @param workflowId 工作流实例ID
   * @returns 状态文件路径
   */
  private getStatePath(workflowId: string): string {
    return path.join(
      this.fsService.getDataDir(),
      'workflows',
      workflowId,
      'state.json'
    )
  }

  /**
   * 获取实例文件路径
   * @param workflowId 工作流实例ID
   * @returns 实例文件路径
   */
  private getInstancePath(workflowId: string): string {
    return path.join(
      this.fsService.getDataDir(),
      'workflows',
      workflowId,
      'instance.json'
    )
  }

  /**
   * 生成工作流实例ID
   * @param type 工作流类型
   * @returns 实例ID
   */
  private generateInstanceId(type: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${type}-${timestamp}-${random}`
  }

  /**
   * 列出所有工作流实例
   * @param projectId 可选的项目ID过滤
   * @returns 工作流实例数组
   */
  async listInstances(projectId?: string): Promise<WorkflowInstance[]> {
    try {
      // 工作流目录路径（将来用于扫描持久化的工作流）
      const _workflowsDir = path.join(this.fsService.getDataDir(), 'workflows')

      // 这里简化实现，实际应该扫描目录
      // 暂时返回缓存的实例
      const instances = Array.from(this.instances.values())

      if (projectId) {
        return instances.filter(i => i.projectId === projectId)
      }

      return instances
    } catch (error) {
      logger.error(
        '列出工作流实例失败',
        'WorkflowStateManager',
        { projectId, error }
      )
      return []
    }
  }

  /**
   * 删除工作流实例
   * @param workflowId 工作流实例ID
   */
  async deleteInstance(workflowId: string): Promise<void> {
    try {
      const instanceDir = path.join(
        this.fsService.getDataDir(),
        'workflows',
        workflowId
      )

      // 删除目录
      await this.fsService.deleteDir(instanceDir)

      // 从缓存移除
      this.instances.delete(workflowId)

      logger.info(
        `工作流实例已删除: ${workflowId}`,
        'WorkflowStateManager'
      )
    } catch (error) {
      logger.error(
        '删除工作流实例失败',
        'WorkflowStateManager',
        { workflowId, error }
      )
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'WorkflowStateManager',
        'deleteInstance',
        `删除工作流实例失败: ${workflowId}`
      )
    }
  }
}

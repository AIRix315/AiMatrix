/**
 * FlowStateManager 服务 - Flow实例状态管理器
 *
 * 功能：
 * - 持久化Flow执行状态到文件系统
 * - 支持Flow中断恢复
 * - 步骤状态追踪和更新
 * - Flow实例生命周期管理
 */

import * as path from 'path'
import { logger } from './Logger'
import { errorHandler, ErrorCode } from './ServiceErrorHandler'
import { timeService } from './TimeService'
import { FileSystemService } from './FileSystemService'
import {
  FlowState,
  WorkflowStepStatus,
  FlowInstance,
  CreateFlowInstanceParams
} from '@/shared/types'
import { workflowRegistry } from './WorkflowRegistry'

/**
 * FlowStateManager 服务类
 */
export class FlowStateManager {
  private fsService: FileSystemService
  private instances: Map<string, FlowInstance> = new Map()

  constructor(fsService: FileSystemService) {
    this.fsService = fsService
  }

  /**
   * 创建Flow实例
   * @param params 创建参数
   * @returns Flow实例对象
   */
  async createInstance(params: CreateFlowInstanceParams): Promise<FlowInstance> {
    try {
      // 获取工作流定义
      const definition = workflowRegistry.getDefinition(params.type)
      if (!definition) {
        throw errorHandler.createError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'FlowStateManager',
          'createInstance',
          `工作流类型不存在: ${params.type}`
        )
      }

      // 获取当前时间（ISO 8601 字符串）
      const currentTime = (await timeService.getCurrentTime()).toISOString()

      // 生成实例ID
      const instanceId = this.generateInstanceId(params.type)

      // 创建初始状态
      const initialState: FlowState = {
        flowId: instanceId,
        projectId: params.projectId,
        currentStep: 0,
        currentSubStep: -1,
        steps: {},
        data: params.initialData || {},
        createdAt: currentTime,
        updatedAt: currentTime
      }

      // 初始化步骤状态
      definition.steps?.forEach(step => {
        initialState.steps[step.id] = {
          status: 'pending',
          updatedAt: currentTime
        }
      })

      // 创建实例
      const instance: FlowInstance = {
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
        'FlowStateManager',
        { type: params.type, projectId: params.projectId }
      )

      return instance
    } catch (error) {
      logger.error(
        '创建工作流实例失败',
        'FlowStateManager',
        { params, error }
      )
      throw error
    }
  }

  /**
   * 保存工作流状态
   * @param flowId 工作流实例ID
   * @param state 工作流状态
   */
  async saveState(flowId: string, state: FlowState): Promise<void> {
    try {
      if (!state.projectId) {
        throw new Error('FlowState must have projectId')
      }

      const statePath = this.getStatePath(flowId)

      // 更新时间戳（ISO 8601 字符串）
      state.updatedAt = (await timeService.getCurrentTime()).toISOString()

      // 保存状态文件
      await this.fsService.saveJSON(statePath, state)

      logger.debug(
        `工作流状态已保存: ${flowId}`,
        'FlowStateManager',
        { currentStep: state.currentStep }
      )
    } catch (error) {
      logger.error(
        '保存工作流状态失败',
        'FlowStateManager',
        { flowId, error }
      )
      throw errorHandler.createError(
        ErrorCode.WORKFLOW_SAVE_ERROR,
        'FlowStateManager',
        'saveState',
        `保存工作流状态失败: ${flowId}`
      )
    }
  }

  /**
   * 加载工作流状态
   * @param flowId 工作流实例ID
   * @returns 工作流状态，如果不存在则返回 null
   */
  async loadState(flowId: string): Promise<FlowState | null> {
    try {
      const statePath = this.getStatePath(flowId)
      const state = await this.fsService.readJSON<FlowState>(statePath)

      if (state) {
        logger.debug(
          `工作流状态已加载: ${flowId}`,
          'FlowStateManager',
          { currentStep: state.currentStep }
        )
      }

      return state
    } catch (error) {
      logger.error(
        '加载工作流状态失败',
        'FlowStateManager',
        { flowId, error }
      )
      return null
    }
  }

  /**
   * 更新步骤状态
   * @param flowId 工作流实例ID
   * @param stepId 步骤ID
   * @param status 步骤状态
   * @param data 可选的步骤数据
   */
  async updateStepStatus(
    flowId: string,
    stepId: string,
    status: WorkflowStepStatus,
    data?: unknown
  ): Promise<void> {
    try {
      // 加载当前状态
      const state = await this.loadState(flowId)
      if (!state) {
        throw errorHandler.createError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'FlowStateManager',
          'updateStepStatus',
          `工作流状态不存在: ${flowId}`
        )
      }

      // 获取当前时间（ISO 8601 字符串）
      const currentTime = (await timeService.getCurrentTime()).toISOString()

      // 更新步骤状态
      state.steps[stepId] = {
        status,
        updatedAt: currentTime,
        data
      }

      // 保存状态
      await this.saveState(flowId, state)

      logger.info(
        `步骤状态已更新: ${stepId} -> ${status}`,
        'FlowStateManager',
        { flowId }
      )
    } catch (error) {
      logger.error(
        '更新步骤状态失败',
        'FlowStateManager',
        { flowId, stepId, status, error }
      )
      throw error
    }
  }

  /**
   * 更新当前步骤索引
   * @param flowId 工作流实例ID
   * @param stepIndex 步骤索引
   */
  async updateCurrentStep(flowId: string, stepIndex: number): Promise<void> {
    try {
      const state = await this.loadState(flowId)
      if (!state) {
        throw errorHandler.createError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'FlowStateManager',
          'updateCurrentStep',
          `工作流状态不存在: ${flowId}`
        )
      }

      state.currentStep = stepIndex
      await this.saveState(flowId, state)

      logger.info(
        `当前步骤已更新: ${stepIndex}`,
        'FlowStateManager',
        { flowId }
      )
    } catch (error) {
      logger.error(
        '更新当前步骤失败',
        'FlowStateManager',
        { flowId, stepIndex, error }
      )
      throw error
    }
  }

  /**
   * 保存工作流实例
   * @param instance 工作流实例
   */
  private async saveInstance(instance: FlowInstance): Promise<void> {
    try {
      const instancePath = this.getInstancePath(instance.id)
      await this.fsService.saveJSON(instancePath, instance)

      logger.debug(
        `工作流实例已保存: ${instance.id}`,
        'FlowStateManager'
      )
    } catch (error) {
      logger.error(
        '保存工作流实例失败',
        'FlowStateManager',
        { instanceId: instance.id, error }
      )
      throw errorHandler.createError(
        ErrorCode.WORKFLOW_SAVE_ERROR,
        'FlowStateManager',
        'saveInstance',
        `保存工作流实例失败: ${instance.id}`
      )
    }
  }

  /**
   * 加载工作流实例
   * @param flowId 工作流实例ID
   * @returns 工作流实例，如果不存在则返回 null
   */
  async loadInstance(flowId: string): Promise<FlowInstance | null> {
    try {
      // 先从缓存查找
      if (this.instances.has(flowId)) {
        return this.instances.get(flowId)!
      }

      // 从文件加载
      const instancePath = this.getInstancePath(flowId)
      const instance = await this.fsService.readJSON<FlowInstance>(instancePath)

      if (instance) {
        // 缓存实例
        this.instances.set(flowId, instance)

        logger.debug(
          `工作流实例已加载: ${flowId}`,
          'FlowStateManager'
        )
      }

      return instance
    } catch (error) {
      logger.error(
        '加载工作流实例失败',
        'FlowStateManager',
        { flowId, error }
      )
      return null
    }
  }

  /**
   * 获取状态文件路径
   * @param flowId 工作流实例ID
   * @returns 状态文件路径
   */
  private getStatePath(flowId: string): string {
    return path.join(
      this.fsService.getDataDir(),
      'workflows',
      flowId,
      'state.json'
    )
  }

  /**
   * 获取实例文件路径
   * @param flowId 工作流实例ID
   * @returns 实例文件路径
   */
  private getInstancePath(flowId: string): string {
    return path.join(
      this.fsService.getDataDir(),
      'workflows',
      flowId,
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
  async listInstances(projectId?: string): Promise<FlowInstance[]> {
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
        'FlowStateManager',
        { projectId, error }
      )
      return []
    }
  }

  /**
   * 删除工作流实例
   * @param flowId 工作流实例ID
   */
  async deleteInstance(flowId: string): Promise<void> {
    try {
      const instanceDir = path.join(
        this.fsService.getDataDir(),
        'workflows',
        flowId
      )

      // 删除目录
      await this.fsService.deleteDir(instanceDir)

      // 从缓存移除
      this.instances.delete(flowId)

      logger.info(
        `工作流实例已删除: ${flowId}`,
        'FlowStateManager'
      )
    } catch (error) {
      logger.error(
        '删除工作流实例失败',
        'FlowStateManager',
        { flowId, error }
      )
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'FlowStateManager',
        'deleteInstance',
        `删除工作流实例失败: ${flowId}`
      )
    }
  }
}

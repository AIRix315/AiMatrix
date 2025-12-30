/**
 * WorkflowRegistry 服务 - 工作流注册表
 *
 * 功能：
 * - 工作流定义注册和查询
 * - 工作流类型管理
 * - 支持动态注册和查询工作流定义
 */

import { logger } from './Logger'
import { errorHandler, ErrorCode } from './ServiceErrorHandler'
import { WorkflowDefinition } from '@/shared/types'

/**
 * WorkflowRegistry 服务类
 */
export class WorkflowRegistry {
  private definitions: Map<string, WorkflowDefinition> = new Map()

  /**
   * 注册工作流定义
   * @param definition 工作流定义
   */
  register(definition: WorkflowDefinition): void {
    try {
      // 验证工作流定义
      this.validateDefinition(definition)

      // 检查是否已注册
      if (this.definitions.has(definition.type)) {
        logger.warn(
          `工作流类型 "${definition.type}" 已存在，将被覆盖`,
          'WorkflowRegistry',
          { definitionId: definition.id }
        )
      }

      // 注册工作流定义
      this.definitions.set(definition.type, definition)

      logger.info(
        `工作流已注册: ${definition.name} (类型: ${definition.type})`,
        'WorkflowRegistry',
        { definitionId: definition.id, stepsCount: definition.steps.length }
      )
    } catch (error) {
      logger.error(
        '注册工作流失败',
        'WorkflowRegistry',
        { definitionId: definition.id, error }
      )

      if (error instanceof Error) {
        throw errorHandler.createError(
          ErrorCode.INVALID_PARAMETER,
          'WorkflowRegistry',
          'register',
          `注册工作流失败: ${error.message}`
        )
      }
      throw error
    }
  }

  /**
   * 获取工作流定义
   * @param type 工作流类型
   * @returns 工作流定义，如果不存在则返回 undefined
   */
  getDefinition(type: string): WorkflowDefinition | undefined {
    return this.definitions.get(type)
  }

  /**
   * 检查工作流类型是否已注册
   * @param type 工作流类型
   * @returns 是否已注册
   */
  has(type: string): boolean {
    return this.definitions.has(type)
  }

  /**
   * 获取所有已注册的工作流定义
   * @returns 工作流定义数组
   */
  listAll(): WorkflowDefinition[] {
    return Array.from(this.definitions.values())
  }

  /**
   * 按类型过滤工作流定义
   * @param filter 过滤条件
   * @returns 过滤后的工作流定义数组
   */
  filter(filter: {
    type?: string
    name?: string
    version?: string
  }): WorkflowDefinition[] {
    let workflows = this.listAll()

    if (filter.type) {
      workflows = workflows.filter(w => w.type === filter.type)
    }

    if (filter.name) {
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(filter.name!.toLowerCase())
      )
    }

    if (filter.version) {
      workflows = workflows.filter(w => w.version === filter.version)
    }

    return workflows
  }

  /**
   * 注销工作流定义
   * @param type 工作流类型
   * @returns 是否注销成功
   */
  unregister(type: string): boolean {
    const deleted = this.definitions.delete(type)

    if (deleted) {
      logger.info(
        `工作流已注销: ${type}`,
        'WorkflowRegistry'
      )
    }

    return deleted
  }

  /**
   * 清空所有工作流定义
   */
  clear(): void {
    const count = this.definitions.size
    this.definitions.clear()

    logger.info(
      `已清空所有工作流定义 (${count}个)`,
      'WorkflowRegistry'
    )
  }

  /**
   * 验证工作流定义
   * @param definition 工作流定义
   */
  private validateDefinition(definition: WorkflowDefinition): void {
    if (!definition.id || typeof definition.id !== 'string') {
      throw new Error('工作流定义缺少有效的 id')
    }

    if (!definition.type || typeof definition.type !== 'string') {
      throw new Error('工作流定义缺少有效的 type')
    }

    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error('工作流定义缺少有效的 name')
    }

    if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
      throw new Error('工作流定义必须包含至少一个步骤')
    }

    // 验证步骤
    definition.steps.forEach((step, index) => {
      if (!step.id || typeof step.id !== 'string') {
        throw new Error(`步骤 ${index} 缺少有效的 id`)
      }

      if (!step.name || typeof step.name !== 'string') {
        throw new Error(`步骤 ${index} 缺少有效的 name`)
      }

      if (!step.componentType || typeof step.componentType !== 'string') {
        throw new Error(`步骤 ${index} 缺少有效的 componentType`)
      }

      if (!['pending', 'in_progress', 'completed', 'error'].includes(step.status)) {
        throw new Error(`步骤 ${index} 的 status 无效`)
      }
    })

    // 检查步骤ID是否重复
    const stepIds = new Set<string>()
    definition.steps.forEach(step => {
      if (stepIds.has(step.id)) {
        throw new Error(`步骤ID重复: ${step.id}`)
      }
      stepIds.add(step.id)
    })
  }

  /**
   * 获取注册统计信息
   */
  getStats(): {
    total: number
    byType: Record<string, number>
  } {
    const workflows = this.listAll()
    const byType: Record<string, number> = {}

    workflows.forEach(workflow => {
      byType[workflow.type] = (byType[workflow.type] || 0) + 1
    })

    return {
      total: workflows.length,
      byType
    }
  }
}

/**
 * 导出单例实例
 */
export const workflowRegistry = new WorkflowRegistry()

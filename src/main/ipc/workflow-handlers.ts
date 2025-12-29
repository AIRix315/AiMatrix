/**
 * 工作流相关IPC处理器
 */

import { ipcMain } from 'electron'
import { logger } from '../services/Logger'
import { workflowRegistry } from '../services/WorkflowRegistry'
import { WorkflowStateManager } from '../services/WorkflowStateManager'
import { FileSystemService } from '../services/FileSystemService'
import { CreateWorkflowInstanceParams } from '../../shared/types/workflow'

// 创建WorkflowStateManager实例
const fsService = new FileSystemService()
const workflowStateManager = new WorkflowStateManager(fsService)

/**
 * 注册工作流相关IPC处理器
 */
export function registerWorkflowHandlers(): void {
  /**
   * 获取所有已注册的工作流定义
   */
  ipcMain.handle('workflow:listDefinitions', async () => {
    try {
      const definitions = workflowRegistry.listAll()
      return definitions
    } catch (error) {
      logger.error('获取工作流定义列表失败', 'workflow-handlers', { error })
      throw error
    }
  })

  /**
   * 获取工作流定义
   */
  ipcMain.handle('workflow:getDefinition', async (_event, type: string) => {
    try {
      logger.info(`查询工作流定义: ${type}`, 'workflow-handlers')

      // 调试：列出所有已注册的工作流
      const allDefinitions = workflowRegistry.listAll()
      logger.info(`当前已注册的工作流数量: ${allDefinitions.length}`, 'workflow-handlers', {
        types: allDefinitions.map(d => d.type)
      })

      const definition = workflowRegistry.getDefinition(type)
      if (!definition) {
        logger.error(`工作流定义不存在: ${type}`, 'workflow-handlers', {
          requestedType: type,
          availableTypes: allDefinitions.map(d => d.type)
        })
        throw new Error(`工作流定义不存在: ${type}`)
      }

      logger.info(`成功获取工作流定义: ${definition.name}`, 'workflow-handlers')
      return definition
    } catch (error) {
      logger.error('获取工作流定义失败', 'workflow-handlers', { error, type })
      throw error
    }
  })

  /**
   * 创建工作流实例
   */
  ipcMain.handle('workflow:createInstance', async (_event, params: CreateWorkflowInstanceParams) => {
    try {
      if (!params.projectId) {
        throw new Error('projectId is required')
      }
      const instance = await workflowStateManager.createInstance(params)
      return instance
    } catch (error) {
      logger.error('创建工作流实例失败', 'workflow-handlers', { error, params })
      throw error
    }
  })

  /**
   * 加载工作流实例
   */
  ipcMain.handle('workflow:loadInstance', async (_event, workflowId: string) => {
    try {
      const instance = await workflowStateManager.loadInstance(workflowId)
      if (!instance) {
        throw new Error(`工作流实例不存在: ${workflowId}`)
      }
      return instance
    } catch (error) {
      logger.error('加载工作流实例失败', 'workflow-handlers', { error, workflowId })
      throw error
    }
  })

  /**
   * 保存工作流状态
   */
  ipcMain.handle('workflow:saveState', async (_event, workflowId: string, state: any) => {
    try {
      await workflowStateManager.saveState(workflowId, state)
    } catch (error) {
      logger.error('保存工作流状态失败', 'workflow-handlers', { error, workflowId })
      throw error
    }
  })

  /**
   * 加载工作流状态
   */
  ipcMain.handle('workflow:loadState', async (_event, workflowId: string) => {
    try {
      const state = await workflowStateManager.loadState(workflowId)
      return state
    } catch (error) {
      logger.error('加载工作流状态失败', 'workflow-handlers', { error, workflowId })
      throw error
    }
  })

  /**
   * 更新当前步骤
   */
  ipcMain.handle('workflow:updateCurrentStep', async (_event, workflowId: string, stepIndex: number) => {
    try {
      await workflowStateManager.updateCurrentStep(workflowId, stepIndex)
    } catch (error) {
      logger.error('更新当前步骤失败', 'workflow-handlers', { error, workflowId, stepIndex })
      throw error
    }
  })

  /**
   * 更新步骤状态
   */
  ipcMain.handle('workflow:updateStepStatus', async (_event, workflowId: string, stepId: string, status: string, data?: any) => {
    try {
      await workflowStateManager.updateStepStatus(workflowId, stepId, status as any, data)
    } catch (error) {
      logger.error('更新步骤状态失败', 'workflow-handlers', { error, workflowId, stepId, status })
      throw error
    }
  })

  /**
   * 删除工作流实例
   */
  ipcMain.handle('workflow:deleteInstance', async (_event, workflowId: string) => {
    try {
      await workflowStateManager.deleteInstance(workflowId)
    } catch (error) {
      logger.error('删除工作流实例失败', 'workflow-handlers', { error, workflowId })
      throw error
    }
  })

  /**
   * 列出工作流实例
   */
  ipcMain.handle('workflow:listInstances', async (_event, projectId?: string) => {
    try {
      const instances = await workflowStateManager.listInstances(projectId)
      return instances
    } catch (error) {
      logger.error('列出工作流实例失败', 'workflow-handlers', { error, projectId })
      throw error
    }
  })

  logger.info('工作流IPC处理器已注册', 'workflow-handlers')
}

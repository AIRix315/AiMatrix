/**
 * 默认模板工作流定义
 * 用于节点编辑器创建的自定义工作流
 */

import { WorkflowDefinition } from '@/shared/types'

/**
 * 默认模板工作流定义
 * 节点编辑器使用，不包含预定义步骤
 */
export const defTemplateDefinition: WorkflowDefinition = {
  id: 'default-template-001',
  name: '自定义工作流',
  type: 'DefTemplate',
  description: '使用节点编辑器创建的自定义工作流模板',
  version: '1.0.0',
  icon: '📋',
  steps: [],
  defaultState: {},
  metadata: {
    category: 'template',
    tags: ['custom', 'node-editor', 'template'],
    author: 'Matrix Team',
    createdAt: '2026-01-08'
  }
}

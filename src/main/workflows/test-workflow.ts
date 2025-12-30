/**
 * 测试工作流定义
 * 用于验证工作流引擎的完整流程
 */

import { WorkflowDefinition } from '@/shared/types'

/**
 * 测试工作流定义
 * 包含3个简单步骤，用于验证工作流引擎功能
 */
export const testWorkflowDefinition: WorkflowDefinition = {
  id: 'test-workflow-001',
  name: '测试工作流',
  type: 'test',
  description: '一个简单的3步测试工作流，用于验证工作流引擎功能',
  version: '1.0.0',
  icon: '🧪',
  steps: [
    {
      id: 'step-1-input',
      name: '输入数据',
      description: '输入测试数据',
      status: 'pending',
      componentType: 'TestInputPanel'
    },
    {
      id: 'step-2-process',
      name: '处理数据',
      description: '处理输入的数据',
      status: 'pending',
      componentType: 'TestProcessPanel'
    },
    {
      id: 'step-3-output',
      name: '显示结果',
      description: '显示处理结果',
      status: 'pending',
      componentType: 'TestOutputPanel'
    }
  ],
  defaultState: {
    testData: {
      input: '',
      processed: '',
      output: ''
    }
  },
  metadata: {
    category: 'test',
    tags: ['test', 'demo', 'validation'],
    author: 'Matrix Team',
    createdAt: '2025-12-27'
  }
}

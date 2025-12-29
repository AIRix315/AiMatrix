/**
 * IPC 集成测试: workflow 相关通道
 * 测试通道: workflow:execute, workflow:status, workflow:cancel, workflow:list, workflow:save, workflow:load (6个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext, createTestJSON, wait } from './helpers/ipc-test-utils';
import { taskScheduler } from '../../../src/main/services/TaskScheduler';
import { TaskType } from '../../../src/main/services/TaskScheduler';
import { configManager } from '../../../src/main/services/ConfigManager';
import { promises as fs } from 'fs';
import * as path from 'path';

vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { Logger: vi.fn(() => mockLogger), logger: mockLogger, LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } };
});

vi.mock('../../../src/main/services/ConfigManager', () => ({
  configManager: {
    getGeneralSettings: vi.fn().mockReturnValue({ workspacePath: '/test/workspace' }),
    initialize: vi.fn().mockResolvedValue(undefined)
  },
  APIKeyEncryption: vi.fn().mockImplementation(() => ({
    encrypt: vi.fn((text) => `encrypted:${text}`),
    decrypt: vi.fn((text) => text.replace('encrypted:', '')),
    isEncrypted: vi.fn((text) => text.startsWith('encrypted:'))
  }))
}));

describe('IPC Integration: workflow', () => {
  let ctx: IPCTestContext;
  let workspacePath: string;

  beforeEach(async () => {
    ctx = new IPCTestContext('workflow');
    await ctx.setup();
    workspacePath = ctx.getTestDataDir();
    vi.mocked(configManager.getGeneralSettings).mockReturnValue({ workspacePath } as any);
    await taskScheduler.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await taskScheduler.cleanup();
    await ctx.cleanup();
  });

  describe('workflow:execute', () => {
    beforeEach(() => {
      ctx.registerHandler('workflow:execute', async (_, config) => {
        const taskId = await taskScheduler.createTask({ type: TaskType.WORKFLOW, name: 'Workflow Task' });
        return await taskScheduler.executeTask(taskId, config);
      });
    });

    it('应该执行工作流', async () => {
      const executionId = await ctx.invoke('workflow:execute', { workflowType: 'test' });
      expect(executionId).toBeTruthy();
      expect(typeof executionId).toBe('string');
    });
  });

  describe('workflow:status', () => {
    beforeEach(() => {
      ctx.registerHandler('workflow:execute', async (_, config) => {
        const taskId = await taskScheduler.createTask({ type: TaskType.WORKFLOW });
        return await taskScheduler.executeTask(taskId, config);
      });
      ctx.registerHandler('workflow:status', (_, executionId) => taskScheduler.getTaskStatus(executionId));
    });

    it('应该获取工作流状态', async () => {
      const executionId = await ctx.invoke('workflow:execute', {});
      await wait(50);
      const status = await ctx.invoke('workflow:status', executionId);
      expect(status).toBeTruthy();
      expect(status).toHaveProperty('status');
    });
  });

  describe('workflow:cancel', () => {
    beforeEach(() => {
      ctx.registerHandler('workflow:execute', async (_, config) => {
        // 创建一个带有长时间运行处理器的任务
        const taskId = await taskScheduler.createTask({
          type: TaskType.CUSTOM,
          name: 'Long Running Workflow',
          customHandler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return { result: 'completed' };
          }
        });
        return await taskScheduler.executeTask(taskId, config);
      });
      ctx.registerHandler('workflow:cancel', async (_, executionId) => {
        await taskScheduler.cancelTask(executionId);
        return { success: true };
      });
    });

    it('应该取消工作流', async () => {
      const executionId = await ctx.invoke('workflow:execute', {});
      // 等待任务开始运行
      await wait(50);
      const result = await ctx.invoke('workflow:cancel', executionId);
      expect(result.success).toBe(true);
    });
  });

  describe('workflow:list', () => {
    beforeEach(() => {
      ctx.registerHandler('workflow:list', async () => {
        try {
          const workflowsDir = path.join(workspacePath, 'workflows');
          await fs.mkdir(workflowsDir, { recursive: true });
          const files = await fs.readdir(workflowsDir);
          const workflows = [];
          for (const file of files) {
            if (file.endsWith('.json')) {
              const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
              workflows.push(JSON.parse(content));
            }
          }
          return workflows;
        } catch {
          return [];
        }
      });
    });

    it('应该列出所有工作流', async () => {
      const workflows = await ctx.invoke('workflow:list');
      expect(Array.isArray(workflows)).toBe(true);
    });

    it('空目录应该返回空数组', async () => {
      const workflows = await ctx.invoke('workflow:list');
      expect(workflows).toEqual([]);
    });
  });

  describe('workflow:save', () => {
    beforeEach(() => {
      ctx.registerHandler('workflow:save', async (_, workflowId, config) => {
        const workflowsDir = path.join(workspacePath, 'workflows');
        await fs.mkdir(workflowsDir, { recursive: true });
        const filePath = path.join(workflowsDir, `${workflowId}.json`);
        await fs.writeFile(filePath, JSON.stringify(config, null, 2));
        return { success: true };
      });
    });

    it('应该保存工作流', async () => {
      const result = await ctx.invoke('workflow:save', 'test-workflow', { name: 'Test Workflow' });
      expect(result.success).toBe(true);
    });
  });

  describe('workflow:load', () => {
    beforeEach(() => {
      ctx.registerHandler('workflow:save', async (_, workflowId, config) => {
        const workflowsDir = path.join(workspacePath, 'workflows');
        await fs.mkdir(workflowsDir, { recursive: true });
        await fs.writeFile(path.join(workflowsDir, `${workflowId}.json`), JSON.stringify(config));
        return { success: true };
      });
      ctx.registerHandler('workflow:load', async (_, workflowId) => {
        const workflowsDir = path.join(workspacePath, 'workflows');
        const content = await fs.readFile(path.join(workflowsDir, `${workflowId}.json`), 'utf-8');
        return JSON.parse(content);
      });
    });

    it('应该加载工作流', async () => {
      await ctx.invoke('workflow:save', 'load-test', { name: 'Load Test' });
      const config = await ctx.invoke('workflow:load', 'load-test');
      expect(config.name).toBe('Load Test');
    });
  });
});

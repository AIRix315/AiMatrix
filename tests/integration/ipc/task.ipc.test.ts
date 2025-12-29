/**
 * IPC 集成测试: task 相关通道
 * 测试通道: task:create, task:execute, task:status, task:cancel, task:results (5个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext, wait } from './helpers/ipc-test-utils';
import { taskScheduler } from '../../../src/main/services/TaskScheduler';
import { TaskType, TaskStatus } from '../../../src/main/services/TaskScheduler';

vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { Logger: vi.fn(() => mockLogger), logger: mockLogger, LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } };
});

vi.mock('../../../src/main/services/ServiceErrorHandler', () => {
  const mock = { handleError: vi.fn(), createError: vi.fn((code, msg) => new Error(msg)), wrapAsync: vi.fn((fn) => fn()) };
  const ErrorCode = {
    UNKNOWN: 'UNKNOWN',
    INVALID_PARAMETER: 'INVALID_PARAMETER',
    OPERATION_FAILED: 'OPERATION_FAILED',
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS'
  };
  return { serviceErrorHandler: mock, errorHandler: mock, ErrorCode };
});

describe('IPC Integration: task', () => {
  let ctx: IPCTestContext;

  beforeEach(async () => {
    ctx = new IPCTestContext('task');
    await ctx.setup();
    await taskScheduler.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await taskScheduler.cleanup();
    await ctx.cleanup();
  });

  describe('task:create', () => {
    beforeEach(() => {
      ctx.registerHandler('task:create', (_, config) => taskScheduler.createTask(config));
    });

    it('应该成功创建任务', async () => {
      const taskId = await ctx.invoke('task:create', {
        type: TaskType.WORKFLOW,
        name: 'Test Task'
      });
      expect(taskId).toBeTruthy();
      expect(typeof taskId).toBe('string');
    });

    it('应该支持不同任务类型', async () => {
      const workflowTask = await ctx.invoke('task:create', { type: TaskType.WORKFLOW, name: 'Workflow' });
      const pluginTask = await ctx.invoke('task:create', { type: TaskType.PLUGIN, name: 'Plugin' });
      expect(workflowTask).toBeTruthy();
      expect(pluginTask).toBeTruthy();
    });

    it('应该支持不同任务配置', async () => {
      const task1 = await ctx.invoke('task:create', { type: TaskType.WORKFLOW, name: 'Task 1', description: 'Description 1' });
      const task2 = await ctx.invoke('task:create', { type: TaskType.WORKFLOW, name: 'Task 2', description: 'Description 2' });
      expect(task1).toBeTruthy();
      expect(task2).toBeTruthy();
    });
  });

  describe('task:execute', () => {
    beforeEach(() => {
      ctx.registerHandler('task:create', (_, config) => taskScheduler.createTask(config));
      ctx.registerHandler('task:execute', (_, taskId, inputs) => taskScheduler.executeTask(taskId, inputs));
    });

    it('应该执行任务', async () => {
      const taskId = await ctx.invoke('task:create', { type: TaskType.WORKFLOW, name: 'Execute Test' });
      const executionId = await ctx.invoke('task:execute', taskId, {});
      expect(executionId).toBeTruthy();
    });
  });

  describe('task:status', () => {
    beforeEach(() => {
      ctx.registerHandler('task:create', (_, config) => taskScheduler.createTask(config));
      ctx.registerHandler('task:execute', (_, taskId, inputs) => taskScheduler.executeTask(taskId, inputs));
      ctx.registerHandler('task:status', (_, executionId) => taskScheduler.getTaskStatus(executionId));
    });

    it('应该获取任务状态', async () => {
      const taskId = await ctx.invoke('task:create', { type: TaskType.WORKFLOW });
      const executionId = await ctx.invoke('task:execute', taskId, {});
      const status = await ctx.invoke('task:status', executionId);
      expect(status).toBeTruthy();
      expect(status).toHaveProperty('status');
    });
  });

  describe('task:cancel', () => {
    beforeEach(() => {
      ctx.registerHandler('task:create', (_, config) => taskScheduler.createTask(config));
      ctx.registerHandler('task:execute', (_, taskId, inputs) => taskScheduler.executeTask(taskId, inputs));
      ctx.registerHandler('task:cancel', async (_, executionId) => {
        await taskScheduler.cancelTask(executionId);
        return { success: true };
      });
    });

    it('应该取消任务', async () => {
      // 创建一个带有自定义处理器的长时间运行任务
      const taskId = await ctx.invoke('task:create', {
        type: TaskType.CUSTOM,
        name: 'Long Running Task',
        customHandler: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒延迟
          return { result: 'completed' };
        }
      });
      const executionId = await ctx.invoke('task:execute', taskId, {});

      // 等待任务开始运行
      await wait(50);

      // 立即取消
      const result = await ctx.invoke('task:cancel', executionId);
      expect(result.success).toBe(true);
    });
  });

  describe('task:results', () => {
    beforeEach(() => {
      ctx.registerHandler('task:create', (_, config) => taskScheduler.createTask(config));
      ctx.registerHandler('task:execute', (_, taskId, inputs) => taskScheduler.executeTask(taskId, inputs));
      ctx.registerHandler('task:results', (_, executionId) => taskScheduler.getTaskResults(executionId));
    });

    it('应该获取任务结果', async () => {
      const taskId = await ctx.invoke('task:create', { type: TaskType.WORKFLOW });
      const executionId = await ctx.invoke('task:execute', taskId, {});
      await wait(100);
      const results = await ctx.invoke('task:results', executionId);
      expect(results).toBeDefined();
    });
  });
});

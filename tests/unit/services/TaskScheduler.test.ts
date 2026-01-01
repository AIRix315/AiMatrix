import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TaskScheduler, TaskStatus, TaskType, TaskConfig } from '../../../src/main/services/TaskScheduler';
import { logger } from '../../../src/main/services/Logger';
import { apiManager } from '../../../src/main/services/APIManager';

// Mock Logger
vi.mock('../../../src/main/services/Logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock ServiceErrorHandler
vi.mock('../../../src/main/services/ServiceErrorHandler', () => ({
  errorHandler: {
    createError: vi.fn((code, service, operation, message, context) =>
      new Error(`${code}: ${message}`)
    ),
    wrapAsync: vi.fn((fn) => fn()),
  },
  ErrorCode: {
    TASK_CREATE_ERROR: 'TASK_CREATE_ERROR',
    TASK_EXECUTE_ERROR: 'TASK_EXECUTE_ERROR',
    TASK_EXECUTION_ERROR: 'TASK_EXECUTION_ERROR',
    TASK_CANCEL_ERROR: 'TASK_CANCEL_ERROR',
    TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  }
}));

// Mock APIManager
vi.mock('../../../src/main/services/APIManager', () => ({
  apiManager: {
    callAPI: vi.fn().mockResolvedValue({ success: true, data: 'result' }),
  }
}));

describe('TaskScheduler - Mock模式测试', () => {
  let taskScheduler: TaskScheduler;

  beforeEach(async () => {
    vi.clearAllMocks();
    taskScheduler = new TaskScheduler();
    await taskScheduler.initialize();
  });

  afterEach(async () => {
    await taskScheduler.cleanup();
  });

  describe('initialize', () => {
    it('应该成功初始化任务调度器', async () => {
      const scheduler = new TaskScheduler();
      await scheduler.initialize();

      expect(logger.info).toHaveBeenCalledWith('Initializing TaskScheduler', 'TaskScheduler');
      expect(logger.info).toHaveBeenCalledWith('TaskScheduler initialized', 'TaskScheduler');
    });
  });

  describe('createTask', () => {
    it('应该成功创建API调用任务', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test API Task',
        description: 'Test description',
        apiName: 'test-api',
        apiParams: { method: 'POST', body: {} },
      };

      const taskId = await taskScheduler.createTask(config);

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task created'),
        'TaskScheduler',
        expect.objectContaining({ name: 'Test API Task' })
      );
    });

    it('应该成功创建工作流任务', async () => {
      const config: TaskConfig = {
        type: TaskType.WORKFLOW,
        name: 'Test Workflow Task',
      };

      const taskId = await taskScheduler.createTask(config);

      expect(taskId).toBeDefined();
    });

    it('应该成功创建插件任务', async () => {
      const config: TaskConfig = {
        type: TaskType.PLUGIN,
        name: 'Test Plugin Task',
        pluginId: 'test-plugin',
        pluginAction: 'run',
      };

      const taskId = await taskScheduler.createTask(config);

      expect(taskId).toBeDefined();
    });

    it('应该成功创建自定义任务', async () => {
      const customHandler = vi.fn().mockResolvedValue({ result: 'custom' });
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Test Custom Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);

      expect(taskId).toBeDefined();
    });

    it('应该支持任务元数据', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test Task',
        metadata: { priority: 'high', userId: '123' },
      };

      const taskId = await taskScheduler.createTask(config);

      expect(taskId).toBeDefined();
    });
  });

  describe('executeTask', () => {
    it('应该成功执行API调用任务', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test API Task',
        apiName: 'test-api',
        apiParams: { method: 'POST' },
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId, { data: 'input' });

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(apiManager.callAPI).toHaveBeenCalled();
    });

    it('应该成功执行自定义任务', async () => {
      const customHandler = vi.fn().mockResolvedValue({ result: 'success' });
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Test Custom Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId, { input: 'test' });

      expect(executionId).toBeDefined();

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(customHandler).toHaveBeenCalledWith({ input: 'test' });
    });

    it('应该在任务不存在时抛出错误', async () => {
      await expect(
        taskScheduler.executeTask('non-existent', {})
      ).rejects.toThrow('Task not found');
    });

    it('应该记录任务执行状态', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test Task',
        apiName: 'test-api',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      const status = await taskScheduler.getTaskStatus(executionId);

      expect(status).toMatchObject({
        id: executionId,
        taskId,
        status: expect.any(String),
      });
    });

    it('应该在API调用失败时设置错误状态', async () => {
      vi.mocked(apiManager.callAPI).mockRejectedValueOnce(new Error('API Error'));

      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test Task',
        apiName: 'test-api',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 等待异步任务完成失败
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = await taskScheduler.getTaskStatus(executionId);

      expect(status.status).toBe(TaskStatus.FAILED);
      expect(status.error).toContain('API Error');
    });
  });

  describe('getTaskStatus', () => {
    it('应该返回执行状态', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test Task',
        apiName: 'test-api',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);
      const status = await taskScheduler.getTaskStatus(executionId);

      expect(status).toMatchObject({
        id: executionId,
        taskId,
        status: expect.any(String),
      });
    });

    it('应该在执行不存在时抛出错误', async () => {
      await expect(
        taskScheduler.getTaskStatus('non-existent')
      ).rejects.toThrow();
    });
  });

  describe('cancelExecution', () => {
    it('应该成功取消pending任务', async () => {
      // 创建一个需要较长时间的任务
      const customHandler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { result: 'done' };
      });

      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Long Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 立即取消（在任务还在pending/running时）
      await taskScheduler.cancelExecution(executionId);

      const status = await taskScheduler.getTaskStatus(executionId);
      expect(status.status).toBe(TaskStatus.CANCELLED);
    });

    it('应该在执行不存在时抛出错误', async () => {
      await expect(
        taskScheduler.cancelExecution('non-existent')
      ).rejects.toThrow();
    });

    it('应该在执行已完成时抛出错误', async () => {
      const customHandler = vi.fn().mockResolvedValue({ result: 'done' });
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Test Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 100));

      await expect(
        taskScheduler.cancelExecution(executionId)
      ).rejects.toThrow();
    });
  });

  describe('listTasks', () => {
    it('应该列出所有任务', async () => {
      const config1: TaskConfig = { type: TaskType.API_CALL, name: 'Task 1', apiName: 'api1' };
      const config2: TaskConfig = { type: TaskType.WORKFLOW, name: 'Task 2' };

      await taskScheduler.createTask(config1);
      await taskScheduler.createTask(config2);

      const tasks = await taskScheduler.listTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.config.name)).toContain('Task 1');
      expect(tasks.map(t => t.config.name)).toContain('Task 2');
    });

    it('应该返回空数组当没有任务时', async () => {
      const tasks = await taskScheduler.listTasks();

      expect(tasks).toEqual([]);
    });
  });

  describe('getTask', () => {
    it('应该成功获取任务详情', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test Task',
        apiName: 'test-api',
        description: 'Test description',
      };

      const taskId = await taskScheduler.createTask(config);
      const task = await taskScheduler.getTask(taskId);

      expect(task).toMatchObject({
        id: taskId,
        config: expect.objectContaining({
          name: 'Test Task',
          description: 'Test description',
        }),
        status: TaskStatus.PENDING,
      });
    });

    it('应该在任务不存在时抛出错误', async () => {
      await expect(
        taskScheduler.getTask('non-existent')
      ).rejects.toThrow();
    });
  });

  describe('getTaskResults', () => {
    it('应该成功获取已完成任务的结果', async () => {
      const customHandler = vi.fn().mockResolvedValue({ result: 'success' });
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Test Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await taskScheduler.getTaskResults(executionId);

      expect(result).toEqual({ result: 'success' });
    });

    it('应该在执行未完成时抛出错误', async () => {
      const customHandler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { result: 'done' };
      });

      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Long Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 立即查询结果（任务还未完成）
      await expect(
        taskScheduler.getTaskResults(executionId)
      ).rejects.toThrow('Execution not completed');
    });

    it('应该在执行不存在时抛出错误', async () => {
      await expect(
        taskScheduler.getTaskResults('non-existent')
      ).rejects.toThrow('Execution not found');
    });
  });

  describe('getExecution', () => {
    it('应该成功获取执行信息', async () => {
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Test Task',
        customHandler: vi.fn().mockResolvedValue({ result: 'ok' }),
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      const execution = await taskScheduler.getExecution(executionId);

      expect(execution).not.toBeNull();
      expect(execution?.id).toBe(executionId);
      expect(execution?.taskId).toBe(taskId);
    });

    it('应该在执行不存在时返回null', async () => {
      const execution = await taskScheduler.getExecution('non-existent');

      expect(execution).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('应该成功清理所有资源', async () => {
      const config1: TaskConfig = { type: TaskType.CUSTOM, name: 'Task 1', customHandler: vi.fn() };
      const config2: TaskConfig = { type: TaskType.CUSTOM, name: 'Task 2', customHandler: vi.fn() };

      await taskScheduler.createTask(config1);
      await taskScheduler.createTask(config2);

      await taskScheduler.cleanup();

      expect(logger.info).toHaveBeenCalledWith('Cleaning up TaskScheduler', 'TaskScheduler');
      expect(logger.info).toHaveBeenCalledWith('TaskScheduler cleaned up', 'TaskScheduler');
    });

    it('应该取消所有运行中的任务', async () => {
      const customHandler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { result: 'done' };
      });

      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Long Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      await taskScheduler.executeTask(taskId);

      // 清理应该取消运行中的任务
      await taskScheduler.cleanup();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('cleaned up'),
        'TaskScheduler'
      );
    });
  });

  describe('边界条件测试', () => {
    it('应该处理并发任务执行', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Concurrent Task',
        apiName: 'test-api',
      };

      const taskId = await taskScheduler.createTask(config);

      const executions = await Promise.all([
        taskScheduler.executeTask(taskId),
        taskScheduler.executeTask(taskId),
        taskScheduler.executeTask(taskId),
      ]);

      expect(executions).toHaveLength(3);
      expect(new Set(executions).size).toBe(3); // 确保每个执行ID都是唯一的
    });

    it('应该处理任务执行失败并继续', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Failing Task',
        customHandler: failingHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 等待任务执行失败
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await taskScheduler.getTaskStatus(executionId);

      expect(status.status).toBe(TaskStatus.FAILED);
      expect(status.error).toContain('Handler failed');
    });

    it('应该处理大量任务创建', async () => {
      const taskIds = [];

      for (let i = 0; i < 100; i++) {
        const config: TaskConfig = {
          type: TaskType.CUSTOM,
          name: `Task ${i}`,
          customHandler: vi.fn().mockResolvedValue({ result: 'ok' }),
        };
        taskIds.push(await taskScheduler.createTask(config));
      }

      expect(taskIds).toHaveLength(100);
      expect(new Set(taskIds).size).toBe(100); // 确保所有ID都是唯一的
    });

    it('应该处理任务执行进度更新', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Progress Task',
        apiName: 'test-api',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      const status = await taskScheduler.getTaskStatus(executionId);

      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('应该处理空输入参数', async () => {
      const config: TaskConfig = {
        type: TaskType.API_CALL,
        name: 'Test Task',
        apiName: 'test-api',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      expect(executionId).toBeDefined();
    });

    it('应该处理复杂输入参数', async () => {
      const complexInput = {
        nested: {
          data: [1, 2, 3],
          object: { key: 'value' },
        },
        array: [{ id: 1 }, { id: 2 }],
      };

      const customHandler = vi.fn().mockResolvedValue({ result: 'ok' });
      const config: TaskConfig = {
        type: TaskType.CUSTOM,
        name: 'Complex Input Task',
        customHandler,
      };

      const taskId = await taskScheduler.createTask(config);
      await taskScheduler.executeTask(taskId, complexInput);

      // 等待任务执行
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(customHandler).toHaveBeenCalledWith(complexInput);
    });

    it('应该处理工作流任务类型', async () => {
      const config: TaskConfig = {
        type: TaskType.WORKFLOW,
        name: 'Workflow Task',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = await taskScheduler.getTaskStatus(executionId);
      expect(status.status).toBe(TaskStatus.COMPLETED);
    });

    it('应该处理插件任务类型', async () => {
      const config: TaskConfig = {
        type: TaskType.PLUGIN,
        name: 'Plugin Task',
        pluginId: 'test-plugin',
        pluginAction: 'execute',
      };

      const taskId = await taskScheduler.createTask(config);
      const executionId = await taskScheduler.executeTask(taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = await taskScheduler.getTaskStatus(executionId);
      expect(status.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('批量处理功能', () => {
    describe('executeBatchSerial', () => {
      it('应该串行执行所有任务并全部成功', async () => {
        const items = [1, 2, 3, 4, 5];
        const processor = vi.fn(async (item: number) => item * 2);
        const onProgress = vi.fn();

        const result = await taskScheduler.executeBatchSerial(items, processor, onProgress);

        expect(result.success).toEqual([2, 4, 6, 8, 10]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(5);
        expect(result.successCount).toBe(5);
        expect(result.failedCount).toBe(0);
        expect(result.successRate).toBe(1);
        expect(processor).toHaveBeenCalledTimes(5);
        expect(onProgress).toHaveBeenCalledTimes(5);
      });

      it('应该处理部分失败的情况', async () => {
        const items = [1, 2, 3, 4, 5];
        const processor = vi.fn(async (item: number) => {
          if (item === 3 || item === 5) {
            throw new Error(`Failed for item ${item}`);
          }
          return item * 2;
        });

        const result = await taskScheduler.executeBatchSerial(items, processor);

        expect(result.success).toEqual([2, 4, 8]);
        expect(result.failed).toHaveLength(2);
        expect(result.failed[0].item).toBe(3);
        expect(result.failed[1].item).toBe(5);
        expect(result.successCount).toBe(3);
        expect(result.failedCount).toBe(2);
        expect(result.successRate).toBe(0.6);
      });

      it('应该调用进度回调', async () => {
        const items = [1, 2, 3];
        const processor = vi.fn(async (item: number) => item * 2);
        const onProgress = vi.fn();

        await taskScheduler.executeBatchSerial(items, processor, onProgress);

        expect(onProgress).toHaveBeenCalledTimes(3);
        expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3, 1);
        expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3, 2);
        expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3, 3);
      });

      it('应该处理空列表', async () => {
        const items: number[] = [];
        const processor = vi.fn();

        const result = await taskScheduler.executeBatchSerial(items, processor);

        expect(result.success).toEqual([]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.successRate).toBe(0);
        expect(processor).not.toHaveBeenCalled();
      });
    });

    describe('executeBatchParallel', () => {
      it('应该并行执行所有任务并全部成功', async () => {
        const items = [1, 2, 3, 4, 5];
        const processor = vi.fn(async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return item * 2;
        });
        const onProgress = vi.fn();

        const result = await taskScheduler.executeBatchParallel(items, processor, 3, onProgress);

        expect(result.success).toHaveLength(5);
        expect([...result.success].sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(5);
        expect(result.successCount).toBe(5);
        expect(result.failedCount).toBe(0);
        expect(result.successRate).toBe(1);
        expect(processor).toHaveBeenCalledTimes(5);
        expect(onProgress).toHaveBeenCalledTimes(5);
      });

      it('应该控制并发数', async () => {
        const items = [1, 2, 3, 4, 5];
        const activeCount = { value: 0 };
        const maxActiveCount = { value: 0 };

        const processor = vi.fn(async (item: number) => {
          activeCount.value++;
          maxActiveCount.value = Math.max(maxActiveCount.value, activeCount.value);
          await new Promise(resolve => setTimeout(resolve, 20));
          activeCount.value--;
          return item * 2;
        });

        await taskScheduler.executeBatchParallel(items, processor, 2);

        // 验证最大并发数不超过2
        expect(maxActiveCount.value).toBeLessThanOrEqual(2);
        expect(maxActiveCount.value).toBeGreaterThan(0);
      });

      it('应该处理部分失败的情况', async () => {
        const items = [1, 2, 3, 4, 5];
        const processor = vi.fn(async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          if (item === 2 || item === 4) {
            throw new Error(`Failed for item ${item}`);
          }
          return item * 2;
        });

        const result = await taskScheduler.executeBatchParallel(items, processor, 3);

        expect([...result.success].sort((a, b) => a - b)).toEqual([2, 6, 10]);
        expect(result.failed).toHaveLength(2);
        expect(result.successCount).toBe(3);
        expect(result.failedCount).toBe(2);
        expect(result.successRate).toBe(0.6);
      });

      it('应该比串行执行更快', async () => {
        const items = [1, 2, 3, 4, 5];
        const delayMs = 50;
        const processor = async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return item * 2;
        };

        // 串行执行
        const serialStart = Date.now();
        await taskScheduler.executeBatchSerial(items, processor);
        const serialTime = Date.now() - serialStart;

        // 并行执行（最大并发5）
        const parallelStart = Date.now();
        await taskScheduler.executeBatchParallel(items, processor, 5);
        const parallelTime = Date.now() - parallelStart;

        // 并行应该明显快于串行
        expect(parallelTime).toBeLessThan(serialTime * 0.6);
      });

      it('应该调用进度回调', async () => {
        const items = [1, 2, 3];
        const processor = vi.fn(async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return item * 2;
        });
        const onProgress = vi.fn();

        await taskScheduler.executeBatchParallel(items, processor, 2, onProgress);

        expect(onProgress).toHaveBeenCalledTimes(3);
        // 注意：并行执行时，回调顺序可能不固定
      });

      it('应该处理空列表', async () => {
        const items: number[] = [];
        const processor = vi.fn();

        const result = await taskScheduler.executeBatchParallel(items, processor);

        expect(result.success).toEqual([]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.successRate).toBe(0);
        expect(processor).not.toHaveBeenCalled();
      });
    });

    describe('retryFailedTasks', () => {
      it('应该重试所有失败的任务', async () => {
        const failedItems = [
          { item: 3, error: new Error('Failed 3') },
          { item: 5, error: new Error('Failed 5') }
        ];
        const processor = vi.fn(async (item: number) => item * 2);

        const result = await taskScheduler.retryFailedTasks(failedItems, processor);

        expect(result.success).toEqual([6, 10]);
        expect(result.failed).toEqual([]);
        expect(result.successCount).toBe(2);
        expect(processor).toHaveBeenCalledTimes(2);
        expect(processor).toHaveBeenCalledWith(3);
        expect(processor).toHaveBeenCalledWith(5);
      });

      it('应该处理重试时仍然失败的任务', async () => {
        const failedItems = [
          { item: 3, error: new Error('Failed 3') },
          { item: 5, error: new Error('Failed 5') }
        ];
        const processor = vi.fn(async (item: number) => {
          if (item === 5) {
            throw new Error('Still failing');
          }
          return item * 2;
        });

        const result = await taskScheduler.retryFailedTasks(failedItems, processor);

        expect(result.success).toEqual([6]);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].item).toBe(5);
        expect(result.successCount).toBe(1);
        expect(result.failedCount).toBe(1);
      });

      it('应该处理空失败列表', async () => {
        const failedItems: Array<{ item: number; error: Error }> = [];
        const processor = vi.fn();

        const result = await taskScheduler.retryFailedTasks(failedItems, processor);

        expect(result.success).toEqual([]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(0);
        expect(processor).not.toHaveBeenCalled();
      });
    });
  });
});

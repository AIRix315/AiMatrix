/**
 * AsyncTaskManager 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AsyncTaskManager, TaskStatusEnum, TimeoutError } from '../../../src/main/services/AsyncTaskManager';
import type { TaskStatus } from '../../../src/main/services/AsyncTaskManager';
import type { Logger } from '../../../src/main/services/Logger';

describe('AsyncTaskManager', () => {
  let asyncTaskManager: AsyncTaskManager;
  let mockLogger: Logger;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      debug: vi.fn().mockResolvedValue(undefined),
      info: vi.fn().mockResolvedValue(undefined),
      warn: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined)
    } as any;

    asyncTaskManager = new AsyncTaskManager(mockLogger);
  });

  describe('executeWithPolling', () => {
    it('应该在同步返回结果时立即返回', async () => {
      // 准备：API 直接返回结果
      const apiCall = vi.fn().mockResolvedValue({
        result: { data: 'test-result' }
      });
      const checkStatus = vi.fn();

      // 执行
      const result = await asyncTaskManager.executeWithPolling(apiCall, checkStatus);

      // 验证
      expect(result).toEqual({ data: 'test-result' });
      expect(apiCall).toHaveBeenCalledTimes(1);
      expect(checkStatus).not.toHaveBeenCalled(); // 不应该轮询
    });

    it('应该在异步轮询成功时返回结果', async () => {
      // 准备：API 返回 task_id，第二次轮询成功
      const apiCall = vi.fn().mockResolvedValue({
        task_id: 'task-123'
      });

      let pollCount = 0;
      const checkStatus = vi.fn().mockImplementation(async () => {
        pollCount++;
        if (pollCount === 1) {
          return { status: TaskStatusEnum.PROCESSING };
        } else {
          return {
            status: TaskStatusEnum.SUCCEED,
            result: { data: 'async-result' }
          };
        }
      });

      // 执行
      const result = await asyncTaskManager.executeWithPolling(
        apiCall,
        checkStatus,
        { pollInterval: 10, timeout: 5000 } // 使用短间隔加快测试
      );

      // 验证
      expect(result).toEqual({ data: 'async-result' });
      expect(apiCall).toHaveBeenCalledTimes(1);
      expect(checkStatus).toHaveBeenCalledTimes(2);
      expect(checkStatus).toHaveBeenCalledWith('task-123');
    });

    it('应该在任务失败时抛出错误', async () => {
      // 准备：API 返回 task_id，轮询返回失败状态
      const apiCall = vi.fn().mockResolvedValue({
        task_id: 'task-456'
      });

      const checkStatus = vi.fn().mockResolvedValue({
        status: TaskStatusEnum.FAILED,
        error: '生成失败：资源不足'
      });

      // 执行并验证
      await expect(
        asyncTaskManager.executeWithPolling(
          apiCall,
          checkStatus,
          { pollInterval: 10, timeout: 5000 }
        )
      ).rejects.toThrow('任务失败: 生成失败：资源不足');

      expect(checkStatus).toHaveBeenCalledWith('task-456');
    });

    it('应该在超时时抛出 TimeoutError', async () => {
      // 准备：API 返回 task_id，一直返回 PROCESSING 状态
      const apiCall = vi.fn().mockResolvedValue({
        task_id: 'task-789'
      });

      const checkStatus = vi.fn().mockResolvedValue({
        status: TaskStatusEnum.PROCESSING
      });

      // 执行并验证
      await expect(
        asyncTaskManager.executeWithPolling(
          apiCall,
          checkStatus,
          { pollInterval: 10, timeout: 100 } // 100ms 超时
        )
      ).rejects.toThrow(TimeoutError);

      // 应该进行了多次轮询
      expect(checkStatus.mock.calls.length).toBeGreaterThan(1);
    });

    it('应该在既无 task_id 也无 result 时抛出错误', async () => {
      // 准备：API 返回空对象
      const apiCall = vi.fn().mockResolvedValue({});
      const checkStatus = vi.fn();

      // 执行并验证
      await expect(
        asyncTaskManager.executeWithPolling(apiCall, checkStatus)
      ).rejects.toThrow('API 返回格式错误：既无 task_id 也无 result');

      expect(checkStatus).not.toHaveBeenCalled();
    });

    it('应该在任务成功但无结果时抛出错误', async () => {
      // 准备：任务成功但没有 result 字段
      const apiCall = vi.fn().mockResolvedValue({
        task_id: 'task-999'
      });

      const checkStatus = vi.fn().mockResolvedValue({
        status: TaskStatusEnum.SUCCEED
        // 缺少 result 字段
      });

      // 执行并验证
      await expect(
        asyncTaskManager.executeWithPolling(
          apiCall,
          checkStatus,
          { pollInterval: 10, timeout: 5000 }
        )
      ).rejects.toThrow('任务成功但未返回结果');
    });
  });

  describe('executeWithRetry', () => {
    it('应该在第一次尝试成功时不重试', async () => {
      // 准备：操作立即成功
      const operation = vi.fn().mockResolvedValue('success');

      // 执行
      const result = await asyncTaskManager.executeWithRetry(operation);

      // 验证
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试并最终成功', async () => {
      // 准备：前两次失败，第三次成功
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`尝试 ${attemptCount} 失败`);
        }
        return 'success-after-retry';
      });

      // 执行
      const result = await asyncTaskManager.executeWithRetry(
        operation,
        { maxRetries: 3, retryDelay: 10 }
      );

      // 验证
      expect(result).toBe('success-after-retry');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('应该在所有重试失败后抛出最后一个错误', async () => {
      // 准备：所有尝试都失败
      const operation = vi.fn().mockRejectedValue(new Error('持续失败'));

      // 执行并验证
      await expect(
        asyncTaskManager.executeWithRetry(
          operation,
          { maxRetries: 2, retryDelay: 10 }
        )
      ).rejects.toThrow('持续失败');

      // 应该尝试 3 次（1 次初始 + 2 次重试）
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('应该使用指数退避延迟', async () => {
      // 准备：记录每次尝试的时间
      const timestamps: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 4) {
          throw new Error('失败');
        }
        return 'success';
      });

      // 执行
      await asyncTaskManager.executeWithRetry(
        operation,
        { maxRetries: 3, retryDelay: 50, useExponentialBackoff: true }
      );

      // 验证：延迟应该是 50ms, 100ms, 200ms
      expect(timestamps.length).toBe(4);

      // 第一次和第二次之间应该约等于 50ms
      const delay1 = timestamps[1] - timestamps[0];
      expect(delay1).toBeGreaterThanOrEqual(40);
      expect(delay1).toBeLessThan(100);

      // 第二次和第三次之间应该约等于 100ms
      const delay2 = timestamps[2] - timestamps[1];
      expect(delay2).toBeGreaterThanOrEqual(90);
      expect(delay2).toBeLessThan(150);

      // 第三次和第四次之间应该约等于 200ms
      const delay3 = timestamps[3] - timestamps[2];
      expect(delay3).toBeGreaterThanOrEqual(180);
      expect(delay3).toBeLessThan(250);
    });

    it('应该使用固定延迟（禁用指数退避）', async () => {
      // 准备：记录每次尝试的时间
      const timestamps: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          throw new Error('失败');
        }
        return 'success';
      });

      // 执行
      await asyncTaskManager.executeWithRetry(
        operation,
        { maxRetries: 2, retryDelay: 50, useExponentialBackoff: false }
      );

      // 验证：所有延迟应该都约等于 50ms
      expect(timestamps.length).toBe(3);

      const delay1 = timestamps[1] - timestamps[0];
      expect(delay1).toBeGreaterThanOrEqual(40);
      expect(delay1).toBeLessThan(100);

      const delay2 = timestamps[2] - timestamps[1];
      expect(delay2).toBeGreaterThanOrEqual(40);
      expect(delay2).toBeLessThan(100);
    });
  });

  describe('executeWithPollingAndRetry', () => {
    it('应该结合轮询和重试机制', async () => {
      // 准备：第一次 API 调用失败，第二次成功并返回 task_id
      let apiCallCount = 0;
      const apiCall = vi.fn().mockImplementation(async () => {
        apiCallCount++;
        if (apiCallCount === 1) {
          throw new Error('网络错误');
        }
        return { task_id: 'task-combo' };
      });

      const checkStatus = vi.fn().mockResolvedValue({
        status: TaskStatusEnum.SUCCEED,
        result: { data: 'combo-result' }
      });

      // 执行
      const result = await asyncTaskManager.executeWithPollingAndRetry(
        apiCall,
        checkStatus,
        { pollInterval: 10, timeout: 5000 },
        { maxRetries: 2, retryDelay: 10 }
      );

      // 验证
      expect(result).toEqual({ data: 'combo-result' });
      expect(apiCall).toHaveBeenCalledTimes(2); // 第一次失败，第二次成功
      expect(checkStatus).toHaveBeenCalledWith('task-combo');
    });

    it('应该在轮询超时后重试', async () => {
      // 准备：第一次轮询超时，第二次成功
      let apiCallCount = 0;
      const apiCall = vi.fn().mockImplementation(async () => {
        apiCallCount++;
        return { task_id: `task-${apiCallCount}` };
      });

      let checkStatusCallCount = 0;
      const checkStatus = vi.fn().mockImplementation(async (taskId: string) => {
        checkStatusCallCount++;
        if (taskId === 'task-1') {
          // 第一次任务一直 PROCESSING（会超时）
          return { status: TaskStatusEnum.PROCESSING };
        } else {
          // 第二次任务立即成功
          return {
            status: TaskStatusEnum.SUCCEED,
            result: { data: 'retry-success' }
          };
        }
      });

      // 执行
      const result = await asyncTaskManager.executeWithPollingAndRetry(
        apiCall,
        checkStatus,
        { pollInterval: 10, timeout: 50 }, // 短超时
        { maxRetries: 2, retryDelay: 10 }
      );

      // 验证
      expect(result).toEqual({ data: 'retry-success' });
      expect(apiCall).toHaveBeenCalledTimes(2); // 第一次超时，第二次成功
    });
  });

  describe('日志记录', () => {
    it('应该记录轮询过程的日志', async () => {
      // 准备
      const apiCall = vi.fn().mockResolvedValue({
        task_id: 'task-log'
      });

      const checkStatus = vi.fn().mockResolvedValue({
        status: TaskStatusEnum.SUCCEED,
        result: { data: 'test' }
      });

      // 执行
      await asyncTaskManager.executeWithPolling(
        apiCall,
        checkStatus,
        { pollInterval: 10, timeout: 5000 }
      );

      // 验证：应该记录调试和信息日志
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('应该记录重试过程的日志', async () => {
      // 准备
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('失败');
        }
        return 'success';
      });

      // 执行
      await asyncTaskManager.executeWithRetry(
        operation,
        { maxRetries: 2, retryDelay: 10 }
      );

      // 验证：应该记录警告日志（第一次失败）和信息日志（重试成功）
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('应该记录错误日志', async () => {
      // 准备：任务失败
      const apiCall = vi.fn().mockResolvedValue({
        task_id: 'task-error'
      });

      const checkStatus = vi.fn().mockResolvedValue({
        status: TaskStatusEnum.FAILED,
        error: '测试错误'
      });

      // 执行
      try {
        await asyncTaskManager.executeWithPolling(
          apiCall,
          checkStatus,
          { pollInterval: 10, timeout: 5000 }
        );
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证：应该记录错误日志
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

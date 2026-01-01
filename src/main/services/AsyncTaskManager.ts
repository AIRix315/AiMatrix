/**
 * AsyncTaskManager 服务
 *
 * 异步任务管理器，支持10分钟级长时间轮询（文生图、图生视频）
 * 提供轮询机制和重试机制
 */

import type { Logger } from './Logger';

/**
 * 任务状态枚举
 */
export enum TaskStatusEnum {
  QUEUED = 'TASK_STATUS_QUEUED',
  PROCESSING = 'TASK_STATUS_PROCESSING',
  SUCCEED = 'TASK_STATUS_SUCCEED',
  FAILED = 'TASK_STATUS_FAILED'
}

/**
 * 任务状态接口
 */
export interface TaskStatus<T = unknown> {
  /** 任务状态 */
  status: TaskStatusEnum;

  /** 结果数据（成功时返回） */
  result?: T;

  /** 错误信息（失败时返回） */
  error?: string;
}

/**
 * 超时错误类
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 轮询配置
 */
export interface PollingConfig {
  /** 轮询间隔（毫秒），默认 10000ms (10秒) */
  pollInterval?: number;

  /** 超时时间（毫秒），默认 600000ms (10分钟) */
  timeout?: number;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;

  /** 初始延迟时间（毫秒），默认 1000ms */
  retryDelay?: number;

  /** 是否使用指数退避，默认 true */
  useExponentialBackoff?: boolean;
}

/**
 * 异步任务管理器
 */
export class AsyncTaskManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 执行带轮询的异步任务
   *
   * @param apiCall 初始 API 调用，返回 task_id 或直接返回结果
   * @param checkStatus 检查任务状态的函数
   * @param config 轮询配置
   * @returns 任务结果
   */
  async executeWithPolling<T>(
    apiCall: () => Promise<{ task_id?: string; result?: T }>,
    checkStatus: (taskId: string) => Promise<TaskStatus<T>>,
    config?: PollingConfig
  ): Promise<T> {
    const pollInterval = config?.pollInterval || 10000; // 默认 10 秒
    const timeout = config?.timeout || 600000; // 默认 10 分钟

    this.logger.debug(
      `执行异步任务，轮询间隔: ${pollInterval}ms, 超时: ${timeout}ms`,
      'AsyncTaskManager'
    );

    // 1. 调用初始 API
    const response = await apiCall();

    // 2. 如果直接返回结果（同步模式），立即返回
    if (response.result && !response.task_id) {
      this.logger.info('任务同步完成', 'AsyncTaskManager');
      return response.result;
    }

    // 3. 如果既无 task_id 也无 result，抛出错误
    if (!response.task_id) {
      throw new Error('API 返回格式错误：既无 task_id 也无 result');
    }

    const taskId = response.task_id;
    this.logger.info(`任务已创建，task_id: ${taskId}，开始轮询`, 'AsyncTaskManager');

    // 4. 开始轮询任务状态
    const startTime = Date.now();
    let pollCount = 0;

    while (Date.now() - startTime < timeout) {
      // 等待轮询间隔
      await this.sleep(pollInterval);
      pollCount++;

      this.logger.debug(
        `轮询任务状态 (第 ${pollCount} 次)，task_id: ${taskId}`,
        'AsyncTaskManager'
      );

      // 检查任务状态
      const status = await checkStatus(taskId);

      // 任务成功
      if (status.status === TaskStatusEnum.SUCCEED) {
        this.logger.info(
          `任务成功完成，task_id: ${taskId}，耗时: ${Date.now() - startTime}ms`,
          'AsyncTaskManager'
        );

        if (!status.result) {
          throw new Error('任务成功但未返回结果');
        }

        return status.result;
      }

      // 任务失败
      if (status.status === TaskStatusEnum.FAILED) {
        const error = status.error || '未知错误';
        this.logger.error(`任务失败，task_id: ${taskId}，错误: ${error}`, 'AsyncTaskManager');
        throw new Error(`任务失败: ${error}`);
      }

      // 任务仍在处理中，继续轮询
      this.logger.debug(`任务状态: ${status.status}，继续轮询`, 'AsyncTaskManager');
    }

    // 5. 超时
    const errorMessage = `任务超时（${timeout}ms），task_id: ${taskId}`;
    this.logger.error(errorMessage, 'AsyncTaskManager');
    throw new TimeoutError(errorMessage);
  }

  /**
   * 执行带重试的操作
   *
   * @param operation 要执行的操作
   * @param config 重试配置
   * @returns 操作结果
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: RetryConfig
  ): Promise<T> {
    const maxRetries = config?.maxRetries || 3;
    const initialDelay = config?.retryDelay || 1000;
    const useExponentialBackoff = config?.useExponentialBackoff !== false;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(
          `尝试执行操作 (第 ${attempt + 1}/${maxRetries + 1} 次)`,
          'AsyncTaskManager'
        );

        const result = await operation();

        if (attempt > 0) {
          this.logger.info(
            `操作在第 ${attempt + 1} 次尝试后成功`,
            'AsyncTaskManager'
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `操作失败 (第 ${attempt + 1}/${maxRetries + 1} 次): ${lastError.message}`,
          'AsyncTaskManager'
        );

        // 如果还有重试机会，等待后重试
        if (attempt < maxRetries) {
          const delay = useExponentialBackoff
            ? initialDelay * Math.pow(2, attempt) // 指数退避: 1s, 2s, 4s, 8s...
            : initialDelay; // 固定延迟

          this.logger.debug(`等待 ${delay}ms 后重试`, 'AsyncTaskManager');
          await this.sleep(delay);
        }
      }
    }

    // 所有重试都失败
    this.logger.error(
      `操作在 ${maxRetries + 1} 次尝试后全部失败`,
      'AsyncTaskManager'
    );
    throw lastError || new Error('操作失败');
  }

  /**
   * 睡眠指定时间
   *
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 组合轮询和重试
   *
   * @param apiCall 初始 API 调用
   * @param checkStatus 检查任务状态的函数
   * @param pollingConfig 轮询配置
   * @param retryConfig 重试配置
   * @returns 任务结果
   */
  async executeWithPollingAndRetry<T>(
    apiCall: () => Promise<{ task_id?: string; result?: T }>,
    checkStatus: (taskId: string) => Promise<TaskStatus<T>>,
    pollingConfig?: PollingConfig,
    retryConfig?: RetryConfig
  ): Promise<T> {
    return this.executeWithRetry(
      () => this.executeWithPolling(apiCall, checkStatus, pollingConfig),
      retryConfig
    );
  }
}

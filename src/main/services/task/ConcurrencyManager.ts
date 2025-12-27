/**
 * ConcurrencyManager - 并发控制管理器
 *
 * Phase 6 新增功能：
 * - 控制不同类型任务的并发执行数量
 * - 防止资源耗尽（内存、CPU、网络）
 * - 支持优先级队列
 * - 支持动态调整并发限制
 *
 * 使用场景：
 * - 生图任务：限制同时进行的生图数量（GPU资源有限）
 * - 文本处理：可以更高的并发（CPU密集型）
 * - API调用：根据API限流设置并发
 */

import { logger } from '../Logger';
import { TaskType } from '../TaskScheduler';

/**
 * 任务优先级
 */
export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20
}

/**
 * 并发配置
 */
export interface ConcurrencyConfig {
  /** 默认并发数 */
  defaultConcurrency: number;
  /** 各任务类型的并发限制 */
  typeConcurrency?: Partial<Record<TaskType, number>>;
}

/**
 * 队列中的任务项
 */
interface QueuedTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  handler: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  queuedAt: Date;
}

/**
 * 运行中的任务
 */
interface RunningTask {
  id: string;
  type: TaskType;
  startedAt: Date;
}

/**
 * ConcurrencyManager 类
 */
export class ConcurrencyManager {
  private config: ConcurrencyConfig;
  private queue: QueuedTask[] = [];
  private running: Map<string, RunningTask> = new Map();
  private runningByType: Map<TaskType, Set<string>> = new Map();

  constructor(config?: ConcurrencyConfig) {
    this.config = {
      defaultConcurrency: 3,
      typeConcurrency: {
        [TaskType.API_CALL]: 10, // API调用可以较高并发
        [TaskType.WORKFLOW]: 2,  // 工作流较重，限制并发
        [TaskType.PLUGIN]: 5,
        [TaskType.CUSTOM]: 3
      },
      ...config
    };

    // 初始化类型计数器
    Object.values(TaskType).forEach(type => {
      this.runningByType.set(type as TaskType, new Set());
    });
  }

  /**
   * 获取任务类型的并发限制
   */
  private getConcurrencyLimit(type: TaskType): number {
    return this.config.typeConcurrency?.[type] ?? this.config.defaultConcurrency;
  }

  /**
   * 获取任务类型的当前运行数
   */
  private getRunningCount(type: TaskType): number {
    return this.runningByType.get(type)?.size ?? 0;
  }

  /**
   * 检查是否可以运行任务
   */
  private canRun(type: TaskType): boolean {
    const limit = this.getConcurrencyLimit(type);
    const current = this.getRunningCount(type);
    return current < limit;
  }

  /**
   * 将任务加入队列（按优先级排序）
   */
  private enqueueTask(task: QueuedTask): void {
    // 插入到合适的位置（按优先级降序）
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (task.priority > this.queue[i].priority) {
        this.queue.splice(i, 0, task);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(task);
    }

    logger.debug(
      `Task queued: ${task.id}`,
      'ConcurrencyManager',
      { type: task.type, priority: task.priority, queueLength: this.queue.length }
    ).catch(() => {});
  }

  /**
   * 从队列中获取下一个可运行的任务
   */
  private dequeueTask(): QueuedTask | null {
    // 查找第一个可以运行的任务
    for (let i = 0; i < this.queue.length; i++) {
      const task = this.queue[i];
      if (this.canRun(task.type)) {
        this.queue.splice(i, 1);
        return task;
      }
    }

    return null;
  }

  /**
   * 处理队列，启动可运行的任务
   */
  private async processQueue(): Promise<void> {
    let task = this.dequeueTask();

    while (task) {
      await this.startTask(task);
      task = this.dequeueTask();
    }
  }

  /**
   * 启动任务
   */
  private async startTask(task: QueuedTask): Promise<void> {
    // 标记为运行中
    this.running.set(task.id, {
      id: task.id,
      type: task.type,
      startedAt: new Date()
    });

    this.runningByType.get(task.type)!.add(task.id);

    const queueTime = Date.now() - task.queuedAt.getTime();

    await logger.info(
      `Task started: ${task.id}`,
      'ConcurrencyManager',
      {
        type: task.type,
        priority: task.priority,
        queueTime: `${queueTime}ms`,
        runningCount: this.getRunningCount(task.type),
        queueLength: this.queue.length
      }
    );

    // 异步执行任务
    task.handler()
      .then(result => {
        task.resolve(result);
        this.onTaskComplete(task);
      })
      .catch(error => {
        task.reject(error);
        this.onTaskComplete(task);
      });
  }

  /**
   * 任务完成回调
   */
  private onTaskComplete(task: QueuedTask): void {
    // 移除运行标记
    this.running.delete(task.id);
    this.runningByType.get(task.type)!.delete(task.id);

    logger.info(
      `Task completed: ${task.id}`,
      'ConcurrencyManager',
      {
        type: task.type,
        runningCount: this.getRunningCount(task.type),
        queueLength: this.queue.length
      }
    ).catch(() => {});

    // 尝试处理队列中的下一个任务
    this.processQueue().catch(error => {
      logger.error('Error processing queue', 'ConcurrencyManager', { error }).catch(() => {});
    });
  }

  /**
   * 执行任务（受并发控制）
   */
  public async execute<T = unknown>(
    id: string,
    type: TaskType,
    handler: () => Promise<T>,
    priority: TaskPriority = TaskPriority.NORMAL
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id,
        type,
        priority,
        handler,
        resolve: resolve as (value: unknown) => void,
        reject,
        queuedAt: new Date()
      };

      // 如果可以立即运行，则运行
      if (this.canRun(type)) {
        this.startTask(task).catch(error => {
          logger.error(`Failed to start task: ${id}`, 'ConcurrencyManager', { error }).catch(() => {});
          reject(error);
        });
      } else {
        // 否则加入队列
        this.enqueueTask(task);
      }
    });
  }

  /**
   * 取消任务
   */
  public async cancel(taskId: string): Promise<boolean> {
    // 从队列中移除
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex >= 0) {
      const task = this.queue[queueIndex];
      this.queue.splice(queueIndex, 1);
      task.reject(new Error('Task cancelled'));

      await logger.info(`Task cancelled (queued): ${taskId}`, 'ConcurrencyManager');
      return true;
    }

    // 运行中的任务无法直接取消（需要任务自己支持取消）
    if (this.running.has(taskId)) {
      await logger.warn(
        `Cannot cancel running task: ${taskId}`,
        'ConcurrencyManager',
        { message: 'Task is already running' }
      );
      return false;
    }

    return false;
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    queueLength: number;
    runningCount: number;
    runningByType: Record<string, number>;
    limits: Record<string, number>;
  } {
    const runningByType: Record<string, number> = {};
    const limits: Record<string, number> = {};

    for (const type of Object.values(TaskType)) {
      runningByType[type] = this.getRunningCount(type as TaskType);
      limits[type] = this.getConcurrencyLimit(type as TaskType);
    }

    return {
      queueLength: this.queue.length,
      runningCount: this.running.size,
      runningByType,
      limits
    };
  }

  /**
   * 更新并发限制
   */
  public updateConcurrencyLimit(type: TaskType, limit: number): void {
    if (!this.config.typeConcurrency) {
      this.config.typeConcurrency = {};
    }

    this.config.typeConcurrency[type] = limit;

    logger.info(
      `Concurrency limit updated for ${type}: ${limit}`,
      'ConcurrencyManager'
    ).catch(() => {});

    // 尝试处理队列（可能有新任务可以运行了）
    this.processQueue().catch(() => {});
  }

  /**
   * 清空队列
   */
  public async clearQueue(): Promise<number> {
    const count = this.queue.length;

    // 拒绝所有排队任务
    for (const task of this.queue) {
      task.reject(new Error('Queue cleared'));
    }

    this.queue = [];

    await logger.info(`Queue cleared: ${count} tasks cancelled`, 'ConcurrencyManager');

    return count;
  }

  /**
   * 等待所有任务完成
   */
  public async waitForAll(timeout?: number): Promise<void> {
    const startTime = Date.now();

    while (this.running.size > 0 || this.queue.length > 0) {
      // 检查超时
      if (timeout && Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for tasks to complete (${this.running.size} running, ${this.queue.length} queued)`);
      }

      // 等待100ms后再检查
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await logger.info('All tasks completed', 'ConcurrencyManager');
  }
}

// 导出单例实例
export const concurrencyManager = new ConcurrencyManager();

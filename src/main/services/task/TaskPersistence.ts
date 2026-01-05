/**
 * TaskPersistence - 任务持久化层
 *
 * Phase 6 新增功能：
 * - 使用NeDB将任务队列持久化到磁盘
 * - 防止应用崩溃导致任务丢失
 * - 支持断点续传
 *
 * 设计特点：
 * - 自动加载未完成的任务
 * - 支持任务状态查询和更新
 * - 自动清理过期任务
 */

import * as path from 'path';
import { app } from 'electron';
import { logger } from '../Logger';
import { TaskStatus } from '../TaskScheduler';
import { timeService } from '../TimeService';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Datastore = require('nedb');

/**
 * 持久化的任务数据
 */
export interface PersistedTask {
  id: string;
  configJson: string; // TaskConfig的JSON字符串
  status: TaskStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastExecutionId?: string;
}

/**
 * 持久化的执行数据
 */
export interface PersistedExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  progress: number;
  resultJson?: string; // result的JSON字符串
  error?: string;
  inputsJson?: string; // inputs的JSON字符串
}

/**
 * TaskPersistence 类
 */
export class TaskPersistence {
  private tasksDb: unknown; // NeDB Datastore
  private executionsDb: unknown; // NeDB Datastore
  private initialized: boolean = false;

  constructor(dataDir?: string) {
    const dir = dataDir || path.join(app.getPath('userData'), 'data');

    // 初始化NeDB数据库
    this.tasksDb = new Datastore({
      filename: path.join(dir, 'tasks.db'),
      autoload: false,
      timestampData: true
    });

    this.executionsDb = new Datastore({
      filename: path.join(dir, 'executions.db'),
      autoload: false,
      timestampData: true
    });
  }

  /**
   * 初始化数据库
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await logger.info('Initializing TaskPersistence', 'TaskPersistence');

    return new Promise((resolve, reject) => {
      // 加载任务数据库
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).loadDatabase((err1: any) => {
        if (err1) {
          reject(err1);
          return;
        }

        // 加载执行数据库
        // TODO: [中期改进] 定义准确的NeDB类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.executionsDb as any).loadDatabase((err2: any) => {
          if (err2) {
            reject(err2);
            return;
          }

          // 创建索引
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.tasksDb as any).ensureIndex({ fieldName: 'id', unique: true });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.tasksDb as any).ensureIndex({ fieldName: 'status' });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.executionsDb as any).ensureIndex({ fieldName: 'id', unique: true });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.executionsDb as any).ensureIndex({ fieldName: 'taskId' });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.executionsDb as any).ensureIndex({ fieldName: 'status' });

          this.initialized = true;
          logger.info('TaskPersistence initialized', 'TaskPersistence').then(resolve).catch(reject);
        });
      });
    });
  }

  /**
   * 保存任务
   */
  public async saveTask(task: PersistedTask): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).update(
        { id: task.id },
        task,
        { upsert: true },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any) => {
          if (err) {
            logger.error('Failed to save task', 'TaskPersistence', { error: err, taskId: task.id }).catch(() => {});
            reject(err);
          } else {
            logger.debug(`Task saved: ${task.id}`, 'TaskPersistence').catch(() => {});
            resolve();
          }
        }
      );
    });
  }

  /**
   * 获取任务
   */
  public async getTask(taskId: string): Promise<PersistedTask | null> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).findOne({ id: taskId }, (err: any, doc: PersistedTask) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
  }

  /**
   * 获取所有任务
   */
  public async getAllTasks(status?: TaskStatus): Promise<PersistedTask[]> {
    return new Promise((resolve, reject) => {
      const query = status ? { status } : {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).find(query).sort({ createdAt: -1 }).exec((err: any, docs: PersistedTask[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs);
        }
      });
    });
  }

  /**
   * 更新任务状态
   */
  public async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const updatedAt = await timeService.getISOString();
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).update(
        { id: taskId },
        { $set: { status, updatedAt } },
        {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any) => {
          if (err) {
            reject(err);
          } else {
            logger.debug(`Task status updated: ${taskId} -> ${status}`, 'TaskPersistence').catch(() => {});
            resolve();
          }
        }
      );
    });
  }

  /**
   * 删除任务
   */
  public async deleteTask(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).remove({ id: taskId }, {}, (err: any) => {
        if (err) {
          reject(err);
        } else {
          logger.debug(`Task deleted: ${taskId}`, 'TaskPersistence').catch(() => {});
          resolve();
        }
      });
    });
  }

  /**
   * 保存执行记录
   */
  public async saveExecution(execution: PersistedExecution): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.executionsDb as any).update(
        { id: execution.id },
        execution,
        { upsert: true },
        (err: any) => {
          if (err) {
            logger.error('Failed to save execution', 'TaskPersistence', { error: err, executionId: execution.id }).catch(() => {});
            reject(err);
          } else {
            logger.debug(`Execution saved: ${execution.id}`, 'TaskPersistence').catch(() => {});
            resolve();
          }
        }
      );
    });
  }

  /**
   * 获取执行记录
   */
  public async getExecution(executionId: string): Promise<PersistedExecution | null> {
    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.executionsDb as any).findOne({ id: executionId }, (err: any, doc: PersistedExecution) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
  }

  /**
   * 获取任务的所有执行记录
   */
  public async getTaskExecutions(taskId: string): Promise<PersistedExecution[]> {
    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.executionsDb as any).find({ taskId }).sort({ startTime: -1 }).exec((err: any, docs: PersistedExecution[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs);
        }
      });
    });
  }

  /**
   * 更新执行状态
   */
  public async updateExecutionStatus(
    executionId: string,
    status: TaskStatus,
    progress?: number,
    result?: unknown,
    error?: string
  ): Promise<void> {
    let endTime: string | undefined;
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
      endTime = await timeService.getISOString();
    }

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const update: any = { status };
      if (progress !== undefined) update.progress = progress;
      if (result !== undefined) update.resultJson = JSON.stringify(result);
      if (error !== undefined) update.error = error;
      if (endTime) {
        update.endTime = endTime;
      }

      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.executionsDb as any).update(
        { id: executionId },
        { $set: update },
        {},
        (err: any) => {
          if (err) {
            reject(err);
          } else {
            logger.debug(`Execution status updated: ${executionId} -> ${status}`, 'TaskPersistence').catch(() => {});
            resolve();
          }
        }
      );
    });
  }

  /**
   * 获取未完成的任务（用于恢复）
   */
  public async getUnfinishedTasks(): Promise<PersistedTask[]> {
    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).find({
        status: { $in: [TaskStatus.PENDING, TaskStatus.RUNNING] }
      }).exec((err: any, docs: PersistedTask[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs);
        }
      });
    });
  }

  /**
   * 清理过期任务（完成或失败超过30天的任务）
   */
  public async cleanupOldTasks(daysOld: number = 30): Promise<number> {
    const cutoffDate = await timeService.getCurrentTime();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).remove({
        status: { $in: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] },
        updatedAt: { $lt: cutoffDate }
      }, { multi: true }, (err: any, numRemoved: number) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`Cleaned up ${numRemoved} old tasks`, 'TaskPersistence').catch(() => {});
          resolve(numRemoved);
        }
      });
    });
  }

  /**
   * 清理过期执行记录
   */
  public async cleanupOldExecutions(daysOld: number = 30): Promise<number> {
    const cutoffDate = await timeService.getCurrentTime();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      // TODO: [中期改进] 定义准确的NeDB类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.executionsDb as any).remove({
        status: { $in: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] },
        endTime: { $lt: cutoffDate }
      }, { multi: true }, (err: any, numRemoved: number) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`Cleaned up ${numRemoved} old executions`, 'TaskPersistence').catch(() => {});
          resolve(numRemoved);
        }
      });
    });
  }

  /**
   * 获取任务统计
   */
  public async getTaskStats(): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const all = await this.getAllTasks();

    return {
      total: all.length,
      pending: all.filter(t => t.status === TaskStatus.PENDING).length,
      running: all.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: all.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: all.filter(t => t.status === TaskStatus.FAILED).length,
      cancelled: all.filter(t => t.status === TaskStatus.CANCELLED).length
    };
  }

  /**
   * 压缩数据库
   */
  public async compactDatabase(): Promise<void> {
    await logger.info('Compacting task databases', 'TaskPersistence');

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.tasksDb as any).persistence.compactDatafile();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.executionsDb as any).persistence.compactDatafile();

      // NeDB的压缩是异步的但不返回Promise，延迟500ms确保完成
      setTimeout(() => {
        logger.info('Database compaction completed', 'TaskPersistence').then(resolve).catch(reject);
      }, 500);
    });
  }

  /**
   * 关闭数据库
   */
  public async close(): Promise<void> {
    await logger.info('Closing TaskPersistence', 'TaskPersistence');
    // NeDB不需要显式关闭，但可以在这里执行最后的压缩
    await this.compactDatabase();
    this.initialized = false;
  }
}

// 导出单例实例
export const taskPersistence = new TaskPersistence();

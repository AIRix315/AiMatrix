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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Datastore = require('nedb');

/**
 * 持久化的任务数据
 */
export interface PersistedTask {
  id: string;
  configJson: string; // TaskConfig的JSON字符串
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  lastExecutionId?: string;
}

/**
 * 持久化的执行数据
 */
export interface PersistedExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  progress: number;
  resultJson?: string; // result的JSON字符串
  error?: string;
  inputsJson?: string; // inputs的JSON字符串
}

/**
 * TaskPersistence 类
 */
export class TaskPersistence {
  private tasksDb: any; // NeDB Datastore
  private executionsDb: any; // NeDB Datastore
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
      this.tasksDb.loadDatabase((err1: Error) => {
        if (err1) {
          reject(err1);
          return;
        }

        // 加载执行数据库
        this.executionsDb.loadDatabase((err2: Error) => {
          if (err2) {
            reject(err2);
            return;
          }

          // 创建索引
          this.tasksDb.ensureIndex({ fieldName: 'id', unique: true });
          this.tasksDb.ensureIndex({ fieldName: 'status' });
          this.executionsDb.ensureIndex({ fieldName: 'id', unique: true });
          this.executionsDb.ensureIndex({ fieldName: 'taskId' });
          this.executionsDb.ensureIndex({ fieldName: 'status' });

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
      this.tasksDb.update(
        { id: task.id },
        task,
        { upsert: true },
        (err: Error) => {
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
      this.tasksDb.findOne({ id: taskId }, (err: Error, doc: PersistedTask) => {
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
      this.tasksDb.find(query).sort({ createdAt: -1 }).exec((err: Error, docs: PersistedTask[]) => {
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
    return new Promise((resolve, reject) => {
      this.tasksDb.update(
        { id: taskId },
        { $set: { status, updatedAt: new Date() } },
        {},
        (err: Error) => {
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
      this.tasksDb.remove({ id: taskId }, {}, (err: Error) => {
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
      this.executionsDb.update(
        { id: execution.id },
        execution,
        { upsert: true },
        (err: Error) => {
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
      this.executionsDb.findOne({ id: executionId }, (err: Error, doc: PersistedExecution) => {
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
      this.executionsDb.find({ taskId }).sort({ startTime: -1 }).exec((err: Error, docs: PersistedExecution[]) => {
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
    return new Promise((resolve, reject) => {
      const update: any = { status };
      if (progress !== undefined) update.progress = progress;
      if (result !== undefined) update.resultJson = JSON.stringify(result);
      if (error !== undefined) update.error = error;
      if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
        update.endTime = new Date();
      }

      this.executionsDb.update(
        { id: executionId },
        { $set: update },
        {},
        (err: Error) => {
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
      this.tasksDb.find({
        status: { $in: [TaskStatus.PENDING, TaskStatus.RUNNING] }
      }).exec((err: Error, docs: PersistedTask[]) => {
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      this.tasksDb.remove({
        status: { $in: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] },
        updatedAt: { $lt: cutoffDate }
      }, { multi: true }, (err: Error, numRemoved: number) => {
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      this.executionsDb.remove({
        status: { $in: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] },
        endTime: { $lt: cutoffDate }
      }, { multi: true }, (err: Error, numRemoved: number) => {
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
      this.tasksDb.persistence.compactDatafile();
      this.executionsDb.persistence.compactDatafile();

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

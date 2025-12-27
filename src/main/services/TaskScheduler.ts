/**
 * TaskScheduler 服务 - 任务调度
 *
 * MVP 功能：
 * - 任务创建和配置
 * - 任务队列（内存队列）
 * - 任务执行（调用 APIManager）
 * - 任务状态查询
 * - 任务取消
 *
 * 后续迭代：
 * - 持久化队列
 * - 成本估算
 * - 优先级调度
 * - 断点续传
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';
import { apiManager, APICallParams } from './APIManager';

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 任务类型
 */
export enum TaskType {
  API_CALL = 'api_call',
  WORKFLOW = 'workflow',
  PLUGIN = 'plugin',
  CUSTOM = 'custom'
}

/**
 * 任务配置接口
 */
export interface TaskConfig {
  type: TaskType;
  name: string;
  description?: string;
  apiName?: string; // API 调用时使用
  apiParams?: APICallParams; // API 参数
  pluginId?: string; // 插件 ID
  pluginAction?: string; // 插件动作
  customHandler?: (inputs: unknown) => Promise<unknown>; // 自定义处理函数
  metadata?: Record<string, unknown>;
}

/**
 * 任务接口
 */
export interface Task {
  id: string;
  config: TaskConfig;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  executions: TaskExecution[];
}

/**
 * 任务执行接口
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  progress: number;
  result?: unknown;
  error?: string;
  inputs?: unknown;
}

/**
 * TaskScheduler 服务类
 */
export class TaskScheduler {
  private tasks: Map<string, Task> = new Map();
  private executions: Map<string, TaskExecution> = new Map();
  private runningExecutions: Set<string> = new Set();

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    await logger.info('Initializing TaskScheduler', 'TaskScheduler');
    await logger.info('TaskScheduler initialized', 'TaskScheduler');
  }

  /**
   * 创建任务
   */
  public async createTask(config: TaskConfig): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        const taskId = uuidv4();

        const task: Task = {
          id: taskId,
          config,
          status: TaskStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          executions: []
        };

        this.tasks.set(taskId, task);

        await logger.info(`Task created: ${taskId}`, 'TaskScheduler', { name: config.name });

        return taskId;
      },
      'TaskScheduler',
      'createTask',
      ErrorCode.TASK_CREATE_ERROR
    );
  }

  /**
   * 执行任务
   */
  public async executeTask(taskId: string, inputs?: unknown): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        const task = this.tasks.get(taskId);
        if (!task) {
          throw new Error(`Task not found: ${taskId}`);
        }

        const executionId = uuidv4();

        const execution: TaskExecution = {
          id: executionId,
          taskId,
          status: TaskStatus.PENDING,
          startTime: new Date(),
          progress: 0,
          inputs
        };

        this.executions.set(executionId, execution);
        task.executions.push(execution);

        await logger.info(`Task execution started: ${executionId}`, 'TaskScheduler', { taskId });

        // 异步执行任务
        this.runTask(execution, task).catch(async error => {
          await logger.error(
            `Task execution error: ${executionId}`,
            'TaskScheduler',
            { error }
          );
        });

        return executionId;
      },
      'TaskScheduler',
      'executeTask',
      ErrorCode.TASK_EXECUTION_ERROR
    );
  }

  /**
   * 运行任务
   */
  private async runTask(execution: TaskExecution, task: Task): Promise<void> {
    try {
      // 标记为运行中
      execution.status = TaskStatus.RUNNING;
      execution.progress = 0;
      this.runningExecutions.add(execution.id);

      await logger.debug(`Running task: ${execution.id}`, 'TaskScheduler');

      let result: unknown;

      // 根据任务类型执行
      switch (task.config.type) {
        case TaskType.API_CALL:
          result = await this.executeAPICall(task, execution);
          break;

        case TaskType.PLUGIN:
          result = await this.executePlugin(task, execution);
          break;

        case TaskType.CUSTOM:
          result = await this.executeCustom(task, execution);
          break;

        case TaskType.WORKFLOW:
          result = await this.executeWorkflow(task, execution);
          break;

        default:
          throw new Error(`Unsupported task type: ${task.config.type}`);
      }

      // 任务完成
      execution.status = TaskStatus.COMPLETED;
      execution.progress = 100;
      execution.result = result;
      execution.endTime = new Date();

      task.status = TaskStatus.COMPLETED;
      task.updatedAt = new Date();

      await logger.info(`Task completed: ${execution.id}`, 'TaskScheduler');
    } catch (error) {
      // 任务失败
      execution.status = TaskStatus.FAILED;
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = new Date();

      task.status = TaskStatus.FAILED;
      task.updatedAt = new Date();

      await logger.error(`Task failed: ${execution.id}`, 'TaskScheduler', { error });
    } finally {
      this.runningExecutions.delete(execution.id);
    }
  }

  /**
   * 执行 API 调用任务
   */
  private async executeAPICall(task: Task, execution: TaskExecution): Promise<unknown> {
    if (!task.config.apiName) {
      throw new Error('API name is required for API_CALL task');
    }

    const apiParams = {
      ...task.config.apiParams,
      ...execution.inputs as Record<string, unknown>
    };

    execution.progress = 50;

    const result = await apiManager.callAPI(task.config.apiName, apiParams);

    execution.progress = 100;

    return result;
  }

  /**
   * 执行插件任务
   */
  private async executePlugin(task: Task, execution: TaskExecution): Promise<unknown> {
    if (!task.config.pluginId || !task.config.pluginAction) {
      throw new Error('Plugin ID and action are required for PLUGIN task');
    }

    execution.progress = 50;

    // 这里应该调用 PluginManager
    // 暂时返回模拟结果
    const result = {
      pluginId: task.config.pluginId,
      action: task.config.pluginAction,
      inputs: execution.inputs
    };

    execution.progress = 100;

    return result;
  }

  /**
   * 执行自定义任务
   */
  private async executeCustom(task: Task, execution: TaskExecution): Promise<unknown> {
    if (!task.config.customHandler) {
      throw new Error('Custom handler is required for CUSTOM task');
    }

    execution.progress = 50;

    const result = await task.config.customHandler(execution.inputs);

    execution.progress = 100;

    return result;
  }

  /**
   * 执行工作流任务
   */
  private async executeWorkflow(task: Task, execution: TaskExecution): Promise<unknown> {
    // 工作流任务的具体实现
    // 暂时返回模拟结果
    execution.progress = 50;

    const result = {
      workflowId: task.id,
      steps: [],
      inputs: execution.inputs
    };

    execution.progress = 100;

    return result;
  }

  /**
   * 获取任务状态
   */
  public async getTaskStatus(executionId: string): Promise<TaskExecution> {
    return errorHandler.wrapAsync(
      async () => {
        const execution = this.executions.get(executionId);
        if (!execution) {
          throw new Error(`Execution not found: ${executionId}`);
        }

        return { ...execution };
      },
      'TaskScheduler',
      'getTaskStatus',
      ErrorCode.TASK_NOT_FOUND
    );
  }

  /**
   * 取消任务执行
   */
  public async cancelTask(executionId: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const execution = this.executions.get(executionId);
        if (!execution) {
          throw new Error(`Execution not found: ${executionId}`);
        }

        if (execution.status !== TaskStatus.RUNNING && execution.status !== TaskStatus.PENDING) {
          throw new Error(`Cannot cancel execution in status: ${execution.status}`);
        }

        execution.status = TaskStatus.CANCELLED;
        execution.endTime = new Date();

        this.runningExecutions.delete(executionId);

        const task = this.tasks.get(execution.taskId);
        if (task) {
          task.status = TaskStatus.CANCELLED;
          task.updatedAt = new Date();
        }

        await logger.info(`Task cancelled: ${executionId}`, 'TaskScheduler');
      },
      'TaskScheduler',
      'cancelTask',
      ErrorCode.TASK_CANCEL_ERROR
    );
  }

  /**
   * 获取任务结果
   */
  public async getTaskResults(executionId: string): Promise<unknown> {
    return errorHandler.wrapAsync(
      async () => {
        const execution = this.executions.get(executionId);
        if (!execution) {
          throw new Error(`Execution not found: ${executionId}`);
        }

        if (execution.status !== TaskStatus.COMPLETED) {
          throw new Error(`Execution not completed: ${execution.status}`);
        }

        return execution.result;
      },
      'TaskScheduler',
      'getTaskResults',
      ErrorCode.TASK_NOT_FOUND
    );
  }

  /**
   * 列出所有任务
   */
  public async listTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务详情
   */
  public async getTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw errorHandler.createError(
        ErrorCode.TASK_NOT_FOUND,
        'TaskScheduler',
        'getTask',
        `Task not found: ${taskId}`
      );
    }
    return { ...task };
  }

  /**
   * 获取执行状态（别名方法，供ChainTask使用）
   */
  public async getExecution(executionId: string): Promise<TaskExecution | null> {
    try {
      const execution = this.executions.get(executionId);
      return execution ? { ...execution } : null;
    } catch (error) {
      await logger.error(`Failed to get execution: ${executionId}`, 'TaskScheduler', { error });
      return null;
    }
  }

  /**
   * 取消执行（别名方法，供ChainTask使用）
   */
  public async cancelExecution(executionId: string): Promise<void> {
    return this.cancelTask(executionId);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up TaskScheduler', 'TaskScheduler');

    // 取消所有运行中的任务
    for (const executionId of this.runningExecutions) {
      try {
        await this.cancelTask(executionId);
      } catch (error) {
        await logger.error(
          `Failed to cancel task during cleanup: ${executionId}`,
          'TaskScheduler',
          { error }
        );
      }
    }

    await logger.info('TaskScheduler cleaned up', 'TaskScheduler');
  }
}

// 导出单例实例
export const taskScheduler = new TaskScheduler();

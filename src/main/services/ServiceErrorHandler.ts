/**
 * ServiceErrorHandler 服务 - 统一错误处理
 *
 * MVP 功能：
 * - 统一错误类
 * - 错误分类（按服务、操作）
 * - 用户友好的错误消息
 *
 * 后续迭代：
 * - 错误上报
 * - 统计分析
 */

import { logger } from './Logger';
import { ServiceError as IServiceError } from '../../common/types';

/**
 * 错误代码映射
 */
export enum ErrorCode {
  // 通用错误 (1000-1999)
  UNKNOWN = 'UNKNOWN',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  OPERATION_FAILED = 'OPERATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 文件系统错误 (2000-2999)
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  PATH_VALIDATION_ERROR = 'PATH_VALIDATION_ERROR',

  // 项目管理错误 (3000-3999)
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_CREATE_ERROR = 'PROJECT_CREATE_ERROR',
  PROJECT_LOAD_ERROR = 'PROJECT_LOAD_ERROR',
  PROJECT_SAVE_ERROR = 'PROJECT_SAVE_ERROR',
  PROJECT_DELETE_ERROR = 'PROJECT_DELETE_ERROR',

  // 资产管理错误 (4000-4999)
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  ASSET_ADD_ERROR = 'ASSET_ADD_ERROR',
  ASSET_REMOVE_ERROR = 'ASSET_REMOVE_ERROR',
  ASSET_UPDATE_ERROR = 'ASSET_UPDATE_ERROR',

  // 插件管理错误 (5000-5999)
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  PLUGIN_LOAD_ERROR = 'PLUGIN_LOAD_ERROR',
  PLUGIN_INSTALL_ERROR = 'PLUGIN_INSTALL_ERROR',
  PLUGIN_UNINSTALL_ERROR = 'PLUGIN_UNINSTALL_ERROR',
  PLUGIN_EXECUTION_ERROR = 'PLUGIN_EXECUTION_ERROR',

  // API 管理错误 (6000-6999)
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_CALL_ERROR = 'API_CALL_ERROR',
  API_KEY_ERROR = 'API_KEY_ERROR',
  API_CONNECTION_ERROR = 'API_CONNECTION_ERROR',

  // 任务调度错误 (7000-7999)
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_CREATE_ERROR = 'TASK_CREATE_ERROR',
  TASK_EXECUTION_ERROR = 'TASK_EXECUTION_ERROR',
  TASK_CANCEL_ERROR = 'TASK_CANCEL_ERROR',

  // 工作流错误 (8000-8999)
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_EXECUTION_ERROR = 'WORKFLOW_EXECUTION_ERROR',
  WORKFLOW_SAVE_ERROR = 'WORKFLOW_SAVE_ERROR',
  WORKFLOW_LOAD_ERROR = 'WORKFLOW_LOAD_ERROR'
}

/**
 * ServiceError 类 - 扩展自标准 Error
 */
export class ServiceError extends Error implements IServiceError {
  public readonly code: string;
  public readonly service: string;
  public readonly operation: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode | string,
    message: string,
    service: string,
    operation: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.service = service;
    this.operation = operation;
    this.timestamp = new Date();
    this.context = context;

    // 维护正确的原型链
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      service: this.service,
      operation: this.operation,
      timestamp: this.timestamp.toISOString(),
      context: this.context
    };
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `[${this.service}:${this.operation}] ${this.code}: ${this.message}`;
  }
}

/**
 * 用户友好的错误消息映射
 */
const USER_FRIENDLY_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.UNKNOWN]: '发生了未知错误，请稍后重试',
  [ErrorCode.INVALID_PARAMETER]: '输入参数无效，请检查后重试',
  [ErrorCode.OPERATION_FAILED]: '操作失败，请稍后重试',
  [ErrorCode.NOT_FOUND]: '未找到请求的资源',
  [ErrorCode.ALREADY_EXISTS]: '该资源已存在',
  [ErrorCode.PERMISSION_DENIED]: '权限不足，无法执行此操作',

  [ErrorCode.FILE_NOT_FOUND]: '文件未找到',
  [ErrorCode.FILE_READ_ERROR]: '读取文件失败',
  [ErrorCode.FILE_WRITE_ERROR]: '写入文件失败',
  [ErrorCode.DIRECTORY_NOT_FOUND]: '目录未找到',
  [ErrorCode.PATH_VALIDATION_ERROR]: '路径验证失败',

  [ErrorCode.PROJECT_NOT_FOUND]: '项目未找到',
  [ErrorCode.PROJECT_CREATE_ERROR]: '创建项目失败',
  [ErrorCode.PROJECT_LOAD_ERROR]: '加载项目失败',
  [ErrorCode.PROJECT_SAVE_ERROR]: '保存项目失败',
  [ErrorCode.PROJECT_DELETE_ERROR]: '删除项目失败',

  [ErrorCode.ASSET_NOT_FOUND]: '资产未找到',
  [ErrorCode.ASSET_ADD_ERROR]: '添加资产失败',
  [ErrorCode.ASSET_REMOVE_ERROR]: '移除资产失败',
  [ErrorCode.ASSET_UPDATE_ERROR]: '更新资产失败',

  [ErrorCode.PLUGIN_NOT_FOUND]: '插件未找到',
  [ErrorCode.PLUGIN_LOAD_ERROR]: '加载插件失败',
  [ErrorCode.PLUGIN_INSTALL_ERROR]: '安装插件失败',
  [ErrorCode.PLUGIN_UNINSTALL_ERROR]: '卸载插件失败',
  [ErrorCode.PLUGIN_EXECUTION_ERROR]: '执行插件失败',

  [ErrorCode.API_NOT_FOUND]: 'API 服务未找到',
  [ErrorCode.API_CALL_ERROR]: 'API 调用失败',
  [ErrorCode.API_KEY_ERROR]: 'API 密钥无效',
  [ErrorCode.API_CONNECTION_ERROR]: 'API 连接失败',

  [ErrorCode.TASK_NOT_FOUND]: '任务未找到',
  [ErrorCode.TASK_CREATE_ERROR]: '创建任务失败',
  [ErrorCode.TASK_EXECUTION_ERROR]: '执行任务失败',
  [ErrorCode.TASK_CANCEL_ERROR]: '取消任务失败',

  [ErrorCode.WORKFLOW_NOT_FOUND]: '工作流未找到',
  [ErrorCode.WORKFLOW_EXECUTION_ERROR]: '执行工作流失败',
  [ErrorCode.WORKFLOW_SAVE_ERROR]: '保存工作流失败',
  [ErrorCode.WORKFLOW_LOAD_ERROR]: '加载工作流失败'
};

/**
 * ServiceErrorHandler 类
 */
export class ServiceErrorHandler {
  /**
   * 处理错误
   */
  public handle(error: Error | ServiceError, shouldLog: boolean = true): {
    userMessage: string;
    serviceError: ServiceError;
  } {
    // 如果已经是 ServiceError，直接使用
    let serviceError: ServiceError;
    if (error instanceof ServiceError) {
      serviceError = error;
    } else {
      // 转换为 ServiceError
      serviceError = this.formatError(error);
    }

    // 记录日志
    if (shouldLog) {
      logger.error(
        serviceError.message,
        serviceError.service,
        {
          code: serviceError.code,
          operation: serviceError.operation,
          context: serviceError.context,
          stack: error.stack
        }
      ).catch(() => {
        // eslint-disable-next-line no-console
        // console.error('[ServiceErrorHandler] Failed to log error');
      });
    }

    // 获取用户友好的消息
    const userMessage = this.getUserFriendlyMessage(serviceError);

    return {
      userMessage,
      serviceError
    };
  }

  /**
   * 将普通 Error 转换为 ServiceError
   */
  public formatError(
    error: Error,
    service: string = 'Unknown',
    operation: string = 'Unknown'
  ): ServiceError {
    return new ServiceError(
      ErrorCode.UNKNOWN,
      error.message || '未知错误',
      service,
      operation,
      {
        originalError: error.name,
        stack: error.stack
      }
    );
  }

  /**
   * 获取用户友好的错误消息
   */
  public getUserFriendlyMessage(error: ServiceError): string {
    const code = error.code as ErrorCode;
    return USER_FRIENDLY_MESSAGES[code] || error.message || '发生了未知错误';
  }

  /**
   * 创建一个新的 ServiceError
   */
  public createError(
    code: ErrorCode,
    service: string,
    operation: string,
    message?: string,
    context?: Record<string, unknown>
  ): ServiceError {
    const defaultMessage = USER_FRIENDLY_MESSAGES[code] || '未知错误';
    return new ServiceError(
      code,
      message || defaultMessage,
      service,
      operation,
      context
    );
  }

  /**
   * 检查错误是否为特定类型
   */
  public isErrorCode(error: Error | ServiceError, code: ErrorCode): boolean {
    if (error instanceof ServiceError) {
      return error.code === code;
    }
    return false;
  }

  /**
   * 包装异步操作，自动处理错误
   */
  public async wrapAsync<T>(
    operation: () => Promise<T>,
    service: string,
    operationName: string,
    errorCode: ErrorCode = ErrorCode.OPERATION_FAILED
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw this.createError(
        errorCode,
        service,
        operationName,
        error instanceof Error ? error.message : String(error),
        {
          originalError: error instanceof Error ? error.name : 'Unknown'
        }
      );
    }
  }
}

// 导出单例实例
export const errorHandler = new ServiceErrorHandler();

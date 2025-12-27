/**
 * PluginContext - 插件上下文隔离层
 *
 * Phase 6 新增功能：
 * - 提供插件安全的API访问接口
 * - 隔离插件和主进程内部实现
 * - 追踪插件注册的服务和资源
 *
 * 设计原则：
 * - 插件只能通过PluginContext访问系统能力
 * - 禁止插件直接import主进程模块
 * - 所有注册的资源可被追踪和清理
 */

import { logger } from '../Logger';
import { errorHandler, ErrorCode } from '../ServiceErrorHandler';

/**
 * 插件权限级别
 */
export enum PluginPermissionLevel {
  /** 受限权限 - 社区插件 */
  RESTRICTED = 'restricted',
  /** 标准权限 - 合作伙伴插件 */
  STANDARD = 'standard',
  /** 完全权限 - 官方插件 */
  FULL = 'full'
}

/**
 * 插件上下文配置
 */
export interface PluginContextConfig {
  /** 插件ID */
  pluginId: string;
  /** 插件名称 */
  pluginName: string;
  /** 权限级别 */
  permissionLevel: PluginPermissionLevel;
  /** 允许的权限列表 */
  permissions: string[];
}

/**
 * 注册的资源类型
 */
interface RegisteredResource {
  type: 'service' | 'handler' | 'hook' | 'timer';
  id: string;
  cleanup?: () => Promise<void> | void;
}

/**
 * PluginContext 类 - 插件上下文
 */
export class PluginContext {
  private config: PluginContextConfig;
  private resources: RegisteredResource[] = [];
  private isActive: boolean = true;

  constructor(config: PluginContextConfig) {
    this.config = config;
    logger.info(
      `PluginContext created for plugin: ${config.pluginId}`,
      'PluginContext',
      { permissionLevel: config.permissionLevel }
    ).catch(() => {});
  }

  /**
   * 获取插件ID
   */
  public getPluginId(): string {
    return this.config.pluginId;
  }

  /**
   * 获取插件名称
   */
  public getPluginName(): string {
    return this.config.pluginName;
  }

  /**
   * 检查权限
   */
  private checkPermission(permission: string): boolean {
    if (!this.isActive) {
      throw new Error(`Plugin context is not active: ${this.config.pluginId}`);
    }

    // 完全权限级别拥有所有权限
    if (this.config.permissionLevel === PluginPermissionLevel.FULL) {
      return true;
    }

    // 检查特定权限
    return this.config.permissions.includes(permission);
  }

  /**
   * 日志API - 所有插件都可以使用
   */
  public log = {
    info: async (message: string, metadata?: Record<string, unknown>) => {
      await logger.info(`[${this.config.pluginName}] ${message}`, 'Plugin', metadata);
    },
    warn: async (message: string, metadata?: Record<string, unknown>) => {
      await logger.warn(`[${this.config.pluginName}] ${message}`, 'Plugin', metadata);
    },
    error: async (message: string, metadata?: Record<string, unknown>) => {
      await logger.error(`[${this.config.pluginName}] ${message}`, 'Plugin', metadata);
    },
    debug: async (message: string, metadata?: Record<string, unknown>) => {
      await logger.debug(`[${this.config.pluginName}] ${message}`, 'Plugin', metadata);
    }
  };

  /**
   * 文件系统API - 需要fs权限
   */
  public fs = {
    readFile: async (_filePath: string): Promise<string> => {
      if (!this.checkPermission('fs:read')) {
        throw new Error(`Permission denied: fs:read for plugin ${this.config.pluginId}`);
      }
      // 这里会调用FileSystemService，但不直接暴露实现
      throw new Error('Not implemented yet - will be connected in Phase 7');
    },
    writeFile: async (_filePath: string, _content: string): Promise<void> => {
      if (!this.checkPermission('fs:write')) {
        throw new Error(`Permission denied: fs:write for plugin ${this.config.pluginId}`);
      }
      throw new Error('Not implemented yet - will be connected in Phase 7');
    }
  };

  /**
   * 资产API - 需要asset权限
   */
  public assets = {
    query: async (_filter: Record<string, unknown>): Promise<unknown[]> => {
      if (!this.checkPermission('asset:read')) {
        throw new Error(`Permission denied: asset:read for plugin ${this.config.pluginId}`);
      }
      throw new Error('Not implemented yet - will be connected in Phase 7');
    },
    create: async (_assetData: unknown): Promise<string> => {
      if (!this.checkPermission('asset:write')) {
        throw new Error(`Permission denied: asset:write for plugin ${this.config.pluginId}`);
      }
      throw new Error('Not implemented yet - will be connected in Phase 7');
    }
  };

  /**
   * API调用 - 需要api权限
   */
  public api = {
    call: async (_apiName: string, _params: unknown): Promise<unknown> => {
      if (!this.checkPermission('api:call')) {
        throw new Error(`Permission denied: api:call for plugin ${this.config.pluginId}`);
      }
      throw new Error('Not implemented yet - will be connected in Phase 7');
    }
  };

  /**
   * 注册服务 - 用于追踪插件创建的服务
   */
  public registerService(serviceId: string, cleanup?: () => Promise<void> | void): void {
    this.resources.push({
      type: 'service',
      id: serviceId,
      cleanup
    });

    this.log.debug(`Service registered: ${serviceId}`).catch(() => {});
  }

  /**
   * 注册定时器 - 用于追踪插件创建的定时器
   */
  public registerTimer(timerId: NodeJS.Timeout, cleanup?: () => void): void {
    this.resources.push({
      type: 'timer',
      id: String(timerId),
      cleanup: () => {
        clearTimeout(timerId);
        if (cleanup) cleanup();
      }
    });

    this.log.debug(`Timer registered: ${timerId}`).catch(() => {});
  }

  /**
   * 注册钩子 - 用于追踪插件注册的钩子
   */
  public registerHook(hookName: string, cleanup?: () => Promise<void> | void): void {
    this.resources.push({
      type: 'hook',
      id: hookName,
      cleanup
    });

    this.log.debug(`Hook registered: ${hookName}`).catch(() => {});
  }

  /**
   * 获取已注册的资源数量
   */
  public getResourceCount(): number {
    return this.resources.length;
  }

  /**
   * 清理所有注册的资源
   */
  public async cleanup(): Promise<void> {
    this.isActive = false;

    await logger.info(
      `Cleaning up PluginContext for ${this.config.pluginId}`,
      'PluginContext',
      { resourceCount: this.resources.length }
    );

    // 按照注册顺序的反序清理
    const errors: Error[] = [];
    for (const resource of this.resources.reverse()) {
      try {
        if (resource.cleanup) {
          await resource.cleanup();
        }
        await logger.debug(
          `Cleaned up ${resource.type}: ${resource.id}`,
          'PluginContext'
        );
      } catch (error) {
        errors.push(error as Error);
        await logger.error(
          `Failed to cleanup ${resource.type}: ${resource.id}`,
          'PluginContext',
          { error }
        );
      }
    }

    this.resources = [];

    if (errors.length > 0) {
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'PluginContext',
        'cleanup',
        `Failed to cleanup ${errors.length} resources`,
        { errors: errors.map(e => e.message) }
      );
    }

    await logger.info(
      `PluginContext cleaned up for ${this.config.pluginId}`,
      'PluginContext'
    );
  }

  /**
   * 检查上下文是否激活
   */
  public isContextActive(): boolean {
    return this.isActive;
  }
}

/**
 * 创建插件上下文
 */
export function createPluginContext(config: PluginContextConfig): PluginContext {
  return new PluginContext(config);
}

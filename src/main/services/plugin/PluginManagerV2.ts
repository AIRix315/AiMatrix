/**
 * PluginManagerV2 - 插件管理器增强版本
 *
 * Phase 6 新增功能：
 * - 沙箱执行支持（可选）
 * - PluginContext隔离层
 * - 增强的生命周期管理
 * - 资源追踪和清理
 *
 * 向后兼容：
 * - 保持与PluginManager相同的公共接口
 * - 支持同时运行沙箱和非沙箱插件
 * - 不破坏现有Phase 5业务代码
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from '../Logger';
import { errorHandler, ErrorCode } from '../ServiceErrorHandler';
import { timeService } from '../TimeService';
import { configManager } from '../ConfigManager';
import { PluginType, PluginPermission } from '../../../common/types';
import {
  PluginContext,
  PluginPermissionLevel,
  createPluginContext
} from './PluginContext';
import { PluginSandbox, createPluginSandbox } from './PluginSandbox';

/**
 * 插件配置选项
 */
export interface PluginOptions {
  /** 是否启用沙箱 */
  enableSandbox?: boolean;
  /** 沙箱超时时间 */
  sandboxTimeout?: number;
  /** 沙箱内存限制（MB） */
  sandboxMemoryLimit?: number;
}

/**
 * 插件 Manifest 接口
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  main: string;
  type: PluginType;
  permissions: PluginPermission[];
  dependencies?: Record<string, string>;
  /** 是否要求沙箱运行 */
  requireSandbox?: boolean;
}

/**
 * 插件信息接口
 */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  type: PluginType;
  isEnabled: boolean;
  isSandboxed: boolean;
  permissions: PluginPermission[];
  path: string;
}

/**
 * 插件实例接口
 */
export interface Plugin {
  activate?: () => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  execute?: (action: string, params: unknown) => Promise<unknown> | unknown;
}

/**
 * 加载的插件数据（增强版）
 */
interface LoadedPluginV2 {
  info: PluginInfo;
  manifest: PluginManifest;
  instance: Plugin;
  enabled: boolean;
  context?: PluginContext;
  sandbox?: PluginSandbox;
}

/**
 * PluginManagerV2 服务类
 */
export class PluginManagerV2 {
  private pluginsDir: string;
  private loadedPlugins: Map<string, LoadedPluginV2> = new Map();
  private defaultOptions: PluginOptions;

  constructor(pluginsDir?: string, options?: PluginOptions) {
    this.pluginsDir = pluginsDir || path.join(app.getPath('userData'), 'plugins');
    this.defaultOptions = {
      enableSandbox: false, // 默认不启用沙箱（保持向后兼容）
      sandboxTimeout: 30000,
      sandboxMemoryLimit: 512,
      ...options
    };

    this.ensurePluginsDir().catch(error => {
      logger.error('Failed to create plugins directory', 'PluginManagerV2', { error }).catch(() => {});
    });
  }

  /**
   * 确保插件目录存在
   */
  private async ensurePluginsDir(): Promise<void> {
    try {
      await fs.access(this.pluginsDir);
    } catch {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      await fs.mkdir(path.join(this.pluginsDir, 'official'), { recursive: true });
      await fs.mkdir(path.join(this.pluginsDir, 'partner'), { recursive: true });
      await fs.mkdir(path.join(this.pluginsDir, 'community'), { recursive: true });
    }
  }

  /**
   * 读取插件 manifest 文件
   */
  private async readManifest(pluginPath: string): Promise<PluginManifest> {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as PluginManifest;

      // 验证必需字段
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
        throw new Error('Invalid manifest: missing required fields');
      }

      return manifest;
    } catch (error) {
      throw errorHandler.createError(
        ErrorCode.PLUGIN_LOAD_ERROR,
        'PluginManagerV2',
        'readManifest',
        `Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`,
        { pluginPath }
      );
    }
  }

  /**
   * 创建插件上下文
   */
  private createContext(manifest: PluginManifest, pluginType: PluginType): PluginContext {
    // 根据插件类型确定权限级别
    let permissionLevel: PluginPermissionLevel;
    switch (pluginType) {
      case PluginType.OFFICIAL:
        permissionLevel = PluginPermissionLevel.FULL;
        break;
      case PluginType.PARTNER:
        permissionLevel = PluginPermissionLevel.STANDARD;
        break;
      case PluginType.COMMUNITY:
      default:
        permissionLevel = PluginPermissionLevel.RESTRICTED;
        break;
    }

    return createPluginContext({
      pluginId: manifest.id,
      pluginName: manifest.name,
      permissionLevel,
      permissions: manifest.permissions
    });
  }

  /**
   * 加载插件实例（沙箱或非沙箱）
   */
  private async loadPluginInstance(
    pluginPath: string,
    manifest: PluginManifest,
    context: PluginContext,
    useSandbox: boolean
  ): Promise<{ instance: Plugin; sandbox?: PluginSandbox }> {
    const mainFile = path.join(pluginPath, manifest.main);

    // 检查主文件是否存在
    await fs.access(mainFile);

    if (useSandbox) {
      // 使用沙箱加载
      await logger.info(`Loading plugin with sandbox: ${manifest.id}`, 'PluginManagerV2');

      const sandbox = createPluginSandbox(context, {
        pluginDir: pluginPath,
        timeout: this.defaultOptions.sandboxTimeout,
        memoryLimit: this.defaultOptions.sandboxMemoryLimit
      });

      // 在沙箱中运行插件
      const instance = await sandbox.runFile<Plugin>(mainFile);

      return { instance, sandbox };
    } else {
      // 非沙箱加载（向后兼容）
      await logger.info(`Loading plugin without sandbox: ${manifest.id}`, 'PluginManagerV2');

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginModule = eval('require')(mainFile);
      const instance: Plugin = pluginModule.default || pluginModule;

      return { instance };
    }
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    await logger.info('Initializing PluginManagerV2', 'PluginManagerV2');
    await this.ensurePluginsDir();

    // 自动加载 official 插件
    const officialDir = path.join(this.pluginsDir, 'official');
    try {
      const officialPlugins = await fs.readdir(officialDir);
      for (const pluginId of officialPlugins) {
        try {
          await this.loadPlugin(pluginId);
        } catch (error) {
          await logger.warn(
            `Failed to auto-load official plugin: ${pluginId}`,
            'PluginManagerV2',
            { error }
          );
        }
      }
    } catch (error) {
      await logger.warn('No official plugins directory found', 'PluginManagerV2', { error });
    }

    await logger.info('PluginManagerV2 initialized', 'PluginManagerV2');
  }

  /**
   * 加载插件
   */
  public async loadPlugin(pluginId: string, options?: PluginOptions): Promise<PluginInfo> {
    return errorHandler.wrapAsync(
      async () => {
        // 检查是否已加载
        if (this.loadedPlugins.has(pluginId)) {
          const loaded = this.loadedPlugins.get(pluginId)!;
          return loaded.info;
        }

        // 尝试从 official、partner 和 community 目录查找
        let pluginPath: string | null = null;
        let pluginType: PluginType = PluginType.COMMUNITY;

        const officialPath = path.join(this.pluginsDir, 'official', pluginId);
        const partnerPath = path.join(this.pluginsDir, 'partner', pluginId);
        const communityPath = path.join(this.pluginsDir, 'community', pluginId);

        try {
          await fs.access(officialPath);
          pluginPath = officialPath;
          pluginType = PluginType.OFFICIAL;
        } catch {
          try {
            await fs.access(partnerPath);
            pluginPath = partnerPath;
            pluginType = PluginType.PARTNER;
          } catch {
            try {
              await fs.access(communityPath);
              pluginPath = communityPath;
              pluginType = PluginType.COMMUNITY;
            } catch {
              throw new Error(`Plugin not found: ${pluginId}`);
            }
          }
        }

        // 读取 manifest
        const manifest = await this.readManifest(pluginPath);

        // 创建插件上下文
        const context = this.createContext(manifest, pluginType);

        // 决定是否使用沙箱
        const mergedOptions = { ...this.defaultOptions, ...options };
        const useSandbox = manifest.requireSandbox ?? mergedOptions.enableSandbox ?? false;

        // 加载插件实例
        const { instance, sandbox } = await this.loadPluginInstance(
          pluginPath,
          manifest,
          context,
          useSandbox
        );

        // 调用 activate（如果存在）
        if (instance.activate) {
          await instance.activate();
        }

        // 从配置中读取启用状态（默认为true）
        const config = configManager.getConfig();
        const pluginConfig = config.plugins?.[manifest.id];
        const isEnabled = pluginConfig?.enabled !== undefined ? pluginConfig.enabled : true;

        // 创建插件信息
        const info: PluginInfo = {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
          icon: manifest.icon,
          type: pluginType,
          isEnabled,
          isSandboxed: useSandbox,
          permissions: manifest.permissions,
          path: pluginPath
        };

        // 保存到已加载列表
        this.loadedPlugins.set(pluginId, {
          info,
          manifest,
          instance,
          enabled: isEnabled,
          context,
          sandbox
        });

        await logger.info(
          `Plugin loaded: ${pluginId}`,
          'PluginManagerV2',
          { info, sandboxed: useSandbox }
        );

        return info;
      },
      'PluginManagerV2',
      'loadPlugin',
      ErrorCode.PLUGIN_LOAD_ERROR
    );
  }

  /**
   * 卸载插件（增强版 - 清理所有资源）
   */
  public async unloadPlugin(pluginId: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
          throw new Error(`Plugin not loaded: ${pluginId}`);
        }

        await logger.info(`Unloading plugin: ${pluginId}`, 'PluginManagerV2');

        // 1. 调用插件的 deactivate（如果存在）
        if (loaded.instance.deactivate) {
          try {
            await loaded.instance.deactivate();
          } catch (error) {
            await logger.error(
              `Plugin deactivate error: ${pluginId}`,
              'PluginManagerV2',
              { error }
            );
          }
        }

        // 2. 清理插件上下文（会清理所有注册的资源）
        if (loaded.context) {
          try {
            await loaded.context.cleanup();
          } catch (error) {
            await logger.error(
              `Context cleanup error: ${pluginId}`,
              'PluginManagerV2',
              { error }
            );
          }
        }

        // 3. 销毁沙箱（如果存在）
        if (loaded.sandbox) {
          try {
            await loaded.sandbox.destroy();
          } catch (error) {
            await logger.error(
              `Sandbox destroy error: ${pluginId}`,
              'PluginManagerV2',
              { error }
            );
          }
        }

        // 4. 从已加载列表中移除
        this.loadedPlugins.delete(pluginId);

        await logger.info(`Plugin unloaded: ${pluginId}`, 'PluginManagerV2');
      },
      'PluginManagerV2',
      'unloadPlugin',
      ErrorCode.PLUGIN_UNINSTALL_ERROR
    );
  }

  /**
   * 执行插件动作
   */
  public async executePlugin(pluginId: string, action: string, params: unknown): Promise<unknown> {
    return errorHandler.wrapAsync(
      async () => {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
          throw new Error(`Plugin not loaded: ${pluginId}`);
        }

        if (!loaded.enabled) {
          throw new Error(`Plugin is disabled: ${pluginId}`);
        }

        if (!loaded.instance.execute) {
          throw new Error(`Plugin does not support execute: ${pluginId}`);
        }

        await logger.debug(
          `Executing plugin action: ${pluginId}.${action}`,
          'PluginManagerV2',
          { params, sandboxed: loaded.info.isSandboxed }
        );

        const result = await loaded.instance.execute(action, params);

        // 更新 lastUsed 时间
        const timestamp = await timeService.getCurrentTime();
        const config = configManager.getConfig();
        const plugins = config.plugins || {};
        plugins[pluginId] = {
          enabled: plugins[pluginId]?.enabled !== undefined ? plugins[pluginId].enabled : true,
          lastUsed: new Date(timestamp).toISOString()
        };
        await configManager.updateConfig({ plugins });

        await logger.debug(
          `Plugin action executed: ${pluginId}.${action}`,
          'PluginManagerV2',
          { result }
        );

        return result;
      },
      'PluginManagerV2',
      'executePlugin',
      ErrorCode.PLUGIN_EXECUTION_ERROR
    );
  }

  /**
   * 列出所有插件
   */
  public async listPlugins(type?: PluginType): Promise<PluginInfo[]> {
    const plugins: PluginInfo[] = [];

    for (const [, loaded] of this.loadedPlugins) {
      if (!type || loaded.info.type === type) {
        plugins.push(loaded.info);
      }
    }

    return plugins;
  }

  /**
   * 启用/禁用插件
   */
  public async togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
          throw new Error(`Plugin not loaded: ${pluginId}`);
        }

        loaded.enabled = enabled;
        loaded.info.isEnabled = enabled;

        // 保存到配置文件
        const config = configManager.getConfig();
        const plugins = config.plugins || {};
        plugins[pluginId] = {
          enabled,
          lastUsed: plugins[pluginId]?.lastUsed
        };

        await configManager.updateConfig({ plugins });

        await logger.info(
          `Plugin ${enabled ? 'enabled' : 'disabled'}: ${pluginId}`,
          'PluginManagerV2'
        );
      },
      'PluginManagerV2',
      'togglePlugin',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 获取插件资源统计
   */
  public async getPluginStats(pluginId: string): Promise<{
    resourceCount: number;
    isSandboxed: boolean;
    isActive: boolean;
  }> {
    const loaded = this.loadedPlugins.get(pluginId);
    if (!loaded) {
      throw new Error(`Plugin not loaded: ${pluginId}`);
    }

    return {
      resourceCount: loaded.context?.getResourceCount() ?? 0,
      isSandboxed: loaded.info.isSandboxed,
      isActive: loaded.context?.isContextActive() ?? false
    };
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up PluginManagerV2', 'PluginManagerV2');

    // 卸载所有插件
    for (const [pluginId] of this.loadedPlugins) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        await logger.error(
          `Failed to unload plugin during cleanup: ${pluginId}`,
          'PluginManagerV2',
          { error }
        );
      }
    }

    await logger.info('PluginManagerV2 cleaned up', 'PluginManagerV2');
  }
}

// 导出增强版单例实例（不破坏原有的pluginManager）
export const pluginManagerV2 = new PluginManagerV2();

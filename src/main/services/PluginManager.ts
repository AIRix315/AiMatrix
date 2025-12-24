/**
 * PluginManager 服务 - 插件管理
 *
 * MVP 功能：
 * - 插件加载/卸载（从 plugins/ 目录）
 * - 插件信息读取（manifest.json）
 * - 基础权限检查（读取 permissions 字段）
 * - 插件执行（直接 require）
 *
 * 后续迭代：
 * - 沙箱执行
 * - 签名验证
 * - 插件市场
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';

/**
 * 插件类型
 */
export enum PluginType {
  OFFICIAL = 'official',
  COMMUNITY = 'community'
}

/**
 * 插件权限
 */
export enum PluginPermission {
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  NETWORK = 'network',
  API_CALL = 'api:call',
  WORKFLOW_EXECUTE = 'workflow:execute'
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
  main: string; // 入口文件路径
  type: PluginType;
  permissions: PluginPermission[];
  dependencies?: Record<string, string>;
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
 * 加载的插件数据
 */
interface LoadedPlugin {
  info: PluginInfo;
  manifest: PluginManifest;
  instance: Plugin;
  enabled: boolean;
}

/**
 * PluginManager 服务类
 */
export class PluginManager {
  private pluginsDir: string;
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();

  constructor(pluginsDir?: string) {
    this.pluginsDir = pluginsDir || path.join(app.getPath('userData'), 'plugins');
    this.ensurePluginsDir().catch(error => {
      logger.error('Failed to create plugins directory', 'PluginManager', { error }).catch(() => {});
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
      // 创建 official 和 community 子目录
      await fs.mkdir(path.join(this.pluginsDir, 'official'), { recursive: true });
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
        'PluginManager',
        'readManifest',
        `Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`,
        { pluginPath }
      );
    }
  }

  /**
   * 检查插件权限
   */
  private checkPermissions(manifest: PluginManifest): void {
    // MVP: 简单记录权限，不做严格限制
    if (manifest.permissions && manifest.permissions.length > 0) {
      logger.info(
        `Plugin ${manifest.id} requires permissions: ${manifest.permissions.join(', ')}`,
        'PluginManager'
      ).catch(() => {});
    }
  }

  /**
   * 加载插件实例
   */
  private async loadPluginInstance(pluginPath: string, manifest: PluginManifest): Promise<Plugin> {
    try {
      const mainFile = path.join(pluginPath, manifest.main);

      // 检查主文件是否存在
      await fs.access(mainFile);

      // MVP: 直接 require 加载（后续版本使用沙箱）
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginModule = require(mainFile);

      // 获取默认导出或 default 属性
      const plugin: Plugin = pluginModule.default || pluginModule;

      return plugin;
    } catch (error) {
      throw errorHandler.createError(
        ErrorCode.PLUGIN_LOAD_ERROR,
        'PluginManager',
        'loadPluginInstance',
        `Failed to load plugin instance: ${error instanceof Error ? error.message : String(error)}`,
        { pluginPath, mainFile: manifest.main }
      );
    }
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    await logger.info('Initializing PluginManager', 'PluginManager');
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
            'PluginManager',
            { error }
          );
        }
      }
    } catch (error) {
      await logger.warn('No official plugins directory found', 'PluginManager', { error });
    }

    await logger.info('PluginManager initialized', 'PluginManager');
  }

  /**
   * 加载插件
   */
  public async loadPlugin(pluginId: string): Promise<PluginInfo> {
    return errorHandler.wrapAsync(
      async () => {
        // 检查是否已加载
        if (this.loadedPlugins.has(pluginId)) {
          const loaded = this.loadedPlugins.get(pluginId)!;
          return loaded.info;
        }

        // 尝试从 official 和 community 目录查找
        let pluginPath: string | null = null;
        let pluginType: PluginType = PluginType.COMMUNITY;

        const officialPath = path.join(this.pluginsDir, 'official', pluginId);
        const communityPath = path.join(this.pluginsDir, 'community', pluginId);

        try {
          await fs.access(officialPath);
          pluginPath = officialPath;
          pluginType = PluginType.OFFICIAL;
        } catch {
          try {
            await fs.access(communityPath);
            pluginPath = communityPath;
            pluginType = PluginType.COMMUNITY;
          } catch {
            throw new Error(`Plugin not found: ${pluginId}`);
          }
        }

        // 读取 manifest
        const manifest = await this.readManifest(pluginPath);

        // 检查权限
        this.checkPermissions(manifest);

        // 加载插件实例
        const instance = await this.loadPluginInstance(pluginPath, manifest);

        // 调用 activate（如果存在）
        if (instance.activate) {
          await instance.activate();
        }

        // 创建插件信息
        const info: PluginInfo = {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
          icon: manifest.icon,
          type: pluginType,
          isEnabled: true,
          permissions: manifest.permissions,
          path: pluginPath
        };

        // 保存到已加载列表
        this.loadedPlugins.set(pluginId, {
          info,
          manifest,
          instance,
          enabled: true
        });

        await logger.info(`Plugin loaded: ${pluginId}`, 'PluginManager', { info });

        return info;
      },
      'PluginManager',
      'loadPlugin',
      ErrorCode.PLUGIN_LOAD_ERROR
    );
  }

  /**
   * 卸载插件
   */
  public async unloadPlugin(pluginId: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
          throw new Error(`Plugin not loaded: ${pluginId}`);
        }

        // 调用 deactivate（如果存在）
        if (loaded.instance.deactivate) {
          await loaded.instance.deactivate();
        }

        // 从已加载列表中移除
        this.loadedPlugins.delete(pluginId);

        await logger.info(`Plugin unloaded: ${pluginId}`, 'PluginManager');
      },
      'PluginManager',
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
          'PluginManager',
          { params }
        );

        const result = await loaded.instance.execute(action, params);

        await logger.debug(
          `Plugin action executed: ${pluginId}.${action}`,
          'PluginManager',
          { result }
        );

        return result;
      },
      'PluginManager',
      'executePlugin',
      ErrorCode.PLUGIN_EXECUTION_ERROR
    );
  }

  /**
   * 列出所有插件
   */
  public async listPlugins(type?: PluginType): Promise<PluginInfo[]> {
    return errorHandler.wrapAsync(
      async () => {
        const plugins: PluginInfo[] = [];

        for (const [, loaded] of this.loadedPlugins) {
          if (!type || loaded.info.type === type) {
            plugins.push(loaded.info);
          }
        }

        return plugins;
      },
      'PluginManager',
      'listPlugins',
      ErrorCode.OPERATION_FAILED
    );
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

        await logger.info(
          `Plugin ${enabled ? 'enabled' : 'disabled'}: ${pluginId}`,
          'PluginManager'
        );
      },
      'PluginManager',
      'togglePlugin',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up PluginManager', 'PluginManager');

    // 卸载所有插件
    for (const [pluginId] of this.loadedPlugins) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        await logger.error(
          `Failed to unload plugin during cleanup: ${pluginId}`,
          'PluginManager',
          { error }
        );
      }
    }

    await logger.info('PluginManager cleaned up', 'PluginManager');
  }
}

// 导出单例实例
export const pluginManager = new PluginManager();

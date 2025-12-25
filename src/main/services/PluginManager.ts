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
import AdmZip from 'adm-zip';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';
import { timeService } from './TimeService';
import { configManager } from './ConfigManager';
import { PluginType, PluginPermission, PluginManifest as BasePluginManifest } from '../../common/types';

/**
 * 插件 Manifest 接口（扩展基础定义，添加main字段）
 */
export interface PluginManifest extends BasePluginManifest {
  main: string; // 入口文件路径
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
      // 创建 official、partner 和 community 子目录
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

        // 检查权限
        this.checkPermissions(manifest);

        // 加载插件实例
        const instance = await this.loadPluginInstance(pluginPath, manifest);

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
          permissions: manifest.permissions,
          path: pluginPath
        };

        // 保存到已加载列表
        this.loadedPlugins.set(pluginId, {
          info,
          manifest,
          instance,
          enabled: isEnabled
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

        // 保存到配置文件
        const config = configManager.getConfig();
        const plugins = config.plugins || {};
        plugins[pluginId] = {
          enabled,
          lastUsed: plugins[pluginId]?.lastUsed // 保留原有的 lastUsed
        };

        await configManager.updateConfig({ plugins });

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
   * 从本地ZIP文件安装插件
   */
  public async installPluginFromZip(
    zipPath: string,
    type: PluginType = PluginType.COMMUNITY
  ): Promise<PluginInfo> {
    return errorHandler.wrapAsync(
      async () => {
        // 验证时间
        const isValid = await timeService.validateTimeIntegrity();
        if (!isValid) {
          throw new Error('系统时间验证失败，无法安装插件');
        }

        await logger.info(`Installing plugin from ZIP: ${zipPath}`, 'PluginManager', { type });

        // 验证ZIP文件存在
        try {
          await fs.access(zipPath);
        } catch {
          throw new Error(`ZIP文件不存在: ${zipPath}`);
        }

        // 创建临时目录
        const tempDir = path.join(app.getPath('temp'), `plugin-install-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        try {
          // 解压ZIP到临时目录
          await this.extractZip(zipPath, tempDir);

          // 读取并验证manifest.json
          const manifestPath = path.join(tempDir, 'manifest.json');
          try {
            await fs.access(manifestPath);
          } catch {
            throw new Error('插件包中缺少manifest.json文件');
          }

          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest: PluginManifest = JSON.parse(manifestContent);

          // 验证manifest完整性
          this.validateManifest(manifest);

          // 检查插件是否已存在
          const targetPluginDir = path.join(this.pluginsDir, type, manifest.id);
          const pluginExists = await fs
            .access(targetPluginDir)
            .then(() => true)
            .catch(() => false);

          if (pluginExists) {
            // 如果已卸载，先删除旧版本
            if (this.loadedPlugins.has(manifest.id)) {
              await this.unloadPlugin(manifest.id);
            }
            await fs.rm(targetPluginDir, { recursive: true, force: true });
          }

          // 复制到插件目录
          await fs.mkdir(targetPluginDir, { recursive: true });
          await this.copyDirectory(tempDir, targetPluginDir);

          await logger.info(`Plugin installed: ${manifest.id}`, 'PluginManager', {
            version: manifest.version,
            type
          });

          // 加载插件
          return await this.loadPlugin(manifest.id);
        } finally {
          // 清理临时目录
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (error) {
            await logger.warn('Failed to clean up temp directory', 'PluginManager', {
              tempDir,
              error
            });
          }
        }
      },
      'PluginManager',
      'installPluginFromZip',
      ErrorCode.PLUGIN_INSTALL_ERROR
    );
  }

  /**
   * 验证manifest完整性
   */
  private validateManifest(manifest: PluginManifest): void {
    const required = ['id', 'name', 'version', 'description', 'author', 'main', 'type', 'permissions'];

    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`manifest.json缺少必需字段: ${field}`);
      }
    }

    // 验证版本格式（semver）
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error('版本号格式无效，应为x.y.z格式（如1.0.0）');
    }

    // 验证插件ID格式
    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error('插件ID格式无效，只能包含小写字母、数字和连字符');
    }
  }

  /**
   * 解压ZIP文件
   */
  private async extractZip(zipPath: string, targetDir: string): Promise<void> {
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      // 安全检查：防止路径遍历攻击
      for (const entry of zipEntries) {
        const entryPath = path.normalize(entry.entryName);
        if (entryPath.includes('..') || path.isAbsolute(entryPath)) {
          throw new Error(`检测到不安全的文件路径: ${entry.entryName}`);
        }
      }

      // 检查解压后的大小（防止ZIP炸弹）
      const totalSize = zipEntries.reduce((sum, entry) => sum + entry.header.size, 0);
      const maxSize = 100 * 1024 * 1024; // 100MB限制
      if (totalSize > maxSize) {
        throw new Error(`插件包过大（${(totalSize / 1024 / 1024).toFixed(2)}MB），最大允许100MB`);
      }

      // 解压
      zip.extractAllTo(targetDir, true);

      await logger.info('ZIP extracted successfully', 'PluginManager', {
        zipPath,
        targetDir,
        fileCount: zipEntries.length
      });
    } catch (error) {
      throw new Error(
        `ZIP文件解压失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 递归复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
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

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
import { apiManager } from './APIManager';
import { PluginType, PluginPermission, PluginManifest as BasePluginManifest, ProjectConfig } from '../../common/types';
import type { PluginConfig } from '@/shared/types/plugin-config';
import type { APIProviderConfig, APICategory, AuthType } from '@/shared/types';

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
  category?: string;
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
      // 使用 eval('require') 绕过 Webpack 静态分析
      const pluginModule = eval('require')(mainFile);

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

    // 自动加载所有类型的插件（official, partner, community）
    const pluginTypes = ['official', 'partner', 'community'];

    for (const type of pluginTypes) {
      const typeDir = path.join(this.pluginsDir, type);
      try {
        const plugins = await fs.readdir(typeDir);
        for (const pluginId of plugins) {
          try {
            await this.loadPlugin(pluginId);
          } catch (error) {
            await logger.warn(
              `Failed to auto-load ${type} plugin: ${pluginId}`,
              'PluginManager',
              { error }
            );
          }
        }
        await logger.info(`Loaded ${type} plugins`, 'PluginManager');
      } catch (error) {
        await logger.debug(`No ${type} plugins directory found`, 'PluginManager');
      }
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          icon: manifest.icon as any,
          type: pluginType,
          category: manifest.category,
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
   * 获取插件信息
   */
  public getPlugin(pluginId: string): PluginInfo | null {
    const loaded = this.loadedPlugins.get(pluginId);
    return loaded ? loaded.info : null;
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
   * 从插件默认配置注入Provider和参数到项目配置
   * 读取插件的default-config.json，提取providers并自动注册到APIManager
   *
   * @param pluginId - 插件ID
   * @param projectConfig - 项目配置对象
   * @returns 更新后的项目配置
   */
  public async injectPluginConfig(
    pluginId: string,
    projectConfig: ProjectConfig
  ): Promise<ProjectConfig> {
    return errorHandler.wrapAsync(
      async () => {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
          throw new Error(`Plugin not loaded: ${pluginId}`);
        }

        const pluginPath = loaded.info.path;
        const defaultConfigPath = path.join(pluginPath, 'default-config.json');

        try {
          await fs.access(defaultConfigPath);
        } catch {
          await logger.warn(
            `Plugin ${pluginId} has no default-config.json, skipping config injection`,
            'PluginManager'
          );
          return projectConfig;
        }

        const configContent = await fs.readFile(defaultConfigPath, 'utf-8');
        const pluginConfig: PluginConfig = JSON.parse(configContent);

        await logger.info(
          `Injecting config from plugin ${pluginId}`,
          'PluginManager',
          { providers: Object.keys(pluginConfig.providers) }
        );

        // 1. 提取providers并添加到全局APIManager
        const selectedProviders: Record<string, string> = {};
        for (const [key, providerItem] of Object.entries(pluginConfig.providers)) {
          if (providerItem.providerId) {
            // 构建Provider名称(去重命名规范)
            const providerName = `[${loaded.manifest.name}]${key}-${providerItem.providerId}`;

            // 检查Provider是否已存在
            const existingProvider = await apiManager.getProvider(providerName);
            if (!existingProvider) {
              // Provider不存在,添加到APIManager
              const newProvider: APIProviderConfig = {
                id: providerName,
                name: providerName,
                category: this.mapProviderKeyToCategory(key),
                baseUrl: '', // 需要用户配置
                authType: 'bearer' as AuthType,
                enabled: false,
                description: `${providerItem.purpose} (来自插件 ${loaded.manifest.name})`,
                models: providerItem.model ? [providerItem.model] : undefined,
              };

              await apiManager.addProvider(newProvider);
              await logger.info(
                `Added Provider ${providerName} to global list`,
                'PluginManager'
              );
            } else {
              await logger.debug(
                `Provider ${providerName} already exists, skipping`,
                'PluginManager'
              );
            }

            // 记录到selectedProviders映射
            selectedProviders[key] = providerName;
          }
        }

        // 2. 提取folders并创建物理目录(如果配置中有定义)
        const folders: Record<string, string> = {};
        // 注意:default-config.json可能没有folders字段,
        // 文件夹结构可能在其他地方定义(如模板),这里仅作为扩展点

        // 3. 更新project.json
        projectConfig.pluginId = pluginId;
        projectConfig.selectedProviders = selectedProviders;
        projectConfig.folders = folders;
        projectConfig.params = pluginConfig.providers ?
          Object.fromEntries(
            Object.entries(pluginConfig.providers).map(([k, v]) => [k, v.params || {}])
          ) : {};
        projectConfig.prompts = {}; // 提示词配置暂时为空,后续由UI配置

        await logger.info(
          `Config injection completed for plugin ${pluginId}`,
          'PluginManager',
          {
            selectedProviders: Object.keys(selectedProviders).length,
            folders: Object.keys(folders).length,
          }
        );

        return projectConfig;
      },
      'PluginManager',
      'injectPluginConfig',
      ErrorCode.PLUGIN_EXECUTION_ERROR
    );
  }

  /**
   * 将Provider配置键映射到APICategory
   */
  private mapProviderKeyToCategory(key: string): APICategory {
    const categoryMap: Record<string, APICategory> = {
      'llm': 'llm' as APICategory,
      'imageGeneration': 'image-generation' as APICategory,
      'videoGeneration': 'video-generation' as APICategory,
      'tts': 'tts' as APICategory,
      'stt': 'stt' as APICategory,
    };

    return categoryMap[key] || ('llm' as APICategory);
  }

  /**
   * 执行前健康检查 - 验证所有必需的Provider是否可用
   * 读取项目配置中的selectedProviders，逐个检查Provider状态
   *
   * @param pluginId - 插件ID
   * @param projectId - 项目ID
   * @returns 检查结果 {allPassed: boolean, failedProviders: string[]}
   */
  public async preflightCheck(
    pluginId: string,
    projectId: string
  ): Promise<{ allPassed: boolean; failedProviders: string[] }> {
    return errorHandler.wrapAsync(
      async () => {
        await logger.info(
          `Pre-flight check for plugin ${pluginId} in project ${projectId}`,
          'PluginManager'
        );

        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
          throw new Error(`Plugin not loaded: ${pluginId}`);
        }

        // 动态导入ProjectManager获取项目配置
        const { projectManager } = await import('./ProjectManager');
        const projectConfig = await projectManager.loadProject(projectId);

        if (!projectConfig.selectedProviders) {
          await logger.warn(
            'No selectedProviders in project config, skipping pre-flight check',
            'PluginManager',
            { projectId }
          );
          return { allPassed: true, failedProviders: [] };
        }

        const failedProviders: string[] = [];

        // 验证每个选中的Provider
        for (const [key, providerId] of Object.entries(
          projectConfig.selectedProviders
        )) {
          try {
            const status = await apiManager.getProviderStatus(providerId);

            if (status.status !== 'available') {
              failedProviders.push(`${key}: ${providerId} (${status.error || 'unavailable'})`);
              await logger.warn(
                `Provider ${providerId} is not available`,
                'PluginManager',
                { status }
              );
            } else {
              await logger.debug(
                `Provider ${providerId} is available`,
                'PluginManager',
                { latency: status.latency }
              );
            }
          } catch (error) {
            failedProviders.push(
              `${key}: ${providerId} (health check failed)`
            );
            await logger.error(
              `Health check failed for provider ${providerId}`,
              'PluginManager',
              { error }
            );
          }
        }

        const allPassed = failedProviders.length === 0;

        await logger.info(
          `Pre-flight check completed for plugin ${pluginId}`,
          'PluginManager',
          {
            allPassed,
            totalProviders: Object.keys(projectConfig.selectedProviders).length,
            failedCount: failedProviders.length,
          }
        );

        return { allPassed, failedProviders };
      },
      'PluginManager',
      'preflightCheck',
      ErrorCode.PLUGIN_EXECUTION_ERROR
    );
  }

  /**
   * 批量检查所有已启用Provider的健康状态
   * 通常在应用启动时调用，获取Provider可用性统计
   *
   * @returns 检查结果 {total: number, available: number, unavailable: number, details: Array}
   */
  public async batchHealthCheck(): Promise<{
    total: number;
    available: number;
    unavailable: number;
    details: Array<{ id: string; status: string; error?: string }>;
  }> {
    return errorHandler.wrapAsync(
      async () => {
        await logger.info('Starting batch health check for all providers', 'PluginManager');

        const providers = await apiManager.listProviders({ enabledOnly: true });
        const details: Array<{ id: string; status: string; error?: string }> = [];
        let available = 0;
        let unavailable = 0;

        for (const provider of providers) {
          try {
            const status = await apiManager.getProviderStatus(provider.id);

            details.push({
              id: provider.id,
              status: status.status,
              error: status.error,
            });

            if (status.status === 'available') {
              available++;
            } else {
              unavailable++;
            }
          } catch (error) {
            details.push({
              id: provider.id,
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
            unavailable++;
          }
        }

        await logger.info(
          'Batch health check completed',
          'PluginManager',
          {
            total: providers.length,
            available,
            unavailable,
          }
        );

        return {
          total: providers.length,
          available,
          unavailable,
          details,
        };
      },
      'PluginManager',
      'batchHealthCheck',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 创建任务临时目录，用于存放中间文件
   * 目录命名: .temp_{taskId}，失败时可自动清理
   *
   * @param projectId - 项目ID
   * @param taskId - 任务ID
   * @returns 临时目录的绝对路径
   */
  public async createTempDir(
    projectId: string,
    taskId: string
  ): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        // 动态导入ProjectManager获取项目路径
        const { projectManager } = await import('./ProjectManager');
        const projectConfig = await projectManager.loadProject(projectId);

        const tempDir = path.join(projectConfig.path, `.temp_${taskId}`);

        // 创建临时目录
        await fs.mkdir(tempDir, { recursive: true });

        await logger.info(
          `Temp directory created: ${tempDir}`,
          'PluginManager',
          { projectId, taskId }
        );

        return tempDir;
      },
      'PluginManager',
      'createTempDir',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 提交临时目录内容到目标位置
   * 使用原子性rename操作移动文件，成功后删除临时目录
   *
   * @param projectId - 项目ID
   * @param taskId - 任务ID
   * @param targetDirName - 目标目录名称（相对于项目根目录）
   */
  public async commitTempDir(
    projectId: string,
    taskId: string,
    targetDirName: string
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        // 动态导入ProjectManager获取项目路径
        const { projectManager } = await import('./ProjectManager');
        const projectConfig = await projectManager.loadProject(projectId);

        const tempDir = path.join(projectConfig.path, `.temp_${taskId}`);
        const targetDir = path.join(projectConfig.path, targetDirName);

        // 检查临时目录是否存在
        try {
          await fs.access(tempDir);
        } catch {
          await logger.warn(
            `Temp directory not found: ${tempDir}`,
            'PluginManager'
          );
          return;
        }

        // 确保目标目录存在
        await fs.mkdir(targetDir, { recursive: true });

        // 移动临时目录内容到目标目录
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          const srcPath = path.join(tempDir, file);
          const destPath = path.join(targetDir, file);

          // 使用rename进行原子性移动
          await fs.rename(srcPath, destPath);
        }

        // 删除临时目录
        await fs.rmdir(tempDir);

        await logger.info(
          `Temp directory committed: ${tempDir} -> ${targetDir}`,
          'PluginManager',
          { projectId, taskId, fileCount: files.length }
        );
      },
      'PluginManager',
      'commitTempDir',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 回滚并删除临时目录
   * 任务失败时调用，清理所有中间文件
   *
   * @param projectId - 项目ID
   * @param taskId - 任务ID
   */
  public async rollbackTempDir(
    projectId: string,
    taskId: string
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        // 动态导入ProjectManager获取项目路径
        const { projectManager } = await import('./ProjectManager');
        const projectConfig = await projectManager.loadProject(projectId);

        const tempDir = path.join(projectConfig.path, `.temp_${taskId}`);

        // 检查临时目录是否存在
        try {
          await fs.access(tempDir);
        } catch {
          await logger.debug(
            `Temp directory not found (already cleaned?): ${tempDir}`,
            'PluginManager'
          );
          return;
        }

        // 递归删除临时目录
        await fs.rm(tempDir, { recursive: true, force: true });

        await logger.info(
          `Temp directory rolled back: ${tempDir}`,
          'PluginManager',
          { projectId, taskId }
        );
      },
      'PluginManager',
      'rollbackTempDir',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 创建任务执行日志文件
   * 日志文件位于 userData/log/Task/{taskId}.json
   *
   * @param pluginId - 插件ID
   * @param projectId - 项目ID
   * @returns 生成的任务ID
   */
  public async createTaskLog(
    pluginId: string,
    projectId: string
  ): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        const taskId = `${pluginId}_${Date.now()}`;
        const timestamp = await timeService.getCurrentTime();

        const taskLog = {
          taskId,
          pluginId,
          projectId,
          status: 'running',
          startTime: timestamp.toISOString(),
          endTime: null,
          error: null,
          steps: [],
        };

        // 确保日志目录存在
        const logDir = path.join(app.getPath('userData'), 'log', 'Task');
        await fs.mkdir(logDir, { recursive: true });

        // 写入任务日志文件
        const logFile = path.join(logDir, `${taskId}.json`);
        await fs.writeFile(logFile, JSON.stringify(taskLog, null, 2), 'utf-8');

        await logger.info(
          `Task log created: ${taskId}`,
          'PluginManager',
          { pluginId, projectId }
        );

        return taskId;
      },
      'PluginManager',
      'createTaskLog',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 更新任务日志状态和执行步骤
   *
   * @param taskId - 任务ID
   * @param status - 任务状态 (running/success/error)
   * @param data - 额外数据，包括steps数组和error信息
   */
  public async updateTaskLog(
    taskId: string,
    status: 'running' | 'success' | 'error',
    data?: { steps?: unknown[]; error?: string }
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const logDir = path.join(app.getPath('userData'), 'log', 'Task');
        const logFile = path.join(logDir, `${taskId}.json`);

        try {
          await fs.access(logFile);
        } catch {
          await logger.warn(
            `Task log not found: ${taskId}`,
            'PluginManager'
          );
          return;
        }

        const content = await fs.readFile(logFile, 'utf-8');
        const taskLog = JSON.parse(content);

        taskLog.status = status;
        if (data?.steps) {
          taskLog.steps = data.steps;
        }
        if (data?.error) {
          taskLog.error = data.error;
        }

        await fs.writeFile(logFile, JSON.stringify(taskLog, null, 2), 'utf-8');

        await logger.debug(
          `Task log updated: ${taskId}`,
          'PluginManager',
          { status }
        );
      },
      'PluginManager',
      'updateTaskLog',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 获取所有任务日志列表
   * 用于右侧面板"队列"标签页展示
   *
   * @param filter - 过滤条件 (running/success/error/all)
   * @returns 任务日志数组
   */
  public async listTaskLogs(
    filter: 'running' | 'success' | 'error' | 'all' = 'all'
  ): Promise<Array<{
    taskId: string;
    pluginId: string;
    projectId: string;
    status: string;
    startTime: string;
    endTime: string | null;
    error: string | null;
  }>> {
    return errorHandler.wrapAsync(
      async () => {
        const logDir = path.join(app.getPath('userData'), 'log', 'Task');
        const results: Array<any> = [];

        try {
          await fs.access(logDir);
        } catch {
          return results;
        }

        const files = await fs.readdir(logDir);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const logFile = path.join(logDir, file);
          try {
            const content = await fs.readFile(logFile, 'utf-8');
            const taskLog = JSON.parse(content);

            // 应用过滤器
            if (filter !== 'all' && taskLog.status !== filter) {
              continue;
            }

            results.push({
              taskId: taskLog.taskId,
              pluginId: taskLog.pluginId,
              projectId: taskLog.projectId,
              status: taskLog.status,
              startTime: taskLog.startTime,
              endTime: taskLog.endTime,
              error: taskLog.error,
            });
          } catch (error) {
            await logger.warn(
              `Failed to read task log: ${file}`,
              'PluginManager',
              { error }
            );
          }
        }

        // 按时间倒序排序
        results.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );

        return results;
      },
      'PluginManager',
      'listTaskLogs',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 完成任务日志，记录结束时间和最终状态
   *
   * @param taskId - 任务ID
   * @param success - 任务是否成功完成
   * @param error - 错误信息（失败时）
   */
  public async completeTaskLog(
    taskId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const timestamp = await timeService.getCurrentTime();
        const logDir = path.join(app.getPath('userData'), 'log', 'Task');
        const logFile = path.join(logDir, `${taskId}.json`);

        try {
          await fs.access(logFile);
        } catch {
          await logger.warn(
            `Task log not found: ${taskId}`,
            'PluginManager'
          );
          return;
        }

        const content = await fs.readFile(logFile, 'utf-8');
        const taskLog = JSON.parse(content);

        taskLog.status = success ? 'success' : 'error';
        taskLog.endTime = timestamp.toISOString();
        if (error) {
          taskLog.error = error;
        }

        await fs.writeFile(logFile, JSON.stringify(taskLog, null, 2), 'utf-8');

        await logger.info(
          `Task log completed: ${taskId}`,
          'PluginManager',
          { success, duration: Date.now() - new Date(taskLog.startTime).getTime() }
        );
      },
      'PluginManager',
      'completeTaskLog',
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
// 开发环境：使用项目根目录的 plugins/
// 生产环境：使用 userData/plugins
const isDev = !app.isPackaged;
const pluginsDir = isDev
  ? path.join(process.cwd(), 'plugins')
  : path.join(app.getPath('userData'), 'plugins');

export const pluginManager = new PluginManager(pluginsDir);

/**
 * ProjectPluginConfigManager - 项目级插件配置管理服务
 *
 * Phase 9 E03: 项目级插件配置管理
 *
 * 功能：
 * - 管理每个项目的插件配置（存储在项目目录）
 * - 从插件默认配置初始化项目配置
 * - 验证配置完整性（检查必需的Provider是否已配置）
 * - 提供配置的读取、保存、重置功能
 *
 * 文件结构：
 * projects/{projectId}/plugin-configs/{pluginId}.json
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';
import type {
  PluginConfig,
  ConfigValidationResult,
} from '@/shared/types/plugin-config';

export class ProjectPluginConfigManager {
  /**
   * 获取项目的插件配置文件路径
   */
  private getConfigPath(projectId: string, pluginId: string): string {
    return path.join(
      this.getProjectPluginConfigDir(projectId),
      `${pluginId}.json`
    );
  }

  /**
   * 获取项目的插件配置目录
   */
  private getProjectPluginConfigDir(projectId: string): string {
    // 假设项目目录结构为: userData/projects/{projectId}
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'projects', projectId, 'plugin-configs');
  }

  /**
   * 获取插件的默认配置文件路径
   */
  private getPluginDefaultConfigPath(pluginPath: string): string {
    return path.join(pluginPath, 'default-config.json');
  }

  /**
   * 确保配置目录存在
   */
  private async ensureConfigDir(projectId: string): Promise<void> {
    const dir = this.getProjectPluginConfigDir(projectId);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * 获取项目的插件配置
   * 如果不存在，则从插件默认配置初始化
   *
   * @param projectId - 项目ID
   * @param pluginId - 插件ID
   * @param pluginPath - 插件路径（用于读取默认配置）
   * @returns 插件配置
   */
  public async getPluginConfig(
    projectId: string,
    pluginId: string,
    pluginPath: string
  ): Promise<PluginConfig> {
    return errorHandler.wrapAsync(
      async () => {
        const configPath = this.getConfigPath(projectId, pluginId);

        // 检查配置文件是否存在
        try {
          await fs.access(configPath);
          const content = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(content) as PluginConfig;
          await logger.debug(
            `Loaded plugin config for project ${projectId}, plugin ${pluginId}`,
            'ProjectPluginConfigManager'
          );
          return config;
        } catch {
          // 配置不存在，从默认配置初始化
          await logger.info(
            `Plugin config not found for project ${projectId}, plugin ${pluginId}, initializing from defaults`,
            'ProjectPluginConfigManager'
          );
          return await this.initializeFromDefaults(
            projectId,
            pluginId,
            pluginPath
          );
        }
      },
      'ProjectPluginConfigManager',
      'getPluginConfig',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 保存项目的插件配置
   *
   * @param projectId - 项目ID
   * @param pluginId - 插件ID
   * @param config - 插件配置
   */
  public async savePluginConfig(
    projectId: string,
    pluginId: string,
    config: PluginConfig
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        await this.ensureConfigDir(projectId);
        const configPath = this.getConfigPath(projectId, pluginId);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        await logger.info(
          `Saved plugin config for project ${projectId}, plugin ${pluginId}`,
          'ProjectPluginConfigManager'
        );
      },
      'ProjectPluginConfigManager',
      'savePluginConfig',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 从插件默认配置初始化项目配置
   *
   * @param projectId - 项目ID
   * @param pluginId - 插件ID
   * @param pluginPath - 插件路径
   * @returns 初始化后的配置
   */
  public async initializeFromDefaults(
    projectId: string,
    pluginId: string,
    pluginPath: string
  ): Promise<PluginConfig> {
    return errorHandler.wrapAsync(
      async () => {
        const defaultConfigPath = this.getPluginDefaultConfigPath(pluginPath);

        // 检查默认配置是否存在
        try {
          await fs.access(defaultConfigPath);
        } catch {
          throw new Error(
            `Plugin ${pluginId} does not have a default-config.json file`
          );
        }

        // 读取默认配置
        const content = await fs.readFile(defaultConfigPath, 'utf-8');
        const defaultConfig = JSON.parse(content) as PluginConfig;

        // 保存到项目配置
        await this.savePluginConfig(projectId, pluginId, defaultConfig);

        await logger.info(
          `Initialized plugin config from defaults for project ${projectId}, plugin ${pluginId}`,
          'ProjectPluginConfigManager'
        );

        return defaultConfig;
      },
      'ProjectPluginConfigManager',
      'initializeFromDefaults',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 重置项目的插件配置为默认值
   *
   * @param projectId - 项目ID
   * @param pluginId - 插件ID
   * @param pluginPath - 插件路径
   * @returns 重置后的配置
   */
  public async resetToDefaults(
    projectId: string,
    pluginId: string,
    pluginPath: string
  ): Promise<PluginConfig> {
    return errorHandler.wrapAsync(
      async () => {
        // 删除现有配置（如果存在）
        const configPath = this.getConfigPath(projectId, pluginId);
        try {
          await fs.unlink(configPath);
        } catch {
          // 配置不存在，忽略错误
        }

        // 从默认配置重新初始化
        const config = await this.initializeFromDefaults(
          projectId,
          pluginId,
          pluginPath
        );

        await logger.info(
          `Reset plugin config to defaults for project ${projectId}, plugin ${pluginId}`,
          'ProjectPluginConfigManager'
        );

        return config;
      },
      'ProjectPluginConfigManager',
      'resetToDefaults',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 验证项目的插件配置完整性
   * 检查所有必需的Provider是否已配置
   *
   * @param projectId - 项目ID
   * @param pluginId - 插件ID
   * @param pluginPath - 插件路径
   * @returns 验证结果
   */
  public async validateConfig(
    projectId: string,
    pluginId: string,
    pluginPath: string
  ): Promise<ConfigValidationResult> {
    return errorHandler.wrapAsync(
      async () => {
        const config = await this.getPluginConfig(
          projectId,
          pluginId,
          pluginPath
        );
        const missing: string[] = [];

        // 检查每个 Provider 配置项
        for (const [_key, providerConfig] of Object.entries(config.providers)) {
          // 如果是必需的但未配置 providerId，则标记为缺失
          if (!providerConfig.optional && !providerConfig.providerId) {
            missing.push(providerConfig.purpose);
          }
        }

        const result: ConfigValidationResult = {
          valid: missing.length === 0,
          missingProviders: missing,
        };

        await logger.debug(
          `Validated plugin config for project ${projectId}, plugin ${pluginId}`,
          'ProjectPluginConfigManager',
          { valid: result.valid, missingCount: missing.length }
        );

        return result;
      },
      'ProjectPluginConfigManager',
      'validateConfig',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 删除项目的插件配置
   *
   * @param projectId - 项目ID
   * @param pluginId - 插件ID
   */
  public async deletePluginConfig(
    projectId: string,
    pluginId: string
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const configPath = this.getConfigPath(projectId, pluginId);
        try {
          await fs.unlink(configPath);
          await logger.info(
            `Deleted plugin config for project ${projectId}, plugin ${pluginId}`,
            'ProjectPluginConfigManager'
          );
        } catch (error) {
          // 配置不存在，忽略错误
          await logger.debug(
            `Plugin config not found for deletion, project ${projectId}, plugin ${pluginId}`,
            'ProjectPluginConfigManager'
          );
        }
      },
      'ProjectPluginConfigManager',
      'deletePluginConfig',
      ErrorCode.OPERATION_FAILED
    );
  }
}

// 导出单例实例
export const projectPluginConfigManager = new ProjectPluginConfigManager();

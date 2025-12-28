/**
 * ModelRegistry 服务 - 模型注册表
 *
 * 功能：
 * - 加载和管理默认模型列表
 * - 用户自定义模型管理
 * - 智能过滤（仅显示已配置Provider的模型）
 * - 模型隐藏/显示/收藏
 *
 * 参考：plans/code-references-phase9.md (REF-014)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';
import { apiManager } from './APIManager';
import {
  APICategory,
  ModelDefinition,
  UserModelConfig,
  ModelConfigFile
} from '../../shared/types/api';

/**
 * ModelRegistry 服务类
 */
export class ModelRegistry {
  private models: ModelDefinition[] = [];
  private userConfigs: UserModelConfig[] = [];
  private customModels: ModelDefinition[] = [];
  private defaultModelsPath: string;
  private userConfigPath: string;
  private customModelsPath: string;

  constructor() {
    // 默认模型文件路径（打包后在resources目录）
    this.defaultModelsPath = path.join(__dirname, '../../config/models/default-models.json');

    // 用户配置文件路径
    const configDir = path.join(app.getPath('userData'), 'config');
    this.userConfigPath = path.join(configDir, 'user-models.json');
    this.customModelsPath = path.join(configDir, 'custom-models.json');
  }

  /**
   * 初始化（加载默认模型和用户配置）
   */
  public async initialize(): Promise<void> {
    await logger.info('Initializing ModelRegistry', 'ModelRegistry');

    try {
      // 加载默认模型
      await this.loadDefaultModels();

      // 加载用户配置
      await this.loadUserConfigs();

      // 加载自定义模型
      await this.loadCustomModels();

      await logger.info('ModelRegistry initialized', 'ModelRegistry', {
        defaultModels: this.models.length,
        customModels: this.customModels.length,
        userConfigs: this.userConfigs.length
      });
    } catch (error) {
      await logger.error('Failed to initialize ModelRegistry', 'ModelRegistry', { error });
      throw error;
    }
  }

  /**
   * 加载默认模型
   */
  private async loadDefaultModels(): Promise<void> {
    try {
      const content = await fs.readFile(this.defaultModelsPath, 'utf-8');
      const data: ModelConfigFile = JSON.parse(content);
      this.models = data.models;
      await logger.debug(`Loaded ${this.models.length} default models`, 'ModelRegistry');
    } catch (error) {
      await logger.warn('Failed to load default models, using empty list', 'ModelRegistry', { error });
      this.models = [];
    }
  }

  /**
   * 加载用户配置
   */
  private async loadUserConfigs(): Promise<void> {
    try {
      const content = await fs.readFile(this.userConfigPath, 'utf-8');
      this.userConfigs = JSON.parse(content);
      await logger.debug(`Loaded ${this.userConfigs.length} user configs`, 'ModelRegistry');
    } catch (error) {
      // 文件不存在时使用空配置
      this.userConfigs = [];
    }
  }

  /**
   * 加载自定义模型
   */
  private async loadCustomModels(): Promise<void> {
    try {
      const content = await fs.readFile(this.customModelsPath, 'utf-8');
      const data: ModelConfigFile = JSON.parse(content);
      this.customModels = data.models;
      await logger.debug(`Loaded ${this.customModels.length} custom models`, 'ModelRegistry');
    } catch (error) {
      // 文件不存在时使用空列表
      this.customModels = [];
    }
  }

  /**
   * 保存用户配置
   */
  private async saveUserConfigs(): Promise<void> {
    try {
      const dir = path.dirname(this.userConfigPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.userConfigPath,
        JSON.stringify(this.userConfigs, null, 2),
        'utf-8'
      );
      await logger.debug('User configs saved', 'ModelRegistry');
    } catch (error) {
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'ModelRegistry',
        'saveUserConfigs',
        `Failed to save user configs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 保存自定义模型
   */
  private async saveCustomModels(): Promise<void> {
    try {
      const dir = path.dirname(this.customModelsPath);
      await fs.mkdir(dir, { recursive: true });

      const data: ModelConfigFile = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        models: this.customModels
      };

      await fs.writeFile(
        this.customModelsPath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      await logger.debug('Custom models saved', 'ModelRegistry');
    } catch (error) {
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'ModelRegistry',
        'saveCustomModels',
        `Failed to save custom models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取所有已启用的Provider ID列表
   */
  private async getEnabledProviderIds(): Promise<string[]> {
    try {
      const providers = await apiManager.listProviders({ enabledOnly: true });
      return providers.map(p => p.id);
    } catch (error) {
      await logger.warn('Failed to get enabled providers', 'ModelRegistry', { error });
      return [];
    }
  }

  /**
   * 获取模型列表（智能过滤：只显示已配置Provider的模型）
   *
   * @param options.category - 按功能分类过滤
   * @param options.enabledProvidersOnly - 仅显示已启用Provider的模型
   * @param options.includeHidden - 包含隐藏的模型
   * @param options.favoriteOnly - 仅显示收藏的模型
   * @returns 过滤后的模型列表
   */
  public async listModels(options?: {
    category?: APICategory;
    enabledProvidersOnly?: boolean;
    includeHidden?: boolean;
    favoriteOnly?: boolean;
  }): Promise<ModelDefinition[]> {
    return errorHandler.wrapAsync(
      async () => {
        const {
          category,
          enabledProvidersOnly = true,
          includeHidden = false,
          favoriteOnly = false
        } = options || {};

        // 合并默认模型和自定义模型
        let allModels = [...this.models, ...this.customModels];

        // 按分类过滤
        if (category) {
          allModels = allModels.filter(m => m.category === category);
        }

        // 过滤已配置Provider的模型
        if (enabledProvidersOnly) {
          const enabledProviders = await this.getEnabledProviderIds();
          allModels = allModels.filter(m => enabledProviders.includes(m.provider));
        }

        // 过滤隐藏的模型
        if (!includeHidden) {
          const hiddenIds = this.userConfigs
            .filter(c => c.hidden)
            .map(c => c.modelId);
          allModels = allModels.filter(m => !hiddenIds.includes(m.id));
        }

        // 仅显示收藏的模型
        if (favoriteOnly) {
          const favoriteIds = this.userConfigs
            .filter(c => c.favorite)
            .map(c => c.modelId);
          allModels = allModels.filter(m => favoriteIds.includes(m.id));
        }

        return allModels;
      },
      'ModelRegistry',
      'listModels',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 获取单个模型详情
   */
  public async getModel(modelId: string): Promise<ModelDefinition> {
    const model = [...this.models, ...this.customModels].find(m => m.id === modelId);
    if (!model) {
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'ModelRegistry',
        'getModel',
        `Model not found: ${modelId}`
      );
    }
    return model;
  }

  /**
   * 添加自定义模型
   */
  public async addCustomModel(model: ModelDefinition): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        // 检查ID是否重复
        const allModels = [...this.models, ...this.customModels];
        if (allModels.some(m => m.id === model.id)) {
          throw new Error(`模型ID已存在: ${model.id}`);
        }

        // 标记为自定义模型
        const customModel: ModelDefinition = {
          ...model,
          official: false
        };

        this.customModels.push(customModel);
        await this.saveCustomModels();

        await logger.info(`Custom model added: ${model.id}`, 'ModelRegistry');
      },
      'ModelRegistry',
      'addCustomModel',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 移除自定义模型
   */
  public async removeCustomModel(modelId: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const index = this.customModels.findIndex(m => m.id === modelId);
        if (index === -1) {
          throw new Error(`Custom model not found: ${modelId}`);
        }

        this.customModels.splice(index, 1);
        await this.saveCustomModels();

        await logger.info(`Custom model removed: ${modelId}`, 'ModelRegistry');
      },
      'ModelRegistry',
      'removeCustomModel',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 隐藏/显示模型
   */
  public async toggleModelVisibility(modelId: string, hidden: boolean): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const existingConfig = this.userConfigs.find(c => c.modelId === modelId);

        if (existingConfig) {
          existingConfig.hidden = hidden;
        } else {
          this.userConfigs.push({
            modelId,
            hidden
          });
        }

        await this.saveUserConfigs();
        await logger.info(`Model visibility toggled: ${modelId} -> ${hidden ? 'hidden' : 'visible'}`, 'ModelRegistry');
      },
      'ModelRegistry',
      'toggleModelVisibility',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 收藏/取消收藏模型
   */
  public async toggleModelFavorite(modelId: string, favorite: boolean): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const existingConfig = this.userConfigs.find(c => c.modelId === modelId);

        if (existingConfig) {
          existingConfig.favorite = favorite;
        } else {
          this.userConfigs.push({
            modelId,
            hidden: false,
            favorite
          });
        }

        await this.saveUserConfigs();
        await logger.info(`Model favorite toggled: ${modelId} -> ${favorite}`, 'ModelRegistry');
      },
      'ModelRegistry',
      'toggleModelFavorite',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 设置模型别名
   */
  public async setModelAlias(modelId: string, alias: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const existingConfig = this.userConfigs.find(c => c.modelId === modelId);

        if (existingConfig) {
          existingConfig.alias = alias;
        } else {
          this.userConfigs.push({
            modelId,
            hidden: false,
            alias
          });
        }

        await this.saveUserConfigs();
        await logger.info(`Model alias set: ${modelId} -> ${alias}`, 'ModelRegistry');
      },
      'ModelRegistry',
      'setModelAlias',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 获取用户对模型的配置
   */
  public async getUserConfig(modelId: string): Promise<UserModelConfig | null> {
    return this.userConfigs.find(c => c.modelId === modelId) || null;
  }

  /**
   * 按Provider获取模型列表
   */
  public async getModelsByProvider(providerId: string): Promise<ModelDefinition[]> {
    const allModels = [...this.models, ...this.customModels];
    return allModels.filter(m => m.provider === providerId);
  }

  /**
   * 按标签搜索模型
   */
  public async searchModelsByTag(tag: string): Promise<ModelDefinition[]> {
    const allModels = [...this.models, ...this.customModels];
    return allModels.filter(m => m.tags?.includes(tag));
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up ModelRegistry', 'ModelRegistry');
    // 保存配置
    await this.saveUserConfigs().catch(error => {
      logger.error('Failed to save user configs during cleanup', 'ModelRegistry', { error }).catch(() => {});
    });
    await logger.info('ModelRegistry cleaned up', 'ModelRegistry');
  }
}

// 导出单例实例
export const modelRegistry = new ModelRegistry();

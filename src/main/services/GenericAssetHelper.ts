/**
 * GenericAssetHelper - 通用资产助手
 *
 * Phase 7 H01.3: 替代硬编码的NovelVideoAssetHelper
 * 提供基于Schema的通用资产操作接口，不依赖具体业务类型
 *
 * 核心设计：
 * - 通过schemaId动态查询资产
 * - 使用泛型接口，类型安全
 * - 支持customFields的灵活查询和过滤
 */

import { AssetManagerClass } from './AssetManager';
import { SchemaRegistry } from './SchemaRegistry';
import { Logger } from './Logger';
import type { AssetMetadata, AssetFilter, AssetScope } from '../../shared/types/asset';

/**
 * 通用资产创建参数
 */
export interface GenericAssetCreateParams {
  /** Schema ID（如 'novel-video.chapter'） */
  schemaId: string;

  /** 项目ID */
  projectId: string;

  /** 资产作用域 */
  scope?: AssetScope;

  /** 资产分类 */
  category: string;

  /** 文件路径（如果资产对应一个文件） */
  filePath?: string;

  /** 标签 */
  tags?: string[];

  /** 自定义字段数据（将被验证是否符合Schema） */
  customFields: Record<string, any>;

  /** 其他元数据 */
  extraMetadata?: Partial<AssetMetadata>;
}

/**
 * 通用资产查询参数
 */
export interface GenericAssetQueryParams {
  /** Schema ID */
  schemaId: string;

  /** 项目ID */
  projectId: string;

  /** 资产作用域 */
  scope?: AssetScope;

  /** 资产分类 */
  category?: string;

  /** 标签过滤 */
  tags?: string[];

  /** customFields过滤条件（键值对，支持嵌套路径） */
  customFieldsFilter?: Record<string, any>;

  /** 排序字段 */
  sortBy?: string;

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';

  /** 分页 - 偏移量 */
  offset?: number;

  /** 分页 - 每页数量 */
  limit?: number;
}

/**
 * GenericAssetHelper类
 */
export class GenericAssetHelper {
  private assetManager: AssetManagerClass;
  private schemaRegistry: SchemaRegistry;
  private logger: Logger;

  constructor(assetManager: AssetManagerClass, schemaRegistry: SchemaRegistry) {
    this.assetManager = assetManager;
    this.schemaRegistry = schemaRegistry;
    this.logger = new Logger();
  }

  /**
   * 创建资产（基于Schema）
   * @param params 创建参数
   * @returns 创建的资产元数据
   */
  async createAsset(params: GenericAssetCreateParams): Promise<AssetMetadata> {
    try {
      await this.logger.info('创建通用资产', 'GenericAssetHelper', {
        schemaId: params.schemaId,
        category: params.category
      });

      // 验证Schema是否存在
      const schema = this.schemaRegistry.getSchema(params.schemaId);
      if (!schema) {
        throw new Error(`Schema不存在: ${params.schemaId}`);
      }

      // 验证customFields是否符合Schema
      const validationResult = this.schemaRegistry.validateData(
        params.schemaId,
        params.customFields
      );

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors
          ?.map(e => `${e.path}: ${e.message}`)
          .join(', ');
        throw new Error(`customFields验证失败: ${errorMessages}`);
      }

      // 如果提供了文件路径，导入资产
      if (params.filePath) {
        return await this.assetManager.importAsset({
          sourcePath: params.filePath,
          scope: params.scope || 'project',
          projectId: params.projectId,
          category: params.category,
          tags: params.tags || [],
          metadata: {
            ...params.extraMetadata,
            customFields: {
              [schema.pluginId]: params.customFields
            }
          }
        });
      }

      // 否则，抛出错误（需要文件路径）
      throw new Error('createAsset需要提供filePath参数');
    } catch (error) {
      await this.logger.error('创建通用资产失败', 'GenericAssetHelper', { params, error });
      throw error;
    }
  }

  /**
   * 查询资产（基于Schema和customFields过滤）
   * @param params 查询参数
   * @returns 符合条件的资产列表
   */
  async queryAssets(params: GenericAssetQueryParams): Promise<AssetMetadata[]> {
    try {
      await this.logger.debug('查询通用资产', 'GenericAssetHelper', {
        schemaId: params.schemaId,
        category: params.category
      });

      // 验证Schema是否存在
      const schema = this.schemaRegistry.getSchema(params.schemaId);
      if (!schema) {
        throw new Error(`Schema不存在: ${params.schemaId}`);
      }

      // 构建AssetManager查询过滤器
      const filter: AssetFilter = {
        scope: params.scope || 'project',
        projectId: params.projectId,
        category: params.category,
        tags: params.tags
      };

      // 查询所有符合基础条件的资产
      const result = await this.assetManager.scanAssets(filter);
      let assets = result.assets;

      // 应用customFields过滤
      if (params.customFieldsFilter) {
        assets = this.filterByCustomFields(
          assets,
          schema.pluginId,
          params.customFieldsFilter
        );
      }

      // 排序
      if (params.sortBy) {
        assets = this.sortAssets(assets, schema.pluginId, params.sortBy, params.sortOrder);
      }

      // 分页
      if (params.offset !== undefined || params.limit !== undefined) {
        const offset = params.offset || 0;
        const limit = params.limit || assets.length;
        assets = assets.slice(offset, offset + limit);
      }

      await this.logger.debug('查询完成', 'GenericAssetHelper', {
        schemaId: params.schemaId,
        count: assets.length
      });

      return assets;
    } catch (error) {
      await this.logger.error('查询通用资产失败', 'GenericAssetHelper', { params, error });
      throw error;
    }
  }

  /**
   * 获取单个资产（通过ID）
   * @param filePath 资产文件路径
   * @returns 资产元数据，如果不存在返回null
   */
  async getAsset(filePath: string): Promise<AssetMetadata | null> {
    try {
      return await this.assetManager.getMetadata(filePath);
    } catch (error) {
      await this.logger.error('获取资产失败', 'GenericAssetHelper', { filePath, error });
      return null;
    }
  }

  /**
   * 更新资产的customFields
   * @param filePath 资产文件路径
   * @param schemaId Schema ID
   * @param customFields 新的customFields数据
   */
  async updateAssetCustomFields(
    filePath: string,
    schemaId: string,
    customFields: Record<string, any>
  ): Promise<void> {
    try {
      // 验证Schema
      const schema = this.schemaRegistry.getSchema(schemaId);
      if (!schema) {
        throw new Error(`Schema不存在: ${schemaId}`);
      }

      // 验证customFields
      const validationResult = this.schemaRegistry.validateData(schemaId, customFields);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors
          ?.map(e => `${e.path}: ${e.message}`)
          .join(', ');
        throw new Error(`customFields验证失败: ${errorMessages}`);
      }

      // 获取现有元数据
      const metadata = await this.assetManager.getMetadata(filePath);
      if (!metadata) {
        throw new Error('资产不存在');
      }

      // 更新customFields
      await this.assetManager.updateMetadata(filePath, {
        customFields: {
          ...(metadata.customFields || {}),
          [schema.pluginId]: {
            ...(metadata.customFields?.[schema.pluginId] || {}),
            ...customFields
          }
        }
      });

      await this.logger.info('更新资产customFields成功', 'GenericAssetHelper', {
        filePath,
        schemaId
      });
    } catch (error) {
      await this.logger.error('更新资产customFields失败', 'GenericAssetHelper', {
        filePath,
        schemaId,
        error
      });
      throw error;
    }
  }

  /**
   * 删除资产
   * @param filePath 资产文件路径
   */
  async deleteAsset(filePath: string): Promise<void> {
    try {
      await this.assetManager.deleteAsset(filePath);
      await this.logger.info('删除资产成功', 'GenericAssetHelper', { filePath });
    } catch (error) {
      await this.logger.error('删除资产失败', 'GenericAssetHelper', { filePath, error });
      throw error;
    }
  }

  // ========================================
  // 私有辅助方法
  // ========================================

  /**
   * 根据customFields过滤资产
   */
  private filterByCustomFields(
    assets: AssetMetadata[],
    pluginId: string,
    filter: Record<string, any>
  ): AssetMetadata[] {
    return assets.filter(asset => {
      const customFields = asset.customFields?.[pluginId];
      if (!customFields) return false;

      // 检查每个过滤条件
      for (const [key, value] of Object.entries(filter)) {
        const actualValue = this.getNestedValue(customFields, key);

        // 严格相等比较
        if (actualValue !== value) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 排序资产
   */
  private sortAssets(
    assets: AssetMetadata[],
    pluginId: string,
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): AssetMetadata[] {
    return assets.sort((a, b) => {
      const aValue = this.getNestedValue(a.customFields?.[pluginId], sortBy);
      const bValue = this.getNestedValue(b.customFields?.[pluginId], sortBy);

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 获取嵌套对象的值
   * 支持路径如 'a.b.c'
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

/**
 * 资产管理器实现
 * 
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 * 
 * 参考：docs/06-core-services-design-v1.0.1.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { timeService } from './TimeService';
import {
  AssetManager as IAssetManager,
  AssetConfig,
  AssetScope,
  AssetType,
  AssetSearchQuery,
  ServiceError,
  LogEntry
} from '../../common/types';

/**
 * 资产管理器实现类
 */
export class AssetManager implements IAssetManager {
  private projectAssets: Map<string, Map<string, AssetConfig>> = new Map(); // projectId -> assetId -> AssetConfig
  private globalAssets: Map<string, AssetConfig> = new Map(); // assetId -> AssetConfig
  private projectsPath: string;
  private globalAssetsPath: string;
  private isInitialized = false;

  constructor() {
    // 设置存储路径
    this.projectsPath = path.join(process.cwd(), 'projects');
    this.globalAssetsPath = path.join(process.cwd(), 'global-assets');
  }

  /**
   * 初始化资产管理器
   */
  public async initialize(): Promise<void> {
    try {
      // 确保目录存在
      await fs.mkdir(this.projectsPath, { recursive: true });
      await fs.mkdir(this.globalAssetsPath, { recursive: true });
      
      // 加载现有资产
      await this.loadAllAssets();
      
      this.isInitialized = true;
      this.log('info', '资产管理器初始化完成');
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_MANAGER_INIT_FAILED',
        message: `资产管理器初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'initialize'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 清理资产管理器
   */
  public async cleanup(): Promise<void> {
    try {
      // 保存所有资产
      await this.saveAllAssets();
      
      this.projectAssets.clear();
      this.globalAssets.clear();
      this.isInitialized = false;
      this.log('info', '资产管理器清理完成');
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_MANAGER_CLEANUP_FAILED',
        message: `资产管理器清理失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'cleanup'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 添加资产
   */
  public async addAsset(
    target: { scope: AssetScope; id: string },
    assetData: Partial<AssetConfig>
  ): Promise<AssetConfig> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: addAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      const assetId = assetData.id || uuidv4();
      const currentTime = await timeService.getCurrentTime();
      
      const assetConfig: AssetConfig = {
        id: assetId,
        scope: target.scope,
        type: assetData.type || AssetType.TEXT,
        path: assetData.path || '',
        metadata: assetData.metadata || {},
        aiAttributes: assetData.aiAttributes,
        tags: assetData.tags || [],
        createdAt: currentTime,
        updatedAt: currentTime,
        ...assetData
      };

      // 保存到文件系统
      await this.saveAssetConfig(target.scope, target.id, assetConfig);
      
      // 添加到内存
      if (target.scope === AssetScope.PROJECT) {
        if (!this.projectAssets.has(target.id)) {
          this.projectAssets.set(target.id, new Map());
        }
        this.projectAssets.get(target.id)!.set(assetId, assetConfig);
      } else {
        this.globalAssets.set(assetId, assetConfig);
      }
      
      this.log('info', `资产添加成功: ${assetId} (${target.scope}:${target.id})`);
      return assetConfig;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_ADD_FAILED',
        message: `添加资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'addAsset'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 获取资产
   */
  public async getAsset(scope: AssetScope, containerId: string, assetId: string): Promise<AssetConfig> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: getAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      // 检查内存中是否已存在
      if (scope === AssetScope.PROJECT) {
        const projectAssets = this.projectAssets.get(containerId);
        if (projectAssets && projectAssets.has(assetId)) {
          return projectAssets.get(assetId)!;
        }
      } else {
        if (this.globalAssets.has(assetId)) {
          return this.globalAssets.get(assetId)!;
        }
      }

      // 从文件加载
      const assetConfig = await this.loadAssetConfig(scope, containerId, assetId);
      
      // 添加到内存
      if (scope === AssetScope.PROJECT) {
        if (!this.projectAssets.has(containerId)) {
          this.projectAssets.set(containerId, new Map());
        }
        this.projectAssets.get(containerId)!.set(assetId, assetConfig);
      } else {
        this.globalAssets.set(assetId, assetConfig);
      }
      
      this.log('info', `资产获取成功: ${assetId} (${scope}:${containerId})`);
      return assetConfig;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_GET_FAILED',
        message: `获取资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'getAsset'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 提升项目资产为全局资产
   */
  public async promoteAssetToGlobal(projectId: string, assetId: string, category: string): Promise<AssetConfig> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: promoteAssetToGlobal');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      // 获取项目资产
      const projectAsset = await this.getAsset(AssetScope.PROJECT, projectId, assetId);
      
      // 创建全局资产副本
      const globalAsset: AssetConfig = {
        ...projectAsset,
        scope: AssetScope.GLOBAL,
        updatedAt: await timeService.getCurrentTime()
      };
      
      // 保存到全局资产
      await this.saveAssetConfig(AssetScope.GLOBAL, category, globalAsset);
      
      // 添加到内存
      this.globalAssets.set(assetId, globalAsset);
      
      // 创建提升记录
      const promotionPath = path.join(this.globalAssetsPath, 'promotions', `${assetId}.json`);
      await fs.mkdir(path.dirname(promotionPath), { recursive: true });
      await fs.writeFile(promotionPath, JSON.stringify({
        assetId,
        projectId,
        category,
        promotedAt: globalAsset.updatedAt.toISOString()
      }), 'utf-8');
      
      this.log('info', `资产提升成功: ${assetId} (${projectId} -> global:${category})`);
      return globalAsset;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_PROMOTE_FAILED',
        message: `提升资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'promoteAssetToGlobal'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 移除资产
   */
  public async removeAsset(scope: AssetScope, containerId: string, assetId: string): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: removeAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      const asset = await this.getAsset(scope, containerId, assetId);
      
      // 删除文件
      await fs.rm(asset.path, { recursive: true, force: true });
      
      // 从内存中移除
      if (scope === AssetScope.PROJECT) {
        const projectAssets = this.projectAssets.get(containerId);
        if (projectAssets) {
          projectAssets.delete(assetId);
        }
      } else {
        this.globalAssets.delete(assetId);
      }
      
      this.log('info', `资产删除成功: ${assetId} (${scope}:${containerId})`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_REMOVE_FAILED',
        message: `删除资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'removeAsset'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 更新资产
   */
  public async updateAsset(scope: AssetScope, containerId: string, assetId: string, updates: Partial<AssetConfig>): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: updateAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      const asset = await this.getAsset(scope, containerId, assetId);
      
      // 更新资产
      const updatedAsset: AssetConfig = {
        ...asset,
        ...updates,
        updatedAt: await timeService.getCurrentTime()
      };
      
      // 保存到文件系统
      await this.saveAssetConfig(scope, containerId, updatedAsset);
      
      // 更新内存
      if (scope === AssetScope.PROJECT) {
        const projectAssets = this.projectAssets.get(containerId);
        if (projectAssets) {
          projectAssets.set(assetId, updatedAsset);
        }
      } else {
        this.globalAssets.set(assetId, updatedAsset);
      }
      
      this.log('info', `资产更新成功: ${assetId} (${scope}:${containerId})`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_UPDATE_FAILED',
        message: `更新资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'updateAsset'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 搜索资产
   */
  public async searchAssets(scope: AssetScope, containerId: string, query: AssetSearchQuery): Promise<AssetConfig[]> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: searchAssets');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      let allAssets: AssetConfig[] = [];
      
      if (scope === AssetScope.PROJECT) {
        const projectAssets = this.projectAssets.get(containerId);
        if (projectAssets) {
          allAssets = Array.from(projectAssets.values());
        }
      } else {
        allAssets = Array.from(this.globalAssets.values());
      }
      
      // 应用搜索过滤
      let filteredAssets = allAssets;
      
      if (query.type) {
        filteredAssets = filteredAssets.filter(asset => asset.type === query.type);
      }
      
      if (query.tags && query.tags.length > 0) {
        filteredAssets = filteredAssets.filter(asset => 
          query.tags!.some(tag => asset.tags.includes(tag))
        );
      }
      
      if (query.text) {
        const searchText = query.text.toLowerCase();
        filteredAssets = filteredAssets.filter(asset => 
          asset.path.toLowerCase().includes(searchText) ||
          asset.tags.some(tag => tag.toLowerCase().includes(searchText))
        );
      }
      
      if (query.dateRange) {
        filteredAssets = filteredAssets.filter(asset => 
          asset.createdAt >= query.dateRange!.start &&
          asset.createdAt <= query.dateRange!.end
        );
      }
      
      // 应用分页
      const offset = query.offset || 0;
      const limit = query.limit || filteredAssets.length;
      const paginatedAssets = filteredAssets.slice(offset, offset + limit);
      
      this.log('info', `资产搜索完成: ${scope}:${containerId}, 结果数量: ${paginatedAssets.length}`);
      return paginatedAssets;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_SEARCH_FAILED',
        message: `搜索资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'searchAssets'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 获取资产预览
   */
  public async getAssetPreview(scope: AssetScope, containerId: string, assetId: string): Promise<string> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: getAssetPreview');
      }
    }

    if (!this.isInitialized) {
      throw new Error('资产管理器未初始化');
    }

    try {
      const asset = await this.getAsset(scope, containerId, assetId);
      
      // 根据资产类型生成预览
      let previewPath: string;
      
      switch (asset.type) {
        case AssetType.IMAGE:
          previewPath = asset.path.replace(/(\.[^.]+)$/, '_preview$1');
          break;
        case AssetType.VIDEO:
          previewPath = asset.path.replace(/(\.[^.]+)$/, '_preview.jpg');
          break;
        case AssetType.AUDIO:
          previewPath = asset.path.replace(/(\.[^.]+)$/, '_preview.jpg');
          break;
        default:
          previewPath = asset.path;
      }
      
      // 检查预览文件是否存在
      try {
        await fs.access(previewPath);
        return previewPath;
      } catch {
        // 预览文件不存在，返回原文件
        return asset.path;
      }
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'ASSET_PREVIEW_FAILED',
        message: `获取资产预览失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'AssetManager',
        operation: 'getAssetPreview'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 加载所有资产
   * @private
   */
  private async loadAllAssets(): Promise<void> {
    try {
      // 加载项目资产
      const projectDirs = await fs.readdir(this.projectsPath, { withFileTypes: true });
      
      for (const dir of projectDirs) {
        if (dir.isDirectory()) {
          try {
            const assetsPath = path.join(this.projectsPath, dir.name, 'assets');
            const assetFiles = await fs.readdir(assetsPath);
            
            if (!this.projectAssets.has(dir.name)) {
              this.projectAssets.set(dir.name, new Map());
            }
            
            for (const file of assetFiles) {
              if (file.endsWith('.json')) {
                try {
                  const assetData = JSON.parse(
                    await fs.readFile(path.join(assetsPath, file), 'utf-8')
                  );
                  const assetConfig: AssetConfig = {
                    ...assetData,
                    createdAt: new Date(assetData.createdAt),
                    updatedAt: new Date(assetData.updatedAt)
                  };
                  this.projectAssets.get(dir.name)!.set(assetConfig.id, assetConfig);
                } catch (error) {
                  this.log('warn', `跳过无效资产文件: ${file}, 错误: ${error}`);
                }
              }
            }
          } catch (error) {
            this.log('warn', `加载项目资产失败: ${dir.name}, 错误: ${error}`);
          }
        }
      }
      
      // 加载全局资产
      try {
        const assetFiles = await fs.readdir(this.globalAssetsPath);
        
        for (const file of assetFiles) {
          if (file.endsWith('.json')) {
            try {
              const assetData = JSON.parse(
                await fs.readFile(path.join(this.globalAssetsPath, file), 'utf-8')
              );
              const assetConfig: AssetConfig = {
                ...assetData,
                createdAt: new Date(assetData.createdAt),
                updatedAt: new Date(assetData.updatedAt)
              };
              this.globalAssets.set(assetConfig.id, assetConfig);
            } catch (error) {
              this.log('warn', `跳过无效全局资产文件: ${file}, 错误: ${error}`);
            }
          }
        }
      } catch (error) {
        this.log('warn', `加载全局资产失败: ${error}`);
      }
    } catch (error) {
      this.log('error', `加载资产失败: ${error}`);
    }
  }

  /**
   * 保存所有资产
   * @private
   */
  private async saveAllAssets(): Promise<void> {
    try {
      // 保存项目资产
      for (const [projectId, assets] of this.projectAssets.entries()) {
        const assetsPath = path.join(this.projectsPath, projectId, 'assets');
        await fs.mkdir(assetsPath, { recursive: true });
        
        const savePromises = Array.from(assets.values()).map(
          asset => this.saveAssetConfig(AssetScope.PROJECT, projectId, asset)
        );
        await Promise.all(savePromises);
      }
      
      // 保存全局资产
      const savePromises = Array.from(this.globalAssets.values()).map(
        asset => this.saveAssetConfig(AssetScope.GLOBAL, 'global', asset)
      );
      await Promise.all(savePromises);
    } catch (error) {
      this.log('error', `批量保存资产失败: ${error}`);
    }
  }

  /**
   * 保存资产配置
   * @private
   */
  private async saveAssetConfig(scope: AssetScope, containerId: string, config: AssetConfig): Promise<void> {
    let configPath: string;
    
    if (scope === AssetScope.PROJECT) {
      configPath = path.join(this.projectsPath, containerId, 'assets', `${config.id}.json`);
    } else {
      configPath = path.join(this.globalAssetsPath, `${config.id}.json`);
    }
    
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * 加载资产配置
   * @private
   */
  private async loadAssetConfig(scope: AssetScope, containerId: string, assetId: string): Promise<AssetConfig> {
    let configPath: string;
    
    if (scope === AssetScope.PROJECT) {
      configPath = path.join(this.projectsPath, containerId, 'assets', `${assetId}.json`);
    } else {
      configPath = path.join(this.globalAssetsPath, `${assetId}.json`);
    }
    
    const configData = await fs.readFile(configPath, 'utf-8');
    const assetConfig: AssetConfig = JSON.parse(configData);
    
    // 转换日期字符串为Date对象
    assetConfig.createdAt = new Date(assetConfig.createdAt);
    assetConfig.updatedAt = new Date(assetConfig.updatedAt);
    
    return assetConfig;
  }

  /**
   * 记录日志
   * @private
   */
  private log(level: LogEntry['level'], message: string, data?: any): void {
    // eslint-disable-next-line no-console
    console.log(`[AssetManager] ${level.toUpperCase()}: ${message}`, data || '');
  }
}

// 导出单例实例
export const assetManager = new AssetManager();
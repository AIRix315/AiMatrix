/**
 * 资产管理器（重构版）
 *
 * 核心功能：
 * - JSON索引系统：快速查询和统计
 * - 文件监听：自动检测文件变化并更新索引
 * - 分页查询：支持大量资产的高效加载
 * - 元数据管理：Sidecar JSON文件存储元数据
 * - 导入/删除：支持级联删除
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { watch, FSWatcher } from 'chokidar';
import { v4 as uuidv4 } from 'uuid';
import { BrowserWindow } from 'electron';
import { FileSystemService } from './FileSystemService';
import { Logger } from './Logger';
import { timeService } from './TimeService';
import {
  AssetMetadata,
  AssetType,
  AssetScope,
  AssetFilter,
  AssetScanResult,
  AssetIndex,
  AssetCategory,
  AssetImportParams,
  AssetFileChangeEvent,
  AspectRatio
} from '../../shared/types/asset';

/**
 * 资产管理器类（新实现）
 */
export class AssetManagerClass {
  private fsService: FileSystemService;
  private logger: Logger;
  private watchers: Map<string, FSWatcher> = new Map();
  private indexCache: Map<string, AssetIndex> = new Map();
  private isInitialized = false;
  private configManager?: any; // ConfigManager 实例（避免循环依赖）
  private currentWorkspacePath?: string;

  constructor(fsService: FileSystemService) {
    this.fsService = fsService;
    this.logger = new Logger();
  }

  /**
   * 设置 ConfigManager 并监听配置变更
   */
  setConfigManager(configManager: any): void {
    this.configManager = configManager;

    // 获取当前工作区路径
    const config = configManager.getConfig();
    this.currentWorkspacePath = config.general.workspacePath;

    // 监听配置变更
    configManager.onConfigChange((newConfig: any) => {
      const newWorkspacePath = newConfig.general.workspacePath;

      // 如果工作区路径发生变化，重新扫描资源
      if (newWorkspacePath !== this.currentWorkspacePath) {
        this.logger.info('资源库路径变更，开始重新扫描...', 'AssetManager', {
          oldPath: this.currentWorkspacePath,
          newPath: newWorkspacePath
        }).catch(() => {});

        this.currentWorkspacePath = newWorkspacePath;

        // 清空全局资产索引缓存
        this.indexCache.delete('global');

        // 重新构建全局索引
        this.buildIndex().then(() => {
          this.logger.info('资源库重新扫描完成', 'AssetManager').catch(() => {});
        }).catch((error) => {
          this.logger.error('资源库重新扫描失败', 'AssetManager', { error }).catch(() => {});
        });
      }
    });
  }

  /**
   * 初始化资产管理器
   */
  async initialize(): Promise<void> {
    try {
      await this.logger.info('初始化资产管理器', 'AssetManager');

      // 确保FileSystemService已初始化
      // 这里假设fsService在传入时已初始化

      // 确保资产目录存在
      await this.fsService.ensureDir(this.fsService.getGlobalAssetDir());

      // 初始化全局资产的分类目录
      const assetTypes: AssetType[] = ['image', 'video', 'audio', 'text', 'other'];
      for (const type of assetTypes) {
        await this.fsService.ensureDir(this.fsService.getGlobalAssetDir(type));
      }

      this.isInitialized = true;
      await this.logger.info('资产管理器初始化完成', 'AssetManager');
    } catch (error) {
      await this.logger.error('资产管理器初始化失败', 'AssetManager', { error });
      throw error;
    }
  }

  /**
   * 清理资产管理器
   */
  async cleanup(): Promise<void> {
    try {
      await this.logger.info('清理资产管理器', 'AssetManager');

      // 停止所有文件监听
      for (const [key, watcher] of this.watchers.entries()) {
        await watcher.close();
        await this.logger.debug('停止文件监听', 'AssetManager', { key });
      }

      this.watchers.clear();
      this.indexCache.clear();
      this.isInitialized = false;

      await this.logger.info('资产管理器清理完成', 'AssetManager');
    } catch (error) {
      await this.logger.error('资产管理器清理失败', 'AssetManager', { error });
      throw error;
    }
  }

  // ========================================
  // 索引管理
  // ========================================

  /**
   * 构建资产索引
   * @param projectId 可选的项目ID（不提供则构建全局索引）
   */
  async buildIndex(projectId?: string): Promise<AssetIndex> {
    try {
      await this.logger.info('开始构建资产索引: ' + JSON.stringify({ projectId: projectId || 'global' }), 'AssetManager');

      const indexPath = this.fsService.getAssetIndexPath(projectId);
      const baseDir = projectId
        ? this.fsService.getProjectAssetDir(projectId)
        : this.fsService.getGlobalAssetDir();

      // 确保基础目录存在
      await this.fsService.ensureDir(baseDir);

      // 初始化索引结构
      const currentTime = await timeService.getCurrentTime();
      const index: AssetIndex = {
        projectId,
        version: '1.0',
        lastUpdated: currentTime.toISOString(),
        statistics: {
          total: 0,
          byType: {},
          byCategory: {}
        },
        categories: []
      };

      // 如果是项目索引，读取项目名称
      if (projectId) {
        const projectJsonPath = path.join(
          path.dirname(baseDir),
          'project.json'
        );
        const projectData = await this.fsService.readJSON<{ name: string }>(projectJsonPath);
        if (projectData) {
          index.projectName = projectData.name;
        }
      }

      // 扫描所有子目录
      const entries = await this.fsService.readDirWithFileTypes(baseDir);

      for (const entry of entries) {
        if (!entry.isDirectory) continue;

        const categoryName = entry.name;
        const categoryPath = path.join(baseDir, categoryName);

        // 跳过特殊目录
        if (categoryName === 'index.json' || categoryName.startsWith('.')) {
          continue;
        }

        // 扫描该分类下的文件
        const files = await this.scanDirectory(
          categoryPath,
          projectId ? 'project' : 'global',
          projectId,
          categoryName
        );

        if (files.length > 0) {
          // 统计分类信息
          const category: AssetCategory = {
            name: categoryName,
            count: files.length,
            items: files.map(f => f.name)
          };

          // 检测分类的主要类型
          const typeCount: Partial<Record<AssetType, number>> = {};
          files.forEach(file => {
            typeCount[file.type] = (typeCount[file.type] || 0) + 1;
          });
          const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
          if (dominantType) {
            category.type = dominantType[0] as AssetType;
          }

          index.categories.push(category);

          // 更新统计信息
          index.statistics.total += files.length;
          index.statistics.byCategory = index.statistics.byCategory || {};
          index.statistics.byCategory[categoryName] = files.length;

          // 按类型统计
          files.forEach(file => {
            index.statistics.byType[file.type] =
              (index.statistics.byType[file.type] || 0) + 1;
          });
        }
      }

      // 保存索引到文件
      await this.fsService.saveJSON(indexPath, index);

      // 缓存索引
      const cacheKey = projectId || 'global';
      this.indexCache.set(cacheKey, index);

      await this.logger.info('资产索引构建完成', 'AssetManager', {
        projectId: projectId || 'global',
        total: index.statistics.total,
        categories: index.categories.length
      });

      return index;
    } catch (error) {
      await this.logger.error('构建资产索引失败: ' + JSON.stringify({ projectId, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 获取资产索引
   * @param projectId 可选的项目ID
   */
  async getIndex(projectId?: string): Promise<AssetIndex> {
    try {
      const cacheKey = projectId || 'global';

      // 尝试从缓存获取
      if (this.indexCache.has(cacheKey)) {
        return this.indexCache.get(cacheKey)!;
      }

      // 尝试从文件读取
      const indexPath = this.fsService.getAssetIndexPath(projectId);
      const index = await this.fsService.readJSON<AssetIndex>(indexPath);

      if (index) {
        this.indexCache.set(cacheKey, index);
        return index;
      }

      // 索引不存在，构建新索引
      await this.logger.info('索引不存在，开始构建: ' + JSON.stringify({ projectId: cacheKey }), 'AssetManager');
      return await this.buildIndex(projectId);
    } catch (error) {
      await this.logger.error('获取资产索引失败: ' + JSON.stringify({ projectId, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 更新资产索引
   * @param projectId 可选的项目ID
   */
  async updateIndex(projectId?: string): Promise<void> {
    try {
      await this.logger.debug('更新资产索引: ' + JSON.stringify({ projectId: projectId || 'global' }), 'AssetManager');
      await this.buildIndex(projectId);
    } catch (error) {
      await this.logger.error('更新资产索引失败: ' + JSON.stringify({ projectId, error }), 'AssetManager');
      // 不抛出错误，允许继续运行
    }
  }

  // ========================================
  // 扫描和查询
  // ========================================

  /**
   * 扫描资产（分页）
   * @param filter 过滤条件
   */
  async scanAssets(filter: AssetFilter): Promise<AssetScanResult> {
    try {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        scope: _scope = 'all', // 解构但当前未使用，保留供未来使用
        projectId,
        category,
        type,
        tags,
        status,
        search,
        sortBy = 'modifiedAt',
        sortOrder = 'desc',
        page = 1,
        pageSize = 100
      } = filter;
      /* eslint-enable @typescript-eslint/no-unused-vars */

      await this.logger.debug('扫描资产: ' + JSON.stringify({ filter }), 'AssetManager');

      // 读取索引
      const index = await this.getIndex(projectId);

      // 筛选分类
      let targetCategories = index.categories;
      if (category) {
        const categoryArray = Array.isArray(category) ? category : [category];
        targetCategories = targetCategories.filter(c =>
          categoryArray.includes(c.name)
        );
      }

      // 加载资产元数据（分页）
      const allAssets: AssetMetadata[] = [];
      const errors: Array<{ path: string; error: string }> = [];

      const baseDir = projectId
        ? this.fsService.getProjectAssetDir(projectId)
        : this.fsService.getGlobalAssetDir();

      for (const cat of targetCategories) {
        const categoryPath = path.join(baseDir, cat.name);
        const items = cat.items || [];

        for (const fileName of items) {
          try {
            const filePath = path.join(categoryPath, fileName);
            const metadata = await this.getMetadata(filePath);

            if (metadata) {
              // 应用过滤器
              let match = true;

              if (type) {
                const typeArray = Array.isArray(type) ? type : [type];
                match = match && typeArray.includes(metadata.type);
              }

              if (tags && tags.length > 0) {
                match = match && tags.some(tag => metadata.tags.includes(tag));
              }

              if (status) {
                match = match && metadata.status === status;
              }

              if (search) {
                const searchLower = search.toLowerCase();
                match = match && (
                  metadata.name.toLowerCase().includes(searchLower) ||
                  metadata.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
                  (metadata.description?.toLowerCase().includes(searchLower) || false)
                );
              }

              if (match) {
                allAssets.push(metadata);
              }
            }
          } catch (error) {
            errors.push({
              path: fileName,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      // 排序
      allAssets.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'modifiedAt':
            aValue = new Date(a.modifiedAt);
            bValue = new Date(b.modifiedAt);
            break;
          case 'size':
            aValue = a.size;
            bValue = b.size;
            break;
          default:
            return 0;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });

      // 分页
      const total = allAssets.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, total);
      const paginatedAssets = allAssets.slice(startIndex, endIndex);

      return {
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
        assets: paginatedAssets,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      await this.logger.error('扫描资产失败: ' + JSON.stringify({ filter, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 扫描目录中的资产
   * @private
   */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  private async scanDirectory(
    dirPath: string,
    _scope: AssetScope, // 参数保留供未来使用
    _projectId?: string, // 参数保留供未来使用
    _category?: string // 参数保留供未来使用
  ): Promise<AssetMetadata[]> {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const assets: AssetMetadata[] = [];

    try {
      const files = await this.fsService.readDir(dirPath);

      for (const file of files) {
        // 跳过元数据文件和隐藏文件
        if (this.shouldIgnoreFile(file)) {
          continue;
        }

        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          try {
            const metadata = await this.getMetadata(filePath);
            if (metadata) {
              assets.push(metadata);
            }
          } catch (error) {
            await this.logger.warn('读取资产元数据失败: ' + JSON.stringify({ filePath, error }), 'AssetManager');
          }
        }
      }
    } catch (error) {
      await this.logger.error('扫描目录失败: ' + JSON.stringify({ dirPath, error }), 'AssetManager');
    }

    return assets;
  }

  // ========================================
  // 元数据管理
  // ========================================

  /**
   * 获取资产元数据
   * @param filePath 文件路径
   */
  async getMetadata(filePath: string): Promise<AssetMetadata | null> {
    try {
      const normalizedPath = this.fsService.normalizePath(filePath);
      const metadataPath = this.fsService.getAssetMetadataPath(normalizedPath);

      // 尝试读取Sidecar元数据文件
      const metadata = await this.fsService.readJSON<AssetMetadata>(metadataPath);

      if (metadata) {
        return metadata;
      }

      // 元数据不存在，创建默认元数据
      await this.logger.debug('元数据不存在，创建默认元数据: ' + JSON.stringify({ filePath: normalizedPath }), 'AssetManager');

      // 根据文件路径推断作用域和项目ID
      const scope = normalizedPath.includes('/projects/') ? 'project' : 'global';
      let projectId: string | undefined;
      let category: string | undefined;

      if (scope === 'project') {
        const match = normalizedPath.match(/\/projects\/([^/]+)\//);
        if (match) {
          projectId = match[1];
        }

        const assetMatch = normalizedPath.match(/\/assets\/([^/]+)\//);
        if (assetMatch) {
          category = assetMatch[1];
        }
      } else {
        const globalMatch = normalizedPath.match(/\/assets\/([^/]+)\//);
        if (globalMatch) {
          category = globalMatch[1];
        }
      }

      return await this.createDefaultMetadata(
        normalizedPath,
        scope,
        projectId,
        category,
        undefined
      );
    } catch (error) {
      await this.logger.error('获取资产元数据失败: ' + JSON.stringify({ filePath, error }), 'AssetManager');
      return null;
    }
  }

  /**
   * 更新资产元数据
   * @param filePath 文件路径
   * @param updates 要更新的字段
   */
  async updateMetadata(
    filePath: string,
    updates: Partial<AssetMetadata>
  ): Promise<AssetMetadata> {
    try {
      const normalizedPath = this.fsService.normalizePath(filePath);
      const currentMetadata = await this.getMetadata(normalizedPath);

      if (!currentMetadata) {
        throw new Error(`资产不存在: ${normalizedPath}`);
      }

      // 合并更新
      const currentTime = await timeService.getCurrentTime();
      const updatedMetadata: AssetMetadata = {
        ...currentMetadata,
        ...updates,
        modifiedAt: currentTime.toISOString()
      };

      // 保存更新后的元数据
      const metadataPath = this.fsService.getAssetMetadataPath(normalizedPath);
      await this.fsService.saveJSON(metadataPath, updatedMetadata);

      await this.logger.info('资产元数据更新成功: ' + JSON.stringify({ filePath: normalizedPath }), 'AssetManager');

      // 触发索引更新
      await this.updateIndex(updatedMetadata.projectId);

      return updatedMetadata;
    } catch (error) {
      await this.logger.error('更新资产元数据失败: ' + JSON.stringify({ filePath, updates, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 创建默认元数据
   * @private
   */
  private async createDefaultMetadata(
    filePath: string,
    scope: AssetScope,
    projectId?: string,
    category?: string,
    isUserUploaded?: boolean
  ): Promise<AssetMetadata> {
    const fileName = path.basename(filePath);
    const fileInfo = await this.fsService.getFileInfo(filePath);
    const assetType = this.detectAssetType(filePath);
    const currentTime = await timeService.getCurrentTime();

    const metadata: AssetMetadata = {
      id: uuidv4(),
      name: fileName,
      filePath,
      type: assetType,
      category,
      scope,
      createdAt: fileInfo.createdAt,
      modifiedAt: fileInfo.modifiedAt,
      importedAt: currentTime.toISOString(),
      size: fileInfo.size,
      mimeType: fileInfo.mimeType,
      extension: fileInfo.extension,
      projectId,
      isUserUploaded,
      tags: [],
      status: 'none'
    };

    // 保存元数据
    const metadataPath = this.fsService.getAssetMetadataPath(filePath);
    await this.fsService.saveJSON(metadataPath, metadata);

    return metadata;
  }

  async getAssetReferences(assetId: string): Promise<string[]> {
    try {
      await this.logger.debug(`获取资产引用关系: ${assetId}`, 'AssetManager');
      return [];
    } catch (error) {
      await this.logger.error(`获取资产引用失败: ${assetId}`, 'AssetManager', { error });
      throw error;
    }
  }

  // ========================================
  // 导入和删除
  // ========================================

  /**
   * 导入资产
   * @param params 导入参数
   */
  async importAsset(params: AssetImportParams): Promise<AssetMetadata> {
    try {
      const {
        sourcePath,
        scope,
        projectId,
        category,
        type,
        tags = [],
        metadata: extraMetadata = {}
      } = params;

      await this.logger.info('开始导入资产: ' + JSON.stringify({ sourcePath, scope, projectId, category }), 'AssetManager');

      // 检查源文件是否存在
      if (!(await this.fsService.exists(sourcePath))) {
        throw new Error(`源文件不存在: ${sourcePath}`);
      }

      // 检测或验证资产类型
      const assetType = type || this.detectAssetType(sourcePath);

      // 确定目标目录
      let targetDir: string;
      if (scope === 'project') {
        if (!projectId) {
          throw new Error('项目作用域必须提供projectId');
        }
        targetDir = this.fsService.getProjectAssetDir(
          projectId,
          category || (assetType === 'image' ? 'images' : assetType + 's')
        );
      } else {
        // 全局资产：优先使用 category，否则使用 assetType 目录
        if (category) {
          targetDir = path.join(this.fsService.getGlobalAssetDir(), category);
        } else {
          targetDir = this.fsService.getGlobalAssetDir(assetType);
        }
      }

      // 确保目标目录存在
      await this.fsService.ensureDir(targetDir);

      // 复制文件到目标目录
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(targetDir, fileName);

      // 检查目标文件是否已存在
      if (await this.fsService.exists(targetPath)) {
        // 生成新文件名（添加时间戳）
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        const timestamp = Date.now();
        const newFileName = `${nameWithoutExt}_${timestamp}${ext}`;
        const newTargetPath = path.join(targetDir, newFileName);

        await this.fsService.copyFile(sourcePath, newTargetPath);
        await this.logger.info(`文件已存在，使用新文件名: ${fileName} -> ${newFileName}`, 'AssetManager');

        // 使用新路径创建元数据
        return await this.createImportedMetadata(
          newTargetPath,
          scope,
          projectId,
          category,
          assetType,
          tags,
          extraMetadata
        );
      } else {
        await this.fsService.copyFile(sourcePath, targetPath);

        // 创建元数据
        return await this.createImportedMetadata(
          targetPath,
          scope,
          projectId,
          category,
          assetType,
          tags,
          extraMetadata
        );
      }
    } catch (error) {
      await this.logger.error('导入资产失败: ' + JSON.stringify({ params, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 创建导入资产的元数据
   * @private
   */
  private async createImportedMetadata(
    filePath: string,
    scope: AssetScope,
    projectId: string | undefined,
    category: string | undefined,
    assetType: AssetType,
    tags: string[],
    extraMetadata: Partial<AssetMetadata>
  ): Promise<AssetMetadata> {
    const defaultMetadata = await this.createDefaultMetadata(
      filePath,
      scope,
      projectId,
      category,
      true
    );

    const metadata: AssetMetadata = {
      ...defaultMetadata,
      type: assetType,
      tags,
      ...extraMetadata
    };

    // 保存元数据
    const metadataPath = this.fsService.getAssetMetadataPath(filePath);
    await this.fsService.saveJSON(metadataPath, metadata);

    // 更新索引
    await this.updateIndex(projectId);

    await this.logger.info('资产导入成功: ' + JSON.stringify({ filePath }), 'AssetManager');

    return metadata;
  }

  /**
   * 删除资产（级联删除）
   * @param filePath 文件路径
   * @param deleteMetadata 是否删除元数据文件（默认true）
   */
  async deleteAsset(filePath: string, deleteMetadata = true): Promise<void> {
    try {
      const normalizedPath = this.fsService.normalizePath(filePath);

      await this.logger.info('开始删除资产: ' + JSON.stringify({ filePath: normalizedPath, deleteMetadata }), 'AssetManager');

      // 获取元数据以便后续更新索引
      const metadata = await this.getMetadata(normalizedPath);

      // 删除文件
      if (await this.fsService.exists(normalizedPath)) {
        await this.fsService.deleteFile(normalizedPath);
      }

      // 删除元数据文件
      if (deleteMetadata) {
        const metadataPath = this.fsService.getAssetMetadataPath(normalizedPath);
        if (await this.fsService.exists(metadataPath)) {
          await this.fsService.deleteFile(metadataPath);
        }
      }

      // 删除缩略图（如果存在）
      if (metadata?.thumbnailPath) {
        if (await this.fsService.exists(metadata.thumbnailPath)) {
          await this.fsService.deleteFile(metadata.thumbnailPath);
        }
      }

      await this.logger.info('资产删除成功: ' + JSON.stringify({ filePath: normalizedPath }), 'AssetManager');

      // 更新索引
      if (metadata) {
        await this.updateIndex(metadata.projectId);
      }
    } catch (error) {
      await this.logger.error('删除资产失败: ' + JSON.stringify({ filePath, error }), 'AssetManager');
      throw error;
    }
  }

  // ========================================
  // 文件监听
  // ========================================

  /**
   * 开始监听文件变化
   * @param projectId 可选的项目ID
   */
  async startWatching(projectId?: string): Promise<void> {
    try {
      const watchKey = projectId || 'global';

      // 检查是否已经在监听
      if (this.watchers.has(watchKey)) {
        await this.logger.warn('已经在监听该目录: ' + JSON.stringify({ watchKey }), 'AssetManager');
        return;
      }

      const watchPath = projectId
        ? this.fsService.getProjectAssetDir(projectId)
        : this.fsService.getGlobalAssetDir();

      await this.logger.info('开始文件监听: ' + JSON.stringify({ watchPath, watchKey }), 'AssetManager');

      const watcher = watch(watchPath, {
        ignored: this.shouldIgnoreFile.bind(this),
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      watcher
        .on('add', (filePath: string) => {
          this.handleFileChange('add', filePath, projectId);
        })
        .on('change', (filePath: string) => {
          this.handleFileChange('change', filePath, projectId);
        })
        .on('unlink', (filePath: string) => {
          this.handleFileChange('unlink', filePath, projectId);
        })
        .on('error', (error: Error) => {
          this.logger.error('文件监听错误', 'AssetManager', { watchKey, error });
        });

      this.watchers.set(watchKey, watcher);
    } catch (error) {
      await this.logger.error('启动文件监听失败: ' + JSON.stringify({ projectId, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 停止监听文件变化
   * @param projectId 可选的项目ID
   */
  async stopWatching(projectId?: string): Promise<void> {
    try {
      const watchKey = projectId || 'global';

      const watcher = this.watchers.get(watchKey);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(watchKey);
        await this.logger.info('停止文件监听: ' + JSON.stringify({ watchKey }), 'AssetManager');
      }
    } catch (error) {
      await this.logger.error('停止文件监听失败: ' + JSON.stringify({ projectId, error }), 'AssetManager');
      throw error;
    }
  }

  /**
   * 处理文件变化事件
   * @private
   */
  private handleFileChange(
    eventType: 'add' | 'change' | 'unlink',
    filePath: string,
    projectId?: string
  ): void {
    // 跳过元数据文件
    if (this.shouldIgnoreFile(filePath)) {
      return;
    }

    this.logger.debug('文件变化', 'AssetManager', { eventType, filePath, projectId });

    // 更新索引（异步，不阻塞）
    this.updateIndex(projectId).catch(error => {
      this.logger.error('更新索引失败', 'AssetManager', { eventType, filePath, error });
    });

    // 通知渲染进程
    const event: AssetFileChangeEvent = {
      eventType,
      filePath,
      projectId
    };

    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('asset:file-changed', event);
    });
  }

  // ========================================
  // 辅助方法
  // ========================================

  /**
   * 检测资产类型
   * @private
   */
  private detectAssetType(filePath: string): AssetType {
    const ext = path.extname(filePath).toLowerCase();

    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];
    const audioExts = ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'];
    const textExts = ['.txt', '.md', '.json', '.xml', '.csv', '.log'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (textExts.includes(ext)) return 'text';

    return 'other';
  }

  /**
   * 检测宽高比
   * @private
   */
  private detectAspectRatio(width: number, height: number): AspectRatio {
    const ratio = width / height;
    if (Math.abs(ratio - 0.75) < 0.01) return '3:4';
    if (Math.abs(ratio - 1.33) < 0.01) return '4:3';
    if (Math.abs(ratio - 1.78) < 0.01) return '16:9';
    if (Math.abs(ratio - 0.56) < 0.01) return '9:16';
    return 'custom';
  }

  /**
   * 创建场景资产
   * @param projectId 项目ID
   * @param name 资产名称
   * @param imagePath 图片路径
   * @param sceneData 场景专用数据
   * @returns 资产元数据
   */
  async createSceneAsset(
    projectId: string,
    name: string,
    imagePath: string,
    sceneData: Omit<import('../../shared/types/asset').SceneCustomFields, 'assetSubType'>
  ): Promise<import('../../shared/types/asset').AssetMetadata> {
    const customFields: import('../../shared/types/asset').SceneCustomFields = {
      assetSubType: 'scene',
      ...sceneData
    };

    const result = await this.importAsset({
      sourcePath: imagePath,
      scope: 'project',
      projectId,
      category: 'scenes',
      metadata: {
        name,
        customFields
      }
    });

    return result;
  }

  /**
   * 创建角色资产
   * @param projectId 项目ID
   * @param name 资产名称
   * @param imagePath 图片路径
   * @param characterData 角色专用数据
   * @returns 资产元数据
   */
  async createCharacterAsset(
    projectId: string,
    name: string,
    imagePath: string,
    characterData: Omit<import('../../shared/types/asset').CharacterCustomFields, 'assetSubType'>
  ): Promise<import('../../shared/types/asset').AssetMetadata> {
    const customFields: import('../../shared/types/asset').CharacterCustomFields = {
      assetSubType: 'character',
      ...characterData
    };

    const result = await this.importAsset({
      sourcePath: imagePath,
      scope: 'project',
      projectId,
      category: 'characters',
      metadata: {
        name,
        customFields
      }
    });

    return result;
  }

  /**
   * 智能过滤场景资产
   * @param filter 场景过滤器
   * @returns 匹配的场景资产列表
   */
  async searchScenes(filter: {
    environment?: 'indoor' | 'outdoor';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    weather?: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
    location?: string;
  }): Promise<import('../../shared/types/asset').AssetMetadata[]> {
    const result = await this.scanAssets({ category: 'scenes' });
    const allAssets = result.assets;

    return allAssets.filter((asset) => {
      if (!asset.customFields || asset.customFields.assetSubType !== 'scene') {
        return false;
      }

      const sceneData = asset.customFields as import('../../shared/types/asset').SceneCustomFields;

      if (filter.environment && sceneData.environment !== filter.environment) return false;
      if (filter.timeOfDay && sceneData.timeOfDay !== filter.timeOfDay) return false;
      if (filter.weather && sceneData.weather !== filter.weather) return false;
      if (filter.location && !sceneData.location.includes(filter.location)) return false;

      return true;
    });
  }

  /**
   * 智能过滤角色资产
   * @param filter 角色过滤器
   * @returns 匹配的角色资产列表
   */
  async searchCharacters(filter: {
    gender?: 'male' | 'female' | 'other';
    ageRange?: [number, number];
    bodyType?: 'slim' | 'average' | 'muscular' | 'heavyset';
  }): Promise<import('../../shared/types/asset').AssetMetadata[]> {
    const result = await this.scanAssets({ category: 'characters' });
    const allAssets = result.assets;

    return allAssets.filter((asset) => {
      if (!asset.customFields || asset.customFields.assetSubType !== 'character') {
        return false;
      }

      const charData = asset.customFields as import('../../shared/types/asset').CharacterCustomFields;

      if (filter.gender && charData.gender !== filter.gender) return false;
      if (filter.ageRange) {
        const [min, max] = filter.ageRange;
        if (charData.age < min || charData.age > max) return false;
      }
      if (filter.bodyType && charData.bodyType !== filter.bodyType) return false;

      return true;
    });
  }

  /**
   * 判断是否应该忽略文件
   * @private
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const fileName = path.basename(filePath);

    // 忽略隐藏文件
    if (fileName.startsWith('.')) return true;

    // 忽略元数据文件
    if (fileName.endsWith('.meta.json')) return true;

    // 忽略索引文件
    if (fileName === 'index.json') return true;

    // 忽略临时文件
    if (fileName.endsWith('.tmp') || fileName.endsWith('.temp')) return true;

    return false;
  }
}

// 导出单例实例（延迟初始化）
let assetManagerInstance: AssetManagerClass | null = null;

export function getAssetManager(fsService: FileSystemService): AssetManagerClass {
  if (!assetManagerInstance) {
    assetManagerInstance = new AssetManagerClass(fsService);
  }
  return assetManagerInstance;
}

// 导出类型别名
export type AssetManager = AssetManagerClass;

/**
 * AssetManager 集成测试
 *
 * 测试资产管理器的核心功能：
 * - 索引构建和更新
 * - 资产扫描和过滤
 * - 资产导入
 * - 资产删除
 * - 元数据管理
 * - 文件监听（基础测试）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { AssetManagerClass } from '../../../src/main/services/AssetManager';
import { logger } from '../../../src/main/services/Logger';
import type { AssetFilter, AssetMetadata } from '@/shared/types';

describe('AssetManager 集成测试', () => {
  let fsService: FileSystemService;
  let assetManager: AssetManagerClass;
  let testDataDir: string;

  beforeEach(async () => {
    // 创建测试专用的临时目录
    testDataDir = path.join(process.cwd(), 'test-data', `test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // 初始化服务
    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    assetManager = new AssetManagerClass(fsService);
    await assetManager.initialize();
  });

  afterEach(async () => {
    // 停止文件监听
    try {
      await assetManager.stopWatching();
    } catch (error) {
      // 忽略错误
    }

    // 清理测试目录
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      // 验证初始化后可以获取索引
      const index = await assetManager.getIndex();
      expect(index).toBeDefined();
      expect(index.version).toBe('1.0');
      expect(index.statistics.total).toBe(0);
    });
  });

  describe('索引管理', () => {
    it('buildIndex 应该为空目录创建索引', async () => {
      const index = await assetManager.buildIndex();

      expect(index.version).toBe('1.0');
      expect(index.statistics.total).toBe(0);
      expect(index.categories).toEqual([]);
      expect(index.lastUpdated).toBeDefined();
    });

    it('buildIndex 应该为有资产的目录创建正确的索引', async () => {
      // 创建测试资产
      const imageDir = fsService.getGlobalAssetDir('image');
      const testImagePath = path.join(imageDir, 'test.jpg');
      await fs.writeFile(testImagePath, 'fake image content');

      // 创建元数据
      const metadata: Partial<AssetMetadata> = {
        id: 'test-image-1',
        name: 'test.jpg',
        filePath: testImagePath,
        type: 'image',
        category: 'images',
        scope: 'global',
        tags: ['test'],
        size: 18,
        mimeType: 'image/jpeg',
        extension: '.jpg',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
      await fsService.saveJSON(fsService.getAssetMetadataPath(testImagePath), metadata);

      // 构建索引
      const index = await assetManager.buildIndex();

      expect(index.statistics.total).toBe(1);
      expect(index.statistics.byType.image).toBe(1);
      expect(index.categories).toHaveLength(1);
      expect(index.categories[0].name).toBe('images');
      expect(index.categories[0].count).toBe(1);
    });

    it('getIndex 应该返回缓存的索引', async () => {
      await assetManager.buildIndex();
      const index1 = await assetManager.getIndex();
      const index2 = await assetManager.getIndex();

      // 应该返回相同的对象（从缓存）
      expect(index1.lastUpdated).toBe(index2.lastUpdated);
    });

    it('updateIndex 应该更新现有索引', async () => {
      // 构建初始索引
      await assetManager.buildIndex();
      const index1 = await assetManager.getIndex();

      // 添加新资产
      const videoDir = fsService.getGlobalAssetDir('video');
      const testVideoPath = path.join(videoDir, 'test.mp4');
      await fs.writeFile(testVideoPath, 'fake video content');

      const metadata: Partial<AssetMetadata> = {
        id: 'test-video-1',
        name: 'test.mp4',
        filePath: testVideoPath,
        type: 'video',
        category: 'videos',
        scope: 'global',
        tags: [],
        size: 18,
        mimeType: 'video/mp4',
        extension: '.mp4',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
      await fsService.saveJSON(fsService.getAssetMetadataPath(testVideoPath), metadata);

      // 更新索引
      await assetManager.updateIndex();
      const index2 = await assetManager.getIndex();

      expect(index2.statistics.total).toBe(1);
      expect(index2.lastUpdated).not.toBe(index1.lastUpdated);
    });
  });

  describe('资产扫描', () => {
    beforeEach(async () => {
      // 创建多个测试资产
      const assets = [
        { type: 'image', name: 'photo1.jpg', category: 'images', tags: ['nature', 'landscape'] },
        { type: 'image', name: 'photo2.png', category: 'images', tags: ['portrait'] },
        { type: 'video', name: 'clip1.mp4', category: 'videos', tags: ['tutorial'] },
        { type: 'audio', name: 'song1.mp3', category: 'audio', tags: ['music'] }
      ];

      for (const asset of assets) {
        const assetDir = fsService.getGlobalAssetDir(asset.type as any);
        const assetPath = path.join(assetDir, asset.name);
        await fs.writeFile(assetPath, `fake ${asset.type} content`);

        const metadata: Partial<AssetMetadata> = {
          id: `test-${asset.name}`,
          name: asset.name,
          filePath: assetPath,
          type: asset.type as any,
          category: asset.category,
          scope: 'global',
          tags: asset.tags,
          size: Buffer.byteLength(`fake ${asset.type} content`),
          mimeType: `${asset.type}/${asset.name.split('.')[1]}`,
          extension: `.${asset.name.split('.')[1]}`,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        };
        await fsService.saveJSON(fsService.getAssetMetadataPath(assetPath), metadata);
      }

      await assetManager.buildIndex();
    });

    it('scanAssets 应该返回所有资产', async () => {
      const filter: AssetFilter = { scope: 'all' };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(4);
      expect(result.assets).toHaveLength(4);
      expect(result.page).toBe(1);
    });

    it('scanAssets 应该按类型过滤', async () => {
      const filter: AssetFilter = { scope: 'all', type: 'image' };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(2);
      expect(result.assets.every(a => a.type === 'image')).toBe(true);
    });

    it('scanAssets 应该按分类过滤', async () => {
      const filter: AssetFilter = { scope: 'all', category: 'videos' };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(1);
      expect(result.assets[0].category).toBe('videos');
    });

    it('scanAssets 应该按标签过滤', async () => {
      const filter: AssetFilter = { scope: 'all', tags: ['nature'] };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(1);
      expect(result.assets[0].tags).toContain('nature');
    });

    it('scanAssets 应该支持搜索', async () => {
      const filter: AssetFilter = { scope: 'all', search: 'photo' };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(2);
      expect(result.assets.every(a => a.name.includes('photo'))).toBe(true);
    });

    it('scanAssets 应该支持排序', async () => {
      const filter: AssetFilter = { scope: 'all', sortBy: 'name', sortOrder: 'asc' };
      const result = await assetManager.scanAssets(filter);

      const names = result.assets.map(a => a.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('scanAssets 应该支持分页', async () => {
      const filter: AssetFilter = { scope: 'all', page: 1, pageSize: 2 };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(4);
      expect(result.assets).toHaveLength(2);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('scanAssets 第二页应该返回剩余资产', async () => {
      const filter: AssetFilter = { scope: 'all', page: 2, pageSize: 2 };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBe(4);
      expect(result.assets).toHaveLength(2);
      expect(result.page).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('资产导入', () => {
    it('importAsset 应该成功导入新资产', async () => {
      // 创建源文件
      const sourcePath = path.join(testDataDir, 'source.jpg');
      await fs.writeFile(sourcePath, 'fake image content');

      // 导入资产
      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'images',
        tags: ['imported', 'test']
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('source.jpg');
      expect(result.type).toBe('image');
      expect(result.scope).toBe('global');
      expect(result.category).toBe('images');
      expect(result.tags).toContain('imported');
      expect(result.filePath).toContain('assets');
    });

    it('importAsset 应该自动检测资产类型', async () => {
      const sourcePath = path.join(testDataDir, 'test.mp4');
      await fs.writeFile(sourcePath, 'fake video content');

      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'global'
      });

      expect(result.type).toBe('video');
    });

    it('importAsset 应该为项目导入资产', async () => {
      const sourcePath = path.join(testDataDir, 'project-asset.png');
      await fs.writeFile(sourcePath, 'fake image content');

      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'project',
        projectId: 'test-project-123',
        category: 'scenes'
      });

      expect(result.scope).toBe('project');
      expect(result.projectId).toBe('test-project-123');
      expect(result.category).toBe('scenes');
      expect(result.filePath).toContain('test-project-123');
      expect(result.filePath).toContain('scenes');
    });

    it('importAsset 应该创建元数据文件', async () => {
      const sourcePath = path.join(testDataDir, 'test.jpg');
      await fs.writeFile(sourcePath, 'fake image content');

      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'images'
      });

      // 检查元数据文件是否存在
      const metadataPath = fsService.getAssetMetadataPath(result.filePath);
      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(metadataExists).toBe(true);

      // 验证元数据内容
      const metadata = await fsService.readJSON<AssetMetadata>(metadataPath);
      expect(metadata).not.toBeNull();
      expect(metadata?.id).toBe(result.id);
    });
  });

  describe('资产删除', () => {
    let testAssetPath: string;

    beforeEach(async () => {
      // 导入一个测试资产
      const sourcePath = path.join(testDataDir, 'to-delete.jpg');
      await fs.writeFile(sourcePath, 'fake image content');

      const imported = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'images'
      });

      testAssetPath = imported.filePath;
    });

    it('deleteAsset 应该删除资产文件', async () => {
      await assetManager.deleteAsset(testAssetPath);

      const fileExists = await fs.access(testAssetPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('deleteAsset 应该删除元数据文件', async () => {
      const metadataPath = fsService.getAssetMetadataPath(testAssetPath);

      await assetManager.deleteAsset(testAssetPath, true);

      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(metadataExists).toBe(false);
    });

    it('deleteAsset 应该可以保留元数据', async () => {
      const metadataPath = fsService.getAssetMetadataPath(testAssetPath);

      await assetManager.deleteAsset(testAssetPath, false);

      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(metadataExists).toBe(true);
    });
  });

  describe('元数据管理', () => {
    let testAssetPath: string;

    beforeEach(async () => {
      const sourcePath = path.join(testDataDir, 'test-meta.jpg');
      await fs.writeFile(sourcePath, 'fake image content');

      const imported = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'images',
        tags: ['original']
      });

      testAssetPath = imported.filePath;
    });

    it('getMetadata 应该返回资产元数据', async () => {
      const metadata = await assetManager.getMetadata(testAssetPath);

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('test-meta.jpg');
      expect(metadata?.tags).toContain('original');
    });

    it('updateMetadata 应该更新资产元数据', async () => {
      const updates = {
        tags: ['updated', 'modified'],
        description: 'Updated description'
      };

      const updated = await assetManager.updateMetadata(testAssetPath, updates);

      expect(updated.tags).toEqual(['updated', 'modified']);
      expect(updated.description).toBe('Updated description');
    });

    it('updateMetadata 应该保留未更新的字段', async () => {
      const original = await assetManager.getMetadata(testAssetPath);

      await assetManager.updateMetadata(testAssetPath, { description: 'New description' });
      const updated = await assetManager.getMetadata(testAssetPath);

      expect(updated?.name).toBe(original?.name);
      expect(updated?.type).toBe(original?.type);
      expect(updated?.description).toBe('New description');
    });
  });

  describe('错误处理', () => {
    it('importAsset 应该在源文件不存在时抛出错误', async () => {
      const sourcePath = path.join(testDataDir, 'nonexistent.jpg');

      await expect(assetManager.importAsset({
        sourcePath,
        scope: 'global'
      })).rejects.toThrow();
    });

    it('deleteAsset 应该优雅处理不存在的文件', async () => {
      const nonexistentPath = path.join(testDataDir, 'nonexistent.jpg');

      // deleteAsset 对不存在的文件应该成功执行（幂等操作）
      await expect(assetManager.deleteAsset(nonexistentPath)).resolves.not.toThrow();
    });

    it('getMetadata 应该在元数据不存在时返回 null', async () => {
      const nonexistentPath = path.join(testDataDir, 'nonexistent.jpg');

      const metadata = await assetManager.getMetadata(nonexistentPath);

      expect(metadata).toBeNull();
    });
  });
});

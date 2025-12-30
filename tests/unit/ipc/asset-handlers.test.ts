/**
 * 资产相关 IPC 处理器测试
 *
 * 测试资产 IPC 处理器的基本功能：
 * - 验证处理器函数签名
 * - 测试基本的调用逻辑
 * - 测试错误处理
 *
 * 注意：这是单元测试，不测试完整的 Electron IPC 通道
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { AssetManagerClass } from '../../../src/main/services/AssetManager';
import type { AssetFilter } from '@/shared/types';

describe('Asset IPC Handlers 测试', () => {
  let fsService: FileSystemService;
  let assetManager: AssetManagerClass;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(process.cwd(), 'test-data', `test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    assetManager = new AssetManagerClass(fsService);
    await assetManager.initialize();
  });

  afterEach(async () => {
    try {
      await assetManager.stopWatching();
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略错误
    }
  });

  describe('asset:get-index handler', () => {
    it('应该返回全局索引', async () => {
      // 模拟 IPC 处理器调用
      const result = await assetManager.getIndex();

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0');
      expect(result.statistics).toBeDefined();
    });

    it('应该返回项目索引', async () => {
      const projectId = 'test-project-123';
      const result = await assetManager.getIndex(projectId);

      expect(result).toBeDefined();
      expect(result.projectId).toBe(projectId);
    });
  });

  describe('asset:rebuild-index handler', () => {
    it('应该重建索引并返回结果', async () => {
      const result = await assetManager.buildIndex();

      expect(result).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('asset:scan handler', () => {
    beforeEach(async () => {
      // 创建测试资产
      const imageDir = fsService.getGlobalAssetDir('image');
      const testImagePath = path.join(imageDir, 'test.jpg');
      await fs.writeFile(testImagePath, 'fake image');

      const metadata = {
        id: 'test-1',
        name: 'test.jpg',
        filePath: testImagePath,
        type: 'image',
        category: 'image',
        scope: 'global',
        tags: [],
        size: 10,
        mimeType: 'image/jpeg',
        extension: '.jpg',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
      await fsService.saveJSON(fsService.getAssetMetadataPath(testImagePath), metadata);
      await assetManager.buildIndex();
    });

    it('应该扫描并返回资产列表', async () => {
      const filter: AssetFilter = { scope: 'all' };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBeGreaterThan(0);
      expect(result.assets).toBeInstanceOf(Array);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBeDefined();
    });

    it('应该支持过滤参数', async () => {
      const filter: AssetFilter = {
        scope: 'all',
        type: 'image',
        page: 1,
        pageSize: 10
      };
      const result = await assetManager.scanAssets(filter);

      expect(result.assets.every(a => a.type === 'image')).toBe(true);
    });
  });

  describe('asset:import handler', () => {
    it('应该导入资产并返回元数据', async () => {
      // 创建源文件
      const sourcePath = path.join(testDataDir, 'import-test.jpg');
      await fs.writeFile(sourcePath, 'fake image');

      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'image',
        tags: ['test']
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('import-test.jpg');
      expect(result.scope).toBe('global');
      expect(result.filePath).toBeDefined();
    });

    it('应该在源文件不存在时抛出错误', async () => {
      const sourcePath = path.join(testDataDir, 'nonexistent.jpg');

      await expect(assetManager.importAsset({
        sourcePath,
        scope: 'global'
      })).rejects.toThrow();
    });
  });

  describe('asset:delete handler', () => {
    let testAssetPath: string;

    beforeEach(async () => {
      const sourcePath = path.join(testDataDir, 'delete-test.jpg');
      await fs.writeFile(sourcePath, 'fake image');

      const imported = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'image'
      });

      testAssetPath = imported.filePath;
    });

    it('应该成功删除资产', async () => {
      await assetManager.deleteAsset(testAssetPath);

      const exists = await fs.access(testAssetPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('应该在文件不存在时抛出错误', async () => {
      await expect(assetManager.deleteAsset('nonexistent-path')).rejects.toThrow();
    });
  });

  describe('asset:get-metadata handler', () => {
    let testAssetPath: string;

    beforeEach(async () => {
      const sourcePath = path.join(testDataDir, 'metadata-test.jpg');
      await fs.writeFile(sourcePath, 'fake image');

      const imported = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'image',
        tags: ['meta', 'test']
      });

      testAssetPath = imported.filePath;
    });

    it('应该返回资产元数据', async () => {
      const metadata = await assetManager.getMetadata(testAssetPath);

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('metadata-test.jpg');
      expect(metadata?.tags).toContain('meta');
    });

    it('应该在元数据不存在时返回 null', async () => {
      const metadata = await assetManager.getMetadata('nonexistent-path');

      expect(metadata).toBeNull();
    });
  });

  describe('asset:update-metadata handler', () => {
    let testAssetPath: string;

    beforeEach(async () => {
      const sourcePath = path.join(testDataDir, 'update-test.jpg');
      await fs.writeFile(sourcePath, 'fake image');

      const imported = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'image'
      });

      testAssetPath = imported.filePath;
    });

    it('应该成功更新元数据', async () => {
      const updates = {
        tags: ['updated', 'test'],
        description: 'Updated description'
      };

      const updated = await assetManager.updateMetadata(testAssetPath, updates);

      expect(updated.tags).toEqual(['updated', 'test']);
      expect(updated.description).toBe('Updated description');
    });

    it('应该保留原有的其他字段', async () => {
      const original = await assetManager.getMetadata(testAssetPath);

      const updates = { description: 'New desc' };
      const updated = await assetManager.updateMetadata(testAssetPath, updates);

      expect(updated.name).toBe(original?.name);
      expect(updated.type).toBe(original?.type);
      expect(updated.description).toBe('New desc');
    });
  });

  describe('错误处理', () => {
    it('所有处理器应该正确处理错误', async () => {
      // 测试各种错误场景
      await expect(assetManager.deleteAsset('invalid-path')).rejects.toThrow();
      await expect(assetManager.importAsset({
        sourcePath: 'nonexistent',
        scope: 'global'
      })).rejects.toThrow();
    });
  });

  describe('数据验证', () => {
    it('返回的资产元数据应该包含所有必需字段', async () => {
      const sourcePath = path.join(testDataDir, 'validation-test.jpg');
      await fs.writeFile(sourcePath, 'fake image');

      const result = await assetManager.importAsset({
        sourcePath,
        scope: 'global',
        category: 'image'
      });

      // 验证必需字段
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.scope).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.modifiedAt).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.mimeType).toBeDefined();
      expect(result.extension).toBeDefined();
    });

    it('扫描结果应该包含正确的分页信息', async () => {
      const filter: AssetFilter = { scope: 'all', page: 1, pageSize: 10 };
      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBeDefined();
      expect(result.hasMore).toBeDefined();
      expect(result.assets).toBeInstanceOf(Array);
    });
  });
});

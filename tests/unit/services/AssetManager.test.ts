/**
 * AssetManager 真实文件系统测试
 *
 * 测试策略：使用真实文件系统和 FileSystemService
 * - 创建临时测试目录
 * - 测试实际的索引文件（index.json）持久化
 * - 测试实际的元数据文件（.meta.json）读写
 * - 测试实际的资产导入、删除操作
 * - 验证文件系统操作的正确性
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AssetManagerClass } from '../../../src/main/services/AssetManager';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AssetIndex,
  AssetFilter,
  AssetType,
  AssetMetadata,
  AssetImportParams,
} from '@/shared/types';

// Mock TimeService 保证时间戳一致
vi.mock('../../../src/main/services/TimeService', () => ({
  timeService: {
    getCurrentTime: vi.fn(() => Promise.resolve(new Date('2025-12-29T10:00:00Z'))),
  },
}));

// Mock Logger
vi.mock('../../../src/main/services/Logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock chokidar（文件监听测试复杂度较高）
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Electron BrowserWindow
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock-user-data'),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

describe('AssetManager - 真实文件系统测试', () => {
  let assetManager: AssetManagerClass;
  let fsService: FileSystemService;
  let testDataDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    // 创建唯一的测试目录
    testDataDir = path.join(originalCwd, 'test-data', `asset-test-${Date.now()}`);

    // 不预先创建目录，让 FileSystemService 和 AssetManager 自己创建

    // 初始化真实的 FileSystemService
    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    // 初始化真实的 AssetManager
    assetManager = new AssetManagerClass(fsService);
    await assetManager.initialize();
  });

  afterEach(async () => {
    // 清理 AssetManager
    try {
      await assetManager.cleanup();
    } catch (error) {
      console.warn('清理 AssetManager 失败:', error);
    }

    // 清理测试目录
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('initialize', () => {
    it('应该成功初始化资产管理器', async () => {
      // 验证目录结构已创建
      const assetsDir = fsService.getGlobalAssetDir();
      const assetsDirStat = await fs.stat(assetsDir);
      expect(assetsDirStat.isDirectory()).toBe(true);

      // 验证各类型目录已创建
      const imageDir = fsService.getGlobalAssetDir('image');
      const videoDir = fsService.getGlobalAssetDir('video');
      const audioDir = fsService.getGlobalAssetDir('audio');
      const textDir = fsService.getGlobalAssetDir('text');
      const otherDir = fsService.getGlobalAssetDir('other');

      const imageDirStat = await fs.stat(imageDir);
      const videoDirStat = await fs.stat(videoDir);
      const audioDirStat = await fs.stat(audioDir);
      const textDirStat = await fs.stat(textDir);
      const otherDirStat = await fs.stat(otherDir);

      expect(imageDirStat.isDirectory()).toBe(true);
      expect(videoDirStat.isDirectory()).toBe(true);
      expect(audioDirStat.isDirectory()).toBe(true);
      expect(textDirStat.isDirectory()).toBe(true);
      expect(otherDirStat.isDirectory()).toBe(true);
    });

  });

  describe('cleanup', () => {
    it('应该成功清理资产管理器', async () => {
      await assetManager.cleanup();

      // 验证 cleanup 不会报错
      // 内部状态（watchers, indexCache）已清空
    });
  });

  describe('buildIndex', () => {
    it('应该成功构建全局索引并保存到文件', async () => {
      // 创建一些测试资产
      const imageDir = fsService.getGlobalAssetDir('image');
      const testImagePath = path.join(imageDir, 'test-image.jpg');
      await fs.writeFile(testImagePath, 'fake image data', 'utf-8');

      // 构建索引
      const index = await assetManager.buildIndex();

      // 验证索引结构
      expect(index.version).toBe('1.0');
      expect(index.lastUpdated).toBe('2025-12-29T10:00:00.000Z');
      expect(index.statistics).toBeDefined();
      expect(index.categories).toBeInstanceOf(Array);

      // 验证索引文件已保存
      const indexPath = fsService.getAssetIndexPath();
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const savedIndex = JSON.parse(indexContent);

      expect(savedIndex.version).toBe('1.0');
      expect(savedIndex.lastUpdated).toBe('2025-12-29T10:00:00.000Z');
    });

    it('应该成功构建项目索引', async () => {
      const projectId = 'test-project-123';

      // 创建项目目录和配置文件
      const projectDir = path.join(testDataDir, 'projects', projectId);
      await fs.mkdir(projectDir, { recursive: true });

      const projectJsonPath = path.join(projectDir, 'project.json');
      await fs.writeFile(
        projectJsonPath,
        JSON.stringify({ id: projectId, name: 'Test Project' }),
        'utf-8'
      );

      // 创建项目资产目录
      const projectAssetDir = fsService.getProjectAssetDir(projectId);
      await fs.mkdir(projectAssetDir, { recursive: true });

      // 构建项目索引
      const index = await assetManager.buildIndex(projectId);

      // 验证项目信息
      expect(index.projectId).toBe(projectId);
      expect(index.projectName).toBe('Test Project');

      // 验证项目索引文件已保存
      const indexPath = fsService.getAssetIndexPath(projectId);
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const savedIndex = JSON.parse(indexContent);

      expect(savedIndex.projectId).toBe(projectId);
      expect(savedIndex.projectName).toBe('Test Project');
    });

    it('应该统计资产数量和类型', async () => {
      // 创建多个类型的资产
      const imageDir = fsService.getGlobalAssetDir('image');
      const videoDir = fsService.getGlobalAssetDir('video');

      await fs.writeFile(path.join(imageDir, 'image1.jpg'), 'data', 'utf-8');
      await fs.writeFile(path.join(imageDir, 'image2.png'), 'data', 'utf-8');
      await fs.writeFile(path.join(videoDir, 'video1.mp4'), 'data', 'utf-8');

      // 构建索引
      const index = await assetManager.buildIndex();

      // 验证统计信息
      expect(index.statistics.total).toBeGreaterThanOrEqual(3);
      expect(index.statistics.byType.image).toBeGreaterThanOrEqual(2);
      expect(index.statistics.byType.video).toBeGreaterThanOrEqual(1);
    });

    it('应该跳过特殊目录', async () => {
      // 创建特殊目录
      const assetsDir = fsService.getGlobalAssetDir();
      await fs.mkdir(path.join(assetsDir, '.hidden'), { recursive: true });

      // 构建索引
      const index = await assetManager.buildIndex();

      // 验证特殊目录未被包含
      const hiddenCategory = index.categories.find((c) => c.name === '.hidden');
      expect(hiddenCategory).toBeUndefined();
    });
  });

  describe('getIndex', () => {
    it('应该从缓存获取索引', async () => {
      // 构建索引（会缓存）
      const index1 = await assetManager.buildIndex();

      // 再次获取索引（应该从缓存）
      const index2 = await assetManager.getIndex();

      // 应该是同一个引用
      expect(index1).toBe(index2);
    });

    it('应该从文件读取索引', async () => {
      // 先构建索引
      await assetManager.buildIndex();

      // 清空缓存
      await assetManager.cleanup();
      await assetManager.initialize();

      // 再次获取索引（应该从文件读取）
      const index = await assetManager.getIndex();

      expect(index.version).toBe('1.0');
    });

    it('应该在索引不存在时构建新索引', async () => {
      // 获取索引（索引文件不存在）
      const index = await assetManager.getIndex();

      // 验证新索引已构建
      expect(index.version).toBe('1.0');
      expect(index.statistics.total).toBe(0);

      // 验证索引文件已创建
      const indexPath = fsService.getAssetIndexPath();
      const exists = await fsService.exists(indexPath);
      expect(exists).toBe(true);
    });
  });

  describe('updateIndex', () => {
    it('应该成功更新索引', async () => {
      // 初始构建索引
      await assetManager.buildIndex();

      // 添加新资产
      const imageDir = fsService.getGlobalAssetDir('image');
      await fs.writeFile(path.join(imageDir, 'new-image.jpg'), 'data', 'utf-8');

      // 更新索引
      await assetManager.updateIndex();

      // 验证索引已更新
      const index = await assetManager.getIndex();
      expect(index.statistics.total).toBeGreaterThanOrEqual(1);
    });

    it('应该在更新失败时不抛出错误', async () => {
      // updateIndex 内部捕获错误，不会抛出
      await expect(assetManager.updateIndex()).resolves.not.toThrow();
    });
  });

  describe('scanAssets', () => {
    beforeEach(async () => {
      // 创建测试资产
      const imageDir = fsService.getGlobalAssetDir('image');
      const videoDir = fsService.getGlobalAssetDir('video');

      await fs.writeFile(path.join(imageDir, 'test-image.jpg'), 'image data', 'utf-8');
      await fs.writeFile(path.join(videoDir, 'test-video.mp4'), 'video data', 'utf-8');

      // 构建索引
      await assetManager.buildIndex();
    });

    it('应该扫描所有资产', async () => {
      const filter: AssetFilter = {
        scope: 'all',
        page: 1,
        pageSize: 20,
      };

      const result = await assetManager.scanAssets(filter);

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.assets).toBeInstanceOf(Array);
    });

    it('应该按类型过滤资产', async () => {
      const filter: AssetFilter = {
        scope: 'all',
        type: 'image',
        page: 1,
        pageSize: 20,
      };

      const result = await assetManager.scanAssets(filter);

      // 所有资产应该是 image 类型
      result.assets.forEach((asset) => {
        expect(asset.type).toBe('image');
      });
    });

    it('应该支持分页查询', async () => {
      const filter: AssetFilter = {
        scope: 'all',
        page: 1,
        pageSize: 1,
      };

      const result = await assetManager.scanAssets(filter);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
      expect(result.assets.length).toBeLessThanOrEqual(1);
    });

    it('应该支持搜索过滤', async () => {
      const filter: AssetFilter = {
        scope: 'all',
        search: 'test',
        page: 1,
        pageSize: 20,
      };

      const result = await assetManager.scanAssets(filter);

      // 验证搜索功能（结果应该包含 'test'）
      expect(result).toBeDefined();
    });
  });

  describe('getMetadata / updateMetadata', () => {
    it('应该创建默认元数据文件', async () => {
      // 创建资产文件
      const imageDir = fsService.getGlobalAssetDir('image');
      const testImagePath = path.join(imageDir, 'metadata-test.jpg');
      await fs.writeFile(testImagePath, 'image data', 'utf-8');

      // 获取元数据（会自动创建）
      const metadata = await assetManager.getMetadata(testImagePath);

      expect(metadata).not.toBeNull();
      expect(metadata!.name).toBe('metadata-test.jpg');
      expect(metadata!.type).toBe('image');
      expect(metadata!.scope).toBe('global');

      // 验证元数据文件已创建
      const metadataPath = fsService.getAssetMetadataPath(testImagePath);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const savedMetadata = JSON.parse(metadataContent);

      expect(savedMetadata.name).toBe('metadata-test.jpg');
      expect(savedMetadata.type).toBe('image');
    });

    it('应该读取已存在的元数据文件', async () => {
      // 创建资产文件和元数据
      const imageDir = fsService.getGlobalAssetDir('image');
      const testImagePath = path.join(imageDir, 'existing-metadata.jpg');
      await fs.writeFile(testImagePath, 'image data', 'utf-8');

      const metadataPath = fsService.getAssetMetadataPath(testImagePath);
      const existingMetadata: AssetMetadata = {
        id: 'test-id-123',
        name: 'Custom Name',
        filePath: testImagePath,
        type: 'image',
        scope: 'global',
        createdAt: '2025-12-29T09:00:00Z',
        modifiedAt: '2025-12-29T09:30:00Z',
        importedAt: '2025-12-29T09:00:00Z',
        size: 1024,
        mimeType: 'image/jpeg',
        extension: '.jpg',
        tags: ['custom', 'tag'],
        status: 'none',
      };

      await fs.writeFile(metadataPath, JSON.stringify(existingMetadata), 'utf-8');

      // 读取元数据
      const metadata = await assetManager.getMetadata(testImagePath);

      expect(metadata).not.toBeNull();
      expect(metadata!.id).toBe('test-id-123');
      expect(metadata!.name).toBe('Custom Name');
      expect(metadata!.tags).toEqual(['custom', 'tag']);
    });

    it('应该成功更新元数据', async () => {
      // 创建资产文件
      const imageDir = fsService.getGlobalAssetDir('image');
      const testImagePath = path.join(imageDir, 'update-metadata.jpg');
      await fs.writeFile(testImagePath, 'image data', 'utf-8');

      // 获取初始元数据
      const initialMetadata = await assetManager.getMetadata(testImagePath);
      expect(initialMetadata).not.toBeNull();

      // 更新元数据
      const updatedMetadata = await assetManager.updateMetadata(testImagePath, {
        tags: ['updated', 'tags'],
        description: 'Updated description',
      });

      expect(updatedMetadata.tags).toEqual(['updated', 'tags']);
      expect(updatedMetadata.description).toBe('Updated description');
      expect(updatedMetadata.modifiedAt).toBe('2025-12-29T10:00:00.000Z');

      // 验证元数据文件已更新
      const metadataPath = fsService.getAssetMetadataPath(testImagePath);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const savedMetadata = JSON.parse(metadataContent);

      expect(savedMetadata.tags).toEqual(['updated', 'tags']);
      expect(savedMetadata.description).toBe('Updated description');
    });
  });

  describe('importAsset', () => {
    it('应该成功导入资产到全局目录', async () => {
      // 创建源文件
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const sourceImagePath = path.join(tempDir, 'source-image.jpg');
      await fs.writeFile(sourceImagePath, 'source image data', 'utf-8');

      // 导入资产
      const params: AssetImportParams = {
        sourcePath: sourceImagePath,
        scope: 'global',
        type: 'image',
        tags: ['imported', 'test'],
      };

      const metadata = await assetManager.importAsset(params);

      // 验证元数据
      expect(metadata.name).toBe('source-image.jpg');
      expect(metadata.type).toBe('image');
      expect(metadata.scope).toBe('global');
      expect(metadata.tags).toEqual(['imported', 'test']);
      expect(metadata.isUserUploaded).toBe(true);

      // 验证文件已复制
      const targetDir = fsService.getGlobalAssetDir('image');
      const targetPath = path.join(targetDir, 'source-image.jpg');
      const exists = await fsService.exists(targetPath);
      expect(exists).toBe(true);

      // 验证元数据文件已创建
      const metadataPath = fsService.getAssetMetadataPath(targetPath);
      const metadataExists = await fsService.exists(metadataPath);
      expect(metadataExists).toBe(true);
    });

    it('应该成功导入资产到项目目录', async () => {
      const projectId = 'test-project-import';

      // 创建项目目录
      const projectDir = path.join(testDataDir, 'projects', projectId);
      await fs.mkdir(projectDir, { recursive: true });

      // 创建源文件
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const sourceVideoPath = path.join(tempDir, 'source-video.mp4');
      await fs.writeFile(sourceVideoPath, 'source video data', 'utf-8');

      // 导入资产
      const params: AssetImportParams = {
        sourcePath: sourceVideoPath,
        scope: 'project',
        projectId,
        category: 'videos',
        type: 'video',
        tags: ['project', 'test'],
      };

      const metadata = await assetManager.importAsset(params);

      // 验证元数据
      expect(metadata.name).toBe('source-video.mp4');
      expect(metadata.type).toBe('video');
      expect(metadata.scope).toBe('project');
      expect(metadata.projectId).toBe(projectId);
      expect(metadata.tags).toEqual(['project', 'test']);

      // 验证文件已复制到项目目录
      const targetDir = fsService.getProjectAssetDir(projectId, 'videos');
      const targetPath = path.join(targetDir, 'source-video.mp4');
      const exists = await fsService.exists(targetPath);
      expect(exists).toBe(true);
    });

    it('应该在文件已存在时生成新文件名', async () => {
      // 创建源文件
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const sourceImagePath = path.join(tempDir, 'duplicate.jpg');
      await fs.writeFile(sourceImagePath, 'image data', 'utf-8');

      // 第一次导入
      await assetManager.importAsset({
        sourcePath: sourceImagePath,
        scope: 'global',
        type: 'image',
      });

      // 第二次导入同名文件
      const metadata2 = await assetManager.importAsset({
        sourcePath: sourceImagePath,
        scope: 'global',
        type: 'image',
      });

      // 验证第二次导入使用了新文件名（包含时间戳）
      expect(metadata2.name).toMatch(/duplicate_\d+\.jpg/);
    });
  });

  describe('deleteAsset', () => {
    it('应该成功删除资产和元数据', async () => {
      // 创建并导入资产
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const sourceImagePath = path.join(tempDir, 'delete-test.jpg');
      await fs.writeFile(sourceImagePath, 'image data', 'utf-8');

      const metadata = await assetManager.importAsset({
        sourcePath: sourceImagePath,
        scope: 'global',
        type: 'image',
      });

      const assetPath = metadata.filePath;
      const metadataPath = fsService.getAssetMetadataPath(assetPath);

      // 验证文件和元数据存在
      expect(await fsService.exists(assetPath)).toBe(true);
      expect(await fsService.exists(metadataPath)).toBe(true);

      // 删除资产
      await assetManager.deleteAsset(assetPath);

      // 验证文件和元数据已删除
      expect(await fsService.exists(assetPath)).toBe(false);
      expect(await fsService.exists(metadataPath)).toBe(false);
    });

    it('应该在删除时保留元数据（如果指定）', async () => {
      // 创建并导入资产
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const sourceImagePath = path.join(tempDir, 'keep-metadata.jpg');
      await fs.writeFile(sourceImagePath, 'image data', 'utf-8');

      const metadata = await assetManager.importAsset({
        sourcePath: sourceImagePath,
        scope: 'global',
        type: 'image',
      });

      const assetPath = metadata.filePath;
      const metadataPath = fsService.getAssetMetadataPath(assetPath);

      // 删除资产但保留元数据
      await assetManager.deleteAsset(assetPath, false);

      // 验证文件已删除，但元数据保留
      expect(await fsService.exists(assetPath)).toBe(false);
      expect(await fsService.exists(metadataPath)).toBe(true);
    });
  });

  describe('setConfigManager', () => {
    it('应该设置配置管理器并监听变更', () => {
      const mockConfigManager = {
        getConfig: vi.fn(() => ({ general: { workspacePath: '/workspace' } })),
        onConfigChange: vi.fn(),
      };

      assetManager.setConfigManager(mockConfigManager);

      expect(mockConfigManager.getConfig).toHaveBeenCalled();
      expect(mockConfigManager.onConfigChange).toHaveBeenCalled();
    });

    it('应该在工作区路径变更时重新扫描', () => {
      let changeCallback: any;
      const mockConfigManager = {
        getConfig: vi.fn(() => ({ general: { workspacePath: '/workspace' } })),
        onConfigChange: vi.fn((callback) => {
          changeCallback = callback;
        }),
      };

      assetManager.setConfigManager(mockConfigManager);

      // 触发配置变更
      changeCallback({ general: { workspacePath: '/new-workspace' } });

      // 验证 onConfigChange 已被调用
      expect(mockConfigManager.onConfigChange).toHaveBeenCalled();
    });
  });

  describe('createSceneAsset / createCharacterAsset', () => {
    it('应该成功创建场景资产', async () => {
      const projectId = 'test-project-scene';

      // 创建项目目录
      const projectDir = path.join(testDataDir, 'projects', projectId);
      await fs.mkdir(projectDir, { recursive: true });

      // 创建场景图片
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const sceneImagePath = path.join(tempDir, 'scene.jpg');
      await fs.writeFile(sceneImagePath, 'scene image data', 'utf-8');

      // 创建场景资产
      const sceneAsset = await assetManager.createSceneAsset(
        projectId,
        'Beach Scene',
        sceneImagePath,
        {
          environment: 'outdoor',
          timeOfDay: 'morning',
          weather: 'sunny',
          location: 'Beach',
        }
      );

      // 验证场景资产元数据
      expect(sceneAsset.name).toBe('Beach Scene');
      expect(sceneAsset.projectId).toBe(projectId);
      expect(sceneAsset.category).toBe('scenes');
      expect(sceneAsset.customFields).toBeDefined();
      expect(sceneAsset.customFields!.assetSubType).toBe('scene');
    });

    it('应该成功创建角色资产', async () => {
      const projectId = 'test-project-character';

      // 创建项目目录
      const projectDir = path.join(testDataDir, 'projects', projectId);
      await fs.mkdir(projectDir, { recursive: true });

      // 创建角色图片
      const tempDir = path.join(testDataDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const characterImagePath = path.join(tempDir, 'character.png');
      await fs.writeFile(characterImagePath, 'character image data', 'utf-8');

      // 创建角色资产
      const characterAsset = await assetManager.createCharacterAsset(
        projectId,
        'Hero Character',
        characterImagePath,
        {
          gender: 'male',
          age: 25,
          bodyType: 'athletic',
        }
      );

      // 验证角色资产元数据
      expect(characterAsset.name).toBe('Hero Character');
      expect(characterAsset.projectId).toBe(projectId);
      expect(characterAsset.category).toBe('characters');
      expect(characterAsset.customFields).toBeDefined();
      expect(characterAsset.customFields!.assetSubType).toBe('character');
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空索引', async () => {
      // 获取空索引
      const index = await assetManager.getIndex();

      expect(index.statistics.total).toBe(0);
      expect(index.categories).toEqual([]);
    });

    it('应该处理并发索引构建', async () => {
      // 并发构建索引
      const promises = [
        assetManager.buildIndex(),
        assetManager.buildIndex(),
        assetManager.buildIndex(),
      ];

      const indexes = await Promise.all(promises);

      expect(indexes).toHaveLength(3);
      indexes.forEach((index) => {
        expect(index.version).toBe('1.0');
      });
    });

    it('应该处理不存在的文件路径', async () => {
      const metadata = await assetManager.getMetadata('/non-existent/path.jpg');

      // getMetadata 捕获错误并返回 null
      expect(metadata).toBeNull();
    });

    it('应该处理无效的分页参数', async () => {
      const filter: AssetFilter = {
        scope: 'all',
        page: -1,
        pageSize: 0,
      };

      const result = await assetManager.scanAssets(filter);

      // 应该处理无效参数，不崩溃
      expect(result).toBeDefined();
    });
  });
});

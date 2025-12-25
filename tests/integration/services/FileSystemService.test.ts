/**
 * FileSystemService 集成测试
 *
 * 测试文件系统服务的核心功能：
 * - 初始化和目录创建
 * - 路径管理
 * - 文件操作（复制、移动、删除）
 * - JSON 读写
 * - 文件信息获取
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { logger } from '../../../src/main/services/Logger';

describe('FileSystemService 集成测试', () => {
  let fsService: FileSystemService;
  let testDataDir: string;

  beforeEach(async () => {
    // 创建测试专用的临时目录
    testDataDir = path.join(process.cwd(), 'test-data', `test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // 创建服务实例并使用测试目录初始化
    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('初始化', () => {
    it('应该成功创建必要的目录结构', async () => {
      // 验证数据目录存在
      const dataDir = fsService.getDataDir();
      expect(dataDir).toBe(testDataDir);

      const dataDirExists = await fs.access(dataDir).then(() => true).catch(() => false);
      expect(dataDirExists).toBe(true);

      // 验证全局资产目录存在
      const globalAssetDir = fsService.getGlobalAssetDir();
      const globalExists = await fs.access(globalAssetDir).then(() => true).catch(() => false);
      expect(globalExists).toBe(true);

      // 验证项目根目录存在
      const projectsDir = path.join(testDataDir, 'projects');
      const projectsExists = await fs.access(projectsDir).then(() => true).catch(() => false);
      expect(projectsExists).toBe(true);
    });
  });

  describe('路径管理', () => {
    it('getDataDir 应该返回正确的数据目录路径', () => {
      const dataDir = fsService.getDataDir();
      expect(dataDir).toBe(testDataDir);
    });

    it('getGlobalAssetDir 应该返回正确的全局资产目录', () => {
      const globalDir = fsService.getGlobalAssetDir();
      expect(globalDir).toBe(path.join(testDataDir, 'assets'));
    });

    it('getGlobalAssetDir 应该返回指定类型的子目录', () => {
      const imageDir = fsService.getGlobalAssetDir('image');
      expect(imageDir).toBe(path.join(testDataDir, 'assets', 'images'));
    });

    it('getProjectAssetDir 应该返回项目资产目录', () => {
      const projectDir = fsService.getProjectAssetDir('test-project-123');
      expect(projectDir).toBe(path.join(testDataDir, 'projects', 'test-project-123', 'assets'));
    });

    it('getProjectAssetDir 应该返回项目分类目录', () => {
      const categoryDir = fsService.getProjectAssetDir('test-project-123', 'scenes');
      expect(categoryDir).toBe(path.join(testDataDir, 'projects', 'test-project-123', 'assets', 'scenes'));
    });

    it('getAssetMetadataPath 应该返回正确的元数据路径', () => {
      const assetPath = '/path/to/asset.jpg';
      const metadataPath = fsService.getAssetMetadataPath(assetPath);
      expect(metadataPath).toBe('/path/to/asset.jpg.meta.json');
    });

    it('getAssetIndexPath 应该返回全局索引路径', () => {
      const indexPath = fsService.getAssetIndexPath();
      expect(indexPath).toBe(path.join(testDataDir, 'assets', 'index.json'));
    });

    it('getAssetIndexPath 应该返回项目索引路径', () => {
      const indexPath = fsService.getAssetIndexPath('test-project-123');
      expect(indexPath).toBe(path.join(testDataDir, 'projects', 'test-project-123', 'assets', 'index.json'));
    });
  });

  describe('文件操作', () => {
    it('copyFile 应该成功复制文件', async () => {
      // 创建源文件
      const sourceFile = path.join(testDataDir, 'source.txt');
      const targetFile = path.join(testDataDir, 'target.txt');
      await fs.writeFile(sourceFile, 'test content');

      // 复制文件
      await fsService.copyFile(sourceFile, targetFile);

      // 验证目标文件存在且内容正确
      const targetContent = await fs.readFile(targetFile, 'utf-8');
      expect(targetContent).toBe('test content');
    });

    it('copyFile 应该自动创建目标目录', async () => {
      const sourceFile = path.join(testDataDir, 'source.txt');
      const targetFile = path.join(testDataDir, 'subdir', 'nested', 'target.txt');
      await fs.writeFile(sourceFile, 'test content');

      await fsService.copyFile(sourceFile, targetFile);

      const targetContent = await fs.readFile(targetFile, 'utf-8');
      expect(targetContent).toBe('test content');
    });

    it('moveFile 应该成功移动文件', async () => {
      const sourceFile = path.join(testDataDir, 'source.txt');
      const targetFile = path.join(testDataDir, 'target.txt');
      await fs.writeFile(sourceFile, 'test content');

      await fsService.moveFile(sourceFile, targetFile);

      // 验证源文件不存在
      const sourceExists = await fs.access(sourceFile).then(() => true).catch(() => false);
      expect(sourceExists).toBe(false);

      // 验证目标文件存在
      const targetContent = await fs.readFile(targetFile, 'utf-8');
      expect(targetContent).toBe('test content');
    });

    it('deleteFile 应该成功删除文件', async () => {
      const testFile = path.join(testDataDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      await fsService.deleteFile(testFile);

      const fileExists = await fs.access(testFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });
  });

  describe('JSON 操作', () => {
    it('saveJSON 应该保存 JSON 数据', async () => {
      const jsonFile = path.join(testDataDir, 'data.json');
      const data = { name: 'test', value: 123, nested: { key: 'value' } };

      await fsService.saveJSON(jsonFile, data);

      // 直接读取文件验证
      const fileContent = await fs.readFile(jsonFile, 'utf-8');
      const parsed = JSON.parse(fileContent);
      expect(parsed).toEqual(data);
    });

    it('readJSON 应该读取 JSON 数据', async () => {
      const jsonFile = path.join(testDataDir, 'data.json');
      const data = { name: 'test', value: 123 };
      await fs.writeFile(jsonFile, JSON.stringify(data, null, 2));

      const result = await fsService.readJSON(jsonFile);

      expect(result).toEqual(data);
    });

    it('readJSON 应该在文件不存在时返回 null', async () => {
      const jsonFile = path.join(testDataDir, 'nonexistent.json');

      const result = await fsService.readJSON(jsonFile);

      expect(result).toBeNull();
    });

    it('readJSON 应该在 JSON 无效时返回 null', async () => {
      const jsonFile = path.join(testDataDir, 'invalid.json');
      await fs.writeFile(jsonFile, 'invalid json content');

      const result = await fsService.readJSON(jsonFile);

      expect(result).toBeNull();
    });
  });

  describe('文件信息', () => {
    it('getFileInfo 应该返回正确的文件信息', async () => {
      const testFile = path.join(testDataDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(testFile, content);

      const info = await fsService.getFileInfo(testFile);

      expect(info.size).toBe(Buffer.byteLength(content));
      expect(info.mimeType).toBe('text/plain');
      expect(info.extension).toBe('.txt');
      expect(typeof info.createdAt).toBe('string');
      expect(typeof info.modifiedAt).toBe('string');
      expect(new Date(info.createdAt).getTime()).toBeGreaterThan(0);
      expect(new Date(info.modifiedAt).getTime()).toBeGreaterThan(0);
    });

    it('getFileInfo 应该正确识别图片文件的 MIME 类型', async () => {
      const imageFile = path.join(testDataDir, 'test.jpg');
      await fs.writeFile(imageFile, Buffer.from([0xFF, 0xD8, 0xFF])); // JPEG 魔数

      const info = await fsService.getFileInfo(imageFile);

      expect(info.mimeType).toBe('image/jpeg');
      expect(info.extension).toBe('.jpg');
    });

    it('getFileInfo 应该为未知类型返回 MIME 类型', async () => {
      const unknownFile = path.join(testDataDir, 'test.unknownext123');
      await fs.writeFile(unknownFile, 'content');

      const info = await fsService.getFileInfo(unknownFile);

      // mime-types 库会返回 false，我们的代码会转换为 application/octet-stream
      expect(info.mimeType).toBe('application/octet-stream');
      expect(info.extension).toBe('.unknownext123');
    });
  });

  describe('错误处理', () => {
    it('copyFile 应该在源文件不存在时抛出错误', async () => {
      const sourceFile = path.join(testDataDir, 'nonexistent.txt');
      const targetFile = path.join(testDataDir, 'target.txt');

      await expect(fsService.copyFile(sourceFile, targetFile)).rejects.toThrow();
    });

    it('getFileInfo 应该在文件不存在时抛出错误', async () => {
      const nonexistentFile = path.join(testDataDir, 'nonexistent.txt');

      await expect(fsService.getFileInfo(nonexistentFile)).rejects.toThrow();
    });
  });
});

/**
 * IPC 集成测试: asset 相关通道
 * 测试通道: asset:get-index, asset:rebuild-index, asset:scan, asset:import, asset:delete,
 *          asset:get-metadata, asset:update-metadata, asset:start-watching, asset:stop-watching,
 *          asset:show-import-dialog, asset:get-references (11个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext, createTestFile, TestDataGenerator } from './helpers/ipc-test-utils';
import { getAssetManager } from '../../../src/main/services/AssetManager';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { dialog } from 'electron';
import * as path from 'path';

vi.mock('electron', () => ({
  app: { getVersion: vi.fn().mockReturnValue('0.3.5'), getPath: vi.fn(() => '/tmp/test'), on: vi.fn(), whenReady: vi.fn().mockResolvedValue(true), isReady: vi.fn().mockReturnValue(true) },
  BrowserWindow: { getFocusedWindow: vi.fn(), getAllWindows: vi.fn().mockReturnValue([]) },
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn(), removeAllListeners: vi.fn() },
  dialog: { showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/test/asset.png'] }) },
  protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() }
}));

vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { Logger: vi.fn(() => mockLogger), logger: mockLogger, LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } };
});

vi.mock('../../../src/main/services/ServiceErrorHandler', () => {
  const mock = { handleError: vi.fn(), createError: vi.fn((code, msg) => new Error(msg)), wrapAsync: vi.fn((fn) => fn()) };
  const ErrorCode = {
    UNKNOWN: 'UNKNOWN',
    INVALID_PARAMETER: 'INVALID_PARAMETER',
    OPERATION_FAILED: 'OPERATION_FAILED',
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS'
  };
  return { serviceErrorHandler: mock, errorHandler: mock, ErrorCode };
});

describe('IPC Integration: asset', () => {
  let ctx: IPCTestContext;
  let assetManager: any;
  let fsService: FileSystemService;

  beforeEach(async () => {
    ctx = new IPCTestContext('asset');
    await ctx.setup();
    fsService = ctx.getFileSystemService();
    assetManager = getAssetManager(fsService);
    await assetManager.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await assetManager.cleanup();
    await ctx.cleanup();
  });

  describe('asset:get-index', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:get-index', (_, projectId) => assetManager.getIndex(projectId));
    });

    it('应该获取全局索引', async () => {
      const index = await ctx.invoke('asset:get-index');
      expect(index).toBeTruthy();
      expect(index).toHaveProperty('statistics');
      expect(index).toHaveProperty('categories');
      expect(index.statistics).toHaveProperty('total');
    });

    it('应该获取项目索引', async () => {
      const index = await ctx.invoke('asset:get-index', 'test-project');
      expect(index).toBeTruthy();
    });
  });

  describe('asset:rebuild-index', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:rebuild-index', (_, projectId) => assetManager.buildIndex(projectId));
    });

    it('应该重建全局索引', async () => {
      const index = await ctx.invoke('asset:rebuild-index');
      expect(index).toBeTruthy();
    });

    it('应该重建项目索引', async () => {
      const index = await ctx.invoke('asset:rebuild-index', 'test-project');
      expect(index).toBeTruthy();
    });
  });

  describe('asset:scan', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:scan', (_, filter) => assetManager.scanAssets(filter));
    });

    it('应该扫描所有资产', async () => {
      const result = await ctx.invoke('asset:scan', {});
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('total');
    });

    it('应该支持分页', async () => {
      const result = await ctx.invoke('asset:scan', { page: 1, pageSize: 10 });
      expect(result.assets.length).toBeLessThanOrEqual(10);
    });

    it('应该支持类别过滤', async () => {
      const result = await ctx.invoke('asset:scan', { category: 'image' });
      expect(result).toBeTruthy();
    });
  });

  describe('asset:import', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:import', (_, params) => assetManager.importAsset(params));
    });

    it('应该导入资产', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'import.png', 'fake image data');
      const metadata = await ctx.invoke('asset:import', {
        sourcePath: testFile,
        assetType: 'image',
        category: 'test'
      });
      expect(metadata).toBeTruthy();
      expect(metadata.filePath).toBeTruthy();
    });

    it('应该支持项目作用域导入', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'project-asset.png', 'data');
      const metadata = await ctx.invoke('asset:import', {
        sourcePath: testFile,
        assetType: 'image',
        projectId: 'test-project'
      });
      expect(metadata.projectId).toBe('test-project');
    });
  });

  describe('asset:delete', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:import', (_, params) => assetManager.importAsset(params));
      ctx.registerHandler('asset:delete', async (_, filePath) => {
        await assetManager.deleteAsset(filePath);
        return { success: true };
      });
    });

    it('应该删除资产', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'delete-me.png', 'data');
      const metadata = await ctx.invoke('asset:import', { sourcePath: testFile, assetType: 'image' });
      const result = await ctx.invoke('asset:delete', metadata.filePath);
      expect(result.success).toBe(true);
    });
  });

  describe('asset:get-metadata', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:import', (_, params) => assetManager.importAsset(params));
      ctx.registerHandler('asset:get-metadata', (_, filePath) => assetManager.getMetadata(filePath));
    });

    it('应该获取资产元数据', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'metadata-test.png', 'data');
      const imported = await ctx.invoke('asset:import', { sourcePath: testFile, assetType: 'image' });
      const metadata = await ctx.invoke('asset:get-metadata', imported.filePath);
      expect(metadata).toBeTruthy();
      expect(metadata.filePath).toBe(imported.filePath);
    });
  });

  describe('asset:update-metadata', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:import', (_, params) => assetManager.importAsset(params));
      ctx.registerHandler('asset:update-metadata', (_, filePath, updates) =>
        assetManager.updateMetadata(filePath, updates)
      );
    });

    it('应该更新资产元数据', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'update-test.png', 'data');
      const imported = await ctx.invoke('asset:import', { sourcePath: testFile, assetType: 'image' });
      const updated = await ctx.invoke('asset:update-metadata', imported.filePath, { tags: ['updated'] });
      expect(updated.tags).toContain('updated');
    });
  });

  describe('asset:start-watching', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:start-watching', async (_, projectId) => {
        await assetManager.startWatching(projectId);
        return { success: true };
      });
    });

    it('应该开始监听全局资产', async () => {
      const result = await ctx.invoke('asset:start-watching');
      expect(result.success).toBe(true);
    });

    it('应该开始监听项目资产', async () => {
      const result = await ctx.invoke('asset:start-watching', 'test-project');
      expect(result.success).toBe(true);
    });
  });

  describe('asset:stop-watching', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:start-watching', async (_, projectId) => {
        await assetManager.startWatching(projectId);
        return { success: true };
      });
      ctx.registerHandler('asset:stop-watching', async (_, projectId) => {
        await assetManager.stopWatching(projectId);
        return { success: true };
      });
    });

    it('应该停止监听资产', async () => {
      await ctx.invoke('asset:start-watching');
      const result = await ctx.invoke('asset:stop-watching');
      expect(result.success).toBe(true);
    });
  });

  describe('asset:show-import-dialog', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:show-import-dialog', async () => {
        const result = await dialog.showOpenDialog({
          properties: ['openFile', 'multiSelections'],
          filters: [{ name: 'All Files', extensions: ['*'] }]
        } as any);
        return result;
      });
    });

    it('应该打开导入对话框', async () => {
      const result = await ctx.invoke('asset:show-import-dialog');
      expect(result).toBeTruthy();
      expect(result.filePaths).toBeDefined();
    });
  });

  describe('asset:get-references', () => {
    beforeEach(() => {
      ctx.registerHandler('asset:get-references', (_, assetId) => assetManager.getAssetReferences(assetId));
    });

    it('应该获取资产引用关系', async () => {
      const references = await ctx.invoke('asset:get-references', 'test-asset-id');
      expect(Array.isArray(references)).toBe(true);
    });
  });
});

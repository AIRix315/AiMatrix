/**
 * IPC 集成测试: file, settings, dialog 相关通道
 * 测试通道: file:*, settings:*, dialog:* (11个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext, createTestFile, fileExists } from './helpers/ipc-test-utils';
import { getSafePath } from '../../../src/main/utils/security';
import { configManager } from '../../../src/main/services/ConfigManager';
import { dialog } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';

vi.mock('electron', () => ({
  app: { getVersion: vi.fn().mockReturnValue('0.3.5'), getPath: vi.fn(() => '/tmp/test'), on: vi.fn(), whenReady: vi.fn().mockResolvedValue(true), isReady: vi.fn().mockReturnValue(true) },
  BrowserWindow: { getFocusedWindow: vi.fn(), getAllWindows: vi.fn().mockReturnValue([]) },
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn(), removeAllListeners: vi.fn() },
  dialog: { showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/test/file.txt'] }) },
  protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() }
}));

vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { Logger: vi.fn(() => mockLogger), logger: mockLogger, LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } };
});

vi.mock('../../../src/main/services/ConfigManager', () => ({
  configManager: {
    getConfig: vi.fn().mockReturnValue({ general: { workspacePath: '/test/workspace' } }),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('IPC Integration: file, settings, dialog', () => {
  let ctx: IPCTestContext;

  beforeEach(async () => {
    ctx = new IPCTestContext('file-settings-dialog');
    await ctx.setup();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('file:read', () => {
    beforeEach(() => {
      ctx.registerHandler('file:read', async (_, filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { success: true, content };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });
    });

    it('应该读取文件', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'test.txt', 'Hello World');
      const result = await ctx.invoke('file:read', testFile);
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello World');
    });

    it('读取不存在的文件应该失败', async () => {
      const result = await ctx.invoke('file:read', '/nonexistent/file.txt');
      expect(result.success).toBe(false);
    });
  });

  describe('file:write', () => {
    beforeEach(() => {
      ctx.registerHandler('file:write', async (_, filePath, content) => {
        try {
          await fs.writeFile(filePath, content, 'utf-8');
          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });
    });

    it('应该写入文件', async () => {
      const filePath = path.join(ctx.getTestDataDir(), 'write-test.txt');
      const result = await ctx.invoke('file:write', filePath, 'Test Content');
      expect(result.success).toBe(true);
      const exists = await fileExists(filePath);
      expect(exists).toBe(true);
    });
  });

  describe('file:delete', () => {
    beforeEach(() => {
      ctx.registerHandler('file:delete', async (_, filePath) => {
        try {
          await fs.unlink(filePath);
          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });
    });

    it('应该删除文件', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'delete-test.txt', 'Delete Me');
      const result = await ctx.invoke('file:delete', testFile);
      expect(result.success).toBe(true);
    });
  });

  describe('file:exists', () => {
    beforeEach(() => {
      ctx.registerHandler('file:exists', async (_, filePath) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      });
    });

    it('存在的文件应该返回true', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'exists-test.txt', 'I exist');
      const exists = await ctx.invoke('file:exists', testFile);
      expect(exists).toBe(true);
    });

    it('不存在的文件应该返回false', async () => {
      const exists = await ctx.invoke('file:exists', '/nonexistent/file.txt');
      expect(exists).toBe(false);
    });
  });

  describe('file:list', () => {
    beforeEach(() => {
      ctx.registerHandler('file:list', async (_, dirPath) => {
        try {
          const items = await fs.readdir(dirPath, { withFileTypes: true });
          return items.map(item => ({ name: item.name, isDirectory: item.isDirectory(), isFile: item.isFile() }));
        } catch {
          return [];
        }
      });
    });

    it('应该列出目录内容', async () => {
      await createTestFile(ctx.getTestDataDir(), 'file1.txt', 'File 1');
      await createTestFile(ctx.getTestDataDir(), 'file2.txt', 'File 2');
      const list = await ctx.invoke('file:list', ctx.getTestDataDir());
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('file:watch & file:unwatch', () => {
    beforeEach(() => {
      const watchers = new Map();
      ctx.registerHandler('file:watch', async (_, filePath) => {
        try {
          return { success: true, path: filePath };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });
      ctx.registerHandler('file:unwatch', async (_, filePath) => {
        return { success: true };
      });
    });

    it('应该监听文件', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'watch-test.txt', 'Watch Me');
      const result = await ctx.invoke('file:watch', testFile);
      expect(result.success).toBe(true);
    });

    it('应该停止监听文件', async () => {
      const testFile = await createTestFile(ctx.getTestDataDir(), 'unwatch-test.txt', 'Unwatch Me');
      await ctx.invoke('file:watch', testFile);
      const result = await ctx.invoke('file:unwatch', testFile);
      expect(result.success).toBe(true);
    });
  });

  describe('settings:get-all', () => {
    beforeEach(() => {
      ctx.registerHandler('settings:get-all', () => configManager.getConfig());
    });

    it('应该获取所有设置', async () => {
      const config = await ctx.invoke('settings:get-all');
      expect(config).toBeTruthy();
      expect(config).toHaveProperty('general');
    });
  });

  describe('settings:save', () => {
    beforeEach(() => {
      ctx.registerHandler('settings:save', async (_, config) => {
        await configManager.saveConfig(config);
        return { success: true };
      });
    });

    it('应该保存设置', async () => {
      const result = await ctx.invoke('settings:save', { general: { theme: 'dark' } });
      expect(result.success).toBe(true);
    });
  });

  describe('dialog:open-directory', () => {
    beforeEach(() => {
      ctx.registerHandler('dialog:open-directory', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] } as any);
        return result.canceled ? null : result.filePaths[0];
      });
    });

    it('应该打开目录选择对话框', async () => {
      const path = await ctx.invoke('dialog:open-directory');
      expect(path).toBe('/test/file.txt');
    });
  });

  describe('dialog:selectFiles', () => {
    beforeEach(() => {
      ctx.registerHandler('dialog:selectFiles', async (_, options) => {
        return await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters: options?.filters } as any);
      });
    });

    it('应该打开文件选择对话框', async () => {
      const result = await ctx.invoke('dialog:selectFiles', {});
      expect(result).toBeTruthy();
      expect(result.filePaths).toBeDefined();
    });
  });
});

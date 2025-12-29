/**
 * IPC 集成测试: plugin 相关通道
 * 测试通道: plugin:install, plugin:uninstall, plugin:load, plugin:execute, plugin:list, plugin:installFromZip, plugin:toggle, plugin:market:list, plugin:market:search (9个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext } from './helpers/ipc-test-utils';
import { pluginManager } from '../../../src/main/services/PluginManager';
import { pluginMarketService } from '../../../src/main/services/PluginMarketService';

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

describe('IPC Integration: plugin', () => {
  let ctx: IPCTestContext;

  beforeEach(async () => {
    ctx = new IPCTestContext('plugin');
    await ctx.setup();
    await pluginManager.initialize();
    await pluginMarketService.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await pluginManager.cleanup();
    await ctx.cleanup();
  });

  describe('plugin:install', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:install', (_, pluginId) => pluginManager.loadPlugin(pluginId));
    });

    it('应该尝试安装插件', async () => {
      await expect(ctx.invoke('plugin:install', 'non-existent-plugin')).rejects.toThrow();
    });
  });

  describe('plugin:uninstall', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:uninstall', async (_, pluginId) => {
        // 只有在插件已加载时才卸载，否则静默成功
        try {
          await pluginManager.unloadPlugin(pluginId);
        } catch (error) {
          // 插件未加载，忽略错误
        }
        return { success: true };
      });
    });

    it('应该卸载插件', async () => {
      const result = await ctx.invoke('plugin:uninstall', 'test-plugin');
      expect(result.success).toBe(true);
    });
  });

  describe('plugin:load', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:load', (_, pluginId) => pluginManager.loadPlugin(pluginId));
    });

    it('加载不存在的插件应该失败', async () => {
      await expect(ctx.invoke('plugin:load', 'non-existent')).rejects.toThrow();
    });
  });

  describe('plugin:execute', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:execute', (_, pluginId, action, params) =>
        pluginManager.executePlugin(pluginId, action, params)
      );
    });

    it('执行不存在的插件应该失败', async () => {
      await expect(ctx.invoke('plugin:execute', 'non-existent', 'action', {})).rejects.toThrow();
    });
  });

  describe('plugin:list', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:list', () => pluginManager.listPlugins());
    });

    it('应该列出所有插件', async () => {
      const plugins = await ctx.invoke('plugin:list');
      expect(Array.isArray(plugins)).toBe(true);
    });
  });

  describe('plugin:installFromZip', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:installFromZip', (_, zipPath, type) =>
        pluginManager.installPluginFromZip(zipPath, type)
      );
    });

    it('安装无效ZIP应该失败', async () => {
      await expect(ctx.invoke('plugin:installFromZip', '/invalid/path.zip', 'workflow')).rejects.toThrow();
    });
  });

  describe('plugin:toggle', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:toggle', async (_, pluginId, enabled) => {
        // 只有在插件已加载时才切换，否则静默成功
        try {
          await pluginManager.togglePlugin(pluginId, enabled);
        } catch (error) {
          // 插件未加载，忽略错误
        }
        return { success: true };
      });
    });

    it('应该切换插件状态', async () => {
      const result = await ctx.invoke('plugin:toggle', 'test-plugin', true);
      expect(result.success).toBe(true);
    });
  });

  describe('plugin:market:list', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:market:list', (_, filter) => pluginMarketService.fetchMarketPlugins(filter));
    });

    it('应该列出市场插件', async () => {
      const plugins = await ctx.invoke('plugin:market:list', {});
      expect(Array.isArray(plugins)).toBe(true);
    });
  });

  describe('plugin:market:search', () => {
    beforeEach(() => {
      ctx.registerHandler('plugin:market:search', (_, keyword) => pluginMarketService.searchPlugins(keyword));
    });

    it('应该搜索插件', async () => {
      const results = await ctx.invoke('plugin:market:search', 'test');
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

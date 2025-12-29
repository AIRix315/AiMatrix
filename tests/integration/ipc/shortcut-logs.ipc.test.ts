/**
 * IPC 集成测试: shortcut, logs 相关通道
 * 测试通道: shortcut:add, shortcut:remove, shortcut:reorder, shortcut:list, logs:get-recent (5个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext } from './helpers/ipc-test-utils';
import { ShortcutManager } from '../../../src/main/services/ShortcutManager';
import { logger } from '../../../src/main/services/Logger';
import { timeService } from '../../../src/main/services/TimeService';
import { configManager } from '../../../src/main/services/ConfigManager';

vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), getRecentLogs: vi.fn().mockResolvedValue([]) };
  return { Logger: vi.fn(() => mockLogger), logger: mockLogger, LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } };
});

vi.mock('../../../src/main/services/TimeService', () => ({
  timeService: { getCurrentTime: vi.fn().mockResolvedValue(new Date()), validateTimeIntegrity: vi.fn().mockResolvedValue(true) }
}));

vi.mock('../../../src/main/services/ConfigManager', () => ({
  configManager: {
    getConfig: vi.fn().mockReturnValue({ shortcuts: [] }),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ shortcuts: [] }),
    saveSettings: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('IPC Integration: shortcut, logs', () => {
  let ctx: IPCTestContext;
  let shortcutManager: ShortcutManager;

  beforeEach(async () => {
    ctx = new IPCTestContext('shortcut-logs');
    await ctx.setup();
    shortcutManager = ShortcutManager.getInstance(timeService, logger, configManager);
    await shortcutManager.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('shortcut:add', () => {
    beforeEach(() => {
      ctx.registerHandler('shortcut:add', (_, item) => shortcutManager.addShortcut(item));
    });

    it('应该添加快捷方式', async () => {
      const item = { type: 'workflow', targetId: 'test-workflow', label: 'Test' };
      await ctx.invoke('shortcut:add', item);
      const list = await shortcutManager.listShortcuts();
      expect(list.length).toBeGreaterThan(0);
    });
  });

  describe('shortcut:remove', () => {
    beforeEach(() => {
      ctx.registerHandler('shortcut:add', (_, item) => shortcutManager.addShortcut(item));
      ctx.registerHandler('shortcut:remove', async (_, id) => { await shortcutManager.removeShortcut(id); });
    });

    it('应该删除快捷方式', async () => {
      const item = { type: 'workflow', targetId: 'test', label: 'Test' };
      await ctx.invoke('shortcut:add', item);
      const list = await shortcutManager.listShortcuts();
      await ctx.invoke('shortcut:remove', list[list.length - 1].id);
    });
  });

  describe('shortcut:reorder', () => {
    beforeEach(() => {
      ctx.registerHandler('shortcut:add', (_, item) => shortcutManager.addShortcut(item));
      ctx.registerHandler('shortcut:list', () => shortcutManager.listShortcuts());
      ctx.registerHandler('shortcut:reorder', async (_, ids) => { await shortcutManager.reorderShortcuts(ids); });
    });

    it('应该重新排序快捷方式', async () => {
      // 先添加一些快捷方式
      await ctx.invoke('shortcut:add', { type: 'workflow', targetId: 'wf1', label: 'WF1' });
      await ctx.invoke('shortcut:add', { type: 'workflow', targetId: 'wf2', label: 'WF2' });
      await ctx.invoke('shortcut:add', { type: 'workflow', targetId: 'wf3', label: 'WF3' });

      // 获取实际ID
      const list = await ctx.invoke('shortcut:list');
      const ids = list.map((item: any) => item.id);

      // 测试重新排序（反转顺序）
      await ctx.invoke('shortcut:reorder', ids.reverse());
    });
  });

  describe('shortcut:list', () => {
    beforeEach(() => {
      ctx.registerHandler('shortcut:list', () => shortcutManager.listShortcuts());
    });

    it('应该列出所有快捷方式', async () => {
      const list = await ctx.invoke('shortcut:list');
      expect(Array.isArray(list)).toBe(true);
    });
  });

  describe('logs:get-recent', () => {
    beforeEach(() => {
      ctx.registerHandler('logs:get-recent', (_, limit, levelFilter) => logger.getRecentLogs(limit, levelFilter));
    });

    it('应该获取最近日志', async () => {
      const logs = await ctx.invoke('logs:get-recent', 100);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('应该支持日志级别过滤', async () => {
      const errorLogs = await ctx.invoke('logs:get-recent', 50, 'error');
      expect(Array.isArray(errorLogs)).toBe(true);
    });
  });
});

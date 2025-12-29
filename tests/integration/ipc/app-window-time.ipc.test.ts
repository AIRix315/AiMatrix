/**
 * IPC 集成测试: app, window, time 相关通道
 *
 * 测试通道：
 * - app:version (1)
 * - app:quit (1)
 * - app:restart (1)
 * - app:log (1)
 * - window:minimize (1)
 * - window:maximize (1)
 * - window:close (1)
 * - window:isMaximized (1)
 * - time:getCurrentTime (1)
 *
 * 共计: 9个通道
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app, BrowserWindow, ipcMain } from 'electron';
import { IPCTestContext, mockIPCHandler } from './helpers/ipc-test-utils';
import { timeService } from '../../../src/main/services/TimeService';
import { logger } from '../../../src/main/services/Logger';

// Mock Electron
vi.mock('electron', () => {
  const mockApp = {
    getVersion: vi.fn().mockReturnValue('0.3.5'),
    quit: vi.fn(),
    relaunch: vi.fn(),
    exit: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/tmp/test-user-data';
      if (name === 'appData') return '/tmp/test-app-data';
      return '/tmp/test-path';
    })
  };

  const mockWindow = {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockReturnValue(false)
  };

  const mockBrowserWindow = {
    getFocusedWindow: vi.fn().mockReturnValue(mockWindow),
    getAllWindows: vi.fn().mockReturnValue([mockWindow])
  };

  const mockIpcMain = {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn()
  };

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    protocol: {
      registerSchemesAsPrivileged: vi.fn(),
      handle: vi.fn()
    }
  };
});

// Mock Logger
vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  return {
    Logger: vi.fn(() => mockLogger),
    logger: mockLogger,
    LogLevel: {
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error'
    }
  };
});

// Mock TimeService
vi.mock('../../../src/main/services/TimeService', () => ({
  timeService: {
    getCurrentTime: vi.fn().mockResolvedValue(new Date('2025-12-29T10:00:00.000Z'))
  }
}));

describe('IPC Integration: app, window, time', () => {
  let ctx: IPCTestContext;

  beforeEach(async () => {
    ctx = new IPCTestContext('app-window-time');
    await ctx.setup();

    // 重置所有 mock
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('app:version - 获取应用版本', () => {
    beforeEach(() => {
      // 注册处理器
      ctx.registerHandler('app:version', () => app.getVersion());
    });

    it('应该返回正确的版本号', async () => {
      const version = await ctx.invoke<string>('app:version');

      expect(version).toBe('0.3.5');
      expect(app.getVersion).toHaveBeenCalled();
    });

    it('应该支持并发调用', async () => {
      const calls = Array(10).fill([]);
      const results = await ctx.invokeBatch<string>('app:version', calls);

      expect(results).toHaveLength(10);
      expect(results.every(v => v === '0.3.5')).toBe(true);
    });

    it('性能应该小于50ms', async () => {
      const duration = await ctx.measurePerformance('app:version');
      expect(duration).toBeLessThan(50);
    });
  });

  describe('app:quit - 退出应用', () => {
    beforeEach(() => {
      ctx.registerHandler('app:quit', () => app.quit());
    });

    it('应该调用 app.quit()', async () => {
      await ctx.invoke('app:quit');

      expect(app.quit).toHaveBeenCalled();
    });

    it('应该支持多次调用而不出错', async () => {
      await ctx.invoke('app:quit');
      await ctx.invoke('app:quit');

      expect(app.quit).toHaveBeenCalledTimes(2);
    });
  });

  describe('app:restart - 重启应用', () => {
    beforeEach(() => {
      ctx.registerHandler('app:restart', () => {
        app.relaunch();
        app.exit();
      });
    });

    it('应该调用 app.relaunch() 和 app.exit()', async () => {
      await ctx.invoke('app:restart');

      expect(app.relaunch).toHaveBeenCalled();
      expect(app.exit).toHaveBeenCalled();
    });

    it('调用顺序应该正确（先 relaunch 后 exit）', async () => {
      await ctx.invoke('app:restart');

      const relaunched = vi.mocked(app.relaunch);
      const exited = vi.mocked(app.exit);

      expect(relaunched.mock.invocationCallOrder[0]).toBeLessThan(
        exited.mock.invocationCallOrder[0]
      );
    });
  });

  describe('app:log - 应用日志记录', () => {
    beforeEach(() => {
      ctx.registerHandler('app:log', async (_, level: string, message: string, context?: string, data?: unknown) => {
        switch (level) {
          case 'debug':
            await logger.debug(message, context || 'Renderer', data);
            break;
          case 'info':
            await logger.info(message, context || 'Renderer', data);
            break;
          case 'warn':
            await logger.warn(message, context || 'Renderer', data);
            break;
          case 'error':
            await logger.error(message, context || 'Renderer', data);
            break;
        }
      });
    });

    it('应该记录 debug 日志', async () => {
      await ctx.invoke('app:log', 'debug', 'Test debug message');

      expect(logger.debug).toHaveBeenCalledWith('Test debug message', 'Renderer', undefined);
    });

    it('应该记录 info 日志', async () => {
      await ctx.invoke('app:log', 'info', 'Test info message', 'TestContext', { key: 'value' });

      expect(logger.info).toHaveBeenCalledWith('Test info message', 'TestContext', { key: 'value' });
    });

    it('应该记录 warn 日志', async () => {
      await ctx.invoke('app:log', 'warn', 'Test warning');

      expect(logger.warn).toHaveBeenCalledWith('Test warning', 'Renderer', undefined);
    });

    it('应该记录 error 日志', async () => {
      await ctx.invoke('app:log', 'error', 'Test error', 'ErrorContext', { error: 'details' });

      expect(logger.error).toHaveBeenCalledWith('Test error', 'ErrorContext', { error: 'details' });
    });

    it('应该使用默认上下文 "Renderer"', async () => {
      await ctx.invoke('app:log', 'info', 'Message without context');

      expect(logger.info).toHaveBeenCalledWith('Message without context', 'Renderer', undefined);
    });

    it('应该支持批量日志记录', async () => {
      const calls = [
        ['info', 'Message 1'],
        ['warn', 'Message 2'],
        ['error', 'Message 3']
      ];

      await ctx.invokeBatch('app:log', calls);

      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('window:minimize - 最小化窗口', () => {
    beforeEach(() => {
      ctx.registerHandler('window:minimize', () => {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
          window.minimize();
        }
      });
    });

    it('应该最小化窗口', async () => {
      await ctx.invoke('window:minimize');

      expect(BrowserWindow.getFocusedWindow).toHaveBeenCalled();
      const mockWindow = BrowserWindow.getFocusedWindow();
      expect(mockWindow?.minimize).toHaveBeenCalled();
    });

    it('没有窗口时不应该出错', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValueOnce(null);

      await expect(ctx.invoke('window:minimize')).resolves.not.toThrow();
    });
  });

  describe('window:maximize - 最大化/还原窗口', () => {
    beforeEach(() => {
      ctx.registerHandler('window:maximize', () => {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
          if (window.isMaximized()) {
            window.unmaximize();
          } else {
            window.maximize();
          }
        }
      });
    });

    it('未最大化时应该最大化窗口', async () => {
      const mockWindow = BrowserWindow.getFocusedWindow();
      vi.mocked(mockWindow!.isMaximized).mockReturnValue(false);

      await ctx.invoke('window:maximize');

      expect(mockWindow?.maximize).toHaveBeenCalled();
      expect(mockWindow?.unmaximize).not.toHaveBeenCalled();
    });

    it('已最大化时应该还原窗口', async () => {
      const mockWindow = BrowserWindow.getFocusedWindow();
      vi.mocked(mockWindow!.isMaximized).mockReturnValue(true);

      await ctx.invoke('window:maximize');

      expect(mockWindow?.unmaximize).toHaveBeenCalled();
      expect(mockWindow?.maximize).not.toHaveBeenCalled();
    });

    it('没有窗口时不应该出错', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValueOnce(null);

      await expect(ctx.invoke('window:maximize')).resolves.not.toThrow();
    });
  });

  describe('window:close - 关闭窗口', () => {
    beforeEach(() => {
      ctx.registerHandler('window:close', () => {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
          window.close();
        }
      });
    });

    it('应该关闭窗口', async () => {
      await ctx.invoke('window:close');

      expect(BrowserWindow.getFocusedWindow).toHaveBeenCalled();
      const mockWindow = BrowserWindow.getFocusedWindow();
      expect(mockWindow?.close).toHaveBeenCalled();
    });

    it('没有窗口时不应该出错', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValueOnce(null);

      await expect(ctx.invoke('window:close')).resolves.not.toThrow();
    });
  });

  describe('window:isMaximized - 检查窗口是否最大化', () => {
    beforeEach(() => {
      ctx.registerHandler('window:isMaximized', () => {
        const window = BrowserWindow.getFocusedWindow();
        return window ? window.isMaximized() : false;
      });
    });

    it('窗口最大化时应该返回 true', async () => {
      const mockWindow = BrowserWindow.getFocusedWindow();
      vi.mocked(mockWindow!.isMaximized).mockReturnValue(true);

      const result = await ctx.invoke<boolean>('window:isMaximized');

      expect(result).toBe(true);
    });

    it('窗口未最大化时应该返回 false', async () => {
      const mockWindow = BrowserWindow.getFocusedWindow();
      vi.mocked(mockWindow!.isMaximized).mockReturnValue(false);

      const result = await ctx.invoke<boolean>('window:isMaximized');

      expect(result).toBe(false);
    });

    it('没有窗口时应该返回 false', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValueOnce(null);

      const result = await ctx.invoke<boolean>('window:isMaximized');

      expect(result).toBe(false);
    });
  });

  describe('time:getCurrentTime - 获取当前时间', () => {
    beforeEach(() => {
      ctx.registerHandler('time:getCurrentTime', async () => {
        const currentTime = await timeService.getCurrentTime();
        return currentTime.getTime();
      });
    });

    it('应该返回时间戳（毫秒）', async () => {
      const timestamp = await ctx.invoke<number>('time:getCurrentTime');

      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBe(new Date('2025-12-29T10:00:00.000Z').getTime());
    });

    it('应该调用 TimeService', async () => {
      await ctx.invoke('time:getCurrentTime');

      expect(timeService.getCurrentTime).toHaveBeenCalled();
    });

    it('应该支持并发调用', async () => {
      const calls = Array(5).fill([]);
      const results = await ctx.invokeBatch<number>('time:getCurrentTime', calls);

      expect(results).toHaveLength(5);
      expect(results.every(t => t === new Date('2025-12-29T10:00:00.000Z').getTime())).toBe(true);
    });

    it('性能应该小于100ms', async () => {
      const duration = await ctx.measurePerformance('time:getCurrentTime');
      expect(duration).toBeLessThan(100);
    });
  });

  describe('并发安全性测试', () => {
    beforeEach(() => {
      // 注册所有处理器
      ctx.registerHandler('app:version', () => app.getVersion());
      ctx.registerHandler('window:isMaximized', () => {
        const window = BrowserWindow.getFocusedWindow();
        return window ? window.isMaximized() : false;
      });
      ctx.registerHandler('time:getCurrentTime', async () => {
        const currentTime = await timeService.getCurrentTime();
        return currentTime.getTime();
      });
    });

    it('应该支持不同通道的并发调用', async () => {
      const results = await Promise.all([
        ctx.invoke('app:version'),
        ctx.invoke('window:isMaximized'),
        ctx.invoke('time:getCurrentTime')
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('0.3.5');
      expect(typeof results[1]).toBe('boolean');
      expect(typeof results[2]).toBe('number');
    });

    it('大量并发调用不应该出错', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(ctx.invoke('app:version'));
        promises.push(ctx.invoke('window:isMaximized'));
        promises.push(ctx.invoke('time:getCurrentTime'));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(300);
    });
  });
});

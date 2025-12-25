/**
 * Vitest 测试环境设置
 * Mock Electron 模块以支持集成测试
 */

import { vi } from 'vitest';

// Mock Electron
vi.mock('electron', () => {
  const mockApp = {
    whenReady: vi.fn().mockResolvedValue(true),
    getVersion: vi.fn().mockReturnValue('0.1.0'),
    quit: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/tmp/test-user-data';
      if (name === 'appData') return '/tmp/test-app-data';
      return '/tmp/test-path';
    })
  };

  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    loadURL: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
    webContents: {
      send: vi.fn()
    },
    close: vi.fn(),
    show: vi.fn(),
    hide: vi.fn()
  }));

  const mockIpcMain = {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn(),
    listenerCount: vi.fn().mockReturnValue(1)
  };

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    ipcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn()
    },
    protocol: {
      registerSchemesAsPrivileged: vi.fn(),
      handle: vi.fn()
    }
  };
});

/**
 * Jest 测试环境设置
 * Mock Electron 模块以支持集成测试
 */

// Mock Electron
jest.mock('electron', () => {
  const mockApp = {
    whenReady: jest.fn().mockResolvedValue(true),
    getVersion: jest.fn().mockReturnValue('0.1.0'),
    quit: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    isReady: jest.fn().mockReturnValue(true)
  };

  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadURL: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    webContents: {
      send: jest.fn()
    },
    close: jest.fn(),
    show: jest.fn(),
    hide: jest.fn()
  }));

  const mockIpcMain = {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn(),
    listenerCount: jest.fn().mockReturnValue(1)
  };

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    ipcRenderer: {
      invoke: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn()
    }
  };
});

// 设置测试超时
jest.setTimeout(10000);

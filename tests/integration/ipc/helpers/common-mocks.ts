/**
 * IPC 测试通用 Mock 配置
 * 统一管理所有服务的 Mock
 */

import { vi } from 'vitest';

// ===== Logger Mock =====
export const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  getRecentLogs: vi.fn().mockResolvedValue([])
};

export const LoggerMock = {
  Logger: vi.fn(() => mockLogger),
  logger: mockLogger,
  LogLevel: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  }
};

// ===== ServiceErrorHandler Mock =====
export const mockErrorHandler = {
  handleError: vi.fn((error, context) => error),
  createError: vi.fn((code, msg) => new Error(msg)),
  wrapAsync: vi.fn((fn) => fn())
};

export const ServiceErrorHandlerMock = {
  serviceErrorHandler: mockErrorHandler,
  errorHandler: mockErrorHandler
};

// ===== TimeService Mock =====
export const mockTimeService = {
  getCurrentTime: vi.fn().mockResolvedValue(new Date('2025-12-29T10:00:00.000Z')),
  validateTimeIntegrity: vi.fn().mockResolvedValue(true),
  syncWithNTP: vi.fn().mockResolvedValue(true)
};

export const TimeServiceMock = {
  timeService: mockTimeService
};

// ===== ConfigManager Mock =====
export const mockConfigManager = {
  getConfig: vi.fn().mockReturnValue({
    general: { workspacePath: '/test/workspace', theme: 'light' },
    shortcuts: [],
    apiProviders: []
  }),
  getGeneralSettings: vi.fn().mockReturnValue({ workspacePath: '/test/workspace' }),
  getLogSettings: vi.fn().mockReturnValue({ savePath: '/test/logs' }),
  saveConfig: vi.fn().mockResolvedValue(undefined),
  initialize: vi.fn().mockResolvedValue(undefined)
};

export const ConfigManagerMock = {
  configManager: mockConfigManager,
  APIKeyEncryption: vi.fn().mockImplementation(() => ({
    encrypt: vi.fn((text) => `encrypted:${text}`),
    decrypt: vi.fn((encrypted) => encrypted.replace('encrypted:', '')),
    isEncrypted: vi.fn((text) => text.startsWith('encrypted:'))
  }))
};

// ===== 应用所有Mock =====
export function setupAllMocks() {
  vi.mock('../../../src/main/services/Logger', () => LoggerMock);
  vi.mock('../../../src/main/services/ServiceErrorHandler', () => ServiceErrorHandlerMock);
  vi.mock('../../../src/main/services/TimeService', () => TimeServiceMock);
  vi.mock('../../../src/main/services/ConfigManager', () => ConfigManagerMock);
}

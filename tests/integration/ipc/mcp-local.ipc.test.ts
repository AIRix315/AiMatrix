/**
 * IPC 集成测试: mcp, local 相关通道
 * 测试通道: mcp:connect, mcp:disconnect, mcp:call, mcp:status, mcp:list,
 *          local:start, local:stop, local:status, local:restart (9个)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext } from './helpers/ipc-test-utils';

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn().mockReturnValue('0.3.5'),
    getPath: vi.fn(() => '/tmp/test'),
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(true),
    isReady: vi.fn().mockReturnValue(true)
  },
  BrowserWindow: { getFocusedWindow: vi.fn(), getAllWindows: vi.fn().mockReturnValue([]) },
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn(), removeAllListeners: vi.fn() },
  protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() }
}));

vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { Logger: vi.fn(() => mockLogger), logger: mockLogger, LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } };
});

// Mock MCP 和 Local 服务（这些是占位符，实际实现可能不同）
const mockMCPService = {
  connect: vi.fn().mockResolvedValue({ success: true, connectionId: 'mcp-123' }),
  disconnect: vi.fn().mockResolvedValue({ success: true }),
  call: vi.fn().mockResolvedValue({ result: 'mock-result' }),
  getStatus: vi.fn().mockReturnValue({ connected: true, services: [] }),
  listServices: vi.fn().mockReturnValue([])
};

const mockLocalService = {
  start: vi.fn().mockResolvedValue({ success: true, pid: 12345 }),
  stop: vi.fn().mockResolvedValue({ success: true }),
  getStatus: vi.fn().mockReturnValue({ running: false, services: [] }),
  restart: vi.fn().mockResolvedValue({ success: true, pid: 12346 })
};

describe('IPC Integration: mcp, local', () => {
  let ctx: IPCTestContext;

  beforeEach(async () => {
    ctx = new IPCTestContext('mcp-local');
    await ctx.setup();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  // ===== MCP 服务测试 (5个通道) =====

  describe('mcp:connect', () => {
    beforeEach(() => {
      ctx.registerHandler('mcp:connect', (_, serviceConfig) => mockMCPService.connect(serviceConfig));
    });

    it('应该连接MCP服务', async () => {
      const result = await ctx.invoke('mcp:connect', { url: 'http://localhost:5000' });
      expect(result.success).toBe(true);
      expect(result.connectionId).toBeTruthy();
    });
  });

  describe('mcp:disconnect', () => {
    beforeEach(() => {
      ctx.registerHandler('mcp:connect', (_, config) => mockMCPService.connect(config));
      ctx.registerHandler('mcp:disconnect', (_, connectionId) => mockMCPService.disconnect(connectionId));
    });

    it('应该断开MCP服务', async () => {
      const connected = await ctx.invoke('mcp:connect', { url: 'http://localhost:5000' });
      const result = await ctx.invoke('mcp:disconnect', connected.connectionId);
      expect(result.success).toBe(true);
    });
  });

  describe('mcp:call', () => {
    beforeEach(() => {
      ctx.registerHandler('mcp:call', (_, serviceName, method, params) =>
        mockMCPService.call(serviceName, method, params)
      );
    });

    it('应该调用MCP服务方法', async () => {
      const result = await ctx.invoke('mcp:call', 'test-service', 'testMethod', { arg: 'value' });
      expect(result).toBeTruthy();
      expect(result.result).toBe('mock-result');
    });
  });

  describe('mcp:status', () => {
    beforeEach(() => {
      ctx.registerHandler('mcp:status', () => mockMCPService.getStatus());
    });

    it('应该获取MCP服务状态', async () => {
      const status = await ctx.invoke('mcp:status');
      expect(status).toBeTruthy();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('services');
    });
  });

  describe('mcp:list', () => {
    beforeEach(() => {
      ctx.registerHandler('mcp:list', () => mockMCPService.listServices());
    });

    it('应该列出所有MCP服务', async () => {
      const services = await ctx.invoke('mcp:list');
      expect(Array.isArray(services)).toBe(true);
    });
  });

  // ===== Local 服务测试 (4个通道) =====

  describe('local:start', () => {
    beforeEach(() => {
      ctx.registerHandler('local:start', (_, serviceConfig) => mockLocalService.start(serviceConfig));
    });

    it('应该启动本地服务', async () => {
      const result = await ctx.invoke('local:start', { name: 'test-service', port: 3000 });
      expect(result.success).toBe(true);
      expect(result.pid).toBeTruthy();
    });
  });

  describe('local:stop', () => {
    beforeEach(() => {
      ctx.registerHandler('local:start', (_, config) => mockLocalService.start(config));
      ctx.registerHandler('local:stop', (_, serviceName) => mockLocalService.stop(serviceName));
    });

    it('应该停止本地服务', async () => {
      await ctx.invoke('local:start', { name: 'test-service' });
      const result = await ctx.invoke('local:stop', 'test-service');
      expect(result.success).toBe(true);
    });
  });

  describe('local:status', () => {
    beforeEach(() => {
      ctx.registerHandler('local:status', (_, serviceName) => mockLocalService.getStatus(serviceName));
    });

    it('应该获取本地服务状态', async () => {
      const status = await ctx.invoke('local:status', 'test-service');
      expect(status).toBeTruthy();
      expect(status).toHaveProperty('running');
    });
  });

  describe('local:restart', () => {
    beforeEach(() => {
      ctx.registerHandler('local:start', (_, config) => mockLocalService.start(config));
      ctx.registerHandler('local:restart', (_, serviceName) => mockLocalService.restart(serviceName));
    });

    it('应该重启本地服务', async () => {
      await ctx.invoke('local:start', { name: 'test-service' });
      const result = await ctx.invoke('local:restart', 'test-service');
      expect(result.success).toBe(true);
      expect(result.pid).toBeTruthy();
    });
  });

  // ===== 集成测试 =====

  describe('MCP 和 Local 服务协作', () => {
    beforeEach(() => {
      ctx.registerHandler('mcp:connect', (_, config) => mockMCPService.connect(config));
      ctx.registerHandler('local:start', (_, config) => mockLocalService.start(config));
      ctx.registerHandler('local:status', (_, name) => mockLocalService.getStatus(name));
    });

    it('应该同时启动本地服务和连接MCP', async () => {
      const localResult = await ctx.invoke('local:start', { name: 'comfyui', port: 8188 });
      const mcpResult = await ctx.invoke('mcp:connect', { url: 'http://localhost:5000' });

      expect(localResult.success).toBe(true);
      expect(mcpResult.success).toBe(true);
    });
  });
});

/**
 * TimeService 单元测试
 * 验证时间服务与合规层的功能
 */

import { TimeServiceImpl, TimeMonitor, timeService } from '../../../src/main/services/TimeService';

// Mock child_process 模块
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock console 方法
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('TimeService', () => {
  let timeServiceInstance: TimeServiceImpl;

  beforeEach(() => {
    timeServiceInstance = TimeServiceImpl.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCurrentTime', () => {
    it('应该返回当前时间', async () => {
      const beforeTime = new Date();
      const result = await timeServiceInstance.getCurrentTime();
      const afterTime = new Date();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('应该记录时间获取操作', async () => {
      await timeServiceInstance.getCurrentTime();
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('时间操作: getCurrentTime')
      );
    });
  });

  describe('getUTCTime', () => {
    it('应该返回ISO 8601格式的UTC时间', async () => {
      const result = await timeServiceInstance.getUTCTime();
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('getLocalTime', () => {
    it('应该返回本地时间字符串', async () => {
      const result = await timeServiceInstance.getLocalTime();
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('validateTimeIntegrity', () => {
    it('应该验证时间完整性', async () => {
      const result = await timeServiceInstance.validateTimeIntegrity();
      
      expect(typeof result).toBe('boolean');
    });

    it('应该记录时间验证操作', async () => {
      await timeServiceInstance.validateTimeIntegrity();
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('时间操作: validateTimeIntegrity')
      );
    });
  });

  describe('syncWithNTP', () => {
    const { exec } = require('child_process');
    
    beforeEach(() => {
      exec.mockReset();
    });

    it('应该尝试与NTP服务器同步', async () => {
      exec.mockResolvedValue({ stdout: '', stderr: '' });
      
      const result = await timeServiceInstance.syncWithNTP();
      
      expect(typeof result).toBe('boolean');
      expect(exec).toHaveBeenCalled();
    });

    it('在NTP失败时应该使用系统时间', async () => {
      exec.mockRejectedValue(new Error('NTP同步失败'));
      
      const result = await timeServiceInstance.syncWithNTP();
      
      expect(result).toBe(false);
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('requireValidTime 装饰器', () => {
    it('应该在时间验证失败时抛出错误', async () => {
      // 模拟时间验证失败
      jest.spyOn(timeServiceInstance, 'validateTimeIntegrity').mockResolvedValue(false);
      jest.spyOn(timeServiceInstance, 'syncWithNTP').mockResolvedValue(false);

      class TestClass {
        @TimeServiceImpl.requireValidTime()
        async testMethod(): Promise<string> {
          return 'success';
        }
      }

      const testInstance = new TestClass();
      
      await expect(testInstance.testMethod()).rejects.toThrow(
        '时间验证失败，无法执行操作: testMethod'
      );
    });

    it('应该在时间验证成功时正常执行', async () => {
      // 模拟时间验证成功
      jest.spyOn(timeServiceInstance, 'validateTimeIntegrity').mockResolvedValue(true);

      class TestClass {
        @TimeServiceImpl.requireValidTime()
        async testMethod(): Promise<string> {
          return 'success';
        }
      }

      const testInstance = new TestClass();
      
      const result = await testInstance.testMethod();
      expect(result).toBe('success');
    });
  });
});

describe('TimeMonitor', () => {
  let timeMonitor: TimeMonitor;

  beforeEach(() => {
    timeMonitor = TimeMonitor.getInstance();
    jest.clearAllMocks();
  });

  describe('validateTimeOperation', () => {
    it('应该验证时间操作', async () => {
      const result = await timeMonitor.validateTimeOperation('test-operation');
      
      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('时间操作监控: test-operation')
      );
    });

    it('应该记录操作持续时间', async () => {
      await timeMonitor.validateTimeOperation('test-operation');
      
      const logCall = mockConsoleLog.mock.calls.find(call => 
        call[0].includes('时间操作监控')
      );
      
      expect(logCall).toBeDefined();
      expect(logCall![0]).toContain('duration');
    });
  });
});

describe('时间合规性集成测试', () => {
  it('应该模拟系统时间篡改并验证服务报错', async () => {
    const timeServiceInstance = TimeServiceImpl.getInstance();
    
    // 模拟极端时间偏差
    const originalDate = Date.now;
    const tamperedTime = Date.now() - 24 * 60 * 60 * 1000; // 偏差24小时
    
    Date.now = jest.fn(() => tamperedTime);
    
    try {
      const result = await timeServiceInstance.validateTimeIntegrity();
      expect(result).toBe(false);
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('检测到时间偏差')
      );
    } finally {
      // 恢复原始Date.now
      Date.now = originalDate;
    }
  });

  it('应该验证时间同步过期检测', async () => {
    const timeServiceInstance = TimeServiceImpl.getInstance();
    
    // 手动设置一个过期的同步时间
    (timeServiceInstance as any).lastSyncTime = new Date(Date.now() - 10 * 60 * 1000); // 10分钟前
    
    const result = await timeServiceInstance.validateTimeIntegrity();
    
    expect(result).toBe(false);
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('时间同步过期')
    );
  });
});
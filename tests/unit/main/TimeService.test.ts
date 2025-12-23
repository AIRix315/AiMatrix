/**
 * TimeService 单元测试
 * 验证时间服务与合规层的功能
 */

import { TimeServiceImpl, TimeMonitor, timeService } from '../../../src/main/services/TimeService';

// Mock child_process 模块
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock console 方法以减少测试输出噪音
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('TimeService', () => {
  let timeServiceInstance: TimeServiceImpl;

  beforeEach(() => {
    timeServiceInstance = TimeServiceImpl.getInstance();
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

    it('应该检测时间同步过期', async () => {
      // 设置一个过期的同步时间
      const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10分钟前
      timeServiceInstance['lastSyncTime'] = pastTime;
      
      const result = await timeServiceInstance.validateTimeIntegrity();
      
      expect(result).toBe(false);
    });

    it('应该处理时间验证过程中的异常', async () => {
      // Mock getCurrentTime 抛出异常
      const originalGetCurrentTime = timeServiceInstance.getCurrentTime;
      timeServiceInstance.getCurrentTime = jest.fn().mockRejectedValue(new Error('时间获取失败'));
      
      try {
        const result = await timeServiceInstance.validateTimeIntegrity();
        expect(result).toBe(false);
      } finally {
        // 恢复原始方法
        timeServiceInstance.getCurrentTime = originalGetCurrentTime;
      }
    });
  });

  describe('syncWithNTP', () => {
    const { exec } = require('child_process');
    
    beforeEach(() => {
      jest.clearAllMocks();
      // 减少测试输出噪音
      console.error = jest.fn();
      console.warn = jest.fn();
    });

    afterEach(() => {
      // 恢复 console 方法
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    });

    it('应该尝试与NTP服务器同步', async () => {
      // Mock exec 成功
      exec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });
      
      const result = await timeServiceInstance.syncWithNTP();
      
      expect(typeof result).toBe('boolean');
      expect(exec).toHaveBeenCalled();
    });

    it('在NTP失败时应该使用系统时间', async () => {
      // Mock exec 失败
      exec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('NTP同步失败'), null);
      });
      
      const result = await timeServiceInstance.syncWithNTP();
      
      expect(result).toBe(false);
      expect(exec).toHaveBeenCalled();
    });

    it('应该处理NTP同步过程中的异常', async () => {
      // Mock exec 抛出异常
      exec.mockImplementation((cmd: string, callback: Function) => {
        throw new Error('NTP同步过程异常');
      });
      
      const result = await timeServiceInstance.syncWithNTP();
      
      expect(result).toBe(false);
    });

    it('应该在不同平台上使用正确的NTP命令', async () => {
      // 保存原始平台
      const originalPlatform = process.platform;
      
      try {
        // 测试 Windows 平台
        Object.defineProperty(process, 'platform', {
          value: 'win32',
          writable: true
        });
        
        exec.mockImplementation((cmd: string, callback: Function) => {
          expect(cmd).toContain('w32tm');
          callback(null, { stdout: '', stderr: '' });
        });
        
        await timeServiceInstance.syncWithNTP();
        
        // 测试 macOS 平台
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
          writable: true
        });
        
        exec.mockImplementation((cmd: string, callback: Function) => {
          expect(cmd).toContain('sntp');
          callback(null, { stdout: '', stderr: '' });
        });
        
        await timeServiceInstance.syncWithNTP();
        
        // 测试 Linux 平台
        Object.defineProperty(process, 'platform', {
          value: 'linux',
          writable: true
        });
        
        exec.mockImplementation((cmd: string, callback: Function) => {
          expect(cmd).toContain('ntpdate');
          callback(null, { stdout: '', stderr: '' });
        });
        
        await timeServiceInstance.syncWithNTP();
      } finally {
        // 恢复原始平台
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          writable: true
        });
      }
    });
  });
  
  describe('TimeService 装饰器', () => {
    let timeServiceInstance: TimeServiceImpl;
  
    beforeEach(() => {
      timeServiceInstance = TimeServiceImpl.getInstance();
      // 减少测试输出噪音
      console.log = jest.fn();
      console.warn = jest.fn();
      console.error = jest.fn();
    });
  
    afterEach(() => {
      // 恢复 console 方法
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    });
  
    describe('requireValidTime 装饰器', () => {
      it('应该正确处理没有描述符的情况', () => {
        // 测试装饰器对没有描述符的处理
        const decorator = TimeServiceImpl.requireValidTime();
        const target = {};
        const propertyKey = 'testProperty';
        
        // 没有描述符时应该返回 undefined
        const result = decorator(target, propertyKey, undefined);
        expect(result).toBeUndefined();
      });
  
      it('应该在时间有效时正常执行方法', async () => {
        // Mock 时间验证成功
        const originalValidateTimeIntegrity = timeServiceInstance.validateTimeIntegrity;
        timeServiceInstance.validateTimeIntegrity = jest.fn().mockResolvedValue(true);
  
        // 创建一个简单的对象和方法
        const target = {};
        const propertyKey = 'testMethod';
        const originalMethod = jest.fn().mockResolvedValue('success');
        const descriptor = { value: originalMethod };
  
        // 应用装饰器
        const decorator = TimeServiceImpl.requireValidTime();
        const newDescriptor = decorator(target, propertyKey, descriptor);
  
        // 验证装饰器返回了新的描述符
        expect(newDescriptor).toBeDefined();
        expect(newDescriptor!.value).toBeDefined();
  
        // 执行装饰后的方法
        const result = await newDescriptor!.value.call(target);
        
        expect(result).toBe('success');
        expect(timeServiceInstance.validateTimeIntegrity).toHaveBeenCalled();
        
        // 恢复原始方法
        timeServiceInstance.validateTimeIntegrity = originalValidateTimeIntegrity;
      });
  
      it('应该在时间无效时尝试同步并失败', async () => {
        // Mock 时间验证失败
        const originalValidateTimeIntegrity = timeServiceInstance.validateTimeIntegrity;
        timeServiceInstance.validateTimeIntegrity = jest.fn().mockResolvedValue(false);
        
        // Mock NTP 同步失败
        const originalSyncWithNTP = timeServiceInstance.syncWithNTP;
        timeServiceInstance.syncWithNTP = jest.fn().mockResolvedValue(false);
  
        // 创建一个简单的对象和方法
        const target = {};
        const propertyKey = 'testMethod';
        const originalMethod = jest.fn().mockResolvedValue('success');
        const descriptor = { value: originalMethod };
  
        // 应用装饰器
        const decorator = TimeServiceImpl.requireValidTime();
        const newDescriptor = decorator(target, propertyKey, descriptor);
  
        // 执行装饰后的方法
        await expect(newDescriptor!.value.call(target)).rejects.toThrow('时间验证失败，无法执行操作: testMethod');
        expect(timeServiceInstance.validateTimeIntegrity).toHaveBeenCalled();
        expect(timeServiceInstance.syncWithNTP).toHaveBeenCalled();
        
        // 恢复原始方法
        timeServiceInstance.validateTimeIntegrity = originalValidateTimeIntegrity;
        timeServiceInstance.syncWithNTP = originalSyncWithNTP;
      });
    });
  });
});

describe('TimeMonitor', () => {
  let timeMonitor: TimeMonitor;
  let timeServiceInstance: TimeServiceImpl;

  beforeEach(() => {
    timeMonitor = TimeMonitor.getInstance();
    timeServiceInstance = TimeServiceImpl.getInstance();
    // 减少测试输出噪音
    console.log = jest.fn();
  });

  afterEach(() => {
    // 恢复 console 方法
    console.log = originalConsoleLog;
  });

  describe('validateTimeOperation', () => {
    it('应该验证时间操作', async () => {
      const result = await timeMonitor.validateTimeOperation('test-operation');
      
      expect(result).toBe(true);
    });

    it('应该处理时间操作验证过程中的异常', async () => {
      // Mock getCurrentTime 抛出异常（第二次调用时）
      const originalGetCurrentTime = timeServiceInstance.getCurrentTime;
      let callCount = 0;
      timeServiceInstance.getCurrentTime = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('时间操作验证失败'));
        }
        return Promise.resolve(new Date());
      });
      
      try {
        const result = await timeMonitor.validateTimeOperation('test-operation');
        expect(result).toBe(false);
      } finally {
        // 恢复原始方法
        timeServiceInstance.getCurrentTime = originalGetCurrentTime;
      }
    });
  });
});

describe('时间合规性集成测试', () => {
  let timeServiceInstance: TimeServiceImpl;

  beforeEach(() => {
    timeServiceInstance = TimeServiceImpl.getInstance();
    // 减少测试输出噪音
    console.log = jest.fn();
  });

  afterEach(() => {
    // 恢复 console 方法
    console.log = originalConsoleLog;
  });

  it('应该模拟系统时间篡改并验证服务报错', async () => {
    // 保存原始方法
    const originalDateNow = Date.now;
    const originalGetTime = Date.prototype.getTime;
    
    // 模拟极端时间偏差（24小时前）
    const realNow = Date.now();
    const tamperedTime = realNow - 24 * 60 * 60 * 1000; // 24小时前
    
    // Mock Date.now 和 getTime
    Date.now = jest.fn(() => tamperedTime);
    Date.prototype.getTime = jest.fn(function(this: Date) {
      return tamperedTime;
    });
    
    try {
      // 获取当前时间以验证 Mock 是否生效
      const currentTime = await timeServiceInstance.getCurrentTime();
      
      // 手动验证时间偏差 - 这里应该有偏差，因为我们在 validateTimeIntegrity 中
      // 会再次调用 Date.now()，但 currentTime.getTime() 返回的是 tamperedTime
      const timeDiff = Math.abs(currentTime.getTime() - Date.now());
      
      // 验证我们的 Mock 创建了时间偏差
      expect(timeDiff).toBe(0); // 两个都是 tamperedTime，所以偏差为0
      
      // 现在修改 Date.now 来创建偏差
      const realTimeForValidation = realNow;
      Date.now = jest.fn(() => realTimeForValidation);
      
      const result = await timeServiceInstance.validateTimeIntegrity();
      expect(result).toBe(false);
    } finally {
      // 恢复原始方法
      Date.now = originalDateNow;
      Date.prototype.getTime = originalGetTime;
    }
  });
});

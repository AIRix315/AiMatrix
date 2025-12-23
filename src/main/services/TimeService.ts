/**
 * 时间服务与合规层
 * 
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 * 
 * 参考：docs/00-global-requirements-v1.0.0.md
 */

import { app } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TimeService {
  getCurrentTime(): Promise<Date>;
  getUTCTime(): Promise<string>;
  getLocalTime(): Promise<string>;
  syncWithNTP(): Promise<boolean>;
  validateTimeIntegrity(): Promise<boolean>;
}

export class TimeServiceImpl implements TimeService {
  private static instance: TimeServiceImpl;
  private lastSyncTime: Date | null = null;
  private timeDriftThreshold = 5000; // 5秒时间偏差阈值
  private ntpServers = [
    'pool.ntp.org',
    'time.nist.gov',
    'time.google.com'
  ];

  public static getInstance(): TimeServiceImpl {
    if (!TimeServiceImpl.instance) {
      TimeServiceImpl.instance = new TimeServiceImpl();
    }
    return TimeServiceImpl.instance;
  }

  /**
   * 获取当前系统时间
   * @returns Promise<Date> 当前时间
   */
  public async getCurrentTime(): Promise<Date> {
    const now = new Date();
    
    // 记录时间获取操作
    await this.logTimeOperation('getCurrentTime', now);
    
    return now;
  }

  /**
   * 获取UTC时间字符串（ISO 8601格式）
   * @returns Promise<string> UTC时间字符串
   */
  public async getUTCTime(): Promise<string> {
    const now = await this.getCurrentTime();
    return now.toISOString();
  }

  /**
   * 获取本地时间字符串
   * @returns Promise<string> 本地时间字符串
   */
  public async getLocalTime(): Promise<string> {
    const now = await this.getCurrentTime();
    return now.toLocaleString();
  }

  /**
   * 与NTP服务器同步时间
   * @returns Promise<boolean> 同步是否成功
   */
  public async syncWithNTP(): Promise<boolean> {
    try {
      // 尝试多个NTP服务器
      for (const server of this.ntpServers) {
        try {
          const success = await this.syncWithNTPServer(server);
          if (success) {
            this.lastSyncTime = await this.getCurrentTime();
            await this.logTimeOperation('syncWithNTP', this.lastSyncTime, { server });
            return true;
          }
        } catch (error) {
          console.warn(`NTP同步失败 ${server}:`, error);
        }
      }
      
      // 如果所有NTP服务器都失败，使用系统时间
      this.lastSyncTime = await this.getCurrentTime();
      await this.logTimeOperation('syncWithNTP_fallback', this.lastSyncTime);
      return false;
    } catch (error) {
      console.error('NTP同步过程中发生错误:', error);
      return false;
    }
  }

  /**
   * 验证时间完整性
   * @returns Promise<boolean> 时间是否有效
   */
  public async validateTimeIntegrity(): Promise<boolean> {
    try {
      const currentTime = await this.getCurrentTime();
      
      // 检查时间是否在合理范围内
      const now = Date.now();
      const timeDiff = Math.abs(currentTime.getTime() - now);
      
      if (timeDiff > this.timeDriftThreshold) {
        console.warn(`检测到时间偏差: ${timeDiff}ms`);
        return false;
      }
      
      // 检查上次同步时间
      if (this.lastSyncTime) {
        const syncAge = currentTime.getTime() - this.lastSyncTime.getTime();
        const maxSyncAge = 5 * 60 * 1000; // 5分钟
        
        if (syncAge > maxSyncAge) {
          console.warn(`时间同步过期: ${syncAge}ms`);
          return false;
        }
      }
      
      await this.logTimeOperation('validateTimeIntegrity', currentTime, { isValid: true });
      return true;
    } catch (error) {
      console.error('时间验证失败:', error);
      return false;
    }
  }

  /**
   * 与特定NTP服务器同步
   * @private
   */
  private async syncWithNTPServer(server: string): Promise<boolean> {
    try {
      // 根据操作系统选择不同的时间同步命令
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Windows使用w32tm
        await execAsync(`w32tm /resync /force`);
      } else if (platform === 'darwin') {
        // macOS使用sntp
        await execAsync(`sntp -sS ${server}`);
      } else if (platform === 'linux') {
        // Linux使用ntpdate或chrony
        try {
          await execAsync(`ntpdate -u ${server}`);
        } catch {
          await execAsync(`chronyc sources || chronyc makestep`);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`与NTP服务器 ${server} 同步失败:`, error);
      return false;
    }
  }

  /**
   * 记录时间操作
   * @private
   */
  private async logTimeOperation(operation: string, timestamp: Date, data?: any): Promise<void> {
    const logEntry = {
      level: 'info',
      message: `时间操作: ${operation}`,
      timestamp: timestamp.toISOString(),
      service: 'TimeService',
      operation,
      data: data || {}
    };
    
    // 这里可以集成到项目的日志系统
    console.log('TimeService Log:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * 强制时间查询装饰器
   * 确保被装饰的方法在执行前验证时间有效性
   */
  public static requireValidTime() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const timeService = TimeServiceImpl.getInstance();
        const isTimeValid = await timeService.validateTimeIntegrity();
        
        if (!isTimeValid) {
          // 尝试重新同步时间
          const syncSuccess = await timeService.syncWithNTP();
          if (!syncSuccess) {
            throw new Error(`时间验证失败，无法执行操作: ${propertyKey}`);
          }
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
}

/**
 * 时间监控服务
 * 监控时间操作的合规性
 */
export class TimeMonitor {
  private static instance: TimeMonitor;
  
  public static getInstance(): TimeMonitor {
    if (!TimeMonitor.instance) {
      TimeMonitor.instance = new TimeMonitor();
    }
    return TimeMonitor.instance;
  }
  
  /**
   * 验证时间操作
   */
  public async validateTimeOperation(operation: string): Promise<boolean> {
    const timeService = TimeServiceImpl.getInstance();
    const startTime = await timeService.getCurrentTime();
    
    try {
      // 这里可以执行具体的操作
      const endTime = await timeService.getCurrentTime();
      
      // 记录时间操作
      this.logTimeOperation(operation, startTime, endTime);
      return true;
    } catch (error) {
      console.error(`时间操作验证失败: ${operation}`, error);
      return false;
    }
  }
  
  /**
   * 记录时间操作
   * @private
   */
  private logTimeOperation(operation: string, start: Date, end: Date): void {
    const duration = end.getTime() - start.getTime();
    
    const logEntry = {
      level: 'info',
      message: `时间操作监控: ${operation}`,
      timestamp: end.toISOString(),
      service: 'TimeMonitor',
      operation,
      duration: `${duration}ms`,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };
    
    console.log('TimeMonitor Log:', JSON.stringify(logEntry, null, 2));
  }
}

// 导出单例实例
export const timeService = TimeServiceImpl.getInstance();
export const timeMonitor = TimeMonitor.getInstance();
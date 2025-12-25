/**
 * Logger 服务 - 统一日志管理
 *
 * MVP 功能：
 * - 日志级别（debug/info/warn/error）
 * - 日志输出到文件
 * - 日志轮转（按大小）
 * - 新命名格式：YYYY-MM-DD_HH-mm-ss_{SessionID}.log
 * - 动态路径切换（通过 ConfigManager 监听）
 *
 * 后续迭代：
 * - 远程日志上报
 * - 日志加密
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';
import { LogEntry } from '../../common/types';
import type { ConfigManager } from './ConfigManager';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志级别类型
 */
export type LogLevelType = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger 配置接口
 */
export interface LoggerConfig {
  logDir?: string;
  maxFileSize?: number; // 单位：字节
  enableConsole?: boolean;
  minLevel?: LogLevel;
  configManager?: ConfigManager; // ConfigManager 实例，用于监听配置变更
}

/**
 * Logger 服务类
 */
export class Logger {
  private logDir: string;
  private maxFileSize: number;
  private enableConsole: boolean;
  private minLevel: LogLevel;
  private currentLogFile: string;
  private sessionId: string;
  private configManager?: ConfigManager;

  // 日志级别优先级映射
  private static levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  constructor(config: LoggerConfig = {}) {
    this.logDir = config.logDir || path.join(app.getPath('userData'), 'logs');
    this.maxFileSize = config.maxFileSize || 5 * 1024 * 1024; // 默认 5MB
    this.enableConsole = config.enableConsole !== false; // 默认开启
    this.minLevel = config.minLevel || LogLevel.INFO;
    this.configManager = config.configManager;

    // 生成 Session ID（8位随机字符串）
    this.sessionId = crypto.randomBytes(4).toString('hex');

    this.currentLogFile = this.getLogFilePath();

    // 确保日志目录存在
    this.ensureLogDir().catch(error => {
      console.error('[Logger] Failed to create log directory:', error);
    });

    // 如果传入了 ConfigManager，监听配置变更
    if (this.configManager) {
      this.configManager.onConfigChange((newConfig) => {
        const newLogPath = newConfig.general.logging.savePath;
        if (newLogPath !== this.logDir) {
          this.switchLogDirectory(newLogPath).catch(error => {
            console.error('[Logger] Failed to switch log directory:', error);
          });
        }
      });
    }
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogDir(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * 获取当前日志文件路径
   * 格式：YYYY-MM-DD_HH-mm-ss_{SessionID}.log
   */
  private getLogFilePath(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const fileName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_${this.sessionId}.log`;
    return path.join(this.logDir, fileName);
  }

  /**
   * 切换日志目录
   */
  private async switchLogDirectory(newLogDir: string): Promise<void> {
    await this.info('日志路径变更，切换到新目录', 'Logger', {
      oldPath: this.logDir,
      newPath: newLogDir
    });

    this.logDir = newLogDir;
    await this.ensureLogDir();

    // 生成新的日志文件路径（保持同一个 sessionId）
    this.currentLogFile = this.getLogFilePath();

    await this.info('日志路径切换完成', 'Logger', { newPath: newLogDir });
  }

  /**
   * 检查是否需要轮转日志文件
   */
  private async checkRotation(): Promise<void> {
    try {
      const stats = await fs.stat(this.currentLogFile);
      if (stats.size >= this.maxFileSize) {
        // 需要轮转
        const timestamp = Date.now();
        const rotatedFile = this.currentLogFile.replace('.log', `.${timestamp}.log`);
        await fs.rename(this.currentLogFile, rotatedFile);

        // 更新当前日志文件路径
        this.currentLogFile = this.getLogFilePath();
      }
    } catch (error) {
      // 文件不存在或其他错误，忽略
    }
  }

  /**
   * 判断是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      entry.timestamp.toISOString(),
      `[${entry.level.toUpperCase()}]`
    ];

    if (entry.service) {
      parts.push(`[${entry.service}]`);
    }

    parts.push(entry.message);

    if (entry.data) {
      parts.push(JSON.stringify(entry.data));
    }

    return parts.join(' ');
  }

  /**
   * 写入日志到文件
   */
  private async writeToFile(formattedLog: string): Promise<void> {
    try {
      await this.checkRotation();
      await fs.appendFile(this.currentLogFile, formattedLog + '\n', 'utf-8');
    } catch (error) {
      console.error('[Logger] Failed to write log:', error);
    }
  }

  /**
   * 核心日志记录方法
   */
  private async log(level: LogLevel, message: string, service?: string, data?: unknown): Promise<void> {
    // 检查是否应该记录该级别的日志
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level: level as LogLevelType,
      service,
      message,
      data
    };

    const formattedLog = this.formatLogEntry(entry);

    // 输出到控制台
    if (this.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedLog);
          break;
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.log(formattedLog);
          break;
        case LogLevel.WARN:
          console.warn(formattedLog);
          break;
        case LogLevel.ERROR:
          console.error(formattedLog);
          break;
      }
    }

    // 写入文件
    await this.writeToFile(formattedLog);
  }

  /**
   * 记录 DEBUG 级别日志
   */
  public async debug(message: string, service?: string, data?: unknown): Promise<void> {
    await this.log(LogLevel.DEBUG, message, service, data);
  }

  /**
   * 记录 INFO 级别日志
   */
  public async info(message: string, service?: string, data?: unknown): Promise<void> {
    await this.log(LogLevel.INFO, message, service, data);
  }

  /**
   * 记录 WARN 级别日志
   */
  public async warn(message: string, service?: string, data?: unknown): Promise<void> {
    await this.log(LogLevel.WARN, message, service, data);
  }

  /**
   * 记录 ERROR 级别日志
   */
  public async error(message: string, service?: string, data?: unknown): Promise<void> {
    await this.log(LogLevel.ERROR, message, service, data);
  }

  /**
   * 清理旧日志文件（保留最近 N 天）
   */
  public async cleanOldLogs(daysToKeep: number = 7): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            await fs.unlink(filePath);
            await this.info(`Deleted old log file: ${file}`, 'Logger');
          }
        }
      }
    } catch (error) {
      console.error('[Logger] Failed to clean old logs:', error);
    }
  }

  /**
   * 获取日志目录路径
   */
  public getLogDirectory(): string {
    return this.logDir;
  }
}

// 导出单例实例
// 注意：在主进程中应该使用 configManager 重新初始化 Logger
export const logger = new Logger({
  enableConsole: true,
  minLevel: LogLevel.INFO
  // configManager 将在主进程初始化时设置
});

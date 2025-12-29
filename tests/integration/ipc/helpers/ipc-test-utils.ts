/**
 * IPC 测试工具函数
 * 提供 IPC 通道测试的辅助功能
 */

import { vi } from 'vitest';
import { ipcMain } from 'electron';
import * as path from 'path';
import { promises as fs } from 'fs';
import { FileSystemService } from '../../../../src/main/services/FileSystemService';

/**
 * IPC 处理器类型
 */
type IPCHandler = (event: any, ...args: any[]) => Promise<any> | any;

/**
 * IPC 调用结果
 */
export interface IPCResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * IPC 测试上下文
 */
export class IPCTestContext {
  private handlers: Map<string, IPCHandler> = new Map();
  private testDataDir: string;
  private fsService: FileSystemService | null = null;

  constructor(testName: string) {
    const timestamp = Date.now();
    this.testDataDir = path.join(process.cwd(), 'test-data', `ipc-${testName}-${timestamp}`);
  }

  /**
   * 初始化测试环境
   */
  async setup(): Promise<void> {
    // 创建测试数据目录
    await fs.mkdir(this.testDataDir, { recursive: true });

    // 初始化文件系统服务
    this.fsService = new FileSystemService();
    await this.fsService.initialize(this.testDataDir);
  }

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    // 清除所有 IPC 处理器
    this.handlers.clear();

    // 清理文件系统服务引用
    this.fsService = null;

    // 删除测试数据目录
    try {
      await fs.rm(this.testDataDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略删除错误
    }
  }

  /**
   * 获取测试数据目录
   */
  getTestDataDir(): string {
    return this.testDataDir;
  }

  /**
   * 获取文件系统服务
   */
  getFileSystemService(): FileSystemService {
    if (!this.fsService) {
      throw new Error('FileSystemService not initialized. Call setup() first.');
    }
    return this.fsService;
  }

  /**
   * 注册 IPC 处理器（用于测试）
   */
  registerHandler(channel: string, handler: IPCHandler): void {
    this.handlers.set(channel, handler);
  }

  /**
   * 模拟 IPC 调用
   */
  async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }

    // 模拟 Electron IPC event 对象
    const mockEvent = {
      sender: {
        send: vi.fn()
      }
    };

    try {
      const result = await handler(mockEvent, ...args);
      return result as T;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 批量调用（用于并发测试）
   */
  async invokeBatch<T = any>(channel: string, argsList: any[][]): Promise<T[]> {
    const promises = argsList.map(args => this.invoke<T>(channel, ...args));
    return await Promise.all(promises);
  }

  /**
   * 测试性能（返回执行时间，毫秒）
   */
  async measurePerformance(channel: string, ...args: any[]): Promise<number> {
    const startTime = performance.now();
    await this.invoke(channel, ...args);
    const endTime = performance.now();
    return endTime - startTime;
  }
}

/**
 * 创建测试文件
 */
export async function createTestFile(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * 创建测试 JSON 文件
 */
export async function createTestJSON(dir: string, filename: string, data: any): Promise<string> {
  const content = JSON.stringify(data, null, 2);
  return await createTestFile(dir, filename, content);
}

/**
 * 读取测试文件
 */
export async function readTestFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * 读取测试 JSON 文件
 */
export async function readTestJSON<T = any>(filePath: string): Promise<T> {
  const content = await readTestFile(filePath);
  return JSON.parse(content) as T;
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 等待指定时间（用于异步测试）
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 断言 IPC 结果成功
 */
export function assertIPCSuccess<T = any>(result: IPCResult<T>): T {
  if (!result || typeof result !== 'object') {
    throw new Error(`Invalid IPC result: ${JSON.stringify(result)}`);
  }
  if (!result.success) {
    throw new Error(`IPC call failed: ${result.error || 'Unknown error'}`);
  }
  return result.data as T;
}

/**
 * 断言 IPC 结果失败
 */
export function assertIPCFailure(result: IPCResult): string {
  if (!result || typeof result !== 'object') {
    throw new Error(`Invalid IPC result: ${JSON.stringify(result)}`);
  }
  if (result.success) {
    throw new Error('Expected IPC call to fail, but it succeeded');
  }
  return result.error || 'Unknown error';
}

/**
 * Mock ipcMain.handle 方法
 * 返回一个可以直接调用的处理器函数
 */
export function mockIPCHandler(ctx: IPCTestContext): typeof ipcMain.handle {
  return (channel: string, handler: IPCHandler) => {
    ctx.registerHandler(channel, handler);
    // 返回 ipcMain 以支持链式调用
    return ipcMain as any;
  };
}

/**
 * 性能基准断言
 */
export function assertPerformance(durationMs: number, maxMs: number, operation: string): void {
  if (durationMs > maxMs) {
    throw new Error(
      `Performance benchmark failed for "${operation}": ` +
      `took ${durationMs.toFixed(2)}ms, expected <${maxMs}ms`
    );
  }
}

/**
 * 生成测试数据
 */
export const TestDataGenerator = {
  /**
   * 生成随机字符串
   */
  randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * 生成随机ID
   */
  randomId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  },

  /**
   * 生成测试项目配置
   */
  projectConfig(overrides?: any): any {
    return {
      name: `Test Project ${this.randomString(5)}`,
      description: 'Test project description',
      workflowType: 'novel-to-video',
      pluginId: 'novel-to-video',
      status: 'active',
      inputAssets: [],
      outputAssets: [],
      immutable: false,
      ...overrides
    };
  },

  /**
   * 生成测试资产元数据
   */
  assetMetadata(overrides?: any): any {
    return {
      fileName: `test-asset-${this.randomString(5)}.png`,
      filePath: `/assets/test-asset-${this.randomString(5)}.png`,
      fileSize: 1024,
      mimeType: 'image/png',
      category: 'image',
      tags: ['test'],
      aiGenerated: false,
      projectId: null,
      isUserUploaded: true,
      ...overrides
    };
  },

  /**
   * 生成测试 API Provider 配置
   */
  apiProviderConfig(overrides?: any): any {
    return {
      id: `test-provider-${this.randomString(5)}`,
      name: 'Test Provider',
      type: 'openai',
      category: 'llm',
      enabled: true,
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      ...overrides
    };
  },

  /**
   * 生成测试模型定义
   */
  modelDefinition(overrides?: any): any {
    return {
      id: `test-model-${this.randomString(5)}`,
      name: 'Test Model',
      providerId: 'test-provider',
      category: 'llm',
      tags: ['test'],
      isBuiltIn: false,
      ...overrides
    };
  }
};

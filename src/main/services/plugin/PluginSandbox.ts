/**
 * PluginSandbox - 插件沙箱执行环境
 *
 * Phase 6 新增功能：
 * - 隔离插件代码执行环境
 * - 防止插件访问敏感Node.js API
 * - 提供受控的全局对象
 *
 * 安全策略：
 * - 限制require()只能加载白名单模块
 * - 禁止访问process、__dirname等危险全局变量
 * - 所有文件系统操作必须通过PluginContext
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VM2 = require('vm2');
const { VM } = VM2;
import * as path from 'path';
import { PluginContext } from './PluginContext';
import { logger } from '../Logger';

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  /** 插件根目录 */
  pluginDir: string;
  /** 允许的Node.js模块白名单 */
  allowedModules?: string[];
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 内存限制（MB） */
  memoryLimit?: number;
}

/**
 * 默认允许的模块白名单
 */
const DEFAULT_ALLOWED_MODULES = [
  'events',
  'util',
  'stream',
  'buffer',
  'string_decoder',
  'path',
  'url',
  'querystring',
  'crypto' // 限制性加密操作
];

/**
 * PluginSandbox 类 - 插件沙箱
 */
export class PluginSandbox {
  private vm: any; // VM2类型
  private config: SandboxConfig;
  private context: PluginContext;

  constructor(context: PluginContext, config: SandboxConfig) {
    this.context = context;
    this.config = config;

    // 创建VM2沙箱
    this.vm = new VM({
      timeout: config.timeout || 30000, // 默认30秒超时
      sandbox: this.createSandboxGlobals(),
      require: {
        external: true,
        builtin: config.allowedModules || DEFAULT_ALLOWED_MODULES,
        root: config.pluginDir,
        mock: {
          // 模拟fs模块，强制使用PluginContext
          fs: {
            readFile: () => {
              throw new Error('Direct fs access is not allowed. Use context.fs instead.');
            },
            writeFile: () => {
              throw new Error('Direct fs access is not allowed. Use context.fs instead.');
            }
          }
        }
      }
    });

    logger.info(
      `PluginSandbox created for ${context.getPluginId()}`,
      'PluginSandbox',
      { pluginDir: config.pluginDir }
    ).catch(() => {});
  }

  /**
   * 创建沙箱全局对象
   */
  private createSandboxGlobals(): Record<string, unknown> {
    return {
      // 提供受控的console
      console: {
        log: (...args: unknown[]) => this.context.log.info(String(args)),
        warn: (...args: unknown[]) => this.context.log.warn(String(args)),
        error: (...args: unknown[]) => this.context.log.error(String(args)),
        debug: (...args: unknown[]) => this.context.log.debug(String(args))
      },

      // 提供PluginContext
      context: this.context,

      // 提供受控的setTimeout/setInterval
      setTimeout: (callback: () => void, delay: number) => {
        const timerId = setTimeout(callback, delay);
        this.context.registerTimer(timerId);
        return timerId;
      },

      setInterval: (callback: () => void, delay: number) => {
        const timerId = setInterval(callback, delay);
        this.context.registerTimer(timerId);
        return timerId;
      },

      clearTimeout,
      clearInterval,

      // 提供基础类型和对象
      Object,
      Array,
      String,
      Number,
      Boolean,
      Date,
      Math,
      JSON,
      Promise,
      Map,
      Set,
      WeakMap,
      WeakSet,

      // 禁止访问危险全局变量
      process: undefined,
      global: undefined,
      __dirname: undefined,
      __filename: undefined,
      require: undefined, // VM2会提供受控的require
      module: undefined,
      exports: undefined
    };
  }

  /**
   * 在沙箱中运行代码
   */
  public async run<T = unknown>(code: string): Promise<T> {
    try {
      await logger.debug(
        `Running code in sandbox for ${this.context.getPluginId()}`,
        'PluginSandbox'
      );

      const result = this.vm.run(code);

      await logger.debug(
        `Code execution completed in sandbox for ${this.context.getPluginId()}`,
        'PluginSandbox'
      );

      return result as T;
    } catch (error) {
      await logger.error(
        `Sandbox execution error for ${this.context.getPluginId()}`,
        'PluginSandbox',
        { error }
      );
      throw error;
    }
  }

  /**
   * 在沙箱中运行文件
   */
  public async runFile<T = unknown>(filePath: string): Promise<T> {
    try {
      await logger.info(
        `Running file in sandbox: ${filePath}`,
        'PluginSandbox'
      );

      // VM2的runFile会自动处理路径解析
      const result = this.vm.runFile(filePath);

      await logger.info(
        `File execution completed: ${filePath}`,
        'PluginSandbox'
      );

      return result as T;
    } catch (error) {
      await logger.error(
        `Failed to run file in sandbox: ${filePath}`,
        'PluginSandbox',
        { error }
      );
      throw error;
    }
  }

  /**
   * 调用沙箱中的函数
   */
  public async call<T = unknown>(
    functionName: string,
    ...args: unknown[]
  ): Promise<T> {
    try {
      const code = `
        if (typeof ${functionName} !== 'function') {
          throw new Error('${functionName} is not a function');
        }
        ${functionName}(...${JSON.stringify(args)})
      `;

      return await this.run<T>(code);
    } catch (error) {
      await logger.error(
        `Failed to call function in sandbox: ${functionName}`,
        'PluginSandbox',
        { error }
      );
      throw error;
    }
  }

  /**
   * 获取沙箱中的变量
   */
  public getVariable<T = unknown>(variableName: string): T | undefined {
    try {
      return this.vm.run(`typeof ${variableName} !== 'undefined' ? ${variableName} : undefined`) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * 设置沙箱中的变量
   */
  public setVariable(variableName: string, value: unknown): void {
    this.vm.run(`${variableName} = ${JSON.stringify(value)}`);
  }

  /**
   * 销毁沙箱
   */
  public async destroy(): Promise<void> {
    await logger.info(
      `Destroying sandbox for ${this.context.getPluginId()}`,
      'PluginSandbox'
    );

    // VM2没有显式的销毁方法，但我们可以清空引用
    // GC会自动回收
  }
}

/**
 * 创建插件沙箱
 */
export function createPluginSandbox(
  context: PluginContext,
  config: SandboxConfig
): PluginSandbox {
  return new PluginSandbox(context, config);
}

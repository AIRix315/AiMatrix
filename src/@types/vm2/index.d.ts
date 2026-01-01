/**
 * VM2 类型定义
 *
 * VM2 是一个沙箱环境，可以安全地执行不受信任的代码
 * 提供隔离的 JavaScript 执行环境
 *
 * 参考：https://github.com/patriksimek/vm2
 */

declare module 'vm2' {
  /**
   * VM require 配置
   */
  export interface VMRequire {
    /** 是否允许外部模块 */
    external?: boolean | string[];
    /** 允许的内置模块白名单 */
    builtin?: string[];
    /** 模块根目录 */
    root?: string;
    /** 自定义模块解析 */
    resolve?: (moduleName: string) => string;
    /** 模拟模块 */
    mock?: Record<string, unknown>;
    /** 上下文 */
    context?: 'host' | 'sandbox';
    /** 是否允许转译 */
    import?: string[];
  }

  /**
   * VM 选项
   */
  export interface VMOptions {
    /** 执行超时时间（毫秒） */
    timeout?: number;
    /** 沙箱全局对象 */
    sandbox?: Record<string, unknown> | null;
    /** 编译器选项 */
    compiler?: 'javascript' | 'coffeescript' | 'typescript';
    /** require 配置 */
    require?: VMRequire | boolean;
    /** 是否使用严格模式 */
    strict?: boolean;
    /** 是否允许 eval */
    eval?: boolean;
    /** 是否允许 wasm */
    wasm?: boolean;
    /** 文件扩展名处理器 */
    fixAsync?: boolean;
  }

  /**
   * NodeVM require 配置（扩展版）
   */
  export interface NodeVMRequire extends VMRequire {
    /** 外部模块数组 */
    external?: boolean | string[] | { modules?: string[]; transitive?: boolean };
    /** 原生模块 */
    nativeModules?: string[];
  }

  /**
   * NodeVM 选项
   */
  export interface NodeVMOptions {
    /** 沙箱对象 */
    sandbox?: Record<string, unknown> | null;
    /** console 对象 */
    console?: 'inherit' | 'redirect' | 'off';
    /** require 配置 */
    require?: NodeVMRequire | boolean;
    /** 编译器 */
    compiler?: 'javascript' | 'coffeescript' | 'typescript';
    /** 执行超时（毫秒） */
    timeout?: number;
    /** Node.js 环境变量 */
    env?: Record<string, string>;
    /** argv 参数 */
    argv?: string[];
    /** 是否使用严格模式 */
    strict?: boolean;
    /** 是否允许 eval */
    eval?: boolean;
    /** 是否允许 wasm */
    wasm?: boolean;
    /** 包装器 */
    wrapper?: 'commonjs' | 'none';
    /** 源扩展名 */
    sourceExtensions?: string[];
  }

  /**
   * VM 类 - 简单沙箱环境
   */
  export class VM {
    /**
     * 创建 VM 实例
     * @param options VM 选项
     */
    constructor(options?: VMOptions);

    /**
     * 运行代码
     * @param code JavaScript 代码字符串
     * @param filename 文件名（用于错误堆栈）
     * @returns 执行结果
     */
    run(code: string, filename?: string): unknown;

    /**
     * 运行文件
     * @param filename 文件路径
     * @returns 执行结果
     */
    runFile(filename: string): unknown;

    /**
     * 冻结对象（防止沙箱修改）
     * @param object 要冻结的对象
     * @param name 对象名称
     */
    freeze(object: unknown, name?: string): unknown;

    /**
     * 保护对象（只读访问）
     * @param object 要保护的对象
     * @param name 对象名称
     */
    protect(object: unknown, name?: string): unknown;

    /**
     * 设置全局变量
     * @param name 变量名
     * @param value 变量值
     */
    setGlobal(name: string, value: unknown): this;

    /**
     * 获取全局变量
     * @param name 变量名
     */
    getGlobal(name: string): unknown;
  }

  /**
   * NodeVM 类 - 完整的 Node.js 沙箱环境
   */
  export class NodeVM {
    /**
     * 创建 NodeVM 实例
     * @param options NodeVM 选项
     */
    constructor(options?: NodeVMOptions);

    /**
     * 运行代码
     * @param code JavaScript 代码字符串
     * @param filename 文件名
     * @returns 模块导出对象
     */
    run(code: string, filename?: string): unknown;

    /**
     * 运行文件
     * @param filename 文件路径
     * @returns 模块导出对象
     */
    runFile(filename: string): unknown;

    /**
     * 冻结对象
     * @param object 要冻结的对象
     * @param name 对象名称
     */
    freeze(object: unknown, name?: string): unknown;

    /**
     * 保护对象
     * @param object 要保护的对象
     * @param name 对象名称
     */
    protect(object: unknown, name?: string): unknown;

    /**
     * 设置全局变量
     * @param name 变量名
     * @param value 变量值
     */
    setGlobal(name: string, value: unknown): this;

    /**
     * 获取全局变量
     * @param name 变量名
     */
    getGlobal(name: string): unknown;

    /**
     * require 模块
     * @param moduleName 模块名
     */
    require(moduleName: string): unknown;
  }

  /**
   * VMScript 类 - 预编译脚本
   */
  export class VMScript {
    /**
     * 创建预编译脚本
     * @param code JavaScript 代码
     * @param filename 文件名
     * @param options 编译选项
     */
    constructor(code: string, filename?: string, options?: { filename?: string; columnOffset?: number; lineOffset?: number });

    /**
     * 编译脚本
     */
    compile(): this;

    /**
     * 获取代码
     */
    readonly code: string;

    /**
     * 获取文件名
     */
    readonly filename?: string;
  }
}

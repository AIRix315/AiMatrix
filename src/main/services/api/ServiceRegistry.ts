/**
 * ServiceRegistry - 统一服务注册表
 *
 * Phase 6 新增功能：
 * - 统一管理所有核心能力（File, System, Network等）
 * - 为Phase 7的插件API暴露提供基础
 * - 支持命名空间隔离
 *
 * 设计理念：
 * - 所有服务必须在启动时注册
 * - 插件通过注册表调用服务（不直接import）
 * - 支持权限控制和调用追踪
 */

import { logger } from '../Logger';

/**
 * 服务定义
 */
export interface ServiceDefinition {
  namespace: string;
  name: string;
  description: string;
  version: string;
  methods: Record<string, (...args: unknown[]) => Promise<unknown>>;
  permissions?: string[];
}

/**
 * 服务调用记录
 */
export interface ServiceCallRecord {
  namespace: string;
  name: string;
  method: string;
  caller?: string;
  timestamp: string; // ISO 8601
  duration?: number;
  success: boolean;
  error?: string;
}

/**
 * ServiceRegistry 类
 */
export class ServiceRegistry {
  private services: Map<string, ServiceDefinition> = new Map();
  private callHistory: ServiceCallRecord[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    logger.info('ServiceRegistry initialized', 'ServiceRegistry').catch(() => {});
  }

  /**
   * 注册服务
   */
  public registerService(service: ServiceDefinition): void {
    const key = `${service.namespace}:${service.name}`;

    if (this.services.has(key)) {
      throw new Error(`Service already registered: ${key}`);
    }

    this.services.set(key, service);

    logger.info(`Service registered: ${key}`, 'ServiceRegistry', {
      version: service.version,
      methods: Object.keys(service.methods)
    }).catch(() => {});
  }

  /**
   * 取消注册服务
   */
  public unregisterService(namespace: string, name: string): void {
    const key = `${namespace}:${name}`;
    this.services.delete(key);

    logger.info(`Service unregistered: ${key}`, 'ServiceRegistry').catch(() => {});
  }

  /**
   * 调用服务方法
   */
  public async call(
    namespace: string,
    name: string,
    method: string,
    args: unknown[],
    caller?: string
  ): Promise<any> {
    const key = `${namespace}:${name}`;
    const service = this.services.get(key);

    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }

    if (!service.methods[method]) {
      throw new Error(`Method not found: ${key}.${method}`);
    }

    const startTime = Date.now();
    const record: ServiceCallRecord = {
      namespace,
      name,
      method,
      caller,
      timestamp: new Date().toISOString(),
      success: false
    };

    try {
      const result = await service.methods[method](...args);

      record.success = true;
      record.duration = Date.now() - startTime;

      this.recordCall(record);

      return result;
    } catch (error) {
      record.success = false;
      record.duration = Date.now() - startTime;
      record.error = error instanceof Error ? error.message : String(error);

      this.recordCall(record);

      throw error;
    }
  }

  /**
   * 记录调用历史
   */
  private recordCall(record: ServiceCallRecord): void {
    this.callHistory.push(record);

    // 限制历史记录大小
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory.shift();
    }

    logger.debug(
      `Service call: ${record.namespace}:${record.name}.${record.method}`,
      'ServiceRegistry',
      { duration: record.duration, success: record.success }
    ).catch(() => {});
  }

  /**
   * 获取服务列表
   */
  public listServices(): ServiceDefinition[] {
    return Array.from(this.services.values());
  }

  /**
   * 获取调用历史
   */
  public getCallHistory(limit?: number): ServiceCallRecord[] {
    if (limit) {
      return this.callHistory.slice(-limit);
    }
    return [...this.callHistory];
  }

  /**
   * 获取调用统计
   */
  public getCallStats(): {
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    byService: Record<string, { calls: number; errors: number }>;
  } {
    const totalCalls = this.callHistory.length;
    const successCalls = this.callHistory.filter(r => r.success).length;
    const totalDuration = this.callHistory.reduce((sum, r) => sum + (r.duration || 0), 0);

    const byService: Record<string, { calls: number; errors: number }> = {};

    for (const record of this.callHistory) {
      const key = `${record.namespace}:${record.name}`;
      if (!byService[key]) {
        byService[key] = { calls: 0, errors: 0 };
      }
      byService[key].calls++;
      if (!record.success) {
        byService[key].errors++;
      }
    }

    return {
      totalCalls,
      successRate: totalCalls > 0 ? successCalls / totalCalls : 0,
      averageDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      byService
    };
  }

  /**
   * 清空调用历史
   */
  public clearHistory(): void {
    this.callHistory = [];
    logger.info('Call history cleared', 'ServiceRegistry').catch(() => {});
  }
}

// 导出单例实例
export const serviceRegistry = new ServiceRegistry();

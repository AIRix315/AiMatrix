/**
 * CostMonitor - API成本监控
 *
 * Phase 6 新增功能：
 * - 跟踪LLM和生图API的Token/Credit使用量
 * - 成本估算和预警
 * - 使用量统计和报告
 *
 * 支持的计费模型：
 * - Token-based (OpenAI, Anthropic等)
 * - Credit-based (MidJourney等)
 * - Request-based (固定价格API)
 */

import { logger } from '../Logger';
import { timeService } from '../TimeService';

/**
 * 成本记录
 */
export interface CostRecord {
  id: string;
  apiName: string;
  provider: string;
  model?: string;
  timestamp: string; // ISO 8601
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  creditUsage?: number;
  estimatedCost?: number; // USD
  metadata?: Record<string, unknown>;
}

/**
 * 定价配置
 */
export interface PricingConfig {
  provider: string;
  model: string;
  unit: 'token' | 'credit' | 'request';
  pricePerUnit: number; // USD
  inputMultiplier?: number; // 输入token价格倍数（默认1）
  outputMultiplier?: number; // 输出token价格倍数（默认1）
}

/**
 * 预算配置
 */
export interface BudgetConfig {
  daily?: number; // USD
  monthly?: number; // USD
  perAPI?: Record<string, number>; // USD per API
}

/**
 * CostMonitor 类
 */
export class CostMonitor {
  private records: CostRecord[] = [];
  private pricingTable: Map<string, PricingConfig> = new Map();
  private budget: BudgetConfig = {};
  private maxRecords: number = 10000;

  constructor() {
    this.initializeDefaultPricing();
  }

  /**
   * 初始化默认定价
   */
  private initializeDefaultPricing(): void {
    // OpenAI GPT-4
    this.registerPricing({
      provider: 'openai',
      model: 'gpt-4',
      unit: 'token',
      pricePerUnit: 0.00003, // $0.03 per 1K tokens
      inputMultiplier: 1,
      outputMultiplier: 2
    });

    // OpenAI GPT-3.5
    this.registerPricing({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      unit: 'token',
      pricePerUnit: 0.000002, // $0.002 per 1K tokens
      inputMultiplier: 1,
      outputMultiplier: 1
    });

    // Anthropic Claude
    this.registerPricing({
      provider: 'anthropic',
      model: 'claude-3-opus',
      unit: 'token',
      pricePerUnit: 0.000015, // $0.015 per 1K tokens
      inputMultiplier: 1,
      outputMultiplier: 5
    });

    logger.info('Default pricing initialized', 'CostMonitor').catch(() => {});
  }

  /**
   * 注册定价配置
   */
  public registerPricing(config: PricingConfig): void {
    const key = `${config.provider}:${config.model}`;
    this.pricingTable.set(key, config);

    logger.debug(`Pricing registered: ${key}`, 'CostMonitor', config).catch(() => {});
  }

  /**
   * 设置预算
   */
  public setBudget(budget: BudgetConfig): void {
    this.budget = budget;
    logger.info('Budget updated', 'CostMonitor', budget).catch(() => {});
  }

  /**
   * 记录API调用成本
   */
  public async recordCost(record: Omit<CostRecord, 'id' | 'timestamp' | 'estimatedCost'>): Promise<CostRecord> {
    const fullRecord: CostRecord = {
      id: `cost-${await timeService.getTimestamp()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: await timeService.getISOString(),
      estimatedCost: this.calculateCost(record),
      ...record
    };

    this.records.push(fullRecord);

    // 限制记录数量
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    await logger.debug(
      `Cost recorded: ${fullRecord.apiName}`,
      'CostMonitor',
      { cost: fullRecord.estimatedCost }
    );

    // 检查预算
    await this.checkBudget();

    return fullRecord;
  }

  /**
   * 计算成本
   */
  private calculateCost(record: Omit<CostRecord, 'id' | 'timestamp' | 'estimatedCost'>): number {
    const key = `${record.provider}:${record.model}`;
    const pricing = this.pricingTable.get(key);

    if (!pricing) {
      logger.warn(`No pricing config found for: ${key}`, 'CostMonitor').catch(() => {});
      return 0;
    }

    switch (pricing.unit) {
      case 'token':
        if (record.tokenUsage) {
          const inputCost = (record.tokenUsage.prompt / 1000) * pricing.pricePerUnit * (pricing.inputMultiplier || 1);
          const outputCost = (record.tokenUsage.completion / 1000) * pricing.pricePerUnit * (pricing.outputMultiplier || 1);
          return inputCost + outputCost;
        }
        return 0;

      case 'credit':
        if (record.creditUsage) {
          return record.creditUsage * pricing.pricePerUnit;
        }
        return 0;

      case 'request':
        return pricing.pricePerUnit;

      default:
        return 0;
    }
  }

  /**
   * 检查预算
   */
  private async checkBudget(): Promise<void> {
    const stats = await this.getStats();

    // 检查每日预算
    if (this.budget.daily && stats.today > this.budget.daily) {
      await logger.warn(
        'Daily budget exceeded',
        'CostMonitor',
        { budget: this.budget.daily, actual: stats.today }
      );
    }

    // 检查每月预算
    if (this.budget.monthly && stats.thisMonth > this.budget.monthly) {
      await logger.warn(
        'Monthly budget exceeded',
        'CostMonitor',
        { budget: this.budget.monthly, actual: stats.thisMonth }
      );
    }

    // 检查各API预算
    if (this.budget.perAPI) {
      for (const [apiName, budget] of Object.entries(this.budget.perAPI)) {
        const apiCost = this.getAPIStats(apiName).total;
        if (apiCost > budget) {
          await logger.warn(
            `Budget exceeded for API: ${apiName}`,
            'CostMonitor',
            { budget, actual: apiCost }
          );
        }
      }
    }
  }

  /**
   * 获取统计信息
   */
  public async getStats(): Promise<{
    total: number;
    today: number;
    thisMonth: number;
    byProvider: Record<string, number>;
    recentRecords: CostRecord[];
  }> {
    const now = await timeService.getCurrentTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = this.records.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    const todayRecords = this.records.filter(r => new Date(r.timestamp) >= today);
    const monthRecords = this.records.filter(r => new Date(r.timestamp) >= thisMonth);

    const byProvider: Record<string, number> = {};
    for (const record of this.records) {
      byProvider[record.provider] = (byProvider[record.provider] || 0) + (record.estimatedCost || 0);
    }

    return {
      total,
      today: todayRecords.reduce((sum, r) => sum + (r.estimatedCost || 0), 0),
      thisMonth: monthRecords.reduce((sum, r) => sum + (r.estimatedCost || 0), 0),
      byProvider,
      recentRecords: this.records.slice(-10)
    };
  }

  /**
   * 获取特定API的统计
   */
  public getAPIStats(apiName: string): {
    total: number;
    calls: number;
    averageCost: number;
    totalTokens: number;
  } {
    const apiRecords = this.records.filter(r => r.apiName === apiName);

    const total = apiRecords.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    const totalTokens = apiRecords.reduce((sum, r) => sum + (r.tokenUsage?.total || 0), 0);

    return {
      total,
      calls: apiRecords.length,
      averageCost: apiRecords.length > 0 ? total / apiRecords.length : 0,
      totalTokens
    };
  }

  /**
   * 导出成本报告
   */
  public exportReport(startDate?: Date, endDate?: Date): CostRecord[] {
    let filtered = this.records;

    if (startDate) {
      filtered = filtered.filter(r => new Date(r.timestamp) >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(r => new Date(r.timestamp) <= endDate);
    }

    return filtered;
  }

  /**
   * 清空记录
   */
  public clearRecords(): void {
    this.records = [];
    logger.info('Cost records cleared', 'CostMonitor').catch(() => {});
  }
}

// 导出单例实例
export const costMonitor = new CostMonitor();

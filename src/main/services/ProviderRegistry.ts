/**
 * ProviderRegistry 服务
 *
 * Provider 注册表，管理所有 AI Provider 的注册、查询和可用性检查
 */

import { OperationType } from '@/shared/types/provider';
import type { IProvider } from '@/shared/types/provider';
import type { Logger } from './Logger';

/**
 * Provider 注册表服务
 */
export class ProviderRegistry {
  private providers: Map<string, IProvider> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 注册单个 Provider
   * @param provider Provider 实例
   */
  register(provider: IProvider): void {
    if (this.providers.has(provider.id)) {
      this.logger.warn(`Provider ${provider.id} 已存在，将被覆盖`, 'ProviderRegistry');
    }

    this.providers.set(provider.id, provider);
    this.logger.info(
      `Provider 已注册: ${provider.name} (${provider.id}), 支持操作: ${provider.supportedOperations.join(', ')}`,
      'ProviderRegistry'
    );
  }

  /**
   * 批量注册 Providers
   * @param providers Provider 实例数组
   */
  registerBatch(providers: IProvider[]): void {
    this.logger.info(`批量注册 ${providers.length} 个 Providers`, 'ProviderRegistry');

    for (const provider of providers) {
      this.register(provider);
    }

    this.logger.info(`批量注册完成，当前共 ${this.providers.size} 个 Providers`, 'ProviderRegistry');
  }

  /**
   * 卸载 Provider
   * @param providerId Provider ID
   */
  unregister(providerId: string): void {
    const provider = this.providers.get(providerId);

    if (!provider) {
      this.logger.warn(`Provider ${providerId} 不存在，无法卸载`, 'ProviderRegistry');
      return;
    }

    this.providers.delete(providerId);
    this.logger.info(`Provider 已卸载: ${provider.name} (${providerId})`, 'ProviderRegistry');
  }

  /**
   * 获取指定 Provider
   * @param providerId Provider ID
   * @returns Provider 实例或 undefined
   */
  getProvider(providerId: string): IProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * 获取所有 Providers
   * @returns 所有 Provider 实例数组
   */
  getAllProviders(): IProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 根据操作类型查询支持的 Providers
   * @param operationType 操作类型
   * @returns 支持该操作的 Provider 列表
   */
  listProvidersByOperation(operationType: OperationType): IProvider[] {
    const providers = Array.from(this.providers.values()).filter((provider) =>
      provider.supportedOperations.includes(operationType)
    );

    this.logger.debug(
      `查询操作类型 ${operationType} 的 Providers: 找到 ${providers.length} 个`,
      'ProviderRegistry'
    );

    return providers;
  }

  /**
   * 检查指定 Provider 的可用性
   * @param providerId Provider ID
   * @returns 是否可用
   */
  async checkProviderAvailability(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);

    if (!provider) {
      this.logger.warn(`Provider ${providerId} 不存在`, 'ProviderRegistry');
      return false;
    }

    try {
      this.logger.debug(`检查 Provider ${provider.name} 的可用性`, 'ProviderRegistry');
      const available = await provider.checkAvailability();

      if (available) {
        this.logger.info(`Provider ${provider.name} 可用`, 'ProviderRegistry');
      } else {
        this.logger.warn(`Provider ${provider.name} 不可用`, 'ProviderRegistry');
      }

      return available;
    } catch (error) {
      this.logger.error(
        `检查 Provider ${provider.name} 可用性时出错: ${error instanceof Error ? error.message : String(error)}`,
        'ProviderRegistry'
      );
      return false;
    }
  }

  /**
   * 批量检查多个 Providers 的可用性
   * @param providerIds Provider ID 数组
   * @returns 可用性结果 Map
   */
  async checkMultipleProviders(providerIds: string[]): Promise<Map<string, boolean>> {
    this.logger.info(`批量检查 ${providerIds.length} 个 Providers 的可用性`, 'ProviderRegistry');

    const results = new Map<string, boolean>();

    await Promise.all(
      providerIds.map(async (providerId) => {
        const available = await this.checkProviderAvailability(providerId);
        results.set(providerId, available);
      })
    );

    const availableCount = Array.from(results.values()).filter((v) => v).length;
    this.logger.info(
      `批量检查完成: ${availableCount}/${providerIds.length} 个可用`,
      'ProviderRegistry'
    );

    return results;
  }

  /**
   * 获取注册的 Provider 数量
   * @returns Provider 数量
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * 清空所有 Providers
   */
  clear(): void {
    const count = this.providers.size;
    this.providers.clear();
    this.logger.info(`已清空 ${count} 个 Providers`, 'ProviderRegistry');
  }
}

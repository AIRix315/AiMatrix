/**
 * ProviderHub 服务 - Provider 管理门面
 *
 * 统一的 Provider 管理门面，整合注册、配置、路由三大职责
 * 外部模块（如 PluginManager）仅通过此门面访问 Provider 功能
 *
 * 内部服务：
 * - ProviderRegistry: 注册查询
 * - APIManager (ProviderConfigManager): 配置管理
 * - ProviderRouter: 请求路由
 */

import { OperationType } from '@/shared/types';
import type {
    IProvider,
    TextToImageParams,
    TextToImageResult,
    ImageToImageParams,
    ImageToImageResult,
    ImageToVideoParams,
    ImageToVideoResult
} from '@/shared/types';
import type { ProviderRegistry } from './ProviderRegistry';
import type { APIManager } from './APIManager';
import type { ProviderRouter } from './ProviderRouter';
import type { Logger } from './Logger';

export interface ProviderExecuteRequest {
    operationType: OperationType;
    params: TextToImageParams | ImageToImageParams | ImageToVideoParams;
}

export type ProviderExecuteResult = TextToImageResult | ImageToImageResult | ImageToVideoResult;

export class ProviderHub {
    private providerRegistry: ProviderRegistry;
    private configManager: APIManager;
    private providerRouter: ProviderRouter;
    private logger: Logger;

    constructor(
        providerRegistry: ProviderRegistry,
        configManager: APIManager,
        providerRouter: ProviderRouter,
        logger: Logger
    ) {
        this.providerRegistry = providerRegistry;
        this.configManager = configManager;
        this.providerRouter = providerRouter;
        this.logger = logger;
    }

    async initialize(): Promise<void> {
        this.logger.info('初始化 ProviderHub', 'ProviderHub');
        await this.configManager.initialize();
        this.logger.info('ProviderHub 初始化完成', 'ProviderHub');
    }

    async execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
        this.logger.info(
            `执行 Provider 调用: ${request.operationType}`,
            'ProviderHub'
        );

        try {
            switch (request.operationType) {
                case OperationType.TEXT_TO_IMAGE:
                    return await this.providerRouter.executeTextToImage(
                        request.params as TextToImageParams
                    );

                case OperationType.IMAGE_TO_IMAGE:
                    return await this.providerRouter.executeImageToImage(
                        request.params as ImageToImageParams
                    );

                case OperationType.IMAGE_TO_VIDEO:
                    return await this.providerRouter.executeImageToVideo(
                        request.params as ImageToVideoParams
                    );

                default:
                    throw new Error(`不支持的操作类型: ${request.operationType}`);
            }
        } catch (error) {
            this.logger.error(
                `Provider 调用失败: ${error instanceof Error ? error.message : String(error)}`,
                'ProviderHub'
            );
            throw error;
        }
    }

    async healthCheck(providerId: string): Promise<boolean> {
        this.logger.debug(`检查 Provider 健康状态: ${providerId}`, 'ProviderHub');

        try {
            const available = await this.providerRegistry.checkProviderAvailability(providerId);

            if (available) {
                this.logger.info(`Provider ${providerId} 健康检查通过`, 'ProviderHub');
            } else {
                this.logger.warn(`Provider ${providerId} 健康检查失败`, 'ProviderHub');
            }

            return available;
        } catch (error) {
            this.logger.error(
                `Provider ${providerId} 健康检查异常: ${error instanceof Error ? error.message : String(error)}`,
                'ProviderHub'
            );
            return false;
        }
    }

    async batchHealthCheck(providerIds: string[]): Promise<Map<string, boolean>> {
        this.logger.info(`批量检查 ${providerIds.length} 个 Providers`, 'ProviderHub');

        try {
            const results = await this.providerRegistry.checkMultipleProviders(providerIds);

            const availableCount = Array.from(results.values()).filter((v) => v).length;
            this.logger.info(
                `批量健康检查完成: ${availableCount}/${providerIds.length} 个可用`,
                'ProviderHub'
            );

            return results;
        } catch (error) {
            this.logger.error(
                `批量健康检查失败: ${error instanceof Error ? error.message : String(error)}`,
                'ProviderHub'
            );
            throw error;
        }
    }

    listAvailable(operationType: OperationType): IProvider[] {
        this.logger.debug(`查询支持操作类型 ${operationType} 的 Providers`, 'ProviderHub');

        const providers = this.providerRegistry.listProvidersByOperation(operationType);

        this.logger.debug(
            `找到 ${providers.length} 个支持 ${operationType} 的 Providers`,
            'ProviderHub'
        );

        return providers;
    }

    getProvider(providerId: string): IProvider | undefined {
        return this.providerRegistry.getProvider(providerId);
    }

    getAllProviders(): IProvider[] {
        return this.providerRegistry.getAllProviders();
    }

    registerProvider(provider: IProvider): void {
        this.logger.info(`注册 Provider: ${provider.name} (${provider.id})`, 'ProviderHub');
        this.providerRegistry.register(provider);
    }

    registerProviders(providers: IProvider[]): void {
        this.logger.info(`批量注册 ${providers.length} 个 Providers`, 'ProviderHub');
        this.providerRegistry.registerBatch(providers);
    }

    unregisterProvider(providerId: string): void {
        this.logger.info(`卸载 Provider: ${providerId}`, 'ProviderHub');
        this.providerRegistry.unregister(providerId);
    }

    async getDefaultProvider(operationType: OperationType): Promise<string | null> {
        return await this.providerRouter.getDefaultProvider(operationType);
    }
}

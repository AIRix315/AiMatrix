/**
 * ProviderRouter 服务
 *
 * 路由层，根据配置将操作路由到具体 Provider
 * MATRIX Studio 作为编排平台，不直接执行 AI 操作，而是路由到具体 Provider
 */

import { OperationType } from '@/shared/types/provider';
import type {
  IProvider,
  ITextToImageProvider,
  IImageToImageProvider,
  IImageToVideoProvider,
  TextToImageParams,
  TextToImageResult,
  ImageToImageParams,
  ImageToImageResult,
  ImageToVideoParams,
  ImageToVideoResult
} from '@/shared/types/provider';
import type { ProviderRegistry } from './ProviderRegistry';
import type { ConfigManager } from './ConfigManager';
import type { Logger } from './Logger';

/**
 * Provider 路由服务
 */
export class ProviderRouter {
  private providerRegistry: ProviderRegistry;
  private configManager: ConfigManager;
  private logger: Logger;

  constructor(
    providerRegistry: ProviderRegistry,
    configManager: ConfigManager,
    logger: Logger
  ) {
    this.providerRegistry = providerRegistry;
    this.configManager = configManager;
    this.logger = logger;
  }

  /**
   * 执行文生图操作
   * @param params 文生图参数
   * @returns 文生图结果
   */
  async executeTextToImage(params: TextToImageParams): Promise<TextToImageResult> {
    const providerId = params.providerId || await this.getDefaultProvider(OperationType.TEXT_TO_IMAGE);

    if (!providerId) {
      const error = '未配置文生图 Provider，请在 Settings 中配置';
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    const provider = this.providerRegistry.getProvider(providerId) as ITextToImageProvider | undefined;

    if (!provider) {
      const error = `Provider ${providerId} 未找到`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    // 检查 Provider 是否支持文生图操作
    if (!provider.supportedOperations.includes(OperationType.TEXT_TO_IMAGE)) {
      const error = `Provider ${provider.name} 不支持文生图操作`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    // 检查可用性
    const available = await provider.checkAvailability();
    if (!available) {
      const error = `Provider ${provider.name} 不可用，请检查配置`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    this.logger.info(
      `执行文生图: Provider=${provider.name}, Prompt="${params.prompt.substring(0, 50)}..."`,
      'ProviderRouter'
    );

    try {
      const result = await provider.textToImage({
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        negativePrompt: params.negativePrompt,
        seed: params.seed
      });

      if (result.success) {
        this.logger.info(`文生图成功: Provider=${provider.name}`, 'ProviderRouter');
      } else {
        this.logger.error(`文生图失败: ${result.error}`, 'ProviderRouter');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`文生图异常: ${errorMessage}`, 'ProviderRouter', { error });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 执行图生图操作
   * @param params 图生图参数
   * @returns 图生图结果
   */
  async executeImageToImage(params: ImageToImageParams): Promise<ImageToImageResult> {
    const providerId = params.providerId || await this.getDefaultProvider(OperationType.IMAGE_TO_IMAGE);

    if (!providerId) {
      const error = '未配置图生图 Provider，请在 Settings 中配置';
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    const provider = this.providerRegistry.getProvider(providerId) as IImageToImageProvider | undefined;

    if (!provider) {
      const error = `Provider ${providerId} 未找到`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    // 检查 Provider 是否支持图生图操作
    if (!provider.supportedOperations.includes(OperationType.IMAGE_TO_IMAGE)) {
      const error = `Provider ${provider.name} 不支持图生图操作`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    // 检查可用性
    const available = await provider.checkAvailability();
    if (!available) {
      const error = `Provider ${provider.name} 不可用，请检查配置`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    this.logger.info(
      `执行图生图: Provider=${provider.name}, Prompt="${params.prompt.substring(0, 50)}..."`,
      'ProviderRouter'
    );

    try {
      const result = await provider.imageToImage({
        imageInput: params.imageInput,
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        negativePrompt: params.negativePrompt,
        strength: params.strength,
        seed: params.seed
      });

      if (result.success) {
        this.logger.info(`图生图成功: Provider=${provider.name}`, 'ProviderRouter');
      } else {
        this.logger.error(`图生图失败: ${result.error}`, 'ProviderRouter');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`图生图异常: ${errorMessage}`, 'ProviderRouter', { error });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 执行图生视频操作
   * @param params 图生视频参数
   * @returns 图生视频结果
   */
  async executeImageToVideo(params: ImageToVideoParams): Promise<ImageToVideoResult> {
    const providerId = params.providerId || await this.getDefaultProvider(OperationType.IMAGE_TO_VIDEO);

    if (!providerId) {
      const error = '未配置图生视频 Provider，请在 Settings 中配置';
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    const provider = this.providerRegistry.getProvider(providerId) as IImageToVideoProvider | undefined;

    if (!provider) {
      const error = `Provider ${providerId} 未找到`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    // 检查 Provider 是否支持图生视频操作
    if (!provider.supportedOperations.includes(OperationType.IMAGE_TO_VIDEO)) {
      const error = `Provider ${provider.name} 不支持图生视频操作`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    // 检查可用性
    const available = await provider.checkAvailability();
    if (!available) {
      const error = `Provider ${provider.name} 不可用，请检查配置`;
      this.logger.error(error, 'ProviderRouter');
      return {
        success: false,
        error
      };
    }

    this.logger.info(
      `执行图生视频: Provider=${provider.name}, Prompt="${params.prompt.substring(0, 50)}..."`,
      'ProviderRouter'
    );

    try {
      const result = await provider.imageToVideo({
        imageInput: params.imageInput,
        prompt: params.prompt,
        duration: params.duration,
        fps: params.fps,
        seed: params.seed
      });

      if (result.success) {
        this.logger.info(`图生视频成功: Provider=${provider.name}`, 'ProviderRouter');
      } else {
        this.logger.error(`图生视频失败: ${result.error}`, 'ProviderRouter');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`图生视频异常: ${errorMessage}`, 'ProviderRouter', { error });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 获取默认 Provider ID
   * @param operationType 操作类型
   * @returns Provider ID 或 null
   */
  async getDefaultProvider(operationType: OperationType): Promise<string | null> {
    // 获取支持该操作类型的所有 Provider
    const providers = this.providerRegistry.listProvidersByOperation(operationType);

    if (providers.length === 0) {
      this.logger.warn(`没有找到支持 ${operationType} 操作的 Provider`, 'ProviderRouter');
      return null;
    }

    // 从配置中查找启用的 Provider
    const providerConfigs = this.configManager.getProviders();
    const enabledProviders = providers.filter((provider) => {
      const config = providerConfigs.find((c) => c.id === provider.id);
      return config?.enabled !== false; // 默认为启用
    });

    if (enabledProviders.length === 0) {
      this.logger.warn(
        `支持 ${operationType} 操作的 Provider 均未启用`,
        'ProviderRouter'
      );
      return null;
    }

    // 返回第一个启用的 Provider
    const defaultProvider = enabledProviders[0];
    this.logger.debug(
      `默认 Provider: ${defaultProvider.name} (${defaultProvider.id}) for ${operationType}`,
      'ProviderRouter'
    );

    return defaultProvider.id;
  }

  /**
   * 列出所有 Provider
   * @returns Provider 列表
   */
  listProviders(): IProvider[] {
    return this.providerRegistry.getAllProviders();
  }

  /**
   * 检查 Provider 可用性
   * @param providerId Provider ID
   * @returns 是否可用
   */
  async checkProviderAvailability(providerId: string): Promise<boolean> {
    return this.providerRegistry.checkProviderAvailability(providerId);
  }
}

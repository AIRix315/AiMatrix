/**
 * Provider IPC 处理器
 *
 * 处理渲染进程发送的 Provider 相关请求
 */

import { ipcMain } from 'electron';
import type { ProviderRouter } from '../services/ProviderRouter';
import type {
  TextToImageParams,
  TextToImageResult,
  ImageToImageParams,
  ImageToImageResult,
  ImageToVideoParams,
  ImageToVideoResult,
  IProvider
} from '@/shared/types/provider';
import { logger } from '../services/Logger';
import { taskScheduler } from '../services/TaskScheduler';
import type { BatchResult } from '../services/TaskScheduler';

/**
 * 注册 Provider IPC 处理器
 * @param providerRouter ProviderRouter 服务实例
 */
export function registerProviderHandlers(providerRouter: ProviderRouter): void {
  /**
   * 执行文生图操作
   */
  ipcMain.handle(
    'provider:text-to-image',
    async (_, params: TextToImageParams): Promise<TextToImageResult> => {
      try {
        await logger.debug(
          `IPC: provider:text-to-image - Prompt="${params.prompt.substring(0, 50)}..."`,
          'provider-handlers'
        );

        const result = await providerRouter.executeTextToImage(params);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(`IPC: provider:text-to-image 失败: ${errorMessage}`, 'provider-handlers', {
          error
        });

        return {
          success: false,
          error: errorMessage
        };
      }
    }
  );

  /**
   * 执行图生图操作
   */
  ipcMain.handle(
    'provider:image-to-image',
    async (_, params: ImageToImageParams): Promise<ImageToImageResult> => {
      try {
        await logger.debug(
          `IPC: provider:image-to-image - Prompt="${params.prompt.substring(0, 50)}..."`,
          'provider-handlers'
        );

        const result = await providerRouter.executeImageToImage(params);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(`IPC: provider:image-to-image 失败: ${errorMessage}`, 'provider-handlers', {
          error
        });

        return {
          success: false,
          error: errorMessage
        };
      }
    }
  );

  /**
   * 执行图生视频操作
   */
  ipcMain.handle(
    'provider:image-to-video',
    async (_, params: ImageToVideoParams): Promise<ImageToVideoResult> => {
      try {
        await logger.debug(
          `IPC: provider:image-to-video - Prompt="${params.prompt.substring(0, 50)}..."`,
          'provider-handlers'
        );

        const result = await providerRouter.executeImageToVideo(params);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(`IPC: provider:image-to-video 失败: ${errorMessage}`, 'provider-handlers', {
          error
        });

        return {
          success: false,
          error: errorMessage
        };
      }
    }
  );

  /**
   * 列出所有 Providers
   */
  ipcMain.handle('provider:list', async (): Promise<IProvider[]> => {
    try {
      await logger.debug('IPC: provider:list', 'provider-handlers');

      const providers = providerRouter.listProviders();
      return providers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.error(`IPC: provider:list 失败: ${errorMessage}`, 'provider-handlers', { error });

      return [];
    }
  });

  /**
   * 检查 Provider 可用性
   */
  ipcMain.handle('provider:check-availability', async (_, providerId: string): Promise<boolean> => {
    try {
      await logger.debug(`IPC: provider:check-availability - Provider=${providerId}`, 'provider-handlers');

      const available = await providerRouter.checkProviderAvailability(providerId);
      return available;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.error(
        `IPC: provider:check-availability 失败: ${errorMessage}`,
        'provider-handlers',
        { error }
      );

      return false;
    }
  });

  /**
   * 批量文生图
   */
  ipcMain.handle(
    'provider:batch-text-to-image',
    async (
      _,
      params: {
        items: Array<{ id: string; prompt: string; width: number; height: number }>;
        maxConcurrency?: number;
      }
    ): Promise<BatchResult<{ id: string; result: TextToImageResult }>> => {
      try {
        await logger.info(
          `IPC: provider:batch-text-to-image - ${params.items.length} 个项`,
          'provider-handlers'
        );

        const result = await taskScheduler.executeBatchParallel(
          params.items,
          async (item) => {
            const imageResult = await providerRouter.executeTextToImage({
              prompt: item.prompt,
              width: item.width,
              height: item.height
            });
            return { id: item.id, result: imageResult };
          },
          params.maxConcurrency || 5
        );

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(
          `IPC: provider:batch-text-to-image 失败: ${errorMessage}`,
          'provider-handlers',
          { error }
        );

        // 返回全部失败的结果
        return {
          success: [],
          failed: params.items.map((item) => ({
            item,
            error: error instanceof Error ? error : new Error(String(error))
          })),
          total: params.items.length,
          successCount: 0,
          failedCount: params.items.length,
          successRate: 0
        };
      }
    }
  );

  /**
   * 批量图生视频
   */
  ipcMain.handle(
    'provider:batch-image-to-video',
    async (
      _,
      params: {
        items: Array<{ id: string; imageInput: string; prompt: string }>;
        maxConcurrency?: number;
      }
    ): Promise<BatchResult<{ id: string; result: ImageToVideoResult }>> => {
      try {
        await logger.info(
          `IPC: provider:batch-image-to-video - ${params.items.length} 个项`,
          'provider-handlers'
        );

        const result = await taskScheduler.executeBatchParallel(
          params.items,
          async (item) => {
            const videoResult = await providerRouter.executeImageToVideo({
              imageInput: item.imageInput,
              prompt: item.prompt
            });
            return { id: item.id, result: videoResult };
          },
          params.maxConcurrency || 5
        );

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(
          `IPC: provider:batch-image-to-video 失败: ${errorMessage}`,
          'provider-handlers',
          { error }
        );

        return {
          success: [],
          failed: params.items.map((item) => ({
            item,
            error: error instanceof Error ? error : new Error(String(error))
          })),
          total: params.items.length,
          successCount: 0,
          failedCount: params.items.length,
          successRate: 0
        };
      }
    }
  );

  logger.info('Provider IPC handlers registered', 'provider-handlers').catch(() => {});
}

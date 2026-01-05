/**
 * JiekouProvider - 接口AI Provider 实现
 *
 * 封装接口AI的文生图、图生图、图生视频 API
 * 支持异步任务轮询和文件下载
 */

import {
  OperationType,
  type ITextToImageProvider,
  type IImageToImageProvider,
  type IImageToVideoProvider,
  type TextToImageParams,
  type TextToImageResult,
  type ImageToImageParams,
  type ImageToImageResult,
  type ImageToVideoParams,
  type ImageToVideoResult
} from '@/shared/types';
import { AsyncTaskManager, TaskStatusEnum, type TaskStatus } from '../services/AsyncTaskManager';
import type { ConfigManager } from '../services/ConfigManager';
import type { FileSystemService } from '../services/FileSystemService';
import type { Logger } from '../services/Logger';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 接口AI API 响应接口
 */
interface JiekouAPIResponse {
  /** 任务ID（异步任务） */
  task_id?: string;

  /** 任务状态 */
  task_status?: string;

  /** 图片URL */
  image_url?: string;

  /** 视频URL */
  video_url?: string;

  /** 错误信息 */
  error?: string;
}

/**
 * 接口AI Provider
 */
export class JiekouProvider
  implements ITextToImageProvider, IImageToImageProvider, IImageToVideoProvider {
  readonly id = 'jiekou-ai';
  readonly name = '接口AI';
  readonly type = 'official' as const;
  readonly supportedOperations = [
    OperationType.TEXT_TO_IMAGE,
    OperationType.IMAGE_TO_IMAGE,
    OperationType.IMAGE_TO_VIDEO
  ];

  private apiKey: string;
  private baseUrl = 'https://api.jiekou.ai';
  private asyncTaskManager: AsyncTaskManager;
  private configManager: ConfigManager;
  private fileSystemService: FileSystemService;
  private logger: Logger;

  constructor(
    configManager: ConfigManager,
    fileSystemService: FileSystemService,
    logger: Logger,
    apiKey?: string
  ) {
    this.configManager = configManager;
    this.fileSystemService = fileSystemService;
    this.logger = logger;
    this.asyncTaskManager = new AsyncTaskManager(logger);

    // 从配置或参数获取 API Key
    this.apiKey = apiKey || this.getApiKeyFromConfig();
  }

  /**
   * 从配置中获取 API Key
   */
  private getApiKeyFromConfig(): string {
    const provider = this.configManager.getProvider('jiekou-ai');
    return provider?.apiKey || '';
  }

  /**
   * 检查 Provider 可用性
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('接口AI API Key 未配置', 'JiekouProvider');
      return false;
    }

    try {
      // 测试连接：调用一个轻量级的 API（这里简化处理，实际可以调用 ping 接口）
      this.logger.debug('检查接口AI可用性', 'JiekouProvider');

      // 简单验证：检查 API Key 格式
      if (this.apiKey.length < 10) {
        this.logger.warn('接口AI API Key 格式无效', 'JiekouProvider');
        return false;
      }

      this.logger.info('接口AI可用', 'JiekouProvider');
      return true;
    } catch (error) {
      this.logger.error(
        `接口AI不可用: ${error instanceof Error ? error.message : String(error)}`,
        'JiekouProvider'
      );
      return false;
    }
  }

  /**
   * 执行文生图操作
   */
  async textToImage(params: Omit<TextToImageParams, 'providerId'>): Promise<TextToImageResult> {
    this.logger.info(
      `执行文生图: ${params.width}x${params.height}, Prompt="${params.prompt.substring(0, 50)}..."`,
      'JiekouProvider'
    );

    try {
      // 调用初始 API
      const apiCall = async () => {
        const response = await fetch(`${this.baseUrl}/v3/async/z-image-turbo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            size: `${params.width}*${params.height}`,
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            seed: params.seed
          })
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }

        const data: JiekouAPIResponse = await response.json();
        return {
          task_id: data.task_id,
          result: data.image_url ? { imageUrl: data.image_url } : undefined
        };
      };

      // 检查任务状态
      const checkStatus = async (taskId: string): Promise<TaskStatus<{ imageUrl: string }>> => {
        const response = await fetch(`${this.baseUrl}/v3/async/task/${taskId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`状态查询失败: ${response.status} ${response.statusText}`);
        }

        const data: JiekouAPIResponse = await response.json();

        // 映射任务状态
        if (data.task_status === 'TASK_STATUS_SUCCEED' && data.image_url) {
          return {
            status: TaskStatusEnum.SUCCEED,
            result: { imageUrl: data.image_url }
          };
        } else if (data.task_status === 'TASK_STATUS_FAILED') {
          return {
            status: TaskStatusEnum.FAILED,
            error: data.error || '未知错误'
          };
        } else {
          // QUEUED 或 PROCESSING
          return {
            status:
              data.task_status === 'TASK_STATUS_QUEUED'
                ? TaskStatusEnum.QUEUED
                : TaskStatusEnum.PROCESSING
          };
        }
      };

      // 使用 AsyncTaskManager 执行轮询
      const result = await this.asyncTaskManager.executeWithPolling(apiCall, checkStatus, {
        pollInterval: 10000, // 10秒
        timeout: 600000 // 10分钟
      });

      // 下载图片到本地
      const imageFilePath = await this.downloadImage(result.imageUrl);

      this.logger.info(`文生图成功: ${imageFilePath}`, 'JiekouProvider');

      return {
        success: true,
        imageUrl: result.imageUrl,
        imageFilePath,
        metadata: {
          prompt: params.prompt,
          width: params.width,
          height: params.height,
          negativePrompt: params.negativePrompt,
          seed: params.seed,
          model: 'z-image-turbo'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`文生图失败: ${errorMessage}`, 'JiekouProvider', { error });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 执行图生图操作
   */
  async imageToImage(
    params: Omit<ImageToImageParams, 'providerId'>
  ): Promise<ImageToImageResult> {
    this.logger.info(
      `执行图生图: ${params.width}x${params.height}, Prompt="${params.prompt.substring(0, 50)}..."`,
      'JiekouProvider'
    );

    try {
      // 调用初始 API
      const apiCall = async () => {
        const response = await fetch(`${this.baseUrl}/v3/nano-banana-pro-light-i2i`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: params.imageInput,
            size: `${params.width}*${params.height}`,
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            strength: params.strength || 0.7,
            seed: params.seed
          })
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }

        const data: JiekouAPIResponse = await response.json();
        return {
          task_id: data.task_id,
          result: data.image_url ? { imageUrl: data.image_url } : undefined
        };
      };

      // 检查任务状态（与文生图相同）
      const checkStatus = async (taskId: string): Promise<TaskStatus<{ imageUrl: string }>> => {
        const response = await fetch(`${this.baseUrl}/v3/async/task/${taskId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`状态查询失败: ${response.status} ${response.statusText}`);
        }

        const data: JiekouAPIResponse = await response.json();

        if (data.task_status === 'TASK_STATUS_SUCCEED' && data.image_url) {
          return {
            status: TaskStatusEnum.SUCCEED,
            result: { imageUrl: data.image_url }
          };
        } else if (data.task_status === 'TASK_STATUS_FAILED') {
          return {
            status: TaskStatusEnum.FAILED,
            error: data.error || '未知错误'
          };
        } else {
          return {
            status:
              data.task_status === 'TASK_STATUS_QUEUED'
                ? TaskStatusEnum.QUEUED
                : TaskStatusEnum.PROCESSING
          };
        }
      };

      // 使用 AsyncTaskManager 执行轮询
      const result = await this.asyncTaskManager.executeWithPolling(apiCall, checkStatus, {
        pollInterval: 10000,
        timeout: 600000
      });

      // 下载图片到本地
      const imageFilePath = await this.downloadImage(result.imageUrl);

      this.logger.info(`图生图成功: ${imageFilePath}`, 'JiekouProvider');

      return {
        success: true,
        imageUrl: result.imageUrl,
        imageFilePath,
        metadata: {
          prompt: params.prompt,
          width: params.width,
          height: params.height,
          negativePrompt: params.negativePrompt,
          strength: params.strength,
          seed: params.seed,
          model: 'nano-banana-pro-light-i2i'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`图生图失败: ${errorMessage}`, 'JiekouProvider', { error });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 执行图生视频操作
   */
  async imageToVideo(
    params: Omit<ImageToVideoParams, 'providerId'>
  ): Promise<ImageToVideoResult> {
    this.logger.info(
      `执行图生视频: Prompt="${params.prompt.substring(0, 50)}..."`,
      'JiekouProvider'
    );

    try {
      // 调用初始 API
      const apiCall = async () => {
        const response = await fetch(`${this.baseUrl}/v3/async/sora-2-video-reverse`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: params.imageInput,
            prompt: params.prompt,
            duration: params.duration || 5,
            seed: params.seed
          })
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }

        const data: JiekouAPIResponse = await response.json();
        return {
          task_id: data.task_id,
          result: data.video_url ? { videoUrl: data.video_url } : undefined
        };
      };

      // 检查任务状态
      const checkStatus = async (taskId: string): Promise<TaskStatus<{ videoUrl: string }>> => {
        const response = await fetch(`${this.baseUrl}/v3/async/task/${taskId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`状态查询失败: ${response.status} ${response.statusText}`);
        }

        const data: JiekouAPIResponse = await response.json();

        if (data.task_status === 'TASK_STATUS_SUCCEED' && data.video_url) {
          return {
            status: TaskStatusEnum.SUCCEED,
            result: { videoUrl: data.video_url }
          };
        } else if (data.task_status === 'TASK_STATUS_FAILED') {
          return {
            status: TaskStatusEnum.FAILED,
            error: data.error || '未知错误'
          };
        } else {
          return {
            status:
              data.task_status === 'TASK_STATUS_QUEUED'
                ? TaskStatusEnum.QUEUED
                : TaskStatusEnum.PROCESSING
          };
        }
      };

      // 使用 AsyncTaskManager 执行轮询
      const result = await this.asyncTaskManager.executeWithPolling(apiCall, checkStatus, {
        pollInterval: 10000,
        timeout: 600000
      });

      // 下载视频到本地
      const videoFilePath = await this.downloadVideo(result.videoUrl);

      this.logger.info(`图生视频成功: ${videoFilePath}`, 'JiekouProvider');

      return {
        success: true,
        videoUrl: result.videoUrl,
        videoFilePath,
        metadata: {
          prompt: params.prompt,
          duration: params.duration,
          seed: params.seed,
          model: 'sora-2-video-reverse'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`图生视频失败: ${errorMessage}`, 'JiekouProvider', { error });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 下载图片到本地
   */
  private async downloadImage(url: string): Promise<string> {
    this.logger.debug(`下载图片: ${url}`, 'JiekouProvider');

    try {
      // 下载文件
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();

      // 生成文件名
      const timestamp = Date.now();
      const ext = path.extname(new URL(url).pathname) || '.png';
      const filename = `jiekou-ai-${timestamp}${ext}`;

      // 保存到临时目录
      const dataDir = this.fileSystemService.getDataDir();
      const tempDir = path.join(dataDir, 'temp');

      // 确保目录存在
      await fs.mkdir(tempDir, { recursive: true });

      const filePath = path.join(tempDir, filename);
      await fs.writeFile(filePath, Buffer.from(buffer));

      this.logger.debug(`图片已下载: ${filePath}`, 'JiekouProvider');
      return filePath;
    } catch (error) {
      this.logger.error(
        `下载图片失败: ${error instanceof Error ? error.message : String(error)}`,
        'JiekouProvider'
      );
      throw error;
    }
  }

  /**
   * 下载视频到本地
   */
  private async downloadVideo(url: string): Promise<string> {
    this.logger.debug(`下载视频: ${url}`, 'JiekouProvider');

    try {
      // 下载文件
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();

      // 生成文件名
      const timestamp = Date.now();
      const ext = path.extname(new URL(url).pathname) || '.mp4';
      const filename = `jiekou-ai-${timestamp}${ext}`;

      // 保存到临时目录
      const dataDir = this.fileSystemService.getDataDir();
      const tempDir = path.join(dataDir, 'temp');

      // 确保目录存在
      await fs.mkdir(tempDir, { recursive: true });

      const filePath = path.join(tempDir, filename);
      await fs.writeFile(filePath, Buffer.from(buffer));

      this.logger.debug(`视频已下载: ${filePath}`, 'JiekouProvider');
      return filePath;
    } catch (error) {
      this.logger.error(
        `下载视频失败: ${error instanceof Error ? error.message : String(error)}`,
        'JiekouProvider'
      );
      throw error;
    }
  }
}

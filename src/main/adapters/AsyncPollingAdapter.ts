/**
 * AsyncPollingAdapter - 异步轮询适配器
 *
 * 用于调用异步 API（提交任务后需要轮询结果）
 *
 * 支持的服务：
 * - Jiekou AI (Sora-2, Z-Image Turbo)
 * - Runway Gen-3
 * - 其他需要任务提交 + 轮询的 API
 *
 * 调用流程：
 * 1. 提交任务到 API（获取 task_id）
 * 2. 轮询任务状态（每 5 秒查询一次）
 * 3. 任务完成后返回结果
 * 4. 超时时间：60 次轮询（5分钟）
 *
 * 模型名称映射：
 * - 支持供应商特定的模型名称映射
 * - 例如：sora-2 → sora-2-video-reverse（Jiekou AI）
 */

import { BaseAdapter, APICallRequest, APICallResponse } from './BaseAdapter';
import { Logger } from '../services/Logger';
import { APIFormat } from '@/shared/types';
import type { APIProviderConfig } from '@/shared/types';

/**
 * 任务状态枚举
 */
enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEED = 'SUCCEED',
  FAILED = 'FAILED',
}

/**
 * 模型名称映射表（供应商特定）
 */
const MODEL_NAME_MAPPINGS: Record<string, Record<string, string>> = {
  // Jiekou AI 映射
  'jiekou-ai': {
    'sora-2': 'sora-2-video-reverse',
    'z-image-turbo': 'z-image-turbo',
  },
};

export class AsyncPollingAdapter extends BaseAdapter {
  private readonly POLLING_INTERVAL = 5000; // 5秒
  private readonly MAX_POLLING_ATTEMPTS = 60; // 最多60次（5分钟）

  constructor(logger: Logger) {
    super(logger);
  }

  get supportedFormat(): string {
    return APIFormat.ASYNC_POLLING;
  }

  async callAPI(
    provider: APIProviderConfig,
    request: APICallRequest
  ): Promise<APICallResponse> {
    const startTime = Date.now();

    try {
      await this.logger.info(
        `异步API调用: ${provider.name} - ${request.model}`,
        'AsyncPollingAdapter',
        { category: request.category }
      );

      // 1. 提交任务
      const taskId = await this.submitTask(provider, request);

      await this.logger.info(
        `任务已提交: ${taskId}`,
        'AsyncPollingAdapter',
        { providerId: provider.id, taskId }
      );

      // 2. 轮询任务状态
      const result = await this.pollTaskStatus(provider, taskId);

      const duration = Date.now() - startTime;

      await this.logger.info(
        `任务完成 (${duration}ms)`,
        'AsyncPollingAdapter',
        { providerId: provider.id, taskId, duration }
      );

      return {
        success: true,
        data: result,
        taskId,
        duration,
      };
    } catch (error) {
      return this.handleError(error, provider);
    }
  }

  /**
   * 提交异步任务
   */
  private async submitTask(
    provider: APIProviderConfig,
    request: APICallRequest
  ): Promise<string> {
    // 映射模型名称（供应商特定）
    const mappedModel = this.mapModelName(provider.id, request.model);

    // 构建端点和请求体
    const endpoint = this.getEndpointByModel(provider, mappedModel, request.category);
    const body = this.buildRequestBody(mappedModel, request);

    const response = await this.fetch(
      `${provider.baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: this.buildHeaders(provider),
        body: JSON.stringify(body),
      },
      provider.timeout || 30000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`任务提交失败: HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 提取任务ID（不同供应商字段名可能不同）
    const taskId = data.task_id || data.id || data.taskId;
    if (!taskId) {
      throw new Error('任务提交响应中缺少任务ID');
    }

    return taskId;
  }

  /**
   * 轮询任务状态
   */
  private async pollTaskStatus(
    provider: APIProviderConfig,
    taskId: string
  ): Promise<unknown> {
    let attempts = 0;

    while (attempts < this.MAX_POLLING_ATTEMPTS) {
      attempts++;

      // 等待轮询间隔
      if (attempts > 1) {
        await this.sleep(this.POLLING_INTERVAL);
      }

      await this.logger.info(
        `轮询任务状态 (第${attempts}次)`,
        'AsyncPollingAdapter',
        { taskId, attempts }
      );

      // 查询任务状态
      const response = await this.fetch(
        `${provider.baseUrl}/task/${taskId}`,
        {
          method: 'GET',
          headers: this.buildHeaders(provider),
        },
        provider.timeout || 30000
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`状态查询失败: HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const status = this.parseTaskStatus(data);

      switch (status) {
        case TaskStatus.SUCCEED:
          return this.extractResult(data);

        case TaskStatus.FAILED:
          throw new Error(`任务失败: ${data.error || data.message || '未知错误'}`);

        case TaskStatus.PENDING:
        case TaskStatus.PROCESSING:
          // 继续轮询
          break;

        default:
          throw new Error(`未知任务状态: ${status}`);
      }
    }

    throw new Error(`任务超时: 轮询次数超过 ${this.MAX_POLLING_ATTEMPTS} 次`);
  }

  /**
   * 解析任务状态
   */
  private parseTaskStatus(data: any): TaskStatus {
    const status = (data.status || data.state || '').toUpperCase();

    if (status.includes('SUCCEED') || status.includes('COMPLETED')) {
      return TaskStatus.SUCCEED;
    }
    if (status.includes('FAILED') || status.includes('ERROR')) {
      return TaskStatus.FAILED;
    }
    if (status.includes('PROCESSING') || status.includes('RUNNING')) {
      return TaskStatus.PROCESSING;
    }
    return TaskStatus.PENDING;
  }

  /**
   * 提取任务结果
   */
  private extractResult(data: any): unknown {
    // 尝试多种可能的结果字段
    if (data.result) return data.result;
    if (data.output) return data.output;
    if (data.data) return data.data;

    // 尝试提取URL
    if (data.url) return { url: data.url };
    if (data.image_url) return { imageUrl: data.image_url };
    if (data.video_url) return { videoUrl: data.video_url };

    return data;
  }

  /**
   * 映射模型名称（供应商特定）
   */
  private mapModelName(providerId: string, modelName: string): string {
    const providerMappings = MODEL_NAME_MAPPINGS[providerId];
    if (providerMappings && providerMappings[modelName]) {
      return providerMappings[modelName];
    }
    return modelName; // 无映射则返回原名
  }

  /**
   * 根据模型和类型获取端点
   */
  private getEndpointByModel(
    provider: APIProviderConfig,
    model: string,
    category: string
  ): string {
    // 默认端点（可根据供应商定制）
    switch (category) {
      case 'image-generation':
        return `/images/${model}`;
      case 'video-generation':
        return `/videos/${model}`;
      default:
        return `/${category}/${model}`;
    }
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(
    model: string,
    request: APICallRequest
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      prompt: request.input.prompt,
    };

    // 根据功能类型添加特定字段
    if (request.category === 'video-generation' && request.input.imageUrl) {
      body.image_url = request.input.imageUrl;
    }

    if (request.input.aspectRatio) {
      body.aspect_ratio = request.input.aspectRatio;
    }

    if (request.input.referenceImages) {
      body.reference_images = request.input.referenceImages;
    }

    return body;
  }

  /**
   * 休眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

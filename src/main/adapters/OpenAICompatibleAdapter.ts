/**
 * OpenAICompatibleAdapter - OpenAI 兼容格式适配器
 *
 * 用于调用遵循 OpenAI API 规范的服务（同步调用）
 *
 * 支持的服务：
 * - OpenAI 官方 API
 * - Anthropic Claude API
 * - DeepSeek API
 * - Ollama (本地)
 * - T8Star API
 * - 其他 OpenAI 兼容的 API
 *
 * 调用流程：
 * 1. 根据 category 构建请求体（chat/completions, images/generations, videos/generations）
 * 2. 发送同步 HTTP 请求
 * 3. 解析响应并返回结果
 */

import { BaseAdapter, APICallRequest, APICallResponse } from './BaseAdapter';
import { Logger } from '../services/Logger';
import { APIFormat } from '@/shared/types';
import type { APIProviderConfig } from '@/shared/types';

export class OpenAICompatibleAdapter extends BaseAdapter {
  constructor(logger: Logger) {
    super(logger);
  }

  get supportedFormat(): string {
    return APIFormat.OPENAI_COMPATIBLE;
  }

  async callAPI(
    provider: APIProviderConfig,
    request: APICallRequest
  ): Promise<APICallResponse> {
    const startTime = Date.now();

    try {
      await this.logger.info(
        `OpenAI兼容API调用: ${provider.name} - ${request.model}`,
        'OpenAICompatibleAdapter',
        { category: request.category }
      );

      // 根据功能类型选择端点和构建请求体
      const { endpoint, body } = this.buildRequest(provider, request);

      // 发送请求
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
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // 解析响应
      const result = this.parseResponse(data, request.category);

      await this.logger.info(
        `API调用成功 (${duration}ms)`,
        'OpenAICompatibleAdapter',
        { providerId: provider.id, duration }
      );

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      return this.handleError(error, provider);
    }
  }

  /**
   * 构建请求端点和请求体
   */
  private buildRequest(
    provider: APIProviderConfig,
    request: APICallRequest
  ): { endpoint: string; body: Record<string, unknown> } {
    switch (request.category) {
      case 'llm':
        return {
          endpoint: '/chat/completions',
          body: {
            model: request.model,
            messages: request.input.messages || [
              { role: 'user', content: request.input.prompt || '' },
            ],
            temperature: request.input.temperature || 0.7,
            max_tokens: request.input.maxTokens || 2000,
          },
        };

      case 'image-generation':
        return {
          endpoint: '/images/generations',
          body: {
            model: request.model,
            prompt: request.input.prompt || '',
            n: 1,
            size: this.mapAspectRatioToSize(request.input.aspectRatio),
          },
        };

      case 'video-generation':
        return {
          endpoint: '/videos/generations',
          body: {
            model: request.model,
            prompt: request.input.prompt || '',
            image_url: request.input.imageUrl,
            aspect_ratio: request.input.aspectRatio || '16:9',
          },
        };

      default:
        throw new Error(`不支持的功能类型: ${request.category}`);
    }
  }

  /**
   * 解析 API 响应
   */
  private parseResponse(data: any, category: string): unknown {
    switch (category) {
      case 'llm':
        return {
          text: data.choices?.[0]?.message?.content || '',
          usage: data.usage,
        };

      case 'image-generation':
        return {
          imageUrl: data.data?.[0]?.url || data.data?.[0]?.b64_json,
        };

      case 'video-generation':
        return {
          videoUrl: data.data?.[0]?.url,
          taskId: data.id,
        };

      default:
        return data;
    }
  }

  /**
   * 将宽高比映射为 OpenAI 标准尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string): string {
    switch (aspectRatio) {
      case '1:1':
        return '1024x1024';
      case '16:9':
        return '1792x1024';
      case '9:16':
        return '1024x1792';
      default:
        return '1024x1024';
    }
  }
}

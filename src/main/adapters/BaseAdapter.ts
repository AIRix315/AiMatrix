/**
 * BaseAdapter - 适配器基类
 *
 * 所有 API 适配器的抽象基类，定义统一的调用接口
 *
 * 职责：
 * - 定义适配器的基本接口
 * - 提供通用的错误处理逻辑
 * - 规范化 API 调用流程
 */

import { Logger } from '../services/Logger';
import type { APIProviderConfig } from '@/shared/types';

/**
 * API 调用请求参数
 */
export interface APICallRequest {
  model: string;
  category: string;
  input: {
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
    imageUrl?: string;
    videoUrl?: string;
    referenceImages?: string[];
    temperature?: number;
    maxTokens?: number;
    aspectRatio?: string;
    [key: string]: unknown;
  };
}

/**
 * API 调用响应结果
 */
export interface APICallResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  taskId?: string; // 异步任务ID（用于轮询）
  duration?: number; // 调用耗时（毫秒）
}

/**
 * 适配器基类
 */
export abstract class BaseAdapter {
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 获取适配器支持的 API 格式类型
   */
  abstract get supportedFormat(): string;

  /**
   * 执行 API 调用
   *
   * @param provider - Provider 配置
   * @param request - 调用请求参数
   * @returns API 调用响应
   */
  abstract callAPI(
    provider: APIProviderConfig,
    request: APICallRequest
  ): Promise<APICallResponse>;

  /**
   * 通用错误处理
   */
  protected handleError(error: unknown, provider: APIProviderConfig): APICallResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(
      `API 调用失败: ${errorMessage}`,
      'BaseAdapter',
      { providerId: provider.id, error }
    );

    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * 构建请求头
   */
  protected buildHeaders(provider: APIProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    // 根据认证类型添加认证头
    if (provider.apiKey) {
      switch (provider.authType) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
          break;
        case 'apikey':
          headers['X-API-Key'] = provider.apiKey;
          break;
        case 'basic':
          const encoded = Buffer.from(`api:${provider.apiKey}`).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
          break;
      }
    }

    return headers;
  }

  /**
   * 执行 HTTP 请求（通用封装）
   */
  protected async fetch(
    url: string,
    options: RequestInit,
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

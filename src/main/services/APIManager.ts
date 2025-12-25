/**
 * APIManager 服务 - API 管理
 *
 * MVP 功能：
 * - API 注册（支持 OpenAI、Anthropic、本地等）
 * - API 密钥管理（存储在本地配置）
 * - API 调用封装
 * - 基础状态检查
 *
 * 后续迭代：
 * - 使用量跟踪
 * - 成本统计
 * - 智能路由
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';

/**
 * API 提供商类型
 */
export enum APIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  SILICONFLOW = 'siliconflow',
  CUSTOM = 'custom'
}

/**
 * API 配置接口
 */
export interface APIConfig {
  provider: APIProvider;
  name: string;
  baseUrl: string;
  apiKey?: string;
  models?: string[];
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API 状态接口
 */
export interface APIStatus {
  name: string;
  provider: APIProvider;
  status: 'available' | 'unavailable' | 'unknown';
  lastChecked: string;
  error?: string;
}

/**
 * API 调用参数接口
 */
export interface APICallParams {
  model?: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

/**
 * APIManager 服务类
 */
export class APIManager {
  private configFile: string;
  private apis: Map<string, APIConfig> = new Map();
  private statusCache: Map<string, APIStatus> = new Map();

  constructor(configDir?: string) {
    const dir = configDir || path.join(app.getPath('userData'), 'config');
    this.configFile = path.join(dir, 'apis.json');
    this.ensureConfigDir().catch(error => {
      logger.error('Failed to create config directory', 'APIManager', { error }).catch(() => {});
    });
  }

  /**
   * 确保配置目录存在
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      const dir = path.dirname(this.configFile);
      await fs.access(dir);
    } catch {
      const dir = path.dirname(this.configFile);
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * 加载配置文件
   */
  private async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.configFile, 'utf-8');
      const configs: APIConfig[] = JSON.parse(content);

      this.apis.clear();
      for (const config of configs) {
        this.apis.set(config.name, config);
      }
    } catch (error) {
      // 文件不存在或解析失败，使用空配置
      await logger.warn('Failed to load API config, using defaults', 'APIManager', { error });
    }
  }

  /**
   * 保存配置文件
   */
  private async saveConfig(): Promise<void> {
    try {
      const configs = Array.from(this.apis.values());
      await fs.writeFile(this.configFile, JSON.stringify(configs, null, 2), 'utf-8');
    } catch (error) {
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'APIManager',
        'saveConfig',
        `Failed to save API config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    await logger.info('Initializing APIManager', 'APIManager');
    await this.ensureConfigDir();
    await this.loadConfig();

    // 注册默认 API（如果配置为空）
    if (this.apis.size === 0) {
      await this.registerDefaultAPIs();
    }

    await logger.info('APIManager initialized', 'APIManager');
  }

  /**
   * 注册默认 API
   */
  private async registerDefaultAPIs(): Promise<void> {
    const defaults: APIConfig[] = [
      {
        provider: APIProvider.OLLAMA,
        name: 'Ollama (Local)',
        baseUrl: 'http://localhost:11434/v1',
        models: ['llama3:8b', 'mistral:latest']
      },
      {
        provider: APIProvider.OPENAI,
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo']
      }
    ];

    for (const config of defaults) {
      await this.registerAPI(config.name, config);
    }

    await logger.info('Default APIs registered', 'APIManager');
  }

  /**
   * 注册 API
   */
  public async registerAPI(name: string, config: APIConfig): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        this.apis.set(name, config);
        await this.saveConfig();
        await logger.info(`API registered: ${name}`, 'APIManager', { provider: config.provider });
      },
      'APIManager',
      'registerAPI',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 设置 API 密钥
   */
  public async setAPIKey(name: string, apiKey: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const config = this.apis.get(name);
        if (!config) {
          throw new Error(`API not found: ${name}`);
        }

        config.apiKey = apiKey;
        await this.saveConfig();
        await logger.info(`API key updated: ${name}`, 'APIManager');
      },
      'APIManager',
      'setAPIKey',
      ErrorCode.API_KEY_ERROR
    );
  }

  /**
   * 获取 API 配置
   */
  public async getAPIConfig(name: string): Promise<APIConfig> {
    const config = this.apis.get(name);
    if (!config) {
      throw errorHandler.createError(
        ErrorCode.API_NOT_FOUND,
        'APIManager',
        'getAPIConfig',
        `API not found: ${name}`
      );
    }
    return config;
  }

  /**
   * 调用 API
   */
  public async callAPI(name: string, params: APICallParams): Promise<unknown> {
    return errorHandler.wrapAsync(
      async () => {
        const config = await this.getAPIConfig(name);

        // 构建请求
        const url = `${config.baseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...config.headers
        };

        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const body = {
          model: params.model || config.models?.[0] || 'default',
          messages: params.messages || [
            { role: 'user', content: params.prompt || '' }
          ],
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 1000,
          ...params
        };

        await logger.debug(`Calling API: ${name}`, 'APIManager', { url, model: body.model });

        // 发送请求
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(config.timeout || 30000)
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        await logger.debug(`API call successful: ${name}`, 'APIManager');

        return result;
      },
      'APIManager',
      'callAPI',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 检查 API 状态
   */
  public async getAPIStatus(name: string): Promise<APIStatus> {
    return errorHandler.wrapAsync(
      async () => {
        const config = await this.getAPIConfig(name);

        // 检查缓存
        const cached = this.statusCache.get(name);
        if (cached) {
          const cacheAge = Date.now() - new Date(cached.lastChecked).getTime();
          if (cacheAge < 60000) { // 1 分钟缓存
            return cached;
          }
        }

        const status: APIStatus = {
          name,
          provider: config.provider,
          status: 'unknown',
          lastChecked: new Date().toISOString()
        };

        try {
          // 简单的健康检查（尝试获取模型列表）
          const response = await fetch(`${config.baseUrl}/models`, {
            method: 'GET',
            headers: config.apiKey ? {
              'Authorization': `Bearer ${config.apiKey}`
            } : {},
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            status.status = 'available';
          } else {
            status.status = 'unavailable';
            status.error = `HTTP ${response.status}`;
          }
        } catch (error) {
          status.status = 'unavailable';
          status.error = error instanceof Error ? error.message : String(error);
        }

        // 更新缓存
        this.statusCache.set(name, status);

        return status;
      },
      'APIManager',
      'getAPIStatus',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 测试 API 连接
   *
   * @param params - 测试参数
   * @returns 测试结果，包括连接状态和可用模型列表
   */
  public async testConnection(params: {
    type: 'ollama' | 'openai' | 'siliconflow' | string;
    baseUrl: string;
    apiKey?: string;
  }): Promise<{ success: boolean; models?: string[]; error?: string }> {
    return errorHandler.wrapAsync(
      async () => {
        const { type, baseUrl, apiKey } = params;

        try {
          let modelsUrl: string;
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          // 根据不同类型构造请求
          if (type === 'ollama') {
            // Ollama: GET /api/tags
            modelsUrl = `${baseUrl}/api/tags`;
          } else {
            // OpenAI / SiliconFlow: GET /v1/models
            modelsUrl = `${baseUrl}/models`;
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
          }

          await logger.info(`Testing connection to ${type}`, 'APIManager', { url: modelsUrl });

          const response = await fetch(modelsUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000) // 10秒超时
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            return {
              success: false,
              error: `HTTP ${response.status}: ${errorText}`
            };
          }

          const data = await response.json();

          // 解析模型列表
          let models: string[] = [];
          if (type === 'ollama') {
            // Ollama 返回格式: { models: [{ name: "..." }, ...] }
            models = data.models?.map((m: any) => m.name || m.model) || [];
          } else {
            // OpenAI/SiliconFlow 返回格式: { data: [{ id: "..." }, ...] }
            models = data.data?.map((m: any) => m.id) || [];
          }

          await logger.info(`Connection test successful: ${type}`, 'APIManager', {
            modelsCount: models.length
          });

          return {
            success: true,
            models
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await logger.error(`Connection test failed: ${type}`, 'APIManager', {
            error: errorMessage
          });
          return {
            success: false,
            error: errorMessage
          };
        }
      },
      'APIManager',
      'testConnection',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 列出所有 API
   */
  public async listAPIs(): Promise<APIConfig[]> {
    return Array.from(this.apis.values());
  }

  /**
   * 移除 API
   */
  public async removeAPI(name: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        if (!this.apis.has(name)) {
          throw new Error(`API not found: ${name}`);
        }

        this.apis.delete(name);
        this.statusCache.delete(name);
        await this.saveConfig();
        await logger.info(`API removed: ${name}`, 'APIManager');
      },
      'APIManager',
      'removeAPI',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up APIManager', 'APIManager');
    // 保存配置
    await this.saveConfig().catch(error => {
      logger.error('Failed to save config during cleanup', 'APIManager', { error }).catch(() => {});
    });
    await logger.info('APIManager cleaned up', 'APIManager');
  }
}

// 导出单例实例
export const apiManager = new APIManager();

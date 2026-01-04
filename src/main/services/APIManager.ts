/**
 * APIManager 服务 - API 管理
 *
 * v2.0.0 功能：
 * - 统一的 Provider 配置模型（按功能分类）
 * - 支持同类型多 Provider（如多个 ComfyUI 实例）
 * - API 密钥管理（加密存储）
 * - API 调用封装和智能路由
 * - 成本追踪和使用量统计
 * - 状态检查和延迟监控
 *
 * 参考：plans/code-references-phase9.md (REF-013)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';
import { APIKeyEncryption } from './ConfigManager'; // 导入加密工具
import {
  APICategory,
  AuthType,
  APIProviderConfig,
  APIProviderStatus,
  APICallParams,
  ConnectionTestParams,
  ConnectionTestResult,
} from '@/shared/types';

/**
 * 旧版 API 提供商类型（向后兼容）
 * @deprecated 使用 APIProviderConfig 和 APICategory 代替
 */
export enum APIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  SILICONFLOW = 'siliconflow',
  T8STAR = 't8star',
  RUNNINGHUB = 'runninghub',
  CUSTOM = 'custom',
}

/**
 * 旧版 API 配置接口（向后兼容）
 * @deprecated 使用 APIProviderConfig 代替
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
 * 旧版 API 状态接口（向后兼容）
 * @deprecated 使用 APIProviderStatus 代替
 */
export interface APIStatus {
  name: string;
  provider: APIProvider;
  status: 'available' | 'unavailable' | 'unknown';
  lastChecked: string;
  error?: string;
}

/**
 * APIManager 服务类
 */
export class APIManager {
  private configFile: string;
  private apis: Map<string, APIConfig> = new Map(); // 旧版配置（向后兼容）
  private statusCache: Map<string, APIStatus> = new Map(); // 旧版状态（向后兼容）

  // v2.0 新增字段
  private providers: Map<string, APIProviderConfig> = new Map(); // 新版Provider配置
  private providerStatus: Map<string, APIProviderStatus> = new Map(); // 新版Provider状态
  private providersConfigFile: string; // 新版配置文件路径
  private encryption: APIKeyEncryption; // API 密钥加密工具

  constructor(configDir?: string) {
    const dir = configDir || path.join(app.getPath('userData'), 'config');
    this.configFile = path.join(dir, 'apis.json'); // 旧版配置文件
    this.providersConfigFile = path.join(dir, 'providers.json'); // 新版配置文件
    this.encryption = new APIKeyEncryption(); // 初始化加密工具
    this.ensureConfigDir().catch(error => {
      logger
        .error('Failed to create config directory', 'APIManager', { error })
        .catch(() => {});
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
   * 加载配置文件（旧版，向后兼容）
   * @deprecated
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
      await logger.warn(
        'Failed to load API config, using defaults',
        'APIManager',
        { error }
      );
    }
  }

  /**
   * 加载 Provider 配置文件（v2.0）
   * 自动解密 API Keys
   */
  private async loadProviders(): Promise<void> {
    try {
      const content = await fs.readFile(this.providersConfigFile, 'utf-8');
      const configs: (APIProviderConfig & { _encrypted?: string })[] =
        JSON.parse(content);

      this.providers.clear();
      for (const config of configs) {
        // 解密 API Key
        if (config.apiKey && config._encrypted === 'aes-256-gcm') {
          try {
            const decryptedConfig = {
              ...config,
              apiKey: this.encryption.decrypt(config.apiKey),
            };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _encrypted, ...rest } = decryptedConfig;
            this.providers.set(rest.id, rest);
          } catch (error) {
            await logger.warn(
              `Failed to decrypt API key for provider ${config.id}`,
              'APIManager',
              { error }
            );
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _encrypted, ...rest } = config;
            this.providers.set(rest.id, rest);
          }
        } else {
          // 未加密的配置，直接加载
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _encrypted, ...rest } = config;
          this.providers.set(rest.id, rest);
        }
      }
      await logger.info(`Loaded ${configs.length} providers`, 'APIManager');
    } catch (error) {
      // 文件不存在或解析失败，使用空配置
      await logger.warn(
        'Failed to load provider config, will use defaults',
        'APIManager',
        { error }
      );
    }
  }

  /**
   * 保存 Provider 配置文件（v2.0）
   * 自动加密 API Keys
   */
  private async saveProviders(): Promise<void> {
    try {
      const configs = Array.from(this.providers.values()).map(config => {
        // 加密 API Key
        if (config.apiKey && !this.encryption.isEncrypted(config.apiKey)) {
          try {
            return {
              ...config,
              apiKey: this.encryption.encrypt(config.apiKey),
              _encrypted: 'aes-256-gcm', // 标记加密算法
            };
          } catch (error) {
            logger
              .warn(
                `Failed to encrypt API key for provider ${config.id}`,
                'APIManager',
                { error }
              )
              .catch(() => {});
            return config;
          }
        }
        return config;
      });

      await fs.writeFile(
        this.providersConfigFile,
        JSON.stringify(configs, null, 2),
        'utf-8'
      );
      await logger.debug(`Saved ${configs.length} providers`, 'APIManager');
    } catch (error) {
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'APIManager',
        'saveProviders',
        `Failed to save provider config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 保存配置文件
   */
  private async saveConfig(): Promise<void> {
    try {
      const configs = Array.from(this.apis.values());
      await fs.writeFile(
        this.configFile,
        JSON.stringify(configs, null, 2),
        'utf-8'
      );
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
    await logger.info('Initializing APIManager v2.0', 'APIManager');
    await this.ensureConfigDir();

    // 加载旧版配置（向后兼容）
    await this.loadConfig();

    // 加载新版 Provider 配置
    await this.loadProviders();

    // 如果新版配置为空，注册默认 Providers
    if (this.providers.size === 0) {
      await this.registerDefaultProviders();
    }

    // 如果旧版配置存在但新版配置为空，尝试迁移
    if (this.apis.size > 0 && this.providers.size === 0) {
      await this.migrateOldConfig();
    }

    // 注册默认 API（如果旧版配置为空）- 向后兼容
    if (this.apis.size === 0) {
      await this.registerDefaultAPIs();
    }

    await logger.info('APIManager initialized', 'APIManager', {
      providersCount: this.providers.size,
      legacyApisCount: this.apis.size,
    });
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
        models: ['llama3:8b', 'mistral:latest'],
      },
      {
        provider: APIProvider.OPENAI,
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
      },
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
        await logger.info(`API registered: ${name}`, 'APIManager', {
          provider: config.provider,
        });
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
          ...config.headers,
        };

        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const body = {
          model: params.model || config.models?.[0] || 'default',
          messages: params.messages || [
            { role: 'user', content: params.prompt || '' },
          ],
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 1000,
          ...params,
        };

        await logger.debug(`Calling API: ${name}`, 'APIManager', {
          url,
          model: body.model,
        });

        // 发送请求
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(config.timeout || 30000),
        });

        if (!response.ok) {
          throw new Error(
            `API call failed: ${response.status} ${response.statusText}`
          );
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
          if (cacheAge < 60000) {
            // 1 分钟缓存
            return cached;
          }
        }

        const status: APIStatus = {
          name,
          provider: config.provider,
          status: 'unknown',
          lastChecked: new Date().toISOString(),
        };

        try {
          // 简单的健康检查（尝试获取模型列表）
          const response = await fetch(`${config.baseUrl}/models`, {
            method: 'GET',
            headers: config.apiKey
              ? {
                  Authorization: `Bearer ${config.apiKey}`,
                }
              : {},
            signal: AbortSignal.timeout(5000),
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
            'Content-Type': 'application/json',
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

          await logger.info(`Testing connection to ${type}`, 'APIManager', {
            url: modelsUrl,
          });

          const response = await fetch(modelsUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000), // 10秒超时
          });

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => 'Unknown error');
            return {
              success: false,
              error: `HTTP ${response.status}: ${errorText}`,
            };
          }

          const data = await response.json();

          // 解析模型列表
          let models: string[] = [];
          if (type === 'ollama') {
            // Ollama 返回格式: { models: [{ name: "..." }, ...] }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            models = data.models?.map((m: any) => m.name || m.model) || [];
          } else {
            // OpenAI/SiliconFlow 返回格式: { data: [{ id: "..." }, ...] }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            models = data.data?.map((m: any) => m.id) || [];
          }

          await logger.info(
            `Connection test successful: ${type}`,
            'APIManager',
            {
              modelsCount: models.length,
            }
          );

          return {
            success: true,
            models,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          await logger.error(`Connection test failed: ${type}`, 'APIManager', {
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
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
   * T8Star图片生成API调用
   * @param prompt 图片生成提示词
   * @param options 可选参数
   * @returns 生成的图片URL
   */
  public async callT8StarImage(
    prompt: string,
    options?: {
      model?: string;
      aspectRatio?: string;
      apiKey?: string;
    }
  ): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        const apiKey = options?.apiKey || this.apis.get('T8Star')?.apiKey;
        if (!apiKey) {
          throw new Error('T8Star API key not found');
        }

        const url = 'https://ai.t8star.cn/v1/images/generations';
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };

        const body = {
          prompt,
          model: options?.model || 'nano-banana',
          aspect_ratio: options?.aspectRatio || '16:9',
        };

        await logger.debug('Calling T8Star Image API', 'APIManager', {
          prompt,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000), // 60秒超时
        });

        if (!response.ok) {
          throw new Error(
            `T8Star API call failed: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        const imageUrl = result.data?.[0]?.url;

        if (!imageUrl) {
          throw new Error('No image URL returned from T8Star API');
        }

        await logger.info('T8Star Image generated', 'APIManager');
        return imageUrl;
      },
      'APIManager',
      'callT8StarImage',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * T8Star视频生成API调用
   * @param options 视频生成参数
   * @returns 生成的视频URL
   */
  public async callT8StarVideo(options: {
    prompt: string;
    imagePath?: string;
    model?: string;
    apiKey?: string;
    onProgress?: (progress: number) => void;
  }): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        const apiKey = options.apiKey || this.apis.get('T8Star')?.apiKey;
        if (!apiKey) {
          throw new Error('T8Star API key not found');
        }

        const url = 'https://ai.t8star.cn/v2/videos/generations';
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
          prompt: options.prompt,
          model: options.model || 'sora-2',
        };

        if (options.imagePath) {
          body.image = options.imagePath;
        }

        await logger.debug('Calling T8Star Video API', 'APIManager', {
          prompt: options.prompt,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180000), // 3分钟超时
        });

        if (!response.ok) {
          throw new Error(
            `T8Star Video API call failed: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        const taskId = result.task_id;

        if (!taskId) {
          throw new Error('No task ID returned from T8Star Video API');
        }

        // 轮询任务状态
        const videoUrl = await this.pollT8StarVideoStatus(
          taskId,
          apiKey,
          options.onProgress
        );

        await logger.info('T8Star Video generated', 'APIManager');
        return videoUrl;
      },
      'APIManager',
      'callT8StarVideo',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 轮询T8Star视频生成状态
   */
  private async pollT8StarVideoStatus(
    taskId: string,
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const maxAttempts = 60; // 最多轮询5分钟（每5秒一次）
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒

      const statusUrl = `https://ai.t8star.cn/v2/videos/status/${taskId}`;
      const response = await fetch(statusUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to get video status: ${response.status}`);
      }

      const status = await response.json();

      if (status.status === 'completed') {
        return status.video_url;
      } else if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error}`);
      }

      // 更新进度
      if (onProgress && status.progress) {
        onProgress(status.progress);
      }

      attempts++;
    }

    throw new Error('Video generation timed out');
  }

  /**
   * RunningHub ComfyUI 工作流任务调用
   * @param params 工作流参数
   * @returns 任务ID和结果
   */
  public async callRunningHubWorkflow(params: {
    workflowId: string;
    nodeInfoList: Array<{
      nodeId: string;
      fieldName: string;
      fieldValue: string;
    }>;
    apiKey?: string;
  }): Promise<{ taskId: string; outputs?: any[] }> {
    return errorHandler.wrapAsync(
      async () => {
        const apiKey =
          params.apiKey || this.providers.get('runninghub')?.apiKey;
        if (!apiKey) {
          throw new Error('RunningHub API key not found');
        }

        await logger.debug('Starting RunningHub workflow task', 'APIManager', {
          workflowId: params.workflowId,
        });

        // 提交ComfyUI任务
        const taskId = await this.submitRunningHubTask({
          apiKey,
          workflowId: params.workflowId,
          nodeInfoList: params.nodeInfoList,
        });

        await logger.info(`RunningHub task submitted: ${taskId}`, 'APIManager');
        return { taskId };
      },
      'APIManager',
      'callRunningHubWorkflow',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 上传资源到RunningHub（图片、视频、音频）
   */
  public async uploadRunningHubFile(
    filePath: string,
    apiKey?: string
  ): Promise<{ fileName: string; fileType: string }> {
    return errorHandler.wrapAsync(
      async () => {
        const key = apiKey || this.providers.get('runninghub')?.apiKey;
        if (!key) {
          throw new Error('RunningHub API key not found');
        }

        const formData = new FormData();
        const fileBuffer = await fs.readFile(filePath);
        const blob = new Blob([new Uint8Array(fileBuffer)]);
        formData.append('image', blob, path.basename(filePath));

        const response = await fetch(
          'https://www.runninghub.cn/task/openapi/upload',
          {
            method: 'POST',
            headers: {
              Authorization: key,
            },
            body: formData as any,
          }
        );

        if (!response.ok) {
          throw new Error(`File upload failed: ${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
          throw new Error(`Upload failed: ${result.msg}`);
        }

        return {
          fileName: result.data.fileName,
          fileType: result.data.fileType,
        };
      },
      'APIManager',
      'uploadRunningHubFile',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 提交RunningHub ComfyUI任务
   */
  private async submitRunningHubTask(params: {
    apiKey: string;
    workflowId: string;
    nodeInfoList: Array<{
      nodeId: string;
      fieldName: string;
      fieldValue: string;
    }>;
  }): Promise<string> {
    const response = await fetch(
      'https://www.runninghub.cn/task/openapi/submitComfyuiTask',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: params.apiKey,
        },
        body: JSON.stringify({
          workflowId: params.workflowId,
          nodeInfoList: params.nodeInfoList,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Task submission failed: ${response.status}`);
    }

    const result = await response.json();
    if (result.code !== 0) {
      throw new Error(`Task submission failed: ${result.msg}`);
    }

    return result.data.taskId;
  }

  /**
   * 查询RunningHub任务状态
   */
  public async queryRunningHubTaskStatus(
    taskId: string,
    apiKey?: string
  ): Promise<{ status: string; progress?: number }> {
    return errorHandler.wrapAsync(
      async () => {
        const key = apiKey || this.providers.get('runninghub')?.apiKey;
        if (!key) {
          throw new Error('RunningHub API key not found');
        }

        const response = await fetch(
          'https://www.runninghub.cn/task/openapi/getTaskStatus',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: key,
            },
            body: JSON.stringify({ taskId }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get task status: ${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
          throw new Error(`Query failed: ${result.msg}`);
        }

        return {
          status: result.data.status,
          progress: result.data.progress,
        };
      },
      'APIManager',
      'queryRunningHubTaskStatus',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 查询RunningHub任务生成结果
   */
  public async queryRunningHubTaskOutputs(
    taskId: string,
    apiKey?: string
  ): Promise<Array<{ fileUrl: string; fileType: string; nodeId: string }>> {
    return errorHandler.wrapAsync(
      async () => {
        const key = apiKey || this.providers.get('runninghub')?.apiKey;
        if (!key) {
          throw new Error('RunningHub API key not found');
        }

        const response = await fetch(
          'https://www.runninghub.cn/task/openapi/getTaskOutputs',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: key,
            },
            body: JSON.stringify({ taskId }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get task outputs: ${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
          throw new Error(`Query failed: ${result.msg}`);
        }

        return result.data || [];
      },
      'APIManager',
      'queryRunningHubTaskOutputs',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 下载文件
   */
  private async downloadFile(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`File download failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tempDir = path.join(app.getPath('userData'), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = `audio-${Date.now()}.wav`;
    const localPath = path.join(tempDir, fileName);
    await fs.writeFile(localPath, buffer);

    return localPath;
  }

  // ==================== v2.0 新增方法 ====================

  /**
   * 注册默认 Providers
   */
  private async registerDefaultProviders(): Promise<void> {
    const defaults: APIProviderConfig[] = [
      // 图像生成
      {
        id: 'comfyui-local',
        name: 'ComfyUI (本地)',
        category: APICategory.IMAGE_GENERATION,
        baseUrl: 'http://localhost:8188',
        authType: AuthType.NONE,
        enabled: false,
        description: '本地部署的 ComfyUI 工作流引擎',
      },
      {
        id: 'stability-ai',
        name: 'Stability AI',
        category: APICategory.IMAGE_GENERATION,
        baseUrl: 'https://api.stability.ai/v1',
        authType: AuthType.BEARER,
        enabled: false,
        models: ['stable-diffusion-xl-1024-v1-0', 'sd3-medium', 'sd3-large'],
        description: 'Stability AI 官方图像生成服务',
      },

      // 视频生成
      {
        id: 't8star-video',
        name: 'T8Star (视频生成)',
        category: APICategory.VIDEO_GENERATION,
        baseUrl: 'https://ai.t8star.cn/v2',
        authType: AuthType.BEARER,
        enabled: false,
        models: ['sora-2'],
        description: 'T8Star Sora-2 视频生成服务',
      },
      {
        id: 'runway-gen3',
        name: 'Runway Gen-3',
        category: APICategory.VIDEO_GENERATION,
        baseUrl: 'https://api.runwayml.com/v1',
        authType: AuthType.BEARER,
        enabled: false,
        models: ['gen3-alpha', 'gen3-alpha-turbo'],
        description: 'Runway Gen-3 视频生成服务',
      },

      // LLM
      {
        id: 'ollama-local',
        name: 'Ollama (本地)',
        category: APICategory.LLM,
        baseUrl: 'http://localhost:11434',
        authType: AuthType.NONE,
        enabled: false,
        models: ['llama3:8b', 'mistral:latest'],
        description: '本地部署的 Ollama LLM 服务',
      },
      {
        id: 'openai',
        name: 'OpenAI',
        category: APICategory.LLM,
        baseUrl: 'https://api.openai.com/v1',
        authType: AuthType.BEARER,
        enabled: false,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        description: 'OpenAI 官方 API',
      },

      // 工作流编排
      {
        id: 'runninghub',
        name: 'RunningHub',
        category: APICategory.WORKFLOW,
        baseUrl: 'https://www.runninghub.cn/task/openapi',
        authType: AuthType.BEARER,
        enabled: false,
        description: 'RunningHub ComfyUI 工作流云端执行服务',
      },

      // 工作流编排
      {
        id: 'n8n-local',
        name: 'N8N (本地)',
        category: APICategory.WORKFLOW,
        baseUrl: 'http://localhost:5678',
        authType: AuthType.NONE,
        enabled: false,
        description: '本地部署的 N8N 工作流引擎',
      },
    ];

    for (const config of defaults) {
      this.providers.set(config.id, config);
    }

    await this.saveProviders();
    await logger.info(
      `Registered ${defaults.length} default providers`,
      'APIManager'
    );
  }

  /**
   * 从旧配置迁移到新配置
   */
  private async migrateOldConfig(): Promise<void> {
    await logger.info(
      'Migrating old API config to new provider config',
      'APIManager'
    );

    for (const [_name, oldConfig] of this.apis.entries()) {
      // 映射旧的provider到新的category
      let category: APICategory = APICategory.LLM;
      switch (oldConfig.provider) {
        case APIProvider.T8STAR:
          category = APICategory.IMAGE_GENERATION;
          break;
        case APIProvider.RUNNINGHUB:
          category = APICategory.TTS;
          break;
        case APIProvider.OPENAI:
        case APIProvider.ANTHROPIC:
        case APIProvider.OLLAMA:
        case APIProvider.SILICONFLOW:
          category = APICategory.LLM;
          break;
      }

      const newConfig: APIProviderConfig = {
        id: `migrated-${oldConfig.provider}`,
        name: oldConfig.name,
        category,
        baseUrl: oldConfig.baseUrl,
        authType: oldConfig.apiKey ? AuthType.BEARER : AuthType.NONE,
        apiKey: oldConfig.apiKey,
        enabled: true,
        timeout: oldConfig.timeout,
        headers: oldConfig.headers,
        models: oldConfig.models,
        description: `从旧配置迁移 (${oldConfig.provider})`,
      };

      this.providers.set(newConfig.id, newConfig);
    }

    await this.saveProviders();
    await logger.info('Migration completed', 'APIManager', {
      migratedCount: this.apis.size,
    });
  }

  /**
   * 添加或更新 Provider
   */
  public async addProvider(config: APIProviderConfig): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const isUpdate = this.providers.has(config.id);

        this.providers.set(config.id, {
          ...config,
          updatedAt: new Date().toISOString(),
        });
        await this.saveProviders();
        await logger.info(
          `Provider ${isUpdate ? 'updated' : 'added'}: ${config.id}`,
          'APIManager'
        );
      },
      'APIManager',
      'addProvider',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 移除 Provider
   */
  public async removeProvider(providerId: string): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        if (!this.providers.has(providerId)) {
          throw new Error(`Provider not found: ${providerId}`);
        }

        this.providers.delete(providerId);
        this.providerStatus.delete(providerId);
        await this.saveProviders();
        await logger.info(`Provider removed: ${providerId}`, 'APIManager');
      },
      'APIManager',
      'removeProvider',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 获取 Provider 配置
   *
   * @param providerId - Provider ID
   * @returns Provider配置，如果不存在则返回null
   */
  public async getProvider(
    providerId: string
  ): Promise<APIProviderConfig | null> {
    const config = this.providers.get(providerId);
    return config || null;
  }

  /**
   * 列出所有 Providers
   */
  public async listProviders(options?: {
    category?: APICategory;
    enabledOnly?: boolean;
  }): Promise<APIProviderConfig[]> {
    let providers = Array.from(this.providers.values());

    // 按分类过滤
    if (options?.category) {
      providers = providers.filter(p => p.category === options.category);
    }

    // 仅返回启用的
    if (options?.enabledOnly) {
      providers = providers.filter(p => p.enabled);
    }

    return providers;
  }

  /**
   * 获取 Provider 状态
   */
  public async getProviderStatus(
    providerId: string
  ): Promise<APIProviderStatus> {
    return errorHandler.wrapAsync(
      async () => {
        const config = await this.getProvider(providerId);
        if (!config) {
          return {
            id: providerId,
            name: 'Unknown',
            category: APICategory.LLM,
            status: 'unavailable',
            error: 'Provider not found',
            lastChecked: new Date().toISOString(),
          };
        }

        // 优先返回配置文件中的持久化状态（5分钟内有效）
        if (config.lastStatus && config.lastChecked) {
          const cacheAge = Date.now() - new Date(config.lastChecked).getTime();
          if (cacheAge < 300000) {
            // 5分钟缓存
            return {
              id: providerId,
              name: config.name,
              category: config.category,
              status: config.lastStatus,
              lastChecked: config.lastChecked,
              latency: config.lastLatency,
            };
          }
        }

        const startTime = Date.now();
        const status: APIProviderStatus = {
          id: providerId,
          name: config.name,
          category: config.category,
          status: 'unknown',
          lastChecked: new Date().toISOString(),
        };

        try {
          // 根据Provider类型确定健康检查URL
          let checkUrl = config.baseUrl;
          const categoryValue = Array.isArray(config.category) ? config.category[0] : config.category;

          if (
            categoryValue === APICategory.LLM ||
            (categoryValue as string) === 'llm'
          ) {
            // LLM Provider：检查/v1/models或/models端点
            checkUrl = config.baseUrl.includes('/v1')
              ? `${config.baseUrl}/models`
              : `${config.baseUrl}/v1/models`;
          } else if (config.id.includes('ollama')) {
            // Ollama：使用/api/tags
            checkUrl = `${config.baseUrl}/api/tags`;
          } else {
            // 其他Provider：尝试health端点
            checkUrl = `${config.baseUrl}/health`;
          }

          const headers: Record<string, string> = {};
          const authTypeValue = config.authType as string;

          if (
            (config.authType === AuthType.BEARER || authTypeValue === 'bearer') &&
            config.apiKey
          ) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
          } else if (
            (config.authType === AuthType.APIKEY || authTypeValue === 'apikey') &&
            config.apiKey
          ) {
            headers['X-API-Key'] = config.apiKey;
          }

          const response = await fetch(checkUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000),
          });

          status.latency = Date.now() - startTime;

          if (response.ok) {
            status.status = 'available';
          } else {
            status.status = 'unavailable';
            status.error = `HTTP ${response.status}`;
          }
        } catch (error) {
          status.status = 'unavailable';
          status.error = error instanceof Error ? error.message : String(error);
          status.latency = Date.now() - startTime;
        }

        // 更新内存缓存
        this.providerStatus.set(providerId, status);

        // 更新配置文件中的状态（持久化）
        config.lastStatus = status.status;
        config.lastChecked = status.lastChecked;
        config.lastLatency = status.latency;
        await this.addProvider(config);

        return status;
      },
      'APIManager',
      'getProviderStatus',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 测试 Provider 连接
   */
  public async testProviderConnection(
    params: ConnectionTestParams
  ): Promise<ConnectionTestResult> {
    return errorHandler.wrapAsync(
      async () => {
        const config = await this.getProvider(params.providerId);
        if (!config) {
          return {
            success: false,
            error: 'Provider not found',
            latency: 0,
          };
        }
        const baseUrl = params.baseUrl || config.baseUrl;
        const apiKey = params.apiKey || config.apiKey;

        // 调试日志：输出Provider配置信息
        await logger.debug(
          `Testing Provider: id=${config.id}, category=${config.category}, authType=${config.authType}, hasApiKey=${!!apiKey}`,
          'APIManager'
        );

        const startTime = Date.now();

        try {
          let modelsUrl: string;
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          // 根据不同类型构造请求
          // 优先检查本地服务（无需API密钥）
          if (config.id === 'comfyui-local') {
            // ComfyUI: GET /system_stats
            modelsUrl = `${baseUrl}/system_stats`;
          } else if (config.id === 'n8n-local') {
            // N8N: GET /healthz
            modelsUrl = `${baseUrl}/healthz`;
          } else if (
            config.id === 'ollama-local' ||
            config.id.includes('ollama')
          ) {
            // Ollama: GET /api/tags
            modelsUrl = `${baseUrl}/api/tags`;
          } else if (
            config.category === APICategory.LLM ||
            (config.category as string) === 'llm' ||
            (Array.isArray(config.category) && (config.category[0] === 'llm' || config.category[0] === APICategory.LLM))
          ) {
            // LLM: GET /v1/models or /models
            modelsUrl = baseUrl.includes('/v1')
              ? `${baseUrl}/models`
              : `${baseUrl}/v1/models`;

            // 支持字符串和枚举类型的authType比较
            const isBearerAuth = config.authType === AuthType.BEARER || (config.authType as string) === 'bearer';

            if (isBearerAuth && apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
          } else if (
            config.category === APICategory.IMAGE_GENERATION ||
            config.category === APICategory.VIDEO_GENERATION ||
            config.category === APICategory.TTS ||
            config.category === APICategory.STT
          ) {
            // 图像/视频/音频服务：大多数没有标准的health端点（非本地服务）
            await logger.info(
              `Validating ${config.category} provider: ${config.id}`,
              'APIManager'
            );

            // 对于这些类型的Provider，需要API密钥才能进行真实调用测试
            if (!apiKey && config.authType !== AuthType.NONE) {
              return {
                success: false,
                error: '此类型Provider需要配置API密钥后才能测试连接',
                latency: Date.now() - startTime,
              };
            }

            // 简单验证：尝试解析baseUrl
            try {
              const url = new URL(baseUrl);
              await logger.debug(
                `Base URL validated: ${url.hostname}`,
                'APIManager'
              );

              // 返回成功，但提示需要API密钥进行完整测试
              return {
                success: true,
                models: config.models || [],
                latency: Date.now() - startTime,
                message: apiKey
                  ? 'Provider配置有效（已配置API密钥）'
                  : 'Provider配置有效（建议配置API密钥以启用完整功能）',
              };
            } catch (urlError) {
              return {
                success: false,
                error: `无效的API地址: ${baseUrl}`,
                latency: Date.now() - startTime,
              };
            }
          } else {
            // 其他类型：健康检查
            modelsUrl = `${baseUrl}/health`;
          }

          // 如果设置了modelsUrl，执行HTTP请求
          if (modelsUrl) {
            // 超详细的请求日志
            const response = await fetch(modelsUrl, {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(10000), // 10秒超时
            });

            const latency = Date.now() - startTime;

            if (!response.ok) {
              // 详细的错误日志
              await logger.error(
                `HTTP request failed: status=${response.status}, statusText=${response.statusText}`,
                'APIManager',
                {
                  url: modelsUrl,
                  status: response.status,
                  hasAuthHeader: !!headers['Authorization']
                }
              );

              // 更新Provider状态缓存为不可用
              const errorMsg = `服务离线或不可用 (HTTP ${response.status})`;
              const statusData = {
                id: params.providerId,
                name: config.name,
                category: config.category,
                status: 'unavailable' as const,
                error: errorMsg,
                lastChecked: new Date().toISOString(),
                latency,
              };
              this.providerStatus.set(params.providerId, statusData);

              // 持久化状态到配置文件
              config.lastStatus = 'unavailable';
              config.lastChecked = statusData.lastChecked;
              config.lastLatency = latency;
              await this.addProvider(config);

              return {
                success: false,
                error: errorMsg,
                latency,
              };
            }

            const data = await response.json();

            // 解析模型列表
            let models: string[] = [];
            let message = '';

            if (config.id === 'comfyui-local') {
              // ComfyUI 返回系统状态
              const ramUsed = data.system?.ram_used || data.ram_used;
              message = ramUsed
                ? `ComfyUI 服务在线 (内存使用: ${Math.round(ramUsed / 1024 / 1024)}MB)`
                : `ComfyUI 服务在线`;
              models = config.models || [];
            } else if (config.id === 'n8n-local') {
              // N8N 健康检查 - 返回 { status: "ok" } 或直接 200 OK
              message = data.status
                ? `N8N 服务在线 (状态: ${data.status})`
                : `N8N 服务在线`;
              models = config.models || [];
            } else if (
              config.id === 'ollama-local' ||
              config.id.includes('ollama')
            ) {
              // Ollama 返回格式: { models: [{ name: "..." }, ...] }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              models = data.models?.map((m: any) => m.name || m.model) || [];
              message = `Ollama 服务在线，发现 ${models.length} 个本地模型`;
            } else if (config && config.category === APICategory.LLM) {
              // OpenAI/SiliconFlow 返回格式: { data: [{ id: "..." }, ...] }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              models = data.data?.map((m: any) => m.id) || [];
              message = `连接成功，发现 ${models.length} 个模型`;
            }

            // 更新Provider状态缓存
            const statusData = {
              id: params.providerId,
              name: config.name,
              category: config.category,
              status: 'available' as const,
              lastChecked: new Date().toISOString(),
              latency,
            };
            this.providerStatus.set(params.providerId, statusData);

            // 持久化状态到配置文件
            config.lastStatus = 'available';
            config.lastChecked = statusData.lastChecked;
            config.lastLatency = latency;
            await this.addProvider(config);

            return {
              success: true,
              models,
              latency,
              message: message || '连接测试成功',
            };
          }

          // 不应该到达这里
          return {
            success: false,
            error: 'Unknown provider type',
            latency: Date.now() - startTime,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const latency = Date.now() - startTime;

          // 更新Provider状态缓存为不可用
          const statusData = {
            id: params.providerId,
            name: config.name,
            category: config.category,
            status: 'unavailable' as const,
            error: errorMessage,
            lastChecked: new Date().toISOString(),
            latency,
          };
          this.providerStatus.set(params.providerId, statusData);

          // 持久化状态到配置文件
          config.lastStatus = 'unavailable';
          config.lastChecked = statusData.lastChecked;
          config.lastLatency = latency;
          await this.addProvider(config);

          return {
            success: false,
            error: errorMessage,
            latency,
          };
        }
      },
      'APIManager',
      'testProviderConnection',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up APIManager', 'APIManager');
    // 保存旧版配置
    await this.saveConfig().catch(error => {
      logger
        .error('Failed to save config during cleanup', 'APIManager', { error })
        .catch(() => {});
    });
    // 保存新版配置
    await this.saveProviders().catch(error => {
      logger
        .error('Failed to save providers during cleanup', 'APIManager', {
          error,
        })
        .catch(() => {});
    });
    await logger.info('APIManager cleaned up', 'APIManager');
  }
}

// 导出单例实例
export const apiManager = new APIManager();

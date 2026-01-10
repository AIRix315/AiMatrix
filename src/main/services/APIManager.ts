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
import { timeService } from './TimeService';
import {
  APICategory,
  AuthType,
  APIFormat,
  APIProviderConfig,
  APIProviderStatus,
  ConnectionTestParams,
  ConnectionTestResult,
} from '@/shared/types';
import {
  BaseAdapter,
  OpenAICompatibleAdapter,
  AsyncPollingAdapter,
  ComfyUIWorkflowAdapter,
  type APICallRequest,
  type APICallResponse,
} from '../adapters';
/**
 * APIManager 服务类
 */
export class APIManager {
  private providers: Map<string, APIProviderConfig> = new Map();
  private providerStatus: Map<string, APIProviderStatus> = new Map();
  private providersConfigFile: string;
  private encryption: APIKeyEncryption;

  // V0.4.0 新增：Adapter 管理
  private adapters: Map<string, BaseAdapter> = new Map();

  constructor(configDir?: string) {
    const dir = configDir || path.join(app.getPath('userData'), 'config');
    this.providersConfigFile = path.join(dir, 'providers.json');
    this.encryption = new APIKeyEncryption();

    // 注册适配器
    this.registerAdapters();

    this.ensureConfigDir().catch(error => {
      logger
        .error('Failed to create config directory', 'APIManager', { error })
        .catch(() => {});
    });
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      const dir = path.dirname(this.providersConfigFile);
      await fs.access(dir);
    } catch {
      const dir = path.dirname(this.providersConfigFile);
      await fs.mkdir(dir, { recursive: true });
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
  public async initialize(): Promise<void> {
    await logger.info('Initializing APIManager', 'APIManager');
    await this.ensureConfigDir();
    await this.loadProviders();

    if (this.providers.size === 0) {
      await this.registerDefaultProviders();
    }

    await logger.info('APIManager initialized', 'APIManager', {
      providersCount: this.providers.size,
    });
  }
  public async callT8StarImage(
    prompt: string,
    options?: {
      providerId?: string;
      model?: string;
      aspectRatio?: string;
      apiKey?: string;
    }
  ): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        let apiKey = options?.apiKey;

        if (!apiKey && options?.providerId) {
          const provider = await this.getProvider(options.providerId);
          apiKey = provider?.apiKey;
        }

        if (!apiKey) {
          const providers = await this.listProviders({
            category: APICategory.IMAGE_GENERATION,
            enabledOnly: true
          });
          if (providers.length > 0) {
            apiKey = providers[0].apiKey;
          }
        }

        if (!apiKey) {
          throw new Error('未找到可用的图像生成Provider，请配置并启用Provider');
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

  public async callT8StarVideo(options: {
    providerId?: string;
    prompt: string;
    imagePath?: string;
    model?: string;
    apiKey?: string;
    onProgress?: (progress: number) => void;
  }): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        let apiKey = options.apiKey;

        if (!apiKey && options.providerId) {
          const provider = await this.getProvider(options.providerId);
          apiKey = provider?.apiKey;
        }

        if (!apiKey) {
          const providers = await this.listProviders({
            category: APICategory.VIDEO_GENERATION,
            enabledOnly: true
          });
          if (providers.length > 0) {
            apiKey = providers[0].apiKey;
          }
        }

        if (!apiKey) {
          throw new Error('未找到可用的视频生成Provider，请配置并启用Provider');
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

  public async callRunningHubWorkflow(params: {
    providerId?: string;
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
        let apiKey = params.apiKey;

        if (!apiKey && params.providerId) {
          const provider = await this.getProvider(params.providerId);
          apiKey = provider?.apiKey;
        }

        if (!apiKey) {
          const providers = await this.listProviders({
            category: APICategory.WORKFLOW,
            enabledOnly: true
          });
          if (providers.length > 0) {
            apiKey = providers[0].apiKey;
          }
        }

        if (!apiKey) {
          throw new Error('未找到可用的工作流Provider，请配置并启用Provider');
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

  public async uploadRunningHubFile(
    filePath: string,
    options?: {
      providerId?: string;
      apiKey?: string;
    }
  ): Promise<{ fileName: string; fileType: string }> {
    return errorHandler.wrapAsync(
      async () => {
        let apiKey = options?.apiKey;

        if (!apiKey && options?.providerId) {
          const provider = await this.getProvider(options.providerId);
          apiKey = provider?.apiKey;
        }

        if (!apiKey) {
          const providers = await this.listProviders({
            category: APICategory.WORKFLOW,
            enabledOnly: true
          });
          if (providers.length > 0) {
            apiKey = providers[0].apiKey;
          }
        }

        if (!apiKey) {
          throw new Error('未找到可用的工作流Provider，请配置并启用Provider');
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
              Authorization: apiKey,
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

  public async queryRunningHubTaskStatus(
    taskId: string,
    options?: {
      providerId?: string;
      apiKey?: string;
    }
  ): Promise<{ status: string; progress?: number }> {
    return errorHandler.wrapAsync(
      async () => {
        let apiKey = options?.apiKey;

        if (!apiKey && options?.providerId) {
          const provider = await this.getProvider(options.providerId);
          apiKey = provider?.apiKey;
        }

        if (!apiKey) {
          const providers = await this.listProviders({
            category: APICategory.WORKFLOW,
            enabledOnly: true
          });
          if (providers.length > 0) {
            apiKey = providers[0].apiKey;
          }
        }

        if (!apiKey) {
          throw new Error('未找到可用的工作流Provider，请配置并启用Provider');
        }

        const response = await fetch(
          'https://www.runninghub.cn/task/openapi/getTaskStatus',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: apiKey,
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

  public async queryRunningHubTaskOutputs(
    taskId: string,
    options?: {
      providerId?: string;
      apiKey?: string;
    }
  ): Promise<Array<{ fileUrl: string; fileType: string; nodeId: string }>> {
    return errorHandler.wrapAsync(
      async () => {
        let apiKey = options?.apiKey;

        if (!apiKey && options?.providerId) {
          const provider = await this.getProvider(options.providerId);
          apiKey = provider?.apiKey;
        }

        if (!apiKey) {
          const providers = await this.listProviders({
            category: APICategory.WORKFLOW,
            enabledOnly: true
          });
          if (providers.length > 0) {
            apiKey = providers[0].apiKey;
          }
        }

        if (!apiKey) {
          throw new Error('未找到可用的工作流Provider，请配置并启用Provider');
        }

        const response = await fetch(
          'https://www.runninghub.cn/task/openapi/getTaskOutputs',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: apiKey,
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

    const fileName = `audio-${await timeService.getTimestamp()}.wav`;
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
        apiFormat: APIFormat.COMFYUI_WORKFLOW,
        enabled: false,
        description: '本地部署的 ComfyUI 工作流引擎',
      },
      {
        id: 'stability-ai',
        name: 'Stability AI',
        category: APICategory.IMAGE_GENERATION,
        baseUrl: 'https://api.stability.ai/v1',
        authType: AuthType.BEARER,
        apiFormat: APIFormat.OPENAI_COMPATIBLE,
        enabled: false,
        description: 'Stability AI 官方图像生成服务',
      },

      // 视频生成
      {
        id: 't8star-video',
        name: 'T8Star (视频生成)',
        category: APICategory.VIDEO_GENERATION,
        baseUrl: 'https://ai.t8star.cn/v2',
        authType: AuthType.BEARER,
        apiFormat: APIFormat.OPENAI_COMPATIBLE,
        enabled: false,
        description: 'T8Star Sora-2 视频生成服务',
      },
      {
        id: 'runway-gen3',
        name: 'Runway Gen-3',
        category: APICategory.VIDEO_GENERATION,
        baseUrl: 'https://api.runwayml.com/v1',
        authType: AuthType.BEARER,
        apiFormat: APIFormat.ASYNC_POLLING,
        enabled: false,
        description: 'Runway Gen-3 视频生成服务',
      },

      // LLM
      {
        id: 'ollama-local',
        name: 'Ollama (本地)',
        category: APICategory.LLM,
        baseUrl: 'http://localhost:11434',
        authType: AuthType.NONE,
        apiFormat: APIFormat.OPENAI_COMPATIBLE,
        enabled: false,
        description: '本地部署的 Ollama LLM 服务',
      },
      {
        id: 'openai',
        name: 'OpenAI',
        category: APICategory.LLM,
        baseUrl: 'https://api.openai.com/v1',
        authType: AuthType.BEARER,
        apiFormat: APIFormat.OPENAI_COMPATIBLE,
        enabled: false,
        description: 'OpenAI 官方 API',
      },

      // 工作流编排
      {
        id: 'runninghub',
        name: 'RunningHub',
        category: APICategory.WORKFLOW,
        baseUrl: 'https://www.runninghub.cn/task/openapi',
        authType: AuthType.BEARER,
        apiFormat: APIFormat.COMFYUI_WORKFLOW,
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
        apiFormat: APIFormat.COMFYUI_WORKFLOW,
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
   * 添加或更新 Provider
   */
  public async addProvider(config: APIProviderConfig): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const isUpdate = this.providers.has(config.id);

        this.providers.set(config.id, {
          ...config,
          updatedAt: await timeService.getISOString(),
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
            lastChecked: await timeService.getISOString(),
          };
        }

        // 优先返回配置文件中的持久化状态（5分钟内有效）
        if (config.lastStatus && config.lastChecked) {
          const cacheAge = await timeService.getTimestamp() - new Date(config.lastChecked).getTime();
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

        const startTime = await timeService.getTimestamp();
        const status: APIProviderStatus = {
          id: providerId,
          name: config.name,
          category: config.category,
          status: 'unknown',
          lastChecked: await timeService.getISOString(),
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

          status.latency = await timeService.getTimestamp() - startTime;

          if (response.ok) {
            status.status = 'available';
          } else {
            status.status = 'unavailable';
            status.error = `HTTP ${response.status}`;
          }
        } catch (error) {
          status.status = 'unavailable';
          status.error = error instanceof Error ? error.message : String(error);
          status.latency = await timeService.getTimestamp() - startTime;
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

        const startTime = await timeService.getTimestamp();

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
                latency: await timeService.getTimestamp() - startTime,
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
                models: [], // 这些Provider没有标准的模型列表端点
                latency: await timeService.getTimestamp() - startTime,
                message: apiKey
                  ? 'Provider配置有效（已配置API密钥）'
                  : 'Provider配置有效（建议配置API密钥以启用完整功能）',
              };
            } catch (urlError) {
              return {
                success: false,
                error: `无效的API地址: ${baseUrl}`,
                latency: await timeService.getTimestamp() - startTime,
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

            const latency = await timeService.getTimestamp() - startTime;

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
                lastChecked: await timeService.getISOString(),
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
              models = []; // ComfyUI 没有标准的模型列表
            } else if (config.id === 'n8n-local') {
              // N8N 健康检查 - 返回 { status: "ok" } 或直接 200 OK
              message = data.status
                ? `N8N 服务在线 (状态: ${data.status})`
                : `N8N 服务在线`;
              models = []; // N8N 没有标准的模型列表
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
              lastChecked: await timeService.getISOString(),
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
            lastChecked: await timeService.getISOString(),
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
   * 设置Provider的已选择模型
   */
  public async setSelectedModels(
    providerId: string,
    selectedModels: string[]
  ): Promise<void> {
    return errorHandler.wrapAsync(
      async () => {
        const config = this.providers.get(providerId);
        if (!config) {
          throw new Error(`Provider ${providerId} not found`);
        }

        // 验证并记录警告
        if (!selectedModels || selectedModels.length === 0) {
          await logger.warn(
            `Setting empty model list for provider: ${providerId}`,
            'APIManager'
          );
        }

        // 注意：不再验证 selectedModels 是否在 models 列表中
        // 因为 models 字段已被移除，检测结果只是临时数据

        config.selectedModels = selectedModels;
        this.providers.set(providerId, config);
        await this.saveProviders();

        await logger.info(
          `Updated selected models for ${providerId}: ${selectedModels.join(', ')}`,
          'APIManager'
        );
      },
      'APIManager',
      'setSelectedModels',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 获取Provider的已选择模型
   */
  public async getSelectedModels(providerId: string): Promise<string[]> {
    return errorHandler.wrapAsync(
      async () => {
        const config = this.providers.get(providerId);
        return config?.selectedModels || [];
      },
      'APIManager',
      'getSelectedModels',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up APIManager', 'APIManager');
    await this.saveProviders().catch((error: Error) => {
      logger
        .error('Failed to save providers during cleanup', 'APIManager', {
          error,
        })
        .catch(() => {});
    });
    await logger.info('APIManager cleaned up', 'APIManager');
  }

  // ==================== V0.4.0 新增：Adapter 系统 ====================

  /**
   * 注册所有适配器
   */
  private registerAdapters(): void {
    this.adapters.set(APIFormat.OPENAI_COMPATIBLE, new OpenAICompatibleAdapter(logger));
    this.adapters.set(APIFormat.ASYNC_POLLING, new AsyncPollingAdapter(logger));
    this.adapters.set(APIFormat.COMFYUI_WORKFLOW, new ComfyUIWorkflowAdapter(logger));

    logger
      .info(`Registered ${this.adapters.size} adapters`, 'APIManager')
      .catch(() => {});
  }

  /**
   * 统一的模型调用方法（V0.4.0 核心方法）
   *
   * 根据模型名称自动路由到合适的 Provider 和 Adapter
   *
   * @param params - 调用参数
   * @returns API 调用响应
   */
  public async callModel(params: {
    model: string;
    category: APICategory;
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
    providerId?: string; // 可选：指定使用特定的 Provider
  }): Promise<APICallResponse> {
    return errorHandler.wrapAsync(
      async () => {
        await logger.info(
          `调用模型: ${params.model} (${params.category})`,
          'APIManager',
          { providerId: params.providerId || 'auto' }
        );

        // 1. 选择 Provider
        const provider = params.providerId
          ? await this.selectProviderById(params.providerId)
          : await this.selectProviderByModel(params.model, params.category);

        if (!provider) {
          throw new Error(
            `未找到支持模型 ${params.model} 的 ${params.category} Provider`
          );
        }

        // 2. 选择 Adapter
        const adapter = this.adapters.get(provider.apiFormat);
        if (!adapter) {
          throw new Error(`不支持的 API 格式: ${provider.apiFormat}`);
        }

        // 3. 构建请求
        const request: APICallRequest = {
          model: params.model,
          category: params.category,
          input: params.input,
        };

        // 4. 执行调用
        const response = await adapter.callAPI(provider, request);

        await logger.info(
          `模型调用${response.success ? '成功' : '失败'}`,
          'APIManager',
          {
            providerId: provider.id,
            model: params.model,
            duration: response.duration,
          }
        );

        return response;
      },
      'APIManager',
      'callModel',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 根据 Provider ID 选择 Provider
   */
  private async selectProviderById(providerId: string): Promise<APIProviderConfig | null> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      await logger.warn(
        `Provider ${providerId} 不存在`,
        'APIManager'
      );
      return null;
    }

    if (!provider.enabled) {
      await logger.warn(
        `Provider ${providerId} 未启用`,
        'APIManager'
      );
      return null;
    }

    return provider;
  }

  /**
   * 根据模型名称和功能类型选择 Provider（优先级排序）
   *
   * 优先级规则：
   * 1. 插件模板推荐（templateRecommended = true）
   * 2. 已启用（enabled = true）
   * 3. 手动优先级（priority 数值大的优先）
   */
  private async selectProviderByModel(
    model: string,
    category: APICategory
  ): Promise<APIProviderConfig | null> {
    // 查找支持该模型的所有 Providers（从用户选择的模型中查找）
    const candidates = Array.from(this.providers.values()).filter(
      (p) =>
        p.category === category &&
        p.selectedModels?.includes(model) &&
        p.enabled
    );

    if (candidates.length === 0) {
      await logger.warn(
        `未找到支持模型 ${model} 的已启用 Provider`,
        'APIManager',
        { category }
      );
      return null;
    }

    // 按优先级排序
    candidates.sort((a, b) => {
      // 1. 插件模板推荐优先
      if (a.templateRecommended && !b.templateRecommended) return -1;
      if (!a.templateRecommended && b.templateRecommended) return 1;

      // 2. 手动优先级（数值越大越优先）
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

    const selected = candidates[0];
    await logger.info(
      `自动选择 Provider: ${selected.name} (${selected.id})`,
      'APIManager',
      {
        model,
        category,
        totalCandidates: candidates.length,
        templateRecommended: selected.templateRecommended || false,
        priority: selected.priority || 0,
      }
    );

    return selected;
  }
}

// 导出单例实例
export const apiManager = new APIManager();

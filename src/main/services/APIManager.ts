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
  T8STAR = 't8star',
  RUNNINGHUB = 'runninghub',
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
          'Authorization': `Bearer ${apiKey}`
        };

        const body = {
          prompt,
          model: options?.model || 'nano-banana',
          aspect_ratio: options?.aspectRatio || '16:9'
        };

        await logger.debug('Calling T8Star Image API', 'APIManager', { prompt });

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000) // 60秒超时
        });

        if (!response.ok) {
          throw new Error(`T8Star API call failed: ${response.status} ${response.statusText}`);
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
          'Authorization': `Bearer ${apiKey}`
        };

        const body: any = {
          prompt: options.prompt,
          model: options.model || 'sora-2'
        };

        if (options.imagePath) {
          body.image = options.imagePath;
        }

        await logger.debug('Calling T8Star Video API', 'APIManager', { prompt: options.prompt });

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180000) // 3分钟超时
        });

        if (!response.ok) {
          throw new Error(`T8Star Video API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const taskId = result.task_id;

        if (!taskId) {
          throw new Error('No task ID returned from T8Star Video API');
        }

        // 轮询任务状态
        const videoUrl = await this.pollT8StarVideoStatus(taskId, apiKey, options.onProgress);

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
        headers: { 'Authorization': `Bearer ${apiKey}` }
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
   * RunningHub TTS API调用（4步流程）
   * @param params TTS参数
   * @returns 生成的音频路径
   */
  public async callRunningHubTTS(params: {
    text: string;
    voiceFilePath: string;
    emotion: number[];
    apiKey?: string;
  }): Promise<string> {
    return errorHandler.wrapAsync(
      async () => {
        const apiKey = params.apiKey || this.apis.get('RunningHub')?.apiKey;
        if (!apiKey) {
          throw new Error('RunningHub API key not found');
        }

        await logger.debug('Starting RunningHub TTS', 'APIManager', { text: params.text });

        // Step 1: 上传音色文件
        const voiceFileName = await this.uploadRunningHubFile(params.voiceFilePath, apiKey);

        // Step 2: 创建TTS任务
        const taskId = await this.createRunningHubTTSTask({
          apiKey,
          text: params.text,
          voiceFileName,
          emotion: params.emotion
        });

        // Step 3: 轮询任务状态
        const audioUrl = await this.pollRunningHubTaskStatus(taskId, apiKey);

        // Step 4: 下载音频文件
        const localPath = await this.downloadFile(audioUrl);

        await logger.info('RunningHub TTS completed', 'APIManager');
        return localPath;
      },
      'APIManager',
      'callRunningHubTTS',
      ErrorCode.API_CALL_ERROR
    );
  }

  /**
   * 上传文件到RunningHub
   */
  private async uploadRunningHubFile(filePath: string, apiKey: string): Promise<string> {
    const formData = new FormData();
    const fileBuffer = await fs.readFile(filePath);
    // 在Node.js环境中，FormData可以直接接受Buffer
    // 将Buffer转换为Blob以满足类型要求
    const blob = new Blob([new Uint8Array(fileBuffer)]);
    formData.append('file', blob, path.basename(filePath));

    const response = await fetch('https://www.runninghub.cn/task/openapi/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData as any
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result.file_name;
  }

  /**
   * 创建RunningHub TTS任务
   */
  private async createRunningHubTTSTask(params: {
    apiKey: string;
    text: string;
    voiceFileName: string;
    emotion: number[];
  }): Promise<string> {
    const response = await fetch('https://www.runninghub.cn/task/openapi/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiKey}`
      },
      body: JSON.stringify({
        text: params.text,
        voice_file: params.voiceFileName,
        emotion: params.emotion
      })
    });

    if (!response.ok) {
      throw new Error(`Task creation failed: ${response.status}`);
    }

    const result = await response.json();
    return result.task_id;
  }

  /**
   * 轮询RunningHub任务状态
   */
  private async pollRunningHubTaskStatus(taskId: string, apiKey: string): Promise<string> {
    const maxAttempts = 120; // 最多轮询10分钟（每5秒一次）
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒

      const response = await fetch(
        `https://www.runninghub.cn/task/openapi/status/${taskId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.status}`);
      }

      const status = await response.json();

      if (status.status === 'completed') {
        return status.audio_url;
      } else if (status.status === 'failed') {
        throw new Error(`TTS generation failed: ${status.error}`);
      }

      attempts++;
    }

    throw new Error('TTS generation timed out');
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

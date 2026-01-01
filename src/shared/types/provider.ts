/**
 * Provider 类型定义
 *
 * 定义 AI Provider 的抽象接口和结果类型
 * MATRIX Studio 作为编排平台，不直接执行 AI 操作，而是路由到具体 Provider
 */

/**
 * 操作类型枚举
 */
export enum OperationType {
  TEXT_TO_IMAGE = 'text-to-image',
  IMAGE_TO_IMAGE = 'image-to-image',
  IMAGE_TO_VIDEO = 'image-to-video',
  TEXT_TO_AUDIO = 'text-to-audio',
  TEXT_TO_TEXT = 'text-to-text'
}

/**
 * Provider 基础接口
 */
export interface IProvider {
  /** Provider 唯一标识符 */
  readonly id: string;

  /** Provider 显示名称 */
  readonly name: string;

  /** Provider 类型 */
  readonly type: 'online' | 'local';

  /** 支持的操作类型列表 */
  readonly supportedOperations: OperationType[];

  /**
   * 检查 Provider 可用性
   * @returns 是否可用
   */
  checkAvailability(): Promise<boolean>;
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  QUEUED = 'TASK_STATUS_QUEUED',
  PROCESSING = 'TASK_STATUS_PROCESSING',
  SUCCEED = 'TASK_STATUS_SUCCEED',
  FAILED = 'TASK_STATUS_FAILED'
}

/**
 * 统一操作结果格式
 */
export interface OperationResult<T = unknown> {
  /** 是否成功 */
  success: boolean;

  /** 任务ID（异步操作时返回） */
  taskId?: string;

  /** 任务状态 */
  status?: TaskStatus;

  /** 结果数据 */
  result?: T;

  /** 错误信息 */
  error?: string;
}

/**
 * 文生图参数
 */
export interface TextToImageParams {
  /** 提示词 */
  prompt: string;

  /** 图片宽度 */
  width: number;

  /** 图片高度 */
  height: number;

  /** 负面提示词（可选） */
  negativePrompt?: string;

  /** 随机种子（可选） */
  seed?: number;

  /** 指定 Provider ID（可选，不指定则使用默认） */
  providerId?: string;
}

/**
 * 文生图结果
 */
export interface TextToImageResult {
  /** 是否成功 */
  success: boolean;

  /** 生成的图片 URL */
  imageUrl?: string;

  /** 本地文件路径 */
  imageFilePath?: string;

  /** 任务ID（异步操作） */
  taskId?: string;

  /** 任务状态 */
  status?: TaskStatus;

  /** 错误信息 */
  error?: string;

  /** 生成参数（用于复现） */
  metadata?: {
    prompt: string;
    width: number;
    height: number;
    negativePrompt?: string;
    seed?: number;
    model?: string;
  };
}

/**
 * 图生图参数
 */
export interface ImageToImageParams {
  /** 输入图片路径或 URL */
  imageInput: string;

  /** 提示词 */
  prompt: string;

  /** 图片宽度 */
  width: number;

  /** 图片高度 */
  height: number;

  /** 负面提示词（可选） */
  negativePrompt?: string;

  /** 变化强度 0-1（可选） */
  strength?: number;

  /** 随机种子（可选） */
  seed?: number;

  /** 指定 Provider ID（可选） */
  providerId?: string;
}

/**
 * 图生图结果
 */
export interface ImageToImageResult {
  /** 是否成功 */
  success: boolean;

  /** 生成的图片 URL */
  imageUrl?: string;

  /** 本地文件路径 */
  imageFilePath?: string;

  /** 任务ID（异步操作） */
  taskId?: string;

  /** 任务状态 */
  status?: TaskStatus;

  /** 错误信息 */
  error?: string;

  /** 生成参数（用于复现） */
  metadata?: {
    prompt: string;
    width: number;
    height: number;
    negativePrompt?: string;
    strength?: number;
    seed?: number;
    model?: string;
  };
}

/**
 * 图生视频参数
 */
export interface ImageToVideoParams {
  /** 输入图片路径或 URL */
  imageInput: string;

  /** 提示词 */
  prompt: string;

  /** 视频时长（秒） */
  duration?: number;

  /** 帧率（可选） */
  fps?: number;

  /** 随机种子（可选） */
  seed?: number;

  /** 指定 Provider ID（可选） */
  providerId?: string;
}

/**
 * 图生视频结果
 */
export interface ImageToVideoResult {
  /** 是否成功 */
  success: boolean;

  /** 生成的视频 URL */
  videoUrl?: string;

  /** 本地文件路径 */
  videoFilePath?: string;

  /** 任务ID（异步操作） */
  taskId?: string;

  /** 任务状态 */
  status?: TaskStatus;

  /** 错误信息 */
  error?: string;

  /** 生成参数（用于复现） */
  metadata?: {
    prompt: string;
    duration?: number;
    fps?: number;
    seed?: number;
    model?: string;
  };
}

/**
 * 文生图 Provider 接口
 */
export interface ITextToImageProvider extends IProvider {
  /**
   * 执行文生图操作
   * @param params 文生图参数
   * @returns 文生图结果
   */
  textToImage(params: Omit<TextToImageParams, 'providerId'>): Promise<TextToImageResult>;
}

/**
 * 图生图 Provider 接口
 */
export interface IImageToImageProvider extends IProvider {
  /**
   * 执行图生图操作
   * @param params 图生图参数
   * @returns 图生图结果
   */
  imageToImage(params: Omit<ImageToImageParams, 'providerId'>): Promise<ImageToImageResult>;
}

/**
 * 图生视频 Provider 接口
 */
export interface IImageToVideoProvider extends IProvider {
  /**
   * 执行图生视频操作
   * @param params 图生视频参数
   * @returns 图生视频结果
   */
  imageToVideo(params: Omit<ImageToVideoParams, 'providerId'>): Promise<ImageToVideoResult>;
}

/**
 * Provider 配置信息
 */
export interface ProviderConfig {
  /** Provider ID */
  id: string;

  /** 是否启用 */
  enabled: boolean;

  /** API Key */
  apiKey?: string;

  /** 自定义配置 */
  settings?: Record<string, unknown>;
}

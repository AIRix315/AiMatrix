/**
 * TaskTemplate - 任务模板系统
 *
 * Phase 7 H02.1: 将常见任务操作（生图、TTS、视频生成）封装为标准模板
 *
 * 核心目标：
 * - 提供开箱即用的任务模板
 * - 简化插件开发，无需手写TaskConfig
 * - 统一错误处理和重试逻辑
 * - 支持参数验证和默认值
 */

import { TaskType, TaskConfig } from '../TaskScheduler';
import { TaskPriority } from './ConcurrencyManager';

/**
 * 任务模板基类接口
 */
export interface TaskTemplate<TInput = any, TOutput = any> {
  /** 模板ID */
  readonly id: string;

  /** 模板名称 */
  readonly name: string;

  /** 模板描述 */
  readonly description: string;

  /** 任务类型 */
  readonly type: TaskType;

  /** 默认优先级 */
  readonly defaultPriority: TaskPriority;

  /** 参数验证器 */
  validateInput(input: TInput): Promise<ValidationResult>;

  /** 构建TaskConfig */
  buildTaskConfig(input: TInput, options?: TaskTemplateOptions): TaskConfig;

  /** 执行后处理（可选） */
  postProcess?(result: TOutput, input: TInput): Promise<TOutput>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * 任务模板选项
 */
export interface TaskTemplateOptions {
  /** 任务名称（覆盖默认） */
  name?: string;

  /** 任务描述 */
  description?: string;

  /** 优先级 */
  priority?: TaskPriority;

  /** 重试次数 */
  retryCount?: number;

  /** 重试延迟（毫秒） */
  retryDelay?: number;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/**
 * 图片生成任务输入
 */
export interface ImageGenerationInput {
  /** 图片提示词 */
  prompt: string;

  /** 负向提示词（可选） */
  negativePrompt?: string;

  /** 宽度 */
  width?: number;

  /** 高度 */
  height?: number;

  /** 采样步数 */
  steps?: number;

  /** CFG Scale */
  cfgScale?: number;

  /** 种子 */
  seed?: number;

  /** 模型名称 */
  model?: string;

  /** 输出路径 */
  outputPath: string;
}

/**
 * 图片生成任务输出
 */
export interface ImageGenerationOutput {
  /** 生成的图片路径 */
  imagePath: string;

  /** 实际使用的种子 */
  seed: number;

  /** 生成时间（秒） */
  duration: number;

  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * TTS任务输入
 */
export interface TTSInput {
  /** 文本内容 */
  text: string;

  /** 音色ID */
  voiceId: string;

  /** 语速（0.5-2.0） */
  speed?: number;

  /** 音调（-12到12） */
  pitch?: number;

  /** 音量（0-1） */
  volume?: number;

  /** 情绪向量（8维） */
  emotion?: number[];

  /** 输出路径 */
  outputPath: string;
}

/**
 * TTS任务输出
 */
export interface TTSOutput {
  /** 生成的音频路径 */
  audioPath: string;

  /** 音频时长（秒） */
  duration: number;

  /** 文件大小（字节） */
  fileSize: number;
}

/**
 * 视频生成任务输入
 */
export interface VideoGenerationInput {
  /** 视频提示词 */
  prompt: string;

  /** 参考图片路径（可选） */
  referenceImage?: string;

  /** 视频时长（秒） */
  duration?: number;

  /** 分辨率 */
  resolution?: '720p' | '1080p' | '4k';

  /** 帧率 */
  fps?: number;

  /** 模型名称 */
  model?: string;

  /** 输出路径 */
  outputPath: string;
}

/**
 * 视频生成任务输出
 */
export interface VideoGenerationOutput {
  /** 生成的视频路径 */
  videoPath: string;

  /** 视频时长（秒） */
  duration: number;

  /** 文件大小（字节） */
  fileSize: number;

  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 图片生成任务模板
 */
export class ImageGenerationTemplate implements TaskTemplate<ImageGenerationInput, ImageGenerationOutput> {
  readonly id = 'image-generation';
  readonly name = '图片生成';
  readonly description = 'AI图片生成任务模板（支持T8Star、ComfyUI等）';
  readonly type = TaskType.API_CALL;
  readonly defaultPriority = TaskPriority.NORMAL;

  async validateInput(input: ImageGenerationInput): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!input.prompt || input.prompt.trim().length === 0) {
      errors.push('prompt不能为空');
    }

    if (input.prompt && input.prompt.length > 2000) {
      errors.push('prompt长度不能超过2000字符');
    }

    if (!input.outputPath || input.outputPath.trim().length === 0) {
      errors.push('outputPath不能为空');
    }

    if (input.width && (input.width < 64 || input.width > 4096)) {
      errors.push('width必须在64-4096之间');
    }

    if (input.height && (input.height < 64 || input.height > 4096)) {
      errors.push('height必须在64-4096之间');
    }

    if (input.steps && (input.steps < 1 || input.steps > 150)) {
      errors.push('steps必须在1-150之间');
    }

    if (input.cfgScale && (input.cfgScale < 1 || input.cfgScale > 30)) {
      errors.push('cfgScale必须在1-30之间');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  buildTaskConfig(input: ImageGenerationInput, options?: TaskTemplateOptions): TaskConfig {
    return {
      type: this.type,
      name: options?.name || `生成图片: ${input.prompt.substring(0, 30)}...`,
      description: options?.description || `AI生成图片，提示词: ${input.prompt}`,
      apiName: 'image-generation',
      apiParams: {
        prompt: input.prompt,
        negative_prompt: input.negativePrompt || '',
        width: input.width || 512,
        height: input.height || 512,
        steps: input.steps || 20,
        cfg_scale: input.cfgScale || 7,
        seed: input.seed || -1,
        model: input.model || 'default',
        output_path: input.outputPath
      },
      metadata: {
        template: this.id,
        priority: options?.priority || this.defaultPriority,
        retryCount: options?.retryCount || 3,
        retryDelay: options?.retryDelay || 5000,
        timeout: options?.timeout || 300000, // 5分钟
        ...options?.metadata
      }
    };
  }

  async postProcess(result: ImageGenerationOutput, input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    // 可以在这里添加后处理逻辑，如图片压缩、格式转换等
    return result;
  }
}

/**
 * TTS任务模板
 */
export class TTSTemplate implements TaskTemplate<TTSInput, TTSOutput> {
  readonly id = 'tts';
  readonly name = 'TTS配音';
  readonly description = 'TTS文字转语音任务模板（支持RunningHub等）';
  readonly type = TaskType.API_CALL;
  readonly defaultPriority = TaskPriority.NORMAL;

  async validateInput(input: TTSInput): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!input.text || input.text.trim().length === 0) {
      errors.push('text不能为空');
    }

    if (input.text && input.text.length > 5000) {
      errors.push('text长度不能超过5000字符');
    }

    if (!input.voiceId || input.voiceId.trim().length === 0) {
      errors.push('voiceId不能为空');
    }

    if (!input.outputPath || input.outputPath.trim().length === 0) {
      errors.push('outputPath不能为空');
    }

    if (input.speed && (input.speed < 0.5 || input.speed > 2.0)) {
      errors.push('speed必须在0.5-2.0之间');
    }

    if (input.pitch && (input.pitch < -12 || input.pitch > 12)) {
      errors.push('pitch必须在-12到12之间');
    }

    if (input.volume && (input.volume < 0 || input.volume > 1)) {
      errors.push('volume必须在0-1之间');
    }

    if (input.emotion && input.emotion.length !== 8) {
      errors.push('emotion必须是8维向量');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  buildTaskConfig(input: TTSInput, options?: TaskTemplateOptions): TaskConfig {
    return {
      type: this.type,
      name: options?.name || `TTS: ${input.text.substring(0, 30)}...`,
      description: options?.description || `文字转语音，音色: ${input.voiceId}`,
      apiName: 'tts',
      apiParams: {
        text: input.text,
        voice_id: input.voiceId,
        speed: input.speed || 1.0,
        pitch: input.pitch || 0,
        volume: input.volume || 1.0,
        emotion: input.emotion || [0.5, 0.1, 0.1, 0.1, 0.3, 0.1, 0.2, 0.1],
        output_path: input.outputPath
      },
      metadata: {
        template: this.id,
        priority: options?.priority || this.defaultPriority,
        retryCount: options?.retryCount || 3,
        retryDelay: options?.retryDelay || 3000,
        timeout: options?.timeout || 180000, // 3分钟
        ...options?.metadata
      }
    };
  }
}

/**
 * 视频生成任务模板
 */
export class VideoGenerationTemplate implements TaskTemplate<VideoGenerationInput, VideoGenerationOutput> {
  readonly id = 'video-generation';
  readonly name = '视频生成';
  readonly description = 'AI视频生成任务模板（支持Sora、Runway等）';
  readonly type = TaskType.API_CALL;
  readonly defaultPriority = TaskPriority.HIGH; // 视频生成优先级较高

  async validateInput(input: VideoGenerationInput): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!input.prompt || input.prompt.trim().length === 0) {
      errors.push('prompt不能为空');
    }

    if (input.prompt && input.prompt.length > 2000) {
      errors.push('prompt长度不能超过2000字符');
    }

    if (!input.outputPath || input.outputPath.trim().length === 0) {
      errors.push('outputPath不能为空');
    }

    if (input.duration && (input.duration < 1 || input.duration > 60)) {
      errors.push('duration必须在1-60秒之间');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  buildTaskConfig(input: VideoGenerationInput, options?: TaskTemplateOptions): TaskConfig {
    return {
      type: this.type,
      name: options?.name || `生成视频: ${input.prompt.substring(0, 30)}...`,
      description: options?.description || `AI生成视频，提示词: ${input.prompt}`,
      apiName: 'video-generation',
      apiParams: {
        prompt: input.prompt,
        reference_image: input.referenceImage,
        duration: input.duration || 5,
        resolution: input.resolution || '1080p',
        fps: input.fps || 30,
        model: input.model || 'default',
        output_path: input.outputPath
      },
      metadata: {
        template: this.id,
        priority: options?.priority || this.defaultPriority,
        retryCount: options?.retryCount || 2, // 视频生成重试次数少一些（成本高）
        retryDelay: options?.retryDelay || 10000,
        timeout: options?.timeout || 600000, // 10分钟
        ...options?.metadata
      }
    };
  }
}

/**
 * 任务模板注册表
 */
export class TaskTemplateRegistry {
  private templates: Map<string, TaskTemplate> = new Map();

  constructor() {
    // 注册内置模板
    this.registerTemplate(new ImageGenerationTemplate());
    this.registerTemplate(new TTSTemplate());
    this.registerTemplate(new VideoGenerationTemplate());
  }

  /**
   * 注册模板
   */
  registerTemplate(template: TaskTemplate): void {
    if (this.templates.has(template.id)) {
      throw new Error(`任务模板已存在: ${template.id}`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * 获取模板
   */
  getTemplate<TInput = any, TOutput = any>(id: string): TaskTemplate<TInput, TOutput> | null {
    return this.templates.get(id) as TaskTemplate<TInput, TOutput> || null;
  }

  /**
   * 列出所有模板
   */
  listTemplates(): TaskTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 注销模板
   */
  unregisterTemplate(id: string): boolean {
    return this.templates.delete(id);
  }
}

// 导出单例
export const taskTemplateRegistry = new TaskTemplateRegistry();

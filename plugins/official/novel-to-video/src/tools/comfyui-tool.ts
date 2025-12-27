/**
 * ComfyUI MCP Tool封装
 *
 * Phase 7 H03: 将ComfyUI API调用封装为标准MCP Tool
 * 插件通过MCP接口调用，而非直接访问ComfyUI HTTP API
 */

import { MCPTool, MCPToolParams, MCPToolResult } from '@matrix/sdk';

/**
 * ComfyUI工作流类型
 */
export enum ComfyUIWorkflowType {
  /** 文生图 */
  TEXT_TO_IMAGE = 'text_to_image',
  /** 图生图 */
  IMAGE_TO_IMAGE = 'image_to_image',
  /** 图片放大 */
  UPSCALE = 'upscale',
  /** 图片修复 */
  INPAINT = 'inpaint',
  /** ControlNet */
  CONTROLNET = 'controlnet',
  /** 自定义工作流 */
  CUSTOM = 'custom'
}

/**
 * ComfyUI工具参数
 */
export interface ComfyUIToolParams extends MCPToolParams {
  /** 工作流类型 */
  workflowType: ComfyUIWorkflowType;

  /** 提示词 */
  prompt: string;

  /** 负向提示词 */
  negativePrompt?: string;

  /** 输入图片路径（图生图等） */
  inputImage?: string;

  /** 输出路径 */
  outputPath: string;

  /** 生成参数 */
  params?: {
    /** 宽度 */
    width?: number;
    /** 高度 */
    height?: number;
    /** 采样步数 */
    steps?: number;
    /** CFG Scale */
    cfgScale?: number;
    /** 采样器 */
    sampler?: string;
    /** 调度器 */
    scheduler?: string;
    /** 种子 */
    seed?: number;
    /** 批次大小 */
    batchSize?: number;
    /** 去噪强度（图生图） */
    denoise?: number;
  };

  /** Checkpoint模型名称 */
  checkpoint?: string;

  /** LoRA模型配置 */
  loras?: Array<{
    name: string;
    strength: number;
  }>;

  /** ControlNet配置 */
  controlnet?: {
    model: string;
    image: string;
    strength: number;
    preprocessor?: string;
  };

  /** 自定义工作流JSON */
  customWorkflow?: any;
}

/**
 * ComfyUI工具结果
 */
export interface ComfyUIToolResult extends MCPToolResult {
  /** 操作是否成功 */
  success: boolean;

  /** 生成的图片路径 */
  imagePath?: string;

  /** 使用的种子 */
  seed?: number;

  /** 生成耗时（秒） */
  duration?: number;

  /** 错误信息 */
  error?: string;

  /** 任务ID（用于查询状态） */
  taskId?: string;
}

/**
 * ComfyUI MCP Tool
 *
 * 通过MCP协议调用本地ComfyUI服务
 * 插件不直接访问ComfyUI HTTP API，而是通过这个工具调用
 */
export class ComfyUITool implements MCPTool<ComfyUIToolParams, ComfyUIToolResult> {
  readonly id = 'comfyui';
  readonly name = 'ComfyUI图片生成工具';
  readonly description = '通过MCP协议调用ComfyUI进行AI图片生成';
  readonly server = 'local-comfyui-server';

  /**
   * 执行ComfyUI操作
   */
  async execute(params: ComfyUIToolParams): Promise<ComfyUIToolResult> {
    // 验证参数
    this.validateParams(params);

    // 构建MCP请求
    const mcpRequest = {
      server: this.server,
      tool: 'comfyui',
      method: 'generate',
      params: {
        workflow_type: params.workflowType,
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        input_image: params.inputImage,
        output_path: params.outputPath,
        checkpoint: params.checkpoint || 'sd_xl_base_1.0.safetensors',
        loras: params.loras,
        controlnet: params.controlnet,
        custom_workflow: params.customWorkflow,
        ...params.params
      }
    };

    // 通过MCP客户端调用
    // 实际实现中，这个方法会被注入到Plugin Context中
    throw new Error('ComfyUITool.execute需要通过PluginContext调用');
  }

  /**
   * 验证参数
   */
  private validateParams(params: ComfyUIToolParams): void {
    if (!params.workflowType) {
      throw new Error('workflowType参数不能为空');
    }

    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('prompt参数不能为空');
    }

    if (!params.outputPath) {
      throw new Error('outputPath参数不能为空');
    }

    // 某些工作流类型需要输入图片
    const requiresInput = [
      ComfyUIWorkflowType.IMAGE_TO_IMAGE,
      ComfyUIWorkflowType.UPSCALE,
      ComfyUIWorkflowType.INPAINT
    ];

    if (requiresInput.includes(params.workflowType) && !params.inputImage) {
      throw new Error(`${params.workflowType}工作流需要提供inputImage参数`);
    }
  }
}

/**
 * ComfyUI工具辅助函数
 */
export class ComfyUIHelper {
  private tool: ComfyUITool;

  constructor(tool: ComfyUITool) {
    this.tool = tool;
  }

  /**
   * 文生图（简化接口）
   */
  async textToImage(
    prompt: string,
    outputPath: string,
    options?: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      steps?: number;
      cfgScale?: number;
      seed?: number;
      checkpoint?: string;
    }
  ): Promise<ComfyUIToolResult> {
    return this.tool.execute({
      workflowType: ComfyUIWorkflowType.TEXT_TO_IMAGE,
      prompt,
      negativePrompt: options?.negativePrompt,
      outputPath,
      params: {
        width: options?.width || 512,
        height: options?.height || 512,
        steps: options?.steps || 20,
        cfgScale: options?.cfgScale || 7,
        seed: options?.seed || -1
      },
      checkpoint: options?.checkpoint
    });
  }

  /**
   * 图生图（简化接口）
   */
  async imageToImage(
    prompt: string,
    inputImage: string,
    outputPath: string,
    denoise: number = 0.7,
    options?: {
      negativePrompt?: string;
      steps?: number;
      cfgScale?: number;
      seed?: number;
    }
  ): Promise<ComfyUIToolResult> {
    return this.tool.execute({
      workflowType: ComfyUIWorkflowType.IMAGE_TO_IMAGE,
      prompt,
      negativePrompt: options?.negativePrompt,
      inputImage,
      outputPath,
      params: {
        steps: options?.steps || 20,
        cfgScale: options?.cfgScale || 7,
        seed: options?.seed || -1,
        denoise
      }
    });
  }

  /**
   * 图片放大
   */
  async upscale(
    inputImage: string,
    outputPath: string,
    scale: number = 2
  ): Promise<ComfyUIToolResult> {
    return this.tool.execute({
      workflowType: ComfyUIWorkflowType.UPSCALE,
      prompt: '', // 放大不需要prompt
      inputImage,
      outputPath,
      params: {
        width: scale * 512,
        height: scale * 512
      }
    });
  }
}

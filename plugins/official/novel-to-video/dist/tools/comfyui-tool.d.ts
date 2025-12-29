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
export declare enum ComfyUIWorkflowType {
    /** 文生图 */
    TEXT_TO_IMAGE = "text_to_image",
    /** 图生图 */
    IMAGE_TO_IMAGE = "image_to_image",
    /** 图片放大 */
    UPSCALE = "upscale",
    /** 图片修复 */
    INPAINT = "inpaint",
    /** ControlNet */
    CONTROLNET = "controlnet",
    /** 自定义工作流 */
    CUSTOM = "custom"
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
export declare class ComfyUITool implements MCPTool<ComfyUIToolParams, ComfyUIToolResult> {
    readonly id = "comfyui";
    readonly name = "ComfyUI\u56FE\u7247\u751F\u6210\u5DE5\u5177";
    readonly description = "\u901A\u8FC7MCP\u534F\u8BAE\u8C03\u7528ComfyUI\u8FDB\u884CAI\u56FE\u7247\u751F\u6210";
    readonly server = "local-comfyui-server";
    /**
     * 执行ComfyUI操作
     */
    execute(params: ComfyUIToolParams): Promise<ComfyUIToolResult>;
    /**
     * 验证参数
     */
    private validateParams;
}
/**
 * ComfyUI工具辅助函数
 */
export declare class ComfyUIHelper {
    private tool;
    constructor(tool: ComfyUITool);
    /**
     * 文生图（简化接口）
     */
    textToImage(prompt: string, outputPath: string, options?: {
        negativePrompt?: string;
        width?: number;
        height?: number;
        steps?: number;
        cfgScale?: number;
        seed?: number;
        checkpoint?: string;
    }): Promise<ComfyUIToolResult>;
    /**
     * 图生图（简化接口）
     */
    imageToImage(prompt: string, inputImage: string, outputPath: string, denoise?: number, options?: {
        negativePrompt?: string;
        steps?: number;
        cfgScale?: number;
        seed?: number;
    }): Promise<ComfyUIToolResult>;
    /**
     * 图片放大
     */
    upscale(inputImage: string, outputPath: string, scale?: number): Promise<ComfyUIToolResult>;
}

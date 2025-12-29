"use strict";
/**
 * ComfyUI MCP Tool封装
 *
 * Phase 7 H03: 将ComfyUI API调用封装为标准MCP Tool
 * 插件通过MCP接口调用，而非直接访问ComfyUI HTTP API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComfyUIHelper = exports.ComfyUITool = exports.ComfyUIWorkflowType = void 0;
/**
 * ComfyUI工作流类型
 */
var ComfyUIWorkflowType;
(function (ComfyUIWorkflowType) {
    /** 文生图 */
    ComfyUIWorkflowType["TEXT_TO_IMAGE"] = "text_to_image";
    /** 图生图 */
    ComfyUIWorkflowType["IMAGE_TO_IMAGE"] = "image_to_image";
    /** 图片放大 */
    ComfyUIWorkflowType["UPSCALE"] = "upscale";
    /** 图片修复 */
    ComfyUIWorkflowType["INPAINT"] = "inpaint";
    /** ControlNet */
    ComfyUIWorkflowType["CONTROLNET"] = "controlnet";
    /** 自定义工作流 */
    ComfyUIWorkflowType["CUSTOM"] = "custom";
})(ComfyUIWorkflowType || (exports.ComfyUIWorkflowType = ComfyUIWorkflowType = {}));
/**
 * ComfyUI MCP Tool
 *
 * 通过MCP协议调用本地ComfyUI服务
 * 插件不直接访问ComfyUI HTTP API，而是通过这个工具调用
 */
class ComfyUITool {
    constructor() {
        this.id = 'comfyui';
        this.name = 'ComfyUI图片生成工具';
        this.description = '通过MCP协议调用ComfyUI进行AI图片生成';
        this.server = 'local-comfyui-server';
    }
    /**
     * 执行ComfyUI操作
     */
    async execute(params) {
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
    validateParams(params) {
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
exports.ComfyUITool = ComfyUITool;
/**
 * ComfyUI工具辅助函数
 */
class ComfyUIHelper {
    constructor(tool) {
        this.tool = tool;
    }
    /**
     * 文生图（简化接口）
     */
    async textToImage(prompt, outputPath, options) {
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
    async imageToImage(prompt, inputImage, outputPath, denoise = 0.7, options) {
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
    async upscale(inputImage, outputPath, scale = 2) {
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
exports.ComfyUIHelper = ComfyUIHelper;

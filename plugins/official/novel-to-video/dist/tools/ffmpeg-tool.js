"use strict";
/**
 * FFmpeg MCP Tool封装
 *
 * Phase 7 H03: 将FFmpeg命令封装为标准MCP Tool
 * 插件通过MCP接口调用，而非直接执行child_process
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFmpegHelper = exports.FFmpegTool = exports.FFmpegOperation = void 0;
/**
 * FFmpeg操作类型
 */
var FFmpegOperation;
(function (FFmpegOperation) {
    /** 视频转码 */
    FFmpegOperation["TRANSCODE"] = "transcode";
    /** 视频合并 */
    FFmpegOperation["CONCAT"] = "concat";
    /** 提取音频 */
    FFmpegOperation["EXTRACT_AUDIO"] = "extract_audio";
    /** 添加音频 */
    FFmpegOperation["ADD_AUDIO"] = "add_audio";
    /** 视频剪辑 */
    FFmpegOperation["TRIM"] = "trim";
    /** 添加字幕 */
    FFmpegOperation["ADD_SUBTITLE"] = "add_subtitle";
    /** 视频信息 */
    FFmpegOperation["GET_INFO"] = "get_info";
})(FFmpegOperation || (exports.FFmpegOperation = FFmpegOperation = {}));
/**
 * FFmpeg MCP Tool
 *
 * 通过MCP协议调用本地FFmpeg服务
 * 插件不直接执行FFmpeg命令，而是通过这个工具调用
 */
class FFmpegTool {
    constructor() {
        this.id = 'ffmpeg';
        this.name = 'FFmpeg视频处理工具';
        this.description = '通过MCP协议调用FFmpeg进行视频处理操作';
        this.server = 'local-ffmpeg-server';
    }
    /**
     * 执行FFmpeg操作
     */
    async execute(params) {
        // 验证参数
        this.validateParams(params);
        // 构建MCP请求
        const mcpRequest = {
            server: this.server,
            tool: 'ffmpeg',
            method: params.operation,
            params: {
                inputs: Array.isArray(params.inputs) ? params.inputs : [params.inputs],
                output: params.output,
                ...params.options
            }
        };
        // 通过MCP客户端调用
        // 注意：这里需要从PluginContext获取MCP客户端
        // 实际实现中，这个方法会被注入到Plugin Context中
        throw new Error('FFmpegTool.execute需要通过PluginContext调用');
    }
    /**
     * 验证参数
     */
    validateParams(params) {
        if (!params.operation) {
            throw new Error('operation参数不能为空');
        }
        if (!params.inputs || (Array.isArray(params.inputs) && params.inputs.length === 0)) {
            throw new Error('inputs参数不能为空');
        }
        // 大多数操作需要output参数
        if (params.operation !== FFmpegOperation.GET_INFO && !params.output) {
            throw new Error('output参数不能为空');
        }
    }
}
exports.FFmpegTool = FFmpegTool;
/**
 * FFmpeg工具辅助函数
 */
class FFmpegHelper {
    constructor(tool) {
        this.tool = tool;
    }
    /**
     * 视频转码
     */
    async transcode(inputPath, outputPath, options) {
        return this.tool.execute({
            operation: FFmpegOperation.TRANSCODE,
            inputs: inputPath,
            output: outputPath,
            options
        });
    }
    /**
     * 合并视频
     */
    async concat(inputPaths, outputPath) {
        return this.tool.execute({
            operation: FFmpegOperation.CONCAT,
            inputs: inputPaths,
            output: outputPath
        });
    }
    /**
     * 添加音频到视频
     */
    async addAudio(videoPath, audioPath, outputPath) {
        return this.tool.execute({
            operation: FFmpegOperation.ADD_AUDIO,
            inputs: [videoPath, audioPath],
            output: outputPath
        });
    }
    /**
     * 视频剪辑
     */
    async trim(inputPath, outputPath, startTime, duration) {
        return this.tool.execute({
            operation: FFmpegOperation.TRIM,
            inputs: inputPath,
            output: outputPath,
            options: { startTime, duration }
        });
    }
    /**
     * 获取视频信息
     */
    async getInfo(inputPath) {
        return this.tool.execute({
            operation: FFmpegOperation.GET_INFO,
            inputs: inputPath
        });
    }
}
exports.FFmpegHelper = FFmpegHelper;

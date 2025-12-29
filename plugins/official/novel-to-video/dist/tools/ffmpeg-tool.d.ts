/**
 * FFmpeg MCP Tool封装
 *
 * Phase 7 H03: 将FFmpeg命令封装为标准MCP Tool
 * 插件通过MCP接口调用，而非直接执行child_process
 */
import { MCPTool, MCPToolParams, MCPToolResult } from '@matrix/sdk';
/**
 * FFmpeg操作类型
 */
export declare enum FFmpegOperation {
    /** 视频转码 */
    TRANSCODE = "transcode",
    /** 视频合并 */
    CONCAT = "concat",
    /** 提取音频 */
    EXTRACT_AUDIO = "extract_audio",
    /** 添加音频 */
    ADD_AUDIO = "add_audio",
    /** 视频剪辑 */
    TRIM = "trim",
    /** 添加字幕 */
    ADD_SUBTITLE = "add_subtitle",
    /** 视频信息 */
    GET_INFO = "get_info"
}
/**
 * FFmpeg工具参数
 */
export interface FFmpegToolParams extends MCPToolParams {
    /** 操作类型 */
    operation: FFmpegOperation;
    /** 输入文件路径（可以是多个） */
    inputs: string | string[];
    /** 输出文件路径 */
    output?: string;
    /** 操作特定参数 */
    options?: {
        /** 视频编码器 */
        videoCodec?: string;
        /** 音频编码器 */
        audioCodec?: string;
        /** 视频比特率 */
        videoBitrate?: string;
        /** 音频比特率 */
        audioBitrate?: string;
        /** 分辨率 */
        resolution?: string;
        /** 帧率 */
        fps?: number;
        /** 开始时间（秒） */
        startTime?: number;
        /** 持续时间（秒） */
        duration?: number;
        /** 字幕文件路径 */
        subtitlePath?: string;
    };
}
/**
 * FFmpeg工具结果
 */
export interface FFmpegToolResult extends MCPToolResult {
    /** 操作是否成功 */
    success: boolean;
    /** 输出文件路径 */
    outputPath?: string;
    /** 视频信息（GET_INFO操作） */
    info?: {
        duration: number;
        width: number;
        height: number;
        fps: number;
        codec: string;
        bitrate: string;
    };
    /** 错误信息 */
    error?: string;
    /** FFmpeg标准输出 */
    stdout?: string;
    /** FFmpeg标准错误输出 */
    stderr?: string;
}
/**
 * FFmpeg MCP Tool
 *
 * 通过MCP协议调用本地FFmpeg服务
 * 插件不直接执行FFmpeg命令，而是通过这个工具调用
 */
export declare class FFmpegTool implements MCPTool<FFmpegToolParams, FFmpegToolResult> {
    readonly id = "ffmpeg";
    readonly name = "FFmpeg\u89C6\u9891\u5904\u7406\u5DE5\u5177";
    readonly description = "\u901A\u8FC7MCP\u534F\u8BAE\u8C03\u7528FFmpeg\u8FDB\u884C\u89C6\u9891\u5904\u7406\u64CD\u4F5C";
    readonly server = "local-ffmpeg-server";
    /**
     * 执行FFmpeg操作
     */
    execute(params: FFmpegToolParams): Promise<FFmpegToolResult>;
    /**
     * 验证参数
     */
    private validateParams;
}
/**
 * FFmpeg工具辅助函数
 */
export declare class FFmpegHelper {
    private tool;
    constructor(tool: FFmpegTool);
    /**
     * 视频转码
     */
    transcode(inputPath: string, outputPath: string, options?: {
        videoCodec?: string;
        audioCodec?: string;
        videoBitrate?: string;
        resolution?: string;
        fps?: number;
    }): Promise<FFmpegToolResult>;
    /**
     * 合并视频
     */
    concat(inputPaths: string[], outputPath: string): Promise<FFmpegToolResult>;
    /**
     * 添加音频到视频
     */
    addAudio(videoPath: string, audioPath: string, outputPath: string): Promise<FFmpegToolResult>;
    /**
     * 视频剪辑
     */
    trim(inputPath: string, outputPath: string, startTime: number, duration: number): Promise<FFmpegToolResult>;
    /**
     * 获取视频信息
     */
    getInfo(inputPath: string): Promise<FFmpegToolResult>;
}

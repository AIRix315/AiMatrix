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
export enum FFmpegOperation {
  /** 视频转码 */
  TRANSCODE = 'transcode',
  /** 视频合并 */
  CONCAT = 'concat',
  /** 提取音频 */
  EXTRACT_AUDIO = 'extract_audio',
  /** 添加音频 */
  ADD_AUDIO = 'add_audio',
  /** 视频剪辑 */
  TRIM = 'trim',
  /** 添加字幕 */
  ADD_SUBTITLE = 'add_subtitle',
  /** 视频信息 */
  GET_INFO = 'get_info'
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
export class FFmpegTool implements MCPTool<FFmpegToolParams, FFmpegToolResult> {
  readonly id = 'ffmpeg';
  readonly name = 'FFmpeg视频处理工具';
  readonly description = '通过MCP协议调用FFmpeg进行视频处理操作';
  readonly server = 'local-ffmpeg-server';

  /**
   * 执行FFmpeg操作
   */
  async execute(params: FFmpegToolParams): Promise<FFmpegToolResult> {
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
  private validateParams(params: FFmpegToolParams): void {
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

/**
 * FFmpeg工具辅助函数
 */
export class FFmpegHelper {
  private tool: FFmpegTool;

  constructor(tool: FFmpegTool) {
    this.tool = tool;
  }

  /**
   * 视频转码
   */
  async transcode(
    inputPath: string,
    outputPath: string,
    options?: {
      videoCodec?: string;
      audioCodec?: string;
      videoBitrate?: string;
      resolution?: string;
      fps?: number;
    }
  ): Promise<FFmpegToolResult> {
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
  async concat(
    inputPaths: string[],
    outputPath: string
  ): Promise<FFmpegToolResult> {
    return this.tool.execute({
      operation: FFmpegOperation.CONCAT,
      inputs: inputPaths,
      output: outputPath
    });
  }

  /**
   * 添加音频到视频
   */
  async addAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<FFmpegToolResult> {
    return this.tool.execute({
      operation: FFmpegOperation.ADD_AUDIO,
      inputs: [videoPath, audioPath],
      output: outputPath
    });
  }

  /**
   * 视频剪辑
   */
  async trim(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<FFmpegToolResult> {
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
  async getInfo(inputPath: string): Promise<FFmpegToolResult> {
    return this.tool.execute({
      operation: FFmpegOperation.GET_INFO,
      inputs: inputPath
    });
  }
}

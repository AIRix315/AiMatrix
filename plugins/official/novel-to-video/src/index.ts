/**
 * Novel-to-Video Plugin 入口文件
 *
 * Phase 7 H03: 插件包体隔离
 * 演示如何使用 Matrix SDK 构建完整工作流插件
 *
 * 【开发者指南】
 *
 * ## 插件结构
 *
 * 本插件展示了 Matrix 插件系统的完整用法：
 *
 * 1. **Schema注册**：定义自定义资产类型（Chapter, Scene, Character等）
 * 2. **MCP工具**：封装本地工具调用（FFmpeg, ComfyUI）
 * 3. **业务服务**：实现工作流逻辑（章节拆分、场景提取、配音生成等）
 * 4. **依赖注入**：通过PluginContext获取Matrix SDK API
 *
 * ## 核心概念
 *
 * ### Plugin类
 * - 实现 `Plugin` 接口
 * - 必须提供 `metadata` 和 `activate/deactivate` 方法
 * - 在 activate 中注册Schema、工具、初始化服务
 *
 * ### PluginContext
 * - Matrix提供的运行时上下文
 * - 包含Logger、SchemaRegistry、AssetHelper等核心API
 * - 插件通过context访问Matrix功能，不直接import内部模块
 *
 * ### Schema注册
 * - 使用JSON Schema定义资产元数据结构
 * - 注册后可使用GenericAssetHelper进行CRUD操作
 * - Schema支持验证、查询、排序等功能
 *
 * ### MCP工具
 * - 标准化的工具调用接口
 * - 插件通过MCP调用本地服务（FFmpeg、ComfyUI等）
 * - 工具执行在沙箱环境中，确保安全性
 *
 * ## 使用示例
 *
 * ```typescript
 * // 1. 导入插件
 * import novelToVideoPlugin from '@matrix/plugin-novel-to-video';
 *
 * // 2. 使用服务
 * const chapterService = novelToVideoPlugin.getChapterService();
 * const chapters = await chapterService.splitChapters(projectId, novelPath);
 *
 * // 3. 使用Schema查询资产
 * const scenes = await context.assetHelper.queryAssets({
 *   schemaId: 'novel-to-video.scene',
 *   projectId,
 *   limit: 100
 * });
 * ```
 */

import { Plugin, PluginContext, PluginMetadata } from '@matrix/sdk';
import { ChapterSchema, SceneSchema, CharacterSchema, StoryboardSchema, VoiceoverSchema } from './schemas';
import { ChapterService } from './services/ChapterService';
import { ResourceService } from './services/ResourceService';
import { StoryboardService } from './services/StoryboardService';
import { VoiceoverService } from './services/VoiceoverService';
import { NovelVideoAPIService } from './services/NovelVideoAPIService';
import { FFmpegTool } from './tools/ffmpeg-tool';
import { ComfyUITool } from './tools/comfyui-tool';

/**
 * 插件元数据
 */
export const metadata: PluginMetadata = {
  id: 'novel-to-video',
  name: '小说转视频',
  version: '1.0.0',
  description: '将小说文本转换为AI生成的视频内容',
  author: 'Matrix Team',
  license: 'MIT'
};

/**
 * 插件主类
 */
export class NovelToVideoPlugin implements Plugin {
  readonly metadata = metadata;

  private chapterService?: ChapterService;
  private resourceService?: ResourceService;
  private storyboardService?: StoryboardService;
  private voiceoverService?: VoiceoverService;
  private apiService?: NovelVideoAPIService;

  /**
   * 插件初始化
   * 注册Schema、工具和服务
   */
  async activate(context: PluginContext): Promise<void> {
    const { logger, schemaRegistry } = context;

    await logger.info('初始化小说转视频插件', 'NovelToVideoPlugin');

    // 1. 注册JSON Schemas
    await this.registerSchemas(context);

    // 2. 注册MCP工具
    await this.registerTools(context);

    // 3. 初始化业务服务
    await this.initializeServices(context);

    await logger.info('小说转视频插件激活成功', 'NovelToVideoPlugin');
  }

  /**
   * 插件卸载
   */
  async deactivate(context: PluginContext): Promise<void> {
    const { logger } = context;
    await logger.info('小说转视频插件已卸载', 'NovelToVideoPlugin');
  }

  /**
   * 注册JSON Schemas
   */
  private async registerSchemas(context: PluginContext): Promise<void> {
    const { schemaRegistry, logger } = context;

    const schemas = [
      ChapterSchema,
      SceneSchema,
      CharacterSchema,
      StoryboardSchema,
      VoiceoverSchema
    ];

    for (const schema of schemas) {
      await schemaRegistry.registerSchema(this.metadata.id, schema);
      await logger.debug(`注册Schema: ${schema.name}`, 'NovelToVideoPlugin');
    }

    await logger.info(`注册了${schemas.length}个Schema`, 'NovelToVideoPlugin');
  }

  /**
   * 注册MCP工具
   */
  private async registerTools(context: PluginContext): Promise<void> {
    const { mcpClient, logger } = context;

    // 注册FFmpeg工具
    const ffmpegTool = new FFmpegTool();
    await mcpClient.registerTool(ffmpegTool);
    await logger.debug('注册FFmpeg工具', 'NovelToVideoPlugin');

    // 注册ComfyUI工具
    const comfyuiTool = new ComfyUITool();
    await mcpClient.registerTool(comfyuiTool);
    await logger.debug('注册ComfyUI工具', 'NovelToVideoPlugin');

    await logger.info('MCP工具注册完成', 'NovelToVideoPlugin');
  }

  /**
   * 初始化业务服务
   */
  private async initializeServices(context: PluginContext): Promise<void> {
    const { logger, apiManager, taskScheduler } = context;

    // 初始化API服务
    this.apiService = new NovelVideoAPIService(apiManager, context);

    // 初始化业务服务
    this.chapterService = new ChapterService(context);
    this.resourceService = new ResourceService(this.apiService, taskScheduler, context);
    this.storyboardService = new StoryboardService(context);
    this.voiceoverService = new VoiceoverService(this.apiService, context);

    await logger.info('业务服务初始化完成', 'NovelToVideoPlugin');
  }

  /**
   * 获取章节服务
   */
  getChapterService(): ChapterService {
    if (!this.chapterService) {
      throw new Error('ChapterService未初始化');
    }
    return this.chapterService;
  }

  /**
   * 获取资源服务
   */
  getResourceService(): ResourceService {
    if (!this.resourceService) {
      throw new Error('ResourceService未初始化');
    }
    return this.resourceService;
  }

  /**
   * 获取分镜服务
   */
  getStoryboardService(): StoryboardService {
    if (!this.storyboardService) {
      throw new Error('StoryboardService未初始化');
    }
    return this.storyboardService;
  }

  /**
   * 获取配音服务
   */
  getVoiceoverService(): VoiceoverService {
    if (!this.voiceoverService) {
      throw new Error('VoiceoverService未初始化');
    }
    return this.voiceoverService;
  }

  /**
   * 获取API服务
   */
  getAPIService(): NovelVideoAPIService {
    if (!this.apiService) {
      throw new Error('NovelVideoAPIService未初始化');
    }
    return this.apiService;
  }
}

/**
 * 默认导出插件实例
 */
export default new NovelToVideoPlugin();

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
import { ChapterService } from './services/ChapterService';
import { ResourceService } from './services/ResourceService';
import { StoryboardService } from './services/StoryboardService';
import { VoiceoverService } from './services/VoiceoverService';
import { NovelVideoAPIService } from './services/NovelVideoAPIService';
/**
 * 插件元数据
 */
export declare const metadata: PluginMetadata;
/**
 * 插件主类
 */
export declare class NovelToVideoPlugin implements Plugin {
    readonly metadata: PluginMetadata;
    private chapterService?;
    private resourceService?;
    private storyboardService?;
    private voiceoverService?;
    private apiService?;
    /**
     * 插件初始化
     * 注册Schema、工具和服务
     */
    activate(context: PluginContext): Promise<void>;
    /**
     * 插件卸载
     */
    deactivate(context: PluginContext): Promise<void>;
    /**
     * 注册JSON Schemas
     */
    private registerSchemas;
    /**
     * 注册MCP工具
     */
    private registerTools;
    /**
     * 初始化业务服务
     */
    private initializeServices;
    /**
     * 获取章节服务
     */
    getChapterService(): ChapterService;
    /**
     * 获取资源服务
     */
    getResourceService(): ResourceService;
    /**
     * 获取分镜服务
     */
    getStoryboardService(): StoryboardService;
    /**
     * 获取配音服务
     */
    getVoiceoverService(): VoiceoverService;
    /**
     * 获取API服务
     */
    getAPIService(): NovelVideoAPIService;
}
/**
 * 默认导出插件实例
 */
declare const _default: NovelToVideoPlugin;
export default _default;

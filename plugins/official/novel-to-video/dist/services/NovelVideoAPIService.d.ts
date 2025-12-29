/**
 * NovelVideoAPIService - 小说转视频API服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API，移除对内部模块的直接依赖
 */
import { PluginContext, APIManager } from '@matrix/sdk';
export declare class NovelVideoAPIService {
    private apiManager;
    private assetHelper;
    private logger;
    /**
     * 构造函数 - 通过PluginContext注入依赖
     */
    constructor(apiManager: APIManager, context: PluginContext);
    /**
     * 生成场景图片
     * @param projectId 项目ID
     * @param sceneAssetPath 场景资产文件路径
     * @returns 生成的图片路径
     */
    generateSceneImage(projectId: string, sceneAssetPath: string): Promise<string>;
    /**
     * 生成角色图片
     * @param projectId 项目ID
     * @param characterAssetPath 角色资产文件路径
     * @returns 生成的图片路径
     */
    generateCharacterImage(projectId: string, characterAssetPath: string): Promise<string>;
    /**
     * 生成分镜视频
     * @param projectId 项目ID
     * @param storyboardAssetPath 分镜资产文件路径
     * @param onProgress 进度回调
     * @returns 生成的视频路径
     */
    generateStoryboardVideo(projectId: string, storyboardAssetPath: string, onProgress?: (progress: number) => void): Promise<string>;
    /**
     * 生成对白音频
     * @param projectId 项目ID
     * @param voiceoverAssetPath 配音资产文件路径
     * @param voiceFilePath 音色文件路径
     * @returns 生成的音频路径
     */
    generateDialogueAudio(projectId: string, voiceoverAssetPath: string, voiceFilePath: string): Promise<string>;
    /**
     * 下载图片到本地
     */
    private downloadImage;
    /**
     * 下载视频到本地
     */
    private downloadVideo;
}

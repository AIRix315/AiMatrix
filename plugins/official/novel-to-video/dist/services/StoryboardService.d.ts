/**
 * StoryboardService - 分镜脚本生成服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */
import { PluginContext } from '@matrix/sdk';
import type { AssetMetadata } from '@matrix/sdk';
/**
 * 分镜脚本生成器接口
 */
interface StoryboardScriptGenerator {
    generateScriptScenes(params: {
        story: string;
        characters: any[];
        chapter: any;
    }): Promise<any[]>;
    generateVideoPrompts(scriptScenes: any[], characters: any[], scene: any, artStyle: string): Promise<any[]>;
    replaceCharacterNames(videoScenes: any[], characters: any[]): Promise<any[]>;
    generateImageStoryboardPrompts(videoScenes: any[], characters: any[]): Promise<any[]>;
}
/**
 * StoryboardService服务类
 */
export declare class StoryboardService {
    private assetHelper;
    private generator?;
    private logger;
    private context;
    constructor(context: PluginContext, generator?: StoryboardScriptGenerator);
    /**
     * 生成分镜脚本（4步链式调用）
     * @param projectId 项目ID
     * @param sceneAssetPath 场景资产文件路径
     * @param artStyle 美术风格
     * @returns 分镜资产
     */
    generateScript(projectId: string, sceneAssetPath: string, artStyle?: string): Promise<AssetMetadata>;
    /**
     * 批量生成分镜脚本
     * @param projectId 项目ID
     * @param sceneAssetPaths 场景资产路径列表
     * @param artStyle 美术风格
     * @returns 分镜资产列表
     */
    batchGenerateScripts(projectId: string, sceneAssetPaths: string[], artStyle?: string): Promise<AssetMetadata[]>;
    /**
     * 获取相关角色（辅助方法）
     */
    private getRelatedCharacters;
    /**
     * 获取相关章节（辅助方法）
     */
    private getRelatedChapter;
}
export {};

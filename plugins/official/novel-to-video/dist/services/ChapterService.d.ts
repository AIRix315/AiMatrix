/**
 * ChapterService - 章节服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */
import { PluginContext } from '@matrix/sdk';
import type { AssetMetadata } from '@matrix/sdk';
/**
 * 章节分割器接口
 */
interface ChapterSplitter {
    split(content: string): Array<{
        title: string;
        content: string;
    }>;
}
/**
 * 场景角色提取器接口
 */
interface SceneCharacterExtractor {
    splitChapterIntoScenes(chapterContent: string): Promise<any[]>;
    refineScenes(segments: any[], chapterContent: string, artStyle: string): Promise<any[]>;
    refineCharacters(segments: any[], chapterContent: string, artStyle: string): Promise<any[]>;
}
/**
 * ChapterService服务类
 */
export declare class ChapterService {
    private assetHelper;
    private logger;
    private splitter?;
    private extractor?;
    private context;
    constructor(context: PluginContext, splitter?: ChapterSplitter, extractor?: SceneCharacterExtractor);
    /**
     * 拆分小说为章节
     * @param projectId 项目ID
     * @param novelPath 小说文件路径
     * @returns 章节资产列表
     */
    splitChapters(projectId: string, novelPath: string): Promise<AssetMetadata[]>;
    /**
     * 提取章节中的场景和角色
     * @param projectId 项目ID
     * @param chapterAssetPath 章节资产文件路径
     * @param artStyle 美术风格
     * @returns 场景和角色资产列表
     */
    extractScenesAndCharacters(projectId: string, chapterAssetPath: string, artStyle?: string): Promise<{
        scenes: AssetMetadata[];
        characters: AssetMetadata[];
    }>;
    /**
     * 批量提取多个章节的场景和角色
     * @param projectId 项目ID
     * @param chapterAssetPaths 章节资产路径列表
     * @param artStyle 美术风格
     * @returns 所有场景和角色资产
     */
    batchExtractScenesAndCharacters(projectId: string, chapterAssetPaths: string[], artStyle?: string): Promise<{
        scenes: AssetMetadata[];
        characters: AssetMetadata[];
    }>;
    /**
     * 去重角色资产（基于角色名称）
     */
    private deduplicateCharacters;
}
export {};

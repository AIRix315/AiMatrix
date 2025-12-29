/**
 * VoiceoverService - 配音生成服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */
import { NovelVideoAPIService } from './NovelVideoAPIService';
import { PluginContext } from '@matrix/sdk';
import type { AssetMetadata } from '@matrix/sdk';
/**
 * 对白数据
 */
interface Dialogue {
    characterId: string;
    characterName: string;
    text: string;
    emotion: number[];
    audioPath?: string;
    audioStatus?: 'none' | 'generating' | 'success' | 'failed';
}
/**
 * 配音生成器接口
 */
interface VoiceoverGenerator {
    generateVoiceover(params: {
        story: string;
        characters: any[];
    }): Promise<{
        dialogues: Dialogue[];
    }>;
}
/**
 * VoiceoverService服务类
 */
export declare class VoiceoverService {
    private assetHelper;
    private apiService;
    private generator?;
    private logger;
    private context;
    constructor(apiService: NovelVideoAPIService, context: PluginContext, generator?: VoiceoverGenerator);
    /**
     * 生成配音
     * @param projectId 项目ID
     * @param sceneAssetPath 场景资产文件路径
     * @param voiceFilesMap 音色文件映射 (characterId -> voiceFilePath)
     * @returns 配音资产
     */
    generateVoiceover(projectId: string, sceneAssetPath: string, voiceFilesMap: Map<string, string>): Promise<AssetMetadata>;
    /**
     * 批量生成配音
     * @param projectId 项目ID
     * @param sceneAssetPaths 场景资产路径列表
     * @param voiceFilesMap 音色文件映射
     * @returns 配音资产列表
     */
    batchGenerateVoiceovers(projectId: string, sceneAssetPaths: string[], voiceFilesMap: Map<string, string>): Promise<AssetMetadata[]>;
    /**
     * 获取相关角色（辅助方法）
     */
    private getRelatedCharacters;
}
export {};

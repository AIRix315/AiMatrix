"use strict";
/**
 * VoiceoverService - 配音生成服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceoverService = void 0;
/**
 * VoiceoverService服务类
 */
class VoiceoverService {
    constructor(apiService, context, generator) {
        this.context = context;
        this.assetHelper = context.assetHelper;
        this.apiService = apiService;
        this.generator = generator;
        this.logger = context.logger;
    }
    /**
     * 生成配音
     * @param projectId 项目ID
     * @param sceneAssetPath 场景资产文件路径
     * @param voiceFilesMap 音色文件映射 (characterId -> voiceFilePath)
     * @returns 配音资产
     */
    async generateVoiceover(projectId, sceneAssetPath, voiceFilesMap) {
        try {
            await this.logger.info('开始生成配音', 'VoiceoverService', {
                projectId,
                sceneAssetPath
            });
            if (!this.generator) {
                throw new Error('配音生成器未初始化');
            }
            // 1. 获取场景资产
            const scenes = await this.assetHelper.queryAssets({
                schemaId: 'novel-to-video.scene',
                projectId,
                limit: 1000
            });
            const sceneAsset = scenes.find(s => s.filePath === sceneAssetPath);
            if (!sceneAsset) {
                throw new Error('场景资产不存在');
            }
            const scene = sceneAsset.customFields?.novelVideo;
            if (!scene || !scene.sceneStory) {
                throw new Error('场景数据不完整');
            }
            // 2. 获取相关角色信息
            const characters = await this.getRelatedCharacters(projectId);
            await this.logger.info('场景和角色数据获取完成', 'VoiceoverService', {
                sceneId: scene.sceneId,
                charactersCount: characters.length
            });
            // 3. LLM提取台词
            const { dialogues } = await this.generator.generateVoiceover({
                story: scene.sceneStory,
                characters
            });
            await this.logger.info('台词提取完成', 'VoiceoverService', {
                dialoguesCount: dialogues.length
            });
            // 4. 为每句台词生成音频
            for (const dialogue of dialogues) {
                try {
                    const voiceFilePath = voiceFilesMap.get(dialogue.characterId);
                    if (!voiceFilePath) {
                        await this.logger.warn('角色音色文件未找到', 'VoiceoverService', {
                            characterId: dialogue.characterId,
                            characterName: dialogue.characterName
                        });
                        dialogue.audioStatus = 'failed';
                        continue;
                    }
                    dialogue.audioStatus = 'generating';
                    // 调用API生成音频
                    const audioPath = await this.apiService.generateDialogueAudio(projectId, sceneAssetPath, // 临时使用sceneAssetPath，实际应传voiceoverAssetPath
                    voiceFilePath);
                    dialogue.audioPath = audioPath;
                    dialogue.audioStatus = 'success';
                    await this.logger.info('对白音频生成成功', 'VoiceoverService', {
                        characterName: dialogue.characterName,
                        audioPath
                    });
                }
                catch (error) {
                    dialogue.audioStatus = 'failed';
                    await this.logger.error('对白音频生成失败', 'VoiceoverService', {
                        characterName: dialogue.characterName,
                        error
                    });
                }
            }
            // 5. 保存配音Asset
            const currentTime = await this.context.timeService.getCurrentTime();
            const voiceoverId = `voiceover-${currentTime.getTime()}`;
            const voiceoverAsset = await this.assetHelper.createAsset({
                schemaId: 'novel-to-video.voiceover',
                projectId,
                category: 'voiceovers',
                type: 'text',
                tags: ['novel-video', 'voiceover'],
                customFields: {
                    voiceoverId,
                    voiceoverSceneId: scene.sceneId,
                    dialogueText: JSON.stringify(dialogues),
                    dialogueCharacterId: dialogues.length > 0 ? dialogues[0].characterId : '',
                    emotion: dialogues.length > 0 ? dialogues[0].emotion : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
                }
            });
            await this.logger.info('配音资产创建成功', 'VoiceoverService', {
                voiceoverId: voiceoverAsset.id,
                successCount: dialogues.filter(d => d.audioStatus === 'success').length,
                failedCount: dialogues.filter(d => d.audioStatus === 'failed').length
            });
            return voiceoverAsset;
        }
        catch (error) {
            await this.logger.error('配音生成失败', 'VoiceoverService', {
                projectId,
                sceneAssetPath,
                error
            });
            throw error;
        }
    }
    /**
     * 批量生成配音
     * @param projectId 项目ID
     * @param sceneAssetPaths 场景资产路径列表
     * @param voiceFilesMap 音色文件映射
     * @returns 配音资产列表
     */
    async batchGenerateVoiceovers(projectId, sceneAssetPaths, voiceFilesMap) {
        const voiceovers = [];
        for (const sceneAssetPath of sceneAssetPaths) {
            try {
                const voiceover = await this.generateVoiceover(projectId, sceneAssetPath, voiceFilesMap);
                voiceovers.push(voiceover);
            }
            catch (error) {
                await this.logger.error('批量配音生成失败（跳过）', 'VoiceoverService', {
                    sceneAssetPath,
                    error
                });
                // 继续处理下一个场景
            }
        }
        await this.logger.info('批量配音生成完成', 'VoiceoverService', {
            projectId,
            totalCount: sceneAssetPaths.length,
            successCount: voiceovers.length
        });
        return voiceovers;
    }
    /**
     * 获取相关角色（辅助方法）
     */
    async getRelatedCharacters(projectId) {
        try {
            const characters = await this.assetHelper.queryAssets({
                schemaId: 'novel-to-video.character',
                projectId,
                limit: 1000
            });
            return characters.map(c => {
                const nv = c.customFields?.novelVideo;
                return {
                    characterId: nv?.characterId,
                    name: nv?.characterName,
                    appearance: nv?.characterAppearance,
                    voiceId: nv?.voiceId
                };
            });
        }
        catch (error) {
            await this.logger.warn('获取角色列表失败', 'VoiceoverService', { error });
            return [];
        }
    }
}
exports.VoiceoverService = VoiceoverService;

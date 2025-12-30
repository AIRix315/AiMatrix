/**
 * VoiceoverService - 配音生成服务
 *
 * 负责场景配音生成（台词提取和音频生成）
 */

import { NovelVideoAssetHelper } from './NovelVideoAssetHelper';
import { NovelVideoAPIService } from './NovelVideoAPIService';
import { Logger } from '../Logger';
import type { AssetMetadata } from '@/shared/types';
import type { NovelVideoFields } from '@/shared/types';

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
export class VoiceoverService {
  private assetHelper: NovelVideoAssetHelper;
  private apiService: NovelVideoAPIService;
  private generator?: VoiceoverGenerator;
  private logger: Logger;

  constructor(
    assetHelper: NovelVideoAssetHelper,
    apiService: NovelVideoAPIService,
    generator?: VoiceoverGenerator
  ) {
    this.assetHelper = assetHelper;
    this.apiService = apiService;
    this.generator = generator;
    this.logger = new Logger();
  }

  /**
   * 生成配音
   * @param projectId 项目ID
   * @param sceneAssetPath 场景资产文件路径
   * @param voiceFilesMap 音色文件映射 (characterId -> voiceFilePath)
   * @returns 配音资产
   */
  async generateVoiceover(
    projectId: string,
    sceneAssetPath: string,
    voiceFilesMap: Map<string, string>
  ): Promise<AssetMetadata> {
    try {
      await this.logger.info('开始生成配音', 'VoiceoverService', {
        projectId,
        sceneAssetPath
      });

      if (!this.generator) {
        throw new Error('配音生成器未初始化');
      }

      // 1. 获取场景资产
      const sceneAsset = await this.getSceneAsset(projectId, sceneAssetPath);
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
          const audioPath = await this.apiService.generateDialogueAudio(
            projectId,
            sceneAssetPath, // 临时使用sceneAssetPath，实际应传voiceoverAssetPath
            voiceFilePath
          );

          dialogue.audioPath = audioPath;
          dialogue.audioStatus = 'success';

          await this.logger.info('对白音频生成成功', 'VoiceoverService', {
            characterName: dialogue.characterName,
            audioPath
          });
        } catch (error) {
          dialogue.audioStatus = 'failed';
          await this.logger.error('对白音频生成失败', 'VoiceoverService', {
            characterName: dialogue.characterName,
            error
          });
        }
      }

      // 5. 保存配音Asset
      const voiceoverAsset = await this.assetHelper.createVoiceoverAsset({
        projectId,
        sceneId: scene.sceneId!,
        dialogueText: JSON.stringify(dialogues),
        characterId: dialogues.length > 0 ? dialogues[0].characterId : '',
        emotion: dialogues.length > 0 ? dialogues[0].emotion : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
      });

      await this.logger.info('配音资产创建成功', 'VoiceoverService', {
        voiceoverId: voiceoverAsset.id,
        successCount: dialogues.filter(d => d.audioStatus === 'success').length,
        failedCount: dialogues.filter(d => d.audioStatus === 'failed').length
      });

      return voiceoverAsset;
    } catch (error) {
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
  async batchGenerateVoiceovers(
    projectId: string,
    sceneAssetPaths: string[],
    voiceFilesMap: Map<string, string>
  ): Promise<AssetMetadata[]> {
    const voiceovers: AssetMetadata[] = [];

    for (const sceneAssetPath of sceneAssetPaths) {
      try {
        const voiceover = await this.generateVoiceover(
          projectId,
          sceneAssetPath,
          voiceFilesMap
        );
        voiceovers.push(voiceover);
      } catch (error) {
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
   * 获取场景资产（辅助方法）
   */
  private async getSceneAsset(
    projectId: string,
    sceneAssetPath: string
  ): Promise<AssetMetadata> {
    // TODO: 通过AssetManager获取元数据
    // 暂时返回模拟数据，待集成时完善
    throw new Error('getSceneAsset not implemented');
  }

  /**
   * 获取相关角色（辅助方法）
   */
  private async getRelatedCharacters(projectId: string): Promise<any[]> {
    try {
      const characters = await this.assetHelper.getCharactersByProject(projectId);
      return characters.map(c => {
        const nv = c.customFields?.novelVideo as NovelVideoFields;
        return {
          characterId: nv.characterId,
          name: nv.characterName,
          appearance: nv.characterAppearance,
          voiceId: nv.voiceId
        };
      });
    } catch (error) {
      await this.logger.warn('获取角色列表失败', 'VoiceoverService', { error });
      return [];
    }
  }
}

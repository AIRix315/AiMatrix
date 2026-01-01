/**
 * StoryboardService - 分镜脚本生成服务
 *
 * 负责生成视频分镜和图片分镜脚本（4步AI链式调用）
 */

import { NovelVideoAssetHelper } from './NovelVideoAssetHelper';
import { Logger } from '../Logger';
import type { AssetMetadata } from '@/shared/types';
import type { NovelVideoFields } from '@/shared/types';

/**
 * 分镜脚本生成器接口
 */
interface StoryboardScriptGenerator {
  generateScriptScenes(params: {
    story: string;
    characters: unknown[];
    chapter: unknown;
  }): Promise<any[]>;

  generateVideoPrompts(
    scriptScenes: unknown[],
    characters: unknown[],
    scene: unknown,
    artStyle: string
  ): Promise<any[]>;

  replaceCharacterNames(
    videoScenes: unknown[],
    characters: unknown[]
  ): Promise<any[]>;

  generateImageStoryboardPrompts(
    videoScenes: unknown[],
    characters: unknown[]
  ): Promise<any[]>;
}

/**
 * StoryboardService服务类
 */
export class StoryboardService {
  private assetHelper: NovelVideoAssetHelper;
  private generator?: StoryboardScriptGenerator;
  private logger: Logger;

  constructor(
    assetHelper: NovelVideoAssetHelper,
    generator?: StoryboardScriptGenerator
  ) {
    this.assetHelper = assetHelper;
    this.generator = generator;
    this.logger = new Logger();
  }

  /**
   * 生成分镜脚本（4步链式调用）
   * @param projectId 项目ID
   * @param sceneAssetPath 场景资产文件路径
   * @param artStyle 美术风格
   * @returns 分镜资产
   */
  async generateScript(
    projectId: string,
    sceneAssetPath: string,
    artStyle: string = '写实风格'
  ): Promise<AssetMetadata> {
    try {
      await this.logger.info('开始生成分镜脚本', 'StoryboardService', {
        projectId,
        sceneAssetPath,
        artStyle
      });

      if (!this.generator) {
        throw new Error('分镜脚本生成器未初始化');
      }

      // 1. 获取场景资产
      const sceneAsset = await this.getSceneAsset(projectId, sceneAssetPath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = sceneAsset.customFields?.novelVideo as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!scene || !(scene as any).sceneStory) {
        throw new Error('场景数据不完整');
      }

      // 2. 获取相关角色和章节信息
      const characters = await this.getRelatedCharacters(projectId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chapter = await this.getRelatedChapter(projectId, (scene as any).sceneChapterId);

      await this.logger.info('场景和角色数据获取完成', 'StoryboardService', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sceneId: (scene as any).sceneId,
        charactersCount: characters.length
      });

      // 3. Step 1: 生成剧本分镜描述
      const scriptScenes = await this.generator.generateScriptScenes({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        story: (scene as any).sceneStory,
        characters,
        chapter
      });

      await this.logger.info('剧本分镜描述生成完成', 'StoryboardService', {
        count: scriptScenes.length
      });

      // 4. Step 2: 生成Sora2视频提示词
      const videoScenes = await this.generator.generateVideoPrompts(
        scriptScenes,
        characters,
        scene,
        artStyle
      );

      await this.logger.info('视频提示词生成完成', 'StoryboardService', {
        count: videoScenes.length
      });

      // 5. Step 3 & 4: 并行执行
      const [replacedScenes, imageScenes] = await Promise.all([
        this.generator.replaceCharacterNames(videoScenes, characters),
        this.generator.generateImageStoryboardPrompts(videoScenes, characters)
      ]);

      await this.logger.info('分镜脚本生成完成', 'StoryboardService', {
        videoScenesCount: replacedScenes.length,
        imageScenesCount: imageScenes.length
      });

      // 6. 保存分镜脚本Asset
      const storyboardAsset = await this.assetHelper.createStoryboardAsset({
        projectId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sceneId: (scene as any).sceneId!,
        type: 'video',
        videoPrompt: JSON.stringify(replacedScenes),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imagePrompts: imageScenes.map((s: any) => s.prompt || JSON.stringify(s)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        characterIds: characters.map((c: any) => c.characterId)
      });

      await this.logger.info('分镜资产创建成功', 'StoryboardService', {
        storyboardId: storyboardAsset.id
      });

      return storyboardAsset;
    } catch (error) {
      await this.logger.error('分镜脚本生成失败', 'StoryboardService', {
        projectId,
        sceneAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 批量生成分镜脚本
   * @param projectId 项目ID
   * @param sceneAssetPaths 场景资产路径列表
   * @param artStyle 美术风格
   * @returns 分镜资产列表
   */
  async batchGenerateScripts(
    projectId: string,
    sceneAssetPaths: string[],
    artStyle: string = '写实风格'
  ): Promise<AssetMetadata[]> {
    const storyboards: AssetMetadata[] = [];

    for (const sceneAssetPath of sceneAssetPaths) {
      const storyboard = await this.generateScript(
        projectId,
        sceneAssetPath,
        artStyle
      );
      storyboards.push(storyboard);
    }

    await this.logger.info('批量分镜脚本生成完成', 'StoryboardService', {
      projectId,
      count: storyboards.length
    });

    return storyboards;
  }

  /**
   * 获取场景资产（辅助方法）
   */
  private async getSceneAsset(
    _projectId: string,
    _sceneAssetPath: string
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
          soraName: nv.soraName
        };
      });
    } catch (error) {
      await this.logger.warn('获取角色列表失败', 'StoryboardService', { error });
      return [];
    }
  }

  /**
   * 获取相关章节（辅助方法）
   */
  private async getRelatedChapter(
    projectId: string,
    chapterId?: string
  ): Promise<any> {
    if (!chapterId) {
      return {};
    }

    try {
      const chapters = await this.assetHelper.getChaptersByProject(projectId);
      const chapter = chapters.find(c => {
        const nv = c.customFields?.novelVideo as NovelVideoFields;
        return nv.chapterId === chapterId;
      });

      if (chapter) {
        const nv = chapter.customFields?.novelVideo as NovelVideoFields;
        return {
          chapterId: nv.chapterId,
          title: nv.chapterTitle,
          content: nv.chapterContent
        };
      }
    } catch (error) {
      await this.logger.warn('获取章节信息失败', 'StoryboardService', { error });
    }

    return {};
  }
}

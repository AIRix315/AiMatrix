/**
 * StoryboardService - 分镜脚本生成服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */

import { PluginContext, GenericAssetHelper, Logger } from '@matrix/sdk';
import type { AssetMetadata } from '@matrix/sdk';
import type { SceneSummary } from '../types/workflow';

/**
 * 分镜脚本生成器接口
 */
interface StoryboardScriptGenerator {
  generateScriptScenes(params: {
    story: string;
    characters: any[];
    chapter: any;
  }): Promise<any[]>;

  generateVideoPrompts(
    scriptScenes: any[],
    characters: any[],
    scene: any,
    artStyle: string
  ): Promise<any[]>;

  replaceCharacterNames(
    videoScenes: any[],
    characters: any[]
  ): Promise<any[]>;

  generateImageStoryboardPrompts(
    videoScenes: any[],
    characters: any[]
  ): Promise<any[]>;
}

/**
 * StoryboardService服务类
 */
export class StoryboardService {
  private assetHelper: GenericAssetHelper;
  private generator?: StoryboardScriptGenerator;
  private logger: Logger;
  private context: PluginContext;

  constructor(
    context: PluginContext,
    generator?: StoryboardScriptGenerator
  ) {
    this.context = context;
    this.assetHelper = context.assetHelper;
    this.logger = context.logger;
    this.generator = generator;
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

      // 2. 获取相关角色和章节信息
      const characters = await this.getRelatedCharacters(projectId);
      const chapter = await this.getRelatedChapter(projectId, scene.sceneChapterId);

      await this.logger.info('场景和角色数据获取完成', 'StoryboardService', {
        sceneId: scene.sceneId,
        charactersCount: characters.length
      });

      // 3. Step 1: 生成剧本分镜描述
      const scriptScenes = await this.generator.generateScriptScenes({
        story: scene.sceneStory,
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
      const currentTime = await this.context.timeService.getCurrentTime();
      const storyboardId = `storyboard-${currentTime.getTime()}`;

      const storyboardAsset = await this.assetHelper.createAsset({
        schemaId: 'novel-to-video.storyboard',
        projectId,
        category: 'storyboards',
        type: 'text',
        tags: ['novel-video', 'storyboard'],
        customFields: {
          storyboardId,
          storyboardSceneId: scene.sceneId,
          storyboardType: 'video',
          videoPrompt: JSON.stringify(replacedScenes),
          imagePrompts: imageScenes.map((s: any) => s.prompt || JSON.stringify(s)),
          characterIds: characters.map((c: any) => c.characterId)
        }
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

  async generateSceneSummaries(
    projectId: string,
    scenes: any[]
  ): Promise<SceneSummary[]> {
    try {
      await this.logger.info('开始生成场景摘要', 'StoryboardService', {
        projectId,
        sceneCount: scenes.length
      });

      if (!this.generator) {
        throw new Error('分镜脚本生成器未初始化');
      }

      const summaries: SceneSummary[] = [];

      for (const scene of scenes) {
        const summary = await (this.generator as any).generateSceneSummary({
          story: scene.sceneStory,
          location: scene.sceneLocation
        });

        summaries.push({
          sceneId: scene.sceneId,
          summary: summary.summary || summary
        });
      }

      await this.logger.info('场景摘要生成完成', 'StoryboardService', {
        count: summaries.length
      });

      return summaries;
    } catch (error) {
      await this.logger.error('场景摘要生成失败', 'StoryboardService', {
        projectId,
        error
      });
      throw error;
    }
  }

  async generateContextualScript(
    projectId: string,
    sceneAssetPath: string,
    artStyle: string,
    previousSummary?: string,
    nextSummary?: string
  ): Promise<AssetMetadata> {
    try {
      await this.logger.info('开始生成上下文分镜脚本', 'StoryboardService', {
        projectId,
        sceneAssetPath,
        hasPreviousSummary: !!previousSummary,
        hasNextSummary: !!nextSummary
      });

      if (!this.generator) {
        throw new Error('分镜脚本生成器未初始化');
      }

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

      const characters = await this.getRelatedCharacters(projectId);
      const chapter = await this.getRelatedChapter(projectId, scene.sceneChapterId);

      const scriptScenes = await (this.generator as any).generateScriptScenes({
        story: scene.sceneStory,
        characters,
        chapter,
        previousSummary,
        nextSummary
      });

      const videoScenes = await this.generator.generateVideoPrompts(
        scriptScenes,
        characters,
        scene,
        artStyle
      );

      const [replacedScenes, imageScenes] = await Promise.all([
        this.generator.replaceCharacterNames(videoScenes, characters),
        this.generator.generateImageStoryboardPrompts(videoScenes, characters)
      ]);

      const currentTime = await this.context.timeService.getCurrentTime();
      const storyboardId = `storyboard-${currentTime.getTime()}`;

      const storyboardAsset = await this.assetHelper.createAsset({
        schemaId: 'novel-to-video.storyboard',
        projectId,
        category: 'storyboards',
        type: 'text',
        tags: ['novel-video', 'storyboard'],
        customFields: {
          storyboardId,
          storyboardSceneId: scene.sceneId,
          storyboardType: 'video',
          videoPrompt: JSON.stringify(replacedScenes),
          imagePrompts: imageScenes.map((s: any) => s.prompt || JSON.stringify(s)),
          characterIds: characters.map((c: any) => c.characterId),
          contextMetadata: {
            hasPreviousSummary: !!previousSummary,
            hasNextSummary: !!nextSummary
          }
        }
      });

      await this.logger.info('上下文分镜资产创建成功', 'StoryboardService', {
        storyboardId: storyboardAsset.id
      });

      return storyboardAsset;
    } catch (error) {
      await this.logger.error('上下文分镜脚本生成失败', 'StoryboardService', {
        projectId,
        sceneAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 获取相关角色（辅助方法）
   */
  private async getRelatedCharacters(projectId: string): Promise<any[]> {
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
          soraName: nv?.soraName
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
      const chapters = await this.assetHelper.queryAssets({
        schemaId: 'novel-to-video.chapter',
        projectId,
        limit: 1000,
        customFieldsFilter: {
          chapterId
        }
      });

      const chapter = chapters[0];

      if (chapter) {
        const nv = chapter.customFields?.novelVideo;
        return {
          chapterId: nv?.chapterId,
          title: nv?.chapterTitle,
          content: nv?.chapterContent
        };
      }
    } catch (error) {
      await this.logger.warn('获取章节信息失败', 'StoryboardService', { error });
    }

    return {};
  }
}

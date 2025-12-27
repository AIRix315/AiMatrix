/**
 * ChapterService - 章节服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */

import * as fs from 'fs/promises';
import { PluginContext, GenericAssetHelper, Logger } from '@matrix/sdk';
import type { AssetMetadata } from '@matrix/sdk';

/**
 * 章节分割器接口
 */
interface ChapterSplitter {
  split(content: string): Array<{ title: string; content: string }>;
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
export class ChapterService {
  private assetHelper: GenericAssetHelper;
  private logger: Logger;
  private splitter?: ChapterSplitter;
  private extractor?: SceneCharacterExtractor;
  private context: PluginContext;

  constructor(
    context: PluginContext,
    splitter?: ChapterSplitter,
    extractor?: SceneCharacterExtractor
  ) {
    this.context = context;
    this.assetHelper = context.assetHelper;
    this.logger = context.logger;
    this.splitter = splitter;
    this.extractor = extractor;
  }

  /**
   * 拆分小说为章节
   * @param projectId 项目ID
   * @param novelPath 小说文件路径
   * @returns 章节资产列表
   */
  async splitChapters(
    projectId: string,
    novelPath: string
  ): Promise<AssetMetadata[]> {
    try {
      await this.logger.info('开始拆分小说', 'ChapterService', {
        projectId,
        novelPath
      });

      // 1. 读取小说文件
      const novelContent = await fs.readFile(novelPath, 'utf-8');

      if (!novelContent || novelContent.trim().length === 0) {
        throw new Error('小说文件为空');
      }

      // 2. 使用规则拆分章节
      if (!this.splitter) {
        throw new Error('章节拆分器未初始化');
      }

      const chapters = this.splitter.split(novelContent);

      if (!chapters || chapters.length === 0) {
        throw new Error('未能拆分出任何章节');
      }

      await this.logger.info(`拆分完成，共${chapters.length}个章节`, 'ChapterService');

      // 3. 为每个章节创建Asset（使用 GenericAssetHelper）
      const chapterAssets: AssetMetadata[] = [];
      const currentTime = await this.context.timeService.getCurrentTime();

      for (let i = 0; i < chapters.length; i++) {
        const chapterId = `chapter-${currentTime.getTime()}-${i}`;

        const asset = await this.assetHelper.createAsset({
          schemaId: 'novel-to-video.chapter',
          projectId,
          category: 'chapters',
          type: 'text',
          tags: ['novel-video', 'chapter'],
          customFields: {
            chapterId,
            chapterTitle: chapters[i].title,
            chapterContent: chapters[i].content,
            chapterIndex: i
          }
        });

        chapterAssets.push(asset);
      }

      await this.logger.info('章节资产创建完成', 'ChapterService', {
        projectId,
        count: chapterAssets.length
      });

      return chapterAssets;
    } catch (error) {
      await this.logger.error('章节拆分失败', 'ChapterService', {
        projectId,
        novelPath,
        error
      });
      throw error;
    }
  }

  /**
   * 提取章节中的场景和角色
   * @param projectId 项目ID
   * @param chapterAssetPath 章节资产文件路径
   * @param artStyle 美术风格
   * @returns 场景和角色资产列表
   */
  async extractScenesAndCharacters(
    projectId: string,
    chapterAssetPath: string,
    artStyle: string = '写实风格'
  ): Promise<{
    scenes: AssetMetadata[];
    characters: AssetMetadata[];
  }> {
    try {
      // 1. 读取章节Asset
      const chapters = await this.assetHelper.queryAssets({
        schemaId: 'novel-to-video.chapter',
        projectId,
        limit: 1000
      });

      const chapterAsset = chapters.find(c => c.filePath === chapterAssetPath);

      if (!chapterAsset) {
        throw new Error('章节资产不存在');
      }

      const chapterData = chapterAsset.customFields?.novelVideo;
      const chapterContent = chapterData?.chapterContent;

      if (!chapterContent) {
        throw new Error('章节内容为空');
      }

      await this.logger.info('开始提取场景和角色', 'ChapterService', {
        projectId,
        chapterId: chapterData?.chapterId,
        chapterTitle: chapterData?.chapterTitle
      });

      if (!this.extractor) {
        throw new Error('场景角色提取器未初始化');
      }

      // 2. 调用LLM提取场景和角色
      const segments = await this.extractor.splitChapterIntoScenes(chapterContent);

      // 3. 细化场景描述
      const refinedScenes = await this.extractor.refineScenes(
        segments,
        chapterContent,
        artStyle
      );

      // 4. 细化角色描述
      const refinedCharacters = await this.extractor.refineCharacters(
        segments,
        chapterContent,
        artStyle
      );

      await this.logger.info('场景和角色提取完成', 'ChapterService', {
        scenesCount: refinedScenes.length,
        charactersCount: refinedCharacters.length
      });

      // 5. 创建场景Asset
      const sceneAssets: AssetMetadata[] = [];
      const currentTime = await this.context.timeService.getCurrentTime();

      for (let i = 0; i < refinedScenes.length; i++) {
        const scene = refinedScenes[i];
        const sceneId = `scene-${currentTime.getTime()}-${i}`;

        const asset = await this.assetHelper.createAsset({
          schemaId: 'novel-to-video.scene',
          projectId,
          category: 'scenes',
          type: 'text',
          tags: ['novel-video', 'scene'],
          customFields: {
            sceneId,
            sceneChapterId: chapterData.chapterId,
            sceneStory: scene.story || scene.content,
            sceneLocation: scene.location || '未知地点',
            sceneImagePrompt: scene.prompt || scene.imagePrompt
          }
        });

        sceneAssets.push(asset);
      }

      // 6. 创建角色Asset
      const characterAssets: AssetMetadata[] = [];

      for (let i = 0; i < refinedCharacters.length; i++) {
        const character = refinedCharacters[i];
        const characterId = `character-${currentTime.getTime()}-${i}`;

        const asset = await this.assetHelper.createAsset({
          schemaId: 'novel-to-video.character',
          projectId,
          category: 'characters',
          type: 'text',
          tags: ['novel-video', 'character'],
          customFields: {
            characterId,
            characterName: character.name,
            characterAppearance: character.appearance || character.description,
            characterImagePrompt: character.prompt || character.imagePrompt
          }
        });

        characterAssets.push(asset);
      }

      await this.logger.info('场景和角色资产创建完成', 'ChapterService', {
        scenesCount: sceneAssets.length,
        charactersCount: characterAssets.length
      });

      return {
        scenes: sceneAssets,
        characters: characterAssets
      };
    } catch (error) {
      await this.logger.error('场景和角色提取失败', 'ChapterService', {
        projectId,
        chapterAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 批量提取多个章节的场景和角色
   * @param projectId 项目ID
   * @param chapterAssetPaths 章节资产路径列表
   * @param artStyle 美术风格
   * @returns 所有场景和角色资产
   */
  async batchExtractScenesAndCharacters(
    projectId: string,
    chapterAssetPaths: string[],
    artStyle: string = '写实风格'
  ): Promise<{
    scenes: AssetMetadata[];
    characters: AssetMetadata[];
  }> {
    const allScenes: AssetMetadata[] = [];
    const allCharacters: AssetMetadata[] = [];

    for (const chapterPath of chapterAssetPaths) {
      const result = await this.extractScenesAndCharacters(
        projectId,
        chapterPath,
        artStyle
      );
      allScenes.push(...result.scenes);
      allCharacters.push(...result.characters);
    }

    // 去重角色（基于角色名称）
    const uniqueCharacters = this.deduplicateCharacters(allCharacters);

    await this.logger.info('批量提取完成', 'ChapterService', {
      projectId,
      totalScenes: allScenes.length,
      totalCharacters: uniqueCharacters.length
    });

    return {
      scenes: allScenes,
      characters: uniqueCharacters
    };
  }

  /**
   * 去重角色资产（基于角色名称）
   */
  private deduplicateCharacters(characters: AssetMetadata[]): AssetMetadata[] {
    const seen = new Set<string>();
    const unique: AssetMetadata[] = [];

    for (const character of characters) {
      const name = character.customFields?.novelVideo?.characterName;
      if (name && !seen.has(name)) {
        seen.add(name);
        unique.push(character);
      }
    }

    return unique;
  }
}

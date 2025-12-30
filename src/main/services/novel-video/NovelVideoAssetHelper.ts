/**
 * NovelVideo资产助手类
 *
 * 封装小说转视频专用的Asset操作方法，简化章节/场景/角色等资产的创建和查询
 *
 * 核心设计：
 * - 利用AssetManager的customFields机制存储NovelVideo专用数据
 * - 提供类型安全的快捷方法
 * - 自动处理文件创建和元数据管理
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AssetManagerClass } from '../AssetManager';
import { FileSystemService } from '../FileSystemService';
import { Logger } from '../Logger';
import { timeService } from '../TimeService';
import {
  AssetMetadata,
  NovelVideoFields,
  ChapterData,
  SceneData,
  CharacterData,
  StoryboardData,
  VoiceoverData
} from '@/shared/types';

export class NovelVideoAssetHelper {
  private assetManager: AssetManagerClass;
  private fsService: FileSystemService;
  private logger: Logger;

  constructor(assetManager: AssetManagerClass, fsService: FileSystemService) {
    this.assetManager = assetManager;
    this.fsService = fsService;
    this.logger = new Logger();
  }

  /**
   * 创建章节资产
   * 将章节内容保存为文本文件，并存储元数据
   */
  async createChapterAsset(data: ChapterData): Promise<AssetMetadata> {
    try {
      const currentTime = await timeService.getCurrentTime();
      const chapterId = `chapter-${currentTime.getTime()}`;
      const fileName = `${data.title}.txt`;

      // 确保项目章节目录存在
      const chapterDir = this.fsService.getProjectAssetDir(data.projectId, 'chapters');
      await this.fsService.ensureDir(chapterDir);

      // 创建章节文本文件
      const filePath = path.join(chapterDir, fileName);
      await fs.writeFile(filePath, data.content, 'utf-8');

      await this.logger.info('创建章节文件成功', 'NovelVideoAssetHelper', {
        projectId: data.projectId,
        chapterId,
        fileName
      });

      // 导入到AssetManager
      const metadata = await this.assetManager.importAsset({
        sourcePath: filePath,
        scope: 'project',
        projectId: data.projectId,
        category: 'chapters',
        type: 'text',
        tags: ['novel-video', 'chapter'],
        metadata: {
          customFields: {
            novelVideo: {
              chapterId,
              chapterTitle: data.title,
              chapterContent: data.content,
              chapterIndex: data.index
            } satisfies NovelVideoFields
          }
        }
      });

      await this.logger.info('章节资产创建成功', 'NovelVideoAssetHelper', { chapterId });
      return metadata;
    } catch (error) {
      await this.logger.error('创建章节资产失败', 'NovelVideoAssetHelper', { data, error });
      throw error;
    }
  }

  /**
   * 创建场景资产（初始无图片）
   * 创建场景JSON文件，记录场景信息和图片提示词
   */
  async createSceneAsset(data: SceneData): Promise<AssetMetadata> {
    try {
      const currentTime = await timeService.getCurrentTime();
      const sceneId = `scene-${currentTime.getTime()}`;
      const fileName = `${data.location}.json`;

      // 确保项目场景目录存在
      const sceneDir = this.fsService.getProjectAssetDir(data.projectId, 'scenes');
      await this.fsService.ensureDir(sceneDir);

      // 创建场景JSON文件
      const filePath = path.join(sceneDir, fileName);
      const sceneJson = {
        sceneId,
        chapterId: data.chapterId,
        story: data.story,
        location: data.location,
        imagePrompt: data.imagePrompt
      };
      await fs.writeFile(filePath, JSON.stringify(sceneJson, null, 2), 'utf-8');

      await this.logger.info('创建场景文件成功', 'NovelVideoAssetHelper', {
        projectId: data.projectId,
        sceneId,
        fileName
      });

      // 导入到AssetManager
      const metadata = await this.assetManager.importAsset({
        sourcePath: filePath,
        scope: 'project',
        projectId: data.projectId,
        category: 'scenes',
        type: 'text',
        tags: ['novel-video', 'scene'],
        metadata: {
          status: 'none', // 图片未生成
          prompt: data.imagePrompt,
          customFields: {
            novelVideo: {
              sceneId,
              sceneChapterId: data.chapterId,
              sceneStory: data.story,
              sceneLocation: data.location,
              sceneImagePrompt: data.imagePrompt
            } satisfies NovelVideoFields
          }
        }
      });

      await this.logger.info('场景资产创建成功', 'NovelVideoAssetHelper', { sceneId });
      return metadata;
    } catch (error) {
      await this.logger.error('创建场景资产失败', 'NovelVideoAssetHelper', { data, error });
      throw error;
    }
  }

  /**
   * 创建角色资产（初始无图片）
   * 创建角色JSON文件，记录角色信息和图片提示词
   */
  async createCharacterAsset(data: CharacterData): Promise<AssetMetadata> {
    try {
      const currentTime = await timeService.getCurrentTime();
      const characterId = `character-${currentTime.getTime()}`;
      const fileName = `${data.name}.json`;

      // 确保项目角色目录存在
      const characterDir = this.fsService.getProjectAssetDir(data.projectId, 'characters');
      await this.fsService.ensureDir(characterDir);

      // 创建角色JSON文件
      const filePath = path.join(characterDir, fileName);
      const characterJson = {
        characterId,
        name: data.name,
        appearance: data.appearance,
        imagePrompt: data.imagePrompt,
        soraName: data.soraName,
        voiceId: data.voiceId
      };
      await fs.writeFile(filePath, JSON.stringify(characterJson, null, 2), 'utf-8');

      await this.logger.info('创建角色文件成功', 'NovelVideoAssetHelper', {
        projectId: data.projectId,
        characterId,
        fileName
      });

      // 导入到AssetManager
      const metadata = await this.assetManager.importAsset({
        sourcePath: filePath,
        scope: 'project',
        projectId: data.projectId,
        category: 'characters',
        type: 'text',
        tags: ['novel-video', 'character'],
        metadata: {
          status: 'none', // 图片未生成
          prompt: data.imagePrompt,
          customFields: {
            novelVideo: {
              characterId,
              characterName: data.name,
              characterAppearance: data.appearance,
              characterImagePrompt: data.imagePrompt,
              soraName: data.soraName,
              voiceId: data.voiceId
            } satisfies NovelVideoFields
          }
        }
      });

      await this.logger.info('角色资产创建成功', 'NovelVideoAssetHelper', { characterId });
      return metadata;
    } catch (error) {
      await this.logger.error('创建角色资产失败', 'NovelVideoAssetHelper', { data, error });
      throw error;
    }
  }

  /**
   * 查询章节的所有场景
   * @param projectId 项目ID
   * @param chapterId 章节ID
   * @returns 场景资产列表
   */
  async getScenesByChapter(
    projectId: string,
    chapterId: string
  ): Promise<AssetMetadata[]> {
    try {
      const result = await this.assetManager.scanAssets({
        scope: 'project',
        projectId,
        category: 'scenes',
        tags: ['novel-video', 'scene']
      });

      // 过滤出属于该章节的场景
      const scenes = result.assets.filter(asset => {
        const nv = asset.customFields?.novelVideo as NovelVideoFields;
        return nv?.sceneChapterId === chapterId;
      });

      await this.logger.debug('查询章节场景', 'NovelVideoAssetHelper', {
        projectId,
        chapterId,
        count: scenes.length
      });

      return scenes;
    } catch (error) {
      await this.logger.error('查询章节场景失败', 'NovelVideoAssetHelper', {
        projectId,
        chapterId,
        error
      });
      throw error;
    }
  }

  /**
   * 查询项目的所有章节
   * @param projectId 项目ID
   * @returns 章节资产列表（按chapterIndex排序）
   */
  async getChaptersByProject(projectId: string): Promise<AssetMetadata[]> {
    try {
      const result = await this.assetManager.scanAssets({
        scope: 'project',
        projectId,
        category: 'chapters',
        tags: ['novel-video', 'chapter']
      });

      // 按章节序号排序
      const chapters = result.assets.sort((a, b) => {
        const nvA = a.customFields?.novelVideo as NovelVideoFields;
        const nvB = b.customFields?.novelVideo as NovelVideoFields;
        return (nvA?.chapterIndex || 0) - (nvB?.chapterIndex || 0);
      });

      await this.logger.debug('查询项目章节', 'NovelVideoAssetHelper', {
        projectId,
        count: chapters.length
      });

      return chapters;
    } catch (error) {
      await this.logger.error('查询项目章节失败', 'NovelVideoAssetHelper', { projectId, error });
      throw error;
    }
  }

  /**
   * 查询项目的所有角色
   * @param projectId 项目ID
   * @returns 角色资产列表
   */
  async getCharactersByProject(projectId: string): Promise<AssetMetadata[]> {
    try {
      const result = await this.assetManager.scanAssets({
        scope: 'project',
        projectId,
        category: 'characters',
        tags: ['novel-video', 'character']
      });

      await this.logger.debug('查询项目角色', 'NovelVideoAssetHelper', {
        projectId,
        count: result.assets.length
      });

      return result.assets;
    } catch (error) {
      await this.logger.error('查询项目角色失败', 'NovelVideoAssetHelper', { projectId, error });
      throw error;
    }
  }

  /**
   * 更新场景图片路径
   * 当场景图片生成完成后，更新资产元数据
   * @param sceneAssetFilePath 场景资产的文件路径
   * @param imagePath 生成的图片路径
   */
  async updateSceneImage(
    sceneAssetFilePath: string,
    imagePath: string
  ): Promise<void> {
    try {
      const sceneAsset = await this.assetManager.getMetadata(sceneAssetFilePath);
      if (!sceneAsset) {
        throw new Error('场景资产不存在');
      }

      await this.assetManager.updateMetadata(sceneAssetFilePath, {
        status: 'success',
        customFields: {
          ...sceneAsset.customFields,
          novelVideo: {
            ...(sceneAsset.customFields?.novelVideo || {}),
            sceneImagePath: imagePath
          } as NovelVideoFields
        }
      });

      await this.logger.info('场景图片更新成功', 'NovelVideoAssetHelper', {
        sceneAssetFilePath,
        imagePath
      });
    } catch (error) {
      await this.logger.error('场景图片更新失败', 'NovelVideoAssetHelper', {
        sceneAssetFilePath,
        imagePath,
        error
      });
      throw error;
    }
  }

  /**
   * 更新角色图片路径
   * 当角色图片生成完成后，更新资产元数据
   * @param characterAssetFilePath 角色资产的文件路径
   * @param imagePath 生成的图片路径
   */
  async updateCharacterImage(
    characterAssetFilePath: string,
    imagePath: string
  ): Promise<void> {
    try {
      const characterAsset = await this.assetManager.getMetadata(characterAssetFilePath);
      if (!characterAsset) {
        throw new Error('角色资产不存在');
      }

      await this.assetManager.updateMetadata(characterAssetFilePath, {
        status: 'success',
        customFields: {
          ...characterAsset.customFields,
          novelVideo: {
            ...(characterAsset.customFields?.novelVideo || {}),
            characterImagePath: imagePath
          } as NovelVideoFields
        }
      });

      await this.logger.info('角色图片更新成功', 'NovelVideoAssetHelper', {
        characterAssetFilePath,
        imagePath
      });
    } catch (error) {
      await this.logger.error('角色图片更新失败', 'NovelVideoAssetHelper', {
        characterAssetFilePath,
        imagePath,
        error
      });
      throw error;
    }
  }

  /**
   * 创建分镜脚本资产
   */
  async createStoryboardAsset(data: StoryboardData): Promise<AssetMetadata> {
    try {
      const currentTime = await timeService.getCurrentTime();
      const storyboardId = `storyboard-${currentTime.getTime()}`;
      const fileName = `storyboard-${data.sceneId}.json`;

      // 确保项目分镜目录存在
      const storyboardDir = this.fsService.getProjectAssetDir(data.projectId, 'storyboards');
      await this.fsService.ensureDir(storyboardDir);

      // 创建分镜JSON文件
      const filePath = path.join(storyboardDir, fileName);
      const storyboardJson = {
        storyboardId,
        sceneId: data.sceneId,
        type: data.type,
        videoPrompt: data.videoPrompt,
        imagePrompts: data.imagePrompts,
        characterIds: data.characterIds
      };
      await fs.writeFile(filePath, JSON.stringify(storyboardJson, null, 2), 'utf-8');

      // 导入到AssetManager
      const metadata = await this.assetManager.importAsset({
        sourcePath: filePath,
        scope: 'project',
        projectId: data.projectId,
        category: 'storyboards',
        type: 'text',
        tags: ['novel-video', 'storyboard'],
        metadata: {
          status: 'none',
          customFields: {
            novelVideo: {
              storyboardSceneId: data.sceneId,
              storyboardType: data.type,
              videoPrompt: data.videoPrompt,
              imagePrompts: data.imagePrompts,
              characterIds: data.characterIds
            } satisfies NovelVideoFields
          }
        }
      });

      await this.logger.info('分镜资产创建成功', 'NovelVideoAssetHelper', { storyboardId });
      return metadata;
    } catch (error) {
      await this.logger.error('创建分镜资产失败', 'NovelVideoAssetHelper', { data, error });
      throw error;
    }
  }

  /**
   * 创建配音资产
   */
  async createVoiceoverAsset(data: VoiceoverData): Promise<AssetMetadata> {
    try {
      const currentTime = await timeService.getCurrentTime();
      const voiceoverId = `voiceover-${currentTime.getTime()}`;
      const fileName = `voiceover-${data.sceneId}.json`;

      // 确保项目配音目录存在
      const voiceoverDir = this.fsService.getProjectAssetDir(data.projectId, 'voiceovers');
      await this.fsService.ensureDir(voiceoverDir);

      // 创建配音JSON文件
      const filePath = path.join(voiceoverDir, fileName);
      const voiceoverJson = {
        voiceoverId,
        sceneId: data.sceneId,
        dialogueText: data.dialogueText,
        characterId: data.characterId,
        emotion: data.emotion
      };
      await fs.writeFile(filePath, JSON.stringify(voiceoverJson, null, 2), 'utf-8');

      // 导入到AssetManager
      const metadata = await this.assetManager.importAsset({
        sourcePath: filePath,
        scope: 'project',
        projectId: data.projectId,
        category: 'voiceovers',
        type: 'text',
        tags: ['novel-video', 'voiceover'],
        metadata: {
          status: 'none',
          customFields: {
            novelVideo: {
              voiceoverSceneId: data.sceneId,
              dialogueText: data.dialogueText,
              dialogueCharacterId: data.characterId,
              emotion: data.emotion
            } satisfies NovelVideoFields
          }
        }
      });

      await this.logger.info('配音资产创建成功', 'NovelVideoAssetHelper', { voiceoverId });
      return metadata;
    } catch (error) {
      await this.logger.error('创建配音资产失败', 'NovelVideoAssetHelper', { data, error });
      throw error;
    }
  }
}

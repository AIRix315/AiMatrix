/**
 * NovelVideoAPIService - 小说转视频API服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API，移除对内部模块的直接依赖
 */

import * as path from 'path';
import { PluginContext, APIManager, GenericAssetHelper, Logger } from '@matrix/sdk';
import type { AssetMetadata } from '@matrix/sdk';

export class NovelVideoAPIService {
  private apiManager: APIManager;
  private assetHelper: GenericAssetHelper;
  private logger: Logger;

  /**
   * 构造函数 - 通过PluginContext注入依赖
   */
  constructor(apiManager: APIManager, context: PluginContext) {
    this.apiManager = apiManager;
    this.assetHelper = context.assetHelper;
    this.logger = context.logger;
  }

  /**
   * 生成场景图片
   * @param projectId 项目ID
   * @param sceneAssetPath 场景资产文件路径
   * @returns 生成的图片路径
   */
  async generateSceneImage(
    projectId: string,
    sceneAssetPath: string
  ): Promise<string> {
    try {
      // 1. 获取场景资产元数据
      const scenes = await this.assetHelper.queryAssets({
        schemaId: 'novel-to-video.scene',
        projectId,
        limit: 1000
      });

      const sceneAsset = scenes.find(s => s.filePath === sceneAssetPath);
      if (!sceneAsset) {
        throw new Error('场景资产不存在');
      }

      const sceneData = sceneAsset.customFields?.novelVideo;
      const prompt = sceneData?.sceneImagePrompt;

      if (!prompt) {
        throw new Error('场景Prompt为空');
      }

      await this.logger.info('开始生成场景图片', 'NovelVideoAPIService', {
        projectId,
        sceneId: sceneData?.sceneId,
        prompt
      });

      // 2. 调用T8Star API生成图片
      const imageUrl = await this.apiManager.callT8StarImage(prompt, {
        model: 'nano-banana',
        aspectRatio: '16:9'
      });

      // 3. 下载图片到项目目录
      const savePath = path.join(
        path.dirname(sceneAssetPath),
        `${sceneData?.sceneId}.png`
      );

      const imagePath = await this.downloadImage(imageUrl, savePath);

      // 4. 更新场景资产元数据
      await this.assetHelper.updateAssetCustomFields(sceneAssetPath, {
        ...sceneData,
        sceneImagePath: imagePath
      });

      await this.logger.info('场景图片生成成功', 'NovelVideoAPIService', {
        sceneId: sceneData?.sceneId,
        imagePath
      });

      return imagePath;
    } catch (error) {
      await this.logger.error('场景图片生成失败', 'NovelVideoAPIService', {
        projectId,
        sceneAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 生成角色图片
   * @param projectId 项目ID
   * @param characterAssetPath 角色资产文件路径
   * @returns 生成的图片路径
   */
  async generateCharacterImage(
    projectId: string,
    characterAssetPath: string
  ): Promise<string> {
    try {
      // 1. 获取角色资产元数据
      const characters = await this.assetHelper.queryAssets({
        schemaId: 'novel-to-video.character',
        projectId,
        limit: 1000
      });

      const characterAsset = characters.find(c => c.filePath === characterAssetPath);
      if (!characterAsset) {
        throw new Error('角色资产不存在');
      }

      const characterData = characterAsset.customFields?.novelVideo;
      const prompt = characterData?.characterImagePrompt;

      if (!prompt) {
        throw new Error('角色Prompt为空');
      }

      await this.logger.info('开始生成角色图片', 'NovelVideoAPIService', {
        projectId,
        characterId: characterData?.characterId,
        prompt
      });

      // 2. 调用T8Star API生成图片
      const imageUrl = await this.apiManager.callT8StarImage(prompt, {
        model: 'nano-banana',
        aspectRatio: '1:1'
      });

      // 3. 下载图片到项目目录
      const savePath = path.join(
        path.dirname(characterAssetPath),
        `${characterData?.characterId}.png`
      );

      const imagePath = await this.downloadImage(imageUrl, savePath);

      // 4. 更新角色资产元数据
      await this.assetHelper.updateAssetCustomFields(characterAssetPath, {
        ...characterData,
        characterImagePath: imagePath
      });

      await this.logger.info('角色图片生成成功', 'NovelVideoAPIService', {
        characterId: characterData?.characterId,
        imagePath
      });

      return imagePath;
    } catch (error) {
      await this.logger.error('角色图片生成失败', 'NovelVideoAPIService', {
        projectId,
        characterAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 生成分镜视频
   * @param projectId 项目ID
   * @param storyboardAssetPath 分镜资产文件路径
   * @param onProgress 进度回调
   * @returns 生成的视频路径
   */
  async generateStoryboardVideo(
    projectId: string,
    storyboardAssetPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // 1. 获取分镜资产元数据
      const storyboards = await this.assetHelper.queryAssets({
        schemaId: 'novel-to-video.storyboard',
        projectId,
        limit: 1000
      });

      const storyboard = storyboards.find(s => s.filePath === storyboardAssetPath);
      if (!storyboard) {
        throw new Error('分镜资产不存在');
      }

      const storyboardData = storyboard.customFields?.novelVideo;
      const prompt = storyboardData?.videoPrompt;
      const sceneImagePath = storyboardData?.sceneImagePath;

      if (!prompt) {
        throw new Error('分镜Prompt为空');
      }

      await this.logger.info('开始生成分镜视频', 'NovelVideoAPIService', {
        projectId,
        storyboardId: storyboard.id,
        prompt
      });

      // 2. 调用T8Star视频生成API（带进度回调）
      const videoUrl = await this.apiManager.callT8StarVideo({
        prompt,
        imagePath: sceneImagePath,
        model: 'sora-2',
        onProgress
      });

      // 3. 下载视频到项目目录
      const savePath = path.join(
        path.dirname(storyboardAssetPath),
        `${storyboard.id}.mp4`
      );

      const videoPath = await this.downloadVideo(videoUrl, savePath);

      await this.logger.info('分镜视频生成成功', 'NovelVideoAPIService', {
        storyboardId: storyboard.id,
        videoPath
      });

      return videoPath;
    } catch (error) {
      await this.logger.error('分镜视频生成失败', 'NovelVideoAPIService', {
        projectId,
        storyboardAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 生成对白音频
   * @param projectId 项目ID
   * @param voiceoverAssetPath 配音资产文件路径
   * @param voiceFilePath 音色文件路径
   * @returns 生成的音频路径
   */
  async generateDialogueAudio(
    projectId: string,
    voiceoverAssetPath: string,
    voiceFilePath: string
  ): Promise<string> {
    try {
      // 1. 获取配音资产元数据
      const voiceovers = await this.assetHelper.queryAssets({
        schemaId: 'novel-to-video.voiceover',
        projectId,
        limit: 1000
      });

      const voiceover = voiceovers.find(v => v.filePath === voiceoverAssetPath);
      if (!voiceover) {
        throw new Error('配音资产不存在');
      }

      const voiceoverData = voiceover.customFields?.novelVideo;
      const dialogueText = voiceoverData?.dialogueText;
      const emotion = voiceoverData?.emotion || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

      if (!dialogueText) {
        throw new Error('对白文本为空');
      }

      await this.logger.info('开始生成对白音频', 'NovelVideoAPIService', {
        projectId,
        voiceoverId: voiceover.id,
        dialogueText
      });

      // 2. 调用RunningHub TTS API
      const audioPath = await this.apiManager.callRunningHubTTS({
        text: dialogueText,
        voiceFilePath,
        emotion
      });

      await this.logger.info('对白音频生成成功', 'NovelVideoAPIService', {
        voiceoverId: voiceover.id,
        audioPath
      });

      return audioPath;
    } catch (error) {
      await this.logger.error('对白音频生成失败', 'NovelVideoAPIService', {
        projectId,
        voiceoverAssetPath,
        error
      });
      throw error;
    }
  }

  /**
   * 下载图片到本地
   */
  private async downloadImage(url: string, savePath: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`图片下载失败: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const fs = await import('fs/promises');
      await fs.writeFile(savePath, buffer);

      return savePath;
    } catch (error) {
      await this.logger.error('图片下载失败', 'NovelVideoAPIService', { url, savePath, error });
      throw error;
    }
  }

  /**
   * 下载视频到本地
   */
  private async downloadVideo(url: string, savePath: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`视频下载失败: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const fs = await import('fs/promises');
      await fs.writeFile(savePath, buffer);

      return savePath;
    } catch (error) {
      await this.logger.error('视频下载失败', 'NovelVideoAPIService', { url, savePath, error });
      throw error;
    }
  }
}

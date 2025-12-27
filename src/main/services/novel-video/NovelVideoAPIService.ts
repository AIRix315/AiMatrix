/**
 * NovelVideoAPIService - 小说转视频API服务
 *
 * 封装T8Star和RunningHub API调用，集成AssetManager自动保存生成结果
 */

import * as path from 'path';
import { APIManager } from '../APIManager';
import { NovelVideoAssetHelper } from './NovelVideoAssetHelper';
import { Logger } from '../Logger';
import type { AssetMetadata } from '../../../shared/types/asset';

export class NovelVideoAPIService {
  private apiManager: APIManager;
  private assetHelper: NovelVideoAssetHelper;
  private logger: Logger;

  constructor(apiManager: APIManager, assetHelper: NovelVideoAssetHelper) {
    this.apiManager = apiManager;
    this.assetHelper = assetHelper;
    this.logger = new Logger();
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
      const sceneAsset = await this.getSceneAsset(sceneAssetPath);
      const prompt = sceneAsset.customFields?.novelVideo?.sceneImagePrompt;

      if (!prompt) {
        throw new Error('场景Prompt为空');
      }

      await this.logger.info('开始生成场景图片', 'NovelVideoAPIService', {
        projectId,
        sceneId: sceneAsset.customFields?.novelVideo?.sceneId,
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
        `${sceneAsset.customFields?.novelVideo?.sceneId}.png`
      );

      const imagePath = await this.downloadImage(imageUrl, savePath);

      // 4. 更新场景资产元数据
      await this.assetHelper.updateSceneImage(sceneAssetPath, imagePath);

      await this.logger.info('场景图片生成成功', 'NovelVideoAPIService', {
        sceneId: sceneAsset.customFields?.novelVideo?.sceneId,
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
      const characterAsset = await this.getCharacterAsset(characterAssetPath);
      const prompt = characterAsset.customFields?.novelVideo?.characterImagePrompt;

      if (!prompt) {
        throw new Error('角色Prompt为空');
      }

      await this.logger.info('开始生成角色图片', 'NovelVideoAPIService', {
        projectId,
        characterId: characterAsset.customFields?.novelVideo?.characterId,
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
        `${characterAsset.customFields?.novelVideo?.characterId}.png`
      );

      const imagePath = await this.downloadImage(imageUrl, savePath);

      // 4. 更新角色资产元数据
      await this.assetHelper.updateCharacterImage(characterAssetPath, imagePath);

      await this.logger.info('角色图片生成成功', 'NovelVideoAPIService', {
        characterId: characterAsset.customFields?.novelVideo?.characterId,
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
      const storyboard = await this.getStoryboardAsset(storyboardAssetPath);
      const prompt = storyboard.customFields?.novelVideo?.videoPrompt;
      const sceneImagePath = storyboard.customFields?.novelVideo?.sceneImagePath;

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

      // 4. 更新分镜资产元数据
      // TODO: 添加updateStoryboardVideo方法到AssetHelper

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
      const voiceover = await this.getVoiceoverAsset(voiceoverAssetPath);
      const dialogueText = voiceover.customFields?.novelVideo?.dialogueText;
      const emotion = voiceover.customFields?.novelVideo?.emotion || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

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

      // 3. 更新配音资产元数据
      // TODO: 添加updateVoiceoverAudio方法到AssetHelper

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
   * 获取场景资产（辅助方法）
   */
  private async getSceneAsset(sceneAssetPath: string): Promise<AssetMetadata> {
    // TODO: 通过AssetManager获取元数据
    // 暂时抛出错误，待AssetManager集成
    throw new Error('getSceneAsset not implemented');
  }

  /**
   * 获取角色资产（辅助方法）
   */
  private async getCharacterAsset(characterAssetPath: string): Promise<AssetMetadata> {
    // TODO: 通过AssetManager获取元数据
    throw new Error('getCharacterAsset not implemented');
  }

  /**
   * 获取分镜资产（辅助方法）
   */
  private async getStoryboardAsset(storyboardAssetPath: string): Promise<AssetMetadata> {
    // TODO: 通过AssetManager获取元数据
    throw new Error('getStoryboardAsset not implemented');
  }

  /**
   * 获取配音资产（辅助方法）
   */
  private async getVoiceoverAsset(voiceoverAssetPath: string): Promise<AssetMetadata> {
    // TODO: 通过AssetManager获取元数据
    throw new Error('getVoiceoverAsset not implemented');
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

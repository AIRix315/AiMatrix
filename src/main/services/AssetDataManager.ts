/**
 * AssetDataManager - 物料数据管理服务
 *
 * 功能：
 * - 将工作流生成的物料同步保存到项目文件夹
 * - 从项目文件夹加载物料数据
 * - 支持章节、场景、角色、分镜等物料类型
 *
 * 设计目标：
 * - 实现双重存储：WorkflowState（状态）+ 项目JSON（物料归档）
 * - 随时可退出，项目文件夹保留完整物料
 */

import * as path from 'path';
import type { Logger } from './Logger';
import type { FileSystemService } from './FileSystemService';
import { timeService } from './TimeService';

/**
 * AssetDataManager 类
 */
export class AssetDataManager {
  private logger: Logger;
  private fsService: FileSystemService;

  constructor(logger: Logger, fsService: FileSystemService) {
    this.logger = logger;
    this.fsService = fsService;
  }

  /**
   * 同步物料到项目文件夹
   * @param projectId 项目ID
   * @param flowData 工作流数据
   */
  async syncAssetsToProject(projectId: string, flowData: Record<string, unknown>): Promise<void> {
    await this.logger.info('开始同步物料到项目', 'AssetDataManager', { projectId });

    const timestamp = await timeService.getISOString();

    try {
      // 保存章节数据
      if (flowData.chapters) {
        await this.saveChapters(projectId, flowData.chapters as any, timestamp);
      }

      // 保存场景数据
      if (flowData.scenes) {
        await this.saveScenes(projectId, flowData.scenes as any, timestamp);
      }

      // 保存角色数据
      if (flowData.characters) {
        await this.saveCharacters(projectId, flowData.characters as any, timestamp);
      }

      // 保存场景详情
      if (flowData.sceneDetails) {
        await this.saveSceneDetails(projectId, flowData.sceneDetails as any, timestamp);
      }

      // 保存分镜数据
      if (flowData.storyboards) {
        await this.saveStoryboards(projectId, flowData.storyboards as any, timestamp);
      }

      await this.logger.info('物料同步完成', 'AssetDataManager', { projectId });
    } catch (error) {
      await this.logger.error(
        `物料同步失败: ${error instanceof Error ? error.message : String(error)}`,
        'AssetDataManager',
        { projectId, error }
      );
      throw error;
    }
  }

  /**
   * 保存章节数据
   */
  private async saveChapters(projectId: string, chapters: any[], timestamp: string): Promise<void> {
    const chaptersDir = path.join(this.fsService.getDataDir(), 'projects', projectId, 'chapters');
    await this.fsService.ensureDir(chaptersDir);

    const filePath = path.join(chaptersDir, 'chapters.json');
    await this.fsService.saveJSON(filePath, {
      chapters,
      count: chapters.length,
      updatedAt: timestamp
    });

    await this.logger.debug(`章节数据已保存: ${chapters.length}章`, 'AssetDataManager');
  }

  /**
   * 保存场景数据
   */
  private async saveScenes(projectId: string, scenes: any[], timestamp: string): Promise<void> {
    const scenesDir = path.join(this.fsService.getDataDir(), 'projects', projectId, 'scenes');
    await this.fsService.ensureDir(scenesDir);

    const filePath = path.join(scenesDir, 'scenes.json');
    await this.fsService.saveJSON(filePath, {
      scenes,
      count: scenes.length,
      updatedAt: timestamp
    });

    await this.logger.debug(`场景数据已保存: ${scenes.length}个`, 'AssetDataManager');
  }

  /**
   * 保存角色数据
   */
  private async saveCharacters(projectId: string, characters: any[], timestamp: string): Promise<void> {
    const charactersDir = path.join(this.fsService.getDataDir(), 'projects', projectId, 'characters');
    await this.fsService.ensureDir(charactersDir);

    const filePath = path.join(charactersDir, 'characters.json');
    await this.fsService.saveJSON(filePath, {
      characters,
      count: characters.length,
      updatedAt: timestamp
    });

    await this.logger.debug(`角色数据已保存: ${characters.length}个`, 'AssetDataManager');
  }

  /**
   * 保存场景详情
   */
  private async saveSceneDetails(projectId: string, sceneDetails: any[], timestamp: string): Promise<void> {
    const scenesDir = path.join(this.fsService.getDataDir(), 'projects', projectId, 'scenes');
    await this.fsService.ensureDir(scenesDir);

    const filePath = path.join(scenesDir, 'scene-details.json');
    await this.fsService.saveJSON(filePath, {
      sceneDetails,
      count: sceneDetails.length,
      updatedAt: timestamp
    });

    await this.logger.debug(`场景详情已保存: ${sceneDetails.length}个`, 'AssetDataManager');
  }

  /**
   * 保存分镜数据
   */
  private async saveStoryboards(projectId: string, storyboards: any[], timestamp: string): Promise<void> {
    const storyboardsDir = path.join(this.fsService.getDataDir(), 'projects', projectId, 'storyboards');
    await this.fsService.ensureDir(storyboardsDir);

    const filePath = path.join(storyboardsDir, 'storyboards.json');
    await this.fsService.saveJSON(filePath, {
      storyboards,
      count: storyboards.length,
      updatedAt: timestamp
    });

    await this.logger.debug(`分镜数据已保存: ${storyboards.length}个`, 'AssetDataManager');
  }

  /**
   * 从项目文件夹加载物料数据
   * @param projectId 项目ID
   * @returns 物料数据对象
   */
  async loadAssetsFromProject(projectId: string): Promise<Record<string, unknown>> {
    await this.logger.info('从项目加载物料', 'AssetDataManager', { projectId });

    const projectDir = path.join(this.fsService.getDataDir(), 'projects', projectId);
    const assets: Record<string, unknown> = {};

    try {
      // 加载章节
      const chaptersData = await this.fsService.readJSON<{ chapters: any[] }>(
        path.join(projectDir, 'chapters', 'chapters.json')
      );
      if (chaptersData?.chapters) {
        assets.chapters = chaptersData.chapters;
      }

      // 加载场景
      const scenesData = await this.fsService.readJSON<{ scenes: any[] }>(
        path.join(projectDir, 'scenes', 'scenes.json')
      );
      if (scenesData?.scenes) {
        assets.scenes = scenesData.scenes;
      }

      // 加载角色
      const charactersData = await this.fsService.readJSON<{ characters: any[] }>(
        path.join(projectDir, 'characters', 'characters.json')
      );
      if (charactersData?.characters) {
        assets.characters = charactersData.characters;
      }

      // 加载场景详情
      const sceneDetailsData = await this.fsService.readJSON<{ sceneDetails: any[] }>(
        path.join(projectDir, 'scenes', 'scene-details.json')
      );
      if (sceneDetailsData?.sceneDetails) {
        assets.sceneDetails = sceneDetailsData.sceneDetails;
      }

      // 加载分镜
      const storyboardsData = await this.fsService.readJSON<{ storyboards: any[] }>(
        path.join(projectDir, 'storyboards', 'storyboards.json')
      );
      if (storyboardsData?.storyboards) {
        assets.storyboards = storyboardsData.storyboards;
      }

      await this.logger.info('物料加载完成', 'AssetDataManager', {
        projectId,
        loadedTypes: Object.keys(assets)
      });

      return assets;
    } catch (error) {
      await this.logger.warn(
        `加载物料部分失败: ${error instanceof Error ? error.message : String(error)}`,
        'AssetDataManager',
        { projectId }
      );
      return assets; // 返回已加载的部分数据
    }
  }

  /**
   * 清空项目物料数据
   * @param projectId 项目ID
   */
  async clearProjectAssets(projectId: string): Promise<void> {
    await this.logger.info('清空项目物料', 'AssetDataManager', { projectId });

    const projectDir = path.join(this.fsService.getDataDir(), 'projects', projectId);
    const assetDirs = ['chapters', 'scenes', 'characters', 'storyboards'];

    for (const dir of assetDirs) {
      const dirPath = path.join(projectDir, dir);
      try {
        await this.fsService.deleteDir(dirPath);
        await this.logger.debug(`已清空: ${dir}`, 'AssetDataManager');
      } catch (error) {
        // 忽略不存在的目录
      }
    }

    await this.logger.info('项目物料已清空', 'AssetDataManager', { projectId });
  }
}

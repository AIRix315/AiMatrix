/**
 * AI IPC 处理器
 *
 * 处理渲染进程发送的 AI 相关请求
 */

import { ipcMain } from 'electron';
import type { AIService, SceneCharacterExtractionResult } from '../services/AIService';
import { logger } from '../services/Logger';

/**
 * 注册 AI IPC 处理器
 * @param aiService AIService 服务实例
 */
export function registerAIHandlers(aiService: AIService): void {
  /**
   * 提取场景和角色
   */
  ipcMain.handle(
    'ai:extract-scenes-and-characters',
    async (_, novelText: string): Promise<SceneCharacterExtractionResult> => {
      try {
        await logger.debug(`IPC: ai:extract-scenes-and-characters - textLength=${novelText.length}`, 'ai-handlers');

        const result = await aiService.extractScenesAndCharacters(novelText);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(`IPC: ai:extract-scenes-and-characters 失败: ${errorMessage}`, 'ai-handlers', {
          error
        });

        // 返回错误但不抛出异常，让前端处理
        throw error;
      }
    }
  );

  /**
   * 生成角色 Prompt
   */
  ipcMain.handle(
    'ai:generate-character-prompt',
    async (_, characterName: string, context?: string): Promise<string> => {
      try {
        await logger.debug(
          `IPC: ai:generate-character-prompt - character=${characterName}`,
          'ai-handlers'
        );

        const prompt = await aiService.generateCharacterPrompt(characterName, context);
        return prompt;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(`IPC: ai:generate-character-prompt 失败: ${errorMessage}`, 'ai-handlers', {
          error
        });

        throw error;
      }
    }
  );

  /**
   * 生成场景 Prompt
   */
  ipcMain.handle(
    'ai:generate-scene-prompt',
    async (_, sceneName: string, context?: string): Promise<string> => {
      try {
        await logger.debug(`IPC: ai:generate-scene-prompt - scene=${sceneName}`, 'ai-handlers');

        const prompt = await aiService.generateScenePrompt(sceneName, context);
        return prompt;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(`IPC: ai:generate-scene-prompt 失败: ${errorMessage}`, 'ai-handlers', {
          error
        });

        throw error;
      }
    }
  );

  /**
   * 生成分镜 Prompt
   */
  ipcMain.handle(
    'ai:generate-storyboard-prompt',
    async (
      _,
      params: {
        sceneDescription: string;
        characters: string[];
        characterImages?: Record<string, string>;
        sceneImage?: string;
      }
    ): Promise<string> => {
      try {
        await logger.debug(
          `IPC: ai:generate-storyboard-prompt - charactersCount=${params.characters.length}`,
          'ai-handlers'
        );

        const prompt = await aiService.generateStoryboardPrompt(
          params.sceneDescription,
          params.characters,
          params.characterImages,
          params.sceneImage
        );
        return prompt;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logger.error(
          `IPC: ai:generate-storyboard-prompt 失败: ${errorMessage}`,
          'ai-handlers',
          { error }
        );

        throw error;
      }
    }
  );

  logger.info('AI IPC handlers registered', 'ai-handlers').catch(() => {});
}

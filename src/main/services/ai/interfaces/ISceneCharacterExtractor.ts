/**
 * 场景和角色提取器接口
 */

/**
 * 场景分段
 */
export interface SceneSegment {
  scene: string;
  story: string;
  characters: string[];
}

/**
 * 场景提取结果
 */
export interface SceneExtractResult {
  story: string;
  characters: string[];
  description: string;
  location: string;
  atmosphere: string;
  imagePrompt: string;
  summary: string;
}

/**
 * 角色提取结果
 */
export interface CharacterExtractResult {
  name: string;
  description: string;
  appearance: string;
  imagePrompt: string;
}

/**
 * 场景和角色提取总结果
 */
export interface SceneCharacterExtractResult {
  scenes: SceneExtractResult[];
  characters: CharacterExtractResult[];
  chapterSummary: string;
}

/**
 * 章节接口（简化版）
 */
export interface Chapter {
  id?: string;
  title: string;
  content: string;
}

/**
 * 场景和角色提取器接口
 */
export interface ISceneCharacterExtractor {
  name: string;
  extractScenesAndCharacters(
    chapter: Chapter,
    artStyle?: string
  ): Promise<SceneCharacterExtractResult>;
}

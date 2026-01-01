/**
 * 分镜脚本生成器接口
 */

/**
 * 分镜脚本生成输入
 */
export interface GenerateStoryboardPromptsInput {
  story: string;
  characters: unknown[];
  scene: unknown;
  chapter: unknown;
  artStyle?: string;
}

/**
 * 视频提示词项
 */
export interface VideoPromptItem {
  prompt: string;
  characters?: unknown[];
  scene?: unknown;
  [key: string]: unknown;
}

/**
 * 图片提示词项
 */
export interface ImagePromptItem {
  prompts: string[];
  characters?: unknown[];
  scene?: unknown;
  [key: string]: unknown;
}

/**
 * 分镜脚本生成输出
 */
export interface GenerateStoryboardPromptsOutput {
  videoPrompts: VideoPromptItem[];
  imagePrompts: ImagePromptItem[];
}

/**
 * 分镜脚本生成器接口
 */
export interface IStoryboardScriptGenerator {
  generateScriptScenes(params: { story: string; characters: unknown[]; chapter: unknown }): Promise<any[]>;
  generateVideoPrompts(
    scriptScenes: unknown[],
    characters: unknown[],
    scene: unknown,
    artStyle: string
  ): Promise<any[]>;
  replaceCharacterNames(videoScenes: unknown[], characters: unknown[]): Promise<any[]>;
  generateImageStoryboardPrompts(videoScenes: unknown[], characters: unknown[]): Promise<any[]>;
}

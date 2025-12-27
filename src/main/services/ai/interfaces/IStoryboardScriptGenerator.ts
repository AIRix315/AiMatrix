/**
 * 分镜脚本生成器接口
 */

/**
 * 分镜脚本生成输入
 */
export interface GenerateStoryboardPromptsInput {
  story: string;
  characters: any[];
  scene: any;
  chapter: any;
  artStyle?: string;
}

/**
 * 视频提示词项
 */
export interface VideoPromptItem {
  prompt: string;
  characters?: any[];
  scene?: any;
  [key: string]: any;
}

/**
 * 图片提示词项
 */
export interface ImagePromptItem {
  prompts: string[];
  characters?: any[];
  scene?: any;
  [key: string]: any;
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
  generateScriptScenes(params: { story: string; characters: any[]; chapter: any }): Promise<any[]>;
  generateVideoPrompts(
    scriptScenes: any[],
    characters: any[],
    scene: any,
    artStyle: string
  ): Promise<any[]>;
  replaceCharacterNames(videoScenes: any[], characters: any[]): Promise<any[]>;
  generateImageStoryboardPrompts(videoScenes: any[], characters: any[]): Promise<any[]>;
}

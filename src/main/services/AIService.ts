/**
 * AIService - AI 调用封装服务
 *
 * 功能：
 * - 场景和角色提取
 * - Prompt 生成（角色、场景、分镜）
 * - DeepSeek API 调用
 * - Structured Output 支持
 */

import type { Logger } from './Logger';
import type { APIManager } from './APIManager';

/**
 * 场景角色提取结果
 */
export interface SceneCharacterExtractionResult {
  scenes: string[];
  characters: string[];
  details: Array<{
    scene: string;
    characters: string[];
  }>;
}

/**
 * LLM 调用选项
 */
interface LLMCallOptions {
  model: string;
  responseFormat?: 'json_object' | 'text';
  temperature?: number;
  maxTokens?: number;
}

/**
 * AIService 服务类
 */
export class AIService {
  private logger: Logger;
  private apiManager: APIManager;

  constructor(logger: Logger, apiManager: APIManager) {
    this.logger = logger;
    this.apiManager = apiManager;
  }

  /**
   * 提取场景和角色
   * @param novelText 小说文本
   * @returns 场景和角色信息
   */
  async extractScenesAndCharacters(novelText: string): Promise<SceneCharacterExtractionResult> {
    await this.logger.info('开始提取场景和角色', 'AIService', {
      textLength: novelText.length
    });

    const prompt = `你是一位经验丰富的影视制片人和资源管理专家，擅长分析剧本并识别制作所需的关键物料。
现在你需要将可视化的影视文本进行场景分解，并识别出需要固定形象的物料。

你的任务目标：
将可视化文本按"场景+时间段"的维度进行结构化分解，识别出需要跨章节保持视觉一致性的关键物料（主要角色、场景）。

核心理解：
1. **场景**：指故事发生的地点+时间段，如"办公室-白天"、"咖啡厅-夜晚"
2. **角色**：指在多个场景中出现、需要保持形象一致性的人物（主要角色和次要角色）
3. 同一地点不同时间段算不同场景（如"办公室-白天"和"办公室-夜晚"）

具体规则：
- 场景名称格式：[地点]-[时间段]（例如："办公室-白天"）
- 角色只提取有名字或明确身份的人物（忽略"路人甲"等群众演员）
- 每个场景列出该场景中出现的所有角色
- 如果文本中没有明确时间段，使用"未知时间"

输入文本：
${novelText}

输出格式（必须是有效的JSON）：
{
  "data": [
    {
      "scene": "场景名称（如'办公室-白天'）",
      "characters": ["角色1", "角色2"]
    }
  ]
}`;

    try {
      const response = await this.callLLM(prompt, {
        model: 'deepseek-chat',
        responseFormat: 'json_object',
        temperature: 0.3 // 较低温度保证稳定输出
      });

      const data = JSON.parse(response);

      // 验证响应格式
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('AI 响应格式错误：缺少 data 字段');
      }

      // 提取唯一的场景和角色列表
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scenes = [...new Set(data.data.map((item: any) => item.scene))] as string[];
      const characters = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...new Set(data.data.flatMap((item: any) => item.characters || []))
      ] as string[];

      await this.logger.info('场景和角色提取完成', 'AIService', {
        scenesCount: scenes.length,
        charactersCount: characters.length
      });

      return {
        scenes,
        characters,
        details: data.data
      };
    } catch (error) {
      await this.logger.error(
        `场景角色提取失败: ${error instanceof Error ? error.message : String(error)}`,
        'AIService',
        { error }
      );
      throw error;
    }
  }

  /**
   * 生成角色 Prompt
   * @param characterName 角色名称
   * @param context 上下文信息（角色描述、性格等）
   * @returns 角色图片生成 Prompt
   */
  async generateCharacterPrompt(characterName: string, context?: string): Promise<string> {
    await this.logger.debug(`生成角色 Prompt: ${characterName}`, 'AIService');

    const prompt = `你是一位专业的角色设计师和 AI 绘画 Prompt 工程师。

任务：为角色"${characterName}"生成一个详细的图片生成 Prompt。

${context ? `角色背景信息：\n${context}\n\n` : ''}核心要求：
1. Prompt 必须是英文
2. 包含外貌特征（发型、发色、眼睛、身材、年龄等）
3. 包含服装描述（风格、颜色、配饰）
4. 包含艺术风格（如 anime, realistic, semi-realistic）
5. 包含画质关键词（如 high quality, detailed, 4k）
6. 使用逗号分隔各个描述词
7. 长度控制在 150 词以内

示例输出：
"young woman, long black hair, bright blue eyes, elegant dress, red scarf, anime style, high quality, detailed face, full body portrait, white background, studio lighting, 4k"

请直接输出 Prompt，不要包含任何解释或额外文字：`;

    try {
      const response = await this.callLLM(prompt, {
        model: 'deepseek-chat',
        responseFormat: 'text',
        temperature: 0.7
      });

      // 清理响应（移除可能的引号和多余空格）
      const cleanedPrompt = response.trim().replace(/^["']|["']$/g, '');

      await this.logger.debug(`角色 Prompt 生成完成: ${cleanedPrompt.substring(0, 50)}...`, 'AIService');

      return cleanedPrompt;
    } catch (error) {
      await this.logger.error(
        `角色 Prompt 生成失败: ${error instanceof Error ? error.message : String(error)}`,
        'AIService',
        { error }
      );
      throw error;
    }
  }

  /**
   * 生成场景 Prompt
   * @param sceneName 场景名称
   * @param context 上下文信息（场景描述、氛围等）
   * @returns 场景图片生成 Prompt
   */
  async generateScenePrompt(sceneName: string, context?: string): Promise<string> {
    await this.logger.debug(`生成场景 Prompt: ${sceneName}`, 'AIService');

    const prompt = `你是一位专业的场景设计师和 AI 绘画 Prompt 工程师。

任务：为场景"${sceneName}"生成一个详细的图片生成 Prompt。

${context ? `场景背景信息：\n${context}\n\n` : ''}核心要求：
1. Prompt 必须是英文
2. 包含环境描述（室内/室外、建筑风格、装饰等）
3. 包含光照描述（白天/夜晚、光线效果）
4. 包含氛围描述（安静、忙碌、神秘等）
5. 包含艺术风格（如 photorealistic, anime background, concept art）
6. 包含画质关键词（如 high quality, detailed, 8k）
7. 使用逗号分隔各个描述词
8. 长度控制在 150 词以内

示例输出：
"modern office interior, large windows, city view, daylight, wooden desk, comfortable chairs, plants, clean and organized, professional atmosphere, photorealistic, high quality, detailed, 8k, wide angle"

请直接输出 Prompt，不要包含任何解释或额外文字：`;

    try {
      const response = await this.callLLM(prompt, {
        model: 'deepseek-chat',
        responseFormat: 'text',
        temperature: 0.7
      });

      const cleanedPrompt = response.trim().replace(/^["']|["']$/g, '');

      await this.logger.debug(`场景 Prompt 生成完成: ${cleanedPrompt.substring(0, 50)}...`, 'AIService');

      return cleanedPrompt;
    } catch (error) {
      await this.logger.error(
        `场景 Prompt 生成失败: ${error instanceof Error ? error.message : String(error)}`,
        'AIService',
        { error }
      );
      throw error;
    }
  }

  /**
   * 生成分镜 Prompt
   * @param sceneDescription 场景描述
   * @param characters 出现的角色列表
   * @param characterImages 角色图片路径（可选）
   * @param sceneImage 场景图片路径（可选）
   * @returns 分镜图片生成 Prompt
   */
  async generateStoryboardPrompt(
    sceneDescription: string,
    characters: string[],
    characterImages?: Record<string, string>,
    sceneImage?: string
  ): Promise<string> {
    await this.logger.debug('生成分镜 Prompt', 'AIService', {
      charactersCount: characters.length
    });

    const characterList = characters.length > 0 ? characters.join('、') : '无';
    const hasImages =
      (characterImages && Object.keys(characterImages).length > 0) || sceneImage;

    const prompt = `你是一位专业的分镜设计师和 AI 绘画 Prompt 工程师。

任务：为以下场景生成一个详细的分镜图片 Prompt。

场景描述：
${sceneDescription}

出现角色：${characterList}

${hasImages ? '注意：已有角色和场景的参考图片，需要保持风格一致。\n\n' : ''}核心要求：
1. Prompt 必须是英文
2. 描述角色的动作、表情、位置关系
3. 描述场景的构图、视角（如 close-up, medium shot, wide shot）
4. 描述光影效果和氛围
5. 包含艺术风格和画质关键词
6. 使用逗号分隔各个描述词
7. 长度控制在 200 词以内

示例输出：
"medium shot, young woman standing by the window, looking outside, thoughtful expression, modern office interior, daylight streaming through window, warm lighting, cinematic composition, anime style, high quality, detailed, 4k"

请直接输出 Prompt，不要包含任何解释或额外文字：`;

    try {
      const response = await this.callLLM(prompt, {
        model: 'deepseek-chat',
        responseFormat: 'text',
        temperature: 0.8 // 稍高温度增加创意
      });

      const cleanedPrompt = response.trim().replace(/^["']|["']$/g, '');

      await this.logger.debug(`分镜 Prompt 生成完成: ${cleanedPrompt.substring(0, 50)}...`, 'AIService');

      return cleanedPrompt;
    } catch (error) {
      await this.logger.error(
        `分镜 Prompt 生成失败: ${error instanceof Error ? error.message : String(error)}`,
        'AIService',
        { error }
      );
      throw error;
    }
  }

  /**
   * 调用 LLM（DeepSeek API）
   * @param prompt 提示词
   * @param options 调用选项
   * @returns LLM 响应内容
   */
  private async callLLM(prompt: string, options: LLMCallOptions): Promise<string> {
    // 从 APIManager 获取 DeepSeek Provider 配置
    const provider = await this.apiManager.getProvider('deepseek');

    if (!provider || !provider.apiKey) {
      throw new Error('DeepSeek API Key 未配置，请在设置中配置 DeepSeek Provider');
    }

    const apiKey = provider.apiKey;

    await this.logger.debug('调用 DeepSeek API', 'AIService', {
      model: options.model,
      promptLength: prompt.length,
      responseFormat: options.responseFormat
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestBody: any = {
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7
      };

      // 添加响应格式配置（仅当指定为 json_object 时）
      if (options.responseFormat === 'json_object') {
        requestBody.response_format = { type: 'json_object' };
      }

      // 添加 max_tokens 配置
      if (options.maxTokens) {
        requestBody.max_tokens = options.maxTokens;
      }

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API 请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('DeepSeek API 响应格式错误：缺少 choices');
      }

      const content = data.choices[0].message.content;

      await this.logger.debug('DeepSeek API 调用成功', 'AIService', {
        responseLength: content.length,
        usage: data.usage
      });

      return content;
    } catch (error) {
      await this.logger.error(
        `DeepSeek API 调用失败: ${error instanceof Error ? error.message : String(error)}`,
        'AIService',
        { error }
      );
      throw error;
    }
  }
}

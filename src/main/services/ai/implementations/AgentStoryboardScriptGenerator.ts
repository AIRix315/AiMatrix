/**
 * 基于 Agent 的分镜脚本生成器
 *
 * 使用 LLM Agent 智能生成图片分镜和视频分镜的 Prompt
 */

import type {
  IStoryboardScriptGenerator,
  VideoPromptItem,
  ImagePromptItem,
  GenerateStoryboardPromptsInput,
  GenerateStoryboardPromptsOutput
} from '../interfaces/IStoryboardScriptGenerator'
import { LangChainAgent } from '../../../agent/LangChainAgent'
import { z } from '../../../agent/types'

/**
 * Agent配置获取函数类型
 */
export interface StoryboardGeneratorConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 基于 Agent 的分镜脚本生成器实现
 */
export class AgentStoryboardScriptGenerator implements IStoryboardScriptGenerator {
  private agent: LangChainAgent | null = null;
  private getConfig: () => Promise<StoryboardGeneratorConfig>;

  /**
   * 第四步：生成图片分镜描述的提示词模板
   */
  private readonly IMAGE_STORYBOARD_GENERATION_TEMPLATE = `# Role
你是一位世界顶级的**漫画/分镜原画师**。你的任务是将一段"动态的视频拍摄脚本"转化为一组**"静态的漫画分镜绘画提示词(Prompts)"**。

# Input Data
1. **分镜描述数据:** {{data}}
2. **角色名称字典:** {{characterList}}

# Task Logic (核心处理逻辑)
你需要遍历每个场景，解析其中的 \`cinematography\` 文本，将其拆解为对应的 2-4 个子分镜，并为每个子分镜生成一段**流畅、自然的描述性提示词**。

### 关键转化规则 (必须严格遵守)

**1. 降维：从"时间流"到"关键帧" (反鬼影机制)**
视频脚本包含连续动作（时间流），而绘画只能表现瞬间（空间）。
*   **强制切片：** 你必须将连续动作切断，只选择**单一瞬间**进行描绘（如动作的起始帧 OR 结束帧）。
*   **禁用词汇：** 在生成的 Prompt 中，**严禁出现**表示时间流逝的连接词，如：“然后(then)”、“接着(after)”、“开始(starts to)”、“过程中(process of)”。
*   *Bad:* 李明从床上坐起，然后走向门口。（导致画面重影）
*   *Good:* 李明正坐在床边，身体微微前倾，呈现出准备站起的姿态。
*   *Good:* 李明走向门口的背影，手正伸向门把手。

**2. 运镜转构图 (Motion to Composition)**
视频运镜指令在绘图时无效，必须转换为静态构图描述：
*   **摇摄 (Pan):** 转化为 **"Wide angle shot" (广角)** 或 **"Panorama" (全景)**，强调场景的左右延伸感。
*   **推镜头 (Zoom In):** 转化为 **"Close-up" (特写)**，强调主体细节，背景虚化。
*   **跟拍 (Tracking):** 转化为 **"Dynamic angle" (动态视角)** 或 **"Side view" (侧视图)**，强调运动感。

**3. 零气泡策略 (Textless Strategy)**
*   如果原描述中 \`[台词]\` 为空或无：**严禁**在描述中提及"对话"、"气泡"或"说话"等词。并请在描述的末尾显式添加一句："这是一个无对白的纯画面分镜，画面中没有气泡和文字。"
*   只有当原描述明确有台词时，才允许描述："角色的台词以气泡形式展示，内容为：..."。

**4. 视觉一致性 (Visual Consistency)**
*   必须保留原描述中的**光影设定**（如"暖金色调"、"轮廓光"）和**环境细节**，将其自然地融入到画面描述中。

# Output Format
请输出一个 JSON 数组，结构如下：

\`\`\`json
[
  {
    "scene_index": 1,
    "character_ids": ["对应字典中的ID"],
    "panels": [
      {
        "panel_id": 1,
        "image_prompt": "场景是温馨的现代卧室，清晨阳光透过薄窗帘缝隙洒入，形成明显的丁达尔效应光柱。画面采用24mm广角的全景构图。光影呈现全局暖金色调，高调照明营造出清晨的氛围。画面定格在李明躺在床上的瞬间，被子盖到胸口，他正处于平静的睡眠呼吸状态。这是一个无对白的纯画面分镜，画面中没有气泡和文字。"
      },
      {
        "panel_id": 2,
        "image_prompt": "..."
      }
    ]
  }
]
\`\`\`

请开始执行`

  /**
   * 第三步：替换角色名称为 soraName 和 appearance 的提示词模板
   */
  private readonly CHARACTER_REPLACEMENT_TEMPLATE = `你是一个有30年经验的视频脚本校对专家，你的任务是根据我的要求，根据实际语义完成文本替换，我会给你一份已有的结构化的视频分镜脚本，和一份角色设定词典，具体要求如下：

1. 视频分镜脚本中，每个元素包含scene、sfx、cinematography字段，每个字段中都可能包含角色，角色名称与'角色设定词典'中的name字段是一致的，你可以从name字段中找到角色映射关系。

2. 识别脚本中的每个角色，并将每个角色的名称做文本替换，规则如下：
- 除台词外，涉及到出场人物的，全部替换为"角色设定词典"中的alias字段，并加上'@'。例如：原文是'张三正在吃饭'，characters中有"张三"。则去找"角色设定词典"中name为"张三"，找到它对应的alias字段，假设alias为'ouipqw'，则替换为' @ouipqw 正在吃饭'。要注意！在'@alias'前后必须要加一个空格符！这是硬性规定，必须遵守。
- 属于台词的，要将台词的"说话人"，替换为 (角色描述)，角色描述使用"角色设定词典"中的appearance字段。例如：原文是'李四开心的说:你好啊'，假设'李四'对应的appearance为'穿着黑色西服的男人'，则要替换为'（穿着黑色西服的男人）开心的说:你好啊'

已有的结构化的视频分镜脚本如下：
{{scripts}}

角色字段如下：
{{characterList}}

以JSON格式化输出，输出字段和原始数据保持一致。`

  /**
   * 第二步：生成Sora2结构的视频提示词模板
   */
  private readonly VIDEO_PROMPT_GENERATION_TEMPLATE = `# Role
你是一位精通Sora 2架构的**虚拟摄影指导(DP)**与**提示词工程师**。
你的核心任务是：将接收到的【结构化分镜脚本】（Step 1 Output），翻译成**高精度、技术化**的Sora 2生成参数。

# Input Data
1. **分镜脚本数据 (Script Data):** {{scriptScenes}}
   *(含场景及子镜头描述)*
2. **角色引用表 (Reference):** {{characters}}
   *(确保角色名称准确)*
3. **艺术风格 (Art Style):** {{artStyle}}

# Transformation Logic (处理逻辑)
遍历输入数组的每个场景，转化为Sora 2标准JSON结构。

1.  **镜头映射 (Shot Mapping):**
    严格映射 Step 1 的 \`shots\` 到输出的 \`分镜N\`。
    *   Input Shot 1 -> Output 分镜1
    *   Input Shot 2 -> Output 分镜2
    *   **严禁**合并、拆分镜头或修改 \`duration\`。

2.  **技术参数化注入 (Technical Injection):**
    使用专业术语增强质感。
    *   **运镜术语：** 摇摄(Pan)、倾斜(Tilt)、推拉(Dolly In/Out)、跟拍(Tracking)、手持运镜(Handheld)。
    *   **光影术语：** 体积光(Volumetric lighting)、轮廓光(Rim light)、伦勃朗光(Rembrandt lighting)、丁达尔效应(Tyndall effect)。
    *   **镜头术语：** 广角(14mm-24mm)、标准(35mm-50mm)、特写(85mm-100mm)、浅景深(Shallow depth of field)。

3.  **动作细化 (Action Refinement):**
    将简略动作转化为物理细节描述。
    *   **关键约束：** 绝对**不要**描述角色的外貌（发型、衣着等）。只描述动作、表情和光影交互。

# Critical Constraints (关键约束)
1.  **色调绝对一致性 (Strict Color Consistency):**
    在一个场景（Scene）内部，所有分镜（分镜1、分镜2...）必须共享同一套**主色调与光影逻辑**。
    *   *Bad:* 分镜1是暖黄晨光，分镜2变成了冷蓝荧光。
    *   *Good:* 分镜1是暖黄晨光，分镜2依然是暖调，仅因角度变化产生阴影差异。
2.  **零外貌描述：** 严禁出现关于角色衣服、发型、身高的描述。
3.  **台词严格匹配：** 逐字保留原台词，不得修改。
4.  **时长守恒：** 确保 \`cinematography\` 中所有分镜的持续时间相加严格等于 10。

# Output Format (Sora 2 Standard)
请输出一个标准 JSON 数组，每个元素必须严格符合以下结构：

\`\`\`json
{
  "scene": "场景环境描述（仅环境与天气，不含人）。例如：温馨的现代卧室，清晨阳光透过薄窗帘洒入，空气中漂浮着尘埃微粒。",
  "style": "{{artStyle}}",
  "mood": "情绪基调。例如：紧张但充满希望",
  "sfx": "环境音效。例如：清脆的鸟叫声、闹钟的滴答声",
  "cinematography": "分镜1：[镜头参数]（例如：特写镜头，85mm焦段）。[光影色调]（例如：**全局暖色调**，晨光金色光泽，高调照明）。[动作]（例如：李明猛地睁开眼睛）。[台词]（若有：角色名: 台词内容）。持续时间：3秒\n\n分镜2：[镜头参数]（例如：中景，35mm焦段）。[光影色调]（例如：**延续暖色调**，侧逆光增强轮廓）。[动作]（例如：李明从床上坐起）。[台词]（若有：角色名: 台词内容）。持续时间：7秒"
}
\`\`\`

--------------------------------

请开始执行`

  /**
   * 第一步：生成剧本分镜描述的提示词模板
   */
  private readonly SCRIPT_GENERATION_PROMPT_TEMPLATE = `# Role
你是一位精通Sora 2视频生成的动画分镜导演。你的任务是将一段小说文本转化为一系列**10秒的标准视频生成单元**。

# Context Inputs (关键上下文)
1. **全局故事摘要 (Global Context):**
   {{globalSummary}}

2. **前情提要 (Previous Context - 摘要):**
   {{previousSummary}}

3. **当前处理文本 (Current Text):**
   {{story}}

4. **后续情节预告 (Next Context - 简述):**
   {{nextSummary}}

5. **当前在场角色 (Active Characters):**
   {{characters}}

# Task & Logic
根据【当前处理文本】，设计**一个或多个**10秒的视频片段。
*   **如果文本很短**（如仅一个动作）：扩展细节，生成 1 个 10秒片段。
*   **如果文本很长**（如长对话）：按时间线拆分，生成 N 个 10秒片段（id: 1, id: 2...），确保覆盖所有剧情。

# Constraints (Sora 2 专用)
1.  **时间容器：** 每个输出对象必须对应一段 **10秒** 的视频。
2.  **子镜头结构 (Sub-shots)：** 在这10秒内，必须包含 **2-3个连续的子镜头**。利用景别变化（特写/全景）来丰富视觉，避免单调。
3.  **边界控制：** 严禁生成【后续情节预告】中的内容。
4.  **无旁白：** 将心理活动转化为微表情、肢体动作。

# Output Format (JSON Array)
输出一个JSON数组。如果当前文本需要生成30秒的视频才能讲完，数组里就应该有3个元素。

示例格式：
[
  {
    "duration": "10s",
    "text_covered": "对应的原文片段（方便我核对）",
    "visual_summary": "李明在洗手间洗脸并注视镜子",
    "shots": [
      "镜头1 (3s): [特写] 水龙头打开，清澈的冷水哗啦流出，李明双手接水。",
      "镜头2 (4s): [正面中景] 李明把冷水泼在脸上，水珠飞溅，随后他抬起头看着镜子，神情逐渐聚焦。",
      "镜头3 (3s): [眼部特写] 镜子中李明的眼神，从原本的游移不定变得锐利，瞳孔中倒映着洗手间的灯光。"
    ]
  }
]`

  constructor(getConfig: () => Promise<StoryboardGeneratorConfig>) {
    this.getConfig = getConfig;
  }

  /**
   * 初始化或获取 agent 实例（延迟初始化，实时读取配置）
   */
  private async ensureAgent(): Promise<LangChainAgent> {
    // 每次都重新读取配置以确保使用最新的配置
    const config = await this.getConfig();

    // 创建新的 LangChain agent（使用最新配置）
    this.agent = new LangChainAgent({
      apiKey: config.apiKey,
      model: config.model || 'gpt-4',
      baseURL: config.baseURL,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });

    return this.agent;
  }

  /**
   * 第四步：生成图片分镜描述
   * 根据视频分镜生成专业的漫画分镜 prompt
   */
  async generateImageStoryboardPrompts(
    videoScenesData: Array<{
      scene: string
      style: string
      mood: string
      sfx: string
      cinematography: string
    }>,
    characters: GenerateStoryboardPromptsInput['characters']
  ): Promise<
    Array<{
      prompts: string[]
      character_ids: string[]
    }>
  > {
    // logger.debug('\n========== Step 4: 生成图片分镜描述 开始 ==========')

    // 构建分镜描述文本
    const dataText = videoScenesData
      .map(
        (sceneData, index) => `场景${index + 1}: ${sceneData.scene}\n${sceneData.cinematography}\n`
      )
      .join('\n')

    // 构建角色名称字典（只包含 name 和 id）
    const characterListText = JSON.stringify(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      characters.map((char: any) => ({
        name: char.name,
        id: char.id
      })),
      null,
      2
    )

    // 构建提示词
    const prompt = this.IMAGE_STORYBOARD_GENERATION_TEMPLATE.replace('{{data}}', dataText).replace(
      '{{characterList}}',
      characterListText
    )

    // logger.debug('[Step 4] 使用模型: deepseek-chat')
    // logger.debug('[Step 4] 输入场景数量:', videoScenesData.length)
    // logger.debug('[Step 4] 填充后的提示词:')
    // logger.debug('-------------------------------------------')
    // logger.debug(prompt)
    // logger.debug('-------------------------------------------')

    // 定义输出 Schema（使用 Zod）
    const PanelSchema = z.object({
      panel_id: z.number().describe('分镜ID'),
      image_prompt: z.string().describe('该分镜的绘画提示词')
    })

    const ImageSceneSchema = z.object({
      scenes: z.array(
        z.object({
          scene_index: z.number().describe('场景索引'),
          character_ids: z.array(z.string()).describe('该场景中出场的角色ID数组'),
          panels: z.array(PanelSchema).describe('该场景的分镜面板数组')
        })
      )
    })

    type ImageSceneOutput = z.infer<typeof ImageSceneSchema>

    // logger.debug('[Step 4] 开始调用 Agent...')

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用结构化输出 Agent
    const result = await agent.structuredOutput<ImageSceneOutput>(prompt, ImageSceneSchema, {
      maxRetries: 3,
      timeout: 300000, // 5分钟超时
      temperature: 0.7 // 使用中等温度保持创意性
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      // eslint-disable-next-line no-console
      console.error('[Step 4] 失败:', error.message, '(类型:', error.type, ')')
      throw new Error(`图片分镜生成失败: ${error.message} (类型: ${error.type})`)
    }

    const rawScenes = result.data!.scenes

    // logger.debug('[Step 4] Agent 返回结果:')
    // logger.debug('-------------------------------------------')
    // logger.debug(JSON.stringify(rawScenes, null, 2))
    // logger.debug('-------------------------------------------')

    // 转换为旧格式: 将 panels 数组转换为 prompts 字符串数组
    const imageScenes = rawScenes.map((scene) => ({
      prompts: scene.panels.map((panel) => panel.image_prompt),
      character_ids: scene.character_ids
    }))

    // logger.debug('[Step 4] 转换后的结果:')
    // logger.debug('-------------------------------------------')
    // logger.debug(JSON.stringify(imageScenes, null, 2))
    // logger.debug('-------------------------------------------')
    // logger.debug(
    //   `[Step 4] 成功！共 ${imageScenes.length} 个场景，耗时 ${result.metadata.duration}ms`
    // )
    // logger.debug('========== Step 4: 生成图片分镜描述 完成 ==========\n')

    return imageScenes
  }

  /**
   * 第三步：替换角色名称为 soraName 和 appearance
   * 将脚本中的角色名称替换为 @soraName 格式，台词说话人替换为 appearance
   */
  async replaceCharacterNames(
    videoScenesData: Array<{
      scene: string
      style: string
      mood: string
      sfx: string
      cinematography: string
    }>,
    characters: GenerateStoryboardPromptsInput['characters']
  ): Promise<
    Array<{
      scene: string
      sfx: string
      cinematography: string
    }>
  > {
    // logger.debug('\n========== Step 3: 替换角色名称 开始 ==========')

    // 构建视频分镜脚本文本（只包含 scene, sfx, cinematography）
    const scriptsText = JSON.stringify(
      videoScenesData.map((sceneData) => ({
        scene: sceneData.scene,
        sfx: sceneData.sfx,
        cinematography: sceneData.cinematography
      })),
      null,
      2
    )

    // 构建角色字典文本（只包含 name, soraName, appearance）
    const characterListText = JSON.stringify(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      characters.map((char: any) => ({
        name: char.name,
        alias: char.soraName,
        appearance: char.appearance
      })),
      null,
      2
    )

    // 构建提示词
    const prompt = this.CHARACTER_REPLACEMENT_TEMPLATE.replace('{{scripts}}', scriptsText).replace(
      '{{characterList}}',
      characterListText
    )

    // logger.debug('[Step 3] 使用模型: deepseek-chat')
    // logger.debug('[Step 3] 输入场景数量:', videoScenesData.length)
    // logger.debug('[Step 3] 填充后的提示词:')
    // logger.debug('-------------------------------------------')
    // logger.debug(prompt)
    // logger.debug('-------------------------------------------')

    // 定义输出 Schema（使用 Zod）
    const ReplacedSceneSchema = z.object({
      scenes: z.array(
        z.object({
          scene: z.string().describe('场景描述（角色名已替换）'),
          sfx: z.string().describe('背景音效描述（角色名已替换）'),
          cinematography: z.string().describe('摄影分镜描述（角色名已替换）')
        })
      )
    })

    type ReplacedSceneOutput = z.infer<typeof ReplacedSceneSchema>

    // logger.debug('[Step 3] 开始调用 Agent...')

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用结构化输出 Agent
    const result = await agent.structuredOutput<ReplacedSceneOutput>(prompt, ReplacedSceneSchema, {
      maxRetries: 3,
      timeout: 300000, // 5分钟超时
      temperature: 0.3 // 使用较低温度以确保准确性
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      // eslint-disable-next-line no-console
      console.error('[Step 3] 失败:', error.message, '(类型:', error.type, ')')
      throw new Error(`角色名称替换失败: ${error.message} (类型: ${error.type})`)
    }

    const replacedScenes = result.data!.scenes

    // logger.debug('[Step 3] Agent 返回结果:')
    // logger.debug('-------------------------------------------')
    // logger.debug(JSON.stringify(replacedScenes, null, 2))
    // logger.debug('-------------------------------------------')
    // logger.debug(
    //   `[Step 3] 成功！共 ${replacedScenes.length} 个场景，耗时 ${result.metadata.duration}ms`
    // )
    // logger.debug('========== Step 3: 替换角色名称 完成 ==========\n')

    return replacedScenes
  }

  /**
   * 第二步：生成Sora2结构的视频提示词
   */
  async generateVideoPrompts(
    scriptScenes: string[],
    characters: GenerateStoryboardPromptsInput['characters'],
    _scene: GenerateStoryboardPromptsInput['scene'],
    artStyle: string
  ): Promise<
    Array<{
      scene: string
      style: string
      mood: string
      sfx: string
      cinematography: string
    }>
  > {
    // logger.debug('\n========== Step 2: 生成Sora2视频提示词 开始 ==========')

    // 构建场景分镜剧本文本
    const scriptScenesText = scriptScenes
      .map((sceneText, index) => `场景${index + 1}：${sceneText}`)
      .join('\n\n')

    // 构建角色设定文本
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charactersText = characters.map((char: any) => `${char.name}：${char.description}`).join('\n')

    // 构建提示词
    const prompt = this.VIDEO_PROMPT_GENERATION_TEMPLATE.replace('{{artStyle}}', artStyle)
      .replace('{{scriptScenes}}', scriptScenesText)
      .replace('{{characters}}', charactersText)

    // logger.debug('[Step 2] 使用模型: deepseek-chat')
    // logger.debug('[Step 2] 输入场景数量:', scriptScenes.length)
    // logger.debug('[Step 2] 填充后的提示词:')
    // logger.debug('-------------------------------------------')
    // logger.debug(prompt)
    // logger.debug('-------------------------------------------')

    // 定义输出 Schema（使用 Zod）
    const VideoSceneSchema = z.object({
      scenes: z.array(
        z.object({
          scene: z.string().describe('场景环境描述（仅环境与天气，不含人）'),
          style: z.string().describe('艺术风格'),
          mood: z.string().describe('情绪基调'),
          sfx: z.string().describe('环境音效'),
          cinematography: z.string().describe('摄影分镜描述，包含多个分镜的详细信息')
        })
      )
    })

    type VideoSceneOutput = z.infer<typeof VideoSceneSchema>

    // logger.debug('[Step 2] 开始调用 Agent...')

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用结构化输出 Agent
    const result = await agent.structuredOutput<VideoSceneOutput>(prompt, VideoSceneSchema, {
      maxRetries: 3,
      timeout: 300000, // 5分钟超时（因为生成内容较多）
      temperature: 0.7
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      // eslint-disable-next-line no-console
      console.error('[Step 2] 失败:', error.message, '(类型:', error.type, ')')
      throw new Error(`视频提示词生成失败: ${error.message} (类型: ${error.type})`)
    }

    const videoScenes = result.data!.scenes

    // logger.debug('[Step 2] Agent 返回结果:')
    // logger.debug('-------------------------------------------')
    // logger.debug(JSON.stringify(videoScenes, null, 2))
    // logger.debug('-------------------------------------------')
    // logger.debug(
    //   `[Step 2] 成功！共 ${videoScenes.length} 个场景，耗时 ${result.metadata.duration}ms`
    // )
    // logger.debug('========== Step 2: 生成Sora2视频提示词 完成 ==========\n')

    return videoScenes
  }

  /**
   * 第一步：生成剧本分镜描述
   * 将故事拆分为多个10秒的短场景描述
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateScriptScenes(params: { story: string; characters: any[]; chapter: any }): Promise<any[]> {
    // logger.debug('\n========== Step 1: 生成剧本分镜描述 开始 ==========')

    const { characters, story, chapter } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevScene: any = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextScene: any = undefined;

    // 构建角色设定文本（仅列出name和description）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charactersText = characters.map((char: any) => `${char.name}：${char.description}`).join('\n')

    // 获取上下文信息
    const globalSummary = chapter?.summary || '（暂无全局摘要）'
    const previousSummary = prevScene?.summary
      ? `${prevScene.summary}`
      : '（当前是第一个场景，无前情提要）'
    const nextSummary = nextScene?.summary || '（暂无后续情节预告）'

    // logger.debug('[Step 1] 上下文信息:')
    // logger.debug('  - 全局摘要:', globalSummary)
    // logger.debug('  - 前情提要:', previousSummary)
    // logger.debug('  - 后续预告:', nextSummary)

    // 构建提示词
    const prompt = this.SCRIPT_GENERATION_PROMPT_TEMPLATE.replace(
      '{{globalSummary}}',
      globalSummary
    )
      .replace('{{previousSummary}}', previousSummary)
      .replace('{{story}}', story)
      .replace('{{nextSummary}}', nextSummary)
      .replace('{{characters}}', charactersText)

    // logger.debug('[Step 1] 使用模型: deepseek-chat')
    // logger.debug('[Step 1] 填充后的提示词:')
    // logger.debug('-------------------------------------------')
    // logger.debug(prompt)
    // logger.debug('-------------------------------------------')

    // 定义输出 Schema（使用 Zod）
    const VideoSegmentSchema = z.object({
      duration: z.string().describe('视频片段时长，固定为"10s"'),
      text_covered: z.string().describe('对应的原文片段'),
      visual_summary: z.string().describe('视觉概要描述'),
      shots: z.array(z.string()).describe('子镜头描述数组，包含2-3个镜头')
    })

    const ScriptSceneSchema = z.object({
      segments: z.array(VideoSegmentSchema).describe('视频片段数组，每个元素是一个10秒的视频片段')
    })

    type ScriptSceneOutput = z.infer<typeof ScriptSceneSchema>

    // logger.debug('[Step 1] 开始调用 Agent...')

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用结构化输出 Agent
    const result = await agent.structuredOutput<ScriptSceneOutput>(prompt, ScriptSceneSchema, {
      maxRetries: 3,
      timeout: 180000, // 3分钟超时
      temperature: 0.7 // 使用较高温度以增加创意性
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      // eslint-disable-next-line no-console
      console.error('[Step 1] 失败:', error.message, '(类型:', error.type, ')')
      throw new Error(`剧本生成失败: ${error.message} (类型: ${error.type})`)
    }

    const segments = result.data!.segments

    // logger.debug('[Step 1] Agent 返回结果:')
    // logger.debug('-------------------------------------------')
    // logger.debug(JSON.stringify(segments, null, 2))
    // logger.debug('-------------------------------------------')
    // logger.debug(`[Step 1] 成功！共 ${segments.length} 个片段，耗时 ${result.metadata.duration}ms`)
    // logger.debug('========== Step 1: 生成剧本分镜描述 完成 ==========\n')

    // 将新格式转换为旧格式（string[]）以保持兼容性
    // 每个segment转换为一个描述性字符串
    const scenes = segments.map((segment) => {
      const shotsText = segment.shots.join('\n')
      return `${segment.visual_summary}\n\n${shotsText}`
    })

    return scenes
  }

  /**
   * 生成分镜 Prompts
   */
  async generateStoryboardPrompts(
    input: GenerateStoryboardPromptsInput
  ): Promise<GenerateStoryboardPromptsOutput> {
    const { scene, characters, artStyle = '现代动漫风格' } = input

    // logger.debug('\n')
    // logger.debug('='.repeat(80))
    // logger.debug('开始生成分镜 Prompts'.padStart(45))
    // logger.debug('='.repeat(80))
    // logger.debug('输入参数:')
    // logger.debug('  - 场景ID: ', scene.id)
    // logger.debug('  - 场景位置: ', scene.location)
    // logger.debug('  - 角色数量: ', characters.length)
    // logger.debug('  - 故事长度: ', input.story.length, '字符')
    // logger.debug('  - 艺术风格: ', artStyle)
    // logger.debug('='.repeat(80))

    // 使用传入的艺术风格（已有默认值）
    const finalArtStyle = artStyle

    // Step 1: 生成剧本分镜描述
    const scriptScenes = await this.generateScriptScenes(input)

    // Step 2: 生成视频 Prompts
    const videoScenesData = await this.generateVideoPrompts(
      scriptScenes,
      characters,
      scene,
      finalArtStyle
    )
    // Step 3 和 Step 4: 并行执行（无依赖关系）
    const [replacedScenes, imageScenes] = await Promise.all([
      this.replaceCharacterNames(videoScenesData, characters),
      this.generateImageStoryboardPrompts(videoScenesData, characters)
    ])

    // logger.debug('\n========== 组装最终输出 ==========')

    // 将处理后的数据转换为最终格式
    const videoPrompts: VideoPromptItem[] = replacedScenes.map((replacedScene, index) => {
      // 获取对应的原始场景数据（用于获取 style 和 mood）
      const originalScene = videoScenesData[index]

      // 组合完整的 prompt（使用替换后的 scene, sfx, cinematography）
      const prompt = `场景描述(scene)：${replacedScene.scene}\n\n风格(style)：${originalScene.style}\n\n氛围(mood)：${originalScene.mood}\n\n背景音效(sfx)：${replacedScene.sfx}\n\n摄影(cinematography)：\n${replacedScene.cinematography}`

      return {
        prompt,
        characters,
        scene
      }
    })

    // logger.debug('[组装] 视频 Prompts 数量:', videoPrompts.length)

    // 生成图片 Prompts（使用 Step 4 的结果）
    const imagePrompts: ImagePromptItem[] = imageScenes.map((imageScene, _index) => {
      // 根据 character_ids 筛选出该场景中实际出场的角色
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sceneCharacters = characters.filter((char: any) =>
        imageScene.character_ids.includes(char.id)
      )

      // logger.debug(
      //   `[组装] 场景 ${index + 1}: ${imageScene.prompts.length} 个图片 prompt, ${sceneCharacters.length} 个出场角色 (IDs: ${imageScene.character_ids.join(', ')})`
      // )

      return {
        prompts: imageScene.prompts,
        characters: sceneCharacters,
        scene
      }
    })

    // logger.debug('[组装] 图片 Prompts 数量:', imagePrompts.length)

    // logger.debug('\n')
    // logger.debug('='.repeat(80))
    // logger.debug('分镜 Prompts 生成完成！'.padStart(45))
    // logger.debug(`总结: 视频 ${videoPrompts.length} 个，图片 ${imagePrompts.length} 个`.padStart(50))
    // logger.debug('='.repeat(80))
    // logger.debug('\n')

    return {
      videoPrompts,
      imagePrompts
    }
  }
}

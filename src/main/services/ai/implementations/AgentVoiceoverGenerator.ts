/**
 * 基于 Agent 的配音生成器
 *
 * 使用 LLM Agent 智能识别台词、分析情绪
 * 注意：此实现仅负责台词提取和情绪分析，不包含实际的TTS调用
 */

import type {
  IVoiceoverGenerator,
  GenerateVoiceoverInput,
  GenerateVoiceoverOutput,
  VoiceoverDialogue,
  Character
} from '../interfaces/IVoiceoverGenerator'
import { LangChainAgent } from '../../../agent/LangChainAgent'
import { z } from '../../../agent/types'

/**
 * Agent配置获取函数类型
 */
export interface VoiceoverGeneratorConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
}

/**
 * 基于 Agent 的配音生成器实现
 */
export class AgentVoiceoverGenerator implements IVoiceoverGenerator {
  private agent: LangChainAgent | null = null
  private getConfig: () => Promise<VoiceoverGeneratorConfig>

  /**
   * 情绪控制系数（范围 0-1）
   * 用于调整情绪向量的强度，生成的情绪值会乘以这个系数
   * 例如：0.5 表示将情绪强度降低到原来的 50%
   */
  private readonly EMOTION_COEFFICIENT = 0.5

  /**
   * Step 1: 识别台词并绑定角色ID的提示词模板
   */
  private readonly DIALOGUE_IDENTIFICATION_TEMPLATE = `请识别以下故事中的所有台词，并为每句台词绑定对应的角色ID。

角色列表：
{{characters}}

故事内容：
{{story}}

请以JSON格式输出，包含dialogues数组，每个元素包含text（台词文本）和characterId（角色ID）字段。`

  /**
   * Step 2: 分析台词情绪的提示词模板
   */
  private readonly EMOTION_ANALYSIS_TEMPLATE = `请为以下台词分析情绪向量（8维）：[喜悦, 愤怒, 悲伤, 恐惧, 惊讶, 厌恶, 信任, 期待]

故事背景：
{{story}}

台词列表：
{{dialogues}}

请以JSON格式输出，包含dialogues数组，每个元素包含dialogue（台词文本）和emo_vector（8维情绪向量，范围0-1）字段。`

  constructor(getConfig: () => Promise<VoiceoverGeneratorConfig>) {
    this.getConfig = getConfig
  }

  /**
   * 初始化或获取 agent 实例（延迟初始化，实时读取配置）
   */
  private async ensureAgent(): Promise<LangChainAgent> {
    // 每次都重新读取配置以确保使用最新的配置
    const config = await this.getConfig()

    // 创建新的 LangChain agent（使用最新配置）
    this.agent = new LangChainAgent({
      apiKey: config.apiKey,
      model: config.model || 'gpt-4',
      baseURL: config.baseURL,
      temperature: config.temperature
    })

    return this.agent
  }

  /**
   * Step 1: 识别台词并绑定角色ID
   */
  private async identifyDialogues(
    story: string,
    characters: Character[]
  ): Promise<Array<{ text: string; characterId: string }>> {
    console.log('\n========== Step 1: 识别台词并绑定角色ID 开始 ==========')

    // 构建角色列表文本（只包含 characterId 和 name）
    const charactersText = JSON.stringify(
      characters.map((char) => ({
        id: char.characterId,
        name: char.name
      })),
      null,
      2
    )

    // 构建提示词
    const prompt = this.DIALOGUE_IDENTIFICATION_TEMPLATE
      .replace('{{story}}', story)
      .replace('{{characters}}', charactersText)

    console.log('[Step 1] 输入角色数量:', characters.length)
    console.log('[Step 1] 故事长度:', story.length, '字符')

    // 定义输出 Schema（使用 Zod）
    const DialogueIdentificationSchema = z.object({
      dialogues: z.array(
        z.object({
          text: z.string().describe('台词文本'),
          characterId: z.string().describe('角色ID')
        })
      )
    })

    type DialogueIdentificationOutput = z.infer<typeof DialogueIdentificationSchema>

    console.log('[Step 1] 开始调用 Agent...')

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用结构化输出 Agent
    const result = await agent.structuredOutput<DialogueIdentificationOutput>(
      prompt,
      DialogueIdentificationSchema,
      {
        maxRetries: 3,
        timeout: 180000 // 3分钟超时
      }
    )

    // 处理结果
    if (!result.success) {
      const error = result.error!
      console.error('[Step 1] 失败:', error.message, '(类型:', error.type, ')')
      throw new Error(`台词识别失败: ${error.message} (类型: ${error.type})`)
    }

    const dialogues = result.data!.dialogues

    console.log('[Step 1] 成功！共识别', dialogues.length, '句台词，耗时', result.metadata.duration, 'ms')
    console.log('========== Step 1: 识别台词并绑定角色ID 完成 ==========\n')

    return dialogues
  }

  /**
   * Step 2: 分析台词情绪
   */
  private async analyzeEmotions(
    dialogues: Array<{ text: string; characterId: string }>,
    story: string
  ): Promise<Array<{ text: string; characterId: string; emotion: number[] }>> {
    console.log('\n========== Step 2: 分析台词情绪 开始 ==========')

    // 构建台词列表文本
    const dialoguesText = JSON.stringify(
      dialogues.map((d) => d.text),
      null,
      2
    )

    // 构建提示词
    const prompt = this.EMOTION_ANALYSIS_TEMPLATE
      .replace('{{story}}', story)
      .replace('{{dialogues}}', dialoguesText)

    console.log('[Step 2] 待分析台词数量:', dialogues.length)

    // 定义输出 Schema（使用 Zod）
    const EmotionAnalysisSchema = z.object({
      dialogues: z.array(
        z.object({
          dialogue: z.string().describe('台词文本'),
          emo_vector: z.array(z.number().min(0).max(1)).length(8).describe('8维情绪向量')
        })
      )
    })

    type EmotionAnalysisOutput = z.infer<typeof EmotionAnalysisSchema>

    console.log('[Step 2] 开始调用 Agent...')

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用结构化输出 Agent
    const result = await agent.structuredOutput<EmotionAnalysisOutput>(
      prompt,
      EmotionAnalysisSchema,
      {
        maxRetries: 3,
        timeout: 180000 // 3分钟超时
      }
    )

    // 处理结果
    if (!result.success) {
      const error = result.error!
      console.error('[Step 2] 失败:', error.message, '(类型:', error.type, ')')
      throw new Error(`情绪分析失败: ${error.message} (类型: ${error.type})`)
    }

    const emotionResults = result.data!.dialogues

    // 合并情绪向量到原始对话数据
    const dialoguesWithEmotion = dialogues.map((dialogue, index) => {
      const emotionResult = emotionResults[index]
      // 应用情绪系数
      const adjustedEmotion = emotionResult.emo_vector.map(v => v * this.EMOTION_COEFFICIENT)
      return {
        ...dialogue,
        emotion: adjustedEmotion
      }
    })

    console.log('[Step 2] 成功！共分析', dialoguesWithEmotion.length, '句台词，耗时', result.metadata.duration, 'ms')
    console.log('========== Step 2: 分析台词情绪 完成 ==========\n')
    return dialoguesWithEmotion
  }

  /**
   * 将台词转换为最终输出格式
   */
  private formatDialogues(
    dialoguesWithEmotion: Array<{ text: string; characterId: string; emotion: number[] }>,
    characters: Character[]
  ): VoiceoverDialogue[] {
    console.log('\n========== 格式化输出 开始 ==========')

    const voiceoverDialogues = dialoguesWithEmotion.map((dialogue) => {
      const character = characters.find((char) => char.characterId === dialogue.characterId)
      if (!character) {
        throw new Error(`找不到角色ID为 ${dialogue.characterId} 的角色`)
      }

      return {
        characterId: dialogue.characterId,
        characterName: character.name,
        text: dialogue.text,
        emotion: dialogue.emotion,
        audioStatus: 'none' as const
      }
    })

    console.log(`[格式化] 成功格式化 ${voiceoverDialogues.length} 句台词`)
    console.log('========== 格式化输出 完成 ==========\n')

    return voiceoverDialogues
  }

  /**
   * 生成配音（主方法）
   */
  async generateVoiceover(params: GenerateVoiceoverInput): Promise<GenerateVoiceoverOutput> {
    const { story, characters } = params

    console.log('\n')
    console.log('='.repeat(80))
    console.log('开始生成配音'.padStart(45))
    console.log('='.repeat(80))
    console.log('输入参数:')
    console.log('  - 角色数量: ', characters.length)
    console.log('  - 故事长度: ', story.length, '字符')
    console.log('='.repeat(80))

    // Step 1: 识别台词并绑定角色ID
    const dialogues = await this.identifyDialogues(story, characters)

    // Step 2: 分析台词情绪
    const dialoguesWithEmotion = await this.analyzeEmotions(dialogues, story)

    // Step 3: 格式化输出
    const voiceoverDialogues = this.formatDialogues(dialoguesWithEmotion, characters)

    console.log('\n========== 组装最终输出 ==========')
    console.log('[组装] 配音台词数量:', voiceoverDialogues.length)

    console.log('\n')
    console.log('='.repeat(80))
    console.log('配音生成完成！'.padStart(45))
    console.log(`总结: 共 ${voiceoverDialogues.length} 句台词`.padStart(48))
    console.log('='.repeat(80))
    console.log('\n')

    return {
      dialogues: voiceoverDialogues
    }
  }
}

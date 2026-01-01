/**
 * LangChain Agent 封装
 * 使用 ChatOpenAI 的 withStructuredOutput() 实现结构化输出
 */
import { ChatOpenAI } from '@langchain/openai'
import type { z } from 'zod'
import type { AgentConfig, StructuredOutputOptions, StructuredOutputResult } from './types'

export class LangChainAgent {
  private config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  /**
   * 结构化输出（使用 ChatOpenAI.withStructuredOutput）
   * @param prompt 提示词
   * @param schema Zod Schema
   * @param options 配置选项
   * @returns 结构化输出结果
   */
  async structuredOutput<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: StructuredOutputOptions = {}
  ): Promise<StructuredOutputResult<T>> {
    const startTime = Date.now()
    let attempts = 0

    try {
      attempts++
      // logger.debug('###', this.config)

      // 创建 ChatOpenAI 实例（兼容多种provider）
      const llm = new ChatOpenAI({
        model: this.config.model || 'gpt-4',
        apiKey: this.config.apiKey,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens,
        configuration: {
          baseURL: this.config.baseURL
        }
      })

      // 使用 withStructuredOutput 创建结构化输出模型
      const structuredLlm = llm.withStructuredOutput(schema)

      // 调用模型
      const data = await structuredLlm.invoke(prompt)

      if (!data) {
        throw new Error('No structured response returned from LLM')
      }

      return {
        success: true,
        data: data as T,
        metadata: {
          duration: Date.now() - startTime,
          totalAttempts: attempts
        }
      }
    } catch (error: unknown) {
      // 判断错误类型
      let errorType: 'llm_error' | 'validation_error' | 'timeout_error' = 'llm_error'
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage.includes('timeout')) {
        errorType = 'timeout_error'
      } else if (errorMessage.includes('validation') || errorMessage.includes('schema')) {
        errorType = 'validation_error'
      }

      return {
        success: false,
        error: {
          type: errorType,
          message: errorMessage || 'Unknown error',
          details: error
        },
        metadata: {
          duration: Date.now() - startTime,
          totalAttempts: attempts
        }
      }
    }
  }
}

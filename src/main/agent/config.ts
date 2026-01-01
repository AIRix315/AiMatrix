/**
 * Agent 配置助手
 * 从全局配置中读取 AI Provider 配置，创建 LangChainAgent 实例
 */

import { LangChainAgent } from './LangChainAgent'
import type { AgentConfig } from './types'

export class AgentConfigHelper {
  /**
   * 从应用配置创建 LangChain Agent
   * @param providerConfig Provider 配置对象（从 AppConfig.aiProviders 中获取）
   * @returns LangChainAgent 实例
   */
  static createAgentFromConfig(providerConfig: Record<string, unknown>): LangChainAgent {
    // 从配置中提取必要信息
    const config: AgentConfig = {
      apiKey: String(providerConfig.apiKey || providerConfig.api_key || ''),
      model: String(providerConfig.model || providerConfig.defaultModel || 'deepseek-chat'),
      temperature: typeof providerConfig.temperature === 'number' ? providerConfig.temperature : undefined,
      maxTokens: (providerConfig.maxTokens || providerConfig.max_tokens) as number | undefined
    }

    return new LangChainAgent(config)
  }

  /**
   * 验证配置是否有效
   */
  static validateConfig(providerConfig: Record<string, unknown> | null | undefined): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!providerConfig) {
      errors.push('Provider config is null or undefined')
      return { valid: false, errors }
    }

    if (!providerConfig.apiKey && !providerConfig.api_key) {
      errors.push('Missing API key')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

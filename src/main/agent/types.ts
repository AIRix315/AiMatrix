/**
 * LangChain Agent 类型定义
 */
import { z } from 'zod'

// 导出 Zod 以便业务代码使用
export { z }

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** API Key */
  apiKey: string
  /** 模型名称，默认 deepseek-chat */
  model?: string
  /** API 基础地址 */
  baseURL?: string
  /** 温度参数，默认 0.7 */
  temperature?: number
  /** 最大 token 数 */
  maxTokens?: number
}

/**
 * 结构化输出选项
 */
export interface StructuredOutputOptions {
  /** 温度参数（会覆盖默认值） */
  temperature?: number
  /** 超时时间(ms)，LangChain 内部处理，仅用于兼容 */
  timeout?: number
  /** 最大重试次数，LangChain 内部处理，仅用于兼容 */
  maxRetries?: number
}

/**
 * 结构化输出结果
 */
export interface StructuredOutputResult<T> {
  /** 是否成功 */
  success: boolean
  /** 结构化数据 */
  data?: T
  /** 错误信息 */
  error?: {
    type: 'llm_error' | 'validation_error' | 'timeout_error'
    message: string
    details?: any
  }
  /** 元数据 */
  metadata: {
    /** 总耗时(ms) */
    duration: number
    /** 总尝试次数 */
    totalAttempts: number
  }
}

/**
 * API Provider 统一配置模型
 *
 * 版本: v1.0.0
 * 日期: 2025-12-29
 * 参考: plans/code-references-phase9.md (REF-013)
 */

/**
 * API功能分类枚举
 */
export enum APICategory {
  IMAGE_GENERATION = 'image-generation', // 图像生成
  VIDEO_GENERATION = 'video-generation', // 视频生成
  AUDIO_GENERATION = 'audio-generation', // 音频生成
  LLM = 'llm', // 大语言模型
  WORKFLOW = 'workflow', // 工作流编排
  TTS = 'tts', // 文字转语音
  STT = 'stt', // 语音转文字
  EMBEDDING = 'embedding', // 向量嵌入
  TRANSLATION = 'translation', // 翻译
}

/**
 * 认证方式枚举
 */
export enum AuthType {
  BEARER = 'bearer', // Bearer Token
  APIKEY = 'apikey', // API Key
  BASIC = 'basic', // Basic Auth
  NONE = 'none', // 无认证
}

/**
 * API Provider 统一配置接口
 */
export interface APIProviderConfig {
  // 基础信息
  id: string; // 唯一标识（如：'comfyui-local', 'comfyui-runpod'）
  name: string; // 显示名称（如：'ComfyUI (本地)', 'ComfyUI (RunPod)'）
  category: APICategory; // 功能分类
  baseUrl: string; // API端点
  authType: AuthType; // 认证方式
  apiKey?: string; // API密钥（加密存储）
  enabled: boolean; // 是否启用

  // 成本估算（可选）
  costPerUnit?: number; // 单位成本
  currency?: string; // 货币单位（USD, CNY）

  // 高级配置（可选）
  timeout?: number; // 超时时间（毫秒）
  headers?: Record<string, string>; // 自定义请求头
  models?: string[]; // 支持的模型列表
  workflowId?: string; // 工作流ID（用于N8N、ComfyUI等工作流引擎）

  // 元数据
  description?: string; // 描述
  createdAt?: string; // 创建时间
  updatedAt?: string; // 更新时间
}

/**
 * API Provider 状态接口
 */
export interface APIProviderStatus {
  id: string;
  name: string;
  category: APICategory;
  status: 'available' | 'unavailable' | 'unknown';
  lastChecked: string;
  error?: string;
  latency?: number; // 延迟（毫秒）
}

/**
 * API 调用参数接口
 */
export interface APICallParams {
  providerId?: string; // 指定Provider ID（可选，不指定则自动选择）
  model?: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

/**
 * API 调用结果接口
 */
export interface APICallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  providerId: string; // 实际使用的Provider ID
  cost?: number; // 本次调用成本
  duration?: number; // 调用耗时（毫秒）
}

/**
 * 连接测试参数
 */
export interface ConnectionTestParams {
  providerId: string;
  baseUrl?: string; // 可选覆盖baseUrl
  apiKey?: string; // 可选覆盖apiKey
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean;
  models?: string[];
  error?: string;
  latency?: number;
  message?: string; // 友好提示信息（如：需要API密钥）
}

/**
 * 模型参数接口
 */
export interface ModelParameters {
  maxTokens?: number; // 最大Token数（LLM）
  contextWindow?: number; // 上下文窗口（LLM）
  dimensions?: string[]; // 支持的尺寸（图像/视频）
  aspectRatios?: string[]; // 支持的宽高比
  fps?: number[]; // 帧率（视频）
  [key: string]: unknown; // 其他自定义参数
}

/**
 * 模型定义接口
 */
export interface ModelDefinition {
  id: string; // 模型ID（唯一）
  name: string; // 显示名称
  provider: string; // 提供商ID（关联APIProviderConfig）
  category: APICategory; // 功能分类
  official: boolean; // 是否官方模型

  // 模型参数
  parameters: ModelParameters;

  // 元数据
  description?: string; // 描述
  tags?: string[]; // 标签
  costPerUnit?: number; // 单位成本
  currency?: string; // 货币单位
  deprecated?: boolean; // 是否已弃用
  version?: string; // 版本号
}

/**
 * 用户模型配置（自定义和隐藏）
 */
export interface UserModelConfig {
  modelId: string; // 模型ID
  hidden: boolean; // 是否隐藏
  customParams?: Record<string, unknown>; // 自定义参数
  alias?: string; // 别名
  favorite?: boolean; // 是否收藏
}

/**
 * 模型配置文件结构
 */
export interface ModelConfigFile {
  version: string;
  lastUpdated: string;
  models: ModelDefinition[];
}

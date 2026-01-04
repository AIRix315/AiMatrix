/**
 * 插件配置类型定义
 *
 * Phase 9 E03: 项目级插件配置管理
 * 用于支持每个项目独立配置插件使用的Provider和模型
 */

/**
 * Provider 配置项
 */
export interface ProviderConfigItem {
  /** Provider ID */
  providerId: string | null;
  /** 模型名称 */
  model: string | null;
  /** 用途描述 */
  purpose: string;
  /** 是否可选 */
  optional: boolean;
  /** 额外参数 */
  params?: Record<string, any>;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  /** Provider 配置映射 */
  providers: Record<string, ProviderConfigItem>;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 缺失的 Provider 用途描述 */
  missingProviders: string[];
}

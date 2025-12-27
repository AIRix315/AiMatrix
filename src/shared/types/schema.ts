/**
 * Schema注册系统类型定义
 *
 * 为Phase 7数据结构泛化提供JSON Schema支持
 * 允许插件动态注册自定义的Asset Schema
 */

/**
 * JSON Schema类型定义（简化版）
 * 基于JSON Schema Draft 7标准
 */
export type JSONSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * JSON Schema属性定义
 */
export interface JSONSchemaProperty {
  type: JSONSchemaType | JSONSchemaType[];
  description?: string;
  format?: string; // 如 'date-time', 'uri', 'email' 等
  enum?: any[]; // 枚举值
  items?: JSONSchemaProperty; // 数组项定义
  properties?: Record<string, JSONSchemaProperty>; // 对象属性
  required?: string[]; // 必填字段
  default?: any; // 默认值
  minimum?: number; // 最小值
  maximum?: number; // 最大值
  minLength?: number; // 最小长度
  maxLength?: number; // 最大长度
  pattern?: string; // 正则表达式
  additionalProperties?: boolean | JSONSchemaProperty; // 额外属性
}

/**
 * Asset自定义Schema定义
 */
export interface AssetSchemaDefinition {
  /** Schema唯一ID，格式：pluginId.schemaName（如 'novel-video.chapter'） */
  id: string;

  /** Schema名称（用于显示） */
  name: string;

  /** Schema描述 */
  description?: string;

  /** 所属插件ID */
  pluginId: string;

  /** Schema版本号 */
  version: string;

  /** JSON Schema定义 */
  schema: JSONSchemaProperty;

  /** Schema注册时间 */
  registeredAt?: string;

  /** 是否为活跃状态 */
  active?: boolean;

  /** Schema标签（用于分类和检索） */
  tags?: string[];

  /** 示例数据 */
  examples?: any[];
}

/**
 * Schema查询过滤器
 */
export interface SchemaFilter {
  /** 插件ID */
  pluginId?: string;

  /** Schema ID */
  schemaId?: string;

  /** Schema名称（模糊匹配） */
  name?: string;

  /** 标签 */
  tags?: string[];

  /** 是否只查询活跃Schema */
  activeOnly?: boolean;
}

/**
 * Schema验证结果
 */
export interface SchemaValidationResult {
  /** 是否验证通过 */
  valid: boolean;

  /** 验证错误信息 */
  errors?: Array<{
    path: string; // 错误路径（如 'customFields.novelVideo.chapterId'）
    message: string; // 错误信息
    expected?: string; // 期望的类型或值
    actual?: string; // 实际的类型或值
  }>;
}

/**
 * Schema注册表状态
 */
export interface SchemaRegistryState {
  /** 已注册的Schema数量 */
  totalSchemas: number;

  /** 活跃的Schema数量 */
  activeSchemas: number;

  /** 按插件分组的Schema数量 */
  schemasByPlugin: Record<string, number>;
}

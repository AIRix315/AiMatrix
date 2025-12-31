/**
 * 资产管理相关类型定义
 *
 * 定义了资产元数据标准Schema、查询过滤器、索引结构等核心类型
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

/**
 * 资产类型枚举
 */
export type AssetType =
  | 'image'   // 图片: .png, .jpg, .jpeg, .gif, .webp, .bmp
  | 'video'   // 视频: .mp4, .mov, .avi, .mkv, .webm
  | 'audio'   // 音频: .mp3, .wav, .aac, .m4a, .ogg
  | 'text'    // 文本: .txt, .md, .json, .xml, .csv
  | 'other';  // 其他未分类文件

/**
 * 宽高比枚举（卡片设计支持）
 */
export type AspectRatio = '3:4' | '4:3' | '16:9' | '9:16' | 'custom';

/**
 * 资源生成状态
 */
export type ResourceStatus = 'none' | 'generating' | 'success' | 'failed';

/**
 * 资产作用域
 */
export type AssetScope = 'global' | 'project';

/**
 * 资产元数据标准Schema
 * 平台预定义字段 + 插件可扩展字段
 */
export interface AssetMetadata {
  // === 核心字段 (必需) ===
  id: string;                        // 资产唯一ID (UUID)
  name: string;                      // 文件名 (含扩展名)
  filePath: string;                  // 完整文件路径
  type: AssetType;                   // 资产类型
  category?: string;                 // 自定义分类 (scenes/characters/etc)
  scope: AssetScope;                 // 作用域

  // === 时间字段 ===
  createdAt: string;                 // 创建时间 (ISO 8601)
  modifiedAt: string;                // 修改时间 (ISO 8601)
  importedAt?: string;               // 导入时间 (如果是导入的)

  // === 文件信息 ===
  size: number;                      // 文件大小 (bytes)
  mimeType: string;                  // MIME类型
  extension: string;                 // 文件扩展名

  // === 项目关联 ===
  projectId?: string;                // 所属项目ID (scope=project时必需)
  isUserUploaded?: boolean;          // 是否用户上传 (true: 用户上传, false: 项目生成)

  // === 组织字段 ===
  tags: string[];                    // 标签数组
  description?: string;              // 描述

  // === AI生成相关 (可选) ===
  status?: ResourceStatus;           // 生成状态 (none/generating/success/failed)
  prompt?: string;                   // AI生成提示词
  error?: string;                    // 错误信息
  sourceId?: string;                 // 复用来源ID

  // === 媒体特定字段 (可选) ===
  width?: number;                    // 图片/视频宽度
  height?: number;                   // 图片/视频高度
  duration?: number;                 // 视频/音频时长 (秒)
  aspectRatio?: AspectRatio;         // 宽高比
  thumbnailPath?: string;            // 缩略图路径

  // === 插件扩展字段 ===
  customFields?: Record<string, any>; // 插件自定义字段 (JSON)
}

/**
 * 资产查询过滤器
 */
export interface AssetFilter {
  scope?: 'global' | 'project' | 'all';
  projectId?: string;
  category?: string | string[];      // 支持自定义分类过滤
  type?: AssetType | AssetType[];
  tags?: string[];
  status?: ResourceStatus;
  isUserUploaded?: boolean;          // 过滤用户上传的资产（输入分类）
  search?: string;                   // 搜索关键词 (匹配name/tags/description)
  sortBy?: 'name' | 'createdAt' | 'modifiedAt' | 'size';
  sortOrder?: 'asc' | 'desc';
  page?: number;                     // 分页页码（从1开始）
  pageSize?: number;                 // 每页数量（默认100）
}

/**
 * 资产扫描结果（分页）
 */
export interface AssetScanResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;                      // 是否还有更多数据
  assets: AssetMetadata[];
  errors?: Array<{
    path: string;
    error: string;
  }>;
}

/**
 * 资产分类信息
 */
export interface AssetCategory {
  name: string;                      // 分类名称
  type?: AssetType;                  // 关联的资产类型
  count: number;                     // 资产数量
  lastModified?: string;             // 最后修改时间
  items?: string[];                  // 文件名列表（项目索引才有）
}

/**
 * 资产索引信息
 */
export interface AssetIndex {
  projectId?: string;                // 项目ID（全局索引时为undefined）
  projectName?: string;              // 项目名称
  version: string;                   // 索引版本
  lastUpdated: string;               // 最后更新时间 (ISO 8601)
  statistics: {
    total: number;                   // 总资产数量
    byType: Partial<Record<AssetType, number>>;      // 按类型统计
    byCategory?: Record<string, number>;             // 按分类统计
  };
  categories: AssetCategory[];       // 分类列表
}

/**
 * 资产导入参数
 */
export interface AssetImportParams {
  sourcePath: string;                // 源文件路径
  scope: AssetScope;                 // 作用域
  projectId?: string;                // 项目ID (scope=project时必需)
  category?: string;                 // 分类 (scenes/characters/images等)
  type?: AssetType;                  // 可选，自动检测
  tags?: string[];                   // 标签
  metadata?: Partial<AssetMetadata>; // 额外元数据
}

/**
 * 文件变动事件
 */
export interface AssetFileChangeEvent {
  eventType: 'add' | 'change' | 'unlink';
  filePath: string;
  projectId?: string;
  category?: string;
}

/**
 * 场景专用字段
 * 用于小说转视频工作流的场景管理
 */
export interface SceneCustomFields {
  assetSubType: 'scene';                              // 资产子类型标识
  environment: 'indoor' | 'outdoor';                  // 环境
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'; // 时间
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'snowy';  // 天气
  location: string;                                    // 地点描述
  mood?: 'calm' | 'tense' | 'joyful' | 'sad';        // 氛围
  lighting?: string;                                   // 光照描述
}

/**
 * 角色专用字段
 * 用于小说转视频工作流的角色管理
 */
export interface CharacterCustomFields {
  assetSubType: 'character';                          // 资产子类型标识
  gender: 'male' | 'female' | 'other';                // 性别
  age: number;                                         // 年龄
  appearance: string;                                  // 外貌描述
  personality?: string;                                // 性格描述
  clothing?: string;                                   // 服装描述
  height?: number;                                     // 身高（cm）
  bodyType?: 'slim' | 'average' | 'muscular' | 'heavyset'; // 体型
}

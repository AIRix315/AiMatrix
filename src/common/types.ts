/**
 * 全局类型定义
 *
 * 循环全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 *
 * 参考：docs/06-core-services-design-v1.0.1.md
 *
 *
 * ==================== 基础类型 ====================
 *
 * 导入标准资产元数据类型
 */
import type { AssetMetadata } from '../shared/types';

/**
 * 资产类型枚举
 */
export enum AssetType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  MODEL = 'model',
  WORKFLOW = 'workflow'
}

/**
 * 资产作用域枚举
 */
export enum AssetScope {
  PROJECT = 'project',
  GLOBAL = 'global'
}

/**
 * 库分类枚举
 */
export enum LibraryCategory {
  TEXTURES = 'textures',
  MODELS = 'models',
  MATERIALS = 'materials',
  AUDIO = 'audio',
  VIDEO = 'video',
  FONTS = 'fonts',
  SCRIPTS = 'scripts',
  OTHER = 'other'
}

/**
 * 插件权限枚举
 */
export enum PluginPermission {
  FILE_SYSTEM_READ = 'file-system:read',
  FILE_SYSTEM_WRITE = 'file-system:write',
  NETWORK_ANY = 'network:any',
  NETWORK_OFFICIAL_API = 'network:official-api',
  SHELL_EXEC = 'shell:exec'
}

/**
 * 插件类型枚举
 */
export enum PluginType {
  OFFICIAL = 'official',
  PARTNER = 'partner',
  COMMUNITY = 'community'
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 快捷方式类型枚举
 */
export enum ShortcutType {
  PROJECT = 'project',
  WORKFLOW = 'workflow',
  PLUGIN = 'plugin'
}

/**
 * 项目设置接口
 */
export interface ProjectSettings {
  defaultWorkflow: string;
  outputFormat: string;
  quality: number;
}

/**
 * AI资产属性接口
 */
export interface AIAssetAttributes {
  baseModelHash?: string;
  baseModelName?: string;
  loraRefs?: {
    name: string;
    strength: number;
    hash: string;
  }[];
  triggerWords?: string[];
  seed?: number;
  cfgScale?: number;
  sampler?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  generationParams?: Record<string, unknown>; // AI生成参数的动态键值对
  duration?: number;
  dimensions?: { width: number; height: number };
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

/**
 * 资产配置接口
 */
export interface AssetConfig {
  id: string;
  scope: AssetScope;
  type: AssetType;
  path: string;
  metadata: AssetMetadata;
  aiAttributes?: AIAssetAttributes;
  tags: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * 项目状态枚举
 */
export enum ProjectStatus {
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * 项目配置接口
 */
export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  settings: ProjectSettings;
  workflows: string[];
  assets: AssetConfig[];

  // ========== Phase 9 H0.1 新增字段 ==========

  // 工作流识别字段（UI-2）
  workflowType?: string;           // 'novel-to-video' | 'custom' | ...
  pluginId?: string;               // 使用的插件ID（如果是插件工作流）
  currentWorkflowInstanceId?: string; // 当前关联的工作流实例
  status?: ProjectStatus;          // 项目状态

  // 资源绑定字段
  inputAssets: string[];   // 引用的输入资源ID列表（用户上传的原始资源）
  outputAssets: string[];  // 该项目生成的输出资源ID列表（AI生成资源）
  immutable: boolean;      // 项目完成后不可修改标志
}

/**
 * 插件清单接口
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  category?: string;
  verificationSignature?: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  // 其他扩展属性 - 插件可能有额外的自定义字段
  [key: string]: unknown;
}

/**
 * 插件信息接口
 */
export interface PluginInfo {
  id?: string;                   // 插件ID（从manifest.id快捷访问）
  name?: string;                 // 插件名称（从manifest.name快捷访问）
  manifest: PluginManifest;
  isEnabled: boolean;
  isLoaded: boolean;
  loadTime?: string; // ISO 8601
  lastUsed?: string; // ISO 8601
}

/**
 * 任务配置接口
 */
export interface TaskConfig {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>; // 任务配置的动态键值对
  inputs?: TaskInput[];
  outputs?: TaskOutput[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * 任务输入接口
 */
export interface TaskInput {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown; // 默认值可以是任何类型
  description?: string;
}

/**
 * 任务输出接口
 */
export interface TaskOutput {
  id: string;
  name: string;
  type: string;
  description?: string;
}

/**
 * 任务执行结果接口
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  inputs?: Record<string, unknown>; // 任务输入参数
  outputs?: Record<string, unknown>; // 任务输出结果
  error?: string;
  progress?: number;
}

/**
 * API使用情况接口
 */
export interface APIStatus {
  id: string;
  isAvailable: boolean;
  lastChecked: string; // ISO 8601
  responseTime?: number;
  error?: string;
}

/**
 * API使用情况接口
 */
export interface APIUsage {
  id: string;
  period: 'daily' | 'monthly' | 'yearly';
  requests: number;
  cost: number;
  currency: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string; // ISO 8601
  service?: string;
  operation?: string;
  data?: Record<string, unknown>; // 日志附加数据
}

/**
 * 任务调度器接口
 */
export interface TaskScheduler {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  createTask(config: TaskConfig): Promise<string>;
  executeTask(taskId: string, inputs?: Record<string, unknown>): Promise<string>;
  pauseTask(executionId: string): Promise<void>;
  resumeTask(executionId: string): Promise<void>;
  cancelTask(executionId: string): Promise<void>;
  getTaskStatus(executionId: string): Promise<TaskExecution>;
  getTaskResults(executionId: string): Promise<TaskExecution>;
  estimateCost(config: TaskConfig): Promise<{
    provider: string;
    estimatedCost: number;
    currency: string;
  }>;
}

/**
 * 项目管理器接口
 */
export interface ProjectManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  createProject(name: string, template?: string): Promise<ProjectConfig>;
  loadProject(projectId: string): Promise<ProjectConfig>;
  saveProject(projectId: string, config: ProjectConfig): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  listProjects(): Promise<ProjectConfig[]>;
  linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void>;
  getLinkedAssets(projectId: string): Promise<AssetConfig[]>;
}

/**
 * 资产管理器接口
 */
export interface AssetManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  addAsset(target: { scope: AssetScope; id: string }, assetData: Partial<AssetConfig>): Promise<AssetConfig>;
  removeAsset(scope: AssetScope, containerId: string, assetId: string): Promise<void>;
  updateAsset(scope: AssetScope, containerId: string, assetId: string, updates: Partial<AssetConfig>): Promise<void>;
  searchAssets(scope: AssetScope, containerId: string, query: AssetSearchQuery): Promise<AssetConfig[]>;
  getAssetPreview(scope: AssetScope, containerId: string, assetId: string): Promise<string>;
  promoteAssetToGlobal(projectId: string, assetId: string, category: string): Promise<AssetConfig>;
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  loadPlugin(pluginId: string): Promise<Plugin>;
  unloadPlugin(pluginId: string): Promise<void>;
  installPlugin(pluginPackage: PluginPackage): Promise<void>;
  listPlugins(type?: PluginType): Promise<PluginInfo[]>;
  verifySignature(pluginId: string): Promise<boolean>;
  executePluginAction(pluginId: string, action: string, params: unknown): Promise<unknown>;
}

/**
 * API调用管理器接口
 */
export interface APIManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  registerAPI(name: string, config: APIProviderConfig): void;
  callAPI(name: string, params: unknown): Promise<unknown>;
  setAPIKey(name: string, key: string): void;
  getAPIStatus(name: string): Promise<APIStatus>;
  getAPIUsage(name: string): Promise<APIUsage>;
}

/**
 * 全局库管理通道
 */
export const LIBRARY_CHANNELS = {
  ADD: 'library:add',
  GET: 'library:get',
  PROMOTE: 'library:promote', // 项目资产 -> 全局资产
  LIST: 'library:list'
}

/**
 * 服务错误接口
 */
export interface ServiceError {
  code: string;
  message: string;
  timestamp: string; // ISO 8601
  service: string;
  operation?: string;
}

// ============ 附加类型定义 ============

/**
 * 资产搜索查询接口
 */
export interface AssetSearchQuery {
  type?: AssetType;
  tags?: string[];
  name?: string;
  text?: string;
  dateRange?: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  limit?: number;
  offset?: number;
}

/**
 * 插件包接口
 */
export interface PluginPackage {
  manifest: PluginManifest;
  files: {
    path: string;
    content: string;
  }[];
}

/**
 * 插件接口
 */
export interface Plugin {
  id: string;
  manifest: PluginManifest;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * API提供者配置接口
 */
export interface APIProviderConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// ============ 应用配置类型 (Settings) ============

/**
 * 日志配置接口
 */
export interface ILogSettings {
  enabled: boolean;
  savePath: string; // 日志保存文件夹路径
  retentionDays: number; // 日志保留天数
}

/**
 * AI模型配置接口
 */
export interface IModelConfig {
  id: string;
  name: string;
  ctx?: string; // 上下文信息，如 "Chat / 8k"
  enabled?: boolean;
}

/**
 * AI服务提供商配置接口
 */
export interface IProviderConfig {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'relay';
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  models?: IModelConfig[];
}

/**
 * MCP服务器配置接口
 */
export interface IMCPServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

/**
 * 通用设置接口
 */
export interface IGeneralSettings {
  language: string;
  theme: 'dark' | 'light';
  workspacePath: string; // 资源库路径
  logging: ILogSettings;
}

/**
 * 插件配置接口
 */
export interface IPluginConfig {
  enabled: boolean;
  lastUsed?: string; // ISO 8601 时间字符串
}

/**
 * 快捷方式项接口
 */
export interface ShortcutItem {
  id?: string;                   // 快捷方式唯一ID（可选，由后端生成）
  type: ShortcutType;            // 类型（项目/工作流/插件）
  targetId: string;              // 关联的项目/工作流/插件ID
  name: string;                  // 显示名称
  icon: string;                  // 图标（emoji或图片路径）
  order?: number;                // 排序顺序（数字越小越靠上，可选）
  createdAt?: string;            // 创建时间（ISO 8601，可选）
}

/**
 * 应用完整配置接口
 */
export interface IAppSettings {
  general: IGeneralSettings;
  providers: IProviderConfig[];
  mcpServers: IMCPServerConfig[];
  plugins?: Record<string, IPluginConfig>; // 插件配置（插件ID -> 配置）
  shortcuts?: ShortcutItem[];    // 菜单栏快捷方式列表
}

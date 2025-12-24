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
  generationParams?: any;
  duration?: number;
  dimensions?: { width: number; height: number };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 资产元数据接口
 */
export interface AssetMetadata {
  // 传统媒体属性
  duration?: number;
  dimensions?: { width: number; height: number };
  // 其他元数据
  [key: string]: any;
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 项目配置接口
 */
export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  workflows: string[];
  assets: AssetConfig[];
}

/**
 * 插件清单接口
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  verificationSignature?: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  // 其他属性
  [key: string]: any;
}

/**
 * 插件信息接口
 */
export interface PluginInfo {
  manifest: PluginManifest;
  isEnabled: boolean;
  isLoaded: boolean;
  loadTime?: Date;
  lastUsed?: Date;
}

/**
 * 任务配置接口
 */
export interface TaskConfig {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  inputs?: TaskInput[];
  outputs?: TaskOutput[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 任务输入接口
 */
export interface TaskInput {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
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
  startTime: Date;
  endTime?: Date;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  progress?: number;
}

/**
 * API使用情况接口
 */
export interface APIStatus {
  id: string;
  isAvailable: boolean;
  lastChecked: Date;
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
  startDate: Date;
  endDate: Date;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service?: string;
  operation?: string;
  data?: any;
}

/**
 * 任务调度器接口
 */
export interface TaskScheduler {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  createTask(config: TaskConfig): Promise<string>;
  executeTask(taskId: string, inputs?: Record<string, any>): Promise<string>;
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
  executePluginAction(pluginId: string, action: string, params: any): Promise<any>;
}

/**
 * API调用管理器接口
 */
export interface APIManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  registerAPI(name: string, config: APIProviderConfig): void;
  callAPI(name: string, params: any): Promise<any>;
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
  timestamp: Date;
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
    start: Date;
    end: Date;
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

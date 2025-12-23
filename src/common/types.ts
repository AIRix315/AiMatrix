/**
 * 全局类型定义
 * 
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 * 
 * 参考：docs/00-global-requirements-v1.0.0.md
 */

import { timeService } from '../main/services/TimeService';

// ==================== 基础类型 ====================

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
 * 插件类型枚举
 */
export enum PluginType {
  OFFICIAL = 'official',
  PARTNER = 'partner',
  COMMUNITY = 'community'
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

// ==================== 数据模型 ====================

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
  baseModelHash?: string;       // 底模 Hash
  baseModelName?: string;       // 底模名称 (如 Sora2, SDXL)
  loraRefs?: {                 // LoRA 引用
    name: string;
    strength: number;
    hash: string;
  }[];
  triggerWords?: string[];      // 触发词 (拖入即自动填入Prompt)
  seed?: number;                // 种子
  cfgScale?: number;
  sampler?: string;
  positivePrompt?: string;      // 正向提示词
  negativePrompt?: string;      // 负向提示词
  generationParams?: any;       // 完整生成参数包 (JSON)
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
  scope: AssetScope;  // 作用域
  type: AssetType;
  path: string;
  metadata: AssetMetadata;
  aiAttributes?: AIAssetAttributes; // AI 专用属性
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
  type: PluginType; // 插件类型：决定权限等级和展示权重
  verificationSignature?: string; // 官方签名：用于验证 Official 插件未被篡改
  description: string;
  author: string;
  permissions: PluginPermission[]; // 细化权限列表
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
  inputs: TaskInput[];
  outputs: TaskOutput[];
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
 * API提供商配置接口
 */
export interface APIProviderConfig {
  id: string;
  name: string;      // e.g., "OpenAI", "Runway", "Local-ComfyUI"
  type: 'cloud' | 'local';
  baseUrl: string;
  authType: 'bearer' | 'apikey' | 'none';
  costPerUnit?: number; // 用于成本估算
  isEnabled: boolean;
}

/**
 * API状态接口
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

// ==================== 服务接口 ====================

/**
 * 项目管理器接口
 */
export interface ProjectManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // 项目管理
  createProject(name: string, template?: string): Promise<ProjectConfig>;
  loadProject(projectId: string): Promise<ProjectConfig>;
  saveProject(projectId: string, config: ProjectConfig): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  listProjects(): Promise<ProjectConfig[]>;
  
  // [新增] 引用管理
  linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void>;
  getLinkedAssets(projectId: string): Promise<AssetConfig[]>;
}

/**
 * 资产管理器接口
 */
export interface AssetManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // [修改] 增加 scope 参数，区分是存入当前项目还是存入全局库
  addAsset(
    target: { scope: AssetScope; id: string }, // id为projectId或libraryCategoryId
    assetData: Partial<AssetConfig>
  ): Promise<AssetConfig>;
  
  // [修改] 增加 scope 参数
  getAsset(scope: AssetScope, containerId: string, assetId: string): Promise<AssetConfig>;
  
  // [新增] 资产提升：将项目私有资产升级为全局资产
  promoteAssetToGlobal(projectId: string, assetId: string, category: string): Promise<AssetConfig>;
  
  // 其他方法
  removeAsset(scope: AssetScope, containerId: string, assetId: string): Promise<void>;
  updateAsset(scope: AssetScope, containerId: string, assetId: string, updates: Partial<AssetConfig>): Promise<void>;
  searchAssets(scope: AssetScope, containerId: string, query: AssetSearchQuery): Promise<AssetConfig[]>;
  getAssetPreview(scope: AssetScope, containerId: string, assetId: string): Promise<string>;
}

/**
 * 资产搜索查询接口
 */
export interface AssetSearchQuery {
  type?: AssetType;
  tags?: string[];
  text?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
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
  uninstallPlugin(pluginId: string): Promise<void>;
  listPlugins(type?: PluginType): Promise<PluginInfo[]>;
  executePluginAction(pluginId: string, action: string, params: any): Promise<any>;
  
  // [新增] 根据类型获取插件列表
  listPluginsByType(type?: PluginType): Promise<PluginInfo[]>;
  
  // [新增] 验证插件签名
  verifySignature(pluginId: string): Promise<boolean>;
}

/**
 * 插件包接口
 */
export interface PluginPackage {
  manifest: PluginManifest;
  files: Record<string, string>; // 文件路径到内容的映射
}

/**
 * 插件接口
 */
export interface Plugin {
  id: string;
  manifest: PluginManifest;
  load(): Promise<void>;
  unload(): Promise<void>;
  executeAction(action: string, params: any): Promise<any>;
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
  
  // [新增] 成本估算
  estimateCost(taskConfig: TaskConfig): Promise<{
    provider: string,
    estimatedCost: number,
    currency: string
  }>;
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

// ==================== 错误处理 ====================

/**
 * 服务错误接口
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  service: string;
  operation: string;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service: string;
  operation?: string;
  data?: any;
}

// ==================== 时间合规装饰器 ====================

/**
 * 强制时间查询装饰器工厂
 * 确保被装饰的方法在执行前验证时间有效性
 */
export function requireValidTime() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // 获取当前时间并验证
      const currentTime = await timeService.getCurrentTime();
      const isTimeValid = await timeService.validateTimeIntegrity();
      
      if (!isTimeValid) {
        // 尝试重新同步时间
        const syncSuccess = await timeService.syncWithNTP();
        if (!syncSuccess) {
          throw new Error(`时间验证失败，无法执行操作: ${propertyKey}`);
        }
      }
      
      // 记录时间操作
      console.log(`时间验证通过，执行操作: ${propertyKey}，时间: ${currentTime.toISOString()}`);
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// ==================== 全局库相关 ====================

/**
 * 全局库管理通道
 */
export const LIBRARY_CHANNELS = {
  ADD: 'library:add',
  GET: 'library:get',
  PROMOTE: 'library:promote', // 项目资产 -> 全局资产
  LIST: 'library:list'
} as const;

/**
 * 全局库分类接口
 */
export interface LibraryCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  assetCount: number;
  createdAt: Date;
  updatedAt: Date;
}
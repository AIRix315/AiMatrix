/**
 * Electron API 类型定义
 *
 * 为 preload 脚本暴露的所有 IPC 通道定义完整的类型
 * 消除 any 类型警告，提升类型安全
 */

import type {
  AssetMetadata,
  AssetFilter,
  AssetIndex,
  AssetScanResult,
  AssetImportParams
} from './asset';

import type {
  TextToImageParams,
  TextToImageResult,
  ImageToImageParams,
  ImageToImageResult,
  ImageToVideoParams,
  ImageToVideoResult,
  ProviderConfig,
  ProviderTemplate,
  OperationType
} from './provider';

import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowState
} from './workflow';

// 从 common/types 导入主进程实际使用的类型
import type {
  ShortcutItem,
  ShortcutType,
  ProjectConfig as CommonProjectConfig,
  TaskExecution as CommonTaskExecution,
  APIStatus as CommonAPIStatus,
  APIUsage as CommonAPIUsage,
  PluginInfo as CommonPluginInfo
} from '../../common/types';

// 创建本地别名供文件内部使用
type PluginInfo = CommonPluginInfo;
type TaskExecution = CommonTaskExecution;
type APIStatus = CommonAPIStatus;
type APIUsage = CommonAPIUsage;

// 重新导出以供渲染进程使用
export type { ProviderConfig } from './provider';
export type { APIProviderConfig } from './api';
// ModelDefinition 已在 api.ts 中定义，此处使用 ModelInfo
export type AppConfig = AppSettings;
export type Project = ProjectConfig;
export type Workflow = WorkflowDefinition;
export type { ShortcutItem, ShortcutType, CommonPluginInfo as PluginInfo, CommonTaskExecution as TaskExecution, CommonAPIStatus as APIStatus, CommonAPIUsage as APIUsage };

// ==================== 项目相关类型 ====================

/**
 * 项目配置接口（从 common/types 重新导出）
 */
export type ProjectConfig = CommonProjectConfig;

/**
 * 项目列表项
 */
export interface ProjectListItem extends ProjectConfig {
  description?: string;
  createdAt: string;
  updatedAt: string;
}


// ==================== 快捷方式相关类型 ====================


// ==================== 插件相关类型 ====================



/**
 * 插件市场项
 */
export interface MarketPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  downloads: number;
  rating: number;
  tags: string[];
  featured: boolean;
}


// ==================== 任务相关类型 ====================

/**
 * 任务配置
 */
export interface TaskConfig {
  id: string;
  name: string;
  type: string;
  inputs: Record<string, unknown>;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * 任务日志条目（用于队列TAB显示）
 */
export interface TaskLog {
  taskId: string;
  pluginId: string;
  projectId: string;
  status: 'running' | 'success' | 'error';
  startTime: string;
  endTime: string | null;
  error: string | null;
}




// ==================== 模型相关类型 ====================

/**
 * AI 模型信息
 */
export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  category: 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text' | 'audio';
  providerId: string;
  description?: string;
  hidden: boolean;
  tags?: string[];
  favorite: boolean;
  alias?: string;
  parameters?: Record<string, unknown>;
}


// ==================== 日志相关类型 ====================

/**
 * 日志条目
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}


// ==================== 设置相关类型 ====================

/**
 * 应用设置
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  dataPath: string;
  providers: Record<string, ProviderConfig>;
  apiKeys: Record<string, string>;
  defaultProviders: Record<OperationType, string>;
  [key: string]: unknown;
}


// ==================== 文件相关类型 ====================

/**
 * 文件选择结果
 */
export interface FileSelection {
  canceled: boolean;
  filePaths: string[];
}


/**
 * 文件过滤器
 */
export interface FileFilter {
  name: string;
  extensions: string[];
}


/**
 * 文件信息
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string;
}


// ==================== MCP 服务相关类型 ====================

/**
 * MCP 服务配置
 */
export interface MCPConfig {
  serviceId: string;
  type: string;
  endpoint: string;
  credentials?: Record<string, string>;
}


// ==================== AI 相关类型 ====================

/**
 * 场景角色提取结果
 */
export interface SceneCharacterExtractionResult {
  scenes: string[];
  characters: string[];
  details: Array<{
    scene: string;
    characters: string[];
  }>;
}


/**
 * 分镜 Prompt 生成参数
 */
export interface StoryboardPromptParams {
  sceneDescription: string;
  characters: string[];
  characterImages?: Record<string, string>;
  sceneImage?: string;
}


// ==================== Provider 测试相关类型 ====================

/**
 * Provider 连接测试参数
 * 兼容 ConnectionTestParams 从 @/shared/types/api
 */
export interface ProviderTestParams {
  providerId: string;
  baseUrl?: string;  // 可选覆盖baseUrl
  apiKey?: string;   // 可选覆盖apiKey
}


/**
 * Provider 连接测试结果
 * 兼容 ConnectionTestResult 从 @/shared/types/api
 */
export interface ProviderTestResult {
  success: boolean;
  models?: string[];
  error?: string;
  latency?: number;
  message?: string;  // 友好提示信息
}


/**
 * API 连接测试结果
 */
export interface APITestResult {
  success: boolean;
  models?: string[];
  error?: string;
}


/**
 * Provider 状态
 */
export interface ProviderStatus {
  id: string;
  available: boolean;
  error?: string;
  lastCheck?: string;
}




// ==================== 批量操作相关类型 ====================

/**
 * 批量文生图参数
 */
export interface BatchTextToImageParams {
  prompts?: Array<{
    prompt: string;
    width: number;
    height: number;
    negativePrompt?: string;
    seed?: number;
  }>;
  items?: Array<{ // 兼容旧代码
    id?: string;
    prompt: string;
    width: number;
    height: number;
    negativePrompt?: string;
    seed?: number;
  }>;
  providerId?: string;
  maxConcurrency?: number;
}


/**
 * 批量图生视频参数
 */
export interface BatchImageToVideoParams {
  items: Array<{
    imageInput: string;
    prompt: string;
    duration?: number;
    fps?: number;
    seed?: number;
  }>;
  providerId?: string;
  maxConcurrency?: number;
}


/**
 * 批量操作结果
 */
export interface BatchResult<T> {
  success: T[];
  failed: Array<{
    item: unknown;
    error: string;
  }>;
  total: number;
  successCount: number;
  failedCount: number;
  successRate: number;
}


// ==================== 资产文件变化事件 ====================

/**
 * 资产文件变化事件
 */
export interface AssetFileChangedEvent {
  eventType: 'add' | 'change' | 'unlink';
  filePath: string;
  projectId?: string;
}


// ==================== 主 ElectronAPI 接口 ====================

/**
 * 暴露给渲染进程的完整 API 接口
 */
export interface ElectronAPI {
  // ==================== 应用相关 ====================
  getAppVersion: () => Promise<string>;
  quitApp: () => Promise<void>;
  restartApp: () => Promise<void>;
  log: (level: string, message: string, context?: string, data?: unknown) => Promise<void>;

  // ==================== 时间服务 ====================
  getCurrentTime: () => Promise<number>;

  // ==================== 窗口控制 ====================
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;

  // ==================== 快捷方式管理 ====================
  addShortcut: (item: ShortcutItem) => Promise<ShortcutItem>;
  removeShortcut: (id: string) => Promise<void>;
  reorderShortcuts: (ids: string[]) => Promise<void>;
  listShortcuts: () => Promise<ShortcutItem[]>;

  // ==================== 项目管理 ====================
  createProject: (name: string, template?: string) => Promise<ProjectConfig>;
  loadProject: (projectId: string) => Promise<ProjectConfig>;
  saveProject: (projectId: string, config: ProjectConfig) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  listProjects: () => Promise<ProjectListItem[]>;
  addInputAsset: (projectId: string, assetId: string) => Promise<void>;
  addOutputAsset: (projectId: string, assetId: string) => Promise<void>;

  // ==================== 项目插件配置 ====================
  getProjectPluginConfig: (projectId: string, pluginId: string) => Promise<unknown>;
  saveProjectPluginConfig: (projectId: string, pluginId: string, config: unknown) => Promise<void>;
  validateProjectPluginConfig: (projectId: string, pluginId: string) => Promise<unknown>;
  resetProjectPluginConfig: (projectId: string, pluginId: string) => Promise<unknown>;

  // ==================== 资产管理 ====================
  getAssetIndex: (projectId?: string) => Promise<AssetIndex>;
  rebuildAssetIndex: (projectId?: string) => Promise<AssetIndex>;
  scanAssets: (filter: AssetFilter) => Promise<AssetScanResult>;
  importAsset: (params: AssetImportParams) => Promise<AssetMetadata>;
  deleteAsset: (filePath: string) => Promise<{ success: boolean }>;
  getAssetMetadata: (filePath: string) => Promise<AssetMetadata>;
  updateAssetMetadata: (filePath: string, updates: Partial<AssetMetadata>) => Promise<AssetMetadata>;
  startAssetWatching: (projectId?: string) => Promise<{ success: boolean }>;
  stopAssetWatching: (projectId?: string) => Promise<{ success: boolean }>;
  showImportDialog: () => Promise<string[]>;
  onAssetFileChanged: (callback: (event: AssetFileChangedEvent) => void) => void;
  getAssetReferences: (assetId: string) => Promise<string[]>;

  // ==================== 工作流管理 ====================
  executeWorkflow: (config: WorkflowDefinition) => Promise<string>;
  getWorkflowStatus: (jobId: string) => Promise<WorkflowState>;
  cancelWorkflow: (jobId: string) => Promise<void>;
  listWorkflows: () => Promise<WorkflowDefinition[]>;
  saveWorkflow: (workflowId: string, config: WorkflowDefinition) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  loadWorkflow: (workflowId: string) => Promise<WorkflowDefinition>;

  // ==================== 插件管理 ====================
  installPlugin: (pluginPackage: unknown) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  loadPlugin: (pluginId: string) => Promise<PluginInfo>;
  executePluginAction: (pluginId: string, action: string, params: unknown) => Promise<unknown>;
  listPlugins: () => Promise<PluginInfo[]>;
  installPluginFromZip: (zipPath: string, type?: 'official' | 'community') => Promise<PluginInfo>;
  getMarketPlugins: (filter?: Record<string, unknown>) => Promise<MarketPlugin[]>;
  searchMarketPlugins: (keyword: string) => Promise<MarketPlugin[]>;
  togglePlugin: (pluginId: string, enabled: boolean) => Promise<{ success: boolean }>;

  // ==================== 任务调度 ====================
  listTaskLogs: (filter?: 'running' | 'success' | 'error' | 'all') => Promise<TaskLog[]>;
  createTask: (config: TaskConfig) => Promise<string>;
  executeTask: (taskId: string, inputs: Record<string, unknown>) => Promise<string>;
  getTaskStatus: (executionId: string) => Promise<TaskExecution>;
  cancelTask: (executionId: string) => Promise<void>;
  retryTask: (executionId: string) => Promise<void>;
  getTaskResults: (executionId: string) => Promise<unknown>;

  // ==================== API 管理 ====================
  callAPI: (name: string, params: unknown) => Promise<unknown>;
  setAPIKey: (name: string, key: string) => Promise<void>;
  getAPIStatus: (name: string) => Promise<APIStatus>;
  getAPIUsage: (name: string) => Promise<APIUsage>;
  testAPIConnection: (params: { type: string; baseUrl: string; apiKey?: string }) => Promise<APITestResult>;

  // ==================== Provider 管理 ====================
  listProviders: (options?: { category?: string; enabledOnly?: boolean }) => Promise<ProviderConfig[]>;
  getProvider: (providerId: string) => Promise<ProviderConfig>;
  addProvider: (config: ProviderConfig) => Promise<void>;
  removeProvider: (providerId: string) => Promise<void>;
  testProviderConnection: (params: ProviderTestParams) => Promise<ProviderTestResult>;
  getProviderStatus: (providerId: string) => Promise<ProviderStatus>;

  // ==================== Provider Template 管理 ====================
  getProviderTemplate: (typeId: string) => Promise<ProviderTemplate | null>;
  listProviderTemplates: (category: string) => Promise<ProviderTemplate[]>;
  refreshProviderTemplates: () => Promise<void>;

  // ==================== Provider 操作执行 ====================
  executeTextToImage: (params: TextToImageParams) => Promise<TextToImageResult>;
  executeImageToImage: (params: ImageToImageParams) => Promise<ImageToImageResult>;
  executeImageToVideo: (params: ImageToVideoParams) => Promise<ImageToVideoResult>;
  checkProviderAvailability: (providerId: string) => Promise<boolean>;
  batchTextToImage: (params: BatchTextToImageParams) => Promise<BatchResult<TextToImageResult>>;
  batchImageToVideo: (params: BatchImageToVideoParams) => Promise<BatchResult<ImageToVideoResult>>;

  // ==================== AI 服务 ====================
  extractScenesAndCharacters: (novelText: string) => Promise<SceneCharacterExtractionResult>;
  generateCharacterPrompt: (characterName: string, context?: string) => Promise<string>;
  generateScenePrompt: (sceneName: string, context?: string) => Promise<string>;
  generateStoryboardPrompt: (params: StoryboardPromptParams) => Promise<string>;

  // ==================== 模型管理 ====================
  listModels: (options?: {
    category?: string;
    enabledProvidersOnly?: boolean;
    includeHidden?: boolean;
    favoriteOnly?: boolean;
  }) => Promise<ModelInfo[]>;
  getModel: (modelId: string) => Promise<ModelInfo>;
  addCustomModel: (model: Omit<ModelInfo, 'id'>) => Promise<void>;
  removeCustomModel: (modelId: string) => Promise<void>;
  toggleModelVisibility: (modelId: string, hidden: boolean) => Promise<void>;
  toggleModelFavorite: (modelId: string, favorite: boolean) => Promise<void>;
  setModelAlias: (modelId: string, alias: string) => Promise<void>;

  // ==================== 日志管理 ====================
  getRecentLogs: (limit?: number, levelFilter?: string) => Promise<LogEntry[]>;

  // ==================== 设置管理 ====================
  getAllSettings: () => Promise<AppSettings>;
  saveSettings: (config: Partial<AppSettings>) => Promise<{ success: boolean }>;
  openDirectoryDialog: () => Promise<string | null>;

  // ==================== 文件系统操作 ====================
  readFile: (filePath: string) => Promise<string | Buffer>;
  writeFile: (filePath: string, content: string | Buffer) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  listFiles: (dirPath: string) => Promise<FileInfo[]>;
  watchFile: (filePath: string) => Promise<void>;
  unwatchFile: (filePath: string) => Promise<void>;
  selectFiles: (options?: { filters?: FileFilter[] }) => Promise<FileSelection>;

  // ==================== MCP 服务集成 ====================
  connectMCP: (config: MCPConfig) => Promise<void>;
  disconnectMCP: (serviceId: string) => Promise<void>;
  callMCP: (serviceId: string, method: string, params: unknown) => Promise<unknown>;
  getMCPStatus: (serviceId: string) => Promise<{ connected: boolean; error?: string }>;
  listMCP: () => Promise<MCPConfig[]>;

  // ==================== 本地服务管理 ====================
  startLocal: (serviceId: string, config: unknown) => Promise<void>;
  stopLocal: (serviceId: string) => Promise<void>;
  getLocalStatus: (serviceId: string) => Promise<{ running: boolean; error?: string }>;
  restartLocal: (serviceId: string) => Promise<void>;

  // ==================== 工作流定义管理 ====================
  listWorkflowDefinitions: () => Promise<WorkflowDefinition[]>;
  getWorkflowDefinition: (type: string) => Promise<WorkflowDefinition>;

  // ==================== 工作流实例管理 ====================
  createWorkflowInstance: (params: {
    type: string;
    projectId?: string;
    name?: string;
    initialData?: unknown;
  }) => Promise<WorkflowInstance>;
  loadWorkflowInstance: (workflowId: string) => Promise<WorkflowInstance>;
  saveWorkflowState: (workflowId: string, state: unknown) => Promise<void>;
  loadWorkflowState: (workflowId: string) => Promise<WorkflowState>;
  updateWorkflowCurrentStep: (workflowId: string, stepIndex: number) => Promise<void>;
  updateWorkflowStepStatus: (workflowId: string, stepId: string, status: string, data?: unknown) => Promise<void>;
  deleteWorkflowInstance: (workflowId: string) => Promise<void>;
  listWorkflowInstances: (projectId?: string) => Promise<WorkflowInstance[]>;

  // ==================== 事件监听器 ====================
  onWorkflowProgress: (callback: (data: { workflowId: string; progress: number; message?: string }) => void) => void;
  onWorkflowCompleted: (callback: (data: { workflowId: string; result: unknown }) => void) => void;
  onWorkflowError: (callback: (data: { workflowId: string; error: string }) => void) => void;
  onFileChanged: (callback: (data: { filePath: string; event: string }) => void) => void;
  onServiceStatus: (callback: (data: { serviceId: string; status: string }) => void) => void;
  onTaskCreated: (callback: (task: TaskExecution) => void) => void;
  onTaskUpdated: (callback: (taskUpdate: Partial<TaskExecution> & { id: string }) => void) => void;
  onTaskCompleted: (callback: (taskId: string) => void) => void;
  onTaskFailed: (callback: (taskId: string, error: string) => void) => void;
  removeAllListeners: (channel: string) => void;
}


// ==================== 全局类型声明 ====================

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };

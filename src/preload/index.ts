/**
 * Preload脚本 - 主进程与渲染进程之间的安全桥梁
 * 
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 * 
 * 参考：docs/02-technical-blueprint-v1.0.0.md
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ShortcutItem, ProjectConfig, PluginInfo } from '../common/types';
import type { AssetMetadata } from '../shared/types';
import type { ProviderConfig } from '../shared/types';
import type { WorkflowDefinition, WorkflowInstance, WorkflowState } from '../shared/types';
import type { MCPConfig, ModelInfo } from '../shared/types';

/**
 * 暴露给渲染进程的API接口
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 应用相关 ====================

  /**
   * 获取应用版本
   */
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  /**
   * 退出应用
   */
  quitApp: (): Promise<void> => ipcRenderer.invoke('app:quit'),

  /**
   * 重启应用
   */
  restartApp: (): Promise<void> => ipcRenderer.invoke('app:restart'),

  /**
   * 发送日志到主进程
   */
  log: (level: string, message: string, context?: string, data?: unknown): Promise<void> =>
    ipcRenderer.invoke('app:log', level, message, context, data),

  // ==================== 时间服务相关 ====================

  /**
   * 获取当前时间戳（毫秒）
   *
   * 遵循全局时间处理要求：任何涉及时间的文字写入、记录，
   * 必须先通过此函数查询系统时间，确认后方可写入
   */
  getCurrentTime: (): Promise<number> => ipcRenderer.invoke('time:getCurrentTime'),

  // ==================== 窗口相关 ====================

  /**
   * 最小化窗口
   */
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),

  /**
   * 最大化/还原窗口
   */
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('window:maximize'),

  /**
   * 关闭窗口
   */
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),

  /**
   * 检查窗口是否最大化
   */
  isWindowMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),

  // ==================== 快捷方式相关 ====================

  /**
   * 添加快捷方式
   */
  addShortcut: (item: unknown): Promise<unknown> => ipcRenderer.invoke('shortcut:add', item),

  /**
   * 删除快捷方式
   */
  removeShortcut: (id: string): Promise<void> => ipcRenderer.invoke('shortcut:remove', id),

  /**
   * 重新排序快捷方式
   */
  reorderShortcuts: (ids: string[]): Promise<void> => ipcRenderer.invoke('shortcut:reorder', ids),

  /**
   * 获取快捷方式列表
   */
  listShortcuts: (): Promise<ShortcutItem[]> => ipcRenderer.invoke('shortcut:list'),

  // ==================== 项目相关 ====================

  /**
   * 创建项目
   */
  createProject: (name: string, template?: string): Promise<unknown> =>
    ipcRenderer.invoke('project:create', name, template),

  /**
   * 加载项目
   */
  loadProject: (projectId: string): Promise<unknown> =>
    ipcRenderer.invoke('project:load', projectId),

  /**
   * 保存项目
   */
  saveProject: (projectId: string, config: ProjectConfig): Promise<void> =>
    ipcRenderer.invoke('project:save', projectId, config),

  /**
   * 删除项目
   */
  deleteProject: (projectId: string): Promise<void> =>
    ipcRenderer.invoke('project:delete', projectId),

  /**
   * 列出项目
   */
  listProjects: (): Promise<ProjectConfig[]> =>
    ipcRenderer.invoke('project:list'),

  /**
   * 添加输入资产到项目
   */
  addInputAsset: (projectId: string, assetId: string): Promise<void> =>
    ipcRenderer.invoke('project:add-input-asset', projectId, assetId),

  /**
   * 添加输出资产到项目
   */
  addOutputAsset: (projectId: string, assetId: string): Promise<void> =>
    ipcRenderer.invoke('project:add-output-asset', projectId, assetId),

  // ==================== 项目插件配置相关 ====================

  /**
   * 获取项目的插件配置
   */
  getProjectPluginConfig: (projectId: string, pluginId: string): Promise<unknown> =>
    ipcRenderer.invoke('project:getPluginConfig', projectId, pluginId),

  /**
   * 保存项目的插件配置
   */
  saveProjectPluginConfig: (projectId: string, pluginId: string, config: unknown): Promise<void> =>
    ipcRenderer.invoke('project:savePluginConfig', projectId, pluginId, config),

  /**
   * 验证项目的插件配置
   */
  validateProjectPluginConfig: (projectId: string, pluginId: string): Promise<unknown> =>
    ipcRenderer.invoke('project:validatePluginConfig', projectId, pluginId),

  /**
   * 重置项目的插件配置为默认值
   */
  resetProjectPluginConfig: (projectId: string, pluginId: string): Promise<unknown> =>
    ipcRenderer.invoke('project:resetPluginConfig', projectId, pluginId),

  // ==================== 资产相关（重构版） ====================

  /**
   * 获取资产索引
   */
  getAssetIndex: (projectId?: string): Promise<unknown> =>
    ipcRenderer.invoke('asset:get-index', projectId),

  /**
   * 重建资产索引
   */
  rebuildAssetIndex: (projectId?: string): Promise<unknown> =>
    ipcRenderer.invoke('asset:rebuild-index', projectId),

  /**
   * 扫描资产（分页）
   */
  scanAssets: (filter: unknown): Promise<unknown> =>
    ipcRenderer.invoke('asset:scan', filter),

  /**
   * 导入资产
   */
  importAsset: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('asset:import', params),

  /**
   * 删除资产
   */
  deleteAsset: (filePath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('asset:delete', filePath),

  /**
   * 获取资产元数据
   */
  getAssetMetadata: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke('asset:get-metadata', filePath),

  /**
   * 更新资产元数据
   */
  updateAssetMetadata: (filePath: string, updates: Partial<AssetMetadata>): Promise<unknown> =>
    ipcRenderer.invoke('asset:update-metadata', filePath, updates),

  /**
   * 开始监听资产文件变化
   */
  startAssetWatching: (projectId?: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('asset:start-watching', projectId),

  /**
   * 停止监听资产文件变化
   */
  stopAssetWatching: (projectId?: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('asset:stop-watching', projectId),

  /**
   * 打开文件导入对话框
   */
  showImportDialog: (): Promise<string[]> =>
    ipcRenderer.invoke('asset:show-import-dialog'),

  /**
   * 监听资产文件变化事件
   */
  onAssetFileChanged: (callback: (event: {
    eventType: 'add' | 'change' | 'unlink';
    filePath: string;
    projectId?: string;
  }) => void) => {
    ipcRenderer.on('asset:file-changed', (_, data) => callback(data));
  },

  /**
   * 获取资产引用关系
   */
  getAssetReferences: (assetId: string): Promise<string[]> =>
    ipcRenderer.invoke('asset:get-references', assetId),

  // ==================== 工作流相关 ====================

  /**
   * 执行工作流
   */
  executeWorkflow: (config: unknown): Promise<string> =>
    ipcRenderer.invoke('workflow:execute', config),

  /**
   * 获取工作流状态
   */
  getWorkflowStatus: (jobId: string): Promise<unknown> =>
    ipcRenderer.invoke('workflow:status', jobId),

  /**
   * 取消工作流
   */
  cancelWorkflow: (jobId: string): Promise<void> =>
    ipcRenderer.invoke('workflow:cancel', jobId),

  /**
   * 列出工作流
   */
  listWorkflows: (): Promise<WorkflowDefinition[]> =>
    ipcRenderer.invoke('workflow:list'),

  /**
   * 保存工作流
   */
  saveWorkflow: (workflowId: string, config: WorkflowDefinition): Promise<void> =>
    ipcRenderer.invoke('workflow:save', workflowId, config),

  /**
   * 删除工作流
   */
  deleteWorkflow: (workflowId: string): Promise<void> =>
    ipcRenderer.invoke('workflow:delete', workflowId),

  /**
   * 加载工作流
   */
  loadWorkflow: (workflowId: string): Promise<unknown> =>
    ipcRenderer.invoke('workflow:load', workflowId),

  // ==================== 插件相关 ====================

  /**
   * 安装插件
   */
  installPlugin: (pluginPackage: unknown): Promise<void> =>
    ipcRenderer.invoke('plugin:install', pluginPackage),

  /**
   * 卸载插件
   */
  uninstallPlugin: (pluginId: string): Promise<void> =>
    ipcRenderer.invoke('plugin:uninstall', pluginId),

  /**
   * 加载插件
   */
  loadPlugin: (pluginId: string): Promise<unknown> =>
    ipcRenderer.invoke('plugin:load', pluginId),

  /**
   * 执行插件动作
   */
  executePluginAction: (pluginId: string, action: string, params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('plugin:execute', pluginId, action, params),

  /**
   * 列出插件
   */
  listPlugins: (): Promise<PluginInfo[]> =>
    ipcRenderer.invoke('plugin:list'),

  /**
   * 从ZIP文件安装插件
   */
  installPluginFromZip: (zipPath: string, type?: 'official' | 'community'): Promise<unknown> =>
    ipcRenderer.invoke('plugin:installFromZip', zipPath, type),

  /**
   * 获取插件市场列表
   */
  getMarketPlugins: (filter?: unknown): Promise<PluginInfo[]> =>
    ipcRenderer.invoke('plugin:market:list', filter),

  /**
   * 搜索插件市场
   */
  searchMarketPlugins: (keyword: string): Promise<PluginInfo[]> =>
    ipcRenderer.invoke('plugin:market:search', keyword),

  /**
   * 切换插件启用/禁用状态
   */
  togglePlugin: (pluginId: string, enabled: boolean): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('plugin:toggle', pluginId, enabled),

  // ==================== 任务相关 ====================

  /**
   * 获取任务队列列表（右侧面板队列标签页使用）
   */
  listTaskLogs: (filter?: 'running' | 'success' | 'error' | 'all') =>
    ipcRenderer.invoke('task:list', filter),

  /**
   * 创建任务
   */
  createTask: (config: unknown): Promise<string> =>
    ipcRenderer.invoke('task:create', config),

  /**
   * 执行任务
   */
  executeTask: (taskId: string, inputs: unknown): Promise<string> =>
    ipcRenderer.invoke('task:execute', taskId, inputs),

  /**
   * 获取任务状态
   */
  getTaskStatus: (executionId: string): Promise<unknown> =>
    ipcRenderer.invoke('task:status', executionId),

  /**
   * 取消任务
   */
  cancelTask: (executionId: string): Promise<void> =>
    ipcRenderer.invoke('task:cancel', executionId),

  /**
   * 重试任务
   */
  retryTask: (executionId: string): Promise<void> =>
    ipcRenderer.invoke('task:retry', executionId),

  /**
   * 获取任务结果
   */
  getTaskResults: (executionId: string): Promise<unknown> =>
    ipcRenderer.invoke('task:results', executionId),

  // ==================== Provider相关 ====================

  /**
   * 列出所有Provider
   */
  listProviders: (options?: { category?: string; enabledOnly?: boolean }): Promise<ProviderConfig[]> =>
    ipcRenderer.invoke('api:list-providers', options),

  /**
   * 获取单个Provider配置
   */
  getProvider: (providerId: string): Promise<unknown> =>
    ipcRenderer.invoke('api:get-provider', providerId),

  /**
   * 添加Provider配置
   */
  addProvider: (config: unknown): Promise<void> =>
    ipcRenderer.invoke('api:add-provider', config),

  /**
   * 移除Provider配置
   */
  removeProvider: (providerId: string): Promise<void> =>
    ipcRenderer.invoke('api:remove-provider', providerId),

  /**
   * 测试Provider连接
   */
  testProviderConnection: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('api:test-provider-connection', params),

  /**
   * 获取Provider状态
   */
  getProviderStatus: (providerId: string): Promise<unknown> =>
    ipcRenderer.invoke('api:get-provider-status', providerId),

  /**
   * 设置Provider的已选择模型
   */
  setSelectedModels: (providerId: string, selectedModels: string[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('api:set-selected-models', providerId, selectedModels),

  /**
   * 获取Provider的已选择模型
   */
  getSelectedModels: (providerId: string): Promise<{ success: boolean; data?: string[]; error?: string }> =>
    ipcRenderer.invoke('api:get-selected-models', providerId),

  // Template 管理 API

  /**
   * 获取Provider模板
   */
  getProviderTemplate: (typeId: string): Promise<unknown> =>
    ipcRenderer.invoke('template:get', typeId),

  /**
   * 按分类列出Provider模板
   */
  listProviderTemplates: (category: string): Promise<unknown[]> =>
    ipcRenderer.invoke('template:list-by-category', category),

  /**
   * 刷新Provider模板库
   */
  refreshProviderTemplates: (): Promise<void> =>
    ipcRenderer.invoke('template:refresh'),

  // Provider 执行 API（新增 - K03）

  /**
   * 执行文生图操作
   */
  executeTextToImage: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('provider:text-to-image', params),

  /**
   * 执行图生图操作
   */
  executeImageToImage: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('provider:image-to-image', params),

  /**
   * 执行图生视频操作
   */
  executeImageToVideo: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('provider:image-to-video', params),

  /**
   * 检查Provider可用性
   */
  checkProviderAvailability: (providerId: string): Promise<boolean> =>
    ipcRenderer.invoke('provider:check-availability', providerId),

  /**
   * 批量文生图
   */
  batchTextToImage: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('provider:batch-text-to-image', params),

  /**
   * 批量图生视频
   */
  batchImageToVideo: (params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('provider:batch-image-to-video', params),

  // ==================== AI相关 ====================

  /**
   * 提取场景和角色
   */
  extractScenesAndCharacters: (params: { novelText: string; providerId?: string }): Promise<unknown> =>
    ipcRenderer.invoke('ai:extract-scenes-and-characters', params),

  /**
   * 生成角色 Prompt
   */
  generateCharacterPrompt: (params: { characterName: string; context?: string; providerId?: string }): Promise<string> =>
    ipcRenderer.invoke('ai:generate-character-prompt', params),

  /**
   * 生成场景 Prompt
   */
  generateScenePrompt: (params: { sceneName: string; context?: string; providerId?: string }): Promise<string> =>
    ipcRenderer.invoke('ai:generate-scene-prompt', params),

  /**
   * 生成分镜 Prompt
   */
  generateStoryboardPrompt: (params: {
    sceneDescription: string;
    characters: string[];
    characterImages?: Record<string, string>;
    sceneImage?: string;
    providerId?: string;
  }): Promise<string> =>
    ipcRenderer.invoke('ai:generate-storyboard-prompt', params),

  // ==================== Model相关 ====================

  /**
   * 列出所有模型
   */
  listModels: (options?: { category?: string; enabledProvidersOnly?: boolean; includeHidden?: boolean; favoriteOnly?: boolean }): Promise<ModelInfo[]> =>
    ipcRenderer.invoke('model:list', options),

  /**
   * 获取单个模型详情
   */
  getModel: (modelId: string): Promise<unknown> =>
    ipcRenderer.invoke('model:get', modelId),

  /**
   * 添加自定义模型
   */
  addCustomModel: (model: unknown): Promise<void> =>
    ipcRenderer.invoke('model:add-custom', model),

  /**
   * 移除自定义模型
   */
  removeCustomModel: (modelId: string): Promise<void> =>
    ipcRenderer.invoke('model:remove-custom', modelId),

  /**
   * 切换模型可见性
   */
  toggleModelVisibility: (modelId: string, hidden: boolean): Promise<void> =>
    ipcRenderer.invoke('model:toggle-visibility', modelId, hidden),

  /**
   * 切换模型收藏状态
   */
  toggleModelFavorite: (modelId: string, favorite: boolean): Promise<void> =>
    ipcRenderer.invoke('model:toggle-favorite', modelId, favorite),

  /**
   * 设置模型别名
   */
  setModelAlias: (modelId: string, alias: string): Promise<void> =>
    ipcRenderer.invoke('model:set-alias', modelId, alias),

  // ==================== 日志相关 ====================

  /**
   * 获取最近的日志
   * @param limit 返回的最大日志条数
   * @param levelFilter 过滤的日志级别（error/warn/info/debug）
   */
  getRecentLogs: (limit?: number, levelFilter?: string): Promise<unknown[]> =>
    ipcRenderer.invoke('logs:get-recent', limit, levelFilter),

  // ==================== Settings相关 ====================

  /**
   * 获取所有配置
   */
  getAllSettings: (): Promise<unknown> =>
    ipcRenderer.invoke('settings:get-all'),

  /**
   * 保存配置
   */
  saveSettings: (config: unknown): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('settings:save', config),

  /**
   * 打开目录选择对话框
   */
  openDirectoryDialog: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:open-directory'),

  // ==================== 文件系统相关 ====================

  /**
   * 读取文件
   */
  readFile: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke('file:read', filePath),

  /**
   * 写入文件
   */
  writeFile: (filePath: string, content: string | Buffer): Promise<void> =>
    ipcRenderer.invoke('file:write', filePath, content),

  /**
   * 删除文件
   */
  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('file:delete', filePath),

  /**
   * 检查文件是否存在
   */
  fileExists: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('file:exists', filePath),

  /**
   * 列出文件
   */
  listFiles: (dirPath: string): Promise<string[]> =>
    ipcRenderer.invoke('file:list', dirPath),

  /**
   * 监视文件变化
   */
  watchFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('file:watch', filePath),

  /**
   * 取消监视文件
   */
  unwatchFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('file:unwatch', filePath),

  /**
   * 打开文件选择对话框
   */
  selectFiles: (options?: { filters?: Array<{ name: string; extensions: string[] }> }): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke('dialog:selectFiles', options),

  // ==================== MCP服务相关 ====================

  /**
   * 连接MCP服务
   */
  connectMCP: (config: unknown): Promise<void> =>
    ipcRenderer.invoke('mcp:connect', config),

  /**
   * 断开MCP服务
   */
  disconnectMCP: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke('mcp:disconnect', serviceId),

  /**
   * 调用MCP服务
   */
  callMCP: (serviceId: string, method: string, params: unknown): Promise<unknown> =>
    ipcRenderer.invoke('mcp:call', serviceId, method, params),

  /**
   * 获取MCP服务状态
   */
  getMCPStatus: (serviceId: string): Promise<unknown> =>
    ipcRenderer.invoke('mcp:status', serviceId),

  /**
   * 列出MCP服务
   */
  listMCP: (): Promise<MCPConfig[]> =>
    ipcRenderer.invoke('mcp:list'),

  // ==================== 本地服务相关 ====================

  /**
   * 启动本地服务
   */
  startLocal: (serviceId: string, config: unknown): Promise<void> =>
    ipcRenderer.invoke('local:start', serviceId, config),

  /**
   * 停止本地服务
   */
  stopLocal: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke('local:stop', serviceId),

  /**
   * 获取本地服务状态
   */
  getLocalStatus: (serviceId: string): Promise<unknown> =>
    ipcRenderer.invoke('local:status', serviceId),

  /**
   * 重启本地服务
   */
  restartLocal: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke('local:restart', serviceId),

  // ==================== 工作流相关 ====================

  /**
   * 列出所有已注册的工作流定义
   */
  listWorkflowDefinitions: (): Promise<WorkflowDefinition[]> =>
    ipcRenderer.invoke('workflow:listDefinitions'),

  /**
   * 获取工作流定义
   */
  getWorkflowDefinition: (type: string): Promise<unknown> =>
    ipcRenderer.invoke('workflow:getDefinition', type),

  /**
   * 创建工作流实例
   */
  createWorkflowInstance: (params: { type: string; projectId?: string; name?: string; initialData?: unknown }): Promise<unknown> =>
    ipcRenderer.invoke('workflow:createInstance', params),

  /**
   * 加载工作流实例
   */
  loadWorkflowInstance: (workflowId: string): Promise<unknown> =>
    ipcRenderer.invoke('workflow:loadInstance', workflowId),

  /**
   * 保存工作流状态
   */
  saveWorkflowState: (workflowId: string, state: WorkflowState): Promise<void> =>
    ipcRenderer.invoke('workflow:saveState', workflowId, state),

  /**
   * 加载工作流状态
   */
  loadWorkflowState: (workflowId: string): Promise<unknown> =>
    ipcRenderer.invoke('workflow:loadState', workflowId),

  /**
   * 更新当前步骤
   */
  updateWorkflowCurrentStep: (workflowId: string, stepIndex: number): Promise<void> =>
    ipcRenderer.invoke('workflow:updateCurrentStep', workflowId, stepIndex),

  /**
   * 更新步骤状态
   */
  updateWorkflowStepStatus: (workflowId: string, stepId: string, status: string, data?: unknown): Promise<void> =>
    ipcRenderer.invoke('workflow:updateStepStatus', workflowId, stepId, status, data),

  /**
   * 删除工作流实例
   */
  deleteWorkflowInstance: (workflowId: string): Promise<void> =>
    ipcRenderer.invoke('workflow:deleteInstance', workflowId),

  /**
   * 列出工作流实例
   */
  listWorkflowInstances: (projectId?: string): Promise<WorkflowInstance[]> =>
    ipcRenderer.invoke('workflow:listInstances', projectId),

  // ==================== 事件监听 ====================

  /**
   * 监听工作流进度事件
   */
  onWorkflowProgress: (callback: (data: unknown) => void) => {
    ipcRenderer.on('event:workflow:progress', (_, data) => callback(data));
  },

  /**
   * 监听工作流完成事件
   */
  onWorkflowCompleted: (callback: (data: unknown) => void) => {
    ipcRenderer.on('event:workflow:completed', (_, data) => callback(data));
  },

  /**
   * 监听工作流错误事件
   */
  onWorkflowError: (callback: (data: unknown) => void) => {
    ipcRenderer.on('event:workflow:error', (_, data) => callback(data));
  },

  /**
   * 监听文件变化事件
   */
  onFileChanged: (callback: (data: unknown) => void) => {
    ipcRenderer.on('event:file:changed', (_, data) => callback(data));
  },

  /**
   * 监听服务状态事件
   */
  onServiceStatus: (callback: (data: unknown) => void) => {
    ipcRenderer.on('event:service:status', (_, data) => callback(data));
  },

  /**
   * 监听任务创建事件
   */
  onTaskCreated: (callback: (task: unknown) => void) => {
    ipcRenderer.on('task:created', (_, task) => callback(task));
  },

  /**
   * 监听任务更新事件
   */
  onTaskUpdated: (callback: (taskUpdate: unknown) => void) => {
    ipcRenderer.on('task:updated', (_, taskUpdate) => callback(taskUpdate));
  },

  /**
   * 监听任务完成事件
   */
  onTaskCompleted: (callback: (taskId: string) => void) => {
    ipcRenderer.on('task:completed', (_, taskId) => callback(taskId));
  },

  /**
   * 监听任务失败事件
   */
  onTaskFailed: (callback: (taskId: string, error: string) => void) => {
    ipcRenderer.on('task:failed', (_, taskId, error) => callback(taskId, error));
  },

  /**
   * 移除事件监听器
   */
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 初始化日志
// eslint-disable-next-line no-console
console.log('[Preload] Preload script loaded successfully at', new Date().toISOString());
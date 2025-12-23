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
import { timeService } from '../main/services/TimeService';

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

  // ==================== 项目相关 ====================
  
  /**
   * 创建项目
   */
  createProject: (name: string, template?: string): Promise<any> => 
    ipcRenderer.invoke('project:create', name, template),
  
  /**
   * 加载项目
   */
  loadProject: (projectId: string): Promise<any> => 
    ipcRenderer.invoke('project:load', projectId),
  
  /**
   * 保存项目
   */
  saveProject: (projectId: string, config: any): Promise<void> => 
    ipcRenderer.invoke('project:save', projectId, config),
  
  /**
   * 删除项目
   */
  deleteProject: (projectId: string): Promise<void> => 
    ipcRenderer.invoke('project:delete', projectId),
  
  /**
   * 列出项目
   */
  listProjects: (): Promise<any[]> => 
    ipcRenderer.invoke('project:list'),

  // ==================== 资产相关 ====================
  
  /**
   * 添加资产
   */
  addAsset: (scope: string, containerId: string, assetData: any): Promise<any> => 
    ipcRenderer.invoke('asset:add', scope, containerId, assetData),
  
  /**
   * 移除资产
   */
  removeAsset: (scope: string, containerId: string, assetId: string): Promise<void> => 
    ipcRenderer.invoke('asset:remove', scope, containerId, assetId),
  
  /**
   * 更新资产
   */
  updateAsset: (scope: string, containerId: string, assetId: string, updates: any): Promise<void> => 
    ipcRenderer.invoke('asset:update', scope, containerId, assetId, updates),
  
  /**
   * 搜索资产
   */
  searchAssets: (scope: string, containerId: string, query: any): Promise<any[]> => 
    ipcRenderer.invoke('asset:search', scope, containerId, query),
  
  /**
   * 获取资产预览
   */
  getAssetPreview: (scope: string, containerId: string, assetId: string): Promise<string> => 
    ipcRenderer.invoke('asset:preview', scope, containerId, assetId),

  // ==================== 工作流相关 ====================
  
  /**
   * 执行工作流
   */
  executeWorkflow: (config: any): Promise<string> => 
    ipcRenderer.invoke('workflow:execute', config),
  
  /**
   * 获取工作流状态
   */
  getWorkflowStatus: (jobId: string): Promise<any> => 
    ipcRenderer.invoke('workflow:status', jobId),
  
  /**
   * 取消工作流
   */
  cancelWorkflow: (jobId: string): Promise<void> => 
    ipcRenderer.invoke('workflow:cancel', jobId),
  
  /**
   * 列出工作流
   */
  listWorkflows: (): Promise<any[]> => 
    ipcRenderer.invoke('workflow:list'),
  
  /**
   * 保存工作流
   */
  saveWorkflow: (workflowId: string, config: any): Promise<void> => 
    ipcRenderer.invoke('workflow:save', workflowId, config),
  
  /**
   * 加载工作流
   */
  loadWorkflow: (workflowId: string): Promise<any> => 
    ipcRenderer.invoke('workflow:load', workflowId),

  // ==================== 插件相关 ====================
  
  /**
   * 安装插件
   */
  installPlugin: (pluginPackage: any): Promise<void> => 
    ipcRenderer.invoke('plugin:install', pluginPackage),
  
  /**
   * 卸载插件
   */
  uninstallPlugin: (pluginId: string): Promise<void> => 
    ipcRenderer.invoke('plugin:uninstall', pluginId),
  
  /**
   * 加载插件
   */
  loadPlugin: (pluginId: string): Promise<any> => 
    ipcRenderer.invoke('plugin:load', pluginId),
  
  /**
   * 执行插件动作
   */
  executePluginAction: (pluginId: string, action: string, params: any): Promise<any> => 
    ipcRenderer.invoke('plugin:execute', pluginId, action, params),
  
  /**
   * 列出插件
   */
  listPlugins: (): Promise<any[]> => 
    ipcRenderer.invoke('plugin:list'),

  // ==================== 任务相关 ====================
  
  /**
   * 创建任务
   */
  createTask: (config: any): Promise<string> => 
    ipcRenderer.invoke('task:create', config),
  
  /**
   * 执行任务
   */
  executeTask: (taskId: string, inputs: any): Promise<string> => 
    ipcRenderer.invoke('task:execute', taskId, inputs),
  
  /**
   * 获取任务状态
   */
  getTaskStatus: (executionId: string): Promise<any> => 
    ipcRenderer.invoke('task:status', executionId),
  
  /**
   * 取消任务
   */
  cancelTask: (executionId: string): Promise<void> => 
    ipcRenderer.invoke('task:cancel', executionId),
  
  /**
   * 获取任务结果
   */
  getTaskResults: (executionId: string): Promise<any> => 
    ipcRenderer.invoke('task:results', executionId),

  // ==================== API相关 ====================
  
  /**
   * 调用API
   */
  callAPI: (name: string, params: any): Promise<any> => 
    ipcRenderer.invoke('api:call', name, params),
  
  /**
   * 设置API密钥
   */
  setAPIKey: (name: string, key: string): Promise<void> => 
    ipcRenderer.invoke('api:set-key', name, key),
  
  /**
   * 获取API状态
   */
  getAPIStatus: (name: string): Promise<any> => 
    ipcRenderer.invoke('api:get-status', name),
  
  /**
   * 获取API使用情况
   */
  getAPIUsage: (name: string): Promise<any> => 
    ipcRenderer.invoke('api:get-usage', name),

  // ==================== 文件系统相关 ====================
  
  /**
   * 读取文件
   */
  readFile: (filePath: string): Promise<any> => 
    ipcRenderer.invoke('file:read', filePath),
  
  /**
   * 写入文件
   */
  writeFile: (filePath: string, content: any): Promise<void> => 
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
  listFiles: (dirPath: string): Promise<any[]> => 
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

  // ==================== MCP服务相关 ====================
  
  /**
   * 连接MCP服务
   */
  connectMCP: (config: any): Promise<void> => 
    ipcRenderer.invoke('mcp:connect', config),
  
  /**
   * 断开MCP服务
   */
  disconnectMCP: (serviceId: string): Promise<void> => 
    ipcRenderer.invoke('mcp:disconnect', serviceId),
  
  /**
   * 调用MCP服务
   */
  callMCP: (serviceId: string, method: string, params: any): Promise<any> => 
    ipcRenderer.invoke('mcp:call', serviceId, method, params),
  
  /**
   * 获取MCP服务状态
   */
  getMCPStatus: (serviceId: string): Promise<any> => 
    ipcRenderer.invoke('mcp:status', serviceId),
  
  /**
   * 列出MCP服务
   */
  listMCP: (): Promise<any[]> => 
    ipcRenderer.invoke('mcp:list'),

  // ==================== 本地服务相关 ====================
  
  /**
   * 启动本地服务
   */
  startLocal: (serviceId: string, config: any): Promise<void> => 
    ipcRenderer.invoke('local:start', serviceId, config),
  
  /**
   * 停止本地服务
   */
  stopLocal: (serviceId: string): Promise<void> => 
    ipcRenderer.invoke('local:stop', serviceId),
  
  /**
   * 获取本地服务状态
   */
  getLocalStatus: (serviceId: string): Promise<any> => 
    ipcRenderer.invoke('local:status', serviceId),
  
  /**
   * 重启本地服务
   */
  restartLocal: (serviceId: string): Promise<void> => 
    ipcRenderer.invoke('local:restart', serviceId),

  // ==================== 事件监听 ====================
  
  /**
   * 监听工作流进度事件
   */
  onWorkflowProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('event:workflow:progress', (_, data) => callback(data));
  },
  
  /**
   * 监听工作流完成事件
   */
  onWorkflowCompleted: (callback: (data: any) => void) => {
    ipcRenderer.on('event:workflow:completed', (_, data) => callback(data));
  },
  
  /**
   * 监听工作流错误事件
   */
  onWorkflowError: (callback: (data: any) => void) => {
    ipcRenderer.on('event:workflow:error', (_, data) => callback(data));
  },
  
  /**
   * 监听文件变化事件
   */
  onFileChanged: (callback: (data: any) => void) => {
    ipcRenderer.on('event:file:changed', (_, data) => callback(data));
  },
  
  /**
   * 监听服务状态事件
   */
  onServiceStatus: (callback: (data: any) => void) => {
    ipcRenderer.on('event:service:status', (_, data) => callback(data));
  },
  
  /**
   * 移除事件监听器
   */
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// ==================== 类型声明 ====================

/**
 * 扩展Window接口，添加electronAPI属性
 */
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      quitApp: () => Promise<void>;
      restartApp: () => Promise<void>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      isWindowMaximized: () => Promise<boolean>;
      createProject: (name: string, template?: string) => Promise<any>;
      loadProject: (projectId: string) => Promise<any>;
      saveProject: (projectId: string, config: any) => Promise<void>;
      deleteProject: (projectId: string) => Promise<void>;
      listProjects: () => Promise<any[]>;
      addAsset: (scope: string, containerId: string, assetData: any) => Promise<any>;
      removeAsset: (scope: string, containerId: string, assetId: string) => Promise<void>;
      updateAsset: (scope: string, containerId: string, assetId: string, updates: any) => Promise<void>;
      searchAssets: (scope: string, containerId: string, query: any) => Promise<any[]>;
      getAssetPreview: (scope: string, containerId: string, assetId: string) => Promise<string>;
      executeWorkflow: (config: any) => Promise<string>;
      getWorkflowStatus: (jobId: string) => Promise<any>;
      cancelWorkflow: (jobId: string) => Promise<void>;
      listWorkflows: () => Promise<any[]>;
      saveWorkflow: (workflowId: string, config: any) => Promise<void>;
      loadWorkflow: (workflowId: string) => Promise<any>;
      installPlugin: (pluginPackage: any) => Promise<void>;
      uninstallPlugin: (pluginId: string) => Promise<void>;
      loadPlugin: (pluginId: string) => Promise<any>;
      executePluginAction: (pluginId: string, action: string, params: any) => Promise<any>;
      listPlugins: () => Promise<any[]>;
      createTask: (config: any) => Promise<string>;
      executeTask: (taskId: string, inputs: any) => Promise<string>;
      getTaskStatus: (executionId: string) => Promise<any>;
      cancelTask: (executionId: string) => Promise<void>;
      getTaskResults: (executionId: string) => Promise<any>;
      callAPI: (name: string, params: any) => Promise<any>;
      setAPIKey: (name: string, key: string) => Promise<void>;
      getAPIStatus: (name: string) => Promise<any>;
      getAPIUsage: (name: string) => Promise<any>;
      readFile: (filePath: string) => Promise<any>;
      writeFile: (filePath: string, content: any) => Promise<void>;
      deleteFile: (filePath: string) => Promise<void>;
      fileExists: (filePath: string) => Promise<boolean>;
      listFiles: (dirPath: string) => Promise<any[]>;
      watchFile: (filePath: string) => Promise<void>;
      unwatchFile: (filePath: string) => Promise<void>;
      connectMCP: (config: any) => Promise<void>;
      disconnectMCP: (serviceId: string) => Promise<void>;
      callMCP: (serviceId: string, method: string, params: any) => Promise<any>;
      getMCPStatus: (serviceId: string) => Promise<any>;
      listMCP: () => Promise<any[]>;
      startLocal: (serviceId: string, config: any) => Promise<void>;
      stopLocal: (serviceId: string) => Promise<void>;
      getLocalStatus: (serviceId: string) => Promise<any>;
      restartLocal: (serviceId: string) => Promise<void>;
      onWorkflowProgress: (callback: (data: any) => void) => void;
      onWorkflowCompleted: (callback: (data: any) => void) => void;
      onWorkflowError: (callback: (data: any) => void) => void;
      onFileChanged: (callback: (data: any) => void) => void;
      onServiceStatus: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

// 初始化日志
console.log('[Preload] Preload script loaded successfully at', new Date().toISOString());
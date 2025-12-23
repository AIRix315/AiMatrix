import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { WindowManager } from './window';
import { IPCManager } from './ipc/channels';
import { ProjectManager } from './services/project-manager';
import { AssetManager } from './services/asset-manager';
import { PluginManager } from './services/plugin-manager';
import { TaskScheduler } from './services/task-scheduler';
import { APIManager } from './services/api-manager';

class MatrixApp {
  private windowManager: WindowManager;
  private ipcManager: IPCManager;
  private projectManager: ProjectManager;
  private assetManager: AssetManager;
  private pluginManager: PluginManager;
  private taskScheduler: TaskScheduler;
  private apiManager: APIManager;

  constructor() {
    this.windowManager = new WindowManager();
    this.ipcManager = new IPCManager();
    this.projectManager = new ProjectManager();
    this.assetManager = new AssetManager();
    this.pluginManager = new PluginManager();
    this.taskScheduler = new TaskScheduler();
    this.apiManager = new APIManager();

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // 应用就绪事件
    app.whenReady().then(() => {
      this.onReady();
    });

    // 所有窗口关闭事件
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // 应用激活事件
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow();
      }
    });

    // 应用退出前事件
    app.on('before-quit', async () => {
      await this.cleanup();
    });
  }

  private async onReady(): Promise<void> {
    try {
      // 初始化服务
      await this.initializeServices();

      // 创建主窗口
      this.windowManager.createMainWindow();

      // 设置IPC处理器
      this.setupIPCHandlers();

      console.log('Matrix AI Workflow 应用启动成功');
    } catch (error) {
      console.error('应用启动失败:', error);
      app.quit();
    }
  }

  private async initializeServices(): Promise<void> {
    await this.projectManager.initialize();
    await this.assetManager.initialize();
    await this.pluginManager.initialize();
    await this.taskScheduler.initialize();
    await this.apiManager.initialize();
  }

  private setupIPCHandlers(): void {
    // 项目相关IPC处理
    ipcMain.handle('project:create', (_, name, template) => this.projectManager.createProject(name, template));
    ipcMain.handle('project:load', (_, projectId) => this.projectManager.loadProject(projectId));
    ipcMain.handle('project:save', (_, projectId, config) => this.projectManager.saveProject(projectId, config));
    ipcMain.handle('project:delete', (_, projectId) => this.projectManager.deleteProject(projectId));
    ipcMain.handle('project:list', () => this.projectManager.listProjects());

    // 物料相关IPC处理
    ipcMain.handle('asset:add', (_, projectId, assetData) => this.assetManager.addAsset(projectId, assetData));
    ipcMain.handle('asset:remove', (_, projectId, assetId) => this.assetManager.removeAsset(projectId, assetId));
    ipcMain.handle('asset:update', (_, projectId, assetId, updates) => this.assetManager.updateAsset(projectId, assetId, updates));
    ipcMain.handle('asset:search', (_, projectId, query) => this.assetManager.searchAssets(projectId, query));
    ipcMain.handle('asset:preview', (_, projectId, assetId) => this.assetManager.getAssetPreview(projectId, assetId));

    // 插件相关IPC处理
    ipcMain.handle('plugin:install', (_, pluginPackage) => this.pluginManager.installPlugin(pluginPackage));
    ipcMain.handle('plugin:uninstall', (_, pluginId) => this.pluginManager.uninstallPlugin(pluginId));
    ipcMain.handle('plugin:load', (_, pluginId) => this.pluginManager.loadPlugin(pluginId));
    ipcMain.handle('plugin:execute', (_, pluginId, action, params) => this.pluginManager.executePluginAction(pluginId, action, params));
    ipcMain.handle('plugin:list', () => this.pluginManager.listPlugins());

    // 任务相关IPC处理
    ipcMain.handle('task:create', (_, config) => this.taskScheduler.createTask(config));
    ipcMain.handle('task:execute', (_, taskId, inputs) => this.taskScheduler.executeTask(taskId, inputs));
    ipcMain.handle('task:status', (_, executionId) => this.taskScheduler.getTaskStatus(executionId));
    ipcMain.handle('task:cancel', (_, executionId) => this.taskScheduler.cancelTask(executionId));
    ipcMain.handle('task:results', (_, executionId) => this.taskScheduler.getTaskResults(executionId));

    // API相关IPC处理
    ipcMain.handle('api:call', (_, name, params) => this.apiManager.callAPI(name, params));
    ipcMain.handle('api:set-key', (_, name, key) => this.apiManager.setAPIKey(name, key));
    ipcMain.handle('api:get-status', (_, name) => this.apiManager.getAPIStatus(name));
    ipcMain.handle('api:get-usage', (_, name) => this.apiManager.getAPIUsage(name));
  }

  private async cleanup(): Promise<void> {
    try {
      await this.projectManager.cleanup();
      await this.assetManager.cleanup();
      await this.pluginManager.cleanup();
      await this.taskScheduler.cleanup();
      await this.apiManager.cleanup();
      console.log('应用清理完成');
    } catch (error) {
      console.error('应用清理失败:', error);
    }
  }
}

// 创建应用实例
const matrixApp = new MatrixApp();
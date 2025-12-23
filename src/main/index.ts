import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { WindowManager } from './window';
import { IPCManager } from './ipc/channels';
import { ProjectManager } from './services/ProjectManager';
import { AssetManager } from './services/AssetManager';
// 暂时注释掉尚未创建的服务，后续任务中创建
// import { PluginManager } from './services/plugin-manager';
// import { TaskScheduler } from './services/task-scheduler';
// import { APIManager } from './services/api-manager';

class MatrixApp {
  private windowManager: WindowManager;
  private ipcManager: IPCManager;
  private projectManager: ProjectManager;
  private assetManager: AssetManager;
  // 暂时注释掉尚未创建的服务，后续任务中创建
  // private pluginManager: PluginManager;
  // private taskScheduler: TaskScheduler;
  // private apiManager: APIManager;

  constructor() {
    this.windowManager = new WindowManager();
    this.ipcManager = new IPCManager();
    this.projectManager = new ProjectManager();
    this.assetManager = new AssetManager();
    // 暂时注释掉尚未创建的服务，后续任务中创建
    // this.pluginManager = new PluginManager();
    // this.taskScheduler = new TaskScheduler();
    // this.apiManager = new APIManager();

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
    // 暂时注释掉尚未创建的服务，后续任务中创建
    // await this.pluginManager.initialize();
    // await this.taskScheduler.initialize();
    // await this.apiManager.initialize();
    console.log('服务初始化完成（暂时跳过未创建的服务）');
  }

  private setupIPCHandlers(): void {
    // 应用相关IPC处理
    ipcMain.handle('app:version', () => app.getVersion());
    ipcMain.handle('app:quit', () => app.quit());
    ipcMain.handle('app:restart', () => {
      app.relaunch();
      app.exit();
    });

    // 窗口相关IPC处理
    ipcMain.handle('window:minimize', () => {
      const window = BrowserWindow.getFocusedWindow();
      if (window) {
        window.minimize();
      }
    });
    ipcMain.handle('window:maximize', () => {
      const window = BrowserWindow.getFocusedWindow();
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      }
    });
    ipcMain.handle('window:close', () => {
      const window = BrowserWindow.getFocusedWindow();
      if (window) {
        window.close();
      }
    });
    ipcMain.handle('window:isMaximized', () => {
      const window = BrowserWindow.getFocusedWindow();
      return window ? window.isMaximized() : false;
    });

    // 项目相关IPC处理
    ipcMain.handle('project:create', (_, name, template) => this.projectManager.createProject(name, template));
    ipcMain.handle('project:load', (_, projectId) => this.projectManager.loadProject(projectId));
    ipcMain.handle('project:save', (_, projectId, config) => this.projectManager.saveProject(projectId, config));
    ipcMain.handle('project:delete', (_, projectId) => this.projectManager.deleteProject(projectId));
    ipcMain.handle('project:list', () => this.projectManager.listProjects());

    // 资产相关IPC处理
    ipcMain.handle('asset:add', (_, scope, containerId, assetData) => this.assetManager.addAsset({ scope, id: containerId }, assetData));
    ipcMain.handle('asset:remove', (_, scope, containerId, assetId) => this.assetManager.removeAsset(scope, containerId, assetId));
    ipcMain.handle('asset:update', (_, scope, containerId, assetId, updates) => this.assetManager.updateAsset(scope, containerId, assetId, updates));
    ipcMain.handle('asset:search', (_, scope, containerId, query) => this.assetManager.searchAssets(scope, containerId, query));
    ipcMain.handle('asset:preview', (_, scope, containerId, assetId) => this.assetManager.getAssetPreview(scope, containerId, assetId));

    // 工作流相关IPC处理
    ipcMain.handle('workflow:execute', (_, config) => {
      // 暂时返回模拟结果
      return Promise.resolve(`模拟执行工作流: ${JSON.stringify(config)}`);
    });
    ipcMain.handle('workflow:status', (_, jobId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ jobId, status: 'completed', progress: 100 });
    });
    ipcMain.handle('workflow:cancel', (_, jobId) => {
      // 暂时返回模拟结果
      return Promise.resolve(`取消工作流: ${jobId}`);
    });
    ipcMain.handle('workflow:list', () => {
      // 暂时返回模拟结果
      return Promise.resolve([
        { id: 'workflow1', name: '默认工作流', type: 'comfyui' },
        { id: 'workflow2', name: '视频生成', type: 'n8n' }
      ]);
    });
    ipcMain.handle('workflow:save', (_, workflowId, config) => {
      // 暂时返回模拟结果
      return Promise.resolve(`保存工作流: ${workflowId}`);
    });
    ipcMain.handle('workflow:load', (_, workflowId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ id: workflowId, name: '加载的工作流', config: {} });
    });

    // 插件相关IPC处理
    ipcMain.handle('plugin:install', (_, pluginPackage) => {
      // 暂时返回模拟结果
      return Promise.resolve(`安装插件: ${JSON.stringify(pluginPackage)}`);
    });
    ipcMain.handle('plugin:uninstall', (_, pluginId) => {
      // 暂时返回模拟结果
      return Promise.resolve(`卸载插件: ${pluginId}`);
    });
    ipcMain.handle('plugin:load', (_, pluginId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ id: pluginId, name: '加载的插件', isEnabled: true });
    });
    ipcMain.handle('plugin:execute', (_, pluginId, action, params) => {
      // 暂时返回模拟结果
      return Promise.resolve(`执行插件动作: ${pluginId}.${action}(${JSON.stringify(params)})`);
    });
    ipcMain.handle('plugin:list', () => {
      // 暂时返回模拟结果
      return Promise.resolve([
        { id: 'plugin1', name: 'OpenAI插件', type: 'official', isEnabled: true },
        { id: 'plugin2', name: '社区插件', type: 'community', isEnabled: false }
      ]);
    });

    // 任务相关IPC处理
    ipcMain.handle('task:create', (_, config) => {
      // 暂时返回模拟结果
      const taskId = `task_${Date.now()}`;
      return Promise.resolve(taskId);
    });
    ipcMain.handle('task:execute', (_, taskId, inputs) => {
      // 暂时返回模拟结果
      const executionId = `exec_${Date.now()}`;
      return Promise.resolve(executionId);
    });
    ipcMain.handle('task:status', (_, executionId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ executionId, status: 'running', progress: 50 });
    });
    ipcMain.handle('task:cancel', (_, executionId) => {
      // 暂时返回模拟结果
      return Promise.resolve(`取消任务: ${executionId}`);
    });
    ipcMain.handle('task:results', (_, executionId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ executionId, results: { output: '模拟结果' } });
    });

    // API相关IPC处理
    ipcMain.handle('api:call', (_, name, params) => {
      // 暂时返回模拟结果
      return Promise.resolve(`调用API: ${name}(${JSON.stringify(params)})`);
    });
    ipcMain.handle('api:set-key', (_, name, key) => {
      // 暂时返回模拟结果
      return Promise.resolve(`设置API密钥: ${name}`);
    });
    ipcMain.handle('api:get-status', (_, name) => {
      // 暂时返回模拟结果
      return Promise.resolve({ name, status: 'available', lastChecked: new Date().toISOString() });
    });
    ipcMain.handle('api:get-usage', (_, name) => {
      // 暂时返回模拟结果
      return Promise.resolve({ name, usage: { requests: 100, cost: 0.5 } });
    });

    // 文件系统相关IPC处理
    ipcMain.handle('file:read', async (_, filePath) => {
      try {
        const fs = require('fs').promises;
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('file:write', async (_, filePath, content) => {
      try {
        const fs = require('fs').promises;
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('file:delete', async (_, filePath) => {
      try {
        const fs = require('fs').promises;
        await fs.unlink(filePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('file:exists', async (_, filePath) => {
      try {
        const fs = require('fs').promises;
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });
    ipcMain.handle('file:list', async (_, dirPath) => {
      try {
        const fs = require('fs').promises;
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        return items.map((item: any) => {
          console.log('[DEBUG] Processing file item:', item.name, 'isDirectory:', item.isDirectory(), 'isFile:', item.isFile());
          return {
            name: item.name,
            isDirectory: item.isDirectory(),
            isFile: item.isFile()
          };
        });
      } catch (error) {
        return [];
      }
    });
    ipcMain.handle('file:watch', async (_, filePath) => {
      // 暂时返回模拟结果
      return Promise.resolve(`监视文件: ${filePath}`);
    });
    ipcMain.handle('file:unwatch', async (_, filePath) => {
      // 暂时返回模拟结果
      return Promise.resolve(`取消监视文件: ${filePath}`);
    });

    // MCP服务相关IPC处理
    ipcMain.handle('mcp:connect', (_, config) => {
      // 暂时返回模拟结果
      return Promise.resolve(`连接MCP服务: ${JSON.stringify(config)}`);
    });
    ipcMain.handle('mcp:disconnect', (_, serviceId) => {
      // 暂时返回模拟结果
      return Promise.resolve(`断开MCP服务: ${serviceId}`);
    });
    ipcMain.handle('mcp:call', (_, serviceId, method, params) => {
      // 暂时返回模拟结果
      return Promise.resolve(`调用MCP服务: ${serviceId}.${method}(${JSON.stringify(params)})`);
    });
    ipcMain.handle('mcp:status', (_, serviceId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ serviceId, status: 'connected' });
    });
    ipcMain.handle('mcp:list', () => {
      // 暂时返回模拟结果
      return Promise.resolve([
        { id: 'mcp1', name: '文件系统MCP', status: 'connected' },
        { id: 'mcp2', name: '时间服务MCP', status: 'connected' }
      ]);
    });

    // 本地服务相关IPC处理
    ipcMain.handle('local:start', (_, serviceId, config) => {
      // 暂时返回模拟结果
      return Promise.resolve(`启动本地服务: ${serviceId}`);
    });
    ipcMain.handle('local:stop', (_, serviceId) => {
      // 暂时返回模拟结果
      return Promise.resolve(`停止本地服务: ${serviceId}`);
    });
    ipcMain.handle('local:status', (_, serviceId) => {
      // 暂时返回模拟结果
      return Promise.resolve({ serviceId, status: 'running' });
    });
    ipcMain.handle('local:restart', (_, serviceId) => {
      // 暂时返回模拟结果
      return Promise.resolve(`重启本地服务: ${serviceId}`);
    });

    console.log('IPC处理器设置完成');
  }

  private async cleanup(): Promise<void> {
    try {
      await this.projectManager.cleanup();
      await this.assetManager.cleanup();
      // 暂时注释掉尚未创建的服务清理，后续任务中创建
      // await this.pluginManager.cleanup();
      // await this.taskScheduler.cleanup();
      // await this.apiManager.cleanup();
      console.log('应用清理完成（暂时跳过未创建的服务）');
    } catch (error) {
      console.error('应用清理失败:', error);
    }
  }
}

// 创建应用实例
const matrixApp = new MatrixApp();
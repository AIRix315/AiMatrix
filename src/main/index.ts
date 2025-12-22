import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { WindowManager } from './window';
import { IPCManager } from './ipc/channels';
import { FileManager } from './services/file-manager';
import { WorkflowManager } from './services/workflow-manager';
import { MCPService } from './services/mcp-service';
import { LocalServiceManager } from './services/local-service';

class MatrixApp {
  private windowManager: WindowManager;
  private ipcManager: IPCManager;
  private fileManager: FileManager;
  private workflowManager: WorkflowManager;
  private mcpService: MCPService;
  private localServiceManager: LocalServiceManager;

  constructor() {
    this.windowManager = new WindowManager();
    this.ipcManager = new IPCManager();
    this.fileManager = new FileManager();
    this.workflowManager = new WorkflowManager();
    this.mcpService = new MCPService();
    this.localServiceManager = new LocalServiceManager();

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
    await this.fileManager.initialize();
    await this.workflowManager.initialize();
    await this.mcpService.initialize();
    await this.localServiceManager.initialize();
  }

  private setupIPCHandlers(): void {
    // 项目相关IPC处理
    ipcMain.handle('project:create', (_, name) => this.fileManager.createProject(name));
    ipcMain.handle('project:load', (_, path) => this.fileManager.loadProject(path));
    ipcMain.handle('project:save', (_, config) => this.fileManager.saveProject(config));

    // 工作流相关IPC处理
    ipcMain.handle('workflow:execute', (_, config) => this.workflowManager.execute(config));
    ipcMain.handle('workflow:status', (_, jobId) => this.workflowManager.getStatus(jobId));
    ipcMain.handle('workflow:cancel', (_, jobId) => this.workflowManager.cancel(jobId));

    // MCP服务相关IPC处理
    ipcMain.handle('mcp:connect', (_, config) => this.mcpService.connect(config));
    ipcMain.handle('mcp:disconnect', () => this.mcpService.disconnect());
    ipcMain.handle('mcp:call', (_, method, params) => this.mcpService.call(method, params));

    // 本地服务相关IPC处理
    ipcMain.handle('local:start', (_, serviceType) => this.localServiceManager.startService(serviceType));
    ipcMain.handle('local:stop', (_, serviceType) => this.localServiceManager.stopService(serviceType));
    ipcMain.handle('local:status', (_, serviceType) => this.localServiceManager.getServiceStatus(serviceType));
  }

  private async cleanup(): Promise<void> {
    try {
      await this.mcpService.disconnect();
      await this.localServiceManager.stopAllServices();
      await this.fileManager.cleanup();
      console.log('应用清理完成');
    } catch (error) {
      console.error('应用清理失败:', error);
    }
  }
}

// 创建应用实例
const matrixApp = new MatrixApp();
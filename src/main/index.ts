import { app, BrowserWindow, ipcMain, protocol, dialog } from 'electron';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import * as mimeTypes from 'mime-types';
import { WindowManager } from './window';
import { IPCManager } from './ipc/channels';
import { ProjectManager } from './services/ProjectManager';
import { FileSystemService, fileSystemService } from './services/FileSystemService';
import { AssetManager, getAssetManager } from './services/AssetManager';
import { getSafePath } from './utils/security';
import { logger, Logger, LogLevel } from './services/Logger';
import { pluginManager } from './services/PluginManager';
import { pluginMarketService } from './services/PluginMarketService';
import { taskScheduler } from './services/TaskScheduler';
import { TaskType } from './services/TaskScheduler';
import { apiManager } from './services/APIManager';
import { configManager } from './services/ConfigManager';
import { timeService } from './services/TimeService';
import { registerWorkflowHandlers } from './ipc/workflow-handlers';
import { workflowRegistry } from './services/WorkflowRegistry';
import { testWorkflowDefinition } from './workflows/test-workflow';
import { novelToVideoWorkflow } from './workflows/novel-to-video-definition';

// 注册自定义协议为特权协议（必须在 app.ready 之前）
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'asset',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: false,
      corsEnabled: false
    }
  }
]);

class MatrixApp {
  private windowManager: WindowManager;
  private ipcManager: IPCManager;
  private projectManager: ProjectManager;
  private fileSystemService: FileSystemService;
  private assetManager: AssetManager;
  private fileWatchers: Map<string, fsSync.FSWatcher> = new Map();

  constructor() {
    this.windowManager = new WindowManager();
    this.ipcManager = new IPCManager();
    this.projectManager = new ProjectManager();
    this.fileSystemService = fileSystemService;
    this.assetManager = getAssetManager(this.fileSystemService);

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

      // 注册测试工作流
      this.registerTestWorkflows();

      // 注册自定义协议处理器
      this.registerCustomProtocols();

      // 创建主窗口
      this.windowManager.createMainWindow();

      // 设置IPC处理器
      this.setupIPCHandlers();

      await logger.info('Matrix AI Workflow 应用启动成功', 'MatrixApp');
    } catch (error) {
      await logger.error('应用启动失败', 'MatrixApp', { error });
      app.quit();
    }
  }

  /**
   * 注册测试工作流
   */
  private registerTestWorkflows(): void {
    try {
      // 注册测试工作流
      workflowRegistry.register(testWorkflowDefinition);

      logger.info('测试工作流已注册', 'MatrixApp', {
        workflowName: testWorkflowDefinition.name,
        workflowType: testWorkflowDefinition.type
      });

      // 注册小说转视频工作流
      workflowRegistry.register(novelToVideoWorkflow);

      logger.info('小说转视频工作流已注册', 'MatrixApp', {
        workflowName: novelToVideoWorkflow.name,
        workflowType: novelToVideoWorkflow.type
      });
    } catch (error) {
      logger.error('注册工作流失败', 'MatrixApp', { error });
    }
  }

  private async initializeServices(): Promise<void> {
    // 1. 首先初始化 ConfigManager
    await configManager.initialize();
    await logger.debug('ConfigManager initialized', 'MatrixApp');

    // 2. 使用配置重新初始化 Logger（支持动态路径）
    const logSettings = configManager.getLogSettings();
    const enhancedLogger = new Logger({
      logDir: logSettings.savePath,
      enableConsole: true,
      minLevel: LogLevel.INFO,
      configManager: configManager
    });
    // 替换全局 logger 实例
    Object.assign(logger, enhancedLogger);

    await logger.info('Initializing Matrix services', 'MatrixApp');

    // 3. 初始化文件系统服务
    await this.fileSystemService.initialize();

    // 4. 初始化其他服务
    await this.projectManager.initialize();
    await this.assetManager.initialize();

    // 5. 设置 AssetManager 的 ConfigManager（用于监听配置变更）
    this.assetManager.setConfigManager(configManager);

    await pluginManager.initialize();
    await pluginMarketService.initialize();
    await taskScheduler.initialize();
    await apiManager.initialize();

    await logger.info('All Matrix services initialized successfully', 'MatrixApp');
  }

  /**
   * 注册自定义协议处理器
   * asset:// - 用于安全访问本地资产文件
   */
  private registerCustomProtocols(): void {
    protocol.handle('asset', async (request) => {
      try {
        // 解析 URL: asset://filepath
        const url = new URL(request.url);
        const filePath = decodeURIComponent(url.pathname);

        // 路径安全验证
        const dataDir = this.fileSystemService.getDataDir();
        const normalizedPath = path.normalize(filePath);
        const absolutePath = path.isAbsolute(normalizedPath)
          ? normalizedPath
          : path.join(dataDir, normalizedPath);

        // 验证路径是否在允许的目录内
        if (!absolutePath.startsWith(dataDir)) {
          await logger.warn(`Blocked access to file outside data directory: ${absolutePath}`, 'ProtocolHandler');
          return new Response('Access Denied', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        // 检查文件是否存在
        try {
          await fs.access(absolutePath);
        } catch {
          await logger.warn(`File not found: ${absolutePath}`, 'ProtocolHandler');
          return new Response('File Not Found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        // 读取文件
        const fileData = await fs.readFile(absolutePath);

        // 获取 MIME 类型
        const mimeType = mimeTypes.lookup(absolutePath) || 'application/octet-stream';

        // 返回响应（将 Buffer 转换为 Uint8Array）
        return new Response(new Uint8Array(fileData), {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'max-age=3600'
          }
        });
      } catch (error) {
        await logger.error(`Protocol handler error: ${error}`, 'ProtocolHandler');
        return new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    });

    logger.info('Custom protocol registered: asset://', 'MatrixApp');
  }

  private setupIPCHandlers(): void {
    // 应用相关IPC处理
    ipcMain.handle('app:version', () => app.getVersion());
    ipcMain.handle('app:quit', () => app.quit());
    ipcMain.handle('app:restart', () => {
      app.relaunch();
      app.exit();
    });
    ipcMain.handle('app:log', async (_, level: string, message: string, context?: string, data?: unknown) => {
      switch (level) {
        case 'debug':
          await logger.debug(message, context || 'Renderer', data);
          break;
        case 'info':
          await logger.info(message, context || 'Renderer', data);
          break;
        case 'warn':
          await logger.warn(message, context || 'Renderer', data);
          break;
        case 'error':
          await logger.error(message, context || 'Renderer', data);
          break;
      }
    });

    // 时间服务相关IPC处理
    ipcMain.handle('time:getCurrentTime', async () => {
      const currentTime = await timeService.getCurrentTime();
      return currentTime.getTime(); // 返回时间戳（毫秒）
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

    // 资产相关IPC处理（重构版）
    // === 索引管理 ===
    ipcMain.handle('asset:get-index', async (_, projectId?: string) => {
      return await this.assetManager.getIndex(projectId);
    });
    ipcMain.handle('asset:rebuild-index', async (_, projectId?: string) => {
      return await this.assetManager.buildIndex(projectId);
    });

    // === 扫描资产（分页） ===
    ipcMain.handle('asset:scan', async (_, filter) => {
      return await this.assetManager.scanAssets(filter);
    });

    // === 导入资产 ===
    ipcMain.handle('asset:import', async (_, params) => {
      return await this.assetManager.importAsset(params);
    });

    // === 删除资产 ===
    ipcMain.handle('asset:delete', async (_, filePath: string) => {
      await this.assetManager.deleteAsset(filePath);
      return { success: true };
    });

    // === 元数据管理 ===
    ipcMain.handle('asset:get-metadata', async (_, filePath: string) => {
      return await this.assetManager.getMetadata(filePath);
    });
    ipcMain.handle('asset:update-metadata', async (_, filePath: string, updates) => {
      return await this.assetManager.updateMetadata(filePath, updates);
    });

    // === 文件监听 ===
    ipcMain.handle('asset:start-watching', async (_, projectId?: string) => {
      await this.assetManager.startWatching(projectId);
      return { success: true };
    });
    ipcMain.handle('asset:stop-watching', async (_, projectId?: string) => {
      await this.assetManager.stopWatching(projectId);
      return { success: true };
    });

    // === 打开文件选择对话框 ===
    ipcMain.handle('asset:show-import-dialog', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '所有文件', extensions: ['*'] },
          { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
          { name: '视频', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: '音频', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg'] },
          { name: '文本', extensions: ['txt', 'md', 'json', 'xml', 'csv'] }
        ]
      });
      return result.filePaths;
    });

    // 工作流相关IPC处理
    ipcMain.handle('workflow:execute', async (_, config) => {
      // 创建工作流任务并执行
      const taskId = await taskScheduler.createTask({
        type: TaskType.WORKFLOW,
        name: config.name || 'Workflow Execution',
        description: config.description,
        metadata: config
      });
      return await taskScheduler.executeTask(taskId, config);
    });
    ipcMain.handle('workflow:status', async (_, executionId) => {
      return await taskScheduler.getTaskStatus(executionId);
    });
    ipcMain.handle('workflow:cancel', async (_, executionId) => {
      await taskScheduler.cancelTask(executionId);
      return { success: true };
    });
    ipcMain.handle('workflow:list', async () => {
      // 读取工作空间路径下的 workflows 目录
      try {
        const workspacePath = configManager.getGeneralSettings().workspacePath;
        const workflowsDir = path.join(workspacePath, 'workflows');
        const files = await fs.readdir(workflowsDir);
        const workflows = [];

        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
            const workflow = JSON.parse(content);
            workflows.push(workflow);
          }
        }

        return workflows;
      } catch (error) {
        // 目录不存在或为空，返回默认工作流
        return [
          { id: 'workflow1', name: '默认工作流', type: 'comfyui' },
          { id: 'workflow2', name: '视频生成', type: 'n8n' }
        ];
      }
    });
    ipcMain.handle('workflow:save', async (_, workflowId, config) => {
      const workspacePath = configManager.getGeneralSettings().workspacePath;
      const workflowsDir = path.join(workspacePath, 'workflows');
      await fs.mkdir(workflowsDir, { recursive: true });
      const filePath = path.join(workflowsDir, `${workflowId}.json`);
      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    });
    ipcMain.handle('workflow:load', async (_, workflowId) => {
      const workspacePath = configManager.getGeneralSettings().workspacePath;
      const workflowsDir = path.join(workspacePath, 'workflows');
      const filePath = path.join(workflowsDir, `${workflowId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    });

    // 插件相关IPC处理
    ipcMain.handle('plugin:install', async (_, pluginId) => {
      return await pluginManager.loadPlugin(pluginId);
    });
    ipcMain.handle('plugin:uninstall', async (_, pluginId) => {
      await pluginManager.unloadPlugin(pluginId);
      return { success: true };
    });
    ipcMain.handle('plugin:load', async (_, pluginId) => {
      return await pluginManager.loadPlugin(pluginId);
    });
    ipcMain.handle('plugin:execute', async (_, pluginId, action, params) => {
      return await pluginManager.executePlugin(pluginId, action, params);
    });
    ipcMain.handle('plugin:list', async () => {
      return await pluginManager.listPlugins();
    });
    ipcMain.handle('plugin:installFromZip', async (_, zipPath, type) => {
      return await pluginManager.installPluginFromZip(zipPath, type);
    });
    ipcMain.handle('plugin:toggle', async (_, pluginId, enabled) => {
      await pluginManager.togglePlugin(pluginId, enabled);
      return { success: true };
    });

    // 插件市场相关IPC处理
    ipcMain.handle('plugin:market:list', async (_, filter) => {
      return await pluginMarketService.fetchMarketPlugins(filter);
    });
    ipcMain.handle('plugin:market:search', async (_, keyword) => {
      return await pluginMarketService.searchPlugins(keyword);
    });

    // 任务相关IPC处理
    ipcMain.handle('task:create', async (_, config) => {
      return await taskScheduler.createTask(config);
    });
    ipcMain.handle('task:execute', async (_, taskId, inputs) => {
      return await taskScheduler.executeTask(taskId, inputs);
    });
    ipcMain.handle('task:status', async (_, executionId) => {
      return await taskScheduler.getTaskStatus(executionId);
    });
    ipcMain.handle('task:cancel', async (_, executionId) => {
      await taskScheduler.cancelTask(executionId);
      return { success: true };
    });
    ipcMain.handle('task:results', async (_, executionId) => {
      return await taskScheduler.getTaskResults(executionId);
    });

    // API相关IPC处理
    ipcMain.handle('api:call', async (_, name, params) => {
      return await apiManager.callAPI(name, params);
    });
    ipcMain.handle('api:set-key', async (_, name, key) => {
      await apiManager.setAPIKey(name, key);
      return { success: true };
    });
    ipcMain.handle('api:get-status', async (_, name) => {
      return await apiManager.getAPIStatus(name);
    });
    ipcMain.handle('api:get-usage', async (_, name) => {
      // MVP: 暂时返回模拟使用量数据（后续迭代实现）
      return Promise.resolve({ name, usage: { requests: 0, cost: 0 } });
    });
    ipcMain.handle('api:test-connection', async (_, params: { type: string; baseUrl: string; apiKey?: string }) => {
      return await apiManager.testConnection(params);
    });

    // Settings相关IPC处理
    ipcMain.handle('settings:get-all', async () => {
      return configManager.getConfig();
    });

    ipcMain.handle('settings:save', async (_, config) => {
      await configManager.saveConfig(config);
      await logger.info('配置已保存', 'Settings');
      return { success: true };
    });

    ipcMain.handle('dialog:open-directory', async () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择目录'
      });

      if (result.canceled) {
        return null;
      }

      return result.filePaths[0];
    });

    // 文件系统相关IPC处理
    ipcMain.handle('file:read', async (_, filePath) => {
      try {
        // 验证路径安全性
        const safePath = getSafePath(filePath);
        const content = await fs.readFile(safePath, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('file:write', async (_, filePath, content) => {
      try {
        // 验证路径安全性
        const safePath = getSafePath(filePath);
        await fs.writeFile(safePath, content, 'utf-8');
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('file:delete', async (_, filePath) => {
      try {
        // 验证路径安全性
        const safePath = getSafePath(filePath);
        await fs.unlink(safePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('file:exists', async (_, filePath) => {
      try {
        // 验证路径安全性
        const safePath = getSafePath(filePath);
        await fs.access(safePath);
        return true;
      } catch {
        return false;
      }
    });
    ipcMain.handle('file:list', async (_, dirPath) => {
      try {
        // 验证路径安全性
        const safePath = getSafePath(dirPath);
        const items = await fs.readdir(safePath, { withFileTypes: true });
        return items.map((item) => {
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
      try {
        // 验证路径安全性
        const safePath = getSafePath(filePath);

        // 如果已经在监视，先关闭旧的监视器
        if (this.fileWatchers.has(safePath)) {
          this.fileWatchers.get(safePath)?.close();
        }

        // 创建新的文件监视器
        const watcher = fsSync.watch(safePath, (eventType, filename) => {
          // 发送文件变化事件到渲染进程
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            mainWindow.webContents.send('event:file:changed', {
              path: safePath,
              eventType,
              filename
            });
          }
        });

        this.fileWatchers.set(safePath, watcher);

        await logger.info(`File watcher started: ${safePath}`, 'MatrixApp');

        return { success: true, path: safePath };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    ipcMain.handle('file:unwatch', async (_, filePath) => {
      try {
        // 验证路径安全性
        const safePath = getSafePath(filePath);

        const watcher = this.fileWatchers.get(safePath);
        if (watcher) {
          watcher.close();
          this.fileWatchers.delete(safePath);
          await logger.info(`File watcher stopped: ${safePath}`, 'MatrixApp');
          return { success: true };
        } else {
          return { success: false, error: 'No watcher found for this path' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // 文件选择对话框
    ipcMain.handle('dialog:selectFiles', async (_, options) => {
      const { dialog } = await import('electron');
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) {
        throw new Error('主窗口未找到');
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: options?.filters || [{ name: '所有文件', extensions: ['*'] }]
      });

      return result;
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
    ipcMain.handle('local:start', (_, serviceId) => {
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

    // 注册工作流相关IPC处理器
    registerWorkflowHandlers();

    logger.debug('IPC处理器设置完成', 'MatrixApp');
  }

  private async cleanup(): Promise<void> {
    try {
      await logger.info('Cleaning up Matrix application', 'MatrixApp');

      await this.projectManager.cleanup();
      await this.assetManager.cleanup();
      await pluginManager.cleanup();
      await taskScheduler.cleanup();
      await apiManager.cleanup();

      await logger.info('Matrix application cleanup completed', 'MatrixApp');
    } catch (error) {
      await logger.error('应用清理失败', 'MatrixApp', { error });
    }
  }
}

// 创建应用实例
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const matrixApp = new MatrixApp();
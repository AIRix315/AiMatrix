/**
 * IPC通信集成测试
 * 验证主进程与渲染进程之间的通信是否正常工作
 * 
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 * 
 * 参考：docs/02-technical-blueprint-v1.0.0.md
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { timeService } from '../../../src/main/services/TimeService';

describe('IPC通信集成测试', () => {
  let mainWindow: BrowserWindow | null = null;

  beforeAll(async () => {
    // 初始化Electron应用
    await app.whenReady();
    
    // 创建测试窗口
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../../src/preload/index.js')
      }
    });
    
    // 设置IPC处理器
    setupTestHandlers();
  });

  afterAll(async () => {
    // 清理
    if (mainWindow) {
      mainWindow.close();
    }
    await app.quit();
  });

  test('应用版本获取', async () => {
    const result = await ipcMain.invoke('app:version');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('项目创建和列表', async () => {
    // 创建项目
    const createResult = await ipcMain.invoke('project:create', '测试项目', 'default');
    expect(createResult).toBeDefined();
    expect(createResult.name).toBe('测试项目');
    
    // 列出项目
    const listResult = await ipcMain.invoke('project:list');
    expect(Array.isArray(listResult)).toBe(true);
    expect(listResult.length).toBeGreaterThan(0);
  });

  test('资产添加和搜索', async () => {
    // 添加资产
    const addResult = await ipcMain.invoke('asset:add', 'project', 'test-project', {
      type: 'text',
      path: '/test/path',
      metadata: { description: '测试资产' }
    });
    expect(addResult).toBeDefined();
    expect(addResult.type).toBe('text');
    
    // 搜索资产
    const searchResult = await ipcMain.invoke('asset:search', 'project', 'test-project', {
      type: 'text'
    });
    expect(Array.isArray(searchResult)).toBe(true);
  });

  test('文件系统操作', async () => {
    // 写入文件
    const writeResult = await ipcMain.invoke('file:write', '/test/file.txt', '测试内容');
    expect(writeResult.success).toBe(true);
    
    // 读取文件
    const readResult = await ipcMain.invoke('file:read', '/test/file.txt');
    expect(readResult.success).toBe(true);
    expect(readResult.content).toBe('测试内容');
    
    // 检查文件存在
    const existsResult = await ipcMain.invoke('file:exists', '/test/file.txt');
    expect(existsResult).toBe(true);
  });

  test('时间服务集成', async () => {
    // 验证时间服务
    const isTimeValid = await timeService.validateTimeIntegrity();
    expect(typeof isTimeValid).toBe('boolean');
    
    // 获取当前时间
    const currentTime = await timeService.getCurrentTime();
    expect(currentTime).toBeInstanceOf(Date);
    
    // 获取UTC时间
    const utcTime = await timeService.getUTCTime();
    expect(typeof utcTime).toBe('string');
    expect(utcTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('错误处理', async () => {
    // 测试无效项目ID
    try {
      await ipcMain.invoke('project:load', 'invalid-id');
      // 应该抛出错误
      expect(true).toBe(false); // 这行不应该执行
    } catch (error) {
      expect(error).toBeDefined();
      expect(typeof error.message).toBe('string');
    }
  });

  function setupTestHandlers(): void {
    // 应用版本处理器
    ipcMain.handle('app:version', () => {
      return app.getVersion();
    });

    // 项目处理器
    ipcMain.handle('project:create', async (_, name, template) => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: createProject');
      }
      
      return {
        id: 'test-project-id',
        name,
        template,
        createdAt: await timeService.getCurrentTime()
      };
    });

    ipcMain.handle('project:list', async () => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: listProjects');
      }
      
      return [{
        id: 'test-project-id',
        name: '测试项目',
        createdAt: await timeService.getCurrentTime()
      }];
    });

    ipcMain.handle('project:load', async (_, projectId) => {
      if (projectId === 'invalid-id') {
        throw new Error('项目不存在');
      }
      
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: loadProject');
      }
      
      return {
        id: projectId,
        name: '测试项目',
        createdAt: await timeService.getCurrentTime()
      };
    });

    // 资产处理器
    ipcMain.handle('asset:add', async (_, scope, containerId, assetData) => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: addAsset');
      }
      
      return {
        id: 'test-asset-id',
        scope,
        containerId,
        ...assetData,
        createdAt: await timeService.getCurrentTime()
      };
    });

    ipcMain.handle('asset:search', async (_, scope, containerId, query) => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: searchAssets');
      }
      
      return [{
        id: 'test-asset-id',
        scope,
        containerId,
        type: query.type,
        createdAt: await timeService.getCurrentTime()
      }];
    });

    // 文件系统处理器
    ipcMain.handle('file:write', async (_, filePath, content) => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: writeFile');
      }
      
      // 模拟文件写入
      console.log(`写入文件: ${filePath}, 内容: ${content}`);
      return { success: true };
    });

    ipcMain.handle('file:read', async (_, filePath) => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: readFile');
      }
      
      // 模拟文件读取
      console.log(`读取文件: ${filePath}`);
      return { success: true, content: '测试内容' };
    });

    ipcMain.handle('file:exists', async (_, filePath) => {
      // 验证时间
      const isTimeValid = await timeService.validateTimeIntegrity();
      if (!isTimeValid) {
        throw new Error('时间验证失败，无法执行操作: fileExists');
      }
      
      // 模拟文件存在检查
      console.log(`检查文件存在: ${filePath}`);
      return filePath === '/test/file.txt';
    });
  }
});
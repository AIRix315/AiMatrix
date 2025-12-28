import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PluginManager, PluginManifest } from '../../../src/main/services/PluginManager';
import { promises as fs } from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { PluginType } from '../../../src/common/types';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return process.cwd();
      if (name === 'temp') return path.join(process.cwd(), 'temp');
      return process.cwd();
    }),
  }
}));

vi.mock('../../../src/main/services/TimeService', () => ({
  timeService: {
    getCurrentTime: vi.fn(() => Promise.resolve(new Date('2025-12-29T10:00:00Z'))),
    validateTimeIntegrity: vi.fn(() => Promise.resolve(true)),
  }
}));

vi.mock('../../../src/main/services/ConfigManager', () => ({
  configManager: {
    getConfig: vi.fn(() => ({ plugins: {} })),
    updateConfig: vi.fn(async () => {}),
  }
}));

describe('PluginManager - 真实文件系统测试', () => {
  let pluginManager: PluginManager;
  let testPluginsDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    testPluginsDir = path.join(originalCwd, 'test-data', `plugin-test-${Date.now()}`);

    pluginManager = new PluginManager(testPluginsDir);
    await pluginManager.initialize();
  });

  afterEach(async () => {
    try {
      await pluginManager.cleanup();
    } catch (error) {
      console.warn('清理 PluginManager 失败:', error);
    }

    try {
      await fs.rm(testPluginsDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('initialize', () => {
    it('应该创建插件目录结构', async () => {
      const officialDir = path.join(testPluginsDir, 'official');
      const partnerDir = path.join(testPluginsDir, 'partner');
      const communityDir = path.join(testPluginsDir, 'community');

      const officialStats = await fs.stat(officialDir);
      const partnerStats = await fs.stat(partnerDir);
      const communityStats = await fs.stat(communityDir);

      expect(officialStats.isDirectory()).toBe(true);
      expect(partnerStats.isDirectory()).toBe(true);
      expect(communityStats.isDirectory()).toBe(true);
    });

    it('应该自动加载official目录的插件', async () => {
      const pluginId = 'auto-load-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Auto Load Test',
        version: '1.0.0',
        description: 'Test auto load',
        author: 'Test',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {}, execute: async () => ({ success: true }) };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      const newManager = new PluginManager(testPluginsDir);
      await newManager.initialize();

      const plugins = await newManager.listPlugins();
      const hasPlugin = plugins.some(p => p.id === pluginId);

      expect(hasPlugin).toBe(true);

      await newManager.cleanup();
    });

    it('应该在目录已存在时不重复创建', async () => {
      const newManager = new PluginManager(testPluginsDir);
      await newManager.initialize();

      const officialDir = path.join(testPluginsDir, 'official');
      const stats = await fs.stat(officialDir);
      expect(stats.isDirectory()).toBe(true);

      await newManager.cleanup();
    });
  });

  describe('readManifest', () => {
    it('应该成功读取manifest文件', async () => {
      const pluginDir = path.join(testPluginsDir, 'test-plugin');
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        type: 'workflow',
        permissions: ['file_system'],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const result = await pluginManager['readManifest'](pluginDir);

      expect(result).toMatchObject(manifest);
    });

    it('应该在manifest缺少必需字段时抛出错误', async () => {
      const pluginDir = path.join(testPluginsDir, 'invalid-plugin');
      await fs.mkdir(pluginDir, { recursive: true });

      const invalidManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(invalidManifest),
        'utf-8'
      );

      await expect(
        pluginManager['readManifest'](pluginDir)
      ).rejects.toThrow();
    });

    it('应该在文件不存在时抛出错误', async () => {
      const nonExistentDir = path.join(testPluginsDir, 'non-existent');

      await expect(
        pluginManager['readManifest'](nonExistentDir)
      ).rejects.toThrow();
    });

    it('应该在JSON解析失败时抛出错误', async () => {
      const pluginDir = path.join(testPluginsDir, 'bad-json-plugin');
      await fs.mkdir(pluginDir, { recursive: true });

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        'invalid json content',
        'utf-8'
      );

      await expect(
        pluginManager['readManifest'](pluginDir)
      ).rejects.toThrow();
    });
  });

  describe('loadPlugin', () => {
    it('应该从official目录加载插件', async () => {
      const pluginId = 'official-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Official Test Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {}, execute: async () => ({ result: "ok" }) };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      const info = await pluginManager.loadPlugin(pluginId);

      expect(info.id).toBe(pluginId);
      expect(info.name).toBe('Official Test Plugin');
      expect(info.type).toBe(PluginType.OFFICIAL);
    });

    it('应该从partner目录加载插件', async () => {
      const pluginId = 'partner-test';
      const pluginDir = path.join(testPluginsDir, 'partner', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Partner Test Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      const info = await pluginManager.loadPlugin(pluginId);

      expect(info.id).toBe(pluginId);
      expect(info.type).toBe(PluginType.PARTNER);
    });

    it('应该从community目录加载插件', async () => {
      const pluginId = 'community-test';
      const pluginDir = path.join(testPluginsDir, 'community', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Community Test Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      const info = await pluginManager.loadPlugin(pluginId);

      expect(info.id).toBe(pluginId);
      expect(info.type).toBe(PluginType.COMMUNITY);
    });

    it('应该在插件不存在时抛出错误', async () => {
      await expect(
        pluginManager.loadPlugin('non-existent-plugin')
      ).rejects.toThrow('Plugin not found');
    });

    it('应该在主文件不存在时抛出错误', async () => {
      const pluginId = 'no-main-file';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'No Main File',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      await expect(
        pluginManager.loadPlugin(pluginId)
      ).rejects.toThrow();
    });

    it('应该返回已加载插件的信息', async () => {
      const pluginId = 'cached-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Cached Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      const info1 = await pluginManager.loadPlugin(pluginId);
      const info2 = await pluginManager.loadPlugin(pluginId);

      expect(info1).toEqual(info2);
    });
  });

  describe('unloadPlugin', () => {
    it('应该成功卸载插件', async () => {
      const pluginId = 'unload-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Unload Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {}, deactivate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(pluginId);
      await pluginManager.unloadPlugin(pluginId);

      const plugins = await pluginManager.listPlugins();
      expect(plugins.find(p => p.id === pluginId)).toBeUndefined();
    });

    it('应该在插件不存在时抛出错误', async () => {
      await expect(
        pluginManager.unloadPlugin('non-existent')
      ).rejects.toThrow('Plugin not loaded');
    });
  });

  describe('listPlugins', () => {
    it('应该列出所有已加载插件', async () => {
      const plugin1Id = 'list-test-1';
      const plugin1Dir = path.join(testPluginsDir, 'official', plugin1Id);
      await fs.mkdir(plugin1Dir, { recursive: true });

      const manifest1: PluginManifest = {
        id: plugin1Id,
        name: 'List Test 1',
        version: '1.0.0',
        description: 'Test 1',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(plugin1Dir, 'manifest.json'),
        JSON.stringify(manifest1),
        'utf-8'
      );

      const pluginCode1 = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(plugin1Dir, 'index.js'), pluginCode1, 'utf-8');

      const plugin2Id = 'list-test-2';
      const plugin2Dir = path.join(testPluginsDir, 'community', plugin2Id);
      await fs.mkdir(plugin2Dir, { recursive: true });

      const manifest2: PluginManifest = {
        id: plugin2Id,
        name: 'List Test 2',
        version: '1.0.0',
        description: 'Test 2',
        author: 'Author',
        type: 'integration',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(plugin2Dir, 'manifest.json'),
        JSON.stringify(manifest2),
        'utf-8'
      );

      const pluginCode2 = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(plugin2Dir, 'index.js'), pluginCode2, 'utf-8');

      await pluginManager.loadPlugin(plugin1Id);
      await pluginManager.loadPlugin(plugin2Id);

      const plugins = await pluginManager.listPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins.map(p => p.id)).toContain(plugin1Id);
      expect(plugins.map(p => p.id)).toContain(plugin2Id);
    });

    it('应该按类型过滤插件', async () => {
      const officialId = 'filter-official';
      const officialDir = path.join(testPluginsDir, 'official', officialId);
      await fs.mkdir(officialDir, { recursive: true });

      const officialManifest: PluginManifest = {
        id: officialId,
        name: 'Official',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(officialDir, 'manifest.json'),
        JSON.stringify(officialManifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(officialDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(officialId);

      const officialPlugins = await pluginManager.listPlugins(PluginType.OFFICIAL);
      expect(officialPlugins).toHaveLength(1);
      expect(officialPlugins[0].id).toBe(officialId);
    });

    it('应该返回空数组当没有插件时', async () => {
      const plugins = await pluginManager.listPlugins();
      expect(plugins).toEqual([]);
    });
  });

  describe('togglePlugin', () => {
    it('应该成功启用插件', async () => {
      const pluginId = 'toggle-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Toggle Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(pluginId);
      await pluginManager.togglePlugin(pluginId, true);

      const plugins = await pluginManager.listPlugins();
      const plugin = plugins.find(p => p.id === pluginId);

      expect(plugin?.isEnabled).toBe(true);
    });

    it('应该成功禁用插件', async () => {
      const pluginId = 'disable-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Disable Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(pluginId);
      await pluginManager.togglePlugin(pluginId, false);

      const plugins = await pluginManager.listPlugins();
      const plugin = plugins.find(p => p.id === pluginId);

      expect(plugin?.isEnabled).toBe(false);
    });

    it('应该在插件不存在时抛出错误', async () => {
      await expect(
        pluginManager.togglePlugin('non-existent', true)
      ).rejects.toThrow('Plugin not loaded');
    });
  });

  describe('executePlugin', () => {
    it('应该成功执行已启用的插件', async () => {
      const pluginId = 'execute-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Execute Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = `module.exports = {
        activate: async () => {},
        execute: async (action, params) => ({ action, params, success: true })
      };`;
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(pluginId);
      await pluginManager.togglePlugin(pluginId, true);

      const result = await pluginManager.executePlugin(pluginId, 'test-action', { data: 'test' });

      expect(result).toMatchObject({
        action: 'test-action',
        params: { data: 'test' },
        success: true
      });
    });

    it('应该在插件未启用时抛出错误', async () => {
      const pluginId = 'disabled-execute-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Disabled Execute Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {}, execute: async () => ({}) };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(pluginId);
      await pluginManager.togglePlugin(pluginId, false);

      await expect(
        pluginManager.executePlugin(pluginId, 'action', {})
      ).rejects.toThrow('Plugin is disabled');
    });

    it('应该在插件不存在时抛出错误', async () => {
      await expect(
        pluginManager.executePlugin('non-existent', 'action', {})
      ).rejects.toThrow('Plugin not loaded');
    });

    it('应该在插件不支持execute时抛出错误', async () => {
      const pluginId = 'no-execute-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'No Execute Test',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      await pluginManager.loadPlugin(pluginId);
      await pluginManager.togglePlugin(pluginId, true);

      await expect(
        pluginManager.executePlugin(pluginId, 'action', {})
      ).rejects.toThrow('does not support execute');
    });
  });

  describe('installPluginFromZip', () => {
    it('应该成功从ZIP安装插件', async () => {
      const pluginId = 'zip-install-test';
      const tempDir = path.join(testPluginsDir, 'temp-plugin');
      await fs.mkdir(tempDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'ZIP Install Test',
        version: '1.0.0',
        description: 'Test ZIP installation',
        author: 'Test Author',
        type: 'workflow',
        permissions: ['file_system'],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(tempDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {}, execute: async () => ({ success: true }) };';
      await fs.writeFile(path.join(tempDir, 'index.js'), pluginCode, 'utf-8');

      const zipPath = path.join(testPluginsDir, 'test-plugin.zip');
      const zip = new AdmZip();
      zip.addLocalFolder(tempDir);
      zip.writeZip(zipPath);

      const info = await pluginManager.installPluginFromZip(zipPath, PluginType.COMMUNITY);

      expect(info.id).toBe(pluginId);
      expect(info.name).toBe('ZIP Install Test');
      expect(info.type).toBe(PluginType.COMMUNITY);

      const installedDir = path.join(testPluginsDir, 'community', pluginId);
      const stats = await fs.stat(installedDir);
      expect(stats.isDirectory()).toBe(true);

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('应该在ZIP文件不存在时抛出错误', async () => {
      await expect(
        pluginManager.installPluginFromZip('/non-existent.zip')
      ).rejects.toThrow('ZIP文件不存在');
    });

    it('应该在manifest缺失时抛出错误', async () => {
      const tempDir = path.join(testPluginsDir, 'no-manifest');
      await fs.mkdir(tempDir, { recursive: true });

      await fs.writeFile(path.join(tempDir, 'dummy.txt'), 'test', 'utf-8');

      const zipPath = path.join(testPluginsDir, 'no-manifest.zip');
      const zip = new AdmZip();
      zip.addLocalFolder(tempDir);
      zip.writeZip(zipPath);

      await expect(
        pluginManager.installPluginFromZip(zipPath)
      ).rejects.toThrow('缺少manifest.json文件');

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('应该替换已存在的插件', async () => {
      const pluginId = 'replace-test';

      const tempDir1 = path.join(testPluginsDir, 'temp-v1');
      await fs.mkdir(tempDir1, { recursive: true });

      const manifest1: PluginManifest = {
        id: pluginId,
        name: 'Version 1',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(tempDir1, 'manifest.json'),
        JSON.stringify(manifest1),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(tempDir1, 'index.js'), pluginCode, 'utf-8');

      const zipPath1 = path.join(testPluginsDir, 'v1.zip');
      const zip1 = new AdmZip();
      zip1.addLocalFolder(tempDir1);
      zip1.writeZip(zipPath1);

      await pluginManager.installPluginFromZip(zipPath1);

      const tempDir2 = path.join(testPluginsDir, 'temp-v2');
      await fs.mkdir(tempDir2, { recursive: true });

      const manifest2: PluginManifest = {
        id: pluginId,
        name: 'Version 2',
        version: '2.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(tempDir2, 'manifest.json'),
        JSON.stringify(manifest2),
        'utf-8'
      );

      await fs.writeFile(path.join(tempDir2, 'index.js'), pluginCode, 'utf-8');

      const zipPath2 = path.join(testPluginsDir, 'v2.zip');
      const zip2 = new AdmZip();
      zip2.addLocalFolder(tempDir2);
      zip2.writeZip(zipPath2);

      const info = await pluginManager.installPluginFromZip(zipPath2);

      expect(info.version).toBe('2.0.0');
      expect(info.name).toBe('Version 2');

      await fs.rm(tempDir1, { recursive: true, force: true });
      await fs.rm(tempDir2, { recursive: true, force: true });
    });
  });

  describe('边界条件测试', () => {
    it('应该处理包含特殊字符的插件名', async () => {
      const pluginId = 'special-chars-test';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Special !@#$%^&*() Test',
        version: '1.0.0',
        description: 'Test with special chars',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const pluginCode = 'module.exports = { activate: async () => {} };';
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

      const info = await pluginManager.loadPlugin(pluginId);
      expect(info.name).toBe('Special !@#$%^&*() Test');
    });

    it('应该处理插件加载失败', async () => {
      const pluginId = 'broken-plugin';
      const pluginDir = path.join(testPluginsDir, 'official', pluginId);
      await fs.mkdir(pluginDir, { recursive: true });

      const manifest: PluginManifest = {
        id: pluginId,
        name: 'Broken Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Author',
        type: 'workflow',
        permissions: [],
        main: 'index.js',
      };

      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest),
        'utf-8'
      );

      const brokenCode = 'throw new Error("Intentional error");';
      await fs.writeFile(path.join(pluginDir, 'index.js'), brokenCode, 'utf-8');

      await expect(
        pluginManager.loadPlugin(pluginId)
      ).rejects.toThrow();
    });

    it('应该处理并发加载多个插件', async () => {
      const pluginIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      for (const pluginId of pluginIds) {
        const pluginDir = path.join(testPluginsDir, 'official', pluginId);
        await fs.mkdir(pluginDir, { recursive: true });

        const manifest: PluginManifest = {
          id: pluginId,
          name: `Concurrent ${pluginId}`,
          version: '1.0.0',
          description: 'Test',
          author: 'Author',
          type: 'workflow',
          permissions: [],
          main: 'index.js',
        };

        await fs.writeFile(
          path.join(pluginDir, 'manifest.json'),
          JSON.stringify(manifest),
          'utf-8'
        );

        const pluginCode = 'module.exports = { activate: async () => {} };';
        await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');
      }

      const loadPromises = pluginIds.map(id => pluginManager.loadPlugin(id));
      const infos = await Promise.all(loadPromises);

      expect(infos).toHaveLength(3);
      expect(infos.map(i => i.id)).toEqual(expect.arrayContaining(pluginIds));
    });

    it('应该处理cleanup时卸载所有插件', async () => {
      const pluginIds = ['cleanup-1', 'cleanup-2'];

      for (const pluginId of pluginIds) {
        const pluginDir = path.join(testPluginsDir, 'official', pluginId);
        await fs.mkdir(pluginDir, { recursive: true });

        const manifest: PluginManifest = {
          id: pluginId,
          name: `Cleanup ${pluginId}`,
          version: '1.0.0',
          description: 'Test',
          author: 'Author',
          type: 'workflow',
          permissions: [],
          main: 'index.js',
        };

        await fs.writeFile(
          path.join(pluginDir, 'manifest.json'),
          JSON.stringify(manifest),
          'utf-8'
        );

        const pluginCode = 'module.exports = { activate: async () => {}, deactivate: async () => {} };';
        await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf-8');

        await pluginManager.loadPlugin(pluginId);
      }

      await pluginManager.cleanup();

      const plugins = await pluginManager.listPlugins();
      expect(plugins).toEqual([]);
    });
  });
});

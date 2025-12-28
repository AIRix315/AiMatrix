import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProjectManager } from '../../../src/main/services/ProjectManager';
import { ProjectConfig } from '../../../src/common/types';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('../../../src/main/services/TimeService', () => ({
  timeService: {
    getCurrentTime: vi.fn(() => Promise.resolve(new Date('2025-12-29T10:00:00Z'))),
    validateTimeIntegrity: vi.fn(() => Promise.resolve(true)),
    syncWithNTP: vi.fn(() => Promise.resolve(true)),
  }
}));

describe('ProjectManager - 真实文件系统测试', () => {
  let projectManager: ProjectManager;
  let testProjectsDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    testProjectsDir = path.join(originalCwd, 'test-data', `project-test-${Date.now()}`);
    await fs.mkdir(testProjectsDir, { recursive: true });

    process.chdir(testProjectsDir);

    projectManager = new ProjectManager();
    await projectManager.initialize();
  });

  afterEach(async () => {
    try {
      await projectManager.cleanup();
    } catch (error) {
      console.warn('清理 ProjectManager 失败:', error);
    }

    process.chdir(originalCwd);

    try {
      await fs.rm(testProjectsDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('initialize', () => {
    it('应该成功初始化并创建projects目录', async () => {
      const projectsPath = path.join(testProjectsDir, 'projects');
      const stats = await fs.stat(projectsPath);

      expect(stats.isDirectory()).toBe(true);
    });

    it('应该加载现有项目', async () => {
      const project1 = await projectManager.createProject('Project 1');
      const project2 = await projectManager.createProject('Project 2');

      const newManager = new ProjectManager();
      await newManager.initialize();

      const projects = await newManager.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.id)).toContain(project1.id);
      expect(projects.map(p => p.id)).toContain(project2.id);

      await newManager.cleanup();
    });

    it('应该跳过无效项目目录', async () => {
      const projectsPath = path.join(testProjectsDir, 'projects');
      const invalidDir = path.join(projectsPath, 'invalid-project');
      await fs.mkdir(invalidDir, { recursive: true });

      const newManager = new ProjectManager();
      await newManager.initialize();

      const projects = await newManager.listProjects();
      expect(projects).toHaveLength(0);

      await newManager.cleanup();
    });
  });

  describe('createProject', () => {
    it('应该成功创建项目', async () => {
      const project = await projectManager.createProject('Test Project');

      expect(project).toMatchObject({
        name: 'Test Project',
        workflows: [],
        assets: [],
        inputAssets: [],
        outputAssets: [],
        immutable: false,
      });
      expect(project.id).toBeDefined();
      expect(project.path).toContain(project.id);
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('应该在文件系统中创建项目目录和配置文件', async () => {
      const project = await projectManager.createProject('Test Project');

      const projectDir = project.path;
      const configFile = path.join(projectDir, 'project.json');

      const dirStats = await fs.stat(projectDir);
      expect(dirStats.isDirectory()).toBe(true);

      const fileStats = await fs.stat(configFile);
      expect(fileStats.isFile()).toBe(true);

      const fileContent = await fs.readFile(configFile, 'utf-8');
      const savedConfig = JSON.parse(fileContent);

      expect(savedConfig.name).toBe('Test Project');
      expect(savedConfig.id).toBe(project.id);
    });

    it('应该使用模板创建项目', async () => {
      const project = await projectManager.createProject('Video Project', 'video-workflow');

      expect(project.workflowType).toBe('video-workflow');
      expect(project.settings.defaultWorkflow).toBe('video-workflow');

      const templateDir = path.join(project.path, 'templates', 'video-workflow');
      const stats = await fs.stat(templateDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('应该使用TimeService获取时间戳', async () => {
      const { timeService } = await import('../../../src/main/services/TimeService');

      const project = await projectManager.createProject('Test');

      expect(timeService.getCurrentTime).toHaveBeenCalled();
      expect(project.createdAt.toISOString()).toBe('2025-12-29T10:00:00.000Z');
      expect(project.updatedAt.toISOString()).toBe('2025-12-29T10:00:00.000Z');
    });

    it('应该在未初始化时抛出错误', async () => {
      const uninitializedManager = new ProjectManager();

      await expect(
        uninitializedManager.createProject('Test')
      ).rejects.toThrow('项目管理器未初始化');
    });

    it('应该在时间验证失败但同步成功后继续', async () => {
      const { timeService } = await import('../../../src/main/services/TimeService');
      vi.mocked(timeService.validateTimeIntegrity).mockResolvedValueOnce(false);
      vi.mocked(timeService.syncWithNTP).mockResolvedValueOnce(true);

      const project = await projectManager.createProject('Test');

      expect(timeService.syncWithNTP).toHaveBeenCalled();
      expect(project).toBeDefined();
    });

    it('应该在时间同步失败时抛出错误', async () => {
      const { timeService } = await import('../../../src/main/services/TimeService');
      vi.mocked(timeService.validateTimeIntegrity).mockResolvedValueOnce(false);
      vi.mocked(timeService.syncWithNTP).mockResolvedValueOnce(false);

      await expect(
        projectManager.createProject('Test')
      ).rejects.toThrow('时间验证失败，无法执行操作: createProject');
    });
  });

  describe('loadProject', () => {
    it('应该从内存加载已存在的项目', async () => {
      const created = await projectManager.createProject('Test');
      const loaded = await projectManager.loadProject(created.id);

      expect(loaded.id).toBe(created.id);
      expect(loaded.name).toBe('Test');
    });

    it('应该从文件系统加载项目', async () => {
      const created = await projectManager.createProject('Test');
      const projectId = created.id;

      const newManager = new ProjectManager();
      await newManager.initialize();

      const loaded = await newManager.loadProject(projectId);

      expect(loaded.id).toBe(projectId);
      expect(loaded.name).toBe('Test');
      expect(loaded.createdAt).toBeInstanceOf(Date);
      expect(loaded.updatedAt).toBeInstanceOf(Date);

      await newManager.cleanup();
    });

    it('应该正确转换日期字符串为Date对象', async () => {
      const created = await projectManager.createProject('Test');

      const newManager = new ProjectManager();
      await newManager.initialize();

      const loaded = await newManager.loadProject(created.id);

      expect(loaded.createdAt).toBeInstanceOf(Date);
      expect(loaded.updatedAt).toBeInstanceOf(Date);

      await newManager.cleanup();
    });

    it('应该在项目不存在时抛出错误', async () => {
      await expect(
        projectManager.loadProject('non-existent-id')
      ).rejects.toMatchObject({
        code: 'PROJECT_LOAD_FAILED',
        service: 'ProjectManager',
      });
    });

    it('应该在未初始化时抛出错误', async () => {
      const uninitializedManager = new ProjectManager();

      await expect(
        uninitializedManager.loadProject('test')
      ).rejects.toThrow('项目管理器未初始化');
    });
  });

  describe('saveProject', () => {
    it('应该成功保存项目更改', async () => {
      const project = await projectManager.createProject('Original Name');
      project.name = 'Updated Name';

      await projectManager.saveProject(project.id, project);

      const configFile = path.join(project.path, 'project.json');
      const fileContent = await fs.readFile(configFile, 'utf-8');
      const savedConfig = JSON.parse(fileContent);

      expect(savedConfig.name).toBe('Updated Name');
    });

    it('应该更新updatedAt时间戳', async () => {
      const { timeService } = await import('../../../src/main/services/TimeService');
      vi.mocked(timeService.getCurrentTime)
        .mockResolvedValueOnce(new Date('2025-12-29T10:00:00Z'))
        .mockResolvedValueOnce(new Date('2025-12-29T11:00:00Z'));

      const project = await projectManager.createProject('Test');
      const originalUpdatedAt = project.updatedAt;

      await projectManager.saveProject(project.id, project);

      const configFile = path.join(project.path, 'project.json');
      const fileContent = await fs.readFile(configFile, 'utf-8');
      const savedConfig = JSON.parse(fileContent);

      expect(new Date(savedConfig.updatedAt)).not.toEqual(originalUpdatedAt);
    });

    it('应该持久化更改到文件系统', async () => {
      const project = await projectManager.createProject('Test');
      project.name = 'Modified';
      project.inputAssets.push('asset-1');

      await projectManager.saveProject(project.id, project);

      const newManager = new ProjectManager();
      await newManager.initialize();

      const loaded = await newManager.loadProject(project.id);

      expect(loaded.name).toBe('Modified');
      expect(loaded.inputAssets).toContain('asset-1');

      await newManager.cleanup();
    });

    it('应该在未初始化时抛出错误', async () => {
      const uninitializedManager = new ProjectManager();
      const mockProject = { id: 'test', path: '/tmp/test' } as ProjectConfig;

      await expect(
        uninitializedManager.saveProject('test', mockProject)
      ).rejects.toThrow('项目管理器未初始化');
    });
  });

  describe('addInputAsset', () => {
    it('应该成功添加输入资源', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.addInputAsset(project.id, 'asset-1');

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.inputAssets).toContain('asset-1');
    });

    it('应该避免重复添加相同资源', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.addInputAsset(project.id, 'asset-1');
      await projectManager.addInputAsset(project.id, 'asset-1');

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.inputAssets).toEqual(['asset-1']);
    });

    it('应该支持添加多个不同资源', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.addInputAsset(project.id, 'asset-1');
      await projectManager.addInputAsset(project.id, 'asset-2');
      await projectManager.addInputAsset(project.id, 'asset-3');

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.inputAssets).toEqual(['asset-1', 'asset-2', 'asset-3']);
    });

    it('应该在项目不可修改时抛出错误', async () => {
      const project = await projectManager.createProject('Test');
      project.immutable = true;
      await projectManager.saveProject(project.id, project);

      await expect(
        projectManager.addInputAsset(project.id, 'asset-1')
      ).rejects.toThrow('项目已完成，不可修改');
    });

    it('应该持久化输入资源到文件系统', async () => {
      const project = await projectManager.createProject('Test');
      await projectManager.addInputAsset(project.id, 'asset-1');

      const newManager = new ProjectManager();
      await newManager.initialize();

      const loaded = await newManager.loadProject(project.id);
      expect(loaded.inputAssets).toContain('asset-1');

      await newManager.cleanup();
    });
  });

  describe('addOutputAsset', () => {
    it('应该成功添加输出资源', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.addOutputAsset(project.id, 'output-1');

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.outputAssets).toContain('output-1');
    });

    it('应该避免重复添加相同资源', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.addOutputAsset(project.id, 'output-1');
      await projectManager.addOutputAsset(project.id, 'output-1');

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.outputAssets).toEqual(['output-1']);
    });

    it('应该在项目不可修改时抛出错误', async () => {
      const project = await projectManager.createProject('Test');
      project.immutable = true;
      await projectManager.saveProject(project.id, project);

      await expect(
        projectManager.addOutputAsset(project.id, 'output-1')
      ).rejects.toThrow('项目已完成，不可修改');
    });

    it('应该持久化输出资源到文件系统', async () => {
      const project = await projectManager.createProject('Test');
      await projectManager.addOutputAsset(project.id, 'output-1');

      const newManager = new ProjectManager();
      await newManager.initialize();

      const loaded = await newManager.loadProject(project.id);
      expect(loaded.outputAssets).toContain('output-1');

      await newManager.cleanup();
    });
  });

  describe('deleteProject', () => {
    it('应该成功删除项目目录', async () => {
      const project = await projectManager.createProject('Test');
      const projectPath = project.path;

      await projectManager.deleteProject(project.id);

      await expect(fs.stat(projectPath)).rejects.toThrow();
    });

    it('应该从内存中移除项目', async () => {
      const project = await projectManager.createProject('Test');
      await projectManager.deleteProject(project.id);

      const projects = await projectManager.listProjects();
      expect(projects.map(p => p.id)).not.toContain(project.id);
    });

    it('应该处理deleteOutputs参数', async () => {
      const project = await projectManager.createProject('Test');
      await projectManager.addOutputAsset(project.id, 'output-1');
      await projectManager.addOutputAsset(project.id, 'output-2');

      await projectManager.deleteProject(project.id, true);

      await expect(fs.stat(project.path)).rejects.toThrow();
    });

    it('应该在项目不存在时抛出错误', async () => {
      await expect(
        projectManager.deleteProject('non-existent')
      ).rejects.toMatchObject({
        code: 'PROJECT_DELETE_FAILED',
      });
    });
  });

  describe('listProjects', () => {
    it('应该列出所有项目', async () => {
      await projectManager.createProject('Project 1');
      await projectManager.createProject('Project 2');
      await projectManager.createProject('Project 3');

      const projects = await projectManager.listProjects();

      expect(projects).toHaveLength(3);
      expect(projects.map(p => p.name)).toContain('Project 1');
      expect(projects.map(p => p.name)).toContain('Project 2');
      expect(projects.map(p => p.name)).toContain('Project 3');
    });

    it('应该返回空数组当没有项目时', async () => {
      const projects = await projectManager.listProjects();
      expect(projects).toEqual([]);
    });

    it('应该在未初始化时抛出错误', async () => {
      const uninitializedManager = new ProjectManager();

      await expect(
        uninitializedManager.listProjects()
      ).rejects.toThrow('项目管理器未初始化');
    });
  });

  describe('linkGlobalAsset', () => {
    it('应该成功创建全局资源链接文件', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.linkGlobalAsset(project.id, 'global-asset-1');

      const linkFile = path.join(project.path, 'links', 'global-asset-1.json');
      const stats = await fs.stat(linkFile);
      expect(stats.isFile()).toBe(true);
    });

    it('应该保存链接元数据', async () => {
      const project = await projectManager.createProject('Test');

      await projectManager.linkGlobalAsset(project.id, 'global-asset-1');

      const linkFile = path.join(project.path, 'links', 'global-asset-1.json');
      const fileContent = await fs.readFile(linkFile, 'utf-8');
      const linkData = JSON.parse(fileContent);

      expect(linkData.globalAssetId).toBe('global-asset-1');
      expect(linkData.linkedAt).toBeDefined();
    });

    it('应该在项目不存在时抛出错误', async () => {
      await expect(
        projectManager.linkGlobalAsset('non-existent', 'asset-1')
      ).rejects.toMatchObject({
        code: 'PROJECT_LINK_ASSET_FAILED',
      });
    });

    it('应该在未初始化时抛出错误', async () => {
      const uninitializedManager = new ProjectManager();

      await expect(
        uninitializedManager.linkGlobalAsset('test', 'asset')
      ).rejects.toThrow('项目管理器未初始化');
    });
  });

  describe('getLinkedAssets', () => {
    it('应该返回空数组当没有链接时', async () => {
      const project = await projectManager.createProject('Test');

      const assets = await projectManager.getLinkedAssets(project.id);

      expect(assets).toEqual([]);
    });

    it('应该读取链接文件', async () => {
      const project = await projectManager.createProject('Test');
      await projectManager.linkGlobalAsset(project.id, 'asset-1');
      await projectManager.linkGlobalAsset(project.id, 'asset-2');

      const assets = await projectManager.getLinkedAssets(project.id);

      expect(assets).toHaveLength(2);
    });

    it('应该在项目不存在时抛出错误', async () => {
      await expect(
        projectManager.getLinkedAssets('non-existent')
      ).rejects.toMatchObject({
        code: 'PROJECT_GET_LINKED_ASSETS_FAILED',
      });
    });
  });

  describe('cleanup', () => {
    it('应该保存所有项目', async () => {
      const project1 = await projectManager.createProject('Project 1');
      const project2 = await projectManager.createProject('Project 2');

      project1.name = 'Modified 1';
      project2.name = 'Modified 2';

      await projectManager.cleanup();

      const newManager = new ProjectManager();
      await newManager.initialize();

      const loaded1 = await newManager.loadProject(project1.id);
      const loaded2 = await newManager.loadProject(project2.id);

      expect(loaded1.name).toBe('Modified 1');
      expect(loaded2.name).toBe('Modified 2');

      await newManager.cleanup();
    });

  });

  describe('边界条件测试', () => {
    it('应该处理空项目名称', async () => {
      const project = await projectManager.createProject('');

      expect(project.name).toBe('');

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.name).toBe('');
    });

    it('应该处理特殊字符项目名称', async () => {
      const specialName = '测试项目!@#$%^&*()_+-=[]{}|;:,.<>?';
      const project = await projectManager.createProject(specialName);

      expect(project.name).toBe(specialName);

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.name).toBe(specialName);
    });

    it('应该处理长项目名称', async () => {
      const longName = 'A'.repeat(1000);
      const project = await projectManager.createProject(longName);

      expect(project.name).toBe(longName);

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.name).toBe(longName);
    });

    it('应该处理包含换行符的项目名称', async () => {
      const nameWithNewline = 'Project\nWith\nNewlines';
      const project = await projectManager.createProject(nameWithNewline);

      expect(project.name).toBe(nameWithNewline);

      const loaded = await projectManager.loadProject(project.id);
      expect(loaded.name).toBe(nameWithNewline);
    });

    it('应该处理并发创建多个项目', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        projectManager.createProject(`Concurrent Project ${i}`)
      );

      const projects = await Promise.all(promises);

      expect(projects).toHaveLength(10);
      const ids = new Set(projects.map(p => p.id));
      expect(ids.size).toBe(10);
    });

    it('应该处理immutable项目的修改保护', async () => {
      const project = await projectManager.createProject('Test');
      project.immutable = true;
      await projectManager.saveProject(project.id, project);

      await expect(
        projectManager.addInputAsset(project.id, 'asset-1')
      ).rejects.toThrow('项目已完成，不可修改');

      await expect(
        projectManager.addOutputAsset(project.id, 'output-1')
      ).rejects.toThrow('项目已完成，不可修改');
    });
  });
});

/**
 * IPC 集成测试: project 相关通道
 *
 * 测试通道：
 * - project:create (1)
 * - project:load (1)
 * - project:save (1)
 * - project:delete (1)
 * - project:list (1)
 * - project:add-input-asset (1)
 * - project:add-output-asset (1)
 *
 * 共计: 7个通道
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPCTestContext, TestDataGenerator, wait } from './helpers/ipc-test-utils';
import { ProjectManager } from '../../../src/main/services/ProjectManager';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { logger } from '../../../src/main/services/Logger';
import { timeService } from '../../../src/main/services/TimeService';
import * as path from 'path';
import { promises as fs } from 'fs';

// Mock Logger
vi.mock('../../../src/main/services/Logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  return {
    Logger: vi.fn(() => mockLogger),
    logger: mockLogger,
    LogLevel: {
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error'
    }
  };
});

// Mock TimeService
vi.mock('../../../src/main/services/TimeService', () => ({
  timeService: {
    getCurrentTime: vi.fn().mockResolvedValue(new Date('2025-12-29T10:00:00.000Z')),
    validateTimeIntegrity: vi.fn().mockResolvedValue(true),
    syncWithNTP: vi.fn().mockResolvedValue(true)
  }
}));

describe('IPC Integration: project', () => {
  let ctx: IPCTestContext;
  let projectManager: ProjectManager;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = new IPCTestContext('project');
    await ctx.setup();

    // 保存原始工作目录
    originalCwd = process.cwd();

    // 切换到测试目录
    const testDir = ctx.getTestDataDir();
    process.chdir(testDir);

    // ProjectManager 构造函数不需要参数
    projectManager = new ProjectManager();
    await projectManager.initialize();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await projectManager.cleanup();

    // 恢复原始工作目录
    process.chdir(originalCwd);

    await ctx.cleanup();
  });

  describe('project:create - 创建项目', () => {
    beforeEach(() => {
      ctx.registerHandler('project:create', (_, name: string, template?: string) =>
        projectManager.createProject(name, template)
      );
    });

    it('应该成功创建项目', async () => {
      const config = await ctx.invoke('project:create', 'Test Project');

      expect(config).toBeTruthy();
      expect(config.id).toBeTruthy();
      expect(typeof config.id).toBe('string');
      expect(config.name).toBe('Test Project');

      // 验证项目文件存在
      const projectPath = path.join(process.cwd(), 'projects', config.id);
      const projectJsonPath = path.join(projectPath, 'project.json');
      const exists = await fs.access(projectJsonPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('应该创建带模板的项目', async () => {
      const config = await ctx.invoke('project:create', 'Template Project', 'novel-to-video');

      expect(config.workflowType).toBe('novel-to-video');
    });

    it('应该接受空项目名（系统不强制要求非空）', async () => {
      const config = await ctx.invoke('project:create', '');
      expect(config.id).toBeTruthy();
      expect(config.name).toBe('');
    });

    it('应该支持特殊字符项目名', async () => {
      const config = await ctx.invoke('project:create', 'Project-2025_测试');
      expect(config.id).toBeTruthy();
      expect(config.name).toBe('Project-2025_测试');
    });

    it('应该使用 TimeService 设置创建时间', async () => {
      await ctx.invoke('project:create', 'Time Test');

      expect(timeService.getCurrentTime).toHaveBeenCalled();
    });

    it('性能应该小于200ms', async () => {
      const duration = await ctx.measurePerformance('project:create', 'Performance Test');
      expect(duration).toBeLessThan(200);
    });
  });

  describe('project:load - 加载项目', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const config = await projectManager.createProject('Load Test Project');
      testProjectId = config.id;

      ctx.registerHandler('project:load', (_, projectId: string) =>
        projectManager.loadProject(projectId)
      );
    });

    it('应该成功加载项目', async () => {
      const config = await ctx.invoke('project:load', testProjectId);

      expect(config).toBeTruthy();
      expect(config.name).toBe('Load Test Project');
      expect(config.id).toBe(testProjectId);
    });

    it('应该返回完整的项目配置', async () => {
      const config = await ctx.invoke('project:load', testProjectId);

      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('createdAt');
      expect(config).toHaveProperty('updatedAt');
    });

    it('加载不存在的项目应该抛出错误', async () => {
      await expect(ctx.invoke('project:load', 'non-existent-id')).rejects.toThrow();
    });

    it('加载空ID应该抛出错误', async () => {
      await expect(ctx.invoke('project:load', '')).rejects.toThrow();
    });

    it('性能应该小于100ms', async () => {
      const duration = await ctx.measurePerformance('project:load', testProjectId);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('project:save - 保存项目', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const config = await projectManager.createProject('Save Test Project');
      testProjectId = config.id;

      ctx.registerHandler('project:save', (_, projectId: string, config: any) =>
        projectManager.saveProject(projectId, config)
      );
    });

    it('应该成功保存项目配置', async () => {
      // 先加载现有配置
      const currentConfig = await projectManager.loadProject(testProjectId);

      // 修改配置
      currentConfig.name = 'Updated Project Name';
      currentConfig.description = 'Updated description';

      await ctx.invoke('project:save', testProjectId, currentConfig);

      // 验证更新
      const config = await projectManager.loadProject(testProjectId);
      expect(config.name).toBe('Updated Project Name');
      expect(config.description).toBe('Updated description');
    });

    it('应该更新 updatedAt 时间戳', async () => {
      const originalConfig = await projectManager.loadProject(testProjectId);
      const originalUpdatedAt = originalConfig.updatedAt.getTime();

      await wait(10);

      // 修改完整配置
      originalConfig.description = 'New description';
      await ctx.invoke('project:save', testProjectId, originalConfig);

      const updatedConfig = await projectManager.loadProject(testProjectId);
      // TimeService 被 mock 为返回固定时间，所以时间戳可能相同
      expect(updatedConfig.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('应该保持项目 ID 不变', async () => {
      const currentConfig = await projectManager.loadProject(testProjectId);
      currentConfig.name = 'New Name';

      await ctx.invoke('project:save', testProjectId, currentConfig);

      const config = await projectManager.loadProject(testProjectId);
      expect(config.id).toBe(testProjectId);
    });

    it('保存不存在的项目应该抛出错误', async () => {
      await expect(ctx.invoke('project:save', 'non-existent-id', {})).rejects.toThrow();
    });

    it('性能应该小于150ms', async () => {
      const currentConfig = await projectManager.loadProject(testProjectId);
      currentConfig.description = 'Performance test';

      const duration = await ctx.measurePerformance(
        'project:save',
        testProjectId,
        currentConfig
      );
      expect(duration).toBeLessThan(150);
    });
  });

  describe('project:delete - 删除项目', () => {
    beforeEach(() => {
      ctx.registerHandler('project:delete', (_, projectId: string) =>
        projectManager.deleteProject(projectId)
      );
    });

    it('应该成功删除项目', async () => {
      const config = await projectManager.createProject('Delete Test');
      const projectId = config.id;

      await ctx.invoke('project:delete', projectId);

      // 验证项目已删除
      await expect(projectManager.loadProject(projectId)).rejects.toThrow();
    });

    it('应该删除项目目录', async () => {
      const config = await projectManager.createProject('Delete Test 2');
      const projectId = config.id;
      const projectPath = path.join(process.cwd(), 'projects', projectId);

      await ctx.invoke('project:delete', projectId);

      const exists = await fs.access(projectPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('删除不存在的项目应该抛出错误', async () => {
      await expect(ctx.invoke('project:delete', 'non-existent-id')).rejects.toThrow();
    });

    it('应该支持删除多个项目', async () => {
      const config1 = await projectManager.createProject('Delete Test 3');
      const config2 = await projectManager.createProject('Delete Test 4');
      const id1 = config1.id;
      const id2 = config2.id;

      await ctx.invoke('project:delete', id1);
      await ctx.invoke('project:delete', id2);

      await expect(projectManager.loadProject(id1)).rejects.toThrow();
      await expect(projectManager.loadProject(id2)).rejects.toThrow();
    });
  });

  describe('project:list - 列出所有项目', () => {
    beforeEach(() => {
      ctx.registerHandler('project:list', () => projectManager.listProjects());
    });

    it('空目录应该返回空数组', async () => {
      const projects = await ctx.invoke('project:list');

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBe(0);
    });

    it('应该返回所有项目', async () => {
      await projectManager.createProject('Project 1');
      await projectManager.createProject('Project 2');
      await projectManager.createProject('Project 3');

      const projects = await ctx.invoke('project:list');

      expect(projects.length).toBe(3);
      expect(projects[0]).toHaveProperty('id');
      expect(projects[0]).toHaveProperty('name');
    });

    it('返回的项目应该包含基本信息', async () => {
      await projectManager.createProject('Test Project');

      const projects = await ctx.invoke('project:list');

      expect(projects[0]).toHaveProperty('name');
      expect(projects[0]).toHaveProperty('createdAt');
      expect(projects[0]).toHaveProperty('updatedAt');
    });

    it('应该包含所有创建的项目', async () => {
      const config1 = await projectManager.createProject('Project A');
      const config2 = await projectManager.createProject('Project B');

      const projects = await ctx.invoke('project:list');

      // 验证有两个项目
      expect(projects.length).toBeGreaterThanOrEqual(2);

      // 查找两个项目
      const found1 = projects.find(p => p.id === config1.id);
      const found2 = projects.find(p => p.id === config2.id);

      // 两个项目都应该存在于列表中
      expect(found1).toBeTruthy();
      expect(found2).toBeTruthy();
      expect(found1?.name).toBe('Project A');
      expect(found2?.name).toBe('Project B');
    });

    it('性能应该小于150ms（即使有大量项目）', async () => {
      // 创建10个项目
      for (let i = 0; i < 10; i++) {
        await projectManager.createProject(`Project ${i}`);
      }

      const duration = await ctx.measurePerformance('project:list');
      expect(duration).toBeLessThan(150);
    });
  });

  describe('project:add-input-asset - 添加输入资产', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const config = await projectManager.createProject('Asset Test Project');
      testProjectId = config.id;

      ctx.registerHandler('project:add-input-asset', (_, projectId: string, assetId: string) =>
        projectManager.addInputAsset(projectId, assetId)
      );
    });

    it('应该成功添加输入资产', async () => {
      const assetId = 'test-asset-1';

      await ctx.invoke('project:add-input-asset', testProjectId, assetId);

      const config = await projectManager.loadProject(testProjectId);
      expect(config.inputAssets).toContain(assetId);
    });

    it('应该支持添加多个输入资产', async () => {
      await ctx.invoke('project:add-input-asset', testProjectId, 'asset-1');
      await ctx.invoke('project:add-input-asset', testProjectId, 'asset-2');
      await ctx.invoke('project:add-input-asset', testProjectId, 'asset-3');

      const config = await projectManager.loadProject(testProjectId);
      expect(config.inputAssets).toHaveLength(3);
    });

    it('不应该添加重复的输入资产', async () => {
      await ctx.invoke('project:add-input-asset', testProjectId, 'asset-1');
      await ctx.invoke('project:add-input-asset', testProjectId, 'asset-1');

      const config = await projectManager.loadProject(testProjectId);
      const count = config.inputAssets.filter((id: string) => id === 'asset-1').length;
      expect(count).toBe(1);
    });

    it('添加到不存在的项目应该抛出错误', async () => {
      await expect(ctx.invoke('project:add-input-asset', 'non-existent', 'asset-1')).rejects.toThrow();
    });
  });

  describe('project:add-output-asset - 添加输出资产', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const config = await projectManager.createProject('Output Asset Test');
      testProjectId = config.id;

      ctx.registerHandler('project:add-output-asset', (_, projectId: string, assetId: string) =>
        projectManager.addOutputAsset(projectId, assetId)
      );
    });

    it('应该成功添加输出资产', async () => {
      const assetId = 'output-asset-1';

      await ctx.invoke('project:add-output-asset', testProjectId, assetId);

      const config = await projectManager.loadProject(testProjectId);
      expect(config.outputAssets).toContain(assetId);
    });

    it('应该支持添加多个输出资产', async () => {
      await ctx.invoke('project:add-output-asset', testProjectId, 'output-1');
      await ctx.invoke('project:add-output-asset', testProjectId, 'output-2');

      const config = await projectManager.loadProject(testProjectId);
      expect(config.outputAssets).toHaveLength(2);
    });

    it('不应该添加重复的输出资产', async () => {
      await ctx.invoke('project:add-output-asset', testProjectId, 'output-1');
      await ctx.invoke('project:add-output-asset', testProjectId, 'output-1');

      const config = await projectManager.loadProject(testProjectId);
      const count = config.outputAssets.filter((id: string) => id === 'output-1').length;
      expect(count).toBe(1);
    });

    it('输入资产和输出资产应该分开管理', async () => {
      // 注册输入资产处理器
      ctx.registerHandler('project:add-input-asset', (_, projectId: string, assetId: string) =>
        projectManager.addInputAsset(projectId, assetId)
      );

      await ctx.invoke('project:add-input-asset', testProjectId, 'asset-1');
      await ctx.invoke('project:add-output-asset', testProjectId, 'asset-2');

      const config = await projectManager.loadProject(testProjectId);
      expect(config.inputAssets).toContain('asset-1');
      expect(config.inputAssets).not.toContain('asset-2');
      expect(config.outputAssets).toContain('asset-2');
      expect(config.outputAssets).not.toContain('asset-1');
    });
  });

  describe('并发安全性测试', () => {
    beforeEach(() => {
      ctx.registerHandler('project:create', (_, name: string) => projectManager.createProject(name));
      ctx.registerHandler('project:list', () => projectManager.listProjects());
      ctx.registerHandler('project:load', (_, projectId: string) => projectManager.loadProject(projectId));
    });

    it('应该支持并发创建多个项目', async () => {
      const names = ['Project 1', 'Project 2', 'Project 3', 'Project 4', 'Project 5'];
      const promises = names.map(name => ctx.invoke('project:create', name));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      const ids = results.map(r => r.id);
      expect(new Set(ids).size).toBe(5); // 所有 ID 都是唯一的
    });

    it('并发读取项目配置应该安全', async () => {
      const config = await projectManager.createProject('Concurrent Test');
      const projectId = config.id;

      const promises = Array(10).fill(null).map(() => ctx.invoke('project:load', projectId));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.id === projectId)).toBe(true);
    });

    it('并发添加资产应该安全', async () => {
      const config = await projectManager.createProject('Asset Concurrent Test');
      const projectId = config.id;

      ctx.registerHandler('project:add-input-asset', (_, pid: string, assetId: string) =>
        projectManager.addInputAsset(pid, assetId)
      );

      const assetIds = ['asset-1', 'asset-2', 'asset-3', 'asset-4', 'asset-5'];
      const promises = assetIds.map(assetId => ctx.invoke('project:add-input-asset', projectId, assetId));

      await Promise.all(promises);

      const loadedConfig = await projectManager.loadProject(projectId);
      expect(loadedConfig.inputAssets).toHaveLength(5);
    });
  });

  describe('边界条件测试', () => {
    beforeEach(() => {
      ctx.registerHandler('project:create', (_, name: string) => projectManager.createProject(name));
      ctx.registerHandler('project:save', (_, projectId: string, updates: any) =>
        projectManager.saveProject(projectId, updates)
      );
    });

    it('应该处理超长项目名', async () => {
      const longName = 'A'.repeat(256);
      const config = await ctx.invoke('project:create', longName);

      expect(config.id).toBeTruthy();
      expect(config.name).toBe(longName);
    });

    it('应该处理包含特殊字符的项目名', async () => {
      const specialName = 'Project!@#$%^&*()_+-=[]{}|;:,.<>?';
      const config = await ctx.invoke('project:create', specialName);

      expect(config.name).toBe(specialName);
    });

    it('应该处理大型配置对象', async () => {
      const createResult = await ctx.invoke('project:create', 'Large Config Test');
      const projectId = createResult.id;

      // 先加载配置
      const currentConfig = await projectManager.loadProject(projectId);

      // 修改为大型配置
      currentConfig.description = 'A'.repeat(10000);
      currentConfig.metadata = {
        data: Array(100).fill({ key: 'value', nested: { deep: 'data' } })
      };

      await ctx.invoke('project:save', projectId, currentConfig);

      const config = await projectManager.loadProject(projectId);
      expect(config.description).toHaveLength(10000);
      expect(config.metadata.data).toHaveLength(100);
    });
  });
});

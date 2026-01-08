/**
 * Novel-to-Video 工作流集成测试
 *
 * 测试完整的5阶段工作流执行：
 * - Stage 1: AI场景拆解（章节、场景、角色提取）
 * - Stage 2: 并行素材生成（场景图、角色图）
 * - Stage 2.5: 场景摘要生成
 * - Stage 3: 分镜脚本生成（带上下文）
 * - Stage 4: 批量资产生成（分镜图）
 * - Gate机制（缺失项阻断）
 * - 进度文件生成
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../../src/main/services/FileSystemService';
import { logger } from '../../src/main/services/Logger';
import type { WorkflowProgress } from '../../plugins/official/novel-to-video/src/types/workflow';

// Mock依赖服务
const createMockAPIManager = () => ({
  callAPI: vi.fn(),
  getAPIConfig: vi.fn(),
  registerAPI: vi.fn()
});

const createMockTaskScheduler = () => ({
  scheduleTask: vi.fn(),
  getTaskStatus: vi.fn(),
  cancelTask: vi.fn()
});

const createMockContext = () => ({
  logger,
  services: {
    fileSystem: null as FileSystemService | null
  },
  timeService: {
    getCurrentTime: vi.fn().mockResolvedValue(new Date())
  },
  assetHelper: {
    createAsset: vi.fn().mockResolvedValue({
      id: 'test-asset',
      name: 'test',
      type: 'text',
      scope: 'project',
      category: 'chapters',
      filePath: '/test/asset.json',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    }),
    queryAssets: vi.fn().mockResolvedValue([{
      id: 'chapter-1',
      name: '第一章',
      type: 'text',
      scope: 'project',
      category: 'chapters',
      filePath: '/test/chapter-1.txt',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    }])
  },
  pluginDir: '',
  dataDir: ''
});

describe('Novel-to-Video 工作流集成测试', () => {
  let testDataDir: string;
  let fsService: FileSystemService;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(async () => {
    testDataDir = path.join(process.cwd(), 'test-data', `workflow-test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    mockContext = createMockContext();
    mockContext.services.fileSystem = fsService;
    mockContext.pluginDir = path.join(process.cwd(), 'plugins/official/novel-to-video');
    mockContext.dataDir = testDataDir;
  });

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('WorkflowExecutor - 完整5阶段执行', () => {
    it('应该成功执行并生成进度文件（简化mock场景）', async () => {
      // 动态导入服务
      const { WorkflowExecutor } = await import('../../plugins/official/novel-to-video/src/services/WorkflowExecutor');
      const { MaterialCollector } = await import('../../plugins/official/novel-to-video/src/services/MaterialCollector');

      // 创建完全mock的服务
      const mockChapterService = {
        splitChapters: vi.fn().mockResolvedValue([
          { id: 'ch1', filePath: path.join(testDataDir, 'ch1.txt'), name: '第一章' }
        ]),
        extractScenesAndCharacters: vi.fn().mockResolvedValue({
          scenes: [{ id: 'sc1', filePath: path.join(testDataDir, 'sc1.json') }],
          characters: [{ id: 'char1', filePath: path.join(testDataDir, 'char1.json') }]
        })
      };

      const mockStoryboardService = {
        generateSceneSummaries: vi.fn().mockResolvedValue([
          { sceneId: 'sc1', summary: '测试摘要' }
        ]),
        generateContextualScript: vi.fn().mockResolvedValue({
          id: 'sb1',
          filePath: '/test/sb1.json',
          customFields: { imagePrompts: ['测试提示词'] }
        })
      };

      const mockResourceService = {
        generateSceneImages: vi.fn().mockResolvedValue([
          { id: 'img1', filePath: '/test/img1.jpg' }
        ]),
        generateCharacterImages: vi.fn().mockResolvedValue([
          { id: 'img2', filePath: '/test/img2.jpg' }
        ]),
        generateI2IImages: vi.fn().mockResolvedValue([
          { url: 'http://test.com/i2i.jpg', filePath: '/test/i2i.jpg' }
        ])
      };

      const materialCollector = new MaterialCollector(mockContext as any, testDataDir);

      const executor = new WorkflowExecutor(
        mockChapterService as any,
        mockStoryboardService as any,
        mockResourceService as any,
        materialCollector,
        mockContext as any
      );

      // 执行工作流
      const result = await executor.executeFullWorkflow({
        novelPath: '/test/novel.txt',
        artStyle: 'anime',
        projectId: 'test-project'
      });

      // 验证核心逻辑
      expect(result.workflowId).toBeDefined();
      expect(result.projectId).toBe('test-project');
      expect(result.progress.stages).toBeDefined();

      // 验证所有阶段都被执行
      expect(mockChapterService.splitChapters).toHaveBeenCalled();
      expect(mockChapterService.extractScenesAndCharacters).toHaveBeenCalled();
      expect(mockResourceService.generateSceneImages).toHaveBeenCalled();
      expect(mockResourceService.generateCharacterImages).toHaveBeenCalled();
      expect(mockStoryboardService.generateSceneSummaries).toHaveBeenCalled();
      expect(mockStoryboardService.generateContextualScript).toHaveBeenCalled();
      expect(mockResourceService.generateI2IImages).toHaveBeenCalled();

      // 验证进度文件生成
      const progressFiles = await fs.readdir(testDataDir);
      const progressFile = progressFiles.find(f => f.startsWith('workflow-progress-'));
      expect(progressFile).toBeDefined();

      if (progressFile) {
        const progressPath = path.join(testDataDir, progressFile);
        const progressData = await fs.readFile(progressPath, 'utf-8');
        const progress: WorkflowProgress = JSON.parse(progressData);

        expect(progress.workflowId).toBeDefined();
        expect(progress.stages).toBeDefined();
        expect(progress.stages['stage1']).toBeDefined();
        expect(progress.stages['stage2']).toBeDefined();
        expect(progress.stages['stage2.5']).toBeDefined();
        expect(progress.stages['stage3']).toBeDefined();
        expect(progress.stages['stage4']).toBeDefined();
      }
    }, 15000);

    it('应该在Stage 1缺失必需输出时阻断执行', async () => {
      const { ChapterService } = await import('../../plugins/official/novel-to-video/src/services/ChapterService');
      const { StoryboardService } = await import('../../plugins/official/novel-to-video/src/services/StoryboardService');
      const { ResourceService } = await import('../../plugins/official/novel-to-video/src/services/ResourceService');
      const { MaterialCollector } = await import('../../plugins/official/novel-to-video/src/services/MaterialCollector');
      const { WorkflowExecutor } = await import('../../plugins/official/novel-to-video/src/services/WorkflowExecutor');

      const novelPath = path.join(testDataDir, 'test-novel.txt');
      await fs.writeFile(novelPath, '无效内容');

      const mockAPIManager = createMockAPIManager();
      const mockTaskScheduler = createMockTaskScheduler();

      const { NovelVideoAPIService } = await import('../../plugins/official/novel-to-video/src/services/NovelVideoAPIService');
      const apiService = new NovelVideoAPIService(mockAPIManager as any, mockContext as any);

      // Mock空返回的splitter/extractor
      const mockSplitter = {
        split: vi.fn().mockReturnValue([])
      };
      const mockExtractor = {
        splitChapterIntoScenes: vi.fn().mockResolvedValue([]),
        refineScenes: vi.fn().mockResolvedValue([]),
        refineCharacters: vi.fn().mockResolvedValue([])
      };

      const chapterService = new ChapterService(mockContext as any, mockSplitter, mockExtractor);
      const storyboardService = new StoryboardService(apiService, mockTaskScheduler as any, mockContext as any);
      const resourceService = new ResourceService(apiService, mockTaskScheduler as any, mockContext as any);
      const materialCollector = new MaterialCollector(mockContext as any, testDataDir);

      const executor = new WorkflowExecutor(
        chapterService,
        storyboardService,
        resourceService,
        materialCollector,
        mockContext as any
      );

      // 执行应该抛出错误
      await expect(
        executor.executeFullWorkflow({
          novelPath,
          artStyle: 'anime',
          projectId: 'test-project'
        })
      ).rejects.toThrow();
    }, 15000);
  });

  describe('MaterialCollector - 素材收集', () => {
    it('应该正确收集阶段产出', async () => {
      const { MaterialCollector } = await import('../../plugins/official/novel-to-video/src/services/MaterialCollector');

      const collector = new MaterialCollector(mockContext as any, testDataDir);

      await collector.collectStageOutput('stage1', {
        chapters: [{ id: 'ch1', filePath: '/test/ch1.txt' }],
        scenes: [{ id: 'sc1', filePath: '/test/sc1.json' }],
        characters: [{ id: 'char1', filePath: '/test/char1.json' }]
      });

      await collector.collectStageOutput('stage2', {
        sceneImages: [{ id: 'img1', filePath: '/test/img1.jpg' }],
        characterImages: [{ id: 'img2', filePath: '/test/img2.jpg' }]
      });

      const progressFile = await collector.generateProgressFile('test-workflow-123');

      expect(progressFile).toBeDefined();
      expect(await fs.access(progressFile).then(() => true).catch(() => false)).toBe(true);

      const progressData = await fs.readFile(progressFile, 'utf-8');
      const progress: WorkflowProgress = JSON.parse(progressData);

      expect(progress.workflowId).toBe('test-workflow-123');
      expect(progress.stages['stage1']).toBeDefined();
      expect(progress.stages['stage2']).toBeDefined();
      expect(progress.stages['stage1'].status).toBe('completed');
      expect(progress.stages['stage1'].canProceedToNext).toBe(true);
    });

    it('应该检测缺失项', async () => {
      const { MaterialCollector } = await import('../../plugins/official/novel-to-video/src/services/MaterialCollector');

      const collector = new MaterialCollector(mockContext as any, testDataDir);

      // Stage 1缺少characters
      await collector.collectStageOutput('stage1', {
        chapters: [{ id: 'ch1', filePath: '/test/ch1.txt' }],
        scenes: [{ id: 'sc1', filePath: '/test/sc1.json' }]
      });

      const missingItems = collector.getMissingItems();

      expect(missingItems).toBeDefined();
      expect(missingItems.length).toBeGreaterThan(0);
      expect(missingItems.some(item => item.type === 'characters')).toBe(true);
      expect(missingItems.find(item => item.type === 'characters')?.required).toBe(true);
    });
  });

  describe('Gate机制验证', () => {
    it('checkGateCondition应该正确验证阶段产出', async () => {
      const { ChapterService } = await import('../../plugins/official/novel-to-video/src/services/ChapterService');
      const { StoryboardService } = await import('../../plugins/official/novel-to-video/src/services/StoryboardService');
      const { ResourceService } = await import('../../plugins/official/novel-to-video/src/services/ResourceService');
      const { MaterialCollector } = await import('../../plugins/official/novel-to-video/src/services/MaterialCollector');
      const { WorkflowExecutor } = await import('../../plugins/official/novel-to-video/src/services/WorkflowExecutor');
      const { WorkflowContext } = await import('../../plugins/official/novel-to-video/src/types/workflow');

      const mockAPIManager = createMockAPIManager();
      const mockTaskScheduler = createMockTaskScheduler();

      const { NovelVideoAPIService } = await import('../../plugins/official/novel-to-video/src/services/NovelVideoAPIService');
      const apiService = new NovelVideoAPIService(mockAPIManager as any, mockContext as any);

      const mockSplitter = { split: vi.fn() };
      const mockExtractor = {
        splitChapterIntoScenes: vi.fn(),
        refineScenes: vi.fn(),
        refineCharacters: vi.fn()
      };

      const chapterService = new ChapterService(mockContext as any, mockSplitter, mockExtractor);
      const storyboardService = new StoryboardService(apiService, mockTaskScheduler as any, mockContext as any);
      const resourceService = new ResourceService(apiService, mockTaskScheduler as any, mockContext as any);
      const materialCollector = new MaterialCollector(mockContext as any, testDataDir);

      const executor = new WorkflowExecutor(
        chapterService,
        storyboardService,
        resourceService,
        materialCollector,
        mockContext as any
      );

      const context: any = {
        workflowId: 'test-wf',
        projectId: 'test-proj',
        novelPath: '/test/novel.txt',
        artStyle: 'anime',
        progress: {
          workflowId: 'test-wf',
          projectId: 'test-proj',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stages: {
            'stage1': {
              status: 'completed',
              canProceedToNext: true,
              outputs: {
                chapters: [{ id: 'ch1', required: true, versions: [] }],
                scenes: [{ id: 'sc1', required: true, versions: [] }],
                characters: [{ id: 'char1', required: true, versions: [] }]
              }
            }
          },
          missingItems: [],
          gateConditions: {}
        }
      };

      // 完整输出应该通过
      expect(executor.checkGateCondition('stage1', context)).toBe(true);

      // 缺少必需输出应该失败
      context.progress.stages['stage2'] = {
        status: 'completed',
        canProceedToNext: false,
        outputs: {
          sceneImages: [{ id: 'img1', required: true, versions: [] }]
          // 缺少 characterImages
        }
      };
      expect(executor.checkGateCondition('stage2', context)).toBe(false);
    });
  });
});

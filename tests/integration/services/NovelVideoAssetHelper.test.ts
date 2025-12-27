/**
 * NovelVideoAssetHelper 集成测试
 *
 * 测试小说转视频资产助手的核心功能：
 * - 章节/场景/角色资产创建
 * - customFields查询性能
 * - 资产关联查询
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { AssetManagerClass } from '../../../src/main/services/AssetManager';
import { NovelVideoAssetHelper } from '../../../src/main/services/novel-video/NovelVideoAssetHelper';
import type { AssetMetadata } from '../../../src/shared/types/asset';
import type { NovelVideoFields } from '../../../src/shared/types/novel-video';

describe('NovelVideoAssetHelper 集成测试', () => {
  let fsService: FileSystemService;
  let assetManager: AssetManagerClass;
  let helper: NovelVideoAssetHelper;
  let testDataDir: string;
  const testProjectId = 'test-novel-project';

  beforeEach(async () => {
    // 创建测试专用的临时目录
    testDataDir = path.join(process.cwd(), 'test-data', `test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // 初始化服务
    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    assetManager = new AssetManagerClass(fsService);
    await assetManager.initialize();

    helper = new NovelVideoAssetHelper(assetManager, fsService);
  });

  afterEach(async () => {
    // 停止文件监听
    try {
      await assetManager.stopWatching();
    } catch (error) {
      // 忽略错误
    }

    // 清理测试目录
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('章节资产创建', () => {
    it('应该成功创建章节资产', async () => {
      const chapter = await helper.createChapterAsset({
        projectId: testProjectId,
        title: '第一章',
        content: '这是第一章的内容...',
        index: 1
      });

      expect(chapter).toBeDefined();
      expect(chapter.type).toBe('text');
      expect(chapter.scope).toBe('project');
      expect(chapter.projectId).toBe(testProjectId);
      expect(chapter.category).toBe('chapters');
      expect(chapter.tags).toContain('novel-video');
      expect(chapter.tags).toContain('chapter');

      // 验证customFields
      const nv = chapter.customFields?.novelVideo as NovelVideoFields;
      expect(nv).toBeDefined();
      expect(nv.chapterId).toBeDefined();
      expect(nv.chapterTitle).toBe('第一章');
      expect(nv.chapterContent).toBe('这是第一章的内容...');
      expect(nv.chapterIndex).toBe(1);
    });

    it('应该创建章节文本文件', async () => {
      const chapter = await helper.createChapterAsset({
        projectId: testProjectId,
        title: '第一章',
        content: '章节内容',
        index: 1
      });

      // 验证文件存在
      const fileExists = await fs.access(chapter.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // 验证文件内容
      const content = await fs.readFile(chapter.filePath, 'utf-8');
      expect(content).toBe('章节内容');
    });
  });

  describe('场景资产创建', () => {
    it('应该成功创建场景资产', async () => {
      const scene = await helper.createSceneAsset({
        projectId: testProjectId,
        chapterId: 'chapter-123',
        story: '温馨的卧室场景',
        location: '卧室',
        imagePrompt: '温馨的卧室，柔和的灯光'
      });

      expect(scene).toBeDefined();
      expect(scene.type).toBe('text');
      expect(scene.scope).toBe('project');
      expect(scene.category).toBe('scenes');
      expect(scene.status).toBe('none'); // 图片未生成

      // 验证customFields
      const nv = scene.customFields?.novelVideo as NovelVideoFields;
      expect(nv.sceneId).toBeDefined();
      expect(nv.sceneStory).toBe('温馨的卧室场景');
      expect(nv.sceneLocation).toBe('卧室');
      expect(nv.sceneImagePrompt).toBe('温馨的卧室，柔和的灯光');
    });
  });

  describe('角色资产创建', () => {
    it('应该成功创建角色资产', async () => {
      const character = await helper.createCharacterAsset({
        projectId: testProjectId,
        name: '张三',
        appearance: '年轻男子，黑色短发',
        imagePrompt: '年轻的中国男子，黑色短发，阳光帅气',
        soraName: 'zhangsan',
        voiceId: 'voice-001'
      });

      expect(character).toBeDefined();
      expect(character.type).toBe('text');
      expect(character.category).toBe('characters');
      expect(character.status).toBe('none');

      // 验证customFields
      const nv = character.customFields?.novelVideo as NovelVideoFields;
      expect(nv.characterId).toBeDefined();
      expect(nv.characterName).toBe('张三');
      expect(nv.characterAppearance).toBe('年轻男子，黑色短发');
      expect(nv.soraName).toBe('zhangsan');
      expect(nv.voiceId).toBe('voice-001');
    });
  });

  describe('资产查询', () => {
    beforeEach(async () => {
      // 创建测试数据：2个章节，每个章节3个场景
      for (let i = 1; i <= 2; i++) {
        const chapter = await helper.createChapterAsset({
          projectId: testProjectId,
          title: `第${i}章`,
          content: `第${i}章内容`,
          index: i
        });

        const nv = chapter.customFields?.novelVideo as NovelVideoFields;
        const chapterId = nv.chapterId!;

        for (let j = 1; j <= 3; j++) {
          await helper.createSceneAsset({
            projectId: testProjectId,
            chapterId: chapterId,
            story: `第${i}章场景${j}`,
            location: `场景${j}`,
            imagePrompt: `场景${j}的图片提示词`
          });
        }
      }
    });

    it('应该查询项目的所有章节', async () => {
      const chapters = await helper.getChaptersByProject(testProjectId);

      expect(chapters).toHaveLength(2);
      expect(chapters[0].customFields?.novelVideo?.chapterIndex).toBe(1);
      expect(chapters[1].customFields?.novelVideo?.chapterIndex).toBe(2);
    });

    it('应该查询章节的所有场景', async () => {
      const chapters = await helper.getChaptersByProject(testProjectId);
      const firstChapter = chapters[0];
      const nv = firstChapter.customFields?.novelVideo as NovelVideoFields;

      const scenes = await helper.getScenesByChapter(testProjectId, nv.chapterId!);

      expect(scenes).toHaveLength(3);
      scenes.forEach(scene => {
        expect(scene.category).toBe('scenes');
        expect(scene.tags).toContain('scene');
      });
    });

    it('应该查询项目的所有角色', async () => {
      // 创建几个角色
      await helper.createCharacterAsset({
        projectId: testProjectId,
        name: '张三',
        appearance: '年轻男子',
        imagePrompt: '帅气男子'
      });

      await helper.createCharacterAsset({
        projectId: testProjectId,
        name: '李四',
        appearance: '中年女子',
        imagePrompt: '优雅女子'
      });

      const characters = await helper.getCharactersByProject(testProjectId);

      expect(characters).toHaveLength(2);
      expect(characters.every(c => c.category === 'characters')).toBe(true);
    });
  });

  describe('资产更新', () => {
    it('应该更新场景图片路径', async () => {
      const scene = await helper.createSceneAsset({
        projectId: testProjectId,
        chapterId: 'chapter-123',
        story: '场景故事',
        location: '卧室',
        imagePrompt: '温馨卧室'
      });

      expect(scene.status).toBe('none');

      // 更新图片路径
      const imagePath = '/path/to/generated/image.png';
      await helper.updateSceneImage(scene.filePath, imagePath);

      // 验证更新
      const updated = await assetManager.getMetadata(scene.filePath);
      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('success');

      const nv = updated?.customFields?.novelVideo as NovelVideoFields;
      expect(nv.sceneImagePath).toBe(imagePath);
    });

    it('应该更新角色图片路径', async () => {
      const character = await helper.createCharacterAsset({
        projectId: testProjectId,
        name: '张三',
        appearance: '年轻男子',
        imagePrompt: '帅气男子'
      });

      const imagePath = '/path/to/character/image.png';
      await helper.updateCharacterImage(character.filePath, imagePath);

      const updated = await assetManager.getMetadata(character.filePath);
      expect(updated?.status).toBe('success');
    });
  });

  describe('性能测试 - customFields查询', () => {
    it('查询100个章节资产应在100ms内完成', async () => {
      // 创建100个章节资产
      console.log('开始创建100个章节资产...');
      const createStart = performance.now();

      for (let i = 1; i <= 100; i++) {
        await helper.createChapterAsset({
          projectId: testProjectId,
          title: `第${i}章`,
          content: `第${i}章的内容`,
          index: i
        });
      }

      const createDuration = performance.now() - createStart;
      console.log(`创建100个章节耗时: ${createDuration.toFixed(2)}ms`);

      // 测试查询性能
      console.log('开始查询性能测试...');
      const queryStart = performance.now();

      const chapters = await helper.getChaptersByProject(testProjectId);

      const queryDuration = performance.now() - queryStart;
      console.log(`查询100个章节耗时: ${queryDuration.toFixed(2)}ms`);

      // 验证结果
      expect(chapters).toHaveLength(100);
      expect(queryDuration).toBeLessThan(100); // 应在100ms内完成

      // 验证数据完整性
      expect(chapters[0].customFields?.novelVideo?.chapterIndex).toBe(1);
      expect(chapters[99].customFields?.novelVideo?.chapterIndex).toBe(100);
    });

    it('查询包含customFields过滤的场景应高效完成', async () => {
      // 创建多个章节和场景
      const chapter1 = await helper.createChapterAsset({
        projectId: testProjectId,
        title: '第一章',
        content: '内容',
        index: 1
      });

      const chapter2 = await helper.createChapterAsset({
        projectId: testProjectId,
        title: '第二章',
        content: '内容',
        index: 2
      });

      const nv1 = chapter1.customFields?.novelVideo as NovelVideoFields;
      const nv2 = chapter2.customFields?.novelVideo as NovelVideoFields;

      // 为每个章节创建50个场景
      for (let i = 1; i <= 50; i++) {
        await helper.createSceneAsset({
          projectId: testProjectId,
          chapterId: nv1.chapterId!,
          story: `场景${i}`,
          location: `位置${i}`,
          imagePrompt: `提示词${i}`
        });

        await helper.createSceneAsset({
          projectId: testProjectId,
          chapterId: nv2.chapterId!,
          story: `场景${i}`,
          location: `位置${i}`,
          imagePrompt: `提示词${i}`
        });
      }

      // 查询特定章节的场景
      const queryStart = performance.now();
      const scenes = await helper.getScenesByChapter(testProjectId, nv1.chapterId!);
      const queryDuration = performance.now() - queryStart;

      console.log(`查询50个场景耗时: ${queryDuration.toFixed(2)}ms`);

      expect(scenes).toHaveLength(50);
      expect(queryDuration).toBeLessThan(100);
    });
  });

  describe('分镜和配音资产', () => {
    it('应该成功创建分镜资产', async () => {
      const storyboard = await helper.createStoryboardAsset({
        projectId: testProjectId,
        sceneId: 'scene-123',
        type: 'video',
        videoPrompt: '卧室场景视频',
        characterIds: ['char-1', 'char-2']
      });

      expect(storyboard).toBeDefined();
      expect(storyboard.category).toBe('storyboards');

      const nv = storyboard.customFields?.novelVideo as NovelVideoFields;
      expect(nv.storyboardSceneId).toBe('scene-123');
      expect(nv.storyboardType).toBe('video');
      expect(nv.videoPrompt).toBe('卧室场景视频');
    });

    it('应该成功创建配音资产', async () => {
      const voiceover = await helper.createVoiceoverAsset({
        projectId: testProjectId,
        sceneId: 'scene-123',
        dialogueText: '你好，世界！',
        characterId: 'char-1',
        emotion: [0.8, 0.2, 0.1, 0.0, 0.5, 0.1, 0.3, 0.2]
      });

      expect(voiceover).toBeDefined();
      expect(voiceover.category).toBe('voiceovers');

      const nv = voiceover.customFields?.novelVideo as NovelVideoFields;
      expect(nv.voiceoverSceneId).toBe('scene-123');
      expect(nv.dialogueText).toBe('你好，世界！');
      expect(nv.emotion).toHaveLength(8);
    });
  });
});

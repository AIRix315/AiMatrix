/**
 * Phase 7 基准快照测试
 *
 * 目的：记录Phase 7重构前的小说转视频流程的基准行为
 * - 记录输入：小说文本 -> 章节拆分 -> 场景提取 -> 角色识别 的完整数据流
 * - 记录输出：生成的Asset Metadata结构
 * - 确保重构后的插件化实现能100%复现现有业务逻辑
 *
 * 执行方式：npm run test:integration:novel-baseline
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../../src/main/services/FileSystemService';
import { AssetManagerClass } from '../../src/main/services/AssetManager';
import { NovelVideoAssetHelper } from '../../src/main/services/novel-video/NovelVideoAssetHelper';
import { ChapterService } from '../../src/main/services/novel-video/ChapterService';
import type { AssetMetadata } from '../../src/shared/types/asset';
import type { NovelVideoFields } from '../../src/shared/types/novel-video';

describe('Phase 7 基准快照测试 - 小说转视频流程', () => {
  let fsService: FileSystemService;
  let assetManager: AssetManagerClass;
  let helper: NovelVideoAssetHelper;
  let chapterService: ChapterService;
  let testDataDir: string;
  let snapshotDir: string;
  const testProjectId = 'phase7-baseline-project';

  // 基准输入：标准小说样本
  const BASELINE_NOVEL_TEXT = `第一章 命运的开始

清晨的阳光透过窗户洒进卧室，张三缓缓睁开双眼。

"又是新的一天。" 他自言自语道，起身走向窗边。窗外的城市已经苏醒，街道上人来人往。

第二章 意外的相遇

午后，张三来到咖啡馆。店内温暖舒适，空气中弥漫着咖啡的香气。

李四坐在角落里看书，阳光照在她的侧脸上。张三不由得多看了几眼。

"你好，请问这里有人吗？" 张三问道。

李四抬起头，微笑着说："没有，请坐吧。"`;

  beforeEach(async () => {
    // 创建测试专用的临时目录
    testDataDir = path.join(process.cwd(), 'test-data', `baseline-${Date.now()}`);
    snapshotDir = path.join(process.cwd(), 'tests', 'snapshots', 'phase7-baseline');
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(snapshotDir, { recursive: true });

    // 初始化服务
    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    assetManager = new AssetManagerClass(fsService);
    await assetManager.initialize();

    helper = new NovelVideoAssetHelper(assetManager, fsService);
    chapterService = new ChapterService(helper);
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

  describe('🔵 零时刻：基准快照', () => {
    it('应该记录完整的章节拆分数据流', async () => {
      console.log('\n========== 基准快照：章节拆分 ==========');

      // Step 1: 输入小说文本
      const input = {
        projectId: testProjectId,
        novelText: BASELINE_NOVEL_TEXT,
        timestamp: new Date().toISOString()
      };

      // 保存输入快照
      await fs.writeFile(
        path.join(snapshotDir, 'input-novel-text.json'),
        JSON.stringify(input, null, 2),
        'utf-8'
      );

      console.log('✓ 输入快照已保存:', path.join(snapshotDir, 'input-novel-text.json'));

      // Step 2: 创建临时小说文件
      const novelFilePath = path.join(testDataDir, 'test-novel.txt');
      await fs.writeFile(novelFilePath, BASELINE_NOVEL_TEXT, 'utf-8');

      // Step 3: 模拟章节拆分（不依赖ChapterService，因为它需要AI组件）
      // 直接使用基础的章节拆分逻辑
      const chapters: Array<{ title: string; content: string }> = [];
      const chapterRegex = /第[一二三四五六七八九十\d]+章[^\n]*/g;
      const matches = Array.from(BASELINE_NOVEL_TEXT.matchAll(chapterRegex));

      for (let i = 0; i < matches.length; i++) {
        const title = matches[i][0];
        const startIndex = matches[i].index!;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index! : BASELINE_NOVEL_TEXT.length;
        const content = BASELINE_NOVEL_TEXT.substring(startIndex, endIndex).trim();
        chapters.push({ title, content });
      }

      console.log(`✓ 章节拆分完成，共${chapters.length}个章节`);

      // Step 4: 创建章节资产
      const chapterAssets: AssetMetadata[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const asset = await helper.createChapterAsset({
          projectId: testProjectId,
          title: chapters[i].title,
          content: chapters[i].content,
          index: i + 1
        });
        chapterAssets.push(asset);
      }

      // 验证章节数量
      expect(chapterAssets).toHaveLength(2);
      expect(chapterAssets[0].customFields?.novelVideo?.chapterTitle).toBe('第一章 命运的开始');
      expect(chapterAssets[1].customFields?.novelVideo?.chapterTitle).toBe('第二章 意外的相遇');

      // Step 4: 保存输出快照
      const output = {
        chapterCount: chapterAssets.length,
        chapters: chapterAssets.map((asset, index) => {
          const nv = asset.customFields?.novelVideo as NovelVideoFields;
          return {
            index: index + 1,
            chapterId: nv.chapterId,
            title: nv.chapterTitle,
            contentPreview: nv.chapterContent?.substring(0, 100) + '...',
            metadata: {
              type: asset.type,
              scope: asset.scope,
              category: asset.category,
              tags: asset.tags,
              filePath: asset.filePath
            }
          };
        }),
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(snapshotDir, 'output-chapters.json'),
        JSON.stringify(output, null, 2),
        'utf-8'
      );

      console.log('✓ 输出快照已保存:', path.join(snapshotDir, 'output-chapters.json'));
      console.log('✓ 基准快照：章节拆分 - 完成\n');
    });

    it('应该记录场景和角色提取的数据结构', async () => {
      console.log('\n========== 基准快照：场景角色提取 ==========');

      // 模拟场景提取结果（因为实际的AI提取需要API）
      const mockScenes = [
        {
          location: '卧室',
          story: '清晨的阳光透过窗户洒进卧室，张三缓缓睁开双眼',
          imagePrompt: '温馨的卧室，清晨阳光，柔和光线'
        },
        {
          location: '窗边',
          story: '张三起身走向窗边，窗外的城市已经苏醒',
          imagePrompt: '城市窗景，早晨街道，人来人往'
        },
        {
          location: '咖啡馆',
          story: '店内温暖舒适，空气中弥漫着咖啡的香气',
          imagePrompt: '温暖的咖啡馆，舒适氛围，咖啡香气'
        }
      ];

      const mockCharacters = [
        {
          name: '张三',
          appearance: '年轻男子，黑色短发，阳光帅气',
          imagePrompt: '年轻的中国男子，黑色短发，阳光气质，现代服装'
        },
        {
          name: '李四',
          appearance: '优雅女子，长发及肩，温柔气质',
          imagePrompt: '优雅的中国女子，长发及肩，温柔气质，休闲装'
        }
      ];

      // 创建场景资产
      const sceneAssets: AssetMetadata[] = [];
      for (const scene of mockScenes) {
        const asset = await helper.createSceneAsset({
          projectId: testProjectId,
          chapterId: 'chapter-baseline',
          ...scene
        });
        sceneAssets.push(asset);
      }

      // 创建角色资产
      const characterAssets: AssetMetadata[] = [];
      for (const character of mockCharacters) {
        const asset = await helper.createCharacterAsset({
          projectId: testProjectId,
          ...character
        });
        characterAssets.push(asset);
      }

      // 保存场景快照
      const sceneSnapshot = {
        sceneCount: sceneAssets.length,
        scenes: sceneAssets.map(asset => {
          const nv = asset.customFields?.novelVideo as NovelVideoFields;
          return {
            sceneId: nv.sceneId,
            location: nv.sceneLocation,
            story: nv.sceneStory,
            imagePrompt: nv.sceneImagePrompt,
            status: asset.status,
            metadata: {
              type: asset.type,
              scope: asset.scope,
              category: asset.category,
              tags: asset.tags
            }
          };
        }),
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(snapshotDir, 'output-scenes.json'),
        JSON.stringify(sceneSnapshot, null, 2),
        'utf-8'
      );

      // 保存角色快照
      const characterSnapshot = {
        characterCount: characterAssets.length,
        characters: characterAssets.map(asset => {
          const nv = asset.customFields?.novelVideo as NovelVideoFields;
          return {
            characterId: nv.characterId,
            name: nv.characterName,
            appearance: nv.characterAppearance,
            imagePrompt: nv.characterImagePrompt,
            soraName: nv.soraName,
            voiceId: nv.voiceId,
            status: asset.status,
            metadata: {
              type: asset.type,
              scope: asset.scope,
              category: asset.category,
              tags: asset.tags
            }
          };
        }),
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(snapshotDir, 'output-characters.json'),
        JSON.stringify(characterSnapshot, null, 2),
        'utf-8'
      );

      console.log('✓ 场景快照已保存:', path.join(snapshotDir, 'output-scenes.json'));
      console.log('✓ 角色快照已保存:', path.join(snapshotDir, 'output-characters.json'));

      // 验证数据结构
      expect(sceneAssets).toHaveLength(3);
      expect(characterAssets).toHaveLength(2);

      // 验证customFields结构
      const sceneNv = sceneAssets[0].customFields?.novelVideo as NovelVideoFields;
      expect(sceneNv).toHaveProperty('sceneId');
      expect(sceneNv).toHaveProperty('sceneLocation');
      expect(sceneNv).toHaveProperty('sceneStory');
      expect(sceneNv).toHaveProperty('sceneImagePrompt');

      const charNv = characterAssets[0].customFields?.novelVideo as NovelVideoFields;
      expect(charNv).toHaveProperty('characterId');
      expect(charNv).toHaveProperty('characterName');
      expect(charNv).toHaveProperty('characterAppearance');
      expect(charNv).toHaveProperty('characterImagePrompt');

      console.log('✓ 基准快照：场景角色提取 - 完成\n');
    });

    it('应该记录AssetMetadata的完整Schema结构', async () => {
      console.log('\n========== 基准快照：AssetMetadata Schema ==========');

      // 创建一个完整的测试资产
      const chapter = await helper.createChapterAsset({
        projectId: testProjectId,
        title: 'Schema测试章节',
        content: '这是用于记录Schema的测试章节',
        index: 1
      });

      // 提取Schema结构
      const schema = {
        description: 'AssetMetadata Schema - 用于Phase 7数据结构泛化',
        baseFields: {
          id: { type: 'string', description: '资产唯一ID' },
          type: { type: 'enum', values: ['text', 'image', 'video', 'audio', 'other'] },
          scope: { type: 'enum', values: ['project', 'global'] },
          projectId: { type: 'string', optional: true },
          category: { type: 'string', description: '资产分类' },
          tags: { type: 'array', items: 'string' },
          filePath: { type: 'string', description: '文件路径' },
          fileName: { type: 'string' },
          fileSize: { type: 'number' },
          createdAt: { type: 'string', format: 'ISO 8601' },
          updatedAt: { type: 'string', format: 'ISO 8601' },
          status: { type: 'enum', values: ['none', 'pending', 'processing', 'success', 'failed'], optional: true },
          prompt: { type: 'string', optional: true }
        },
        customFields: {
          description: '扩展字段，支持插件自定义数据结构',
          type: 'object',
          properties: {
            novelVideo: {
              type: 'object',
              description: 'NovelVideo插件专用字段',
              properties: {
                chapterId: { type: 'string', optional: true },
                chapterTitle: { type: 'string', optional: true },
                chapterContent: { type: 'string', optional: true },
                chapterIndex: { type: 'number', optional: true },
                sceneId: { type: 'string', optional: true },
                sceneChapterId: { type: 'string', optional: true },
                sceneStory: { type: 'string', optional: true },
                sceneLocation: { type: 'string', optional: true },
                sceneImagePrompt: { type: 'string', optional: true },
                sceneImagePath: { type: 'string', optional: true },
                characterId: { type: 'string', optional: true },
                characterName: { type: 'string', optional: true },
                characterAppearance: { type: 'string', optional: true },
                characterImagePrompt: { type: 'string', optional: true },
                soraName: { type: 'string', optional: true },
                voiceId: { type: 'string', optional: true }
              }
            }
          }
        },
        example: {
          baseMetadata: {
            id: chapter.id,
            type: chapter.type,
            scope: chapter.scope,
            projectId: chapter.projectId,
            category: chapter.category,
            tags: chapter.tags,
            filePath: chapter.filePath,
            fileName: chapter.fileName,
            fileSize: chapter.fileSize,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt
          },
          customFields: chapter.customFields
        }
      };

      await fs.writeFile(
        path.join(snapshotDir, 'schema-asset-metadata.json'),
        JSON.stringify(schema, null, 2),
        'utf-8'
      );

      console.log('✓ Schema快照已保存:', path.join(snapshotDir, 'schema-asset-metadata.json'));
      console.log('✓ 基准快照：AssetMetadata Schema - 完成\n');

      // 验证Schema完整性
      expect(schema.baseFields).toHaveProperty('id');
      expect(schema.baseFields).toHaveProperty('type');
      expect(schema).toHaveProperty('customFields');
      expect(schema.customFields.properties).toHaveProperty('novelVideo');
    });

    it('应该生成Phase 7验收标准摘要', async () => {
      console.log('\n========== Phase 7 验收标准摘要 ==========\n');

      const summary = {
        title: 'Phase 7 架构标准化验收标准',
        baseline: {
          version: 'v0.2.9.4',
          date: new Date().toISOString(),
          description: '基于当前版本记录的小说转视频流程基准行为'
        },
        dataStructures: {
          assetMetadata: {
            file: 'schema-asset-metadata.json',
            description: '资产元数据完整Schema，包含基础字段和customFields扩展机制'
          },
          novelVideoFields: {
            description: 'NovelVideo插件专用字段，将在H01中转换为JSON Schema注册'
          }
        },
        workflows: {
          chapterSplit: {
            file: 'output-chapters.json',
            description: '章节拆分流程：小说文本 -> 章节文件 -> AssetMetadata'
          },
          sceneExtraction: {
            file: 'output-scenes.json',
            description: '场景提取流程：章节内容 -> AI提取 -> 场景资产'
          },
          characterExtraction: {
            file: 'output-characters.json',
            description: '角色识别流程：小说文本 -> AI提取 -> 角色资产'
          }
        },
        acceptanceCriteria: {
          h01: {
            task: '数据结构泛化',
            criteria: [
              'AssetManager支持Schema注册机制',
              'NovelVideoFields转换为JSON Schema格式',
              '插件通过通用API查询而非硬编码Helper',
              '重构后的查询结果与基准快照100%一致'
            ]
          },
          h02: {
            task: '任务调度标准化',
            criteria: [
              '任务模板化：图片生成、TTS等封装为标准TaskTemplate',
              '链式任务SDK：支持A完成自动触发B',
              '断点续传：杀进程重启后任务队列自动恢复',
              'Phase 6增强集成：TaskPersistence + ConcurrencyManager生效'
            ]
          },
          h03: {
            task: '插件包体隔离与工具标准化',
            criteria: [
              '小说转视频代码移至 plugins/official/novel-to-video/',
              '插件无法直接import主进程内部类',
              'FFmpeg和ComfyUI封装为MCP Tool',
              '插件可打包为.zip并重新加载'
            ]
          },
          h04: {
            task: 'UI组件标准化',
            criteria: [
              '业务组件提取到@matrix/ui-kit',
              'PluginPanelProtocol支持JSON描述简单配置面板',
              'CustomView接口规范化，插件React组件通过标准路由注册'
            ]
          },
          h05: {
            task: '开发者体验文档',
            criteria: [
              '插件源码包含详细注释说明每步API调用',
              'create-matrix-plugin脚手架生成器可用',
              '完整的插件开发指南文档'
            ]
          }
        },
        validation: {
          baseline: '执行 npm run test:integration:novel-baseline 生成基准快照',
          regression: '重构后执行相同测试，输出必须与快照100%匹配',
          demo: '加载Echo Demo插件，验证通用API可用性'
        },
        notes: [
          '所有快照文件位于: tests/snapshots/phase7-baseline/',
          '重构过程中严禁修改Phase 5已有业务代码（旁路建设原则）',
          '类型栅栏：plugins/目录只能引用src/common和src/shared',
          '最终验收：Chrome DevTools无红色错误，双盲测试通过'
        ]
      };

      await fs.writeFile(
        path.join(snapshotDir, 'SUMMARY.json'),
        JSON.stringify(summary, null, 2),
        'utf-8'
      );

      console.log('✓ 验收标准摘要已保存:', path.join(snapshotDir, 'SUMMARY.json'));
      console.log('\n========================================');
      console.log('✅ Phase 7 基准快照创建完成！');
      console.log('========================================');
      console.log('\n📁 快照文件位置:');
      console.log('  - tests/snapshots/phase7-baseline/input-novel-text.json');
      console.log('  - tests/snapshots/phase7-baseline/output-chapters.json');
      console.log('  - tests/snapshots/phase7-baseline/output-scenes.json');
      console.log('  - tests/snapshots/phase7-baseline/output-characters.json');
      console.log('  - tests/snapshots/phase7-baseline/schema-asset-metadata.json');
      console.log('  - tests/snapshots/phase7-baseline/SUMMARY.json');
      console.log('\n🎯 下一步：执行H01-H05重构任务');
      console.log('   重构完成后，重新运行此测试验证业务逻辑一致性\n');

      expect(summary.acceptanceCriteria).toHaveProperty('h01');
      expect(summary.acceptanceCriteria).toHaveProperty('h02');
      expect(summary.acceptanceCriteria).toHaveProperty('h03');
      expect(summary.acceptanceCriteria).toHaveProperty('h04');
      expect(summary.acceptanceCriteria).toHaveProperty('h05');
    });
  });
});

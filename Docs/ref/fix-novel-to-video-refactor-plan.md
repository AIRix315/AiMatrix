# 小说转视频工作流 - 完整改造计划

**版本**: v1.0.0
**日期**: 2026-01-01
**状态**: 待实施
**优先级**: P0 (核心功能)

---

## 📋 目录

1. [架构重新理解](#1-架构重新理解)
2. [核心问题识别](#2-核心问题识别)
3. [数据流重新设计](#3-数据流重新设计)
4. [IPC处理器实现计划](#4-ipc处理器实现计划)
5. [主进程服务实现计划](#5-主进程服务实现计划)
6. [前端面板改造计划](#6-前端面板改造计划)
7. [右侧面板集成计划](#7-右侧面板集成计划)
8. [实施步骤](#8-实施步骤)
9. [测试计划](#9-测试计划)
10. [风险评估](#10-风险评估)

---

## 1. 架构重新理解

### 1.1 工作流与插件关系

**正确理解**:
```
工作流（Workflow）
  ├─ 定义: 步骤 + 逻辑 + 提示词 + 输入输出
  ├─ 存储: WorkflowRegistry
  └─ 执行: WorkflowExecutor

      ↓ (打包封装)

插件（Plugin）
  ├─ 本质: 打包后的工作流
  ├─ 目的: 方便用户分享和分发
  └─ 加载: PluginManager
```

**关键澄清**:
- ❌ **错误**: 小说转视频是插件，通过PluginManager加载
- ✅ **正确**: 小说转视频是工作流，通过WorkflowRegistry注册，WorkflowExecutor执行
- ✅ **架构**: WorkflowExecutor命名是为了扩展性，不应改名为PluginExecutor

### 1.2 系统架构层次

```
┌─────────────────────────────────────────────────────┐
│              前端渲染进程 (React)                       │
│  ┌─────────────────┐    ┌─────────────────────┐     │
│  │ WorkflowExecutor │───▶│ 5个步骤面板组件      │     │
│  └─────────────────┘    └─────────────────────┘     │
│           │                      │                    │
│           ▼                      ▼                    │
│  ┌─────────────────────────────────────────────┐     │
│  │      SelectionContext + TaskContext          │     │
│  └─────────────────────────────────────────────┘     │
│           │                      │                    │
└───────────┼──────────────────────┼────────────────────┘
            │                      │
       IPC通信                IPC通信
            │                      │
┌───────────▼──────────────────────▼────────────────────┐
│              主进程 (Node.js)                          │
│  ┌─────────────────────────────────────────────┐     │
│  │          NovelVideoService (新建)            │     │
│  │  ├─ 章节拆分逻辑                              │     │
│  │  ├─ 场景角色提取逻辑                           │     │
│  │  ├─ 分镜生成逻辑                              │     │
│  │  ├─ 配音生成逻辑                              │     │
│  │  └─ 视频导出逻辑                              │     │
│  └─────────────────────────────────────────────┘     │
│           │          │          │          │          │
│           ▼          ▼          ▼          ▼          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │AssetMgr  │ │APIMgr    │ │FSService │ │TimeSvc   ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│  ┌──────────┐ ┌──────────────────────────────────┐  │
│  │WorkflowMgr│ SchemaRegistry                      │  │
│  └──────────┘ └──────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────────────────────────────────────────┐
│              文件系统 & AI服务                          │
│  ┌─────────────────┐    ┌─────────────────────┐     │
│  │ 项目资产目录     │    │ AI API Providers     │     │
│  │ /projects/{id}/  │    │ (OpenAI, Sora, etc)  │     │
│  │ /assets/         │    │                      │     │
│  └─────────────────┘    └─────────────────────┘     │
└───────────────────────────────────────────────────────┘
```

---

## 2. 核心问题识别

### 2.1 严重问题 (P0)

| 问题 | 影响范围 | 优先级 |
|------|---------|--------|
| **所有面板组件使用Mock数据** | 功能完全无法使用 | P0 |
| **IPC处理器完全缺失** | 前后端无法通信 | P0 |
| **主进程服务未实现** | 没有业务逻辑 | P0 |
| **状态持久化未调用** | 刷新丢失进度 | P0 |
| **右侧面板未集成** | 无法编辑参数 | P0 |

### 2.2 中等问题 (P1)

| 问题 | 影响范围 | 优先级 |
|------|---------|--------|
| **双重状态管理** | 数据一致性风险 | P1 |
| **错误处理不完整** | 调试困难 | P1 |
| **资源泄漏风险** | 内存泄漏 | P1 |

### 2.3 轻微问题 (P2)

| 问题 | 影响范围 | 优先级 |
|------|---------|--------|
| **视图模式管理复杂** | 代码维护成本 | P2 |
| **时间戳生成不规范** | 不符合CLAUDE.md | P2 |

---

## 3. 数据流重新设计

### 3.1 核心设计原则

**原则1: 资产驱动 (Asset-Driven)**
- 每个步骤的输出都是资产（Asset）
- 使用 `AssetManager` 统一管理所有中间产物
- 利用 `AssetMetadata.customFields.novelVideo` 存储工作流特定字段

**原则2: 双重状态管理**
- `WorkflowStateManager`: 管理工作流执行状态（当前步骤、步骤状态）
- `AssetManager`: 管理资产数据（章节、场景、角色、分镜、配音）

**原则3: Schema验证**
- 使用 `SchemaRegistry` 验证所有资产数据
- 在创建/更新资产时强制验证

**原则4: 时间规范**
- 所有时间戳必须通过 `TimeService.getCurrentTime()` 获取
- 禁止直接使用 `Date.now()` 或 `new Date()`

### 3.2 数据实体映射

#### 3.2.1 章节 (Chapter) → Asset

```typescript
// AssetMetadata
{
  id: "asset-chapter-{timestamp}",
  type: "text",
  scope: "project",
  projectId: "{projectId}",
  category: "novel-to-video.chapter",
  name: "第一章 命运的开始",
  path: "/projects/{projectId}/assets/chapters/chapter-1.txt",
  mimeType: "text/plain",
  size: 12345,
  createdAt: "2026-01-01T00:00:00.000Z",
  modifiedAt: "2026-01-01T00:00:00.000Z",

  // 小说转视频专用字段
  customFields: {
    novelVideo: {
      chapterId: "chapter-1703001234567",
      chapterTitle: "第一章 命运的开始",
      chapterContent: "清晨的阳光透过窗户洒进卧室...",
      chapterIndex: 1
    }
  }
}
```

#### 3.2.2 场景 (Scene) → Asset

```typescript
// AssetMetadata
{
  id: "asset-scene-{timestamp}",
  type: "text",
  scope: "project",
  projectId: "{projectId}",
  category: "novel-to-video.scene",
  name: "场景1: 卧室",
  path: "/projects/{projectId}/assets/scenes/scene-1.json",
  mimeType: "application/json",

  customFields: {
    novelVideo: {
      sceneId: "scene-1703001234568",
      sceneChapterId: "chapter-1703001234567",
      sceneStory: "清晨的阳光透过窗户洒进卧室，张三缓缓睁开双眼",
      sceneLocation: "卧室",
      sceneImagePrompt: "温馨的卧室，清晨阳光，柔和光线，现代简约风格",
      sceneImagePath: "/projects/{projectId}/assets/scenes/scene-1-bg.png" // 生成后更新
    }
  }
}
```

#### 3.2.3 角色 (Character) → Asset

```typescript
// AssetMetadata
{
  id: "asset-character-{timestamp}",
  type: "image",
  scope: "project", // 可提升为global复用
  projectId: "{projectId}",
  category: "novel-to-video.character",
  name: "张三",
  path: "/projects/{projectId}/assets/characters/zhangsan.png",
  mimeType: "image/png",

  // AI生成属性
  aiGenerated: true,
  aiPrompt: "年轻的中国男子，黑色短发，阳光气质，现代服装",
  aiModel: "DALL-E 3",
  aiSeed: 123456789,

  customFields: {
    novelVideo: {
      characterId: "character-1703001234569",
      characterName: "张三",
      characterAppearance: "年轻男子，黑色短发，阳光帅气",
      characterImagePrompt: "年轻的中国男子，黑色短发，阳光气质，现代服装",
      soraName: "zhangsan",
      voiceId: "voice-001"
    }
  }
}
```

#### 3.2.4 分镜 (Storyboard) → Asset

```typescript
// AssetMetadata (视频分镜)
{
  id: "asset-storyboard-{timestamp}",
  type: "video",
  scope: "project",
  projectId: "{projectId}",
  category: "novel-to-video.storyboard",
  name: "分镜1: 张三醒来",
  path: "/projects/{projectId}/assets/storyboards/storyboard-1.mp4",
  mimeType: "video/mp4",

  // AI生成属性
  aiGenerated: true,
  aiPrompt: "清晨卧室场景，张三睁开眼睛，镜头推进",
  aiModel: "Sora v2",
  aiSeed: 987654321,

  customFields: {
    novelVideo: {
      storyboardSceneId: "scene-1703001234568",
      storyboardType: "video",
      videoPrompt: "清晨卧室场景，张三睁开眼睛，镜头推进",
      characterIds: ["character-1703001234569"]
    }
  }
}

// AssetMetadata (图片分镜)
{
  id: "asset-storyboard-{timestamp}",
  type: "image",
  scope: "project",
  projectId: "{projectId}",
  category: "novel-to-video.storyboard",
  name: "分镜2: 张三起床",
  path: "/projects/{projectId}/assets/storyboards/storyboard-2/",

  customFields: {
    novelVideo: {
      storyboardSceneId: "scene-1703001234569",
      storyboardType: "image",
      imagePrompts: [
        "张三坐起身，阳光照在脸上",
        "张三站在窗边，眺望窗外",
        "张三走向衣柜，准备换衣服"
      ],
      characterIds: ["character-1703001234569"]
    }
  }
}
```

#### 3.2.5 配音 (Voiceover) → Asset

```typescript
// AssetMetadata
{
  id: "asset-voiceover-{timestamp}",
  type: "audio",
  scope: "project",
  projectId: "{projectId}",
  category: "novel-to-video.voiceover",
  name: "配音1: 张三旁白",
  path: "/projects/{projectId}/assets/voiceovers/voiceover-1.mp3",
  mimeType: "audio/mpeg",

  // AI生成属性
  aiGenerated: true,
  aiPrompt: "又是新的一天",
  aiModel: "Azure TTS",

  customFields: {
    novelVideo: {
      voiceoverSceneId: "scene-1703001234568",
      dialogueText: "又是新的一天",
      dialogueCharacterId: "character-1703001234569",
      emotion: [0.6, 0.1, 0.0, 0.0, 0.3, 0.0, 0.2, 0.0] // 8维情绪向量
    }
  }
}
```

### 3.3 数据流转图

```
用户上传小说文件 (novel.txt)
    │
    ▼
[步骤1: 章节拆分] → NovelVideoService.splitChapters()
    │                  ├─ 调用AI API (GPT-4) 识别章节
    │                  ├─ 创建Chapter资产 (AssetManager.createAsset)
    │                  └─ 保存章节文本文件
    ▼
Chapter[] 资产
    │
    ▼
[步骤2: 场景角色提取] → NovelVideoService.extractScenesAndCharacters()
    │                      ├─ 调用AI API (GPT-4) 分析章节
    │                      ├─ 创建Scene资产 (AssetManager.createAsset)
    │                      ├─ 创建Character资产 (AssetManager.createAsset)
    │                      └─ 可选: 生成角色/场景图片 (DALL-E)
    ▼
Scene[] + Character[] 资产
    │
    ▼
[步骤3: 分镜生成] → NovelVideoService.generateStoryboards()
    │                 ├─ 调用AI API (Sora/Runway) 生成视频
    │                 ├─ 或调用AI API (DALL-E/Midjourney) 生成图片序列
    │                 ├─ 创建Storyboard资产 (AssetManager.createAsset)
    │                 └─ 保存生成的视频/图片文件
    ▼
Storyboard[] 资产
    │
    ▼
[步骤4: 配音生成] → NovelVideoService.generateVoiceovers()
    │                  ├─ 调用AI API (Azure TTS/ElevenLabs) 生成音频
    │                  ├─ 创建Voiceover资产 (AssetManager.createAsset)
    │                  └─ 保存生成的音频文件
    ▼
Voiceover[] 资产
    │
    ▼
[步骤5: 视频导出] → NovelVideoService.exportVideo()
    │                 ├─ 使用FFmpeg合成视频
    │                 ├─ 合并分镜视频/图片序列
    │                 ├─ 添加配音轨道
    │                 └─ 导出最终视频文件
    ▼
最终视频 (final.mp4)
```

### 3.4 状态管理双轨制

#### 工作流状态 (WorkflowStateManager)

```typescript
// /data/workflows/{workflowId}/state.json
{
  workflowId: "novel-to-video-1703001234567-abc123",
  projectId: "project-uuid-1234",
  currentStep: 2, // 当前在"场景角色提取"步骤
  currentSubStep: -1,
  steps: {
    "split-chapters": {
      status: "completed",
      updatedAt: "2026-01-01T01:00:00.000Z",
      data: {
        completedAt: "2026-01-01T01:00:00.000Z",
        chapterCount: 5
      }
    },
    "extract-scenes": {
      status: "in_progress",
      updatedAt: "2026-01-01T01:05:00.000Z"
    },
    "generate-storyboard": {
      status: "pending",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    // ...其他步骤
  },
  data: {
    novelPath: "E:/novels/my-novel.txt",
    fileName: "my-novel.txt"
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T01:05:00.000Z"
}
```

#### 资产数据 (AssetManager)

```typescript
// /projects/{projectId}/assets/.index.json
{
  assets: [
    {
      id: "asset-chapter-1",
      type: "text",
      category: "novel-to-video.chapter",
      name: "第一章 命运的开始",
      // ...完整AssetMetadata
    },
    {
      id: "asset-scene-1",
      type: "text",
      category: "novel-to-video.scene",
      name: "场景1: 卧室",
      // ...完整AssetMetadata
    },
    // ...更多资产
  ],
  stats: {
    totalCount: 23,
    byType: {
      text: 8,
      image: 5,
      video: 3,
      audio: 7
    },
    byCategory: {
      "novel-to-video.chapter": 5,
      "novel-to-video.scene": 3,
      "novel-to-video.character": 2,
      "novel-to-video.storyboard": 3,
      "novel-to-video.voiceover": 7
    }
  },
  lastScanned: "2026-01-01T01:05:00.000Z"
}
```

---

## 4. IPC处理器实现计划

### 4.1 新增IPC通道列表

**文件**: `src/main/ipc/novel-video-handlers.ts` (新建)

| 通道名称 | 功能 | 请求参数 | 返回值 |
|---------|------|---------|-------|
| `novel-video:split-chapters` | 章节拆分 | `(workflowId, filePath)` | `Chapter[]` |
| `novel-video:extract-scenes` | 提取场景角色 | `(workflowId, chapterId)` | `{scenes, characters}` |
| `novel-video:generate-storyboards` | 生成分镜 | `(workflowId, sceneIds, type)` | `Storyboard[]` |
| `novel-video:regenerate-storyboard` | 重新生成分镜 | `(workflowId, storyboardId, prompt)` | `Storyboard` |
| `novel-video:generate-voiceovers` | 生成配音 | `(workflowId, storyboardIds, voiceType)` | `Voiceover[]` |
| `novel-video:regenerate-voiceover` | 重新生成配音 | `(workflowId, voiceoverId, text, voiceType)` | `Voiceover` |
| `novel-video:export-video` | 导出视频 | `(workflowId, options)` | `{videoPath}` |
| `novel-video:update-chapter` | 更新章节 | `(assetId, updates)` | `Chapter` |
| `novel-video:update-character` | 更新角色 | `(assetId, updates)` | `Character` |
| `novel-video:delete-chapter` | 删除章节 | `(assetId)` | `void` |
| `novel-video:delete-character` | 删除角色 | `(assetId)` | `void` |

### 4.2 IPC处理器实现骨架

```typescript
/**
 * 小说转视频工作流IPC处理器
 * 文件: src/main/ipc/novel-video-handlers.ts
 */

import { ipcMain } from 'electron'
import { logger } from '../services/Logger'
import { novelVideoService } from '../services/NovelVideoService'
import { AssetMetadata } from '@/shared/types'

/**
 * 注册小说转视频相关IPC处理器
 */
export function registerNovelVideoHandlers(): void {
  /**
   * 章节拆分
   */
  ipcMain.handle(
    'novel-video:split-chapters',
    async (_event, workflowId: string, filePath: string) => {
      try {
        logger.info(`开始章节拆分: ${filePath}`, 'novel-video-handlers', { workflowId })

        const chapters = await novelVideoService.splitChapters(workflowId, filePath)

        logger.info(
          `章节拆分成功: ${chapters.length}章`,
          'novel-video-handlers',
          { workflowId, chapterCount: chapters.length }
        )

        return chapters
      } catch (error) {
        logger.error('章节拆分失败', 'novel-video-handlers', { error, workflowId, filePath })
        throw error
      }
    }
  )

  /**
   * 提取场景和角色
   */
  ipcMain.handle(
    'novel-video:extract-scenes',
    async (_event, workflowId: string, chapterId: string) => {
      try {
        logger.info(`开始提取场景和角色: ${chapterId}`, 'novel-video-handlers', { workflowId })

        const result = await novelVideoService.extractScenesAndCharacters(workflowId, chapterId)

        logger.info(
          `提取成功: ${result.scenes.length}个场景, ${result.characters.length}个角色`,
          'novel-video-handlers',
          { workflowId, sceneCount: result.scenes.length, characterCount: result.characters.length }
        )

        return result
      } catch (error) {
        logger.error('提取场景和角色失败', 'novel-video-handlers', { error, workflowId, chapterId })
        throw error
      }
    }
  )

  /**
   * 生成分镜
   */
  ipcMain.handle(
    'novel-video:generate-storyboards',
    async (_event, workflowId: string, sceneIds: string[], type: 'image' | 'video') => {
      try {
        logger.info(
          `开始生成分镜: ${sceneIds.length}个场景`,
          'novel-video-handlers',
          { workflowId, type }
        )

        const storyboards = await novelVideoService.generateStoryboards(workflowId, sceneIds, type)

        logger.info(
          `分镜生成成功: ${storyboards.length}个分镜`,
          'novel-video-handlers',
          { workflowId, storyboardCount: storyboards.length }
        )

        return storyboards
      } catch (error) {
        logger.error('生成分镜失败', 'novel-video-handlers', { error, workflowId, sceneIds, type })
        throw error
      }
    }
  )

  /**
   * 重新生成单个分镜
   */
  ipcMain.handle(
    'novel-video:regenerate-storyboard',
    async (_event, workflowId: string, storyboardId: string, prompt: string) => {
      try {
        logger.info(`重新生成分镜: ${storyboardId}`, 'novel-video-handlers', { workflowId })

        const storyboard = await novelVideoService.regenerateStoryboard(
          workflowId,
          storyboardId,
          prompt
        )

        logger.info(`分镜重新生成成功`, 'novel-video-handlers', { workflowId, storyboardId })

        return storyboard
      } catch (error) {
        logger.error('重新生成分镜失败', 'novel-video-handlers', { error, workflowId, storyboardId })
        throw error
      }
    }
  )

  /**
   * 生成配音
   */
  ipcMain.handle(
    'novel-video:generate-voiceovers',
    async (_event, workflowId: string, storyboardIds: string[], voiceType: string) => {
      try {
        logger.info(
          `开始生成配音: ${storyboardIds.length}个分镜`,
          'novel-video-handlers',
          { workflowId, voiceType }
        )

        const voiceovers = await novelVideoService.generateVoiceovers(
          workflowId,
          storyboardIds,
          voiceType
        )

        logger.info(
          `配音生成成功: ${voiceovers.length}段配音`,
          'novel-video-handlers',
          { workflowId, voiceoverCount: voiceovers.length }
        )

        return voiceovers
      } catch (error) {
        logger.error('生成配音失败', 'novel-video-handlers', { error, workflowId, storyboardIds })
        throw error
      }
    }
  )

  /**
   * 重新生成单个配音
   */
  ipcMain.handle(
    'novel-video:regenerate-voiceover',
    async (
      _event,
      workflowId: string,
      voiceoverId: string,
      text: string,
      voiceType: string
    ) => {
      try {
        logger.info(`重新生成配音: ${voiceoverId}`, 'novel-video-handlers', { workflowId })

        const voiceover = await novelVideoService.regenerateVoiceover(
          workflowId,
          voiceoverId,
          text,
          voiceType
        )

        logger.info(`配音重新生成成功`, 'novel-video-handlers', { workflowId, voiceoverId })

        return voiceover
      } catch (error) {
        logger.error('重新生成配音失败', 'novel-video-handlers', { error, workflowId, voiceoverId })
        throw error
      }
    }
  )

  /**
   * 导出视频
   */
  ipcMain.handle(
    'novel-video:export-video',
    async (_event, workflowId: string, options: any) => {
      try {
        logger.info(`开始导出视频`, 'novel-video-handlers', { workflowId, options })

        const result = await novelVideoService.exportVideo(workflowId, options)

        logger.info(`视频导出成功: ${result.videoPath}`, 'novel-video-handlers', { workflowId })

        return result
      } catch (error) {
        logger.error('导出视频失败', 'novel-video-handlers', { error, workflowId, options })
        throw error
      }
    }
  )

  logger.info('小说转视频IPC处理器已注册', 'novel-video-handlers')
}
```

### 4.3 预加载脚本更新

**文件**: `src/preload/index.ts`

```typescript
// 在 contextBridge.exposeInMainWorld('electronAPI', { ... }) 中添加:

novelVideo: {
  /**
   * 章节拆分
   */
  splitChapters: (workflowId: string, filePath: string): Promise<any[]> =>
    ipcRenderer.invoke('novel-video:split-chapters', workflowId, filePath),

  /**
   * 提取场景和角色
   */
  extractScenesAndCharacters: (workflowId: string, chapterId: string): Promise<any> =>
    ipcRenderer.invoke('novel-video:extract-scenes', workflowId, chapterId),

  /**
   * 生成分镜
   */
  generateStoryboards: (
    workflowId: string,
    sceneIds: string[],
    type: 'image' | 'video'
  ): Promise<any[]> =>
    ipcRenderer.invoke('novel-video:generate-storyboards', workflowId, sceneIds, type),

  /**
   * 重新生成分镜
   */
  regenerateStoryboard: (
    workflowId: string,
    storyboardId: string,
    prompt: string
  ): Promise<any> =>
    ipcRenderer.invoke('novel-video:regenerate-storyboard', workflowId, storyboardId, prompt),

  /**
   * 生成配音
   */
  generateVoiceovers: (
    workflowId: string,
    storyboardIds: string[],
    voiceType: string
  ): Promise<any[]> =>
    ipcRenderer.invoke('novel-video:generate-voiceovers', workflowId, storyboardIds, voiceType),

  /**
   * 重新生成配音
   */
  regenerateVoiceover: (
    workflowId: string,
    voiceoverId: string,
    text: string,
    voiceType: string
  ): Promise<any> =>
    ipcRenderer.invoke(
      'novel-video:regenerate-voiceover',
      workflowId,
      voiceoverId,
      text,
      voiceType
    ),

  /**
   * 导出视频
   */
  exportVideo: (workflowId: string, options: any): Promise<any> =>
    ipcRenderer.invoke('novel-video:export-video', workflowId, options)
},
```

### 4.4 TypeScript类型定义

**文件**: `src/shared/types/electron-api.d.ts`

```typescript
interface ElectronAPI {
  // ...现有API

  novelVideo: {
    splitChapters: (workflowId: string, filePath: string) => Promise<Chapter[]>
    extractScenesAndCharacters: (
      workflowId: string,
      chapterId: string
    ) => Promise<{ scenes: Scene[]; characters: Character[] }>
    generateStoryboards: (
      workflowId: string,
      sceneIds: string[],
      type: 'image' | 'video'
    ) => Promise<Storyboard[]>
    regenerateStoryboard: (
      workflowId: string,
      storyboardId: string,
      prompt: string
    ) => Promise<Storyboard>
    generateVoiceovers: (
      workflowId: string,
      storyboardIds: string[],
      voiceType: string
    ) => Promise<Voiceover[]>
    regenerateVoiceover: (
      workflowId: string,
      voiceoverId: string,
      text: string,
      voiceType: string
    ) => Promise<Voiceover>
    exportVideo: (workflowId: string, options: ExportOptions) => Promise<{ videoPath: string }>
  }
}
```

---

## 5. 主进程服务实现计划

### 5.1 NovelVideoService服务类

**文件**: `src/main/services/NovelVideoService.ts` (新建)

```typescript
/**
 * NovelVideoService - 小说转视频核心业务逻辑
 *
 * 功能：
 * - 章节拆分（AI识别）
 * - 场景角色提取（AI分析）
 * - 分镜生成（视频/图片）
 * - 配音生成（TTS）
 * - 视频导出（FFmpeg合成）
 *
 * 依赖服务：
 * - AssetManager: 资产管理
 * - APIManager: AI API调用
 * - FileSystemService: 文件操作
 * - TimeService: 时间服务
 * - WorkflowStateManager: 状态管理
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { AssetManagerClass } from './AssetManager'
import { APIManager } from './APIManager'
import { FileSystemService } from './FileSystemService'
import { logger } from './Logger'
import { timeService } from './TimeService'
import { errorHandler, ErrorCode } from './ServiceErrorHandler'
import { AssetMetadata, AssetImportParams } from '@/shared/types'
import { ChapterData, SceneData, CharacterData, StoryboardData, VoiceoverData } from '@/shared/types/novel-video'

export class NovelVideoService {
  private assetManager: AssetManagerClass
  private apiManager: APIManager
  private fsService: FileSystemService

  constructor(
    assetManager: AssetManagerClass,
    apiManager: APIManager,
    fsService: FileSystemService
  ) {
    this.assetManager = assetManager
    this.apiManager = apiManager
    this.fsService = fsService
  }

  /**
   * 章节拆分
   * @param workflowId 工作流ID
   * @param filePath 小说文件路径
   * @returns 章节资产数组
   */
  async splitChapters(workflowId: string, filePath: string): Promise<AssetMetadata[]> {
    try {
      await logger.info(`开始章节拆分: ${filePath}`, 'NovelVideoService', { workflowId })

      // 1. 读取小说文件内容
      const content = await fs.readFile(filePath, 'utf-8')

      // 2. 调用AI API识别章节
      // TODO: 实现AI章节识别逻辑
      // const chaptersData = await this.aiSplitChapters(content)

      // 临时: 简单按"第X章"分割
      const chaptersData = this.simpleSplitChapters(content)

      // 3. 为每个章节创建资产
      const chapterAssets: AssetMetadata[] = []

      for (let i = 0; i < chaptersData.length; i++) {
        const chapterData = chaptersData[i]
        const currentTime = (await timeService.getCurrentTime()).toISOString()

        // 保存章节文本到项目目录
        const chapterFileName = `chapter-${i + 1}.txt`
        const chapterPath = path.join(
          this.fsService.getProjectDir(workflowId),
          'assets',
          'chapters',
          chapterFileName
        )

        await this.fsService.ensureDir(path.dirname(chapterPath))
        await fs.writeFile(chapterPath, chapterData.content, 'utf-8')

        // 创建资产
        const asset = await this.assetManager.importAsset({
          projectId: workflowId,
          sourcePath: chapterPath,
          name: chapterData.title,
          category: 'novel-to-video.chapter',
          scope: 'project',
          customFields: {
            novelVideo: {
              chapterId: `chapter-${Date.now()}-${i}`,
              chapterTitle: chapterData.title,
              chapterContent: chapterData.content,
              chapterIndex: i
            }
          }
        })

        chapterAssets.push(asset)
      }

      await logger.info(
        `章节拆分成功: ${chapterAssets.length}章`,
        'NovelVideoService',
        { workflowId, chapterCount: chapterAssets.length }
      )

      return chapterAssets
    } catch (error) {
      await logger.error('章节拆分失败', 'NovelVideoService', { error, workflowId, filePath })
      throw errorHandler.createError(
        ErrorCode.OPERATION_FAILED,
        'NovelVideoService',
        'splitChapters',
        `章节拆分失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 简单章节拆分（按"第X章"分割）
   * @param content 小说内容
   * @returns 章节数据数组
   */
  private simpleSplitChapters(content: string): ChapterData[] {
    // 按"第X章"分割
    const chapterRegex = /第[一二三四五六七八九十百千万\d]+章\s*[\s\S]*?(?=第[一二三四五六七八九十百千万\d]+章|$)/g
    const matches = content.match(chapterRegex) || []

    return matches.map((match, index) => {
      const lines = match.trim().split('\n')
      const title = lines[0].trim()
      const chapterContent = lines.slice(1).join('\n').trim()

      return {
        projectId: '',
        title,
        content: chapterContent,
        index
      }
    })
  }

  /**
   * AI章节拆分（使用GPT-4）
   * @param content 小说内容
   * @returns 章节数据数组
   */
  private async aiSplitChapters(content: string): Promise<ChapterData[]> {
    // TODO: 实现AI章节识别
    // 1. 调用GPT-4 API
    // 2. 使用prompt让AI识别章节边界和标题
    // 3. 返回结构化的章节数据

    throw new Error('AI章节拆分未实现')
  }

  /**
   * 提取场景和角色
   * @param workflowId 工作流ID
   * @param chapterId 章节ID（资产ID）
   * @returns 场景和角色资产
   */
  async extractScenesAndCharacters(
    workflowId: string,
    chapterId: string
  ): Promise<{ scenes: AssetMetadata[]; characters: AssetMetadata[] }> {
    try {
      await logger.info(`开始提取场景和角色: ${chapterId}`, 'NovelVideoService', { workflowId })

      // 1. 加载章节资产
      const chapterAsset = await this.assetManager.getAsset(chapterId)
      if (!chapterAsset) {
        throw new Error(`章节资产不存在: ${chapterId}`)
      }

      const chapterContent = chapterAsset.customFields?.novelVideo?.chapterContent || ''

      // 2. 调用AI API提取场景和角色
      // TODO: 实现AI场景角色提取逻辑
      // const { scenesData, charactersData } = await this.aiExtractScenesAndCharacters(chapterContent)

      // 临时: 简单模拟
      const { scenesData, charactersData } = this.simpleExtractScenesAndCharacters(chapterContent)

      // 3. 创建场景资产
      const sceneAssets: AssetMetadata[] = []
      for (const sceneData of scenesData) {
        const sceneAsset = await this.createSceneAsset(workflowId, chapterId, sceneData)
        sceneAssets.push(sceneAsset)
      }

      // 4. 创建角色资产
      const characterAssets: AssetMetadata[] = []
      for (const characterData of charactersData) {
        const characterAsset = await this.createCharacterAsset(workflowId, characterData)
        characterAssets.push(characterAsset)
      }

      await logger.info(
        `提取成功: ${sceneAssets.length}个场景, ${characterAssets.length}个角色`,
        'NovelVideoService',
        { workflowId, sceneCount: sceneAssets.length, characterCount: characterAssets.length }
      )

      return {
        scenes: sceneAssets,
        characters: characterAssets
      }
    } catch (error) {
      await logger.error('提取场景和角色失败', 'NovelVideoService', { error, workflowId, chapterId })
      throw error
    }
  }

  /**
   * 简单场景角色提取（模拟）
   */
  private simpleExtractScenesAndCharacters(
    content: string
  ): { scenesData: SceneData[]; charactersData: CharacterData[] } {
    // TODO: 实现真实提取逻辑
    return {
      scenesData: [],
      charactersData: []
    }
  }

  /**
   * 创建场景资产
   */
  private async createSceneAsset(
    projectId: string,
    chapterId: string,
    sceneData: SceneData
  ): Promise<AssetMetadata> {
    // TODO: 实现场景资产创建
    throw new Error('未实现')
  }

  /**
   * 创建角色资产
   */
  private async createCharacterAsset(
    projectId: string,
    characterData: CharacterData
  ): Promise<AssetMetadata> {
    // TODO: 实现角色资产创建
    throw new Error('未实现')
  }

  /**
   * 生成分镜
   * @param workflowId 工作流ID
   * @param sceneIds 场景ID数组
   * @param type 分镜类型
   * @returns 分镜资产数组
   */
  async generateStoryboards(
    workflowId: string,
    sceneIds: string[],
    type: 'image' | 'video'
  ): Promise<AssetMetadata[]> {
    // TODO: 实现分镜生成逻辑
    // 1. 加载场景资产
    // 2. 调用Sora/DALL-E API生成视频/图片
    // 3. 创建分镜资产
    throw new Error('未实现')
  }

  /**
   * 重新生成分镜
   */
  async regenerateStoryboard(
    workflowId: string,
    storyboardId: string,
    prompt: string
  ): Promise<AssetMetadata> {
    // TODO: 实现分镜重新生成逻辑
    throw new Error('未实现')
  }

  /**
   * 生成配音
   */
  async generateVoiceovers(
    workflowId: string,
    storyboardIds: string[],
    voiceType: string
  ): Promise<AssetMetadata[]> {
    // TODO: 实现配音生成逻辑
    throw new Error('未实现')
  }

  /**
   * 重新生成配音
   */
  async regenerateVoiceover(
    workflowId: string,
    voiceoverId: string,
    text: string,
    voiceType: string
  ): Promise<AssetMetadata> {
    // TODO: 实现配音重新生成逻辑
    throw new Error('未实现')
  }

  /**
   * 导出视频
   */
  async exportVideo(
    workflowId: string,
    options: any
  ): Promise<{ videoPath: string }> {
    // TODO: 实现视频导出逻辑
    // 1. 加载所有分镜和配音资产
    // 2. 使用FFmpeg合成视频
    // 3. 返回视频路径
    throw new Error('未实现')
  }
}

// 导出单例
export let novelVideoService: NovelVideoService

export function initNovelVideoService(
  assetManager: AssetManagerClass,
  apiManager: APIManager,
  fsService: FileSystemService
): void {
  novelVideoService = new NovelVideoService(assetManager, apiManager, fsService)
}
```

### 5.2 服务初始化

**文件**: `src/main/index.ts`

```typescript
// 在主进程启动时初始化NovelVideoService

import { initNovelVideoService } from './services/NovelVideoService'
import { registerNovelVideoHandlers } from './ipc/novel-video-handlers'

// ...其他导入和初始化

// 初始化NovelVideoService
initNovelVideoService(assetManager, apiManager, fsService)

// 注册IPC处理器
registerNovelVideoHandlers()
```

---

## 6. 前端面板改造计划

### 6.1 删除Mock数据

**影响文件**:
- `ChapterSplitPanel.tsx`
- `SceneCharacterPanel.tsx`
- `StoryboardPanel.tsx`
- `VoiceoverPanel.tsx`
- `ExportPanel.tsx`

**改造策略**:
1. 删除所有`mockXXX`数据生成代码
2. 替换为真实IPC调用
3. 添加错误处理和重试逻辑
4. 添加Loading和进度指示

### 6.2 ChapterSplitPanel改造

**文件**: `src/renderer/pages/workflows/panels/ChapterSplitPanel.tsx`

**改造前** (line 89-99):
```typescript
// TODO: 调用IPC API拆分章节
// const result = await window.electronAPI.novelVideo.splitChapters(workflowId, novelPath);

// 临时模拟数据
const mockChapters: Chapter[] = Array.from({ length: 5 }, (_, i) => ({
  id: `chapter-${i + 1}`,
  title: `第${i + 1}章`,
  index: i,
  content: `这是第${i + 1}章的内容...`,
  wordCount: 1000 + i * 100
}));
```

**改造后**:
```typescript
// 调用真实IPC API
const chapterAssets = await window.electronAPI.novelVideo.splitChapters(
  workflowId,
  novelPath
)

// 转换AssetMetadata为Chapter显示格式
const chapters: Chapter[] = chapterAssets.map((asset) => ({
  id: asset.id,
  title: asset.customFields?.novelVideo?.chapterTitle || asset.name,
  index: asset.customFields?.novelVideo?.chapterIndex || 0,
  content: asset.customFields?.novelVideo?.chapterContent || '',
  wordCount: asset.customFields?.novelVideo?.chapterContent?.length || 0
}))
```

### 6.3 SceneCharacterPanel改造

**文件**: `src/renderer/pages/workflows/panels/SceneCharacterPanel.tsx`

**改造前** (line 80-96):
```typescript
// TODO: 调用IPC API提取场景和角色
// const result = await window.electronAPI.novelVideo.extractScenesAndCharacters(workflowId, selectedChapterId);

// 临时模拟数据
const mockScenes: Scene[] = Array.from({ length: 3 }, (_, i) => ({ ... }))
const mockCharacters: Character[] = Array.from({ length: 2 }, (_, i) => ({ ... }))
```

**改造后**:
```typescript
// 调用真实IPC API
const result = await window.electronAPI.novelVideo.extractScenesAndCharacters(
  workflowId,
  selectedChapterId
)

// 转换AssetMetadata为Scene和Character显示格式
const extractedScenes: Scene[] = result.scenes.map((asset) => ({
  id: asset.id,
  name: asset.name,
  description: asset.customFields?.novelVideo?.sceneStory || '',
  location: asset.customFields?.novelVideo?.sceneLocation,
  atmosphere: '', // 可选字段
  chapterId: asset.customFields?.novelVideo?.sceneChapterId
}))

const extractedCharacters: Character[] = result.characters.map((asset) => ({
  id: asset.id,
  name: asset.customFields?.novelVideo?.characterName || asset.name,
  description: asset.customFields?.novelVideo?.characterAppearance || '',
  appearance: asset.customFields?.novelVideo?.characterAppearance,
  personality: '', // 可选字段
  chapterId: asset.customFields?.novelVideo?.chapterId
}))
```

### 6.4 StoryboardPanel改造

**文件**: `src/renderer/pages/workflows/panels/StoryboardPanel.tsx`

**改造点**:
1. 删除Mock数据生成 (line 156-166)
2. 实现真实分镜生成逻辑
3. 实现重新生成逻辑
4. 集成右侧面板属性编辑

### 6.5 VoiceoverPanel改造

**文件**: `src/renderer/pages/workflows/panels/VoiceoverPanel.tsx`

**改造点**:
1. 删除Mock数据生成 (line 60-67)
2. 实现真实配音生成逻辑
3. 实现音频播放功能（使用真实音频文件）
4. 实现重新生成逻辑

### 6.6 状态持久化集成

**文件**: `src/renderer/pages/workflows/WorkflowExecutor.tsx`

**改造前** (line 421-422):
```typescript
// TODO: 保存工作流状态到主进程
// await window.electronAPI.saveWorkflow(workflowId, { ...workflowState, data: newData });
```

**改造后**:
```typescript
// 保存工作流状态
await window.electronAPI.workflow.saveState(actualWorkflowId, {
  ...workflowState.state,
  data: newData,
  currentStep: currentStepIndex + 1,
  updatedAt: new Date().toISOString()
})
```

**同时在步骤点击时也要保存状态**:
```typescript
const handleStepClick = async (stepIndex: number) => {
  if (!canClickStep(stepIndex) || !workflowState) return

  const steps = [...workflowState.steps]

  // 更新步骤状态
  steps[workflowState.currentStepIndex].status =
    stepIndex > workflowState.currentStepIndex ? 'completed' : 'pending'
  steps[stepIndex].status = 'in_progress'

  const newState = {
    ...workflowState,
    currentStepIndex: stepIndex,
    steps
  }

  setWorkflowState(newState)

  // 保存状态到主进程
  await window.electronAPI.workflow.saveState(actualWorkflowId, newState.state)
}
```

---

## 7. 右侧面板集成计划

### 7.1 当前状态分析

**GlobalRightPanel** 已实现3个TAB:
- **属性TAB**: 显示选中项的属性（通过SelectionContext获取）
- **工具TAB**: 显示关联资产
- **队列TAB**: 显示任务队列

**问题**:
- 属性TAB目前仅显示静态信息
- 缺少分镜/配音生成参数编辑功能
- 未与工作流步骤联动

### 7.2 SelectionContext数据结构扩展

**文件**: `src/renderer/contexts/SelectionContext.tsx`

**当前结构**:
```typescript
interface SelectedItem {
  id: string
  name: string
  type: string
  prompt?: string
}
```

**扩展后**:
```typescript
interface SelectedItem {
  id: string
  name: string
  type: string

  // 基础属性
  prompt?: string
  status?: 'pending' | 'generating' | 'completed' | 'failed'

  // 分镜特定属性
  storyboardType?: 'image' | 'video'
  sceneId?: string
  characterIds?: string[]

  // 配音特定属性
  dialogueText?: string
  voiceType?: string
  emotion?: number[]

  // AI生成属性
  aiModel?: string
  aiSeed?: number
  aiSettings?: Record<string, any>
}
```

### 7.3 StoryboardPanel选中状态传递

**文件**: `src/renderer/pages/workflows/panels/StoryboardPanel.tsx`

**改造点** (line 508-537):
```typescript
const handleStoryboardClick = (storyboard: Storyboard, event: React.MouseEvent) => {
  // ...现有选中逻辑

  // 更新全局选中状态（传递完整分镜信息）
  if (selectedStoryboardIds.length === 1) {
    const selectedStoryboard = storyboards.find(s => s.id === selectedStoryboardIds[0])
    if (selectedStoryboard) {
      setSelectedItem({
        id: selectedStoryboard.id,
        name: selectedStoryboard.description,
        type: selectedStoryboard.type === 'image' ? '图片分镜' : '视频分镜',
        prompt: selectedStoryboard.prompt || '',
        status: selectedStoryboard.status,
        storyboardType: selectedStoryboard.type,
        sceneId: selectedStoryboard.sceneId,
        // AI生成属性（如果有）
        aiModel: 'Sora v2',
        aiSeed: -1,
        aiSettings: {
          aspectRatio: '16:9',
          fps: 24,
          duration: 5
        }
      })
    }
  } else if (selectedStoryboardIds.length > 1) {
    // 批量选中
    setSelectedItem({
      id: 'batch',
      name: `已选中 ${selectedStoryboardIds.length} 个分镜`,
      type: '批量编辑',
      prompt: '', // 批量编辑时Prompt为空或显示第一个
      status: 'pending'
    })
  }
}
```

### 7.4 GlobalRightPanel参数编辑

**文件**: `src/renderer/components/global/GlobalRightPanel.tsx`

**改造点**: 在ParametersTab中添加分镜/配音特定参数

```typescript
{lowerTab === 'parameters' && (
  <ParametersTab
    settings={settings}
    onSettingsChange={setSettings}
    providerParams={providerParams}
    onProviderParamsChange={setProviderParams}
    selectedItem={selectedItem} // 传递选中项
  />
)}
```

**ParametersTab改造**:
```typescript
// src/renderer/components/global/tabs/ParametersTab.tsx

export const ParametersTab: React.FC<ParametersTabProps> = ({
  settings,
  onSettingsChange,
  providerParams,
  onProviderParamsChange,
  selectedItem // 新增参数
}) => {
  // 根据selectedItem.type动态显示参数

  if (selectedItem?.type === '图片分镜' || selectedItem?.type === '视频分镜') {
    return (
      <div className="parameters-content">
        <h4>分镜生成参数</h4>

        {/* 宽高比 */}
        <div className="param-row">
          <label>宽高比</label>
          <select
            value={providerParams.aspectRatio || '16:9'}
            onChange={(e) =>
              onProviderParamsChange({ ...providerParams, aspectRatio: e.target.value })
            }
          >
            <option value="16:9">16:9 (横屏)</option>
            <option value="9:16">9:16 (竖屏)</option>
            <option value="1:1">1:1 (方形)</option>
            <option value="4:3">4:3 (标准)</option>
          </select>
        </div>

        {/* 如果是视频分镜，显示视频特定参数 */}
        {selectedItem.storyboardType === 'video' && (
          <>
            <div className="param-row">
              <label>帧率 (FPS)</label>
              <input
                type="number"
                value={providerParams.fps || 24}
                onChange={(e) =>
                  onProviderParamsChange({ ...providerParams, fps: Number(e.target.value) })
                }
                min="15"
                max="60"
              />
            </div>

            <div className="param-row">
              <label>时长 (秒)</label>
              <input
                type="number"
                value={providerParams.duration || 5}
                onChange={(e) =>
                  onProviderParamsChange({ ...providerParams, duration: Number(e.target.value) })
                }
                min="1"
                max="30"
              />
            </div>
          </>
        )}

        {/* 通用AI参数 */}
        <div className="param-row">
          <label>模型</label>
          <select
            value={settings.model}
            onChange={(e) => onSettingsChange({ ...settings, model: e.target.value })}
          >
            <option value="Sora v2 (Cloud)">Sora v2 (Cloud)</option>
            <option value="Runway Gen-3">Runway Gen-3</option>
            <option value="DALL-E 3">DALL-E 3</option>
          </select>
        </div>

        <div className="param-row">
          <label>随机种子</label>
          <input
            type="number"
            value={settings.seed}
            onChange={(e) => onSettingsChange({ ...settings, seed: Number(e.target.value) })}
            placeholder="-1 (随机)"
          />
        </div>
      </div>
    )
  }

  if (selectedItem?.type === '配音') {
    return (
      <div className="parameters-content">
        <h4>配音生成参数</h4>

        <div className="param-row">
          <label>音色</label>
          <select
            value={providerParams.voiceType || 'female-1'}
            onChange={(e) =>
              onProviderParamsChange({ ...providerParams, voiceType: e.target.value })
            }
          >
            <option value="female-1">女声1 - 温柔</option>
            <option value="female-2">女声2 - 活泼</option>
            <option value="male-1">男声1 - 沉稳</option>
            <option value="male-2">男声2 - 磁性</option>
          </select>
        </div>

        <div className="param-row">
          <label>语速</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={providerParams.speed || 1.0}
            onChange={(e) =>
              onProviderParamsChange({ ...providerParams, speed: Number(e.target.value) })
            }
          />
          <span>{providerParams.speed || 1.0}x</span>
        </div>

        <div className="param-row">
          <label>音调</label>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={providerParams.pitch || 0}
            onChange={(e) =>
              onProviderParamsChange({ ...providerParams, pitch: Number(e.target.value) })
            }
          />
          <span>{providerParams.pitch || 0}</span>
        </div>
      </div>
    )
  }

  // 默认参数面板
  return <div>...默认参数</div>
}
```

### 7.5 生成按钮逻辑

**文件**: `src/renderer/components/global/GlobalRightPanel.tsx` (line 102-115)

**改造后**:
```typescript
const handleGenerate = async () => {
  if (!selectedItem) {
    console.warn('没有选中项')
    return
  }

  try {
    // 根据选中项类型调用不同的生成API
    if (selectedItem.type === '图片分镜' || selectedItem.type === '视频分镜') {
      // 调用分镜重新生成API
      await window.electronAPI.novelVideo.regenerateStoryboard(
        currentWorkflowId,
        selectedItem.id,
        prompt // 使用右侧面板的prompt
      )
    } else if (selectedItem.type === '配音') {
      // 调用配音重新生成API
      await window.electronAPI.novelVideo.regenerateVoiceover(
        currentWorkflowId,
        selectedItem.id,
        selectedItem.dialogueText || '',
        providerParams.voiceType
      )
    }

    // 刷新资产列表
    // TODO: 触发面板刷新
  } catch (error) {
    console.error('生成失败:', error)
  }
}
```

---

## 8. 实施步骤

### 阶段1: 基础设施准备 (P0)

**时间**: 1-2天
**目标**: 搭建IPC通道和主进程服务骨架

- [ ] **Step 1.1**: 创建 `NovelVideoService.ts` 服务骨架
- [ ] **Step 1.2**: 创建 `novel-video-handlers.ts` IPC处理器
- [ ] **Step 1.3**: 更新 `preload/index.ts` 暴露API
- [ ] **Step 1.4**: 更新 `electron-api.d.ts` 类型定义
- [ ] **Step 1.5**: 在 `main/index.ts` 中注册服务和处理器
- [ ] **Step 1.6**: 测试IPC通道连通性

### 阶段2: 章节拆分实现 (P0)

**时间**: 2-3天
**目标**: 完整实现章节拆分功能

- [ ] **Step 2.1**: 实现 `NovelVideoService.splitChapters()` 方法
  - [ ] 简单文本拆分逻辑（按"第X章"）
  - [ ] 创建Chapter资产
  - [ ] 保存章节文本文件
- [ ] **Step 2.2**: 改造 `ChapterSplitPanel.tsx`
  - [ ] 删除Mock数据
  - [ ] 调用真实IPC API
  - [ ] 错误处理和Loading
- [ ] **Step 2.3**: 测试章节拆分功能
  - [ ] 上传小说文件
  - [ ] 验证章节资产创建
  - [ ] 验证文件保存

### 阶段3: 场景角色提取实现 (P0)

**时间**: 3-4天
**目标**: 完整实现场景角色提取功能

- [ ] **Step 3.1**: 实现 `NovelVideoService.extractScenesAndCharacters()` 方法
  - [ ] 简单提取逻辑（或AI API集成）
  - [ ] 创建Scene资产
  - [ ] 创建Character资产
- [ ] **Step 3.2**: 改造 `SceneCharacterPanel.tsx`
  - [ ] 删除Mock数据
  - [ ] 调用真实IPC API
  - [ ] 角色编辑功能保留
- [ ] **Step 3.3**: 测试场景角色提取
  - [ ] 选择章节提取
  - [ ] 验证资产创建
  - [ ] 测试角色手动添加/编辑/删除

### 阶段4: 分镜生成实现 (P0)

**时间**: 5-7天
**目标**: 完整实现分镜生成功能（图片和视频）

- [ ] **Step 4.1**: 实现 `NovelVideoService.generateStoryboards()` 方法
  - [ ] 图片分镜：调用DALL-E API
  - [ ] 视频分镜：调用Sora API (或模拟)
  - [ ] 创建Storyboard资产
  - [ ] 保存生成的文件
- [ ] **Step 4.2**: 实现 `NovelVideoService.regenerateStoryboard()` 方法
- [ ] **Step 4.3**: 改造 `StoryboardPanel.tsx`
  - [ ] 删除Mock数据
  - [ ] 调用真实IPC API
  - [ ] Prompt编辑功能集成右侧面板
- [ ] **Step 4.4**: 测试分镜生成
  - [ ] 测试图片分镜生成
  - [ ] 测试视频分镜生成
  - [ ] 测试重新生成功能
  - [ ] 测试Prompt编辑

### 阶段5: 配音生成实现 (P0)

**时间**: 3-4天
**目标**: 完整实现配音生成功能

- [ ] **Step 5.1**: 实现 `NovelVideoService.generateVoiceovers()` 方法
  - [ ] 调用Azure TTS API (或其他TTS服务)
  - [ ] 创建Voiceover资产
  - [ ] 保存音频文件
- [ ] **Step 5.2**: 实现 `NovelVideoService.regenerateVoiceover()` 方法
- [ ] **Step 5.3**: 改造 `VoiceoverPanel.tsx`
  - [ ] 删除Mock数据
  - [ ] 调用真实IPC API
  - [ ] 实现音频播放功能
- [ ] **Step 5.4**: 测试配音生成
  - [ ] 测试配音生成
  - [ ] 测试音频播放
  - [ ] 测试重新生成

### 阶段6: 视频导出实现 (P0)

**时间**: 4-5天
**目标**: 完整实现视频导出功能

- [ ] **Step 6.1**: 实现 `NovelVideoService.exportVideo()` 方法
  - [ ] 使用FFmpeg合成视频
  - [ ] 合并分镜视频/图片序列
  - [ ] 添加配音轨道
  - [ ] 导出最终视频
- [ ] **Step 6.2**: 创建 `ExportPanel.tsx` (如果未实现)
  - [ ] 导出选项配置
  - [ ] 导出进度显示
  - [ ] 导出完成处理
- [ ] **Step 6.3**: 测试视频导出
  - [ ] 测试完整流程导出
  - [ ] 验证视频质量

### 阶段7: 右侧面板集成 (P0)

**时间**: 2-3天
**目标**: 完整集成右侧面板属性编辑和生成功能

- [ ] **Step 7.1**: 扩展 `SelectionContext` 数据结构
- [ ] **Step 7.2**: 改造 `StoryboardPanel` 选中状态传递
- [ ] **Step 7.3**: 改造 `ParametersTab` 显示分镜/配音参数
- [ ] **Step 7.4**: 实现生成按钮逻辑
- [ ] **Step 7.5**: 测试右侧面板集成
  - [ ] 测试选中分镜显示属性
  - [ ] 测试编辑参数
  - [ ] 测试点击生成按钮

### 阶段8: 状态持久化和错误处理 (P1)

**时间**: 2-3天
**目标**: 完善状态持久化和错误处理

- [ ] **Step 8.1**: 在 `WorkflowExecutor` 中集成状态保存
  - [ ] 步骤完成时保存
  - [ ] 步骤切换时保存
  - [ ] 数据更新时保存
- [ ] **Step 8.2**: 完善错误处理
  - [ ] 所有API调用添加try-catch
  - [ ] 使用Logger记录错误
  - [ ] 显示用户友好错误信息
- [ ] **Step 8.3**: 修复资源泄漏
  - [ ] 音频播放资源清理
  - [ ] 文件监听清理
- [ ] **Step 8.4**: 测试持久化
  - [ ] 测试刷新页面恢复进度
  - [ ] 测试错误恢复

### 阶段9: AI服务集成 (P2)

**时间**: 5-7天
**目标**: 集成真实AI服务（可选）

- [ ] **Step 9.1**: 集成GPT-4章节拆分
- [ ] **Step 9.2**: 集成GPT-4场景角色提取
- [ ] **Step 9.3**: 集成DALL-E图片生成
- [ ] **Step 9.4**: 集成Sora视频生成 (如果有API)
- [ ] **Step 9.5**: 集成Azure TTS配音生成
- [ ] **Step 9.6**: 测试AI服务集成

### 阶段10: 测试和优化 (P1)

**时间**: 3-5天
**目标**: 全面测试和性能优化

- [ ] **Step 10.1**: 端到端测试
  - [ ] 完整流程测试（从上传小说到导出视频）
  - [ ] 边界情况测试
  - [ ] 错误场景测试
- [ ] **Step 10.2**: 性能优化
  - [ ] 大文件处理优化
  - [ ] 资产索引优化
  - [ ] 内存泄漏检查
- [ ] **Step 10.3**: 用户体验优化
  - [ ] Loading指示优化
  - [ ] 错误提示优化
  - [ ] 交互流程优化

---

## 9. 测试计划

### 9.1 单元测试

**目标**: 测试各个服务方法的正确性

**测试文件**: `tests/unit/services/NovelVideoService.test.ts`

```typescript
describe('NovelVideoService', () => {
  describe('splitChapters', () => {
    it('应该正确拆分章节', async () => {
      // ...测试代码
    })

    it('应该为每个章节创建资产', async () => {
      // ...测试代码
    })

    it('应该处理空文件', async () => {
      // ...测试代码
    })
  })

  describe('extractScenesAndCharacters', () => {
    it('应该提取场景和角色', async () => {
      // ...测试代码
    })
  })

  // ...更多测试
})
```

### 9.2 集成测试

**目标**: 测试IPC通道和完整数据流

**测试文件**: `tests/integration/ipc/novel-video.ipc.test.ts`

```typescript
describe('NovelVideo IPC通道', () => {
  it('应该能够拆分章节', async () => {
    const result = await ipcRenderer.invoke('novel-video:split-chapters', workflowId, testFilePath)
    expect(result).toBeArrayOfSize(5)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('customFields.novelVideo.chapterTitle')
  })

  it('应该能够提取场景和角色', async () => {
    // ...测试代码
  })

  // ...更多测试
})
```

### 9.3 端到端测试

**目标**: 测试完整用户流程

**测试文件**: `tests/e2e/novel-to-video.e2e.test.ts`

```typescript
describe('小说转视频工作流 E2E测试', () => {
  it('应该完成完整的小说转视频流程', async () => {
    // 1. 上传小说文件
    // 2. 拆分章节
    // 3. 提取场景角色
    // 4. 生成分镜
    // 5. 生成配音
    // 6. 导出视频
    // 7. 验证最终视频文件
  })
})
```

### 9.4 性能测试

**测试场景**:
- 大型小说文件处理（>100章）
- 批量资产生成
- 资产索引性能
- 内存使用监控

---

## 10. 风险评估

### 10.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| AI API不稳定 | 高 | 高 | 实现重试机制，降级到简单逻辑 |
| FFmpeg集成问题 | 中 | 高 | 提前验证FFmpeg命令，准备备选方案 |
| 大文件处理性能 | 中 | 中 | 实现流式处理，分块处理 |
| 资产索引性能 | 低 | 中 | 优化索引结构，使用缓存 |

### 10.2 实施风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 开发时间超期 | 中 | 中 | 分阶段实施，优先核心功能 |
| 需求变更 | 低 | 低 | 模块化设计，易于扩展 |
| 测试不充分 | 中 | 高 | 制定详细测试计划，自动化测试 |

### 10.3 用户体验风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 生成时间过长 | 高 | 中 | 显示进度条，支持后台生成 |
| 错误信息不友好 | 中 | 低 | 统一错误处理，友好提示 |
| 学习曲线陡峭 | 低 | 低 | 添加引导提示，简化流程 |

---

## 11. 附录

### 11.1 相关文档

- `docs/00-global-requirements-v1.0.0.md`: 全局要求
- `docs/06-core-services-design-v1.0.1.md`: 服务层设计
- `CLAUDE.md`: 项目协作指南

### 11.2 关键文件清单

**新建文件**:
- `src/main/services/NovelVideoService.ts`
- `src/main/ipc/novel-video-handlers.ts`
- `tests/unit/services/NovelVideoService.test.ts`
- `tests/integration/ipc/novel-video.ipc.test.ts`
- `tests/e2e/novel-to-video.e2e.test.ts`

**修改文件**:
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/shared/types/electron-api.d.ts`
- `src/renderer/pages/workflows/panels/ChapterSplitPanel.tsx`
- `src/renderer/pages/workflows/panels/SceneCharacterPanel.tsx`
- `src/renderer/pages/workflows/panels/StoryboardPanel.tsx`
- `src/renderer/pages/workflows/panels/VoiceoverPanel.tsx`
- `src/renderer/pages/workflows/WorkflowExecutor.tsx`
- `src/renderer/contexts/SelectionContext.tsx`
- `src/renderer/components/global/GlobalRightPanel.tsx`
- `src/renderer/components/global/tabs/ParametersTab.tsx`

### 11.3 预估工作量

**总计**: 约 **25-35个工作日**

- 阶段1: 基础设施准备 - 1-2天
- 阶段2: 章节拆分实现 - 2-3天
- 阶段3: 场景角色提取实现 - 3-4天
- 阶段4: 分镜生成实现 - 5-7天
- 阶段5: 配音生成实现 - 3-4天
- 阶段6: 视频导出实现 - 4-5天
- 阶段7: 右侧面板集成 - 2-3天
- 阶段8: 状态持久化和错误处理 - 2-3天
- 阶段9: AI服务集成 (可选) - 5-7天
- 阶段10: 测试和优化 - 3-5天

---

**文档结束**

---

**审批签名**:

- [ ] 技术负责人: _______________
- [ ] 产品经理: _______________
- [ ] 测试负责人: _______________

**版本历史**:

| 版本 | 日期 | 修改人 | 修改说明 |
|------|------|--------|----------|
| v1.0.0 | 2026-01-01 | Claude | 初始版本 |

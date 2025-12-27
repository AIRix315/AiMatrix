/**
 * NovelVideo插件的JSON Schema定义
 *
 * Phase 7 H03: 插件包体隔离
 * Schema定义从shared目录迁移到插件内部
 */

import type { AssetSchemaDefinition } from '@matrix/sdk';

/**
 * 章节Schema
 */
export const ChapterSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'> = {
  name: '章节',
  description: '小说章节资产的元数据Schema',
  version: '1.0.0',
  tags: ['novel-video', 'chapter', 'text'],
  schema: {
    type: 'object',
    description: '章节元数据结构',
    properties: {
      chapterId: {
        type: 'string',
        description: '章节唯一ID',
        pattern: '^chapter-[0-9]+$'
      },
      chapterTitle: {
        type: 'string',
        description: '章节标题',
        minLength: 1,
        maxLength: 200
      },
      chapterContent: {
        type: 'string',
        description: '章节内容（完整文本）',
        minLength: 1
      },
      chapterIndex: {
        type: 'integer',
        description: '章节序号',
        minimum: 0
      }
    },
    required: ['chapterId', 'chapterTitle', 'chapterContent', 'chapterIndex']
  },
  examples: [
    {
      chapterId: 'chapter-1703001234567',
      chapterTitle: '第一章 命运的开始',
      chapterContent: '清晨的阳光透过窗户洒进卧室...',
      chapterIndex: 1
    }
  ]
};

/**
 * 场景Schema
 */
export const SceneSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'> = {
  name: '场景',
  description: '小说场景资产的元数据Schema',
  version: '1.0.0',
  tags: ['novel-video', 'scene', 'image'],
  schema: {
    type: 'object',
    description: '场景元数据结构',
    properties: {
      sceneId: {
        type: 'string',
        description: '场景唯一ID',
        pattern: '^scene-[0-9]+$'
      },
      sceneChapterId: {
        type: 'string',
        description: '所属章节ID',
        pattern: '^chapter-[0-9]+$'
      },
      sceneStory: {
        type: 'string',
        description: '场景故事内容',
        minLength: 1,
        maxLength: 5000
      },
      sceneLocation: {
        type: 'string',
        description: '场景位置',
        minLength: 1,
        maxLength: 100
      },
      sceneImagePrompt: {
        type: 'string',
        description: '场景图片生成提示词',
        minLength: 1,
        maxLength: 2000
      },
      sceneImagePath: {
        type: 'string',
        description: '生成的场景图片路径（可选）',
        format: 'uri'
      }
    },
    required: ['sceneId', 'sceneChapterId', 'sceneStory', 'sceneLocation', 'sceneImagePrompt']
  },
  examples: [
    {
      sceneId: 'scene-1703001234568',
      sceneChapterId: 'chapter-1703001234567',
      sceneStory: '清晨的阳光透过窗户洒进卧室，张三缓缓睁开双眼',
      sceneLocation: '卧室',
      sceneImagePrompt: '温馨的卧室，清晨阳光，柔和光线，现代简约风格',
      sceneImagePath: '/path/to/scene-image.png'
    }
  ]
};

/**
 * 角色Schema
 */
export const CharacterSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'> = {
  name: '角色',
  description: '小说角色资产的元数据Schema',
  version: '1.0.0',
  tags: ['novel-video', 'character', 'image'],
  schema: {
    type: 'object',
    description: '角色元数据结构',
    properties: {
      characterId: {
        type: 'string',
        description: '角色唯一ID',
        pattern: '^character-[0-9]+$'
      },
      characterName: {
        type: 'string',
        description: '角色名称',
        minLength: 1,
        maxLength: 50
      },
      characterAppearance: {
        type: 'string',
        description: '角色外观描述',
        minLength: 1,
        maxLength: 1000
      },
      characterImagePrompt: {
        type: 'string',
        description: '角色图片生成提示词',
        minLength: 1,
        maxLength: 2000
      },
      soraName: {
        type: 'string',
        description: 'Sora识别名（用于视频生成中的角色识别）',
        maxLength: 50
      },
      voiceId: {
        type: 'string',
        description: '绑定的音色ID',
        maxLength: 50
      }
    },
    required: ['characterId', 'characterName', 'characterAppearance', 'characterImagePrompt']
  },
  examples: [
    {
      characterId: 'character-1703001234569',
      characterName: '张三',
      characterAppearance: '年轻男子，黑色短发，阳光帅气',
      characterImagePrompt: '年轻的中国男子，黑色短发，阳光气质，现代服装',
      soraName: 'zhangsan',
      voiceId: 'voice-001'
    }
  ]
};

/**
 * 分镜脚本Schema
 */
export const StoryboardSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'> = {
  name: '分镜脚本',
  description: '分镜脚本资产的元数据Schema',
  version: '1.0.0',
  tags: ['novel-video', 'storyboard', 'video'],
  schema: {
    type: 'object',
    description: '分镜脚本元数据结构',
    properties: {
      storyboardSceneId: {
        type: 'string',
        description: '关联的场景ID',
        pattern: '^scene-[0-9]+$'
      },
      storyboardType: {
        type: 'string',
        description: '分镜类型',
        enum: ['video', 'image']
      },
      videoPrompt: {
        type: 'string',
        description: '视频生成提示词（type=video时使用）',
        maxLength: 2000
      },
      imagePrompts: {
        type: 'array',
        description: '图片序列提示词（type=image时使用）',
        items: {
          type: 'string',
          maxLength: 2000
        }
      },
      characterIds: {
        type: 'array',
        description: '关联的角色ID列表',
        items: {
          type: 'string',
          pattern: '^character-[0-9]+$'
        }
      }
    },
    required: ['storyboardSceneId', 'storyboardType']
  },
  examples: [
    {
      storyboardSceneId: 'scene-1703001234568',
      storyboardType: 'video',
      videoPrompt: '清晨卧室场景，张三睁开眼睛，镜头推进',
      characterIds: ['character-1703001234569']
    }
  ]
};

/**
 * 配音Schema
 */
export const VoiceoverSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'> = {
  name: '配音',
  description: '配音资产的元数据Schema',
  version: '1.0.0',
  tags: ['novel-video', 'voiceover', 'audio'],
  schema: {
    type: 'object',
    description: '配音元数据结构',
    properties: {
      voiceoverSceneId: {
        type: 'string',
        description: '关联的场景ID',
        pattern: '^scene-[0-9]+$'
      },
      dialogueText: {
        type: 'string',
        description: '对白文本',
        minLength: 1,
        maxLength: 5000
      },
      dialogueCharacterId: {
        type: 'string',
        description: '对白角色ID',
        pattern: '^character-[0-9]+$'
      },
      emotion: {
        type: 'array',
        description: '8维情绪向量 [喜, 怒, 哀, 惧, 爱, 恶, 欲, 惊]',
        items: {
          type: 'number',
          minimum: 0,
          maximum: 1
        },
        minLength: 8,
        maxLength: 8
      }
    },
    required: ['voiceoverSceneId', 'dialogueText', 'dialogueCharacterId']
  },
  examples: [
    {
      voiceoverSceneId: 'scene-1703001234568',
      dialogueText: '又是新的一天',
      dialogueCharacterId: 'character-1703001234569',
      emotion: [0.6, 0.1, 0.0, 0.0, 0.3, 0.0, 0.2, 0.0]
    }
  ]
};

/**
 * 所有NovelVideo的Schema定义（用于批量注册）
 */
export const NovelVideoSchemas = {
  chapter: ChapterSchema,
  scene: SceneSchema,
  character: CharacterSchema,
  storyboard: StoryboardSchema,
  voiceover: VoiceoverSchema
};

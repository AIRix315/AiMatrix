/**
 * 小说转视频专用类型定义
 *
 * 这些类型将作为AssetMetadata的customFields存储,
 * 利用AssetManager的扩展字段机制实现小说转视频的数据管理
 */

/**
 * 小说转视频专用字段
 * 用于存储在AssetMetadata.customFields.novelVideo中
 */
export interface NovelVideoFields {
  // ========== Chapter相关 ==========
  /** 章节唯一ID */
  chapterId?: string
  /** 章节标题 */
  chapterTitle?: string
  /** 章节内容 */
  chapterContent?: string
  /** 章节序号 */
  chapterIndex?: number

  // ========== Scene相关 ==========
  /** 场景唯一ID */
  sceneId?: string
  /** 场景所属章节ID */
  sceneChapterId?: string
  /** 场景故事内容 */
  sceneStory?: string
  /** 场景位置 */
  sceneLocation?: string
  /** 场景图片生成提示词 */
  sceneImagePrompt?: string
  /** 场景图片路径 (生成后更新) */
  sceneImagePath?: string

  // ========== Character相关 ==========
  /** 角色唯一ID */
  characterId?: string
  /** 角色名称 */
  characterName?: string
  /** 角色外观描述 */
  characterAppearance?: string
  /** 角色图片生成提示词 */
  characterImagePrompt?: string
  /** Sora识别名 (用于视频生成中的角色识别) */
  soraName?: string
  /** 绑定的音色ID */
  voiceId?: string

  // ========== Storyboard相关 ==========
  /** 分镜脚本关联的场景ID */
  storyboardSceneId?: string
  /** 分镜类型 (视频或图片) */
  storyboardType?: 'video' | 'image'
  /** 视频生成提示词 */
  videoPrompt?: string
  /** 图片序列提示词数组 */
  imagePrompts?: string[]
  /** 关联的角色ID列表 */
  characterIds?: string[]

  // ========== Voiceover相关 ==========
  /** 配音关联的场景ID */
  voiceoverSceneId?: string
  /** 对白文本 */
  dialogueText?: string
  /** 对白角色ID */
  dialogueCharacterId?: string
  /** 8维情绪向量 [喜, 怒, 哀, 惧, 爱, 恶, 欲, 惊] */
  emotion?: number[]

  // ========== 资源复用相关 ==========
  /** 复用来源资产ID (用于相似场景的图片复用) */
  sourceAssetId?: string
  /** 相似度评分 (0-1) */
  similarity?: number
}

/**
 * 章节数据 (用于创建章节资产)
 */
export interface ChapterData {
  /** 项目ID */
  projectId: string
  /** 章节标题 */
  title: string
  /** 章节内容 */
  content: string
  /** 章节序号 */
  index: number
}

/**
 * 场景数据 (用于创建场景资产)
 */
export interface SceneData {
  /** 项目ID */
  projectId: string
  /** 所属章节ID */
  chapterId: string
  /** 场景故事内容 */
  story: string
  /** 场景位置 */
  location: string
  /** 场景图片生成提示词 */
  imagePrompt: string
}

/**
 * 角色数据 (用于创建角色资产)
 */
export interface CharacterData {
  /** 项目ID */
  projectId: string
  /** 角色名称 */
  name: string
  /** 角色外观描述 */
  appearance: string
  /** 角色图片生成提示词 */
  imagePrompt: string
  /** Sora识别名 (可选) */
  soraName?: string
  /** 绑定的音色ID (可选) */
  voiceId?: string
}

/**
 * 分镜脚本数据 (用于创建分镜资产)
 */
export interface StoryboardData {
  /** 项目ID */
  projectId: string
  /** 关联的场景ID */
  sceneId: string
  /** 分镜类型 */
  type: 'video' | 'image'
  /** 视频生成提示词 (type=video时使用) */
  videoPrompt?: string
  /** 图片序列提示词 (type=image时使用) */
  imagePrompts?: string[]
  /** 关联的角色ID列表 */
  characterIds?: string[]
}

/**
 * 配音数据 (用于创建配音资产)
 */
export interface VoiceoverData {
  /** 项目ID */
  projectId: string
  /** 关联的场景ID */
  sceneId: string
  /** 对白文本 */
  dialogueText: string
  /** 对白角色ID */
  characterId: string
  /** 8维情绪向量 */
  emotion?: number[]
}

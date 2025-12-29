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
export declare const ChapterSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'>;
/**
 * 场景Schema
 */
export declare const SceneSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'>;
/**
 * 角色Schema
 */
export declare const CharacterSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'>;
/**
 * 分镜脚本Schema
 */
export declare const StoryboardSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'>;
/**
 * 配音Schema
 */
export declare const VoiceoverSchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'>;
/**
 * 所有NovelVideo的Schema定义（用于批量注册）
 */
export declare const NovelVideoSchemas: {
    chapter: Omit<AssetSchemaDefinition, "id" | "pluginId" | "registeredAt" | "active">;
    scene: Omit<AssetSchemaDefinition, "id" | "pluginId" | "registeredAt" | "active">;
    character: Omit<AssetSchemaDefinition, "id" | "pluginId" | "registeredAt" | "active">;
    storyboard: Omit<AssetSchemaDefinition, "id" | "pluginId" | "registeredAt" | "active">;
    voiceover: Omit<AssetSchemaDefinition, "id" | "pluginId" | "registeredAt" | "active">;
};

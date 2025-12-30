/**
 * 统一类型导出文件
 *
 * 此文件作为 src/shared/types 模块的统一入口，
 * 导出所有共享类型定义，简化导入语句。
 *
 * 使用示例：
 * ```typescript
 * import { AssetMetadata, APIProvider, WorkflowDefinition } from '@/shared/types';
 * ```
 *
 * @module shared/types
 */

// 资产管理相关类型
export * from './asset';

// API Provider 相关类型
export * from './api';

// 工作流相关类型
export * from './workflow';

// 插件面板配置类型
export * from './plugin-panel';

// 插件视图注册类型
export * from './plugin-view';

// 插件市场相关类型
export * from './plugin-market';

// Schema 验证相关类型
export * from './schema';

// 小说转视频工作流类型
export * from './novel-video';

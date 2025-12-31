/**
 * UnifiedAssetPanel 组件的共享类型定义
 */

import {
  Folder,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  FileCode,
  Upload,
  Users,
  Layout,
  Mic
} from 'lucide-react';

// ===== 全局资产分类（基于文件类型 + 来源）=====
export type GlobalCategoryId = 'all' | 'input' | 'text' | 'image' | 'audio' | 'video' | 'other';

export const GLOBAL_ASSET_CATEGORIES = [
  { id: 'all' as GlobalCategoryId, label: '全部资产', icon: Folder },
  { id: 'input' as GlobalCategoryId, label: '输入', icon: Upload },
  { id: 'text' as GlobalCategoryId, label: '文本', icon: FileText },
  { id: 'image' as GlobalCategoryId, label: '图像', icon: ImageIcon },
  { id: 'audio' as GlobalCategoryId, label: '音频', icon: Music },
  { id: 'video' as GlobalCategoryId, label: '视频', icon: Video },
  { id: 'other' as GlobalCategoryId, label: '其他', icon: FileCode },
] as const;

// ===== 项目资产分类（基于小说转视频工作流）=====
export type ProjectCategoryId = 'all' | 'chapters' | 'scenes' | 'characters' | 'storyboards' | 'voiceovers';

export const PROJECT_WORKFLOW_CATEGORIES = [
  { id: 'all' as ProjectCategoryId, label: '全部资产', icon: Folder },
  { id: 'chapters' as ProjectCategoryId, label: '章节', icon: FileText },
  { id: 'scenes' as ProjectCategoryId, label: '场景', icon: ImageIcon },
  { id: 'characters' as ProjectCategoryId, label: '角色', icon: Users },
  { id: 'storyboards' as ProjectCategoryId, label: '分镜脚本', icon: Layout },
  { id: 'voiceovers' as ProjectCategoryId, label: '配音', icon: Mic },
] as const;

// ===== 联合类型 =====
export type AssetCategoryId = GlobalCategoryId | ProjectCategoryId;

// 项目配置接口
export interface ProjectConfig {
  id: string;
  name: string;
  status?: 'in-progress' | 'completed' | 'archived';
  type?: string;
}

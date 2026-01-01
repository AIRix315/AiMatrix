/**
 * 资产分类筛选器组件
 *
 * 功能：
 * - 全局资产：按文件类型分类（全部、图片、视频、音频、文本、其他）
 * - 项目资产：按工作流用途分类（全部、章节、场景、角色、分镜脚本、配音）
 */

import React from 'react';
import {
  Folder, FileText, Image, Music, Video, FileCode,
  Users, Layout, Mic
} from 'lucide-react';
import './AssetCategoryFilter.css';

type CategoryType = 'global' | 'project';

interface Category {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AssetCategoryFilterProps {
  type: CategoryType;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

// 全局资产分类（文件类型）
const GLOBAL_CATEGORIES: Category[] = [
  { id: 'all', label: '全部', icon: Folder },
  { id: 'image', label: '图片', icon: Image },
  { id: 'video', label: '视频', icon: Video },
  { id: 'audio', label: '音频', icon: Music },
  { id: 'text', label: '文本', icon: FileText },
  { id: 'other', label: '其他', icon: FileCode },
];

// 项目资产分类（工作流用途）
const PROJECT_CATEGORIES: Category[] = [
  { id: 'all', label: '全部', icon: Folder },
  { id: 'chapters', label: '章节', icon: FileText },
  { id: 'scenes', label: '场景', icon: Image },
  { id: 'characters', label: '角色', icon: Users },
  { id: 'storyboards', label: '分镜脚本', icon: Layout },
  { id: 'voiceovers', label: '配音', icon: Mic },
];

export function AssetCategoryFilter({
  type,
  selectedCategory,
  onCategoryChange
}: AssetCategoryFilterProps) {
  const categories = type === 'global' ? GLOBAL_CATEGORIES : PROJECT_CATEGORIES;

  return (
    <div className="asset-category-filter">
      {categories.map(cat => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.id)}
          >
            {Icon && <Icon className="category-icon" />}
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

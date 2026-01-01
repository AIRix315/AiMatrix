/**
 * 资产分类列表组件
 *
 * 功能：
 * - 显示资产分类按钮（动态支持全局分类或项目分类）
 * - 支持选中状态高亮
 * - 每个分类项包含图标和标签
 */

import React from 'react';
import {
  AssetCategoryId,
  GLOBAL_ASSET_CATEGORIES,
  PROJECT_WORKFLOW_CATEGORIES
} from './types';

interface AssetCategoryListProps {
  categories: typeof GLOBAL_ASSET_CATEGORIES | typeof PROJECT_WORKFLOW_CATEGORIES;
  selectedCategory: AssetCategoryId;
  onCategorySelect: (category: AssetCategoryId) => void;
  projectId?: string;
}

export function AssetCategoryList({
  categories,
  selectedCategory,
  onCategorySelect
}: AssetCategoryListProps) {
  return (
    <div className="panel-category-section">
      <div className="category-list">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => onCategorySelect(category.id)}
            >
              <Icon className="category-icon" size={18} />
              <span className="category-label">{category.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

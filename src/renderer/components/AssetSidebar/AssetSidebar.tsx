/**
 * 资产侧边栏组件
 *
 * 功能：
 * - 显示资产分类列表
 * - 支持选中状态
 * - 显示每个分类的资产数量
 * - 动态加载分类（插件可扩展）
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

import React, { useEffect, useState } from 'react';
import { AssetIndex } from '../../../shared/types/asset';
import './AssetSidebar.css';

interface AssetSidebarProps {
  projectId?: string;
  selectedCategory?: string;
  onCategorySelect: (category: string) => void;
}

export function AssetSidebar({
  projectId,
  selectedCategory,
  onCategorySelect
}: AssetSidebarProps) {
  const [index, setIndex] = useState<AssetIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载资产索引
  useEffect(() => {
    loadIndex();
  }, [projectId]);

  const loadIndex = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getAssetIndex(projectId);
      setIndex(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载索引失败';
      setError(errorMessage);
      console.error('加载索引失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="asset-sidebar loading">
        <div className="loading-spinner">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="asset-sidebar error">
        <div className="error-message">
          <p>加载失败</p>
          <button onClick={loadIndex} className="retry-button">
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!index) {
    return null;
  }

  return (
    <div className="asset-sidebar">
      <div className="sidebar-header">
        <h3>分类</h3>
        <span className="total-count">{index.statistics.total} 个资产</span>
      </div>

      <div className="category-list">
        {/* 全部分类 */}
        <div
          className={`category-item ${!selectedCategory ? 'active' : ''}`}
          onClick={() => onCategorySelect('')}
        >
          <span className="category-name">全部</span>
          <span className="category-count">{index.statistics.total}</span>
        </div>

        {/* 各个分类 */}
        {index.categories.map(category => (
          <div
            key={category.name}
            className={`category-item ${selectedCategory === category.name ? 'active' : ''}`}
            onClick={() => onCategorySelect(category.name)}
          >
            <span className="category-icon">
              {getCategoryIcon(category.name)}
            </span>
            <span className="category-name">{formatCategoryName(category.name)}</span>
            <span className="category-count">{category.count}</span>
          </div>
        ))}
      </div>

      {/* 刷新按钮 */}
      <div className="sidebar-footer">
        <button onClick={loadIndex} className="refresh-button" title="刷新索引">
          ⟳ 刷新
        </button>
      </div>
    </div>
  );
}

/**
 * 获取分类图标
 */
function getCategoryIcon(categoryName: string): string {
  const iconMap: Record<string, string> = {
    scenes: '🎬',
    characters: '👤',
    storyboards: '📋',
    images: '🖼️',
    videos: '🎥',
    audio: '🔊',
    text: '📝',
    other: '📦'
  };

  return iconMap[categoryName] || '📁';
}

/**
 * 格式化分类名称（中文显示）
 */
function formatCategoryName(categoryName: string): string {
  const nameMap: Record<string, string> = {
    scenes: '场景',
    characters: '角色',
    storyboards: '分镜',
    images: '图片',
    videos: '视频',
    audio: '音频',
    text: '文本',
    other: '其他'
  };

  return nameMap[categoryName] || categoryName;
}

export default AssetSidebar;

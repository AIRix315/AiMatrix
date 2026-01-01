/**
 * ListSection - 通用列表区块组件
 *
 * Phase 7 H04: UI组件标准化
 * 提取通用的列表展示模式（带标签页切换）
 */

import React, { ReactNode, useState } from 'react';
import Card from './Card';
import './ListSection.css';

export interface ListItem {
  /** 项目ID */
  id: string;

  /** 标题 */
  title: string;

  /** 标签（显示在卡片左上角） */
  tag?: string;

  /** 描述信息 */
  info?: string;

  /** 缩略图URL */
  thumbnail?: string;

  /** 自定义数据 */
  data?: unknown;
}

export interface ListTab {
  /** 标签页ID */
  id: string;

  /** 标签页标题 */
  label: string;

  /** 列表项数据 */
  items: ListItem[];

  /** 自定义渲染函数（可选） */
  renderItem?: (item: ListItem) => ReactNode;
}

export interface ListSectionProps {
  /** 标签页数据 */
  tabs?: ListTab[];

  /** 单个列表数据（不使用标签页时） */
  items?: ListItem[];

  /** 列表项点击回调 */
  onItemClick?: (item: ListItem) => void;

  /** 自定义列表项渲染 */
  renderItem?: (item: ListItem) => ReactNode;

  /** 空状态提示 */
  emptyText?: string;

  /** 自定义类名 */
  className?: string;
}

/**
 * 通用列表区块组件
 *
 * 支持两种模式：
 * 1. 单列表模式：直接传入 items
 * 2. 标签页模式：传入 tabs，自动支持标签页切换
 *
 * 使用示例：
 * ```tsx
 * // 单列表模式
 * <ListSection
 *   items={items}
 *   onItemClick={handleClick}
 * />
 *
 * // 标签页模式
 * <ListSection
 *   tabs={[
 *     { id: 'scenes', label: '场景', items: sceneItems },
 *     { id: 'characters', label: '角色', items: characterItems }
 *   ]}
 * />
 * ```
 */
export const ListSection: React.FC<ListSectionProps> = ({
  tabs,
  items,
  onItemClick,
  renderItem,
  emptyText = '暂无数据',
  className = ''
}) => {
  const [activeTabId, setActiveTabId] = useState(tabs?.[0]?.id || '');

  // 获取当前显示的列表项
  const currentItems = tabs
    ? tabs.find(tab => tab.id === activeTabId)?.items || []
    : items || [];

  // 获取当前的渲染函数
  const currentRenderItem = tabs
    ? tabs.find(tab => tab.id === activeTabId)?.renderItem || renderItem
    : renderItem;

  // 默认渲染函数
  const defaultRenderItem = (item: ListItem) => (
    <Card
      key={item.id}
      tag={item.tag}
      title={item.title}
      info={item.info}
      image={item.thumbnail}
      hoverable
      onClick={() => onItemClick?.(item)}
    />
  );

  return (
    <div className={`list-section ${className}`}>
      {/* 标签页切换 */}
      {tabs && tabs.length > 0 && (
        <div className="list-section-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`list-section-tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.label} <span className="tab-count">({tab.items.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* 列表内容 */}
      <div className="list-section-content">
        {currentItems.length === 0 ? (
          <div className="list-section-empty">{emptyText}</div>
        ) : (
          <div className="list-section-grid">
            {currentItems.map(item =>
              currentRenderItem
                ? currentRenderItem(item)
                : defaultRenderItem(item)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

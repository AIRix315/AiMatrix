/**
 * PluginListItem - 插件列表项组件
 * 符合设计规范的列表项样式（简化版，无开关）
 */

import React from 'react';
import { Puzzle, Pin, Trash2, Eye } from 'lucide-react';
import './PluginListItem.css';

interface PluginListItemProps {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  type: 'official' | 'community';
  icon?: string;
  onPin?: () => void;
  onUninstall?: () => void;
  onViewDetails?: () => void;
  onClick?: () => void;
}

/**
 * 格式化插件类型显示
 */
const formatType = (type: 'official' | 'community'): string => {
  return type === 'official' ? '官方' : '社区';
};

export const PluginListItem: React.FC<PluginListItemProps> = ({
  id: _id,
  name,
  description,
  version,
  author,
  type,
  icon,
  onPin,
  onUninstall,
  onViewDetails,
  onClick
}) => {
  return (
    <div className="plugin-list-item" onClick={onClick}>
      {/* 1. 预览图/图标区域 */}
      <div className="preview-icon">
        {icon ? (
          <img src={icon} alt={name} className="plugin-icon-img" />
        ) : (
          <Puzzle className="icon" size={24} />
        )}
      </div>

      {/* 2. 辅助信息 - 插件类型标签 */}
      <div className="auxiliary-info">
        <div className={`type-badge ${type}`}>{formatType(type)}</div>
      </div>

      {/* 3. 名称和描述 */}
      <div className="content">
        <div className="title">{name}</div>
        <div className="description">{description}</div>
      </div>

      {/* 4. 右对齐区域 */}
      <div className="right-section">
        {/* 信息栏 */}
        <div className="info">
          {version} | {author}
        </div>

        {/* 按钮组 */}
        <div className="action-buttons">
          {onViewDetails && (
            <button
              className="details-btn"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              title="查看详情"
            >
              <Eye size={16} />
            </button>
          )}
          {onPin && (
            <button
              className="pin-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              title="添加到菜单栏"
            >
              <Pin size={16} />
            </button>
          )}
          {onUninstall && (
            <button
              className="uninstall-btn"
              onClick={(e) => {
                e.stopPropagation();
                onUninstall();
              }}
              title="卸载插件"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginListItem;

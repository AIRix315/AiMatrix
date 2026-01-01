/**
 * ProjectListItem - 项目列表项组件
 * 符合设计规范的列表项样式
 */

import React from 'react';
import { Folder, Pin, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import './ProjectListItem.css';

interface ProjectListItemProps {
  id: string;
  name: string;
  path: string;
  workflowType?: string;
  lastModified?: string; // ISO 8601 时间字符串
  icon?: React.ReactNode; // 自定义图标（可选）
  onDelete?: () => void;
  onPin?: () => void;
  onClick?: () => void;
}

export const ProjectListItem: React.FC<ProjectListItemProps> = ({
  id: _id,
  name,
  path,
  workflowType,
  lastModified,
  icon,
  onDelete,
  onPin,
  onClick
}) => {
  // 格式化项目类型显示
  const formatType = (type?: string): string => {
    if (!type) return '工作流';
    if (type === 'novel-to-video') return '小说转视频';
    return '工作流';
  };

  return (
    <div className="project-list-item" onClick={onClick}>
      {/* 1. 预览图区域 */}
      <div className="preview-icon">
        {icon || <Folder className="icon" size={24} />}
      </div>

      {/* 2. 辅助信息 - 项目无需辅助信息，保持布局统一 */}
      {/* 留空 */}

      {/* 3. 名称和路径 */}
      <div className="content">
        <div className="title">{name}</div>
        <div className="description">{path}</div>
      </div>

      {/* 4. 右对齐区域 */}
      <div className="right-section">
        {/* 信息栏 */}
        <div className="info">
          {formatType(workflowType)}
          {lastModified && <> | {formatRelativeTime(lastModified)}</>}
        </div>

        {/* 按钮组 */}
        <div className="action-buttons">
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
          {onDelete && (
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="删除项目"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectListItem;

/**
 * WorkflowListItem - 工作流列表项组件
 * 符合设计规范的列表项样式
 */

import React from 'react';
import { Workflow, Pin, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import './WorkflowListItem.css';

interface WorkflowListItemProps {
  id: string;
  name: string;
  description?: string;
  duration?: string; // 预留字段：用于未来显示辅助信息（如工作流来源分类标签）
  type: string; // 工作流来源类型（custom/official/third-party）- 当前未在UI显示
  lastModified: string; // ISO 8601 时间字符串
  onDelete?: () => void;
  onPin?: () => void;
  onClick?: () => void;
}

export const WorkflowListItem: React.FC<WorkflowListItemProps> = ({
  id: _id,
  name,
  description,
  duration: _duration = '00:00:00',
  type: _type,
  lastModified,
  onDelete,
  onPin,
  onClick
}) => {
  return (
    <div className="workflow-list-item" onClick={onClick}>
      {/* 1. 预览图区域 */}
      <div className="preview-icon">
        <Workflow className="icon" size={24} />
      </div>

      {/* 2. 辅助信息 - 工作流来源分类（暂时隐藏，未来用于显示：自定义/官方/第三方） */}
      {/* {duration && <div className="duration">{duration}</div>} */}

      {/* 3. 名称和描述 */}
      <div className="content">
        <div className="title">{name}</div>
        {description && <div className="description">{description}</div>}
      </div>

      {/* 4. 右对齐区域 */}
      <div className="right-section">
        {/* 信息栏 - 简化显示，仅显示相对时间 */}
        <div className="info">
          {formatRelativeTime(lastModified)}
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
              title="删除工作流"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowListItem;

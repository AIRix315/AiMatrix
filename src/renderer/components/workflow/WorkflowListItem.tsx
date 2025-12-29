/**
 * WorkflowListItem - 工作流列表项组件
 * 符合设计规范的列表项样式
 */

import React from 'react';
import { Play } from 'lucide-react';
import './WorkflowListItem.css';

interface WorkflowListItemProps {
  id: string;
  name: string;
  number: number;
  description?: string;
  duration?: string; // 格式：00:00:00
  status?: 'idle' | 'running' | 'completed' | 'skipped';
  type?: string;
  onClick?: () => void;
}

export const WorkflowListItem: React.FC<WorkflowListItemProps> = ({
  id,
  name,
  number,
  description,
  duration = '00:00:00',
  status = 'idle',
  type = 'custom',
  onClick
}) => {
  const getStatusLabel = () => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'skipped':
        return '跳过';
      default:
        return null;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'completed':
        return 'status-completed';
      case 'skipped':
        return 'status-skipped';
      default:
        return '';
    }
  };

  return (
    <div className="workflow-list-item" onClick={onClick}>
      {/* 左侧播放按钮 */}
      <button className="play-button" onClick={(e) => { e.stopPropagation(); }}>
        <Play size={16} fill="currentColor" />
      </button>

      {/* 时间码 */}
      <div className="duration">{duration}</div>

      {/* 主内容区 */}
      <div className="content">
        <div className="title">
          <span className="number">#{number}</span>
          <span className="name">{name}</span>
        </div>
        {description && (
          <div className="description">{description}</div>
        )}
      </div>

      {/* 右侧状态指示器 */}
      {getStatusLabel() && (
        <div className={`status-badge ${getStatusClass()}`}>
          <span className="status-indicator"></span>
          {getStatusLabel()}
        </div>
      )}
    </div>
  );
};

export default WorkflowListItem;

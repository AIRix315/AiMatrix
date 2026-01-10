/**
 * StoryboardListItem - 分镜列表项组件
 */

import React from 'react';
import { Clapperboard, Image, RefreshCw, Trash2 } from 'lucide-react';
import './StoryboardListItem.css';

interface StoryboardListItemProps {
  id: string;
  description: string;
  type: 'image' | 'video';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imagePath?: string;
  videoPath?: string;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

const statusText = {
  pending: '等待中',
  generating: '生成中',
  completed: '已完成',
  failed: '失败'
};

export const StoryboardListItem: React.FC<StoryboardListItemProps> = ({
  id: _id,
  description,
  type,
  status,
  imagePath,
  videoPath,
  onRegenerate,
  onDelete,
  onClick
}) => {
  const mediaPath = type === 'image' ? imagePath : videoPath;

  return (
    <div className={`storyboard-list-item status-${status}`} onClick={onClick}>
      <div className="preview-icon">
        {mediaPath ? (
          type === 'image' ? (
            <img src={`file://${mediaPath}`} alt={description} className="thumbnail" />
          ) : (
            <video src={`file://${mediaPath}`} className="thumbnail" />
          )
        ) : type === 'image' ? (
          <Image size={24} />
        ) : (
          <Clapperboard size={24} />
        )}
      </div>

      <div className="auxiliary-info">
        <div className="type-badge">{type === 'image' ? '图片' : '视频'}</div>
      </div>

      <div className="content">
        <div className="title">{description}</div>
        <div className="description">{statusText[status]}</div>
      </div>

      <div className="right-section">
        <div className="info">{statusText[status]}</div>

        <div className="action-buttons">
          {onRegenerate && status !== 'generating' && (
            <button className="regenerate-btn" onClick={(e) => { e.stopPropagation(); onRegenerate(); }} title="重新生成">
              <RefreshCw size={16} />
            </button>
          )}
          {onDelete && (
            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除分镜">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryboardListItem;

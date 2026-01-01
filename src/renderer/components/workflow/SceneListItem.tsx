/**
 * SceneListItem - 场景列表项组件
 */

import React from 'react';
import { MapPin, Edit2, Trash2 } from 'lucide-react';
import './SceneListItem.css';

interface SceneListItemProps {
  id: string;
  name: string;
  description: string;
  location?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export const SceneListItem: React.FC<SceneListItemProps> = ({
  id: _id,
  name,
  description,
  location,
  onEdit,
  onDelete,
  onClick
}) => {
  return (
    <div className="scene-list-item" onClick={onClick}>
      <div className="preview-icon">
        <MapPin size={24} />
      </div>

      <div className="content">
        <div className="title">{name}</div>
        <div className="description">{description}</div>
      </div>

      <div className="right-section">
        <div className="info">{location || '未指定地点'}</div>

        <div className="action-buttons">
          {onEdit && (
            <button className="edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="编辑场景">
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除场景">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneListItem;

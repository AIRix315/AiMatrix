/**
 * CharacterListItem - 角色列表项组件
 */

import React from 'react';
import { Users, Edit2, Trash2 } from 'lucide-react';
import './CharacterListItem.css';

interface CharacterListItemProps {
  id: string;
  name: string;
  description: string;
  appearance?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export const CharacterListItem: React.FC<CharacterListItemProps> = ({
  id: _id,
  name,
  description,
  appearance,
  onEdit,
  onDelete,
  onClick
}) => {
  return (
    <div className="character-list-item" onClick={onClick}>
      <div className="preview-icon">
        <Users size={24} />
      </div>

      <div className="content">
        <div className="title">{name}</div>
        <div className="description">{description}</div>
      </div>

      <div className="right-section">
        <div className="info">{appearance || '外貌未描述'}</div>

        <div className="action-buttons">
          {onEdit && (
            <button className="edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="编辑角色">
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除角色">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterListItem;

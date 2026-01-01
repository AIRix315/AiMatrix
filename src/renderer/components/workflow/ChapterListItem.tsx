/**
 * ChapterListItem - 章节列表项组件
 * 符合设计规范的列表项样式
 */

import React, { useState } from 'react';
import { Edit2, Check, X, Trash2 } from 'lucide-react';
import './ChapterListItem.css';

interface ChapterListItemProps {
  id: string;
  title: string;
  index: number;
  wordCount?: number;
  onEdit?: (id: string, newTitle: string) => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export const ChapterListItem: React.FC<ChapterListItemProps> = ({
  id,
  title,
  index,
  wordCount,
  onEdit,
  onDelete,
  onClick
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingTitle(title);
  };

  const handleSaveEdit = () => {
    if (editingTitle.trim()) {
      onEdit?.(id, editingTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTitle(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="chapter-list-item" onClick={onClick}>
      {/* 1. 预览图区域 - 章节编号 */}
      <div className="preview-icon">
        <div className="chapter-number">{index + 1}</div>
      </div>

      {/* 2. 辅助信息 - 留空保持统一 */}
      {/* 留空 */}

      {/* 3. 名称和描述 */}
      <div className="content">
        {isEditing ? (
          <div className="chapter-edit">
            <input
              type="text"
              className="chapter-title-input"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              autoFocus
              placeholder="输入章节标题"
            />
          </div>
        ) : (
          <div className="title">{title}</div>
        )}
        {wordCount !== undefined && (
          <div className="description">{wordCount.toLocaleString()} 字</div>
        )}
      </div>

      {/* 4. 右对齐区域 */}
      <div className="right-section">
        {/* 信息栏 */}
        <div className="info">
          第 {index + 1} 章
        </div>

        {/* 按钮组 */}
        {!isEditing && (
          <div className="action-buttons">
            {onEdit && (
              <button
                className="edit-btn"
                onClick={handleStartEdit}
                title="编辑标题"
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="删除章节"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}

        {/* 编辑模式按钮 */}
        {isEditing && (
          <div className="edit-actions">
            <button
              className="save-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveEdit();
              }}
              title="保存 (Enter)"
            >
              <Check size={16} />
            </button>
            <button
              className="cancel-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
              title="取消 (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterListItem;

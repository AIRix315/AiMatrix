/**
 * 快捷方式导航项组件
 *
 * 功能：
 * - 图标显示和点击跳转
 * - 长按500ms进入编辑模式
 * - 编辑模式支持删除操作
 * - 支持拖拽排序（已实现）
 *
 * 参考：plans/code-references-phase9.md (REF-012)
 */

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ShortcutItem } from '../../../common/types';
import './ShortcutNavItem.css';

interface ShortcutNavItemProps {
  shortcut: ShortcutItem;
  isEditing: boolean;
  onClick: () => void;
  onDelete: () => void;
  onEditModeChange: (isEditing: boolean) => void;
  // 拖拽相关
  onDragStart?: (shortcutId: string) => void;
  onDragOver?: (shortcutId: string) => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}

export const ShortcutNavItem: React.FC<ShortcutNavItemProps> = ({
  shortcut,
  isEditing,
  onClick,
  onDelete,
  onEditModeChange,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver = false
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 500; // 500ms

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const handleMouseDown = (_e: React.MouseEvent) => {
    // 如果已经在编辑模式，不处理长按
    if (isEditing) return;

    setIsPressing(true);
    pressTimerRef.current = setTimeout(() => {
      // 长按500ms后进入编辑模式
      onEditModeChange(true);
      setIsPressing(false);
    }, LONG_PRESS_DURATION);
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    // 如果不在编辑模式且没有完成长按，执行点击跳转
    if (!isEditing && isPressing) {
      onClick();
    }

    setIsPressing(false);
  };

  const handleMouseLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  // 拖拽事件处理
  const handleDragStart = (e: React.DragEvent) => {
    // 只在编辑模式下允许拖拽
    if (!isEditing) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shortcut.id);
    if (onDragStart) {
      onDragStart(shortcut.id);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (onDragOver && !isDragging) {
      onDragOver(shortcut.id);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={`shortcut-nav-item ${isEditing ? 'editing' : ''} ${isPressing ? 'pressing' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={shortcut.name}
      // 拖拽属性（仅在编辑模式下启用）
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="shortcut-icon-box">
        <span className="shortcut-icon">{shortcut.icon}</span>
      </div>
      <span className="shortcut-label">{shortcut.name}</span>

      {isEditing && (
        <button
          className="delete-btn"
          onClick={handleDeleteClick}
          title="删除快捷方式"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

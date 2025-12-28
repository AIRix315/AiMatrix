/**
 * 快捷方式导航项组件
 *
 * 功能：
 * - 图标显示和点击跳转
 * - 长按500ms进入编辑模式
 * - 编辑模式支持删除操作
 * - 支持拖拽排序（未来实现）
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
}

export const ShortcutNavItem: React.FC<ShortcutNavItemProps> = ({
  shortcut,
  isEditing,
  onClick,
  onDelete,
  onEditModeChange
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 500; // 500ms

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
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

  return (
    <div
      className={`shortcut-nav-item ${isEditing ? 'editing' : ''} ${isPressing ? 'pressing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={shortcut.name}
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

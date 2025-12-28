/**
 * useKeyboardShortcuts - 全局键盘快捷键Hook
 *
 * 功能：
 * - 统一管理全局快捷键
 * - 支持快捷键注册和注销
 * - 自动处理快捷键冲突
 */

import { useEffect, useCallback } from 'react';

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface KeyboardShortcutsOptions {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
}

/**
 * 检查快捷键是否匹配
 */
const matchesShortcut = (event: KeyboardEvent, shortcut: ShortcutAction): boolean => {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;
  const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

  return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
};

/**
 * 全局快捷键Hook
 */
export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: KeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 如果焦点在输入框、文本域等元素上，跳过快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // 除非是特定的全局快捷键（如F11全屏）
        if (event.key !== 'F11' && event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};

/**
 * 全局快捷键定义
 */
export const GLOBAL_SHORTCUTS = {
  NEW_PROJECT: { key: 'n', ctrl: true, description: '新建项目' },
  OPEN_SETTINGS: { key: ',', ctrl: true, description: '打开设置' },
  TOGGLE_FULLSCREEN: { key: 'F11', description: '全屏切换' },
  TOGGLE_VIEW_MODE: { key: 'g', ctrl: true, shift: true, description: '切换视图模式' },
  TOGGLE_LEFT_SIDEBAR: { key: 'b', ctrl: true, description: '切换左侧边栏' },
  TOGGLE_RIGHT_SIDEBAR: { key: 'b', ctrl: true, alt: true, description: '切换右侧边栏' },
  TOGGLE_ALL_SIDEBARS: { key: '\\', ctrl: true, description: '切换所有侧边栏' },
  SAVE: { key: 's', ctrl: true, description: '保存' },
  CLOSE_WINDOW: { key: 'w', ctrl: true, description: '关闭窗口' },
  ESCAPE: { key: 'Escape', description: '取消/关闭' },
} as const;

export default useKeyboardShortcuts;

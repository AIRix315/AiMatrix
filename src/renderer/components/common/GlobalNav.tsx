import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSidebar } from '../../contexts/SidebarContext';
import { ShortcutItem } from '../../../common/types';
import { ShortcutNavItem } from './ShortcutNavItem';
import { setGlobalNavRefresh } from '../../utils/globalNavHelper';
import './GlobalNav.css';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  title?: string;
  separator?: boolean;
}

// 上方固定区域导航项
const topNavItems: NavItem[] = [
  {
    id: 'home',
    label: '首页',
    icon: 'projects_icon.ico',
    path: '/',
    title: '首页 (Dashboard)',
  },
  {
    id: 'assets',
    label: '资产库',
    icon: 'content.ico',
    path: '/assets',
    title: '资产库 (Assets)',
  },
  {
    id: 'workflows',
    label: '工作流',
    icon: 'filter.ico',
    path: '/workflows',
    title: '工作流 (Workflows)',
  },
  {
    id: 'plugins',
    label: '插件',
    icon: 'plugin_market.ico',
    path: '/plugins',
    title: '插件 (Plugins)',
  },
];

// 下方固定区域导航项
const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: '设置',
    icon: 'settings.ico',
    path: '/settings',
    title: '设置 (Settings)',
  },
  {
    id: 'about',
    label: '关于',
    icon: 'info.ico',
    path: '/about',
    title: '关于',
  },
];

interface GlobalNavProps {
  onItemClick?: (item: NavItem) => void;
}

const GlobalNav: React.FC<GlobalNavProps> = ({ onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { leftSidebarCollapsed } = useSidebar();
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);

  // 加载快捷方式列表
  useEffect(() => {
    loadShortcuts();
    // 注册全局刷新函数
    setGlobalNavRefresh(loadShortcuts);

    return () => {
      // 组件卸载时清除
      setGlobalNavRefresh(async () => {});
    };
  }, []);

  const loadShortcuts = async () => {
    try {
      if (!window.electronAPI?.listShortcuts) {
        console.warn('listShortcuts API 尚未就绪');
        return;
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 5000);
      });

      const items = await Promise.race([
        window.electronAPI.listShortcuts(),
        timeoutPromise
      ]);

      setShortcuts(items || []);
    } catch (err) {
      console.error('加载快捷方式失败:', err);
      setShortcuts([]);
    }
  };

  const handleItemClick = (item: NavItem) => {
    navigate(item.path);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const handleShortcutClick = (shortcut: ShortcutItem) => {
    // 根据快捷方式类型跳转到对应页面
    switch (shortcut.type) {
      case 'project':
        navigate(`/projects/${shortcut.targetId}`);
        break;
      case 'workflow':
        // 工作流类型：跳转到工作流编辑器（自定义工作流用节点图编辑）
        navigate(`/workflows/editor/${shortcut.targetId}`);
        break;
      case 'plugin':
        // 插件类型：跳转到插件页面（按 docs/workflow-vs-executor.md 规范）
        navigate(`/plugins/${shortcut.targetId}`);
        break;
    }
  };

  const handleDeleteShortcut = async (shortcutId: string) => {
    try {
      await window.electronAPI.removeShortcut(shortcutId);
      setEditingShortcutId(null);
      await loadShortcuts();
    } catch (err) {
      console.error('删除快捷方式失败:', err);
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleEditModeChange = (shortcutId: string, isEditing: boolean) => {
    setEditingShortcutId(isEditing ? shortcutId : null);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => (
    <div
      key={item.id}
      className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
      onClick={() => handleItemClick(item)}
      title={item.title || item.label}
    >
      <div className="menu-icon-box">
        <img
          src={`./icons/${item.icon}`}
          alt={item.label}
          style={{ width: '36px', height: '36px' }}
        />
      </div>
      <span className="menu-label">{item.label}</span>
    </div>
  );

  const renderShortcut = (shortcut: ShortcutItem) => (
    <ShortcutNavItem
      key={shortcut.id}
      shortcut={shortcut}
      isEditing={editingShortcutId === shortcut.id}
      onClick={() => handleShortcutClick(shortcut)}
      onDelete={() => handleDeleteShortcut(shortcut.id)}
      onEditModeChange={(isEditing) => handleEditModeChange(shortcut.id, isEditing)}
    />
  );

  return (
    <motion.nav
      className={`global-menu ${leftSidebarCollapsed ? 'collapsed' : ''}`}
      animate={leftSidebarCollapsed ? {
        width: 0,
        opacity: 0,
      } : {
        opacity: 1,
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* 上方固定区域 */}
      <div className="nav-section nav-section-top">
        {topNavItems.map(renderNavItem)}
      </div>

      {/* 中间可编辑区域（用户快捷方式） */}
      <div className="nav-section nav-section-middle">
        {shortcuts.length > 0 && (
          <>
            <div className="menu-separator"></div>
            <div className="shortcuts-container">
              {shortcuts.map(renderShortcut)}
            </div>
          </>
        )}
      </div>

      {/* 间隔 */}
      <div className="menu-spacer"></div>

      {/* 下方固定区域 */}
      <div className="nav-section nav-section-bottom">
        {bottomNavItems.map(renderNavItem)}
      </div>
    </motion.nav>
  );
};

export default GlobalNav;
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
    id: 'workbench',
    label: '工作台',
    icon: 'filter.ico',
    path: '/workbench',
    title: '工作台 (Workbench)',
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
  const { leftSidebarCollapsed, assetPanelCollapsed, toggleAssetPanel } = useSidebar();
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  // 拖拽状态
  const [draggedShortcutId, setDraggedShortcutId] = useState<string | null>(null);
  const [dragOverShortcutId, setDragOverShortcutId] = useState<string | null>(null);

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
        // TODO: 移除调试代码
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
        navigate(`/workbench/editor/${shortcut.targetId}`);
        break;
      case 'plugin':
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
      // eslint-disable-next-line no-console
      console.error('删除快捷方式失败:', err);
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleEditModeChange = (shortcutId: string, isEditing: boolean) => {
    setEditingShortcutId(isEditing ? shortcutId : null);
  };

  // 拖拽事件处理
  const handleDragStart = (shortcutId: string) => {
    setDraggedShortcutId(shortcutId);
  };

  const handleDragOver = (targetShortcutId: string) => {
    if (draggedShortcutId && draggedShortcutId !== targetShortcutId) {
      setDragOverShortcutId(targetShortcutId);
    }
  };

  const handleDragEnd = async () => {
    // 如果有拖拽操作且目标位置有效
    if (draggedShortcutId && dragOverShortcutId && draggedShortcutId !== dragOverShortcutId) {
      try {
        // 计算新的顺序
        const newShortcuts = [...shortcuts];
        const draggedIndex = newShortcuts.findIndex(s => s.id === draggedShortcutId);
        const targetIndex = newShortcuts.findIndex(s => s.id === dragOverShortcutId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // 移除被拖拽的项
          const [draggedItem] = newShortcuts.splice(draggedIndex, 1);
          // 插入到目标位置
          newShortcuts.splice(targetIndex, 0, draggedItem);

          // 更新本地状态（立即反馈）
          setShortcuts(newShortcuts);

          // 调用 API 持久化新的顺序
          const newOrder = newShortcuts.map(s => s.id).filter((id): id is string => id !== undefined);
          await window.electronAPI.reorderShortcuts(newOrder);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('重新排序快捷方式失败:', err);
        // 失败时重新加载
        await loadShortcuts();
      }
    }

    // 清除拖拽状态
    setDraggedShortcutId(null);
    setDragOverShortcutId(null);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => {
    const isAssets = item.id === 'assets'; // 判断是否为资产库按钮

    return (
      <div
        key={item.id}
        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
        onClick={() => handleItemClick(item)}
        title={item.title || item.label}
        style={{ position: 'relative' }} // 相对定位以便角标定位
      >
        <div className="menu-icon-box">
          <img
            src={`./icons/${item.icon}`}
            alt={item.label}
            style={{ width: '36px', height: '36px' }}
          />
        </div>
        <span className="menu-label">{item.label}</span>

        {/* 资产库角标按钮 */}
        {isAssets && (
          <button
            className="nav-badge-button"
            onClick={(e) => {
              e.stopPropagation(); // 阻止导航触发
              toggleAssetPanel();
            }}
            title={assetPanelCollapsed ? '展开资产面板' : '收起资产面板'}
            aria-label={assetPanelCollapsed ? '展开资产面板' : '收起资产面板'}
          >
            {assetPanelCollapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
          </button>
        )}
      </div>
    );
  };

  const renderShortcut = (shortcut: ShortcutItem) => (
    <ShortcutNavItem
      key={shortcut.id}
      shortcut={shortcut}
      isEditing={editingShortcutId === shortcut.id}
      onClick={() => handleShortcutClick(shortcut)}
      onDelete={() => handleDeleteShortcut(shortcut.id || '')}
      onEditModeChange={(isEditing) => handleEditModeChange(shortcut.id || '', isEditing)}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      isDragOver={dragOverShortcutId === shortcut.id}
    />
  );

  return (
    <motion.nav
      className={`global-menu ${leftSidebarCollapsed ? 'collapsed' : ''}`}
      animate={leftSidebarCollapsed ? {
        width: 0,
        opacity: 0,
      } : {
        width: 'var(--left-menu-collapsed)',
        opacity: 1,
      }}
      whileHover={{
        width: 'var(--left-menu-expanded)',
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
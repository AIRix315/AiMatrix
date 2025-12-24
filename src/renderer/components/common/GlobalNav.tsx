import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './GlobalNav.css';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  title?: string;
  separator?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: '首页',
    icon: 'home',
    path: '/',
    title: '首页 (Projects)',
  },
  {
    id: 'assets',
    label: '素材',
    icon: 'library',
    path: '/assets',
    title: '素材 (Assets)',
  },
  {
    id: 'plugins',
    label: '插件',
    icon: 'plugins',
    path: '/plugins',
    title: '插件 (Market)',
  },
  {
    id: 'workflow',
    label: '小说转视频',
    icon: 'video',
    path: '/workflow',
    title: '小说转视频 (Workflow)',
    separator: true,
  },
];

const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: '设置',
    icon: 'settings',
    path: '/settings',
    title: '设置',
  },
  {
    id: 'about',
    label: '关于',
    icon: 'info',
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

  const handleItemClick = (item: NavItem) => {
    navigate(item.path);
    if (onItemClick) {
      onItemClick(item);
    }
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
      style={item.separator ? { marginTop: '10px', borderTop: '1px solid var(--border-color)' } : undefined}
    >
      <div className="menu-icon-box">
        <span className="material-icons" style={{ fontSize: '20px' }}>
          {item.icon === 'home' && '🏠'}
          {item.icon === 'library' && '📁'}
          {item.icon === 'plugins' && '🧩'}
          {item.icon === 'video' && '🎬'}
          {item.icon === 'settings' && '⚙️'}
          {item.icon === 'info' && 'ℹ️'}
        </span>
      </div>
      <span className="menu-label">{item.label}</span>
    </div>
  );

  return (
    <nav className="global-menu">
      {/* 主导航项 */}
      {navItems.map(renderNavItem)}

      {/* 间隔 */}
      <div className="menu-spacer"></div>

      {/* 底部导航项 */}
      {bottomNavItems.map(renderNavItem)}
    </nav>
  );
};

export default GlobalNav;
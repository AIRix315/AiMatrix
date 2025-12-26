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
    icon: 'projects_icon.ico',
    path: '/',
    title: '首页 (Projects)',
  },
  {
    id: 'assets',
    label: '资产库',
    icon: 'content.ico',
    path: '/assets',
    title: '资产库 (Assets)',
  },
  {
    id: 'plugins',
    label: '插件',
    icon: 'plugin_market.ico',
    path: '/plugins',
    title: '插件 (Market)',
  },
  {
    id: 'workflow',
    label: '工作台',
    icon: 'filter.ico',
    path: '/workflow',
    title: '工作台 (Workflow)',
    separator: true,
  },
];

const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: '设置',
    icon: 'settings.ico',
    path: '/settings',
    title: '设置',
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
        <img
          src={`./icons/${item.icon}`}
          alt={item.label}
          style={{ width: '40px', height: '40px' }}
        />
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
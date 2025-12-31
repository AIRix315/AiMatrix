import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import WindowBar from './WindowBar';
import GlobalNav from './GlobalNav';
import StatusBar from '../layout/StatusBar';
import { GlobalRightPanel } from '../global/GlobalRightPanel';
import { useSidebar } from '../../contexts/SidebarContext';
import './Layout.css';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { rightSidebarCollapsed } = useSidebar();

  return (
    <div className="app-layout">
      {/* Window Bar - 自定义标题栏 */}
      <WindowBar />

      {/* App Body */}
      <div className="app-body">
        {/* Left Menu - 全局导航 */}
        <GlobalNav />

        {/* 中间内容区（flex: 1自动填充剩余空间） */}
        <div className="content-wrapper">
          {/* 使用 Outlet 渲染子路由 */}
          {children || <Outlet />}
        </div>

        {/* 右侧面板 - 使用Framer Motion实现推挤式布局 */}
        <motion.aside
          className="global-right-panel"
          animate={rightSidebarCollapsed ? {
            width: 0,
            opacity: 0,
          } : {
            width: 'var(--right-panel-width)',
            opacity: 1,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {!rightSidebarCollapsed && <GlobalRightPanel />}
        </motion.aside>
      </div>

      {/* Status Bar - 底部状态栏（含日志查看器） */}
      <StatusBar />
    </div>
  );
};

export default Layout;
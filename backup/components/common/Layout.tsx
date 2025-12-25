import React from 'react';
import { Outlet } from 'react-router-dom';
import WindowBar from './WindowBar';
import GlobalNav from './GlobalNav';
import './Layout.css';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      {/* Window Bar - 自定义标题栏 */}
      <WindowBar />

      {/* App Body */}
      <div className="app-body">
        {/* Left Menu - 全局导航 */}
        <GlobalNav />

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {/* 使用 Outlet 渲染子路由 */}
          {children || <Outlet />}
        </div>
      </div>

      {/* Footer */}
      <footer className="status-bar">
        <div style={{ display: 'flex', gap: '15px' }}>
          <span id="footer-status-project">工作区: D:/Work/Matrix</span>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span>系统就绪</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
import React from 'react';
import { Outlet } from 'react-router-dom';
import WindowBar from './WindowBar';
import GlobalNav from './GlobalNav';
import StatusBar from '../layout/StatusBar';
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

      {/* Status Bar - 底部状态栏（含日志查看器） */}
      <StatusBar />
    </div>
  );
};

export default Layout;
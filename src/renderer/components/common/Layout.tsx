import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import WindowBar from './WindowBar';
import GlobalNav from './GlobalNav';
import StatusBar from '../layout/StatusBar';
import { GlobalRightPanel } from '../global/GlobalRightPanel';
import { UnifiedAssetPanel, AssetCategoryId } from '../UnifiedAssetPanel';
import { useSidebar } from '../../contexts/SidebarContext';
import './Layout.css';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { rightSidebarCollapsed, assetPanelCollapsed } = useSidebar();

  // 全局资产面板状态
  const [selectedScope, setSelectedScope] = useState<'global' | 'project'>('global');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryId>('all' as AssetCategoryId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  return (
    <div className="app-layout">
      {/* Window Bar - 自定义标题栏 */}
      <WindowBar />

      {/* App Body */}
      <div className="app-body">
        {/* Left Menu - 全局导航 */}
        <GlobalNav />

        {/* 全局左侧资产面板 - 抽屉式 */}
        <AnimatePresence mode="wait">
          {!assetPanelCollapsed && (
            <motion.aside
              key="asset-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ flexShrink: 0, overflow: 'hidden' }}
            >
              <UnifiedAssetPanel
                selectedScope={selectedScope}
                selectedCategory={selectedCategory}
                selectedProjectId={selectedProjectId}
                showProjectSelector={true}
                onScopeChange={setSelectedScope}
                onCategoryChange={setSelectedCategory}
                onProjectChange={setSelectedProjectId}
              />
            </motion.aside>
          )}
        </AnimatePresence>

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
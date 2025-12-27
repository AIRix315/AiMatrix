import React, { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import './WindowBar.css';
import { logger } from '../../utils/logger';

interface WindowBarProps {
  title?: string;
  version?: string;
}

const WindowBar: React.FC<WindowBarProps> = ({
  title = 'MATRIX',
  version = 'v0.2.9'
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { leftSidebarCollapsed, toggleLeftSidebar } = useSidebar();

  useEffect(() => {
    // 检查窗口是否最大化
    const checkMaximized = async () => {
      try {
        if (window.electronAPI?.isWindowMaximized) {
          const maximized = await window.electronAPI.isWindowMaximized();
          setIsMaximized(maximized);
        }
      } catch (error) {
        await logger.error('Failed to check window maximized state', 'WindowBar', { error });
      }
    };

    checkMaximized();

    // 监听窗口状态变化
    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = async () => {
    try {
      if (window.electronAPI?.minimizeWindow) {
        await window.electronAPI.minimizeWindow();
      }
    } catch (error) {
      await logger.error('Failed to minimize window', 'WindowBar', { error });
    }
  };

  const handleMaximize = async () => {
    try {
      if (window.electronAPI?.maximizeWindow) {
        await window.electronAPI.maximizeWindow();
        setIsMaximized(!isMaximized);
      }
    } catch (error) {
      await logger.error('Failed to maximize window', 'WindowBar', { error });
    }
  };

  const handleClose = async () => {
    try {
      if (window.electronAPI?.closeWindow) {
        await window.electronAPI.closeWindow();
      }
    } catch (error) {
      await logger.error('Failed to close window', 'WindowBar', { error });
    }
  };

  return (
    <div className="window-bar">
      <div className="window-title">
        {/* 左侧边栏收缩按钮 */}
        <button
          className="sidebar-toggle-btn"
          onClick={toggleLeftSidebar}
          title={leftSidebarCollapsed ? '展开侧边栏' : '收缩侧边栏'}
          aria-label={leftSidebarCollapsed ? '展开侧边栏' : '收缩侧边栏'}
        >
          {leftSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <span>{title}</span> Studio{' '}
        <span style={{ fontWeight: 'normal', opacity: 0.5, marginLeft: '10px' }}>
          {version}
        </span>
      </div>
      <div className="window-controls">
        <span 
          className="control-item" 
          onClick={handleMinimize}
          title="最小化"
        >
          ─
        </span>
        <span 
          className="control-item" 
          onClick={handleMaximize}
          title={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? '❐' : '□'}
        </span>
        <span 
          className="control-item close-btn" 
          onClick={handleClose}
          title="关闭"
        >
          ✕
        </span>
      </div>
    </div>
  );
};

export default WindowBar;
import React, { useEffect, useState } from 'react';
import './WindowBar.css';

interface WindowBarProps {
  title?: string;
  version?: string;
}

const WindowBar: React.FC<WindowBarProps> = ({ 
  title = 'MATRIX', 
  version = 'Platform V14.0' 
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // 检查窗口是否最大化
    const checkMaximized = async () => {
      try {
        if (window.electronAPI?.isWindowMaximized) {
          const maximized = await window.electronAPI.isWindowMaximized();
          setIsMaximized(maximized);
        }
      } catch (error) {
        console.error('Failed to check window maximized state:', error);
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
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      if (window.electronAPI?.maximizeWindow) {
        await window.electronAPI.maximizeWindow();
        setIsMaximized(!isMaximized);
      }
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      if (window.electronAPI?.closeWindow) {
        await window.electronAPI.closeWindow();
      }
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className="window-bar">
      <div className="window-title">
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
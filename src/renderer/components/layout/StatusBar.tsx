import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import LogViewer from './LogViewer';
import './StatusBar.css';

interface StatusBarProps {
  workspacePath?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ workspacePath }) => {
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // 定期检查是否有新的错误日志
  useEffect(() => {
    const checkForErrors = async () => {
      try {
        const logs = await window.electronAPI.getRecentLogs(10, 'error');
        setHasError(logs.length > 0);
        setErrorCount(logs.length);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch error logs:', error);
      }
    };

    // 初始检查
    checkForErrors();

    // 每30秒检查一次
    const interval = setInterval(checkForErrors, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    setIsLogViewerOpen(true);
  };

  return (
    <>
      <footer className="status-bar">
        <div className="status-bar-left">
          <span className="status-item">
            工作区: {workspacePath || 'D:/Work/Matrix'}
          </span>
        </div>

        <div className="status-bar-right">
          <span className="status-item">系统就绪</span>

          {/* 日志铃铛图标 */}
          <button
            className={`status-bell-button ${hasError ? 'has-error' : ''}`}
            onClick={handleBellClick}
            title="查看日志"
          >
            <Bell size={16} />
            {hasError && (
              <span className="error-badge">{errorCount > 9 ? '9+' : errorCount}</span>
            )}
          </button>
        </div>
      </footer>

      {/* 日志查看器 */}
      <LogViewer
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
      />
    </>
  );
};

export default StatusBar;

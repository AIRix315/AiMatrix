import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react';
import './LogViewer.css';

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service?: string;
  message: string;
  data?: unknown;
}

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const fetchedLogs = await window.electronAPI.getRecentLogs(100, levelFilter || undefined);
      setLogs(fetchedLogs);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 当打开时或级别过滤器变化时，获取日志
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, levelFilter]);

  // 获取日志级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={16} className="log-icon error" />;
      case 'warn':
        return <AlertTriangle size={16} className="log-icon warn" />;
      case 'info':
        return <Info size={16} className="log-icon info" />;
      case 'debug':
        return <Bug size={16} className="log-icon debug" />;
      default:
        return null;
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="log-viewer-overlay" onClick={onClose}>
      <div className="log-viewer-sheet" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="log-viewer-header">
          <h3 className="log-viewer-title">系统日志</h3>

          <div className="log-viewer-actions">
            {/* 级别过滤器 */}
            <div className="log-level-filters">
              <button
                className={`level-filter-btn ${levelFilter === '' ? 'active' : ''}`}
                onClick={() => setLevelFilter('')}
              >
                全部
              </button>
              <button
                className={`level-filter-btn error ${levelFilter === 'error' ? 'active' : ''}`}
                onClick={() => setLevelFilter('error')}
              >
                错误
              </button>
              <button
                className={`level-filter-btn warn ${levelFilter === 'warn' ? 'active' : ''}`}
                onClick={() => setLevelFilter('warn')}
              >
                警告
              </button>
              <button
                className={`level-filter-btn info ${levelFilter === 'info' ? 'active' : ''}`}
                onClick={() => setLevelFilter('info')}
              >
                信息
              </button>
              <button
                className={`level-filter-btn debug ${levelFilter === 'debug' ? 'active' : ''}`}
                onClick={() => setLevelFilter('debug')}
              >
                调试
              </button>
            </div>

            {/* 刷新按钮 */}
            <button
              className="log-refresh-btn"
              onClick={fetchLogs}
              disabled={isLoading}
              title="刷新"
            >
              <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            </button>

            {/* 关闭按钮 */}
            <button
              className="log-close-btn"
              onClick={onClose}
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="log-viewer-body">
          {isLoading ? (
            <div className="log-loading">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="log-empty">暂无日志</div>
          ) : (
            <div className="log-list">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry log-level-${log.level}`}>
                  <div className="log-entry-header">
                    {getLevelIcon(log.level)}
                    <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                    {log.service && <span className="log-service">[{log.service}]</span>}
                  </div>
                  <div className="log-message">{log.message}</div>
                  {/* TODO: [中期改进] 定义准确的log.data类型 */}
                  {log.data ? (
                    <pre className="log-data">{JSON.stringify(log.data as Record<string, unknown>, null, 2)}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;

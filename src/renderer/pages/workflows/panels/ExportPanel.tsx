/**
 * ExportPanel - 导出成品面板
 *
 * 功能：合成并导出最终视频
 */

import React, { useState } from 'react';
import { Clapperboard, Mic, FolderOpen } from 'lucide-react';
import { Button, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import './ExportPanel.css';

interface ExportOptions {
  format: 'mp4' | 'avi' | 'mov';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '720p' | '1080p' | '2k' | '4k';
  fps: 24 | 30 | 60;
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: unknown) => void;
  initialData?: unknown;
}

export const ExportPanel: React.FC<PanelProps> = ({ onComplete, initialData }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [storyboards] = useState((initialData as any)?.storyboards || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [voiceovers] = useState((initialData as any)?.voiceovers || []);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    fps: 30
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportPath, setExportPath] = useState('');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  /**
   * 处理导出
   */
  const handleExport = async () => {
    if (storyboards.length === 0 || voiceovers.length === 0) {
      setToast({
        type: 'warning',
        message: '缺少必要的资源，无法导出'
      });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      // TODO: 调用IPC API导出视频
      // const result = await window.electronAPI.novelVideo.exportVideo(workflowId, exportOptions);

      // 模拟进度更新
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }

      const mockPath = `E:/Projects/Matrix/output/video-${Date.now()}.${exportOptions.format}`;
      setExportPath(mockPath);

      setToast({
        type: 'success',
        message: '导出成功！'
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('导出视频失败:', error);
      setToast({
        type: 'error',
        message: `导出失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理完成
   */
  const _handleComplete = () => {
    if (!exportPath) {
      setToast({
        type: 'warning',
        message: '请先导出视频'
      });
      return;
    }

    onComplete({
      exportPath,
      exportOptions
    });
  };

  return (
    <div className="export-panel">
      <div className="panel-header">
        <h2>导出成品</h2>
        <p className="panel-description">合成并导出最终视频文件</p>
      </div>

      <div className="panel-content">
        {/* 资源统计 */}
        <div className="resource-stats">
          <h3>资源概览</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Clapperboard className="h-6 w-6 text-primary" />
              </div>
              <div className="stat-info">
                <div className="stat-value">{storyboards.length}</div>
                <div className="stat-label">分镜</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div className="stat-info">
                <div className="stat-value">{voiceovers.length}</div>
                <div className="stat-label">配音</div>
              </div>
            </div>
          </div>
        </div>

        {/* 导出选项 */}
        <div className="export-options">
          <h3>导出设置</h3>

          <div className="options-grid">
            <div className="option-item">
              <label>格式:</label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as any })}
                disabled={loading}
              >
                <option value="mp4">MP4</option>
                <option value="avi">AVI</option>
                <option value="mov">MOV</option>
              </select>
            </div>

            <div className="option-item">
              <label>质量:</label>
              <select
                value={exportOptions.quality}
                onChange={(e) => setExportOptions({ ...exportOptions, quality: e.target.value as any })}
                disabled={loading}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="ultra">超高</option>
              </select>
            </div>

            <div className="option-item">
              <label>分辨率:</label>
              <select
                value={exportOptions.resolution}
                onChange={(e) => setExportOptions({ ...exportOptions, resolution: e.target.value as any })}
                disabled={loading}
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="2k">2K</option>
                <option value="4k">4K</option>
              </select>
            </div>

            <div className="option-item">
              <label>帧率:</label>
              <select
                value={exportOptions.fps}
                onChange={(e) => setExportOptions({ ...exportOptions, fps: parseInt(e.target.value) as any })}
                disabled={loading}
              >
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="export-action">
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={loading || storyboards.length === 0 || voiceovers.length === 0}
            style={{ width: '200px' }}
          >
            {loading ? '导出中...' : '📥 开始导出'}
          </Button>
        </div>

        {/* 进度条 */}
        {loading && (
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">{progress}%</div>
          </div>
        )}

        {/* 导出结果 */}
        {exportPath && (
          <div className="export-result">
            <div className="success-icon">✅</div>
            <h3>导出成功！</h3>
            <p className="export-path">{exportPath}</p>
            <Button variant="ghost" onClick={() => {
              // TODO: 打开文件所在目录
              // window.electronAPI.showItemInFolder(exportPath)
            }}>
              <FolderOpen className="h-4 w-4 mr-2 inline" />
              打开文件位置
            </Button>
          </div>
        )}
      </div>

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

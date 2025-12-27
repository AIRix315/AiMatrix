/**
 * ChapterSplitPanel - 章节拆分面板
 *
 * 功能：上传小说文件，自动拆分章节
 */

import React, { useState } from 'react';
import { Button, Card, Loading, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import './ChapterSplitPanel.css';

interface Chapter {
  id: string;
  title: string;
  index: number;
  content: string;
  wordCount?: number;
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: any) => void;
  initialData?: any;
}

export const ChapterSplitPanel: React.FC<PanelProps> = ({ onComplete, initialData }) => {
  const [novelPath, setNovelPath] = useState(initialData?.novelPath || '');
  const [chapters, setChapters] = useState<Chapter[]>(initialData?.chapters || []);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  /**
   * 处理文件上传
   */
  const handleUpload = async () => {
    try {
      // TODO: 实现文件选择对话框（需要在预加载脚本中添加selectFile API）
      // const path = await window.electronAPI.selectFile({ filters: [{ name: 'Text', extensions: ['txt'] }] });

      // 临时使用文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          setNovelPath(file.name);
          setToast({
            type: 'success',
            message: `已选择文件: ${file.name}`
          });
        }
      };
      input.click();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('选择文件失败:', error);
      setToast({
        type: 'error',
        message: `选择文件失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  /**
   * 处理章节拆分
   */
  const handleSplit = async () => {
    if (!novelPath) {
      setToast({
        type: 'warning',
        message: '请先选择小说文件'
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: 调用IPC API拆分章节（需要在预加载脚本中添加novelVideo.splitChapters API）
      // const result = await window.electronAPI.novelVideo.splitChapters(workflowId, novelPath);

      // 临时模拟数据
      const mockChapters: Chapter[] = Array.from({ length: 5 }, (_, i) => ({
        id: `chapter-${i + 1}`,
        title: `第${i + 1}章`,
        index: i,
        content: `这是第${i + 1}章的内容...`,
        wordCount: 1000 + i * 100
      }));

      setChapters(mockChapters);
      setToast({
        type: 'success',
        message: `拆分成功！共${mockChapters.length}章`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('拆分章节失败:', error);
      setToast({
        type: 'error',
        message: `拆分章节失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理下一步
   */
  const handleNext = () => {
    if (chapters.length === 0) {
      setToast({
        type: 'warning',
        message: '请先拆分章节'
      });
      return;
    }

    onComplete({
      novelPath,
      chapters
    });
  };

  return (
    <div className="chapter-split-panel">
      <div className="panel-header">
        <h2>章节拆分</h2>
        <p className="panel-description">上传小说文件，自动拆分为章节</p>
      </div>

      <div className="panel-content">
        {/* 文件选择区域 */}
        <div className="upload-section">
          <Button variant="primary" onClick={handleUpload}>
            📁 上传小说文件
          </Button>

          {novelPath && (
            <div className="file-info">
              <p className="file-path">已选择: {novelPath}</p>
              <Button onClick={handleSplit} disabled={loading}>
                {loading ? '拆分中...' : '✂️ 拆分章节'}
              </Button>
            </div>
          )}
        </div>

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在拆分章节，请稍候..." />}

        {/* 章节列表 */}
        {chapters.length > 0 && (
          <div className="chapter-list-section">
            <h3>章节列表 <span className="count">({chapters.length}章)</span></h3>
            <div className="chapter-list">
              {chapters.map((chapter) => (
                <Card
                  key={chapter.id}
                  tag={`第${chapter.index + 1}章`}
                  title={chapter.title}
                  info={`字数: ${chapter.wordCount || 0}`}
                  hoverable
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="panel-footer">
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={chapters.length === 0}
        >
          下一步 →
        </Button>
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

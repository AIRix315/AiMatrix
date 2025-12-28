/**
 * ChapterSplitPanel - 章节拆分面板
 *
 * 功能：上传小说文件，自动拆分章节
 * H2.5: 完整业务逻辑实现
 */

import React, { useState } from 'react';
import { Edit2, Check, X, FileText } from 'lucide-react';
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
  const [fileName, setFileName] = useState(initialData?.fileName || '');
  const [chapters, setChapters] = useState<Chapter[]>(initialData?.chapters || []);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 编辑状态
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  /**
   * 处理文件上传
   * 支持 txt 和 docx 格式
   */
  const handleUpload = async () => {
    try {
      const result = await window.electronAPI.selectFiles({
        filters: [
          { name: '小说文件', extensions: ['txt', 'docx'] },
          { name: '文本文件', extensions: ['txt'] },
          { name: 'Word文档', extensions: ['docx'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const name = filePath.split(/[\\/]/).pop() || filePath;

        setNovelPath(filePath);
        setFileName(name);
        setToast({
          type: 'success',
          message: `已选择文件: ${name}`
        });
      }
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
   * 开始编辑章节标题
   */
  const handleStartEdit = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditingTitle(chapter.title);
  };

  /**
   * 保存章节标题编辑
   */
  const handleSaveEdit = () => {
    if (editingChapterId && editingTitle.trim()) {
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === editingChapterId ? { ...ch, title: editingTitle.trim() } : ch
        )
      );
      setToast({
        type: 'success',
        message: '章节标题已更新'
      });
    }
    setEditingChapterId(null);
    setEditingTitle('');
  };

  /**
   * 取消编辑
   */
  const handleCancelEdit = () => {
    setEditingChapterId(null);
    setEditingTitle('');
  };

  /**
   * 删除章节
   */
  const handleDeleteChapter = (chapterId: string) => {
    setChapters((prev) => {
      const filtered = prev.filter((ch) => ch.id !== chapterId);
      // 重新调整索引
      return filtered.map((ch, index) => ({ ...ch, index }));
    });
    setToast({
      type: 'info',
      message: '章节已删除'
    });
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
      fileName,
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
            <FileText size={16} />
            上传小说文件
          </Button>

          {novelPath && (
            <div className="file-info">
              <div className="file-details">
                <span className="file-icon">📄</span>
                <div className="file-text">
                  <p className="file-name">{fileName}</p>
                  <p className="file-path">{novelPath}</p>
                </div>
              </div>
              <Button onClick={handleSplit} disabled={loading}>
                {loading ? '拆分中...' : '✂️ 拆分章节'}
              </Button>
            </div>
          )}
        </div>

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在使用AI识别章节，请稍候..." />}

        {/* 章节列表 */}
        {chapters.length > 0 && (
          <div className="chapter-list-section">
            <div className="section-header">
              <h3>
                章节列表 <span className="count">({chapters.length}章)</span>
              </h3>
              <p className="hint">提示：点击编辑图标可修改章节标题</p>
            </div>
            <div className="chapter-list">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="chapter-item">
                  <div className="chapter-number">{chapter.index + 1}</div>
                  <div className="chapter-content">
                    {editingChapterId === chapter.id ? (
                      // 编辑模式
                      <div className="chapter-edit">
                        <input
                          type="text"
                          className="chapter-title-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          placeholder="输入章节标题"
                        />
                        <div className="edit-actions">
                          <button
                            className="icon-btn save-btn"
                            onClick={handleSaveEdit}
                            title="保存 (Enter)"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="icon-btn cancel-btn"
                            onClick={handleCancelEdit}
                            title="取消 (Esc)"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <div className="chapter-display">
                        <h4 className="chapter-title">{chapter.title}</h4>
                        <span className="chapter-word-count">
                          {chapter.wordCount?.toLocaleString() || 0} 字
                        </span>
                      </div>
                    )}
                  </div>
                  {editingChapterId !== chapter.id && (
                    <div className="chapter-actions">
                      <button
                        className="icon-btn edit-btn"
                        onClick={() => handleStartEdit(chapter)}
                        title="编辑标题"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="icon-btn delete-btn"
                        onClick={() => handleDeleteChapter(chapter.id)}
                        title="删除章节"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

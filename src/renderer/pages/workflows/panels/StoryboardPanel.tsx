/**
 * StoryboardPanel - 分镜脚本生成面板
 *
 * 功能：为场景生成分镜脚本和图片/视频
 * H2.7: 完整业务逻辑实现（双视图、重生成、Prompt编辑）
 */

import React, { useState, useEffect } from 'react';
import { Maximize2, RefreshCw, Edit2, Check, X, Clapperboard, Image } from 'lucide-react';
import { Button, Card, Loading, Toast, ViewSwitcher } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import './StoryboardPanel.css';

interface Storyboard {
  id: string;
  sceneId: string;
  type: 'image' | 'video';
  description: string;
  prompt?: string;
  imagePath?: string;
  videoPath?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: any) => void;
  initialData?: any;
  onStoryboardSelectionChange?: (selectedIds: string[]) => void;
}

export const StoryboardPanel: React.FC<PanelProps> = ({
  workflowId: _workflowId, // 待后端 API 集成时使用
  onComplete,
  initialData,
  onStoryboardSelectionChange
}) => {
  const [scenes] = useState(initialData?.scenes || []);
  const [storyboards, setStoryboards] = useState<Storyboard[]>(initialData?.storyboards || []);
  const [loading, setLoading] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 视图模式状态
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 选中状态（支持多选）
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<string[]>([]);

  // 正在生成的分镜ID列表
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);

  // Prompt编辑状态
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState('');

  // 从localStorage恢复视图模式偏好
  useEffect(() => {
    const savedMode = localStorage.getItem('storyboard-view-mode');
    if (savedMode === 'grid' || savedMode === 'list') {
      setViewMode(savedMode);
    }
  }, []);

  // 保存视图模式偏好到localStorage
  useEffect(() => {
    localStorage.setItem('storyboard-view-mode', viewMode);
  }, [viewMode]);

  // 快捷键支持 (Ctrl+Shift+G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 当选中状态改变时，通知父组件
  useEffect(() => {
    if (onStoryboardSelectionChange) {
      onStoryboardSelectionChange(selectedStoryboardIds);
    }
  }, [selectedStoryboardIds, onStoryboardSelectionChange]);

  /**
   * 处理卡片/列表项点击
   * 支持单选、Ctrl多选、Shift范围选择
   */
  const handleStoryboardClick = (storyboardId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd 点击：切换选中状态
      setSelectedStoryboardIds((prev) =>
        prev.includes(storyboardId)
          ? prev.filter((id) => id !== storyboardId)
          : [...prev, storyboardId]
      );
    } else if (event.shiftKey && selectedStoryboardIds.length > 0) {
      // Shift 点击：范围选择
      const lastSelectedId = selectedStoryboardIds[selectedStoryboardIds.length - 1];
      const lastIndex = storyboards.findIndex((s) => s.id === lastSelectedId);
      const currentIndex = storyboards.findIndex((s) => s.id === storyboardId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = storyboards.slice(start, end + 1).map((s) => s.id);
        setSelectedStoryboardIds(rangeIds);
      }
    } else {
      // 普通点击：单选
      setSelectedStoryboardIds([storyboardId]);
    }
  };

  /**
   * 处理生成分镜
   */
  const handleGenerate = async () => {
    if (scenes.length === 0) {
      setToast({
        type: 'warning',
        message: '没有可用的场景'
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: 调用IPC API生成分镜
      // const result = await window.electronAPI.novelVideo.generateStoryboards(workflowId, scenes.map(s => s.id), generationType);

      // 临时模拟数据
      const mockStoryboards: Storyboard[] = scenes.slice(0, 3).map((scene: any, i: number) => ({
        id: `storyboard-${scene.id}-${i + 1}`,
        sceneId: scene.id,
        type: generationType,
        description: `${scene.name}的分镜脚本`,
        prompt: `${scene.description}，${generationType === 'image' ? '图片' : '视频'}风格`,
        imagePath: generationType === 'image' ? `/mock/image-${i + 1}.png` : undefined,
        videoPath: generationType === 'video' ? `/mock/video-${i + 1}.mp4` : undefined,
        status: 'completed'
      }));

      setStoryboards([...storyboards, ...mockStoryboards]);
      setToast({
        type: 'success',
        message: `生成成功！共${mockStoryboards.length}个分镜`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('生成分镜失败:', error);
      setToast({
        type: 'error',
        message: `生成失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重新生成单个分镜
   */
  const handleRegenerate = async (storyboardId: string) => {
    const storyboard = storyboards.find((s) => s.id === storyboardId);
    if (!storyboard) return;

    // 添加到生成中列表
    setGeneratingIds((prev) => [...prev, storyboardId]);

    try {
      // TODO: 调用IPC API重新生成分镜
      // const result = await window.electronAPI.novelVideo.regenerateStoryboard(
      //   workflowId,
      //   storyboardId,
      //   storyboard.prompt
      // );

      // 模拟生成延迟
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 更新分镜数据
      setStoryboards((prev) =>
        prev.map((s) =>
          s.id === storyboardId
            ? {
                ...s,
                status: 'completed',
                imagePath: s.type === 'image' ? `/mock/regenerated-${Date.now()}.png` : undefined,
                videoPath: s.type === 'video' ? `/mock/regenerated-${Date.now()}.mp4` : undefined
              }
            : s
        )
      );

      setToast({
        type: 'success',
        message: '重新生成成功！'
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('重新生成失败:', error);
      setToast({
        type: 'error',
        message: `重新生成失败: ${error instanceof Error ? error.message : String(error)}`
      });

      // 标记为失败
      setStoryboards((prev) =>
        prev.map((s) => (s.id === storyboardId ? { ...s, status: 'failed' } : s))
      );
    } finally {
      // 从生成中列表移除
      setGeneratingIds((prev) => prev.filter((id) => id !== storyboardId));
    }
  };

  /**
   * 开始编辑Prompt
   */
  const handleStartEditPrompt = (storyboard: Storyboard) => {
    setEditingPromptId(storyboard.id);
    setEditingPromptText(storyboard.prompt || '');
  };

  /**
   * 保存Prompt编辑
   */
  const handleSavePrompt = () => {
    if (editingPromptId && editingPromptText.trim()) {
      setStoryboards((prev) =>
        prev.map((s) =>
          s.id === editingPromptId ? { ...s, prompt: editingPromptText.trim() } : s
        )
      );
      setToast({
        type: 'success',
        message: 'Prompt已更新'
      });
    }
    setEditingPromptId(null);
    setEditingPromptText('');
  };

  /**
   * 取消编辑Prompt
   */
  const handleCancelEditPrompt = () => {
    setEditingPromptId(null);
    setEditingPromptText('');
  };

  /**
   * 处理下一步
   */
  const handleNext = () => {
    if (storyboards.length === 0) {
      setToast({
        type: 'warning',
        message: '请先生成分镜脚本'
      });
      return;
    }

    onComplete({
      storyboards
    });
  };

  return (
    <div className="storyboard-panel">
      <div className="panel-header">
        <div className="header-left">
          <h2>分镜脚本生成</h2>
          <p className="panel-description">为场景生成分镜脚本和图片/视频资源</p>
        </div>
        <div className="header-right">
          {/* 视图切换按钮组 */}
          <div className="view-toggle-group">
            <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
            <div className="separator" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                document.documentElement.requestFullscreen();
              }}
              title="全屏 (F11)"
            >
              <Maximize2 size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="panel-content">
        {/* 生成类型选择器 */}
        <div className="generation-options">
          <div className="option-group">
            <label>生成类型:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="image"
                  checked={generationType === 'image'}
                  onChange={(e) => setGenerationType(e.target.value as 'image' | 'video')}
                  disabled={loading}
                />
                <span>图片分镜</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="video"
                  checked={generationType === 'video'}
                  onChange={(e) => setGenerationType(e.target.value as 'image' | 'video')}
                  disabled={loading}
                />
                <span>视频分镜</span>
              </label>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || scenes.length === 0}>
            {loading ? '生成中...' : (
              <>
                <Clapperboard className="h-4 w-4 mr-2 inline" />
                生成分镜
              </>
            )}
          </Button>
        </div>

        {/* 场景统计 */}
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">可用场景:</span>
            <span className="stat-value">{scenes.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已生成分镜:</span>
            <span className="stat-value">{storyboards.length}</span>
          </div>
        </div>

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在生成分镜脚本，请稍候..." />}

        {/* 分镜列表 */}
        {storyboards.length > 0 && (
          <div className="storyboard-list-section">
            <h3>分镜列表</h3>
            {/* 网格视图 */}
            {viewMode === 'grid' && (
              <div className="storyboard-grid">
                {storyboards.map((storyboard) => {
                  const isGenerating = generatingIds.includes(storyboard.id);
                  return (
                    <div
                      key={storyboard.id}
                      className={`storyboard-card-wrapper ${
                        selectedStoryboardIds.includes(storyboard.id) ? 'selected' : ''
                      } ${isGenerating ? 'generating' : ''}`}
                      onClick={(e) => handleStoryboardClick(storyboard.id, e)}
                    >
                      <div className="card-content">
                        <Card
                          tag={storyboard.type === 'image' ? '图片' : '视频'}
                          title={storyboard.description}
                          info={`状态: ${
                            isGenerating
                              ? '生成中...'
                              : storyboard.status === 'completed'
                              ? '已完成'
                              : storyboard.status === 'failed'
                              ? '失败'
                              : '待生成'
                          }`}
                          image={
                            storyboard.type === 'image' ? (
                              <Image className="h-12 w-12 text-muted-foreground" />
                            ) : (
                              <Clapperboard className="h-12 w-12 text-muted-foreground" />
                            )
                          }
                          hoverable
                        />
                        {editingPromptId === storyboard.id ? (
                          <div className="card-prompt-edit">
                            <textarea
                              className="prompt-edit-textarea"
                              value={editingPromptText}
                              onChange={(e) => setEditingPromptText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  handleSavePrompt();
                                }
                                if (e.key === 'Escape') {
                                  handleCancelEditPrompt();
                                }
                              }}
                              placeholder="输入生成提示词..."
                              rows={2}
                              autoFocus
                            />
                            <div className="prompt-edit-actions">
                              <button
                                className="icon-btn save-btn"
                                onClick={handleSavePrompt}
                                title="保存 (Ctrl+Enter)"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                className="icon-btn cancel-btn"
                                onClick={handleCancelEditPrompt}
                                title="取消 (Esc)"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="card-prompt-display">
                            {storyboard.prompt ? (
                              <p className="card-prompt-text">{storyboard.prompt}</p>
                            ) : (
                              <p className="card-prompt-text placeholder">暂无Prompt</p>
                            )}
                          </div>
                        )}
                        <div
                          className="card-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {editingPromptId !== storyboard.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditPrompt(storyboard)}
                              disabled={isGenerating}
                              title="编辑Prompt"
                            >
                              <Edit2 size={14} />
                              编辑
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerate(storyboard.id)}
                            disabled={isGenerating || editingPromptId === storyboard.id}
                          >
                            <RefreshCw size={14} className={isGenerating ? 'spinning' : ''} />
                            {isGenerating ? '生成中' : '重生成'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 列表视图 */}
            {viewMode === 'list' && (
              <div className="storyboard-list-view">
                {storyboards.map((storyboard) => {
                  const isGenerating = generatingIds.includes(storyboard.id);
                  return (
                    <div
                      key={storyboard.id}
                      className={`list-item ${
                        selectedStoryboardIds.includes(storyboard.id) ? 'selected' : ''
                      } ${isGenerating ? 'generating' : ''}`}
                      onClick={(e) => handleStoryboardClick(storyboard.id, e)}
                    >
                      <div className="list-item-icon">
                        {storyboard.type === 'image' ? (
                          <Image className="h-4 w-4 inline mr-1" />
                        ) : (
                          <Clapperboard className="h-4 w-4 inline mr-1" />
                        )}
                      </div>
                      <div className="list-item-content">
                        <div className="list-item-header">
                          <h4 className="list-item-title">{storyboard.description}</h4>
                          <span className={`list-item-badge ${storyboard.type}`}>
                            {storyboard.type === 'image' ? '图片' : '视频'}
                          </span>
                        </div>
                        {editingPromptId === storyboard.id ? (
                          <div className="prompt-edit-container">
                            <textarea
                              className="prompt-edit-textarea"
                              value={editingPromptText}
                              onChange={(e) => setEditingPromptText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  handleSavePrompt();
                                }
                                if (e.key === 'Escape') {
                                  handleCancelEditPrompt();
                                }
                              }}
                              placeholder="输入生成提示词..."
                              rows={3}
                              autoFocus
                            />
                            <div className="prompt-edit-actions">
                              <button
                                className="icon-btn save-btn"
                                onClick={handleSavePrompt}
                                title="保存 (Ctrl+Enter)"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="icon-btn cancel-btn"
                                onClick={handleCancelEditPrompt}
                                title="取消 (Esc)"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="prompt-display-container">
                            {storyboard.prompt && (
                              <p className="list-item-prompt">{storyboard.prompt}</p>
                            )}
                            {!storyboard.prompt && (
                              <p className="list-item-prompt placeholder">暂无Prompt</p>
                            )}
                          </div>
                        )}
                        <div className="list-item-meta">
                          <span
                            className={`status-badge ${
                              isGenerating ? 'generating' : storyboard.status
                            }`}
                          >
                            {isGenerating
                              ? '⏳ 生成中...'
                              : storyboard.status === 'completed'
                              ? '✓ 已完成'
                              : storyboard.status === 'failed'
                              ? '✗ 失败'
                              : '⏸ 待生成'}
                          </span>
                        </div>
                      </div>
                      <div
                        className="list-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingPromptId !== storyboard.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditPrompt(storyboard)}
                            disabled={isGenerating}
                            title="编辑Prompt"
                          >
                            <Edit2 size={14} />
                            编辑
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRegenerate(storyboard.id)}
                          disabled={isGenerating || editingPromptId === storyboard.id}
                        >
                          <RefreshCw size={14} className={isGenerating ? 'spinning' : ''} />
                          {isGenerating ? '生成中' : '重生成'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

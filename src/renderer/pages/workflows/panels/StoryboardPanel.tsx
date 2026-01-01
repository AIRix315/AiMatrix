/**
 * StoryboardPanel - 分镜脚本生成面板
 *
 * 功能：为场景生成分镜脚本和图片/视频
 * H2.7: 完整业务逻辑实现（双视图、重生成、Prompt编辑）
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Edit2, Check, X, Clapperboard, Image } from 'lucide-react';
import { Button, Card, Loading, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import { StoryboardListItem } from '../../../components/workflow/StoryboardListItem';
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
  onComplete: (data: unknown) => void;
  initialData?: unknown;
  onStoryboardSelectionChange?: (selectedIds: string[]) => void;
  // ========== 新增Props（从WorkflowExecutor传递） ==========
  /** 视图模式（由父组件控制） */
  viewMode?: 'grid' | 'list';
  /** 视图模式切换回调（由父组件控制） */
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const StoryboardPanel: React.FC<PanelProps> = ({
  workflowId: _workflowId, // 待后端 API 集成时使用
  onComplete,
  initialData,
  onStoryboardSelectionChange,
  viewMode: externalViewMode, // 外部控制
  onViewModeChange: externalOnViewModeChange // 外部控制
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scenes] = useState((initialData as any)?.scenes || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [storyboards, setStoryboards] = useState<Storyboard[]>((initialData as any)?.storyboards || []);
  const [loading, setLoading] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 视图模式状态（使用外部传入或回退到本地状态，向后兼容）
  const [internalViewMode, _setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const viewMode = externalViewMode ?? internalViewMode;
  // const setViewMode = externalOnViewModeChange ?? _setInternalViewMode; // 暂时未使用

  // 选中状态（支持多选）
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<string[]>([]);

  // 正在生成的分镜ID列表
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);

  // Prompt编辑状态
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState('');

  // 批量生成状态
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [batchResult, setBatchResult] = useState<{
    successCount: number;
    failedCount: number;
    failedIds: string[];
  } | null>(null);

  // ========== 移除localStorage持久化（由WorkflowExecutor统一管理） ==========
  // 如果使用外部viewMode，则不需要本地持久化
  useEffect(() => {
    if (externalViewMode) return; // 外部控制时跳过

    const savedMode = localStorage.getItem('storyboard-view-mode');
    if (savedMode === 'grid' || savedMode === 'list') {
      _setInternalViewMode(savedMode);
    }
  }, [externalViewMode]);

  useEffect(() => {
    if (externalViewMode) return; // 外部控制时跳过

    localStorage.setItem('storyboard-view-mode', internalViewMode);
  }, [internalViewMode, externalViewMode]);

  // 快捷键支持 (Ctrl+Shift+G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        const newMode = viewMode === 'grid' ? 'list' : 'grid';
        if (externalOnViewModeChange) {
          externalOnViewModeChange(newMode);
        } else {
          _setInternalViewMode(newMode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, externalOnViewModeChange]);

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
   * 注意：批量生成功能将在 K08-K10 任务中实现
   * 当前版本仅生成第一个场景的分镜
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
      // 当前仅生成第一个场景（完整的批量处理将在 K08-K10 实现）
      const firstScene = scenes[0];
      const storyboardId = `storyboard-${firstScene.id}-${Date.now()}`;

      // 创建初始分镜对象
      const newStoryboard: Storyboard = {
        id: storyboardId,
        sceneId: firstScene.id,
        type: generationType,
        description: `${firstScene.name}的分镜脚本`,
        prompt: `${firstScene.description}，${generationType === 'image' ? '图片' : '视频'}风格`,
        status: 'generating'
      };

      // 添加到列表
      setStoryboards([...storyboards, newStoryboard]);

      // 调用 Provider API 生成
      if (generationType === 'image') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await window.electronAPI.executeTextToImage({
          prompt: newStoryboard.prompt!,
          width: 1280,
          height: 720
        }) as any;

        if (!result.success) {
          throw new Error(result.error || '生成失败');
        }

        // 更新分镜
        setStoryboards((prev) =>
          prev.map((s) =>
            s.id === storyboardId
              ? {
                  ...s,
                  status: 'completed',
                  imagePath: result.imageFilePath || result.imageUrl
                }
              : s
          )
        );

        setToast({
          type: 'success',
          message: '分镜生成成功！（批量生成功能即将在下个版本推出）'
        });
      } else {
        setToast({
          type: 'warning',
          message: '视频生成需要先生成图片。请先切换到"图片"模式生成分镜图片，然后再使用"重新生成"切换到视频。'
        });

        // 移除刚添加的分镜
        setStoryboards((prev) => prev.filter((s) => s.id !== storyboardId));
      }
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

    // 更新为生成中状态
    setStoryboards((prev) =>
      prev.map((s) => (s.id === storyboardId ? { ...s, status: 'generating' } : s))
    );

    try {
      // 调用真实的 Provider API
      if (storyboard.type === 'image') {
        // 文生图
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await window.electronAPI.executeTextToImage({
          prompt: storyboard.prompt || storyboard.description,
          width: 1280,
          height: 720
        }) as any;

        if (!result.success) {
          throw new Error(result.error || '生成失败');
        }

        // 更新分镜数据
        setStoryboards((prev) =>
          prev.map((s) =>
            s.id === storyboardId
              ? {
                  ...s,
                  status: 'completed',
                  imagePath: result.imageFilePath || result.imageUrl,
                  prompt: storyboard.prompt || storyboard.description
                }
              : s
          )
        );

        setToast({
          type: 'success',
          message: '分镜图片生成成功！'
        });
      } else {
        // 图生视频（需要先有图片）
        if (!storyboard.imagePath) {
          throw new Error('需要先生成图片才能生成视频');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await window.electronAPI.executeImageToVideo({
          imageInput: storyboard.imagePath,
          prompt: storyboard.prompt || storyboard.description
        }) as any;

        if (!result.success) {
          throw new Error(result.error || '生成失败');
        }

        // 更新分镜数据
        setStoryboards((prev) =>
          prev.map((s) =>
            s.id === storyboardId
              ? {
                  ...s,
                  status: 'completed',
                  videoPath: result.videoFilePath || result.videoUrl,
                  prompt: storyboard.prompt || storyboard.description
                }
              : s
          )
        );

        setToast({
          type: 'success',
          message: '分镜视频生成成功！'
        });
      }
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
   * 批量生成选中的分镜
   */
  const handleBatchGenerate = async () => {
    if (selectedStoryboardIds.length === 0) {
      setToast({
        type: 'warning',
        message: '请先选择要生成的分镜'
      });
      return;
    }

    const selectedStoryboards = storyboards.filter((s) =>
      selectedStoryboardIds.includes(s.id)
    );

    setBatchGenerating(true);
    setBatchProgress({ completed: 0, total: selectedStoryboards.length });
    setBatchResult(null);

    // 将选中的分镜标记为生成中
    setStoryboards((prev) =>
      prev.map((s) =>
        selectedStoryboardIds.includes(s.id) ? { ...s, status: 'generating' } : s
      )
    );

    try {
      // 区分图片和视频批量处理
      const imageStoryboards = selectedStoryboards.filter((s) => s.type === 'image');
      const videoStoryboards = selectedStoryboards.filter((s) => s.type === 'video');

      let successCount = 0;
      let failedCount = 0;
      const failedIds: string[] = [];

      // 批量生成图片
      if (imageStoryboards.length > 0) {
        const batchParams = {
          items: imageStoryboards.map((s) => ({
            id: s.id,
            prompt: s.prompt || s.description,
            width: 1280,
            height: 720
          })),
          maxConcurrency: 3 // 并发数
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await window.electronAPI.batchTextToImage(batchParams) as any;

        // 处理成功的结果
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.success.forEach((item: any) => {
          if (item.result.success) {
            setStoryboards((prev) =>
              prev.map((s) =>
                s.id === item.id
                  ? {
                      ...s,
                      status: 'completed',
                      imagePath: item.result.imageFilePath || item.result.imageUrl
                    }
                  : s
              )
            );
            successCount++;
          } else {
            failedIds.push(item.id);
            failedCount++;
          }
          setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        });

        // 处理失败的结果
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.failed.forEach((failure: any) => {
          setStoryboards((prev) =>
            prev.map((s) => (s.id === failure.item.id ? { ...s, status: 'failed' } : s))
          );
          failedIds.push(failure.item.id);
          failedCount++;
          setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        });
      }

      // 批量生成视频
      if (videoStoryboards.length > 0) {
        const videoItems = videoStoryboards
          .filter((s) => s.imagePath) // 只处理有图片的
          .map((s) => ({
            id: s.id,
            imageInput: s.imagePath!,
            prompt: s.prompt || s.description
          }));

        if (videoItems.length > 0) {
          const batchParams = {
            items: videoItems,
            maxConcurrency: 2 // 视频生成并发数更低
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await window.electronAPI.batchImageToVideo(batchParams) as any;

          // 处理成功的结果
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.success.forEach((item: any) => {
            if (item.result.success) {
              setStoryboards((prev) =>
                prev.map((s) =>
                  s.id === item.id
                    ? {
                        ...s,
                        status: 'completed',
                        videoPath: item.result.videoFilePath || item.result.videoUrl
                      }
                    : s
                )
              );
              successCount++;
            } else {
              failedIds.push(item.id);
              failedCount++;
            }
            setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
          });

          // 处理失败的结果
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.failed.forEach((failure: any) => {
            setStoryboards((prev) =>
              prev.map((s) => (s.id === failure.item.id ? { ...s, status: 'failed' } : s))
            );
            failedIds.push(failure.item.id);
            failedCount++;
            setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
          });
        }

        // 标记没有图片的视频分镜为失败
        const noImageVideoStoryboards = videoStoryboards.filter((s) => !s.imagePath);
        noImageVideoStoryboards.forEach((s) => {
          setStoryboards((prev) =>
            prev.map((item) => (item.id === s.id ? { ...item, status: 'failed' } : item))
          );
          failedIds.push(s.id);
          failedCount++;
          setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        });
      }

      setBatchResult({
        successCount,
        failedCount,
        failedIds
      });

      setToast({
        type: successCount > 0 ? 'success' : 'error',
        message: `批量生成完成！成功: ${successCount}, 失败: ${failedCount}`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('批量生成失败:', error);
      setToast({
        type: 'error',
        message: `批量生成失败: ${error instanceof Error ? error.message : String(error)}`
      });

      // 将所有选中的分镜标记为失败
      setStoryboards((prev) =>
        prev.map((s) => (selectedStoryboardIds.includes(s.id) ? { ...s, status: 'failed' } : s))
      );
    } finally {
      setBatchGenerating(false);
    }
  };

  /**
   * 重试失败的批量任务
   */
  const handleRetryFailed = async () => {
    if (!batchResult || batchResult.failedIds.length === 0) return;

    // 选中失败的分镜
    setSelectedStoryboardIds(batchResult.failedIds);

    // 延迟一帧后执行批量生成，确保状态更新完成
    setTimeout(() => {
      handleBatchGenerate();
    }, 0);
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
  const _handleNext = () => {
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
        {/* ========== 移除header-right（ViewSwitcher和全屏按钮已移至WorkflowHeader） ========== */}
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
          <div className="generation-actions">
            <Button onClick={handleGenerate} disabled={loading || scenes.length === 0}>
              {loading ? '生成中...' : (
                <>
                  <Clapperboard className="h-4 w-4 mr-2 inline" />
                  生成分镜
                </>
              )}
            </Button>
            <Button
              onClick={handleBatchGenerate}
              disabled={
                batchGenerating ||
                selectedStoryboardIds.length === 0 ||
                loading
              }
              variant="secondary"
            >
              {batchGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 inline spinning" />
                  批量生成中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 inline" />
                  批量生成 ({selectedStoryboardIds.length})
                </>
              )}
            </Button>
          </div>
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
          <div className="stat-item">
            <span className="stat-label">已选中:</span>
            <span className="stat-value">{selectedStoryboardIds.length}</span>
          </div>
        </div>

        {/* 批量进度显示 */}
        {batchGenerating && (
          <div className="batch-progress-section">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: `${(batchProgress.completed / batchProgress.total) * 100}%`
                }}
              />
            </div>
            <p className="progress-text">
              批量生成进度: {batchProgress.completed} / {batchProgress.total}
            </p>
          </div>
        )}

        {/* 批量结果显示 */}
        {batchResult && batchResult.failedCount > 0 && (
          <div className="batch-result-section">
            <div className="result-info">
              <span className="result-success">成功: {batchResult.successCount}</span>
              <span className="result-failed">失败: {batchResult.failedCount}</span>
            </div>
            <Button
              onClick={handleRetryFailed}
              size="sm"
              variant="secondary"
              disabled={batchGenerating}
            >
              <RefreshCw className="h-3 w-3 mr-1 inline" />
              重试失败项 ({batchResult.failedCount})
            </Button>
          </div>
        )}

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
                      onClick={(e: React.MouseEvent) => handleStoryboardClick(storyboard.id, e)}
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
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                  const actualStatus = isGenerating ? 'generating' : storyboard.status;
                  return (
                    <StoryboardListItem
                      key={storyboard.id}
                      id={storyboard.id}
                      description={storyboard.description}
                      type={storyboard.type}
                      status={actualStatus as any}
                      imagePath={storyboard.imagePath}
                      videoPath={storyboard.videoPath}
                      onRegenerate={() => handleRegenerate(storyboard.id)}
                      onClick={(e: React.MouseEvent) => handleStoryboardClick(storyboard.id, e)}
                    />
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

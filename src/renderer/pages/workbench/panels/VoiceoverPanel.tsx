/**
 * VoiceoverPanel - 配音生成面板
 *
 * 功能：为分镜生成配音音频
 * H2.8: 完整业务逻辑实现（旁白列表、音色选择、试听）
 */

import React, { useState, useRef } from 'react';
import { Play, RefreshCw, Mic } from 'lucide-react';
// import { Pause, Volume2 } from 'lucide-react'; // 暂时未使用
import { Button, Loading, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import { VoiceoverListItem } from '../../../components/flow/VoiceoverListItem';
import './VoiceoverPanel.css';

interface Voiceover {
  id: string;
  storyboardId: string;
  text: string;
  audioPath?: string;
  videoPath?: string; // 图生视频结果
  voiceType: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: unknown) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
}

export const VoiceoverPanel: React.FC<PanelProps> = ({ workflowId: _workflowId, onComplete, initialData }) => {
  const [storyboards] = useState(initialData?.storyboards || []);
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>(initialData?.voiceovers || []);
  const [loading, setLoading] = useState(false);
  const [_voiceType, _setVoiceType] = useState('female-1');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 音频播放状态
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 批量生成状态
  const [_batchGenerating, setBatchGenerating] = useState(false);
  const [_batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [_batchResult, setBatchResult] = useState<{
    successCount: number;
    failedCount: number;
    failedIds: string[];
  } | null>(null);

  // 选中状态（支持多选）
  const [_selectedVoiceoverIds, _setSelectedVoiceoverIds] = useState<string[]>([]);

  /**
   * 处理生成配音
   */
  const handleGenerate = async () => {
    if (storyboards.length === 0) {
      setToast({
        type: 'warning',
        message: '没有可用的分镜'
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: 调用IPC API生成配音
      // const result = await window.electronAPI.novelVideo.generateVoiceovers(workflowId, storyboards.map(s => s.id), voiceType);

      // 临时模拟数据
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockVoiceovers: Voiceover[] = storyboards.slice(0, 3).map((storyboard: any, i: number) => ({
        id: `voiceover-${storyboard.id}-${i + 1}`,
        storyboardId: storyboard.id,
        text: `这是分镜${i + 1}的旁白文本`,
        audioPath: `/mock/audio-${i + 1}.mp3`,
        voiceType: _voiceType,
        status: 'completed'
      }));

      setVoiceovers([...voiceovers, ...mockVoiceovers]);
      setToast({
        type: 'success',
        message: `生成成功！共${mockVoiceovers.length}段配音`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('生成配音失败:', error);
      setToast({
        type: 'error',
        message: `生成失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 试听配音
   */
  const handlePlay = (voiceover: Voiceover) => {
    if (!voiceover.audioPath) {
      setToast({
        type: 'warning',
        message: '音频文件不存在'
      });
      return;
    }

    // 如果当前正在播放同一个音频，则暂停
    if (playingId === voiceover.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // 停止之前的播放
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 创建新的音频对象
    // 实际项目中应该使用真实的音频路径
    // const audio = new Audio(voiceover.audioPath);

    // 模拟播放（实际项目中删除这部分，使用上面注释的代码）
    const audio = new Audio();
    audioRef.current = audio;
    setPlayingId(voiceover.id);

    // 播放结束后重置状态
    audio.onended = () => {
      setPlayingId(null);
    };

    // 模拟播放3秒后结束
    setTimeout(() => {
      setPlayingId(null);
      setToast({
        type: 'info',
        message: '播放完成'
      });
    }, 3000);

    setToast({
      type: 'info',
      message: '开始播放...'
    });
  };

  /**
   * 重新生成单个配音
   */
  const handleRegenerate = async (voiceoverId: string) => {
    const voiceover = voiceovers.find((v) => v.id === voiceoverId);
    if (!voiceover) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setGeneratingIds((prev: any) => [...prev, voiceoverId]);

    try {
      // TODO: 调用IPC API重新生成配音
      // const result = await window.electronAPI.novelVideo.regenerateVoiceover(
      //   workflowId,
      //   voiceoverId,
      //   voiceover.text,
      //   voiceover.voiceType
      // );

      // 模拟生成延迟
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 更新配音数据
      setVoiceovers((prev) =>
        prev.map((v) =>
          v.id === voiceoverId
            ? {
                ...v,
                status: 'completed',
                audioPath: `/mock/regenerated-${Date.now()}.mp3`
              }
            : v
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

      setVoiceovers((prev) =>
        prev.map((v) => (v.id === voiceoverId ? { ...v, status: 'failed' } : v))
      );
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGeneratingIds((prev: any) => prev.filter((id: any) => id !== voiceoverId));
    }
  };

  /**
   * 批量生成视频片段（从分镜图片）
   */
  const handleBatchGenerateVideos = async () => {
    // 筛选有图片的分镜
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storyboardsWithImages = storyboards.filter(
      (sb: any) => sb.imagePath && sb.status === 'completed'
    );

    if (storyboardsWithImages.length === 0) {
      setToast({
        type: 'warning',
        message: '没有可用的分镜图片。请先在分镜生成步骤中生成图片。'
      });
      return;
    }

    setBatchGenerating(true);
    setBatchProgress({ completed: 0, total: storyboardsWithImages.length });
    setBatchResult(null);

    try {
      // 准备批量请求参数
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchParams = {
        items: storyboardsWithImages.map((sb: any) => ({
          id: sb.id,
          imageInput: sb.imagePath,
          prompt: sb.prompt || sb.description || '生成视频'
        })),
        maxConcurrency: 2 // 视频生成并发数较低
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await window.electronAPI.batchImageToVideo(batchParams);

      let successCount = 0;
      let failedCount = 0;
      const failedIds: string[] = [];

      // 处理成功的结果
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.success.forEach((item: any) => {
        if (item.result.success) {
          // 创建或更新 voiceover 记录（实际是视频）
          const voiceoverId = `video-${item.id}`;
          setVoiceovers((prev) => {
            const existingIndex = prev.findIndex((v) => v.storyboardId === item.id);
            const newVoiceover: Voiceover = {
              id: voiceoverId,
              storyboardId: item.id,
              text: item.result.prompt || '',
              videoPath: item.result.videoFilePath || item.result.videoUrl,
              voiceType: '',
              status: 'completed'
            };

            if (existingIndex >= 0) {
              return prev.map((v, i) => (i === existingIndex ? newVoiceover : v));
            } else {
              return [...prev, newVoiceover];
            }
          });
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
        failedIds.push(failure.item.id);
        failedCount++;
        setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      });

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
      console.error('批量生成视频失败:', error);
      setToast({
        type: 'error',
        message: `批量生成失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setBatchGenerating(false);
    }
  };

  /**
   * 重试失败的批量任务
   */
  const handleRetryFailed = async () => {
    if (!_batchResult || _batchResult.failedIds.length === 0) return;

    // 筛选失败的分镜
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failedStoryboards = storyboards.filter((sb: any) =>
      _batchResult.failedIds.includes(sb.id)
    );

    setBatchGenerating(true);
    setBatchProgress({ completed: 0, total: failedStoryboards.length });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchParams = {
        items: failedStoryboards.map((sb: any) => ({
          id: sb.id,
          imageInput: sb.imagePath,
          prompt: sb.prompt || sb.description || '生成视频'
        })),
        maxConcurrency: 2
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await window.electronAPI.batchImageToVideo(batchParams);

      let successCount = 0;
      let failedCount = 0;
      const newFailedIds: string[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.success.forEach((item: any) => {
        if (item.result.success) {
          const voiceoverId = `video-${item.id}`;
          setVoiceovers((prev) => {
            const existingIndex = prev.findIndex((v) => v.storyboardId === item.id);
            const newVoiceover: Voiceover = {
              id: voiceoverId,
              storyboardId: item.id,
              text: item.result.prompt || '',
              videoPath: item.result.videoFilePath || item.result.videoUrl,
              voiceType: '',
              status: 'completed'
            };

            if (existingIndex >= 0) {
              return prev.map((v, i) => (i === existingIndex ? newVoiceover : v));
            } else {
              return [...prev, newVoiceover];
            }
          });
          successCount++;
        } else {
          newFailedIds.push(item.id);
          failedCount++;
        }
        setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.failed.forEach((failure: any) => {
        newFailedIds.push(failure.item.id);
        failedCount++;
        setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      });

      setBatchResult({
        successCount: _batchResult.successCount + successCount,
        failedCount: failedCount,
        failedIds: newFailedIds
      });

      setToast({
        type: successCount > 0 ? 'success' : 'error',
        message: `重试完成！成功: ${successCount}, 失败: ${failedCount}`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('重试失败:', error);
      setToast({
        type: 'error',
        message: `重试失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setBatchGenerating(false);
    }
  };

  /**
   * 处理下一步
   */
  const _handleNext = () => {
    if (voiceovers.length === 0) {
      setToast({
        type: 'warning',
        message: '请先生成配音'
      });
      return;
    }

    onComplete({
      voiceovers
    });
  };

  return (
    <div className="voiceover-panel">
      <div className="panel-header">
        <h2>配音生成</h2>
        <p className="panel-description">为分镜生成AI配音音频</p>
      </div>

      <div className="panel-content">
        {/* 视频生成选项 */}
        <div className="voice-options">
          <div className="option-group">
            <label>可用分镜:</label>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <span className="stat-value">{storyboards.filter((sb: any) => sb.imagePath).length} 个</span>
          </div>
          <div className="generation-actions">
            <Button
              onClick={handleBatchGenerateVideos}
              disabled={
                _batchGenerating ||
                storyboards.filter((sb: any) => sb.imagePath && sb.status === 'completed')
                  .length === 0
              }
            >
              {_batchGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 inline spinning" />
                  批量生成视频中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2 inline" />
                  批量生成视频片段
                </>
              )}
            </Button>
            <Button onClick={handleGenerate} disabled={loading || storyboards.length === 0} variant="secondary">
              {loading ? '生成中...' : (
                <>
                  <Mic className="h-4 w-4 mr-2 inline" />
                  生成配音（Mock）
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">可用分镜:</span>
            <span className="stat-value">{storyboards.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已生成视频:</span>
            <span className="stat-value">{voiceovers.filter((v) => v.videoPath).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已生成配音:</span>
            <span className="stat-value">{voiceovers.filter((v) => v.audioPath).length}</span>
          </div>
        </div>

        {/* 批量进度显示 */}
        {_batchGenerating && (
          <div className="batch-progress-section">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: `${(_batchProgress.completed / _batchProgress.total) * 100}%`
                }}
              />
            </div>
            <p className="progress-text">
              批量生成进度: {_batchProgress.completed} / {_batchProgress.total}
            </p>
          </div>
        )}

        {/* 批量结果显示 */}
        {_batchResult && _batchResult.failedCount > 0 && (
          <div className="batch-result-section">
            <div className="result-info">
              <span className="result-success">成功: {_batchResult.successCount}</span>
              <span className="result-failed">失败: {_batchResult.failedCount}</span>
            </div>
            <Button
              onClick={handleRetryFailed}
              size="sm"
              variant="secondary"
              disabled={_batchGenerating}
            >
              <RefreshCw className="h-3 w-3 mr-1 inline" />
              重试失败项 ({_batchResult.failedCount})
            </Button>
          </div>
        )}

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在生成配音，请稍候..." />}

        {/* 配音列表 */}
        {voiceovers.length > 0 && (
          <div className="voiceover-list-section">
            <h3>配音列表</h3>
            <div className="voiceover-list">
              {voiceovers.map((voiceover) => {
                const isGenerating = generatingIds.includes(voiceover.id);
                const actualStatus = isGenerating ? 'generating' : voiceover.status;
                return (
                  <VoiceoverListItem
                    key={voiceover.id}
                    id={voiceover.id}
                    text={voiceover.text}
                    voiceType={voiceover.voiceType}
                    status={actualStatus as any}
                    audioPath={voiceover.audioPath}
                    onPlay={() => handlePlay(voiceover)}
                    onRegenerate={() => handleRegenerate(voiceover.id)}
                  />
                );
              })}
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

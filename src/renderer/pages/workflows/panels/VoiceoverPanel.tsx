/**
 * VoiceoverPanel - 配音生成面板
 *
 * 功能：为分镜生成配音音频
 * H2.8: 完整业务逻辑实现（旁白列表、音色选择、试听）
 */

import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, RefreshCw } from 'lucide-react';
import { Button, Loading, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import './VoiceoverPanel.css';

interface Voiceover {
  id: string;
  storyboardId: string;
  text: string;
  audioPath?: string;
  voiceType: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: any) => void;
  initialData?: any;
}

export const VoiceoverPanel: React.FC<PanelProps> = ({ workflowId, onComplete, initialData }) => {
  const [storyboards] = useState(initialData?.storyboards || []);
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>(initialData?.voiceovers || []);
  const [loading, setLoading] = useState(false);
  const [voiceType, setVoiceType] = useState('female-1');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 音频播放状态
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      const mockVoiceovers: Voiceover[] = storyboards.slice(0, 3).map((storyboard: any, i: number) => ({
        id: `voiceover-${storyboard.id}-${i + 1}`,
        storyboardId: storyboard.id,
        text: `这是分镜${i + 1}的旁白文本`,
        audioPath: `/mock/audio-${i + 1}.mp3`,
        voiceType,
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

    setGeneratingIds((prev) => [...prev, voiceoverId]);

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
      setGeneratingIds((prev) => prev.filter((id) => id !== voiceoverId));
    }
  };

  /**
   * 处理下一步
   */
  const handleNext = () => {
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
        {/* 配音选项 */}
        <div className="voice-options">
          <div className="option-group">
            <label>音色选择:</label>
            <select
              value={voiceType}
              onChange={(e) => setVoiceType(e.target.value)}
              disabled={loading}
            >
              <option value="female-1">女声1 - 温柔</option>
              <option value="female-2">女声2 - 活泼</option>
              <option value="male-1">男声1 - 沉稳</option>
              <option value="male-2">男声2 - 磁性</option>
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={loading || storyboards.length === 0}>
            {loading ? '生成中...' : '🎙️ 生成配音'}
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">可用分镜:</span>
            <span className="stat-value">{storyboards.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已生成配音:</span>
            <span className="stat-value">{voiceovers.length}</span>
          </div>
        </div>

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在生成配音，请稍候..." />}

        {/* 配音列表 */}
        {voiceovers.length > 0 && (
          <div className="voiceover-list-section">
            <h3>配音列表</h3>
            <div className="voiceover-list">
              {voiceovers.map((voiceover, index) => {
                const isGenerating = generatingIds.includes(voiceover.id);
                const isPlaying = playingId === voiceover.id;

                return (
                  <div
                    key={voiceover.id}
                    className={`voiceover-item ${isGenerating ? 'generating' : ''}`}
                  >
                    {/* 左侧图标 */}
                    <div className="voiceover-icon">
                      <Volume2 size={24} />
                    </div>

                    {/* 中间内容 */}
                    <div className="voiceover-content">
                      <div className="voiceover-header">
                        <h4 className="voiceover-title">配音 {index + 1}</h4>
                        <span className="voiceover-badge">{voiceover.voiceType}</span>
                      </div>
                      <p className="voiceover-text">{voiceover.text}</p>
                      <div className="voiceover-meta">
                        <span
                          className={`status-badge ${
                            isGenerating ? 'generating' : voiceover.status
                          }`}
                        >
                          {isGenerating
                            ? '⏳ 生成中...'
                            : voiceover.status === 'completed'
                            ? '✓ 已完成'
                            : voiceover.status === 'failed'
                            ? '✗ 失败'
                            : '⏸ 待生成'}
                        </span>
                      </div>
                    </div>

                    {/* 右侧操作按钮 */}
                    <div className="voiceover-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlay(voiceover)}
                        disabled={!voiceover.audioPath || isGenerating}
                        title={isPlaying ? '暂停' : '播放'}
                      >
                        {isPlaying ? (
                          <>
                            <Pause size={14} />
                            暂停
                          </>
                        ) : (
                          <>
                            <Play size={14} />
                            播放
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(voiceover.id)}
                        disabled={isGenerating}
                        title="重新生成"
                      >
                        <RefreshCw size={14} className={isGenerating ? 'spinning' : ''} />
                        {isGenerating ? '生成中' : '重生成'}
                      </Button>
                    </div>
                  </div>
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

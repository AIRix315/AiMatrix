/**
 * VoiceoverPanel - 配音生成面板
 *
 * 功能：为分镜生成配音音频
 */

import React, { useState } from 'react';
import { Button, Card, Loading, Toast } from '../../../components/common';
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
              {voiceovers.map((voiceover) => (
                <Card
                  key={voiceover.id}
                  tag={voiceover.voiceType}
                  title={`配音 ${voiceovers.indexOf(voiceover) + 1}`}
                  info={voiceover.text}
                  image="🎙️"
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
          disabled={voiceovers.length === 0}
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

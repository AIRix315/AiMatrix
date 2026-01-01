/**
 * VoiceoverListItem - 配音列表项组件
 */

import React from 'react';
import { Mic, Play, RefreshCw, Trash2 } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import './VoiceoverListItem.css';

interface VoiceoverListItemProps {
  id: string;
  text: string;
  voiceType: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  audioPath?: string;
  duration?: number;
  onPlay?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const statusText = {
  pending: '等待中',
  generating: '生成中',
  completed: '已完成',
  failed: '失败'
};

export const VoiceoverListItem: React.FC<VoiceoverListItemProps> = ({
  id: _id,
  text,
  voiceType,
  status,
  audioPath: _audioPath,
  duration,
  onPlay,
  onRegenerate,
  onDelete,
  onClick
}) => {
  return (
    <div className={`voiceover-list-item status-${status}`} onClick={onClick}>
      <div className="preview-icon">
        <Mic size={24} />
      </div>

      <div className="auxiliary-info">
        <div className="voice-badge">{voiceType}</div>
      </div>

      <div className="content">
        <div className="title">{text}</div>
        <div className="description">{statusText[status]}</div>
      </div>

      <div className="right-section">
        <div className="info">
          {duration ? formatDuration(duration) : statusText[status]}
        </div>

        <div className="action-buttons">
          {onPlay && status === 'completed' && (
            <button className="play-btn" onClick={(e) => { e.stopPropagation(); onPlay(); }} title="播放">
              <Play size={16} />
            </button>
          )}
          {onRegenerate && status !== 'generating' && (
            <button className="regenerate-btn" onClick={(e) => { e.stopPropagation(); onRegenerate(); }} title="重新生成">
              <RefreshCw size={16} />
            </button>
          )}
          {onDelete && (
            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除配音">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceoverListItem;

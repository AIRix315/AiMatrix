/**
 * 资产预览 Modal 组件
 *
 * 功能：
 * - 支持多种文件类型预览（图片、视频、音频、文本）
 * - 显示资产元数据信息
 * - 键盘导航（左右箭头切换，ESC关闭）
 * - 编辑元数据功能
 * - 响应式设计
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AssetMetadata, AssetType } from '@/shared/types';
import './AssetPreview.css';

interface AssetPreviewProps {
  asset: AssetMetadata;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onUpdate?: (updates: Partial<AssetMetadata>) => void;
}

export function AssetPreview({
  asset,
  isOpen,
  onClose,
  onNext,
  onPrev,
  onUpdate
}: AssetPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTags, setEditedTags] = useState<string[]>(asset.tags || []);
  const [editedDescription, setEditedDescription] = useState(asset.description || '');
  const [imageError, setImageError] = useState(false);

  // 同步外部asset变化
  useEffect(() => {
    setEditedTags(asset.tags || []);
    setEditedDescription(asset.description || '');
    setImageError(false);
  }, [asset]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev?.();
          break;
        case 'ArrowRight':
          onNext?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  // 保存编辑
  const handleSave = useCallback(() => {
    onUpdate?.({
      tags: editedTags,
      description: editedDescription
    });
    setIsEditing(false);
  }, [editedTags, editedDescription, onUpdate]);

  // 取消编辑
  const handleCancel = useCallback(() => {
    setEditedTags(asset.tags || []);
    setEditedDescription(asset.description || '');
    setIsEditing(false);
  }, [asset]);

  // 添加标签
  const handleAddTag = useCallback((tag: string) => {
    if (tag && !editedTags.includes(tag)) {
      setEditedTags([...editedTags, tag]);
    }
  }, [editedTags]);

  // 删除标签
  const handleRemoveTag = useCallback((index: number) => {
    setEditedTags(editedTags.filter((_, i) => i !== index));
  }, [editedTags]);

  // 获取本地文件URL
  const getLocalFileUrl = (filePath: string): string => {
    // 使用 asset:// 协议安全访问本地文件
    return `asset://${filePath.replace(/\\/g, '/')}`;
  };

  // 渲染预览内容
  const renderPreview = () => {
    const fileUrl = getLocalFileUrl(asset.filePath);

    switch (asset.type) {
      case 'image':
        return (
          <div className="preview-image-container">
            {!imageError ? (
              <img
                src={fileUrl}
                alt={asset.name}
                className="preview-image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="preview-error">
                <span className="error-icon">⚠️</span>
                <p>图片加载失败</p>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="preview-video-container">
            <video
              src={fileUrl}
              controls
              className="preview-video"
              onError={() => setImageError(true)}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="preview-audio-container">
            <div className="audio-icon">🎵</div>
            <audio
              src={fileUrl}
              controls
              className="preview-audio"
              onError={() => setImageError(true)}
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        );

      case 'text':
        return (
          <div className="preview-text-container">
            <pre className="preview-text">{asset.description || '无文本内容'}</pre>
          </div>
        );

      default:
        return (
          <div className="preview-unsupported">
            <span className="file-icon">📄</span>
            <p>不支持预览此文件类型</p>
            <p className="file-path">{asset.filePath}</p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="asset-preview-overlay" onClick={onClose}>
      <div className="asset-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button className="close-button" onClick={onClose} title="关闭 (ESC)">
          ×
        </button>

        {/* 导航按钮 */}
        {onPrev && (
          <button className="nav-button nav-prev" onClick={onPrev} title="上一个 (←)">
            ←
          </button>
        )}
        {onNext && (
          <button className="nav-button nav-next" onClick={onNext} title="下一个 (→)">
            →
          </button>
        )}

        <div className="preview-content">
          {/* 左侧预览区 */}
          <div className="preview-area">
            {renderPreview()}
          </div>

          {/* 右侧信息面板 */}
          <div className="info-panel">
            {/* 资产名称 */}
            <div className="info-header">
              <h3 className="asset-title" title={asset.name}>{asset.name}</h3>
              {!isEditing ? (
                <button className="edit-button" onClick={() => setIsEditing(true)}>
                  ✏️ 编辑
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="save-button" onClick={handleSave}>
                    ✓ 保存
                  </button>
                  <button className="cancel-button" onClick={handleCancel}>
                    × 取消
                  </button>
                </div>
              )}
            </div>

            {/* 元数据 */}
            <div className="metadata-section">
              <h4>基本信息</h4>
              <div className="metadata-item">
                <span className="label">类型:</span>
                <span className="value">{getTypeText(asset.type)}</span>
              </div>
              {asset.category && (
                <div className="metadata-item">
                  <span className="label">分类:</span>
                  <span className="value">{asset.category}</span>
                </div>
              )}
              <div className="metadata-item">
                <span className="label">大小:</span>
                <span className="value">{formatFileSize(asset.size)}</span>
              </div>
              {asset.width && asset.height && (
                <div className="metadata-item">
                  <span className="label">尺寸:</span>
                  <span className="value">{asset.width} × {asset.height}</span>
                </div>
              )}
              {asset.duration && (
                <div className="metadata-item">
                  <span className="label">时长:</span>
                  <span className="value">{formatDuration(asset.duration)}</span>
                </div>
              )}
              <div className="metadata-item">
                <span className="label">创建:</span>
                <span className="value">{formatDate(asset.createdAt)}</span>
              </div>
              <div className="metadata-item">
                <span className="label">修改:</span>
                <span className="value">{formatDate(asset.modifiedAt)}</span>
              </div>
            </div>

            {/* 标签 */}
            <div className="tags-section">
              <h4>标签</h4>
              <div className="tags-list">
                {editedTags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    {isEditing && (
                      <button
                        className="tag-remove"
                        onClick={() => handleRemoveTag(index)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <input
                    type="text"
                    placeholder="添加标签..."
                    className="tag-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* 描述 */}
            <div className="description-section">
              <h4>描述</h4>
              {!isEditing ? (
                <p className="description-text">
                  {asset.description || '暂无描述'}
                </p>
              ) : (
                <textarea
                  className="description-input"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="输入描述..."
                  rows={4}
                />
              )}
            </div>

            {/* AI生成信息 */}
            {asset.prompt && (
              <div className="ai-section">
                <h4>✨ AI生成信息</h4>
                <p className="prompt-text">{asset.prompt}</p>
                {asset.status && (
                  <div className="status-badge">
                    状态: {getStatusText(asset.status)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 辅助函数
function getTypeText(type: AssetType): string {
  const textMap: Record<AssetType, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
    text: '文本',
    other: '其他'
  };
  return textMap[type] || type;
}

function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    none: '无',
    generating: '生成中',
    success: '完成',
    failed: '失败'
  };
  return textMap[status] || status;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

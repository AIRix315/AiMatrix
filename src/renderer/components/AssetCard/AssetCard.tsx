/**
 * 资产卡片组件
 *
 * 功能：
 * - 支持4种宽高比：3:4, 4:3, 16:9, 9:16
 * - 显示缩略图或文件类型图标
 * - 显示资产名称、类型标签、状态徽章
 * - AI生成资产的元数据指示器
 * - 悬停效果和选中状态
 * - 单击选中，双击预览
 * - 删除操作支持
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

import React, { useState } from 'react';
import { Image, Video, AudioWaveform, FileText, Package, Sparkles, Folder } from 'lucide-react';
import { AssetMetadata, AssetType, ResourceStatus } from '@/shared/types';
import './AssetCard.css';

interface AssetCardProps {
  asset: AssetMetadata;
  selected?: boolean;
  onSelect?: (asset: AssetMetadata) => void;
  onPreview?: (asset: AssetMetadata) => void;
  onDelete?: (asset: AssetMetadata) => void;
}

export function AssetCard({
  asset,
  selected = false,
  onSelect,
  onPreview,
  onDelete
}: AssetCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    onSelect?.(asset);
  };

  const handleDoubleClick = () => {
    onPreview?.(asset);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除 "${asset.name}" 吗？`)) {
      onDelete?.(asset);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // 获取宽高比的CSS类名
  const getAspectRatioClass = (): string => {
    if (!asset.aspectRatio) return 'ratio-16-9'; // 默认16:9
    switch (asset.aspectRatio) {
      case '3:4':
        return 'ratio-3-4';
      case '4:3':
        return 'ratio-4-3';
      case '16:9':
        return 'ratio-16-9';
      case '9:16':
        return 'ratio-9-16';
      case 'custom':
        return 'ratio-custom';
      default:
        return 'ratio-16-9';
    }
  };

  // 根据文件路径获取本地文件URL
  const getLocalFileUrl = (filePath: string): string => {
    // 使用 asset:// 协议安全访问本地文件
    // 协议处理器会验证路径安全性
    return `asset://${filePath.replace(/\\/g, '/')}`;
  };

  // 是否显示缩略图
  const showThumbnail = asset.thumbnailPath && !imageError;

  return (
    <div
      className={`asset-card ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 缩略图容器 */}
      <div className={`card-thumbnail ${getAspectRatioClass()}`}>
        {showThumbnail ? (
          <img
            src={getLocalFileUrl(asset.thumbnailPath!)}
            alt={asset.name}
            className="thumbnail-image"
            onError={handleImageError}
          />
        ) : (
          <div className="thumbnail-placeholder">
            {getFileTypeIconComponent(asset.type)}
          </div>
        )}

        {/* 状态徽章 */}
        {asset.status && asset.status !== 'none' && (
          <div className={`status-badge status-${asset.status}`}>
            {getStatusText(asset.status)}
          </div>
        )}

        {/* AI生成指示器 */}
        {asset.prompt && (
          <div className="ai-indicator" title="AI生成资产">
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </div>
        )}

        {/* 删除按钮 */}
        {onDelete && (
          <button
            className="delete-button"
            onClick={handleDelete}
            title="删除资产"
          >
            ×
          </button>
        )}
      </div>

      {/* 资产信息 */}
      <div className="card-info">
        <div className="asset-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-meta">
          <span className={`type-tag type-${asset.type}`}>
            {getTypeText(asset.type)}
          </span>
          {asset.category && (
            <span className="category-tag">
              {asset.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 获取文件类型图标组件
 */
function getFileTypeIconComponent(type: AssetType): React.ReactNode {
  const iconMap: Record<AssetType, React.ReactNode> = {
    image: <Image className="h-12 w-12 text-muted-foreground" />,
    video: <Video className="h-12 w-12 text-muted-foreground" />,
    audio: <AudioWaveform className="h-12 w-12 text-muted-foreground" />,
    text: <FileText className="h-12 w-12 text-muted-foreground" />,
    other: <Package className="h-12 w-12 text-muted-foreground" />
  };
  return iconMap[type] || <Folder className="h-12 w-12 text-muted-foreground" />;
}

/**
 * 获取类型文本
 */
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

/**
 * 获取状态文本
 */
function getStatusText(status: ResourceStatus): string {
  const textMap: Record<ResourceStatus, string> = {
    none: '',
    generating: '生成中',
    success: '完成',
    failed: '失败'
  };
  return textMap[status] || '';
}

export default AssetCard;

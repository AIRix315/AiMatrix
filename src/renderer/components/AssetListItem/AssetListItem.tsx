/**
 * AssetListItem - 资产列表项组件
 * 符合设计规范的列表项样式
 */

import React from 'react';
import { Image, Video, Music, FileText, File, Eye, Trash2, Sparkles } from 'lucide-react';
import { AssetMetadata, AssetType } from '@/shared/types';
import { formatFileSize, formatRelativeTime } from '../../utils/formatters';
import './AssetListItem.css';

interface AssetListItemProps {
  asset: AssetMetadata;
  selected?: boolean;
  onSelect?: (asset: AssetMetadata) => void;
  onPreview?: (asset: AssetMetadata) => void;
  onDelete?: (asset: AssetMetadata) => void;
  onClick?: () => void;
}

/**
 * 获取资产类型图标
 */
const getTypeIcon = (type: AssetType, size: number = 24) => {
  switch (type) {
    case 'image':
      return <Image size={size} />;
    case 'video':
      return <Video size={size} />;
    case 'audio':
      return <Music size={size} />;
    case 'text':
      return <FileText size={size} />;
    default:
      return <File size={size} />;
  }
};

/**
 * 获取资产类型中文名称
 */
const getTypeName = (type: AssetType): string => {
  const typeMap: Record<AssetType, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
    text: '文本',
    other: '其他'
  };
  return typeMap[type];
};

export const AssetListItem: React.FC<AssetListItemProps> = ({
  asset,
  selected = false,
  onSelect,
  onPreview,
  onDelete,
  onClick
}) => {
  const isAIGenerated = !!asset.prompt; // 有 prompt 表示 AI 生成

  const handleClick = (e: React.MouseEvent) => {
    // 如果点击的是选择框，不触发 onClick
    if ((e.target as HTMLElement).closest('.select-checkbox')) {
      return;
    }
    onClick?.();
  };

  return (
    <div
      className={`asset-list-item ${selected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      {/* 1. 预览图区域 */}
      <div className="preview-thumbnail">
        {asset.thumbnailPath ? (
          <img src={`file://${asset.thumbnailPath}`} alt={asset.name} className="thumbnail-image" />
        ) : (
          <div className="thumbnail-icon">
            {getTypeIcon(asset.type, 32)}
          </div>
        )}
      </div>

      {/* 2. 辅助信息 - 类型标签 + AI标记 */}
      <div className="auxiliary-info">
        <div className="type-badge">{getTypeName(asset.type)}</div>
        {isAIGenerated && (
          <div className="ai-badge" title="AI生成">
            <Sparkles size={14} />
          </div>
        )}
      </div>

      {/* 3. 名称和描述 */}
      <div className="content">
        <div className="title">{asset.name}</div>
        {asset.description && <div className="description">{asset.description}</div>}
      </div>

      {/* 4. 右对齐区域 */}
      <div className="right-section">
        {/* 信息栏 */}
        <div className="info">
          {formatFileSize(asset.size)} | {formatRelativeTime(asset.modifiedAt)}
        </div>

        {/* 按钮组 */}
        <div className="action-buttons">
          {onPreview && (
            <button
              className="preview-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(asset);
              }}
              title="预览资产"
            >
              <Eye size={16} />
            </button>
          )}
          {onDelete && (
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(asset);
              }}
              title="删除资产"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* 选择框（如果支持选择） */}
        {onSelect && (
          <div className="select-checkbox">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(asset)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetListItem;

import React from 'react';
import { Modal } from './common';
import type { AssetMetadata } from '../../shared/types';
import './AssetPreview.css';

interface AssetPreviewProps {
  asset: AssetMetadata | null;
  onClose: () => void;
}

const AssetPreview: React.FC<AssetPreviewProps> = ({ asset, onClose }) => {
  if (!asset) return null;

  const renderPreview = () => {
    switch (asset.type) {
      case 'image':
        return (
          <img
            src={`file://${asset.filePath}`}
            alt={asset.name}
            className="asset-preview-image"
          />
        );
      case 'video':
        return (
          <video
            src={`file://${asset.filePath}`}
            controls
            className="asset-preview-video"
          />
        );
      case 'audio':
        return (
          <audio
            src={`file://${asset.filePath}`}
            controls
            className="asset-preview-audio"
          />
        );
      default:
        return (
          <div className="asset-preview-unsupported">
            <div className="unsupported-icon">📄</div>
            <p>不支持预览此类型文件</p>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={!!asset} title={asset.name} onClose={onClose} width="80vw">
      <div className="asset-preview-container">
        <div className="preview-content">
          {renderPreview()}
        </div>
        <div className="asset-info">
          <div className="info-row">
            <span className="info-label">类型:</span>
            <span className="info-value">{asset.type}</span>
          </div>
          <div className="info-row">
            <span className="info-label">路径:</span>
            <span className="info-value">{asset.filePath}</span>
          </div>
          <div className="info-row">
            <span className="info-label">大小:</span>
            <span className="info-value">{formatFileSize(asset.size)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">创建时间:</span>
            <span className="info-value">{new Date(asset.createdAt).toLocaleString()}</span>
          </div>
          {asset.tags.length > 0 && (
            <div className="info-row">
              <span className="info-label">标签:</span>
              <span className="info-value">{asset.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default AssetPreview;

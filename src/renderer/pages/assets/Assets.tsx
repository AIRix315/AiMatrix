import React, { useState, useEffect } from 'react';
import { Card, Button, Toast, Loading, ConfirmDialog } from '../../components/common';
import AssetPreview from '../../components/AssetPreview';
import type { ToastType } from '../../components/common/Toast';
import type { AssetConfig } from '../../../common/types';
import { AssetType } from '../../../common/types';
import './Assets.css';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<AssetConfig[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio' | 'text'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ assetId: string; assetName: string } | null>(null);
  const [previewAsset, setPreviewAsset] = useState<AssetConfig | null>(null);

  useEffect(() => {
    loadAssets();
  }, [filterType]);

  const loadAssets = async () => {
    try {
      setIsLoading(true);

      // TODO: 需要当前项目ID，暂时使用'default'
      const projectId = 'default';

      if (window.electronAPI?.searchAssets) {
        const query = filterType === 'all'
          ? {}
          : { type: filterType.toUpperCase() as AssetType };

        const assetList = await window.electronAPI.searchAssets(
          'project',
          projectId,
          query
        );
        setAssets(assetList || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      setToast({
        type: 'error',
        message: `加载资产失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async () => {
    try {
      if (!window.electronAPI?.selectFiles) return;

      // 打开文件选择对话框
      const result = await window.electronAPI.selectFiles({
        filters: [
          { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: '视频', extensions: ['mp4', 'mov', 'avi', 'mkv'] },
          { name: '音频', extensions: ['mp3', 'wav', 'ogg', 'flac'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePaths.length) return;

      setIsImporting(true);

      // 批量添加资产
      const projectId = 'default';
      for (const filePath of result.filePaths) {
        await window.electronAPI.addAsset('project', projectId, {
          path: filePath,
          type: getAssetTypeFromPath(filePath),
          metadata: {
            name: getFileNameFromPath(filePath),
            fileSize: 0, // 后端会自动获取
            mimeType: getMimeType(filePath)
          },
          tags: []
        });
      }

      setToast({
        type: 'success',
        message: `成功导入 ${result.filePaths.length} 个资产`
      });

      // 重新加载列表
      await loadAssets();

    } catch (error) {
      console.error('Failed to add assets:', error);
      setToast({
        type: 'error',
        message: `导入资产失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const projectId = 'default';

      if (window.electronAPI?.removeAsset) {
        await window.electronAPI.removeAsset('project', projectId, assetId);
        setToast({
          type: 'success',
          message: '资产删除成功'
        });
        await loadAssets();
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      setToast({
        type: 'error',
        message: `删除资产失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleOpenAsset = (asset: AssetConfig) => {
    setPreviewAsset(asset);
  };

  // 辅助函数
  const getAssetTypeFromPath = (path: string): AssetType => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac'];

    if (imageExts.includes(ext)) return AssetType.IMAGE;
    if (videoExts.includes(ext)) return AssetType.VIDEO;
    if (audioExts.includes(ext)) return AssetType.AUDIO;
    return AssetType.TEXT;
  };

  const getFileNameFromPath = (path: string): string => {
    return path.split(/[/\\]/).pop() || 'unknown';
  };

  const getMimeType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  const getAssetIcon = (type: AssetType): string => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'text': return '📄';
      case 'model': return '🤖';
      case 'workflow': return '⚙️';
      default: return '📁';
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">素材 <small>| 资产管理 (Asset Management)</small></div>
        <div className="view-actions">
          <div className="view-switch-container">
            <div
              className={`view-switch-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              全部
            </div>
            <div
              className={`view-switch-btn ${filterType === 'image' ? 'active' : ''}`}
              onClick={() => setFilterType('image')}
            >
              图片
            </div>
            <div
              className={`view-switch-btn ${filterType === 'video' ? 'active' : ''}`}
              onClick={() => setFilterType('video')}
            >
              视频
            </div>
            <div
              className={`view-switch-btn ${filterType === 'audio' ? 'active' : ''}`}
              onClick={() => setFilterType('audio')}
            >
              音频
            </div>
            <div
              className={`view-switch-btn ${filterType === 'text' ? 'active' : ''}`}
              onClick={() => setFilterType('text')}
            >
              文本
            </div>
          </div>
          <Button variant="primary" onClick={handleAddAsset} disabled={isImporting}>
            {isImporting ? '导入中...' : '+ 添加素材'}
          </Button>
        </div>
      </div>

      <div className="dashboard-content">
        {isLoading ? (
          <Loading size="lg" message="加载资产列表..." fullscreen={false} />
        ) : assets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h2>暂无素材</h2>
            <p>开始添加你的第一个素材吧。</p>
            <Button variant="primary" onClick={handleAddAsset} disabled={isImporting}>
              {isImporting ? '导入中...' : '+ 添加素材'}
            </Button>
          </div>
        ) : (
          <div className="project-grid">
            {assets.map((asset) => (
              <div key={asset.id} className="project-card-wrapper">
                <Card
                  tag={asset.scope === 'global' ? '全局' : '项目'}
                  image={getAssetIcon(asset.type)}
                  title={asset.metadata.name || '未命名'}
                  info={`类型: ${asset.type} | 更新: ${new Date(asset.updatedAt).toLocaleDateString()}`}
                  hoverable
                  onClick={() => handleOpenAsset(asset)}
                />
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({
                      assetId: asset.id,
                      assetName: asset.metadata.name || '未命名'
                    });
                  }}
                  title="删除资产"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="删除资产"
          message={`确定要删除资产 "${deleteConfirm.assetName}" 吗？此操作无法撤销。`}
          type="danger"
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => handleDeleteAsset(deleteConfirm.assetId)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* 资产预览 */}
      <AssetPreview
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
      />

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

export default Assets;

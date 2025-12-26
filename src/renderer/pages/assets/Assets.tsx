/**
 * Assets 页面
 *
 * 功能：
 * - 左侧分类导航（可折叠）
 * - 右侧资产网格
 * - 资产预览和管理
 */

import React, { useState, useCallback } from 'react';
import { AssetMetadata, AssetFilter } from '../../../shared/types/asset';
import { AssetGrid } from '../../components/AssetGrid';
import { AssetPreview } from '../../components/AssetPreview/AssetPreview';
import './Assets.css';

export function Assets() {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null);
  const [allAssets, setAllAssets] = useState<AssetMetadata[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 构建过滤器
  const getFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: 'all',
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };

    return filter;
  }, []);

  // 处理资产选择
  const handleAssetSelect = (asset: AssetMetadata, multiSelect: boolean) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (multiSelect) {
        if (newSet.has(asset.id)) {
          newSet.delete(asset.id);
        } else {
          newSet.add(asset.id);
        }
      } else {
        newSet.clear();
        newSet.add(asset.id);
      }
      return newSet;
    });
  };

  // 处理资产预览
  const handleAssetPreview = (asset: AssetMetadata) => {
    setPreviewAsset(asset);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setPreviewAsset(null);
  };

  // 预览下一个资产
  const handleNextAsset = () => {
    if (!previewAsset || allAssets.length === 0) return;
    const currentIndex = allAssets.findIndex(a => a.id === previewAsset.id);
    if (currentIndex < allAssets.length - 1) {
      setPreviewAsset(allAssets[currentIndex + 1]);
    }
  };

  // 预览上一个资产
  const handlePrevAsset = () => {
    if (!previewAsset || allAssets.length === 0) return;
    const currentIndex = allAssets.findIndex(a => a.id === previewAsset.id);
    if (currentIndex > 0) {
      setPreviewAsset(allAssets[currentIndex - 1]);
    }
  };

  // 更新资产元数据
  const handleUpdateAsset = async (updates: Partial<AssetMetadata>) => {
    if (!previewAsset) return;
    try {
      await window.electronAPI.updateAssetMetadata(previewAsset.filePath, updates);
      // 更新本地状态
      setPreviewAsset({ ...previewAsset, ...updates });
    } catch (err) {
      // eslint-disable-next-line no-console
      // console.error('更新元数据失败:', err);
      alert('更新失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 处理资产删除
  const handleAssetDelete = (asset: AssetMetadata) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      newSet.delete(asset.id);
      return newSet;
    });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">资产库 <small>| 资产 (Assets)</small></div>
        <div className="view-switch-container">
          <div
            className={`view-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List (列表)
          </div>
          <div
            className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid (视图)
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <AssetGrid
          filter={getFilter()}
          selectedAssets={selectedAssets}
          onAssetSelect={handleAssetSelect}
          onAssetPreview={handleAssetPreview}
          onAssetDelete={handleAssetDelete}
          onAssetsLoaded={setAllAssets}
        />
      </div>

      {/* 资产预览 Modal */}
      {previewAsset && (
        <AssetPreview
          asset={previewAsset}
          isOpen={!!previewAsset}
          onClose={handleClosePreview}
          onNext={allAssets.length > 1 ? handleNextAsset : undefined}
          onPrev={allAssets.length > 1 ? handlePrevAsset : undefined}
          onUpdate={handleUpdateAsset}
        />
      )}
    </div>
  );
}

export default Assets;

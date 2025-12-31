/**
 * Assets 页面 - V2
 *
 * 功能：
 * - 左侧分类导航（作用域切换 + 资产类型分类）
 * - 右侧资产网格
 * - 资产预览和管理
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AssetMetadata, AssetFilter, AssetType } from '@/shared/types';
import { AssetGrid } from '../../components/AssetGrid';
import { AssetPreview } from '../../components/AssetPreview/AssetPreview';
import { ViewSwitcher } from '../../components/common';
import { UnifiedAssetPanel, AssetCategoryId } from '../../components/UnifiedAssetPanel';
import './Assets.css';

export function Assets() {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null);
  const [allAssets, setAllAssets] = useState<AssetMetadata[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryId>('all');
  const [selectedScope, setSelectedScope] = useState<'global' | 'project'>('global');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  // 构建过滤器
  const getFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: selectedScope,
      projectId: selectedScope === 'project' ? selectedProjectId : undefined,
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };

    // 全局Tab分类过滤
    if (selectedScope === 'global') {
      if (selectedCategory === 'input') {
        // 输入分类：过滤用户上传的资产
        filter.isUserUploaded = true;
      } else if (selectedCategory !== 'all') {
        // 文件类型分类
        filter.type = selectedCategory as AssetType;
      }
    }
    // 项目Tab分类过滤
    else if (selectedScope === 'project') {
      if (selectedCategory !== 'all') {
        // 工作流分类
        filter.category = selectedCategory;
      }
    }

    return filter;
  }, [selectedScope, selectedCategory, selectedProjectId]);

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
    <div className="assets-page">
      {/* 左侧统一资源栏 */}
      <UnifiedAssetPanel
        selectedScope={selectedScope}
        selectedCategory={selectedCategory}
        selectedProjectId={selectedProjectId}
        showProjectSelector={true}
        onScopeChange={setSelectedScope}
        onCategoryChange={setSelectedCategory}
        onProjectChange={handleProjectSelect}
      />

      {/* 右侧主内容区 */}
      <div className="assets-main">
        <div className="dashboard-header">
          <div className="view-title">资产库 <small>| {selectedScope === 'global' ? '全局库' : '项目资源'}</small></div>
          <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
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

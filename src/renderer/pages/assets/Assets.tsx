/**
 * Assets 页面
 *
 * 功能：
 * - 左侧分类导航（AssetSidebar）
 * - 右侧资产网格（AssetGrid）
 * - 顶部工具栏（搜索、导入、排序）
 * - 资产预览和管理
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

import React, { useState, useCallback } from 'react';
import { AssetMetadata, AssetFilter } from '../../../shared/types/asset';
import { AssetSidebar } from '../../components/AssetSidebar';
import { AssetGrid } from '../../components/AssetGrid';
import { AssetPreview } from '../../components/AssetPreview/AssetPreview';
import './Assets.css';

export function Assets() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'modifiedAt' | 'size'>('modifiedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null);
  const [allAssets, setAllAssets] = useState<AssetMetadata[]>([]);

  // 构建过滤器
  const getFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: 'all',
      sortBy,
      sortOrder
    };

    if (selectedCategory) {
      filter.category = selectedCategory;
    }

    if (searchText.trim()) {
      filter.search = searchText.trim();
    }

    return filter;
  }, [selectedCategory, searchText, sortBy, sortOrder]);

  // 处理分类选择
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedAssets(new Set()); // 清空选中
  };

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

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
      console.error('更新元数据失败:', err);
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

  // 处理导入
  const handleImport = async () => {
    try {
      const result = await window.electronAPI.showImportDialog();
      if (result) {
        // 刷新资产列表（通过改变filter触发重新加载）
        setSelectedCategory('');
      }
    } catch (err) {
      console.error('导入失败:', err);
      alert('导入失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 处理排序切换
  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // 切换升序/降序
      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
    } else {
      // 切换排序字段
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div className="assets-page">
      {/* 左侧分类导航 */}
      <AssetSidebar
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* 主内容区 */}
      <div className="assets-main">
        {/* 顶部工具栏 */}
        <div className="assets-toolbar">
          {/* 搜索框 */}
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索资产..."
              value={searchText}
              onChange={handleSearch}
              className="search-input"
            />
            {searchText && (
              <button
                className="clear-button"
                onClick={() => setSearchText('')}
                title="清空搜索"
              >
                ×
              </button>
            )}
          </div>

          {/* 工具按钮组 */}
          <div className="toolbar-actions">
            {/* 排序选择 */}
            <div className="sort-dropdown">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                className="sort-select"
              >
                <option value="modifiedAt">修改时间</option>
                <option value="createdAt">创建时间</option>
                <option value="name">名称</option>
                <option value="size">大小</option>
              </select>
              <button
                className="sort-order-button"
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* 导入按钮 */}
            <button className="import-button" onClick={handleImport}>
              + 导入
            </button>
          </div>
        </div>

        {/* 资产网格 */}
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

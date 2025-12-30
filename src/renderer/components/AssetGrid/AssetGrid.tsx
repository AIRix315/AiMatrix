/**
 * 资产网格组件
 *
 * 功能：
 * - 响应式网格布局（自动调整列数）
 * - 分页加载（支持虚拟滚动优化）
 * - 加载状态和空状态
 * - 集成 AssetCard 组件
 * - 支持多选和批量操作
 *
 * 参考：phase4-e01-asset-library-implementation-plan.md
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AssetMetadata, AssetFilter, AssetScanResult } from '@/shared/types';
import { AssetCard } from '../AssetCard';
import './AssetGrid.css';

interface AssetGridProps {
  filter?: AssetFilter;
  projectId?: string;
  selectedAssets?: Set<string>;
  onAssetSelect?: (asset: AssetMetadata, multiSelect: boolean) => void;
  onAssetPreview?: (asset: AssetMetadata) => void;
  onAssetDelete?: (asset: AssetMetadata) => void;
  onAssetsLoaded?: (assets: AssetMetadata[]) => void; // 资产加载完成回调
  columnsCount?: number; // 可选：强制指定列数
}

export function AssetGrid({
  filter = {},
  projectId,
  selectedAssets = new Set(),
  onAssetSelect,
  onAssetPreview,
  onAssetDelete,
  onAssetsLoaded,
  columnsCount
}: AssetGridProps) {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 加载资产
  const loadAssets = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    setError(null);

    try {
      const scanFilter: AssetFilter = {
        ...filter,
        projectId,
        page,
        pageSize: filter.pageSize || 100
      };

      const result: AssetScanResult = await window.electronAPI.scanAssets(scanFilter);

      setTotalCount(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(page);

      if (append) {
        const newAssets = [...assets, ...result.assets];
        setAssets(newAssets);
        onAssetsLoaded?.(newAssets);
      } else {
        setAssets(result.assets);
        onAssetsLoaded?.(result.assets);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载资产失败';
      setError(errorMessage);
      // eslint-disable-next-line no-console
      // console.error('加载资产失败:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, projectId]);

  // 初始加载
  useEffect(() => {
    loadAssets(1, false);
  }, [loadAssets]);

  // 无限滚动 - 使用 Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          loadAssets(currentPage + 1, true);
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, currentPage, loadAssets]);

  // 处理资产选择
  const handleAssetSelect = (asset: AssetMetadata, e?: React.MouseEvent) => {
    const multiSelect = e?.ctrlKey || e?.metaKey || false;
    onAssetSelect?.(asset, multiSelect);
  };

  // 处理资产预览
  const handleAssetPreview = (asset: AssetMetadata) => {
    onAssetPreview?.(asset);
  };

  // 处理资产删除
  const handleAssetDelete = async (asset: AssetMetadata) => {
    try {
      await window.electronAPI.deleteAsset(asset.filePath);
      onAssetDelete?.(asset);
      // 重新加载当前页
      loadAssets(1, false);
    } catch (err) {
      // eslint-disable-next-line no-console
      // console.error('删除资产失败:', err);
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 获取网格列数样式
  const getGridStyle = (): React.CSSProperties => {
    if (columnsCount) {
      return {
        gridTemplateColumns: `repeat(${columnsCount}, 1fr)`
      };
    }
    return {};
  };

  // 错误状态
  if (error && assets.length === 0) {
    return (
      <div className="asset-grid-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <p className="error-message">{error}</p>
          <button onClick={() => loadAssets(1, false)} className="retry-button">
            重试
          </button>
        </div>
      </div>
    );
  }

  // 空状态
  if (!loading && assets.length === 0) {
    return (
      <div className="asset-grid-empty">
        <div className="empty-content">
          <span className="empty-icon">📦</span>
          <p className="empty-message">暂无资产</p>
          <p className="empty-hint">
            {filter.search
              ? '没有找到匹配的资产，请尝试其他搜索条件'
              : '点击右上角的导入按钮添加资产'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-grid-container" ref={gridRef}>
      {/* 统计信息 */}
      <div className="grid-header">
        <div className="assets-count">
          共 {totalCount} 个资产
          {selectedAssets.size > 0 && (
            <span className="selected-count"> · 已选中 {selectedAssets.size} 个</span>
          )}
        </div>
      </div>

      {/* 资产网格 */}
      <div
        className={`asset-grid ${columnsCount ? '' : 'auto-columns'}`}
        style={getGridStyle()}
      >
        {assets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selected={selectedAssets.has(asset.id)}
            onSelect={(a) => handleAssetSelect(a, undefined)}
            onPreview={handleAssetPreview}
            onDelete={handleAssetDelete}
          />
        ))}
      </div>

      {/* 加载更多指示器 */}
      {hasMore && (
        <div ref={loadMoreRef} className="load-more-trigger">
          {loading && (
            <div className="loading-more">
              <div className="spinner"></div>
              <span>加载中...</span>
            </div>
          )}
        </div>
      )}

      {/* 初始加载状态 */}
      {loading && assets.length === 0 && (
        <div className="grid-loading">
          <div className="spinner"></div>
          <span>加载中...</span>
        </div>
      )}
    </div>
  );
}

export default AssetGrid;

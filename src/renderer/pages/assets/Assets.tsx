/**
 * Assets 页面 - V2
 *
 * 功能：
 * - 左侧分类导航（作用域切换 + 资产类型分类）
 * - 右侧资产网格
 * - 资产预览和管理
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FileText, Image as ImageIcon, Music, Video, FileCode, Folder } from 'lucide-react';
import { AssetMetadata, AssetFilter } from '../../../shared/types/asset';
import { AssetGrid } from '../../components/AssetGrid';
import { AssetPreview } from '../../components/AssetPreview/AssetPreview';
import { ViewSwitcher } from '../../components/common';
import './Assets.css';

// UI 资产类型定义（包含 'all' 用于显示）
type UIAssetType = 'all' | 'text' | 'image' | 'audio' | 'video' | 'other';
type UIAssetScope = 'all' | 'global' | 'project';

// 资产分类配置
const ASSET_CATEGORIES = [
  { id: 'all' as UIAssetType, label: '全部资产', icon: Folder },
  { id: 'text' as UIAssetType, label: '文本', icon: FileText },
  { id: 'image' as UIAssetType, label: '图像', icon: ImageIcon },
  { id: 'audio' as UIAssetType, label: '音频', icon: Music },
  { id: 'video' as UIAssetType, label: '视频', icon: Video },
  { id: 'other' as UIAssetType, label: '其他', icon: FileCode },
];

interface ProjectConfig {
  id: string;
  name: string;
  status?: 'in-progress' | 'completed' | 'archived';
}

export function Assets() {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null);
  const [allAssets, setAllAssets] = useState<AssetMetadata[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategory, setSelectedCategory] = useState<UIAssetType>('all');
  const [selectedScope, setSelectedScope] = useState<UIAssetScope>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<ProjectConfig[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await window.electronAPI.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedScope('project');
  };

  // 构建过滤器
  const getFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: selectedScope === 'all' ? undefined : selectedScope,
      projectId: selectedProjectId,
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };

    // 根据分类添加类型过滤（'all' 不过滤）
    if (selectedCategory !== 'all') {
      filter.type = selectedCategory as 'text' | 'image' | 'audio' | 'video' | 'other';
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
      {/* 左侧分类导航 */}
      <aside className="assets-sidebar">
        {/* 作用域切换 */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">作用域</h3>
          <div className="scope-switcher">
            <button
              className={`scope-btn ${selectedScope === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedScope('all')}
            >
              全部资源
            </button>
            <button
              className={`scope-btn ${selectedScope === 'global' ? 'active' : ''}`}
              onClick={() => setSelectedScope('global')}
            >
              全局库
            </button>
            <button
              className={`scope-btn ${selectedScope === 'project' ? 'active' : ''}`}
              onClick={() => setSelectedScope('project')}
            >
              项目资源
            </button>
          </div>
        </div>

        {/* 资产类型分类 */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">资产类型</h3>
          <div className="category-list">
            {ASSET_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className="category-icon" size={18} />
                  <span className="category-label">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 项目分类树 */}
        {selectedScope === 'project' && (
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">项目列表</h3>
            <div className="category-list">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={`category-item ${selectedProjectId === project.id ? 'active' : ''}`}
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <Folder className="category-icon" size={18} />
                  <span className="category-label">{project.name}</span>
                </button>
              ))}
              {projects.length === 0 && (
                <div className="empty-hint">暂无项目</div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* 右侧主内容区 */}
      <div className="assets-main">
        <div className="dashboard-header">
          <div className="view-title">资产库 <small>| {selectedScope === 'all' ? '全部资源' : selectedScope === 'global' ? '全局库' : '项目资源'}</small></div>
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

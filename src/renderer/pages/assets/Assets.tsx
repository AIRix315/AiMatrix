/**
 * Assets 页面 - V3（对齐统一布局）
 *
 * 功能：
 * - 3个TAB页：全部资产、项目资产、在线资产共享
 * - 全局资产：按文件类型分类（全部、图片、视频、音频、文本、其他）
 * - 项目资产：项目选择器 + 按工作流用途分类（全部、章节、场景、角色、分镜脚本、配音）
 * - 在线资产：暂未实现，显示空状态
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { AssetMetadata, AssetFilter, AssetType } from '@/shared/types';
import { ProjectConfig } from '@/common/types';
import { AssetGrid } from '../../components/AssetGrid';
import { AssetPreview } from '../../components/AssetPreview/AssetPreview';
import { ViewSwitcher } from '../../components/common';
import { AssetCategoryFilter } from '../../components/AssetCategoryFilter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import './Assets.css';

type ActiveTab = 'global' | 'project' | 'online';
type GlobalCategoryId = 'all' | 'image' | 'video' | 'audio' | 'text' | 'other';
type ProjectCategoryId = 'all' | 'chapters' | 'scenes' | 'characters' | 'storyboards' | 'voiceovers';

export function Assets() {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<AssetMetadata | null>(null);
  const [allAssets, setAllAssets] = useState<AssetMetadata[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // TAB 和分类状态
  const [activeTab, setActiveTab] = useState<ActiveTab>('global');
  const [globalCategory, setGlobalCategory] = useState<GlobalCategoryId>('all');
  const [projectCategory, setProjectCategory] = useState<ProjectCategoryId>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<ProjectConfig[]>([]);

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await window.electronAPI.listProjects();
        setProjects(projectList);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载项目列表失败:', error);
      }
    };

    loadProjects();
  }, []);

  // 构建全局资产过滤器
  const getGlobalFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: 'global',
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };

    if (globalCategory !== 'all') {
      filter.type = globalCategory as AssetType;
    }

    return filter;
  }, [globalCategory]);

  // 构建项目资产过滤器
  const getProjectFilter = useCallback((): AssetFilter => {
    const filter: AssetFilter = {
      scope: 'project',
      projectId: selectedProjectId,
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    };

    if (projectCategory !== 'all') {
      filter.category = projectCategory;
    }

    return filter;
  }, [projectCategory, selectedProjectId]);

  // 处理 TAB 切换
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    // 切换 TAB 时重置分类
    setGlobalCategory('all');
    setProjectCategory('all');
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
      {/* 页面头部 */}
      <div className="dashboard-header">
        <div className="view-title">
          资产库 <small>| 素材管理 (Asset Library)</small>
        </div>
        <div className="header-actions">
          <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="dashboard-content">
        {/* TAB 切换器 */}
        <div className="content-tab-switcher">
          <div className="tab-buttons">
            <button
              className={`content-tab-btn ${activeTab === 'global' ? 'active' : ''}`}
              onClick={() => handleTabChange('global')}
            >
              全部资产
            </button>
            <button
              className={`content-tab-btn ${activeTab === 'project' ? 'active' : ''}`}
              onClick={() => handleTabChange('project')}
            >
              项目资产
            </button>
            <button
              className={`content-tab-btn ${activeTab === 'online' ? 'active' : ''}`}
              onClick={() => handleTabChange('online')}
            >
              在线资产共享
            </button>
          </div>
        </div>

        {/* TAB 内容区 - 全部资产 */}
        {activeTab === 'global' && (
          <>
            <AssetCategoryFilter
              type="global"
              selectedCategory={globalCategory}
              onCategoryChange={(categoryId) => setGlobalCategory(categoryId as GlobalCategoryId)}
            />
            <AssetGrid
              filter={getGlobalFilter()}
              selectedAssets={selectedAssets}
              onAssetSelect={handleAssetSelect}
              onAssetPreview={handleAssetPreview}
              onAssetDelete={handleAssetDelete}
              onAssetsLoaded={setAllAssets}
              viewMode={viewMode}
            />
          </>
        )}

        {/* TAB 内容区 - 项目资产 */}
        {activeTab === 'project' && (
          <>
            {/* 项目选择器 */}
            <div className="project-selector-container">
              <label>选择项目：</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="选择项目..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 项目资产分类筛选器 */}
            <AssetCategoryFilter
              type="project"
              selectedCategory={projectCategory}
              onCategoryChange={(categoryId) => setProjectCategory(categoryId as ProjectCategoryId)}
            />

            {/* 资产网格 */}
            {selectedProjectId ? (
              <AssetGrid
                filter={getProjectFilter()}
                selectedAssets={selectedAssets}
                onAssetSelect={handleAssetSelect}
                onAssetPreview={handleAssetPreview}
                onAssetDelete={handleAssetDelete}
                onAssetsLoaded={setAllAssets}
                viewMode={viewMode}
              />
            ) : (
              <div className="empty-hint">
                请先选择一个项目以查看其资产
              </div>
            )}
          </>
        )}

        {/* TAB 内容区 - 在线资产共享 */}
        {activeTab === 'online' && (
          <div className="empty-state">
            <div className="empty-icon">
              <Cloud className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2>在线资产共享</h2>
            <p>该功能正在开发中，敬请期待...</p>
          </div>
        )}
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

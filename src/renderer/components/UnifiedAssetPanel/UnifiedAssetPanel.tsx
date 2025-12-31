/**
 * 统一资源栏组件
 *
 * 功能：
 * - 使用 Tab 页切换全局/项目资产
 * - 显示资产类型分类
 * - 可选的项目选择器
 */

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AssetCategoryList } from './AssetCategoryList';
import { ProjectSelector } from './ProjectSelector';
import {
  AssetCategoryId,
  GLOBAL_ASSET_CATEGORIES,
  PROJECT_WORKFLOW_CATEGORIES,
  ProjectConfig
} from './types';
import './UnifiedAssetPanel.css';

export interface UnifiedAssetPanelProps {
  selectedScope: 'global' | 'project';
  selectedCategory: AssetCategoryId;
  selectedProjectId?: string;
  showProjectSelector?: boolean; // 控制是否显示项目选择器
  currentProjectId?: string; // WorkflowExecutor 传入固定的项目ID
  onScopeChange: (scope: 'global' | 'project') => void;
  onCategoryChange: (category: AssetCategoryId) => void;
  onProjectChange?: (projectId: string) => void;
}

export function UnifiedAssetPanel({
  selectedScope,
  selectedCategory,
  selectedProjectId,
  showProjectSelector = false,
  currentProjectId,
  onScopeChange,
  onCategoryChange,
  onProjectChange
}: UnifiedAssetPanelProps) {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await window.electronAPI.listProjects();
        setProjects(projectList);
      } catch (error) {
        console.error('加载项目列表失败:', error);
      }
    };

    if (showProjectSelector) {
      loadProjects();
    }
  }, [showProjectSelector]);

  // 处理 Tab 切换（类型转换 + 重置分类）
  const handleTabChange = (value: string) => {
    if (value === 'global' || value === 'project') {
      onScopeChange(value);
      onCategoryChange('all' as AssetCategoryId); // 切换Tab时重置为"全部资产"
    }
  };

  return (
    <aside className="unified-asset-panel">
      <Tabs value={selectedScope} onValueChange={handleTabChange}>
        <div className="panel-tabs">
          <TabsList className="panel-tabs-list">
            <TabsTrigger value="global" className="panel-tab-trigger">
              全局
            </TabsTrigger>
            <TabsTrigger value="project" className="panel-tab-trigger">
              项目
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="global" className="panel-tab-content">
          <AssetCategoryList
            categories={GLOBAL_ASSET_CATEGORIES}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategoryChange}
          />
        </TabsContent>

        <TabsContent value="project" className="panel-tab-content">
          {showProjectSelector && onProjectChange && (
            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectSelect={onProjectChange}
            />
          )}
          <AssetCategoryList
            categories={PROJECT_WORKFLOW_CATEGORIES}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategoryChange}
            projectId={currentProjectId || selectedProjectId}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

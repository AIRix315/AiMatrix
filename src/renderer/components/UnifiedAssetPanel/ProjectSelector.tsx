/**
 * 项目选择器组件
 *
 * 功能：
 * - 使用 shadcn/ui Select 组件
 * - 显示所有项目列表
 * - 支持项目切换
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProjectConfig } from './types';

interface ProjectSelectorProps {
  projects: ProjectConfig[];
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onProjectSelect
}: ProjectSelectorProps) {
  return (
    <div className="panel-project-selector">
      <label className="project-selector-label">选择项目</label>
      <Select value={selectedProjectId} onValueChange={onProjectSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="请选择项目..." />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
              {project.status && (
                <span className="project-status-badge">{project.status}</span>
              )}
            </SelectItem>
          ))}
          {projects.length === 0 && (
            <div className="empty-hint">暂无项目</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

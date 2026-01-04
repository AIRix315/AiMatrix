/**
 * ProjectContext - 全局项目上下文
 * 用于在整个应用中共享当前打开的项目信息
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProjectInfo {
  id: string;
  name: string;
  workflowType?: string;
  pluginId?: string;
}

interface ProjectContextValue {
  currentProject: ProjectInfo | null;
  setCurrentProject: (project: ProjectInfo | null) => void;
  updateProjectId: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);

  /**
   * 根据项目ID加载完整项目信息
   */
  const updateProjectId = useCallback(async (projectId: string) => {
    if (!projectId) {
      setCurrentProject(null);
      return;
    }

    try {
      // 加载项目配置
      const project = await window.electronAPI.loadProject(projectId) as any;
      setCurrentProject({
        id: project.id,
        name: project.name,
        workflowType: project.workflowType,
        pluginId: project.pluginId || project.workflowType, // 如果没有 pluginId，使用 workflowType
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      setCurrentProject(null);
    }
  }, []);

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject, updateProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
};

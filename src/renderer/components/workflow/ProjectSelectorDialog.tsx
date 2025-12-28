import React, { useState, useEffect } from 'react';
import { Modal, Button, Loading } from '../common';
import './ProjectSelectorDialog.css';

interface ProjectConfig {
  id: string;
  name: string;
  workflowType?: string;
  pluginId?: string;
  status?: 'in-progress' | 'completed' | 'archived';
}

interface ProjectSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (projectId: string) => void;
  workflowType: string;
  pluginId?: string;
}

export const ProjectSelectorDialog: React.FC<ProjectSelectorDialogProps> = ({
  isOpen,
  onClose,
  onSelectProject,
  onCreateProject,
  workflowType,
  pluginId
}) => {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, workflowType, pluginId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await window.electronAPI.listProjects();

      const filteredProjects = allProjects.filter(
        (p: ProjectConfig) => p.workflowType === workflowType && p.pluginId === pluginId
      );

      setProjects(filteredProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const project = await window.electronAPI.createProject(newProjectName, workflowType);
      onCreateProject(project.id);
      onClose();
    } catch (error) {
      console.error('创建项目失败:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="选择或创建项目">
      <div className="project-selector-dialog">
        {loading ? (
          <Loading message="加载项目列表..." />
        ) : (
          <>
            <div className="project-list">
              <h3>选择已有项目</h3>
              {projects.length === 0 ? (
                <p className="empty-hint">暂无相关项目</p>
              ) : (
                <div className="project-grid">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      className="project-item"
                      onClick={() => {
                        onSelectProject(project.id);
                        onClose();
                      }}
                    >
                      <div className="project-name">{project.name}</div>
                      <div className="project-status">
                        状态: {project.status === 'in-progress' ? '进行中' : '已完成'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="create-project-section">
              <Button
                variant="ghost"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                + 新建项目
              </Button>

              {showCreateForm && (
                <div className="create-form">
                  <input
                    type="text"
                    placeholder="输入项目名称"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <Button variant="primary" onClick={handleCreateProject}>
                    创建
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

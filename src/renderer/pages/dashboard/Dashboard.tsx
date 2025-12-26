import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Toast, Loading, ConfirmDialog } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import './Dashboard.css';

interface Project {
  id: string;
  name: string;
  path: string;
  tag?: string;
  image?: string;
  lastModified?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: string; projectName: string } | null>(null);

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.listProjects) {
        const projectList = await window.electronAPI.listProjects();
        setProjects(projectList || []);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to load projects:', error);
      setToast({
        type: 'error',
        message: `加载项目列表失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      if (window.electronAPI?.createProject) {
        await window.electronAPI.createProject(newProjectName);
        setShowNewProjectModal(false);
        setNewProjectName('');
        setToast({
          type: 'success',
          message: `项目 "${newProjectName}" 创建成功`
        });
        // 重新加载项目列表
        await loadProjects();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to create project:', error);
      setToast({
        type: 'error',
        message: `创建项目失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      if (window.electronAPI?.deleteProject) {
        await window.electronAPI.deleteProject(projectId);
        setToast({
          type: 'success',
          message: '项目删除成功'
        });
        await loadProjects();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to delete project:', error);
      setToast({
        type: 'error',
        message: `删除项目失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">首页 <small>| 项目管理 (Project Management)</small></div>
        <div className="view-actions">
          <Button variant="primary" onClick={() => setShowNewProjectModal(true)}>
            + 新建项目
          </Button>
        </div>
      </div>

      <div className="dashboard-content">
        {isLoading ? (
          <Loading size="lg" message="加载项目列表..." fullscreen={false} />
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h2>欢迎使用 MATRIX Studio</h2>
            <p>当前工作区为空，开始你的第一个创作吧。</p>
            <Button variant="primary" onClick={() => setShowNewProjectModal(true)}>
              + 新建项目
            </Button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card-wrapper">
                <Card
                  tag={project.tag || 'Project'}
                  image={project.image || '🎬'}
                  title={project.name}
                  info={`Path: ${project.path}`}
                  hoverable
                  onClick={() => handleOpenProject(project.id)}
                />
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ projectId: project.id, projectName: project.name });
                  }}
                  title="删除项目"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新建项目模态框 */}
      <Modal
        isOpen={showNewProjectModal}
        title="新建项目"
        onClose={() => setShowNewProjectModal(false)}
        width="480px"
      >
        <div className="form-group">
          <label htmlFor="project-name">项目名称</label>
          <input
            id="project-name"
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="输入项目名称"
            className="input-field"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newProjectName.trim()) {
                handleCreateProject();
              }
            }}
          />
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setShowNewProjectModal(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateProject}
            disabled={!newProjectName.trim() || isCreating}
          >
            {isCreating ? '创建中...' : '创建'}
          </Button>
        </div>
      </Modal>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="删除项目"
          message={`确定要删除项目 "${deleteConfirm.projectName}" 吗？此操作无法撤销。`}
          type="danger"
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => handleDeleteProject(deleteConfirm.projectId)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
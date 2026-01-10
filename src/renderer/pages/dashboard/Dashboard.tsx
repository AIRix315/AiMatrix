import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, Trash2, FolderOpen, Folder } from 'lucide-react';
import { Button, Modal, Toast, Loading, ConfirmDialog, ViewSwitcher, Tooltip, Card } from '../../components/common';
import { ProjectListItem } from '../../components/project/ProjectListItem';
import type { ToastType } from '../../components/common/Toast';
import { ShortcutType } from '../../../common/types';
import { refreshGlobalNav } from '../../utils/globalNavHelper';
import './Dashboard.css';

interface Project {
  id: string;
  name: string;
  path: string;
  workflows?: string[];
  workflowType?: string;
  tag?: string;
  image?: string;
  lastModified?: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('DefTemplate');
  // const [workspacePath, setWorkspacePath] = useState(''); // 暂时未使用
  const [availableTemplates, setAvailableTemplates] = useState<TemplateOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: string; projectName: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  // 打开对话框时加载模板和工作路径
  useEffect(() => {
    if (showNewProjectModal) {
      loadAvailableTemplates();
      loadWorkspacePath();
    }
  }, [showNewProjectModal]);

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

  const loadAvailableTemplates = async () => {
    try {
      const templates: TemplateOption[] = [{ id: 'DefTemplate', name: '工作流' }];

      // 获取插件列表
      if (window.electronAPI?.listPlugins) {
        const plugins = await window.electronAPI.listPlugins();

        // 筛选提供模板的插件（通过 category='workflow' 判断）
        // TODO: [中期改进] 定义准确的Plugin类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plugins.forEach((plugin: any) => {
          if ((plugin as any).category === 'workflow' && (plugin as any).isEnabled) {
            templates.push({
              id: (plugin as any).id,
              name: (plugin as any).name
            });
          }
        });
      }

      setAvailableTemplates(templates);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载模板列表失败:', error);
    }
  };

  const loadWorkspacePath = async () => {
    try {
      if (window.electronAPI?.getAllSettings) {
        // const settings = await window.electronAPI.getAllSettings();
        // setWorkspacePath(settings.general.workspacePath); // 暂时未使用
        await window.electronAPI.getAllSettings(); // 暂时未使用
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载工作路径失败:', error);
    }
  };

  const handleCreateProject = async () => {
    // 验证输入
    if (!newProjectName.trim()) {
      setToast({
        type: 'error',
        message: '请输入项目名称'
      });
      return;
    }

    try {
      setIsCreating(true);
      if (window.electronAPI?.createProject) {
        // 传递模板参数
        await window.electronAPI.createProject(newProjectName, selectedTemplate);

        // 关闭对话框并清空状态
        setShowNewProjectModal(false);
        setNewProjectName('');
        setSelectedTemplate('workflow');

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
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      setToast({
        type: 'error',
        message: '项目不存在'
      });
      return;
    }

    // 检查项目是否有关联的工作流
    if (!project.workflows || project.workflows.length === 0) {
      setToast({
        type: 'error',
        message: '该项目没有关联的工作流'
      });
      return;
    }

    // 获取第一个工作流ID（当前1对1关系）
    const workflowId = project.workflows[0];

    // 根据工作流类型跳转到不同的页面
    if (project.workflowType === 'novel-to-video') {
      navigate(`/workflows/${workflowId}`);
    } else {
      navigate(`/workflows/editor/${workflowId}`);
    }
  };

  const handlePinProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    try {
      await window.electronAPI.addShortcut({
        type: ShortcutType.PROJECT,
        targetId: project.id,
        name: project.name,
        icon: 'folder'
      });
      setToast({
        type: 'success',
        message: `项目 "${project.name}" 已添加到菜单栏`
      });
      // 立即刷新菜单栏
      await refreshGlobalNav();
    } catch (error) {
      setToast({
        type: 'error',
        message: `添加快捷方式失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">首页 <small>| 项目管理 (Project Management)</small></div>
        <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
      </div>

      <div className="dashboard-content">
        {/* 内容区工具栏（仅在有项目时显示） */}
        {!isLoading && projects.length > 0 && (
          <div className="content-tab-switcher">
            <div className="tab-buttons">
              {/* 预留 Tab 按钮位置，未来可扩展 */}
            </div>
            <Button
              variant="primary"
              onClick={() => setShowNewProjectModal(true)}
            >
              + 新建项目
            </Button>
          </div>
        )}

        {isLoading ? (
          <Loading size="lg" message="加载项目列表..." fullscreen={false} />
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FolderOpen className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2>欢迎使用 MATRIX Studio</h2>
            <p>当前工作区为空，开始你的第一个创作吧。</p>
            <Button variant="primary" onClick={() => setShowNewProjectModal(true)}>
              + 新建项目
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="project-list">
            {projects.map((project) => (
              <ProjectListItem
                key={project.id}
                id={project.id}
                name={project.name}
                path={project.path}
                workflowType={project.workflowType}
                lastModified={project.lastModified}
                onDelete={() => setDeleteConfirm({ projectId: project.id, projectName: project.name })}
                onPin={async () => {
                  try {
                    await window.electronAPI.addShortcut({
                      type: ShortcutType.PROJECT,
                      targetId: project.id,
                      name: project.name,
                      icon: 'folder'
                    });
                    setToast({
                      type: 'success',
                      message: `项目 "${project.name}" 已添加到菜单栏`
                    });
                    await refreshGlobalNav();
                  } catch (error) {
                    setToast({
                      type: 'error',
                      message: `添加快捷方式失败: ${error instanceof Error ? error.message : String(error)}`
                    });
                  }
                }}
                onClick={() => handleOpenProject(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card-wrapper">
                <Card
                  tag={project.workflowType === 'novel-to-video' ? '小说转视频' : '工作流'}
                  image={project.image || <Folder className="h-12 w-12 text-muted-foreground" />}
                  title={project.name}
                  info={
                    <Tooltip content={project.path} placement="top">
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.path}
                      </span>
                    </Tooltip>
                  }
                  hoverable
                  onClick={() => handleOpenProject(project.id)}
                />
                <div className="card-actions">
                  <button
                    className="pin-btn"
                    onClick={(e) => handlePinProject(e, project)}
                    title="添加到菜单栏"
                  >
                    <Pin size={16} />
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ projectId: project.id, projectName: project.name });
                    }}
                    title="删除项目"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
              placeholder="我的新项目"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-template">项目模板</label>
            <select
              id="project-template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewProjectModal(false);
                setNewProjectName('');
                setSelectedTemplate('workflow');
              }}
            >
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
          message={`确定要删除项目 "${deleteConfirm?.projectName}" 吗？此操作无法撤销。`}
          type="danger"
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => deleteConfirm && handleDeleteProject(deleteConfirm.projectId)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <Toast
          type={toast?.type}
          message={toast?.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
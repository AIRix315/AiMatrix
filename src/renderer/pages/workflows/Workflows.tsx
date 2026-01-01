import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, Trash2, Settings as SettingsIcon, RefreshCw, Workflow as WorkflowIcon } from 'lucide-react';
import { Card, Button, Toast, Loading, ViewSwitcher, TaskQueueSheet, ConfirmDialog, type Task } from '../../components/common';
import { WorkflowListItem } from '../../components/workflow/WorkflowListItem';
import type { ToastType } from '../../components/common/Toast';
import { ShortcutType } from '../../../common/types';
import { refreshGlobalNav } from '../../utils/globalNavHelper';
import './Workflows.css';

interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'comfyui' | 'n8n' | 'custom';
  lastModified: string;
  status: 'draft' | 'running' | 'completed';
}

const Workflows: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [activeTab, setActiveTab] = useState<'instances' | 'definitions'>('instances');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [isTaskQueueOpen, setIsTaskQueueOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ workflowId: string; workflowName: string } | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.listWorkflows) {
        const workflowList = await window.electronAPI.listWorkflows();
        // 转换后端数据格式为前端格式
        const formattedWorkflows: Workflow[] = workflowList
          .filter((w) => w.id !== undefined)
          .map((w) => ({
            id: w.id!,
            name: w.name,
            description: w.description || '暂无描述',
            type: (w.type || 'custom') as 'comfyui' | 'n8n' | 'custom',
            lastModified: w.lastModified || '未知',
            status: (w.status || 'draft') as 'running' | 'completed' | 'draft'
          }))
          // 过滤掉插件工作流（如 novel-to-video），防止在工作流列表中显示和被误删
          // 插件工作流应该从插件页面访问，而非工作流页面
          .filter((w) => w.id !== 'novel-to-video');
        setWorkflows(formattedWorkflows);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load workflows:', error);
      // 加载失败时显示空状态
      setWorkflows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    navigate('/workflows/new');
  };

  const handleOpenWorkflow = (workflowId: string) => {
    // 所有工作流都使用 WorkflowEditor（可视化流程图编辑器）
    navigate(`/workflows/editor/${workflowId}`);
  };

  const handlePinWorkflow = async (e: React.MouseEvent, workflow: Workflow) => {
    e.stopPropagation();
    try {
      await window.electronAPI.addShortcut({
        type: ShortcutType.WORKFLOW,
        targetId: workflow.id,
        name: workflow.name,
        icon: 'settings'
      });
      setToast({
        type: 'success',
        message: `工作流 "${workflow.name}" 已添加到菜单栏`
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

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      // 删除工作流定义文件
      if (window.electronAPI?.deleteWorkflow) {
        await window.electronAPI.deleteWorkflow(workflowId);
      }

      // 同时删除工作流实例数据（如果存在）
      if (window.electronAPI?.deleteWorkflowInstance) {
        try {
          await window.electronAPI.deleteWorkflowInstance(workflowId);
        } catch (e) {
          // 实例可能不存在，忽略错误
        }
      }

      setToast({
        type: 'success',
        message: '工作流删除成功'
      });

      // 刷新列表
      await loadWorkflows();
    } catch (error) {
      setToast({
        type: 'error',
        message: `删除工作流失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // 任务队列处理函数
  const handleCancelTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleRetryTask = (taskId: string) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, status: 'pending' as const } : t
    ));
  };

  const handlePauseTask = (taskId: string) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, status: 'paused' as const } : t
    ));
  };

  const handleResumeTask = (taskId: string) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, status: 'running' as const } : t
    ));
  };

  const handleClearCompleted = () => {
    setTasks(tasks.filter(t => t.status !== 'completed'));
  };

  if (isLoading && workflows.length === 0) {
    return <Loading size="lg" message="加载工作流..." fullscreen />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">工作流 <small>| 流程管理 (Workflow Management)</small></div>

        <div className="header-actions">
          {/* 视图模式切换按钮 */}
          {((activeTab === 'instances' && workflows.length > 0) ||
            (activeTab === 'definitions')) && (
            <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Tab 切换 */}
        <div className="content-tab-switcher">
          <div className="tab-buttons">
            <button
              className={`content-tab-btn ${activeTab === 'instances' ? 'active' : ''}`}
              onClick={() => setActiveTab('instances')}
            >
              我的工作流
            </button>
            <button
              className={`content-tab-btn ${activeTab === 'definitions' ? 'active' : ''}`}
              onClick={() => setActiveTab('definitions')}
            >
              工作流模板
            </button>
          </div>
          {activeTab === 'instances' && (
            <Button variant="primary" onClick={handleCreateWorkflow}>
              + 自定义工作流
            </Button>
          )}
        </div>

        {activeTab === 'instances' ? (
          // 我的工作流视图
          workflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <SettingsIcon className="h-16 w-16 text-muted-foreground" />
              </div>
              <h2>暂无工作流</h2>
              <p>点击右上角"+ 自定义工作流"按钮创建您的第一个工作流</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="workflow-list">
              {workflows.map((workflow) => (
                <WorkflowListItem
                  key={workflow.id}
                  id={workflow.id}
                  name={workflow.name}
                  description={workflow.description}
                  duration="00:00:00"
                  type={workflow.type}
                  lastModified={workflow.lastModified}
                  onDelete={() => setDeleteConfirm({ workflowId: workflow.id, workflowName: workflow.name })}
                  onPin={async () => {
                    try {
                      await window.electronAPI.addShortcut({
                        type: ShortcutType.WORKFLOW,
                        targetId: workflow.id,
                        name: workflow.name,
                        icon: 'settings'
                      });
                      setToast({
                        type: 'success',
                        message: `工作流 "${workflow.name}" 已添加到菜单栏`
                      });
                      await refreshGlobalNav();
                    } catch (error) {
                      setToast({
                        type: 'error',
                        message: `添加快捷方式失败: ${error instanceof Error ? error.message : String(error)}`
                      });
                    }
                  }}
                  onClick={() => handleOpenWorkflow(workflow.id)}
                />
              ))}
            </div>
          ) : (
            <div className="project-grid">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="workflow-card-wrapper">
                  <Card
                    tag={workflow.type}
                    image={
                      workflow.type === 'comfyui' ? (
                        <RefreshCw className="h-12 w-12 text-muted-foreground" />
                      ) : workflow.type === 'n8n' ? (
                        <WorkflowIcon className="h-12 w-12 text-muted-foreground" />
                      ) : (
                        <SettingsIcon className="h-12 w-12 text-muted-foreground" />
                      )
                    }
                    title={workflow.name}
                    info={`Type: ${workflow.type} | ${workflow.lastModified}`}
                    hoverable
                    onClick={() => handleOpenWorkflow(workflow.id)}
                  />
                  <div className="card-actions">
                    <button
                      className="pin-btn"
                      onClick={(e) => handlePinWorkflow(e, workflow)}
                      title="添加到菜单栏"
                    >
                      <Pin size={16} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ workflowId: workflow.id, workflowName: workflow.name });
                      }}
                      title="删除工作流"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // 工作流模板视图
          <div className="empty-state">
            <div className="empty-icon">🚧</div>
            <h2>工作流模板开发中</h2>
            <p>工作流模板功能正在开发中，敬请期待</p>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="删除工作流"
          message={`确定要删除工作流 "${deleteConfirm.workflowName}" 吗？`}
          type="warning"
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => handleDeleteWorkflow(deleteConfirm.workflowId)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* 任务队列抽屉 */}
      <TaskQueueSheet
        open={isTaskQueueOpen}
        onOpenChange={setIsTaskQueueOpen}
        tasks={tasks}
        onCancelTask={handleCancelTask}
        onRetryTask={handleRetryTask}
        onPauseTask={handlePauseTask}
        onResumeTask={handleResumeTask}
        onClearCompleted={handleClearCompleted}
      />
    </div>
  );
};

export default Workflows;
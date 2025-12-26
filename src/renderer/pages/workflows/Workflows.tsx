import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Toast, Loading } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import './Workflows.css';

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  type: string;
  version?: string;
  icon?: string;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

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
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'definitions' | 'instances'>('definitions');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  useEffect(() => {
    loadWorkflowDefinitions();
    loadWorkflows();
  }, []);

  const loadWorkflowDefinitions = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.listWorkflowDefinitions) {
        const definitions = await window.electronAPI.listWorkflowDefinitions();
        setWorkflowDefinitions(definitions);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载工作流定义失败:', error);
      setToast({
        type: 'error',
        message: `加载工作流定义失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      if (window.electronAPI?.listWorkflows) {
        const workflowList = await window.electronAPI.listWorkflows();
        // 转换后端数据格式为前端格式
        const formattedWorkflows: Workflow[] = workflowList.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description || '暂无描述',
          type: w.type || 'custom',
          lastModified: w.lastModified || '未知',
          status: w.status || 'draft'
        }));
        setWorkflows(formattedWorkflows);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load workflows:', error);
      // 加载失败时显示空状态
      setWorkflows([]);
    }
  };

  const handleCreateWorkflowInstance = async (type: string, name: string) => {
    try {
      setIsLoading(true);

      // 创建工作流实例
      if (window.electronAPI?.createWorkflowInstance) {
        const instance = await window.electronAPI.createWorkflowInstance({
          type,
          name
        });

        setToast({
          type: 'success',
          message: `工作流实例已创建: ${instance.name}`
        });

        // 跳转到工作流执行页面
        navigate(`/workflows/${instance.id}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('创建工作流实例失败:', error);
      setToast({
        type: 'error',
        message: `创建工作流实例失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    navigate('/workflows/new');
  };

  const handleOpenWorkflow = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  if (isLoading && workflowDefinitions.length === 0) {
    return <Loading size="lg" message="加载工作流..." fullscreen />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">工作流 <small>| 流程管理 (Workflow Management)</small></div>
        <div className="view-switch-container">
          <div
            className={`view-switch-btn ${activeTab === 'definitions' ? 'active' : ''}`}
            onClick={() => setActiveTab('definitions')}
          >
            工作流模板
          </div>
          <div
            className={`view-switch-btn ${activeTab === 'instances' ? 'active' : ''}`}
            onClick={() => setActiveTab('instances')}
          >
            我的工作流
          </div>
        </div>
        {activeTab === 'instances' && (
          <Button variant="primary" onClick={handleCreateWorkflow}>
            + 自定义工作流
          </Button>
        )}
      </div>

      <div className="dashboard-content">
        {activeTab === 'definitions' ? (
          // 工作流定义（模板）视图
          workflowDefinitions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <h2>暂无工作流模板</h2>
              <p>系统尚未注册任何工作流模板。</p>
            </div>
          ) : (
            <div className="project-grid">
              {workflowDefinitions.map((definition) => (
                <Card
                  key={definition.id}
                  tag={definition.type}
                  image={definition.icon || '⚙️'}
                  title={definition.name}
                  info={definition.description || `${definition.steps.length} 个步骤`}
                  hoverable
                  onClick={() => handleCreateWorkflowInstance(definition.type, definition.name)}
                />
              ))}
            </div>
          )
        ) : (
          // 工作流实例视图
          workflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <h2>暂无工作流</h2>
              <p>从左侧"工作流模板"选择一个模板开始，或创建自定义工作流。</p>
              <Button variant="primary" onClick={() => setActiveTab('definitions')}>
                查看工作流模板
              </Button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="workflow-list">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="workflow-item-wrapper">
                  <Card
                    key={workflow.id}
                    tag={workflow.type}
                    image={workflow.type === 'comfyui' ? '🔄' : workflow.type === 'n8n' ? '🔗' : '⚙️'}
                    title={workflow.name}
                    info={`Type: ${workflow.type} | ${workflow.lastModified}`}
                    hoverable
                    onClick={() => handleOpenWorkflow(workflow.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="project-grid">
              {workflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  tag={workflow.type}
                  image={workflow.type === 'comfyui' ? '🔄' : workflow.type === 'n8n' ? '🔗' : '⚙️'}
                  title={workflow.name}
                  info={`Type: ${workflow.type} | ${workflow.lastModified}`}
                  hoverable
                  onClick={() => handleOpenWorkflow(workflow.id)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Toast通知 */}
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

export default Workflows;
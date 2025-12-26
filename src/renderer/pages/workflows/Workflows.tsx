import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/common';
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    loadWorkflows();
  }, []);

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

  const handleCreateWorkflow = () => {
    navigate('/workflows/new');
  };

  const handleOpenWorkflow = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">工作流 <small>| 流程管理 (Workflow Management)</small></div>
        <div className="view-switch-container">
          <div
            className={`view-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List (列表)
          </div>
          <div
            className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid (视图)
          </div>
        </div>
        <Button variant="primary" onClick={handleCreateWorkflow}>
          + 新建工作流
        </Button>
      </div>

      <div className="dashboard-content">
        {workflows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <h2>暂无工作流</h2>
            <p>创建你的第一个工作流吧。</p>
            <Button variant="primary" onClick={handleCreateWorkflow}>
              + 新建工作流
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
        )}
      </div>
    </div>
  );
};

export default Workflows;
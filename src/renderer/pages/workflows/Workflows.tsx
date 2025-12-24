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

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      // 模拟加载工作流数据
      const mockWorkflows: Workflow[] = [
        {
          id: '1',
          name: '默认工作流',
          description: '标准AI视频生成流程',
          type: 'comfyui',
          lastModified: '2 days ago',
          status: 'completed',
        },
        {
          id: '2',
          name: '快速生成',
          description: '快速AI内容生成',
          type: 'n8n',
          lastModified: '1 week ago',
          status: 'running',
        },
        {
          id: '3',
          name: '自定义流程',
          description: '用户自定义的工作流',
          type: 'custom',
          lastModified: '3 days ago',
          status: 'draft',
        },
      ];
      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const handleCreateWorkflow = () => {
    // TODO: 实现新建工作流模态框
    console.log('Create workflow clicked');
  };

  const handleOpenWorkflow = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">工作流 <small>| 流程管理 (Workflow Management)</small></div>
        <div className="view-actions">
          <Button variant="primary" onClick={handleCreateWorkflow}>
            + 新建工作流
          </Button>
        </div>
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
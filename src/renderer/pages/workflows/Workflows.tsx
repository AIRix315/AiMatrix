import React from 'react';
import './Workflows.css';

const Workflows: React.FC = () => {
  return (
    <div className="workflows">
      <div className="workflows-header">
        <h2>工作流管理</h2>
        <button className="btn-primary">新建工作流</button>
      </div>
      
      <div className="workflows-content">
        <div className="workflows-filters">
          <input 
            type="text" 
            placeholder="搜索工作流..." 
            className="search-input"
          />
          <select className="filter-select">
            <option value="">全部类型</option>
            <option value="comfyui">ComfyUI</option>
            <option value="mcp">MCP</option>
            <option value="n8n">n8n</option>
          </select>
          <select className="filter-select">
            <option value="">全部状态</option>
            <option value="active">运行中</option>
            <option value="stopped">已停止</option>
            <option value="error">错误</option>
          </select>
        </div>
        
        <div className="workflows-list">
          <div className="empty-state">
            <h3>暂无工作流</h3>
            <p>点击"新建工作流"按钮创建您的第一个工作流</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflows;
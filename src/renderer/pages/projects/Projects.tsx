import React from 'react';
import './Projects.css';

const Projects: React.FC = () => {
  return (
    <div className="projects">
      <div className="projects-header">
        <h2>项目管理</h2>
        <button className="btn-primary">新建项目</button>
      </div>
      
      <div className="projects-content">
        <div className="projects-filters">
          <input 
            type="text" 
            placeholder="搜索项目..." 
            className="search-input"
          />
          <select className="filter-select">
            <option value="">全部状态</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="archived">已归档</option>
          </select>
        </div>
        
        <div className="projects-list">
          <div className="empty-state">
            <h3>暂无项目</h3>
            <p>点击"新建项目"按钮创建您的第一个项目</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
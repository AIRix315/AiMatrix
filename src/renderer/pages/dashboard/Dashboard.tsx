import React from 'react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>仪表板</h2>
        <p>欢迎使用 Matrix AI Workflow 管理平台</p>
      </div>
      
      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>项目总数</h3>
            <div className="stat-number">0</div>
          </div>
          <div className="stat-card">
            <h3>工作流总数</h3>
            <div className="stat-number">0</div>
          </div>
          <div className="stat-card">
            <h3>运行中的任务</h3>
            <div className="stat-number">0</div>
          </div>
          <div className="stat-card">
            <h3>已完成任务</h3>
            <div className="stat-number">0</div>
          </div>
        </div>
        
        <div className="recent-activity">
          <h3>最近活动</h3>
          <div className="activity-list">
            <p>暂无活动记录</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
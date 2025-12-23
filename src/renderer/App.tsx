import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Button, Card, Icon } from './components/common';
import Layout from './components/common/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Projects from './pages/projects/Projects';
import Workflows from './pages/workflows/Workflows';
import Settings from './pages/settings/Settings';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <div style={{ padding: '20px' }}>
          <h2 style={{ color: 'var(--text-main)', marginBottom: '20px' }}>组件测试区域</h2>
          
          {/* 按钮测试 */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>按钮组件</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <Button variant="primary">主要按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button disabled>禁用按钮</Button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="primary" size="sm">小按钮</Button>
              <Button variant="primary" size="md">中按钮</Button>
              <Button variant="primary" size="lg">大按钮</Button>
            </div>
          </div>
          
          {/* 卡片测试 */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>卡片组件</h3>
            <div className="card-grid">
              <Card
                tag="Plugin: Novel2Video"
                image="🎬"
                title="Demo_Project"
                info="Path: D:/Work/Matrix/Demo"
                hoverable
              />
              <Card
                tag="Plugin: Novel2Video"
                image="🪐"
                title="Sci-Fi_Short"
                info="Path: D:/Work/Matrix/SciFi"
                hoverable
              />
              <Card
                image="🎮"
                title="Game_Assets"
                info="Path: D:/Work/Matrix/Game"
                hoverable
              />
            </div>
          </div>
          
          {/* 图标测试 */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>图标组件</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <Icon name="home" size="lg" />
              <Icon name="library" size="lg" />
              <Icon name="plugins" size="lg" />
              <Icon name="video" size="lg" color="var(--accent-color)" />
              <Icon name="settings" size="lg" />
              <Icon name="info" size="lg" />
              <Icon name="add" size="lg" />
              <Icon name="edit" size="lg" />
              <Icon name="delete" size="lg" />
              <Icon name="play" size="lg" />
              <Icon name="pause" size="lg" />
              <Icon name="stop" size="lg" />
              <Icon name="refresh" size="lg" />
              <Icon name="search" size="lg" />
              <Icon name="folder" size="lg" />
              <Icon name="file" size="lg" />
              <Icon name="check" size="lg" />
              <Icon name="warning" size="lg" />
              <Icon name="error" size="lg" />
            </div>
          </div>
        </div>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
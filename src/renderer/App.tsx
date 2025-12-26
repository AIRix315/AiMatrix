import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Assets from './pages/assets/Assets';
import Plugins from './pages/plugins/Plugins';
import Workflows from './pages/workflows/Workflows';
import WorkflowEditor from './pages/workflows/WorkflowEditor';
import { WorkflowExecutor } from './components/WorkflowExecutor';
import Settings from './pages/settings/Settings';
import About from './pages/about/About';

const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 首页路由 */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="plugins" element={<Plugins />} />
          <Route path="workflow" element={<Workflows />} />
          <Route path="workflows" element={<Workflows />} />
          {/* 自定义工作流编辑器（可视化流程图） */}
          <Route path="workflows/new" element={<WorkflowEditor />} />
          <Route path="workflows/editor/:workflowId" element={<WorkflowEditor />} />
          {/* 工作流执行器（步骤化流程） */}
          <Route path="workflows/:workflowId" element={<WorkflowExecutor />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
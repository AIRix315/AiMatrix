import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import Layout from './components/common/Layout';
import { ProgressOrb } from './components/common';
import Dashboard from './pages/dashboard/Dashboard';
import Assets from './pages/assets/Assets';
import Plugins from './pages/plugins/Plugins';
import Workflows from './pages/workflows/Workflows';
import WorkflowEditor from './pages/workflows/WorkflowEditor';
import WorkflowExecutor from './pages/workflows/WorkflowExecutor';
import Settings from './pages/settings/Settings';
import About from './pages/about/About';
import UIDemo from './pages/demo/UIDemo';

/**
 * 内部应用组件 - 包含快捷键处理逻辑
 * 必须在 SidebarProvider 内部才能访问 useSidebar hook
 */
const AppContent: React.FC = () => {
  const { toggleLeftSidebar, toggleRightSidebar } = useSidebar();

  // ProgressOrb 模拟状态（实际应从 TaskScheduler 或工作流状态获取）
  const [queueCount, setQueueCount] = useState(3);
  const [progress, setProgress] = useState(45);
  const [isGenerating, setIsGenerating] = useState(true);

  // 全局键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+B: 切换左侧边栏
      if (event.ctrlKey && !event.altKey && event.key === 'b') {
        event.preventDefault();
        toggleLeftSidebar();
        return;
      }

      // Ctrl+\: 切换左侧边栏（备选）
      if (event.ctrlKey && !event.altKey && event.key === '\\') {
        event.preventDefault();
        toggleLeftSidebar();
        return;
      }

      // Ctrl+Alt+B: 切换右侧边栏
      if (event.ctrlKey && event.altKey && event.key === 'b') {
        event.preventDefault();
        toggleRightSidebar();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLeftSidebar, toggleRightSidebar]);

  // 模拟进度更新
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsGenerating(false);
          return 100;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleOrbClick = () => {
    // eslint-disable-next-line no-console
    console.log('ProgressOrb clicked - will expand task list in H3.1');
  };

  return (
    <>
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
            <Route path="demo" element={<UIDemo />} />
          </Route>
        </Routes>
      </Router>

      {/* 全局状态球 - 显示任务队列和进度 */}
      {queueCount > 0 && (
        <ProgressOrb
          queueCount={queueCount}
          progress={progress}
          isGenerating={isGenerating}
          onClick={handleOrbClick}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="matrix-ui-theme">
      <SidebarProvider>
        <AppContent />
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default App;
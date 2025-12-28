import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
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
 * 必须在 SidebarProvider 和 Router 内部才能访问 hooks
 */
const AppContentWithRouter: React.FC = () => {
  const navigate = useNavigate();
  const { toggleLeftSidebar, toggleRightSidebar } = useSidebar();

  // ProgressOrb 模拟状态（实际应从 TaskScheduler 或工作流状态获取）
  const [queueCount] = useState(3); // setQueueCount 待集成真实 TaskScheduler 时使用
  const [progress, setProgress] = useState(45);
  const [isGenerating, setIsGenerating] = useState(true);

  // 全屏切换函数（使用浏览器原生API）
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('无法进入全屏模式:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // 全局键盘快捷键
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'n',
        ctrl: true,
        description: '新建项目',
        action: () => navigate('/dashboard'),
      },
      {
        key: ',',
        ctrl: true,
        description: '打开设置',
        action: () => navigate('/settings'),
      },
      {
        key: 'F11',
        description: '全屏切换',
        action: toggleFullscreen,
        preventDefault: false, // F11让浏览器自己处理
      },
      {
        key: 'b',
        ctrl: true,
        description: '切换左侧边栏',
        action: toggleLeftSidebar,
      },
      {
        key: '\\',
        ctrl: true,
        description: '切换左侧边栏（备选）',
        action: toggleLeftSidebar,
      },
      {
        key: 'b',
        ctrl: true,
        alt: true,
        description: '切换右侧边栏',
        action: toggleRightSidebar,
      },
    ],
    enabled: true,
  });

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

  return (
    <>
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

      {/* 全局状态球 - 显示任务队列和进度 */}
      {queueCount > 0 && (
        <ProgressOrb
          queueCount={queueCount}
          progress={progress}
          isGenerating={isGenerating}
        />
      )}
    </>
  );
};

/**
 * 包装组件 - 提供Router上下文
 */
const AppContent: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true }}>
      <AppContentWithRouter />
    </Router>
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
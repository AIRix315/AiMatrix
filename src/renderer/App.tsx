import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { SelectionProvider, useSelection } from './contexts/SelectionContext';
import { TaskProvider } from './contexts/TaskContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Layout from './components/common/Layout';
import { ProgressOrb } from './components/common';
import type { Task } from './components/common/TaskQueueSheet';
import Dashboard from './pages/dashboard/Dashboard';
import Assets from './pages/assets/Assets';
import Plugins from './pages/plugins/Plugins';
import Workbench from './pages/workbench/Workbench';
import FlowDesigner from './pages/workbench/FlowDesigner';
import PluginRunner from './pages/workbench/PluginRunner';
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
  const { selectedItem: _selectedItem, selectedCount: _selectedCount } = useSelection();

  // 任务队列状态（通过IPC事件动态添加）
  const [tasks, setTasks] = useState<Task[]>([]);

  // 监听任务事件，动态更新队列
  useEffect(() => {
    const handleTaskCreated = (task: Task) => {
      setTasks((prev) => [...prev, task]);
    };

    const handleTaskUpdated = (taskUpdate: Partial<Task> & { id: string }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskUpdate.id ? { ...t, ...taskUpdate } : t))
      );
    };

    const handleTaskCompleted = (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' as const, progress: 100 } : t))
      );
    };

    const handleTaskFailed = (taskId: string, error: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' as const, error } : t))
      );
    };

    // 注册事件监听器
    if (window.electronAPI) {
      // TODO: [中期改进] 定义准确的事件监听器类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.electronAPI.onTaskCreated(handleTaskCreated as any);
      // TODO: [中期改进] 定义准确的事件监听器类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.electronAPI.onTaskUpdated(handleTaskUpdated as any);
      window.electronAPI.onTaskCompleted(handleTaskCompleted);
      window.electronAPI.onTaskFailed(handleTaskFailed);
    }

    // 清理监听器
    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('task:created');
        window.electronAPI.removeAllListeners('task:updated');
        window.electronAPI.removeAllListeners('task:completed');
        window.electronAPI.removeAllListeners('task:failed');
      }
    };
  }, []);

  // 全屏切换函数（使用浏览器原生API）
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        // eslint-disable-next-line no-console
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

  // 计算运行中任务数量和平均进度
  const runningTasks = tasks.filter((t) => t.status === 'running');
  const taskCount = runningTasks.length;
  const avgProgress =
    runningTasks.length > 0
      ? runningTasks.reduce((sum, t) => sum + t.progress, 0) / runningTasks.length
      : 0;

  // 任务操作处理（所有任务通过IPC）
  const handleCancelTask = async (taskId: string) => {
    try {
      await window.electronAPI.cancelTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('取消任务失败:', error);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      await window.electronAPI.retryTask(taskId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('重试任务失败:', error);
    }
  };

  const handleClearCompleted = () => {
    // 清除已完成任务
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
  };

  // 生成处理
  const _handleGenerate = (mode: 'current' | 'auto-complete' | 'full-flow') => {
    // TODO: 实现真实的生成逻辑
    // TODO: 移除调试代码
    // eslint-disable-next-line no-console
    console.log(`开始生成: ${mode}`);
  };

  return (
    <TaskProvider
      tasks={tasks}
      onCancelTask={handleCancelTask}
      onRetryTask={handleRetryTask}
      onClearCompleted={handleClearCompleted}
    >
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 首页路由 */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="plugins" element={<Plugins />} />
          <Route path="plugins/:pluginId" element={<PluginRunner />} />
          <Route path="workbench" element={<Workbench />} />
          <Route path="workbench/new" element={<FlowDesigner />} />
          <Route path="workbench/editor/:flowId" element={<FlowDesigner />} />

          {/* 向后兼容重定向 */}
          <Route path="workflow" element={<Navigate to="/workbench" replace />} />
          <Route path="workflows" element={<Navigate to="/workbench" replace />} />
          <Route path="workflows/new" element={<Navigate to="/workbench/new" replace />} />
          <Route path="workflows/editor/:workflowId" element={<Navigate to="/workbench/editor/:workflowId" replace />} />
          <Route path="workflows/:workflowId" element={<Navigate to="/plugins/:workflowId" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
          <Route path="demo" element={<UIDemo />} />
        </Route>
      </Routes>

      {/* 全局浮动球 - 显示任务队列和进度（始终显示）*/}
      <ProgressOrb
        taskCount={taskCount}
        progress={avgProgress}
        isGenerating={taskCount > 0}
        onClickOrb={toggleRightSidebar}
      />
    </TaskProvider>
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
    <ThemeProvider defaultTheme="dark" storageKey="matrix-ui-theme">
      <ProjectProvider>
        <SelectionProvider>
          <SidebarProvider>
            <AppContent />
          </SidebarProvider>
        </SelectionProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
};

export default App;
/**
 * ViewContainer - 插件视图容器
 *
 * Phase 7 H04: UI组件标准化
 * 承载和管理插件的自定义React组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ViewContainerProps,
  ViewContext,
  CustomViewProps,
  ViewState,
  ViewActions
} from '../../shared/types/plugin-view';
import Modal from './common/Modal';
import Toast from './common/Toast';
import './ViewContainer.css';

/**
 * 插件视图容器
 *
 * 功能：
 * - 创建ViewContext并注入到插件组件
 * - 管理视图生命周期
 * - 提供标准化的容器布局（modal/sidebar/fullscreen等）
 * - 处理错误边界
 *
 * 使用示例：
 * ```tsx
 * <ViewContainer
 *   pluginId="novel-to-video"
 *   viewId="chapter-split-panel"
 *   data={initialData}
 *   onComplete={handleComplete}
 * />
 * ```
 */
export const ViewContainer: React.FC<ViewContainerProps> = ({
  pluginId,
  viewId,
  data,
  onComplete,
  onCancel,
  onClose
}) => {
  const navigate = useNavigate();

  // 视图状态
  const [viewState, setViewState] = useState<ViewState>({
    loading: false,
    error: undefined,
    data: data
  });

  // Toast状态
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // 创建ViewContext
  const viewContext: ViewContext = {
    pluginId,
    projectId: undefined, // TODO: 从路由或全局状态获取
    workflowId: undefined,
    callAPI: async (channel: string, ...args: any[]) => {
      // 调用IPC API
      if (window.electronAPI && typeof window.electronAPI[channel as keyof typeof window.electronAPI] === 'function') {
        const api = window.electronAPI[channel as keyof typeof window.electronAPI] as (...args: any[]) => Promise<any>;
        return api(...args);
      }
      throw new Error(`API channel not found: ${channel}`);
    },
    showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
      setToast({ type, message });
    },
    showConfirm: async (title: string, message: string) => {
      return window.confirm(`${title}\n\n${message}`);
    },
    navigate: (path: string) => {
      navigate(path);
    },
    refresh: () => {
      // 触发视图刷新
      setViewState((prev: ViewState) => ({ ...prev, data: { ...prev.data } }));
    },
    storage: {
      get: async (key: string) => {
        const storageKey = `plugin.${pluginId}.${viewId}.${key}`;
        const value = localStorage.getItem(storageKey);
        return value ? JSON.parse(value) : null;
      },
      set: async (key: string, value: any) => {
        const storageKey = `plugin.${pluginId}.${viewId}.${key}`;
        localStorage.setItem(storageKey, JSON.stringify(value));
      },
      remove: async (key: string) => {
        const storageKey = `plugin.${pluginId}.${viewId}.${key}`;
        localStorage.removeItem(storageKey);
      }
    }
  };

  // 视图操作
  const viewActions: ViewActions = {
    setLoading: (loading: boolean) => {
      setViewState((prev: ViewState) => ({ ...prev, loading }));
    },
    setError: (error: Error | null) => {
      setViewState((prev: ViewState) => ({ ...prev, error: error || undefined }));
    },
    updateData: (newData: any) => {
      setViewState((prev: ViewState) => ({ ...prev, data: newData }));
    },
    reset: () => {
      setViewState({
        loading: false,
        error: undefined,
        data: data
      });
    }
  };

  // 处理完成
  const handleComplete = useCallback((result: any) => {
    onComplete?.(result);
    onClose?.();
  }, [onComplete, onClose]);

  // 处理取消
  const handleCancel = useCallback(() => {
    onCancel?.();
    onClose?.();
  }, [onCancel, onClose]);

  // 处理错误
  const handleError = useCallback((error: Error) => {
    viewActions.setError(error);
    viewContext.showToast('error', error.message);
  }, []);

  // 获取视图组件
  // TODO: 从ViewRegistry获取
  const ViewComponent: React.ComponentType<CustomViewProps> | null = null;

  // 如果组件未注册
  if (!ViewComponent) {
    return (
      <div className="view-container-error">
        <p>视图未找到: {pluginId}/{viewId}</p>
        <button onClick={onClose}>关闭</button>
      </div>
    );
  }

  // 渲染视图组件
  const viewProps: CustomViewProps = {
    context: viewContext,
    data: viewState.data,
    onComplete: handleComplete,
    onCancel: handleCancel,
    onError: handleError
  };

  // 此时 ViewComponent 必定不为 null（因为上面已经检查过了）
  const Component = ViewComponent as React.ComponentType<CustomViewProps>;

  return (
    <div className="view-container">
      <Component {...viewProps} />

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

/**
 * withViewContext HOC
 * 为普通React组件注入ViewContext
 */
export function withViewContext<P extends CustomViewProps>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'context'> & { pluginId: string; viewId: string }> {
  return (props) => {
    return (
      <ViewContainer
        pluginId={props.pluginId}
        viewId={props.viewId}
        data={props.data}
        onComplete={props.onComplete}
        onCancel={props.onCancel}
      />
    );
  };
}

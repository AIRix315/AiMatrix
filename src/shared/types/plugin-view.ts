/**
 * Plugin Custom View Protocol - 插件自定义视图协议
 *
 * Phase 7 H04: UI组件标准化
 * 规范插件如何注册和使用自定义React组件
 */

import type { ComponentType } from 'react';

/**
 * 视图上下文
 * 提供给插件组件的运行时上下文
 */
export interface ViewContext {
  /** 项目ID */
  projectId?: string;

  /** 工作流ID */
  workflowId?: string;

  /** 插件ID */
  pluginId: string;

  /** 当前用户 */
  user?: {
    id: string;
    name: string;
  };

  /** IPC API调用 */
  callAPI: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;

  /** 显示Toast通知 */
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;

  /** 显示确认对话框 */
  showConfirm: (title: string, message: string) => Promise<boolean>;

  /** 导航到其他页面 */
  navigate: (path: string) => void;

  /** 刷新当前视图 */
  refresh: () => void;

  /** 自定义数据存储（插件可用） */
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
}

/**
 * 自定义视图Props
 */
export interface CustomViewProps<TData = any> {
  /** 视图上下文 */
  context: ViewContext;

  /** 传入的数据 */
  data?: TData;

  /** 完成回调 */
  onComplete?: (result: unknown) => void;

  /** 取消回调 */
  onCancel?: () => void;

  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 自定义视图组件类型
 */
export type CustomViewComponent<TData = any> = ComponentType<CustomViewProps<TData>>;

/**
 * 视图注册配置
 */
export interface ViewRegistration {
  /** 视图ID（唯一标识） */
  id: string;

  /** 视图类型 */
  type: 'panel' | 'modal' | 'sidebar' | 'fullscreen';

  /** 视图标题 */
  title: string;

  /** 视图描述 */
  description?: string;

  /** 视图图标 */
  icon?: string;

  /** React组件 */
  component: CustomViewComponent;

  /** 视图配置 */
  config?: {
    /** 宽度（modal/sidebar使用） */
    width?: number | string;

    /** 高度（modal使用） */
    height?: number | string;

    /** 是否可调整大小 */
    resizable?: boolean;

    /** 是否可拖动 */
    draggable?: boolean;

    /** 是否显示关闭按钮 */
    closable?: boolean;

    /** 背景遮罩（modal使用） */
    mask?: boolean;
  };

  /** 权限要求 */
  permissions?: string[];

  /** 路由路径（fullscreen使用） */
  route?: string;
}

/**
 * 视图注册表
 */
export interface ViewRegistry {
  /** 注册视图 */
  register(pluginId: string, registration: ViewRegistration): void;

  /** 注销视图 */
  unregister(pluginId: string, viewId: string): void;

  /** 获取视图组件 */
  getView(pluginId: string, viewId: string): CustomViewComponent | undefined;

  /** 获取插件的所有视图 */
  getPluginViews(pluginId: string): ViewRegistration[];

  /** 打开视图 */
  openView(pluginId: string, viewId: string, data?: unknown): Promise<unknown>;

  /** 关闭视图 */
  closeView(pluginId: string, viewId: string): void;
}

/**
 * 视图容器Props
 */
export interface ViewContainerProps {
  /** 插件ID */
  pluginId: string;

  /** 视图ID */
  viewId: string;

  /** 传入数据 */
  data?: unknown;

  /** 完成回调 */
  onComplete?: (result: unknown) => void;

  /** 取消回调 */
  onCancel?: () => void;

  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * Hooks - 视图生命周期钩子
 */
export interface ViewHooks {
  /** 视图即将挂载 */
  onBeforeMount?: (context: ViewContext) => void | Promise<void>;

  /** 视图已挂载 */
  onMounted?: (context: ViewContext) => void | Promise<void>;

  /** 视图即将卸载 */
  onBeforeUnmount?: (context: ViewContext) => void | Promise<void>;

  /** 视图已卸载 */
  onUnmounted?: (context: ViewContext) => void | Promise<void>;

  /** 数据变化 */
  onDataChange?: (newData: unknown, oldData: unknown, context: ViewContext) => void;

  /** 错误处理 */
  onError?: (error: Error, context: ViewContext) => void;
}

/**
 * 视图状态
 */
export interface ViewState {
  /** 是否正在加载 */
  loading: boolean;

  /** 错误信息 */
  error?: Error;

  /** 自定义数据 */
  data?: unknown;
}

/**
 * 视图操作
 */
export interface ViewActions {
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;

  /** 设置错误 */
  setError: (error: Error | null) => void;

  /** 更新数据 */
  updateData: (data: unknown) => void;

  /** 重置状态 */
  reset: () => void;
}

/**
 * 高阶组件：为视图组件注入标准功能
 */
export interface WithViewContext {
  <P extends CustomViewProps>(
    component: ComponentType<P>,
    hooks?: ViewHooks
  ): ComponentType<Omit<P, 'context'>>;
}

/**
 * PanelBase - 通用面板基础组件
 *
 * Phase 7 H04: UI组件标准化
 * 提取工作流面板的通用结构和交互模式
 */

import React, { ReactNode } from 'react';
import Button from './Button';
import Toast from './Toast';
import Loading from './Loading';
import type { ToastType } from './Toast';
import './PanelBase.css';

export interface PanelBaseProps {
  /** 面板标题 */
  title: string;

  /** 面板描述 */
  description?: string;

  /** 面板内容 */
  children: ReactNode;

  /** 是否显示加载状态 */
  loading?: boolean;

  /** 加载提示文本 */
  loadingMessage?: string;

  /** Toast通知 */
  toast?: {
    type: ToastType;
    message: string;
  } | null;

  /** Toast关闭回调 */
  onToastClose?: () => void;

  /** 底部操作按钮 */
  footerActions?: {
    label: string;
    variant?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
    onClick: () => void;
  }[];

  /** 是否显示底部操作栏 */
  showFooter?: boolean;

  /** 自定义类名 */
  className?: string;

  /** 顶部额外内容 */
  headerExtra?: ReactNode;

  /** 底部额外内容（在操作按钮之前） */
  footerExtra?: ReactNode;
}

/**
 * 通用面板基础组件
 *
 * 功能：
 * - 统一的面板布局（header + content + footer）
 * - 集成加载状态和Toast通知
 * - 可配置的底部操作按钮
 *
 * 使用示例：
 * ```tsx
 * <PanelBase
 *   title="章节拆分"
 *   description="上传小说文件，自动拆分为章节"
 *   loading={isLoading}
 *   loadingMessage="正在拆分章节..."
 *   toast={toast}
 *   onToastClose={() => setToast(null)}
 *   footerActions={[
 *     { label: '下一步', variant: 'primary', onClick: handleNext }
 *   ]}
 * >
 *   <div>面板内容</div>
 * </PanelBase>
 * ```
 */
export const PanelBase: React.FC<PanelBaseProps> = ({
  title,
  description,
  children,
  loading = false,
  loadingMessage = '加载中...',
  toast,
  onToastClose,
  footerActions = [],
  showFooter = true,
  className = '',
  headerExtra,
  footerExtra
}) => {
  return (
    <div className={`panel-base ${className}`}>
      {/* 面板头部 */}
      <div className="panel-base-header">
        <div className="panel-base-title-section">
          <h2 className="panel-base-title">{title}</h2>
          {description && (
            <p className="panel-base-description">{description}</p>
          )}
        </div>
        {headerExtra && (
          <div className="panel-base-header-extra">{headerExtra}</div>
        )}
      </div>

      {/* 面板内容 */}
      <div className="panel-base-content">
        {loading ? (
          <Loading size="md" message={loadingMessage} />
        ) : (
          children
        )}
      </div>

      {/* 面板底部 */}
      {showFooter && (footerActions.length > 0 || footerExtra) && (
        <div className="panel-base-footer">
          {footerExtra && (
            <div className="panel-base-footer-extra">{footerExtra}</div>
          )}
          <div className="panel-base-footer-actions">
            {footerActions.map((action, index) => {
              // 映射 variant 类型到 Button 支持的类型
              const buttonVariant: 'primary' | 'ghost' | 'secondary' =
                action.variant === 'primary' ? 'primary' :
                action.variant === 'danger' ? 'primary' : 'secondary';

              return (
                <Button
                  key={index}
                  variant={buttonVariant}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={onToastClose}
        />
      )}
    </div>
  );
};

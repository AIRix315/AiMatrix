/**
 * PluginPanelRenderer - 插件面板渲染器
 *
 * Phase 7 H04: UI组件标准化
 * 根据 PluginPanelConfig JSON配置自动渲染Panel UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PanelBase } from './common/PanelBase';
import { ListSection } from './common/ListSection';
import Button from './common/Button';
import type {
  PluginPanelConfig,
  PanelState,
  PanelEvent,
  PanelHandler,
  PanelField,
  PanelAction,
  PanelTab,
  FieldType
} from '../../shared/types/plugin-panel';
import './PluginPanelRenderer.css';

export interface PluginPanelRendererProps {
  /** Panel配置 */
  config: PluginPanelConfig;

  /** Panel处理器 */
  handler: PanelHandler;

  /** 初始状态 */
  initialState?: Partial<PanelState>;

  /** 完成回调 */
  onComplete?: (data: any) => void;
}

/**
 * 插件面板渲染器
 *
 * 根据JSON配置自动渲染Panel UI，包括：
 * - 表单字段
 * - 操作按钮
 * - 列表展示
 * - 标签页
 *
 * 使用示例：
 * ```tsx
 * <PluginPanelRenderer
 *   config={panelConfig}
 *   handler={panelHandler}
 *   onComplete={handleComplete}
 * />
 * ```
 */
export const PluginPanelRenderer: React.FC<PluginPanelRendererProps> = ({
  config,
  handler,
  initialState,
  onComplete
}) => {
  // 初始化状态
  const [state, setState] = useState<PanelState>({
    values: initialState?.values || {},
    errors: initialState?.errors || {},
    loading: initialState?.loading || false,
    customData: initialState?.customData || {}
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // 初始化字段默认值
  useEffect(() => {
    const defaultValues: Record<string, any> = {};
    config.fields?.forEach((field: PanelField) => {
      if (field.defaultValue !== undefined && state.values[field.id] === undefined) {
        defaultValues[field.id] = field.defaultValue;
      }
    });

    if (Object.keys(defaultValues).length > 0) {
      setState((prev: PanelState) => ({
        ...prev,
        values: { ...defaultValues, ...prev.values }
      }));
    }

    // 调用初始化钩子
    if (config.hooks?.onInit) {
      // TODO: 执行钩子函数
    }
  }, [config]);

  /**
   * 处理字段值变化
   */
  const handleFieldChange = useCallback(async (fieldId: string, value: any) => {
    const newState: PanelState = {
      ...state,
      values: {
        ...state.values,
        [fieldId]: value
      },
      errors: {
        ...state.errors,
        [fieldId]: '' // 清除该字段的错误
      }
    };

    setState(newState);

    // 触发事件
    const event: PanelEvent = {
      type: 'fieldChange',
      sourceId: fieldId,
      data: value,
      state: newState
    };

    await handler.handleEvent(event);

    // 调用值变化钩子
    if (config.hooks?.onValueChange) {
      // TODO: 执行钩子函数
    }
  }, [state, config, handler]);

  /**
   * 处理操作按钮点击
   */
  const handleActionClick = useCallback(async (action: PanelAction) => {
    // 检查是否需要确认
    if (action.confirm) {
      const confirmed = window.confirm(`${action.confirm.title}\n\n${action.confirm.message}`);
      if (!confirmed) {
        return;
      }
    }

    const event: PanelEvent = {
      type: 'actionClick',
      sourceId: action.id,
      state
    };

    setState((prev: PanelState) => ({ ...prev, loading: true }));

    try {
      if (action.actionType === 'submit') {
        // 验证表单
        const errors = await handler.validate(state);
        if (Object.keys(errors).length > 0) {
          setState((prev: PanelState) => ({ ...prev, errors, loading: false }));
          setToast({
            type: 'error',
            message: '表单验证失败，请检查输入'
          });
          return;
        }

        // 提交表单
        const result = await handler.submit(state);
        onComplete?.(result);
      } else if (action.actionType === 'next') {
        onComplete?.(state.values);
      } else if (action.handler) {
        // 执行自定义处理器
        await handler.handleEvent(event);
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: `操作失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setState((prev: PanelState) => ({ ...prev, loading: false }));
    }
  }, [state, handler, onComplete, config]);

  /**
   * 渲染表单字段
   */
  const renderField = (field: PanelField) => {
    // 检查条件显示
    if (field.visibleWhen) {
      const dependValue = state.values[field.visibleWhen.field];
      const shouldShow = evaluateCondition(dependValue, field.visibleWhen.operator, field.visibleWhen.value);
      if (!shouldShow) {
        return null;
      }
    }

    const value = state.values[field.id];
    const error = state.errors[field.id];

    return (
      <div key={field.id} className="panel-field">
        <label className="panel-field-label">
          {field.label}
          {field.required && <span className="required-mark">*</span>}
        </label>

        {renderFieldInput(field, value, (newValue) => handleFieldChange(field.id, newValue))}

        {field.help && <p className="panel-field-help">{field.help}</p>}
        {error && <p className="panel-field-error">{error}</p>}
      </div>
    );
  };

  /**
   * 渲染字段输入组件
   */
  const renderFieldInput = (field: PanelField, value: any, onChange: (value: any) => void) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className="panel-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="panel-textarea"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="panel-input"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={field.placeholder}
            disabled={field.disabled}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      case 'select':
        return (
          <select
            className="panel-select"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={field.disabled}
          >
            <option value="">请选择...</option>
            {field.options?.map((opt: { value: string | number; label: string; disabled?: boolean }) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            className="panel-checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            disabled={field.disabled}
          />
        );

      case 'file':
        return (
          <div className="panel-file-input">
            <Button
              onClick={() => {
                // TODO: 打开文件选择对话框
                // const path = await window.electronAPI.selectFile({ filters: field.fileFilters });
                // onChange(path);
              }}
              disabled={field.disabled}
            >
              选择文件
            </Button>
            {value && <span className="file-path">{value}</span>}
          </div>
        );

      default:
        return <div>不支持的字段类型: {field.type}</div>;
    }
  };

  /**
   * 渲染操作按钮
   */
  const renderActions = () => {
    if (!config.actions || config.actions.length === 0) {
      return [];
    }

    return config.actions.map((action: PanelAction) => {
      // 检查禁用条件
      let disabled = action.disabled || false;
      if (action.disabledWhen) {
        disabled = action.disabledWhen.some((condition: { field: string; operator: string; value?: any }) => {
          const fieldValue = state.values[condition.field];
          return evaluateCondition(fieldValue, condition.operator, condition.value);
        });
      }

      return {
        label: action.icon ? `${action.icon} ${action.label}` : action.label,
        variant: action.variant,
        disabled,
        onClick: () => handleActionClick(action)
      };
    });
  };

  /**
   * 渲染列表或标签页
   */
  const renderListOrTabs = () => {
    if (config.tabs && config.tabs.length > 0) {
      // 渲染标签页模式
      const tabs = config.tabs.map((tab: PanelTab) => ({
        id: tab.id,
        label: tab.label,
        items: (state.values[tab.dataSource] || []).map((item: any, index: number) => ({
          id: item.id || `item-${index}`,
          title: item[tab.list?.itemTemplate.titleField || 'title'],
          tag: tab.list?.itemTemplate.tagField ? item[tab.list.itemTemplate.tagField] : undefined,
          info: tab.list?.itemTemplate.infoField ? item[tab.list.itemTemplate.infoField] : undefined,
          thumbnail: tab.list?.itemTemplate.thumbnailField ? item[tab.list.itemTemplate.thumbnailField] : undefined,
          data: item
        }))
      }));

      return <ListSection tabs={tabs} />;
    } else if (config.list) {
      // 渲染单列表模式
      const list = config.list; // 保存引用以避免重复空值检查
      const items = (state.values[list.dataSource] || []).map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        title: item[list.itemTemplate.titleField],
        tag: list.itemTemplate.tagField ? item[list.itemTemplate.tagField] : undefined,
        info: list.itemTemplate.infoField ? item[list.itemTemplate.infoField] : undefined,
        thumbnail: list.itemTemplate.thumbnailField ? item[list.itemTemplate.thumbnailField] : undefined,
        data: item
      }));

      return <ListSection items={items} emptyText={list.emptyText} />;
    }

    return null;
  };

  return (
    <PanelBase
      title={config.title}
      description={config.description}
      loading={state.loading}
      loadingMessage={config.loadingMessage}
      toast={toast}
      onToastClose={() => setToast(null)}
      footerActions={renderActions()}
      className={config.className}
    >
      {/* 表单字段 */}
      {config.fields && config.fields.length > 0 && (
        <div className={`panel-fields panel-layout-${config.layout || 'vertical'}`}>
          {config.fields.map((field: PanelField) => renderField(field))}
        </div>
      )}

      {/* 列表或标签页 */}
      {renderListOrTabs()}
    </PanelBase>
  );
};

/**
 * 评估条件表达式
 */
function evaluateCondition(value: any, operator: string, targetValue: any): boolean {
  switch (operator) {
    case '=':
      return value === targetValue;
    case '!=':
      return value !== targetValue;
    case '>':
      return value > targetValue;
    case '<':
      return value < targetValue;
    case '>=':
      return value >= targetValue;
    case '<=':
      return value <= targetValue;
    case 'empty':
      return !value || (Array.isArray(value) && value.length === 0);
    case 'notEmpty':
      return !!value && (!Array.isArray(value) || value.length > 0);
    default:
      return false;
  }
}

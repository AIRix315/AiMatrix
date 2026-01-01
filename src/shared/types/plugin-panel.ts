/**
 * Plugin Panel Protocol - 插件面板配置协议
 *
 * Phase 7 H04: UI组件标准化
 * 允许插件通过JSON声明式配置Panel UI
 */

/**
 * 表单字段类型
 */
export type FieldType =
  | 'text'          // 文本输入
  | 'textarea'      // 多行文本
  | 'number'        // 数字输入
  | 'select'        // 下拉选择
  | 'multiselect'   // 多选下拉
  | 'checkbox'      // 复选框
  | 'radio'         // 单选按钮
  | 'file'          // 文件选择
  | 'date'          // 日期选择
  | 'slider'        // 滑块
  | 'color';        // 颜色选择器

/**
 * 表单字段选项
 */
export interface FieldOption {
  /** 选项值 */
  value: string | number;

  /** 选项标签 */
  label: string;

  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 表单字段配置
 */
export interface PanelField {
  /** 字段ID（唯一标识） */
  id: string;

  /** 字段标签 */
  label: string;

  /** 字段类型 */
  type: FieldType;

  /** 默认值 */
  defaultValue?: unknown;

  /** 占位符文本 */
  placeholder?: string;

  /** 帮助提示文本 */
  help?: string;

  /** 是否必填 */
  required?: boolean;

  /** 是否禁用 */
  disabled?: boolean;

  /** 字段选项（select/multiselect/radio使用） */
  options?: FieldOption[];

  /** 最小值（number/slider使用） */
  min?: number;

  /** 最大值（number/slider使用） */
  max?: number;

  /** 步进值（number/slider使用） */
  step?: number;

  /** 文件过滤器（file使用） */
  fileFilters?: Array<{
    name: string;
    extensions: string[];
  }>;

  /** 验证规则 */
  validation?: {
    pattern?: string;        // 正则表达式
    minLength?: number;      // 最小长度
    maxLength?: number;      // 最大长度
    customValidator?: string; // 自定义验证函数名
  };

  /** 条件显示（依赖其他字段的值） */
  visibleWhen?: {
    field: string;           // 依赖字段ID
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
    value: unknown;
  };
}

/**
 * 操作按钮配置
 */
export interface PanelAction {
  /** 按钮ID */
  id: string;

  /** 按钮标签 */
  label: string;

  /** 按钮样式 */
  variant?: 'default' | 'primary' | 'danger';

  /** 按钮图标 */
  icon?: string;

  /** 是否禁用 */
  disabled?: boolean;

  /** 禁用条件（依赖字段值） */
  disabledWhen?: {
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'empty' | 'notEmpty';
    value?: unknown;
  }[];

  /** 操作类型 */
  actionType: 'submit' | 'custom' | 'next' | 'previous' | 'cancel';

  /** 自定义操作处理函数名 */
  handler?: string;

  /** 确认提示（可选） */
  confirm?: {
    title: string;
    message: string;
  };
}

/**
 * 列表展示配置
 */
export interface PanelList {
  /** 列表ID */
  id: string;

  /** 列表标题 */
  title?: string;

  /** 数据源字段ID */
  dataSource: string;

  /** 列表项渲染模板 */
  itemTemplate: {
    /** 标题字段 */
    titleField: string;

    /** 标签字段 */
    tagField?: string;

    /** 描述字段 */
    infoField?: string;

    /** 缩略图字段 */
    thumbnailField?: string;
  };

  /** 是否可点击 */
  clickable?: boolean;

  /** 点击处理函数名 */
  onClickHandler?: string;

  /** 空状态提示 */
  emptyText?: string;
}

/**
 * 标签页配置
 */
export interface PanelTab {
  /** 标签页ID */
  id: string;

  /** 标签页标题 */
  label: string;

  /** 数据源字段ID */
  dataSource: string;

  /** 列表配置 */
  list?: PanelList;
}

/**
 * Panel配置协议
 */
export interface PluginPanelConfig {
  /** Panel ID（唯一标识） */
  id: string;

  /** Panel标题 */
  title: string;

  /** Panel描述 */
  description?: string;

  /** 表单字段配置 */
  fields?: PanelField[];

  /** 操作按钮配置 */
  actions?: PanelAction[];

  /** 列表展示配置 */
  list?: PanelList;

  /** 标签页配置 */
  tabs?: PanelTab[];

  /** 加载状态字段ID */
  loadingField?: string;

  /** 加载提示文本 */
  loadingMessage?: string;

  /** 布局方式 */
  layout?: 'vertical' | 'horizontal' | 'grid';

  /** 自定义CSS类名 */
  className?: string;

  /** 生命周期钩子 */
  hooks?: {
    /** 初始化钩子 */
    onInit?: string;

    /** 值变化钩子 */
    onValueChange?: string;

    /** 提交前验证钩子 */
    beforeSubmit?: string;

    /** 提交后钩子 */
    afterSubmit?: string;
  };
}

/**
 * Panel运行时状态
 */
export interface PanelState {
  /** 字段值映射 */
  values: Record<string, unknown>;

  /** 字段错误映射 */
  errors: Record<string, string>;

  /** 加载状态 */
  loading: boolean;

  /** 自定义数据（插件可扩展） */
  customData?: Record<string, unknown>;
}

/**
 * Panel事件
 */
export interface PanelEvent {
  /** 事件类型 */
  type: 'fieldChange' | 'actionClick' | 'submit' | 'cancel';

  /** 事件源字段/按钮ID */
  sourceId: string;

  /** 事件数据 */
  data?: unknown;

  /** 当前Panel状态 */
  state: PanelState;
}

/**
 * Panel处理器接口
 */
export interface PanelHandler {
  /** 处理Panel事件 */
  handleEvent(event: PanelEvent): Promise<PanelState | void>;

  /** 验证表单 */
  validate(state: PanelState): Promise<Record<string, string>>;

  /** 提交表单 */
  submit(state: PanelState): Promise<unknown>;
}

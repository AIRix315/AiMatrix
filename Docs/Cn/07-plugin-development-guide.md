# Matrix Studio 插件开发指南

> **版本**: v1.0.0
> **日期**: 2025-01-XX
> **Phase**: 7 - 架构标准化与API固化

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API参考](#api参考)
- [最佳实践](#最佳实践)
- [示例插件](#示例插件)
- [故障排查](#故障排查)

---

## 概述

Matrix Studio 插件系统允许开发者扩展平台功能，添加自定义工作流、工具和UI组件。

### 插件类型

- **工作流插件**: 实现完整的业务流程（如小说转视频）
- **工具插件**: 提供独立功能模块（如图片处理、文本分析）
- **集成插件**: 连接第三方服务（如云存储、AI API）
- **UI插件**: 添加自定义界面组件

### 技术栈

- **语言**: TypeScript 5.0+
- **运行时**: Node.js 20+ (主进程), Chromium (渲染进程)
- **框架**: React 18 (UI组件)
- **SDK**: @matrix/sdk

---

## 快速开始

### 1. 安装脚手架工具

```bash
npm install -g @matrix/create-plugin
```

### 2. 创建新插件

```bash
create-matrix-plugin my-awesome-plugin
cd my-awesome-plugin
npm install
```

### 3. 开发模式

```bash
npm run watch
```

### 4. 构建插件

```bash
npm run build
```

### 5. 测试插件

将插件目录链接到Matrix Studio：

```bash
# 在Matrix Studio的plugins目录中创建符号链接
ln -s /path/to/my-awesome-plugin /path/to/matrix/plugins/community/my-awesome-plugin
```

---

## 核心概念

### Plugin接口

每个插件必须实现 `Plugin` 接口：

```typescript
import { Plugin, PluginContext, PluginMetadata } from '@matrix/sdk';

export class MyPlugin implements Plugin {
  readonly metadata: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Plugin description',
    author: 'Your Name',
    license: 'MIT'
  };

  async activate(context: PluginContext): Promise<void> {
    // 插件激活逻辑
  }

  async deactivate(context: PluginContext): Promise<void> {
    // 插件卸载逻辑
  }
}
```

### PluginContext

`PluginContext` 提供访问Matrix功能的接口：

```typescript
interface PluginContext {
  // 日志服务
  logger: Logger;

  // Schema注册表
  schemaRegistry: SchemaRegistry;

  // 资产操作助手
  assetHelper: GenericAssetHelper;

  // 任务调度器
  taskScheduler: TaskScheduler;

  // API管理器
  apiManager: APIManager;

  // MCP客户端
  mcpClient: MCPClient;

  // 时间服务
  timeService: TimeService;
}
```

### JSON Schema注册

定义自定义资产类型：

```typescript
import type { AssetSchemaDefinition } from '@matrix/sdk';

export const MySchema: Omit<AssetSchemaDefinition, 'id' | 'pluginId' | 'registeredAt' | 'active'> = {
  name: '我的资产类型',
  description: '资产描述',
  version: '1.0.0',
  tags: ['my-plugin', 'custom'],
  schema: {
    type: 'object',
    properties: {
      customId: {
        type: 'string',
        description: '自定义ID',
        pattern: '^my-[0-9]+$'
      },
      customName: {
        type: 'string',
        description: '名称',
        minLength: 1,
        maxLength: 100
      },
      customData: {
        type: 'object',
        description: '自定义数据'
      }
    },
    required: ['customId', 'customName']
  },
  examples: [
    {
      customId: 'my-123',
      customName: '示例',
      customData: { foo: 'bar' }
    }
  ]
};

// 在activate中注册
await context.schemaRegistry.registerSchema(this.metadata.id, MySchema);
```

### 使用GenericAssetHelper

创建和查询资产：

```typescript
// 创建资产
const asset = await context.assetHelper.createAsset({
  schemaId: 'my-plugin.my-schema',
  projectId: 'project-123',
  category: 'my-category',
  type: 'text',
  tags: ['tag1', 'tag2'],
  customFields: {
    customId: 'my-123',
    customName: '示例',
    customData: { foo: 'bar' }
  }
});

// 查询资产
const assets = await context.assetHelper.queryAssets({
  schemaId: 'my-plugin.my-schema',
  projectId: 'project-123',
  limit: 100,
  customFieldsFilter: {
    customName: '示例'
  }
});

// 更新资产
await context.assetHelper.updateAssetCustomFields(asset.filePath, {
  customName: '新名称',
  customData: { foo: 'baz' }
});
```

### MCP工具封装

将本地工具封装为MCP Tool：

```typescript
import { MCPTool, MCPToolParams, MCPToolResult } from '@matrix/sdk';

export interface MyToolParams extends MCPToolParams {
  input: string;
  options?: {
    flag1?: boolean;
    flag2?: string;
  };
}

export interface MyToolResult extends MCPToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class MyTool implements MCPTool<MyToolParams, MyToolResult> {
  readonly id = 'my-tool';
  readonly name = '我的工具';
  readonly description = '工具描述';
  readonly server = 'local-my-tool-server';

  async execute(params: MyToolParams): Promise<MyToolResult> {
    // 验证参数
    this.validateParams(params);

    // 构建MCP请求
    const mcpRequest = {
      server: this.server,
      tool: 'my-tool',
      method: 'execute',
      params: {
        input: params.input,
        ...params.options
      }
    };

    // 通过MCP客户端调用
    // 实际实现中，这个方法会被注入到Plugin Context中
    throw new Error('MyTool.execute需要通过PluginContext调用');
  }

  private validateParams(params: MyToolParams): void {
    if (!params.input || params.input.trim().length === 0) {
      throw new Error('input参数不能为空');
    }
  }
}
```

### 任务调度

创建和管理异步任务：

```typescript
// 创建任务
const taskId = await context.taskScheduler.createTask({
  type: 'API_CALL',
  name: '生成图片',
  metadata: {
    taskType: 'my-plugin:generate-image',
    projectId,
    params: { prompt: '示例' }
  }
});

// 查询任务状态
const task = await context.taskScheduler.getTaskStatus(taskId);

// 等待任务完成
while (task.status !== 'completed' && task.status !== 'failed') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  task = await context.taskScheduler.getTaskStatus(taskId);
}
```

### UI组件开发

#### 方式1: JSON配置（PluginPanelProtocol）

```typescript
import type { PluginPanelConfig } from '@matrix/sdk';

const panelConfig: PluginPanelConfig = {
  id: 'my-panel',
  title: '我的面板',
  description: '面板描述',
  fields: [
    {
      id: 'inputFile',
      label: '输入文件',
      type: 'file',
      required: true,
      fileFilters: [{ name: 'Text', extensions: ['txt'] }]
    },
    {
      id: 'option1',
      label: '选项1',
      type: 'select',
      options: [
        { value: 'a', label: '选项A' },
        { value: 'b', label: '选项B' }
      ]
    }
  ],
  actions: [
    {
      id: 'submit',
      label: '提交',
      variant: 'primary',
      actionType: 'submit'
    }
  ]
};
```

#### 方式2: 自定义React组件

```typescript
import React from 'react';
import { CustomViewProps, ViewContext } from '@matrix/sdk';

export const MyCustomPanel: React.FC<CustomViewProps> = ({
  context,
  data,
  onComplete,
  onCancel
}) => {
  const [state, setState] = React.useState({});

  const handleSubmit = async () => {
    try {
      // 调用IPC API
      const result = await context.callAPI('my-plugin:do-something', data);

      // 显示通知
      context.showToast('success', '操作成功');

      // 完成回调
      onComplete(result);
    } catch (error) {
      context.showToast('error', `操作失败: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>我的自定义面板</h2>
      <button onClick={handleSubmit}>提交</button>
    </div>
  );
};
```

---

## API参考

### Logger

```typescript
await context.logger.debug('调试信息', 'MyPlugin', { data: 123 });
await context.logger.info('普通信息', 'MyPlugin');
await context.logger.warn('警告信息', 'MyPlugin');
await context.logger.error('错误信息', 'MyPlugin', { error });
```

### SchemaRegistry

```typescript
// 注册Schema
await context.schemaRegistry.registerSchema(pluginId, schemaDefinition);

// 查询Schema
const schemas = context.schemaRegistry.querySchemas({ name: '章节' });

// 验证数据
const result = await context.schemaRegistry.validateData(schemaId, data);
```

### TimeService

```typescript
// 获取当前时间（NTP同步）
const currentTime = await context.timeService.getCurrentTime();

// 格式化时间
const formatted = context.timeService.formatTime(currentTime, 'YYYY-MM-DD HH:mm:ss');

// 验证时间戳
const isValid = await context.timeService.validateTimestamp(timestamp);
```

---

## 最佳实践

### 1. 错误处理

```typescript
async activate(context: PluginContext): Promise<void> {
  try {
    // 插件逻辑
  } catch (error) {
    await context.logger.error('插件激活失败', 'MyPlugin', { error });
    throw error; // 重新抛出，让Matrix处理
  }
}
```

### 2. 使用时间服务

```typescript
// ❌ 错误 - 不要直接使用 Date.now()
const timestamp = Date.now();

// ✅ 正确 - 使用 TimeService
const currentTime = await context.timeService.getCurrentTime();
const timestamp = currentTime.getTime();
```

### 3. 资产管理

```typescript
// 使用 schemaId 而不是硬编码类型
const assets = await context.assetHelper.queryAssets({
  schemaId: 'my-plugin.my-schema', // ✅ 正确
  // type: 'my-type', // ❌ 错误
  projectId,
  limit: 100
});
```

### 4. 日志记录

```typescript
// 关键操作前后记录日志
await context.logger.info('开始处理', 'MyService', { id: 123 });
const result = await processData();
await context.logger.info('处理完成', 'MyService', { result });
```

### 5. 清理资源

```typescript
async deactivate(context: PluginContext): Promise<void> {
  // 取消监听器
  // 关闭连接
  // 清理临时文件
  await context.logger.info('插件已卸载', 'MyPlugin');
}
```

---

## 示例插件

完整示例请参考：`plugins/official/novel-to-video`

该插件演示了：
- ✅ 5个JSON Schema定义
- ✅ 2个MCP工具封装（FFmpeg, ComfyUI）
- ✅ 5个业务服务（章节拆分、场景提取、资源生成、分镜、配音）
- ✅ 完整的依赖注入和错误处理

---

## 故障排查

### 插件未加载

1. 检查 `manifest.json` 格式是否正确
2. 检查 `entryPoint` 路径是否正确
3. 查看 Matrix 日志：`~/.matrix/logs/`

### Schema注册失败

1. 确认 `schema.id` 唯一性
2. 检查 JSON Schema 格式
3. 验证 `required` 字段是否存在于 `properties` 中

### MCP工具调用失败

1. 确认 MCP 服务已启动
2. 检查 `server` 配置是否正确
3. 验证参数格式

### UI组件不显示

1. 确认组件已注册到 ViewRegistry
2. 检查 React 组件语法错误
3. 查看浏览器控制台错误

---

## 联系我们

- **文档**: https://matrix.studio/docs
- **问题反馈**: https://github.com/matrix-studio/matrix/issues
- **社区**: https://discord.gg/matrix-studio

---

**祝开发愉快！** 🚀

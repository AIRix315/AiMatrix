# Matrix Studio 插件开发指南 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 更新 | 精简冗余章节，补充关键参考 |
| 1.0.0 | 2025-01-XX | 初始版本 | 创建插件开发指南 |

---

## 快速开始

```bash
# 安装脚手架工具
npm install -g @matrix/create-plugin

# 创建新插件
create-matrix-plugin my-plugin
cd my-plugin
npm install

# 开发模式
npm run watch

# 构建
npm run build
```

---

## 核心概念

### Plugin接口

```typescript
import { Plugin, PluginContext, PluginMetadata } from '@matrix/sdk';

export class MyPlugin implements Plugin {
  readonly metadata: PluginMetadata = {
    id: 'my-plugin',
    name: '我的插件',
    version: '1.0.0',
    description: '插件描述',
    author: '你的名字',
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

```typescript
interface PluginContext {
  logger: Logger
  schemaRegistry: SchemaRegistry
  assetHelper: GenericAssetHelper
  taskScheduler: TaskScheduler
  apiManager: APIManager
  timeService: TimeService
}
```

---

## JSON Schema注册

```typescript
export const MySchema: AssetSchemaDefinition = {
  name: '我的资产类型',
  description: '资产描述',
  version: '1.0.0',
  tags: ['my-plugin', 'custom'],
  schema: {
    type: 'object',
    properties: {
      customId: { type: 'string', pattern: '^my-[0-9]+$' },
      customName: { type: 'string', minLength: 1, maxLength: 100 }
    },
    required: ['customId', 'customName']
  }
};

// 在activate中注册
await context.schemaRegistry.registerSchema(this.metadata.id, MySchema);
```

---

## 使用GenericAssetHelper

```typescript
// 创建资产
const asset = await context.assetHelper.createAsset({
  schemaId: 'my-plugin.my-schema',
  projectId: 'project-123',
  category: 'my-category',
  type: 'text',
  tags: ['tag1'],
  customFields: { customId: 'my-123', customName: '示例' }
});

// 查询资产
const assets = await context.assetHelper.queryAssets({
  schemaId: 'my-plugin.my-schema',
  projectId: 'project-123',
  limit: 100
});
```

---

## 最佳实践

### 1. 时间处理 ⚠️ 强制要求

```typescript
// ✅ 正确 - 使用TimeService
const currentTime = await context.timeService.getCurrentTime();
const timestamp = currentTime.getTime();

// ❌ 错误 - 直接使用Date.now()
const timestamp = Date.now(); // 禁止
```

### 2. 错误处理

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

### 3. 清理资源

```typescript
async deactivate(context: PluginContext): Promise<void> {
  // 取消监听器
  // 关闭连接
  // 清理临时文件
  await context.logger.info('插件已卸载', 'MyPlugin');
}
```

---

## 参考实现

**示例插件**: `plugins/official/novel-to-video`

演示了：
- 5个JSON Schema定义
- 2个MCP工具封装（FFmpeg、ComfyUI）
- 5个业务服务（章节拆分、场景提取、资源生成、分镜、配音）
- 完整的依赖注入和错误处理

---

## 故障排查

### 插件未加载
1. 检查 `manifest.json` 格式
2. 验证 `entryPoint` 路径
3. 查看Matrix日志: `~/.matrix/logs/`

### Schema注册失败
1. 确认 `schema.id` 唯一性
2. 检查JSON Schema格式
3. 验证 `required` 字段存在于 `properties` 中

---

**English Version**: `docs/en/07-plugin-development-guide-v1.1.0.md`

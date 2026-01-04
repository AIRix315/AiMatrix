# Plugin Development Guide v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Update | Removed redundant sections, added key references |
| 1.0.0 | 2025-01-XX | Initial | Created plugin development guide |

---

## Quick Start

```bash
# Install scaffolding tool
npm install -g @matrix/create-plugin

# Create new plugin
create-matrix-plugin my-plugin
cd my-plugin
npm install

# Development mode
npm run watch

# Build
npm run build
```

---

## Core Concepts

### Plugin Interface

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
    // Plugin activation logic
  }

  async deactivate(context: PluginContext): Promise<void> {
    // Plugin cleanup logic
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

## JSON Schema Registration

```typescript
export const MySchema: AssetSchemaDefinition = {
  name: 'My Asset Type',
  description: 'Asset description',
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

// Register in activate()
await context.schemaRegistry.registerSchema(this.metadata.id, MySchema);
```

---

## Using GenericAssetHelper

```typescript
// Create asset
const asset = await context.assetHelper.createAsset({
  schemaId: 'my-plugin.my-schema',
  projectId: 'project-123',
  category: 'my-category',
  type: 'text',
  tags: ['tag1'],
  customFields: { customId: 'my-123', customName: 'Example' }
});

// Query assets
const assets = await context.assetHelper.queryAssets({
  schemaId: 'my-plugin.my-schema',
  projectId: 'project-123',
  limit: 100
});
```

---

## Best Practices

### 1. Time Handling ⚠️ CRITICAL

```typescript
// ✅ Correct - Use TimeService
const currentTime = await context.timeService.getCurrentTime();
const timestamp = currentTime.getTime();

// ❌ Wrong - Direct Date.now()
const timestamp = Date.now(); // FORBIDDEN
```

### 2. Error Handling

```typescript
async activate(context: PluginContext): Promise<void> {
  try {
    // Plugin logic
  } catch (error) {
    await context.logger.error('Activation failed', 'MyPlugin', { error });
    throw error; // Re-throw for Matrix to handle
  }
}
```

### 3. Resource Cleanup

```typescript
async deactivate(context: PluginContext): Promise<void> {
  // Cancel listeners
  // Close connections
  // Clean up temp files
  await context.logger.info('Plugin unloaded', 'MyPlugin');
}
```

---

## Reference Implementation

**Example Plugin**: `plugins/official/novel-to-video`

Demonstrates:
- 5 JSON Schema definitions
- 2 MCP tool wrappers (FFmpeg, ComfyUI)
- 5 business services (chapter splitting, scene extraction, resource generation, storyboard, voiceover)
- Complete dependency injection and error handling

---

## Troubleshooting

### Plugin Not Loading
1. Check `manifest.json` format
2. Verify `entryPoint` path
3. Check Matrix logs: `~/.matrix/logs/`

### Schema Registration Failed
1. Ensure `schema.id` uniqueness
2. Verify JSON Schema format
3. Confirm `required` fields exist in `properties`

---

**中文版本**: `docs/07-plugin-development-guide-v1.1.0.md`

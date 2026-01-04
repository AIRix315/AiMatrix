# NovelVideoAPIService 重构指南

## Phase 9 E03: 项目级插件配置管理

### 重构目标

将 `NovelVideoAPIService` 从硬编码的 API 调用改为动态读取项目配置的 Provider 调用。

---

## 重构对比

### 旧代码（硬编码）

```typescript
async generateSceneImage(projectId: string, sceneAssetPath: string): Promise<string> {
  // 硬编码调用 T8Star API
  const imageUrl = await this.apiManager.callT8StarImage(prompt, {
    model: 'nano-banana',  // 硬编码模型
    aspectRatio: '16:9'
  });
}
```

### 新代码（动态配置）

```typescript
// 构造函数中加载配置
constructor(projectId: string, context: PluginContext) {
  this.projectId = projectId;
  await this.loadProjectConfig();
}

async generateSceneImage(sceneAssetPath: string): Promise<string> {
  // 从配置读取 Provider
  const { providerId, model, params } = this.pluginConfig.providers.imageGeneration;
  const provider = await this.apiManager.getProvider(providerId);

  // 动态调用
  const imageUrl = await this.callImageProvider(provider, {
    prompt,
    model,
    ...params
  });
}
```

---

## 实施步骤

### 1. 修改构造函数

```typescript
export class NovelVideoAPIService {
  private projectId: string;
  private pluginConfig: PluginConfig | null = null;

  constructor(projectId: string, apiManager: APIManager, context: PluginContext) {
    this.projectId = projectId;
    this.apiManager = apiManager;
    this.assetHelper = context.assetHelper;
    this.logger = context.logger;
  }

  async loadProjectConfig(): Promise<void> {
    // 从 IPC 调用获取配置（插件环境中无法直接访问 projectPluginConfigManager）
    this.pluginConfig = await /* 通过 context 获取配置 */;
  }
}
```

### 2. 添加动态 Provider 调用方法

```typescript
/**
 * 动态调用图像生成 Provider
 */
private async callImageProvider(
  provider: APIProviderConfig,
  params: { prompt: string; model: string; aspectRatio?: string }
): Promise<string> {
  // 根据 Provider 类型调用不同的 API
  switch (provider.id) {
    case 't8star-image':
    case 'stability-ai':
      return await this.apiManager.callImageGeneration(provider, params);
    case 'comfyui-local':
      return await this.apiManager.callComfyUIWorkflow(provider, params);
    default:
      throw new Error(`Unsupported image provider: ${provider.id}`);
  }
}
```

### 3. 重构现有方法

对以下方法进行重构：
- ✅ `generateSceneImage` - 场景图片生成
- ✅ `generateCharacterImage` - 角色图片生成
- ✅ `generateStoryboardVideo` - 分镜视频生成
- ✅ `generateDialogueAudio` - 对白音频生成

---

## 配置验证

在插件激活时验证配置：

```typescript
// plugins/official/novel-to-video/src/index.ts
async activate(context: PluginContext): Promise<void> {
  // 验证项目配置（如果有 projectId）
  if (this.projectId) {
    const validation = await context.validatePluginConfig(this.projectId, 'novel-to-video');
    if (!validation.valid) {
      throw new Error(
        `插件配置不完整，缺少以下Provider:\n${validation.missingProviders.join('\n')}`
      );
    }
  }

  // 初始化服务...
}
```

---

## 注意事项

1. **插件环境限制**：插件无法直接访问主进程服务，需通过 PluginContext 提供的 API
2. **配置缓存**：加载配置后缓存在内存中，避免频繁读取文件
3. **错误处理**：Provider 调用失败时提供清晰的错误信息（如 "图像生成Provider未配置"）
4. **向后兼容**：如果没有配置文件，使用默认 Provider（保证旧项目继续工作）

---

## 完成标志

- [x] ProjectPluginConfigManager 服务创建
- [x] IPC 通道注册
- [ ] NovelVideoAPIService 重构
- [ ] 插件激活时配置验证
- [ ] 右侧面板 UI 实现

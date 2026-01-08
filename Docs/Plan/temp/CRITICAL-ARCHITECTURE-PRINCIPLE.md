# 🔴 核心架构原则：模型优先于供应商

> **创建时间**: 2026-01-07
> **重要程度**: ⚠️ 最高优先级 - 影响全局架构设计
> **状态**: 已纠正错误理解

---

## ❌ 错误的理解（已纠正）

**错误做法**：
- 将 JiekouAI 当作核心对象，提取 `JiekouAIProvider.ts`
- 认为 Provider = 供应商
- 插件硬编码供应商 ID（如 `"providerId": "jiekou-ai-t2i"`）

**问题**：
- 如果没有 JiekouAI 的 API Key，就无法使用 Sora2 模型
- 切换供应商需要修改代码
- 无法实现同一模型的多供应商冗余

---

## ✅ 正确的架构原则

### 核心概念

**Provider ≠ 供应商，Provider = 路由层**

```
用户关注：我要用 Sora2 模型生成视频
   ↓
插件配置：指定模型 "sora-2"
   ↓
Provider 路由层：查询哪些供应商支持 "sora-2"
   ↓
供应商列表：JiekouAI / T8Star / ComfyUI（本地）
   ↓
智能选择：根据成本/速度/可用性选择一个
   ↓
API 适配：调用该供应商的 API 格式
```

### 模型 vs 供应商

| 维度 | 模型 | 供应商 |
|-----|------|--------|
| **定义** | AI 算法实现（Sora2、SD3-Large、GPT-4） | 提供模型访问的服务商 |
| **来源** | 厂家（OpenAI、Stability AI）或开源社区 | JiekouAI、T8Star、ComfyUI、RunningHub |
| **用户关注** | ✅ 我要用什么模型 | ❌ 不关心从哪里调用 |
| **插件配置** | ✅ 指定模型名称 | ❌ 不硬编码供应商 |
| **可替换性** | 固定（Sora2 就是 Sora2） | 灵活（可切换供应商） |

### 架构示例

#### 1. 插件配置（关注模型）

```json
{
  "workflow": {
    "models": {
      "videoGeneration": "sora-2",        // 指定模型，不指定供应商
      "imageGeneration": "sd3-large",
      "llm": "gpt-4"
    }
  }
}
```

#### 2. Provider 配置（供应商 + 模型支持列表）

```json
{
  "id": "jiekou-ai",
  "name": "JiekouAI（中转商）",
  "type": "relay",                        // 供应商类型：relay/official/local
  "baseUrl": "https://api.jiekou.ai",
  "apiFormat": "jiekou-custom",           // API 调用格式
  "models": ["sora-2", "sd3-large", "flux-1", "gpt-4"],  // 支持的模型
  "apiKey": "...",
  "priority": 10                           // 优先级（用于智能路由）
}

{
  "id": "t8star",
  "name": "T8Star（中转商）",
  "type": "relay",
  "baseUrl": "https://ai.t8star.cn/v2",
  "apiFormat": "openai-compatible",
  "models": ["sora-2", "runway-gen3", "flux-1"],  // 也支持 sora-2
  "apiKey": "...",
  "priority": 8
}

{
  "id": "comfyui-local",
  "name": "ComfyUI（本地）",
  "type": "local",
  "baseUrl": "http://localhost:8188",
  "apiFormat": "comfyui-workflow",
  "models": ["sd3-large", "flux-1", "sora-2"],  // 本地部署的模型
  "priority": 5
}
```

#### 3. Provider 路由逻辑（APIManager 核心）

```typescript
class APIManager {
  /**
   * 调用 AI 模型（自动路由到合适的供应商）
   */
  async callModel(params: {
    model: string;              // 模型名称（如 "sora-2"）
    category: APICategory;      // 模型类别（如 VIDEO_GENERATION）
    input: unknown;             // 输入参数
  }): Promise<unknown> {
    // 1. 查询支持该模型的所有供应商
    const providers = this.providers.filter(p =>
      p.models.includes(params.model) &&
      p.enabled &&
      p.category === params.category
    );

    if (providers.length === 0) {
      throw new Error(`未找到支持模型 ${params.model} 的供应商，请在设置中配置`);
    }

    // 2. 按优先级排序（成本、速度、可用性）
    providers.sort((a, b) => b.priority - a.priority);

    // 3. 选择第一个可用的供应商
    const selectedProvider = providers[0];

    // 4. 根据供应商的 API 格式进行适配
    return await this.callProviderAPI(selectedProvider, params);
  }

  /**
   * API 格式适配器（根据供应商的 API 格式调用）
   */
  private async callProviderAPI(
    provider: APIProviderConfig,
    params: ModelCallParams
  ): Promise<unknown> {
    switch (provider.apiFormat) {
      case 'openai-compatible':
        return await this.callOpenAIFormat(provider, params);

      case 'jiekou-custom':
        return await this.callJiekouFormat(provider, params);

      case 'comfyui-workflow':
        return await this.callComfyUIFormat(provider, params);

      default:
        throw new Error(`不支持的 API 格式: ${provider.apiFormat}`);
    }
  }

  private async callJiekouFormat(provider, params) {
    // Jiekou AI 的 API 调用格式（异步 + 轮询）
    const response = await fetch(`${provider.baseUrl}/v3/async/...`, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: params.model, ... })
    });

    const taskId = response.data.task_id;
    return await this.pollTaskStatus(provider, taskId);  // 轮询结果
  }

  private async callOpenAIFormat(provider, params) {
    // OpenAI 兼容格式（同步）
    const response = await fetch(`${provider.baseUrl}/v1/completions`, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: params.model, ... })
    });
    return response.data;
  }
}
```

#### 4. 插件调用方式（仅关注模型）

```typescript
class NovelVideoAPIService {
  async generateVideo(scene: Scene): Promise<string> {
    // ✅ 正确：仅指定模型，不指定供应商
    const videoUrl = await this.apiManager.callModel({
      model: 'sora-2',                    // 从插件配置中读取
      category: APICategory.VIDEO_GENERATION,
      input: {
        prompt: scene.description,
        duration: 5
      }
    });

    return videoUrl;
  }
}
```

---

## 🎯 架构优势

### 1. 供应商灵活切换
- 用户在 Settings 中禁用 JiekouAI，启用 T8Star
- 插件无需修改，自动路由到 T8Star

### 2. 多供应商冗余
- JiekouAI 限流时，自动切换到 T8Star
- 本地 ComfyUI 故障时，回退到云端供应商

### 3. 成本优化
- 根据供应商定价自动选择最便宜的
- 支持按使用量配额分配

### 4. 扩展性强
- 新增供应商只需添加配置，无需修改插件代码
- 新增模型只需在供应商配置中添加模型列表

---

## 🚫 不应该存在的文件

- ❌ `src/main/services/providers/JiekouAIProvider.ts`（特定供应商实现）
- ❌ `src/main/services/providers/T8StarProvider.ts`
- ❌ `src/main/services/providers/RunningHubProvider.ts`

## ✅ 应该存在的文件

- ✅ `src/main/services/APIManager.ts`（统一路由和适配）
- ✅ `src/main/adapters/OpenAIFormatAdapter.ts`（API 格式适配器）
- ✅ `src/main/adapters/JiekouFormatAdapter.ts`
- ✅ `src/main/adapters/ComfyUIFormatAdapter.ts`
- ✅ `config/providers.json`（供应商配置列表）

---

## 📋 实施要点

### 插件 default-config.json

```json
{
  "models": {
    "llm": "gpt-4",              // 仅指定模型
    "imageGeneration": "sd3-large",
    "videoGeneration": "sora-2"
  },
  "fallbackModels": {             // 备选模型（模型不可用时）
    "llm": ["gpt-3.5-turbo", "deepseek-chat"],
    "imageGeneration": ["flux-1", "sdxl"],
    "videoGeneration": ["runway-gen3"]
  }
}
```

### Settings UI（Provider 管理）

- 用户添加供应商（JiekouAI、T8Star、ComfyUI）
- 每个供应商配置：
  - API Key
  - 支持的模型列表
  - 优先级
  - 启用/禁用状态

### APIManager 路由策略

1. **按优先级**：用户手动设置的优先级
2. **按成本**：选择最便宜的供应商
3. **按速度**：选择延迟最低的
4. **按可用性**：自动检测供应商健康状态

---

**关键原则总结**：
- 🎯 核心是模型，不是供应商
- 🔀 Provider 是路由层，不是供应商层
- 🔌 插件配置模型，系统路由供应商
- 🚀 智能选择，自动切换，无缝降级

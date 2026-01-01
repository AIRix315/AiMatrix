# MATRIX Studio "小说转视频"插件完整实施计划

**文档版本**: v1.0.0
**创建时间**: 2026-01-01
**目标**: 实现"小说转视频"插件完整流程 + 保留平台化扩展能力
**原则**: 轻量化、无数据库、本地缓存优先

---

## 📋 执行摘要

本计划整合了**n8n工作流验证方案**和**通用插件平台架构设计**，聚焦于：

1. **短期目标（0-12周）**: 实现"小说转视频"插件完整功能（从Mock数据到真实API调用）
2. **中期目标（3-6个月）**: 构建可复用的模板化组件系统，支持更多AI工作流
3. **长期愿景（6-12个月）**: 支持N8N、ComfyUI等多种工作流类型的通用适配

**核心架构原则**：
- ✅ **轻量化**: 无数据库，使用JSON文件持久化（已实现）
- ✅ **本地优先**: 利用文件系统缓存，避免重复API调用（后期优化）
- ✅ **扩展性**: 插件化架构，支持动态组件注册和工作流适配

---

## 一、项目现状分析

### 1.1 核心优势 ✅

| 优势 | 实现状态 | 说明 |
|------|---------|------|
| **完整的服务层** | ✅ 已实现 | 17个核心服务（Logger、FileSystemService、WorkflowStateManager等） |
| **插件系统** | ✅ 已实现 | PluginManager、manifest.json、生命周期钩子 |
| **状态持久化** | ✅ 已实现 | WorkflowStateManager + JSON文件，无需数据库 |
| **IPC通信** | ✅ 已实现 | 80+ IPC处理器，完整的主进程↔渲染进程通信 |
| **Schema验证** | ✅ 已实现 | SchemaRegistry + JSON Schema |
| **UI框架** | ✅ 已实现 | React + Tailwind + shadcn/ui，完整的组件库 |
| **工作流编辑器** | ✅ 已实现 | @xyflow/react，支持节点拖拽（未用于插件） |
| **时间服务** | ✅ 已实现 | TimeService，统一时间处理（NTP同步） |

### 1.2 核心不足 ❌（基于n8n对比分析）

**P0级缺失（阻碍基本功能）**：

| 功能 | n8n实现 | MATRIX状态 | 影响 |
|------|---------|-----------|------|
| **异步任务处理** | Wait节点 + If轮询 + 超时重试 | ❌ 完全缺失 | **无法处理文生图、图生视频（需10s-10min轮询）** |
| **批量处理机制** | splitInBatches + Loop + Aggregate | ❌ 完全缺失 | **无法批量生成10个分镜/视频** |
| **AI调用封装** | LangChain Agent + DeepSeek + Structured Output | ❌ 全是Mock数据 | **ChapterSplitPanel等无真实功能** |

**P1级缺失（影响用户体验）**：

| 功能 | n8n实现 | MATRIX状态 | 影响 |
|------|---------|-----------|------|
| **错误重试机制** | retryOnFail + waitBetweenTries | ❌ 缺失 | API失败无自动重试 |
| **进度追踪UI** | 节点状态实时显示 | ⚠️ 部分（有ProgressOrb但未集成） | 用户不知道任务进度 |
| **结果聚合验证** | Aggregate节点 | ❌ 缺失 | 批量任务结果需手动检查 |

**P2级缺失（平台化能力）**：

| 功能 | 目标 | MATRIX状态 | 影响 |
|------|------|-----------|------|
| **动态组件注册** | 运行时扩展组件 | ❌ componentMap硬编码 | 插件无法注册自定义组件 |
| **模板化组件系统** | 文生图/图生图/图生视频模板 | ⚠️ 有组件但未抽象 | 无法复用组件模式 |
| **工作流适配器** | 支持N8N、ComfyUI工作流导入 | ❌ 缺失 | 无法复用外部工作流 |
| **子工作流复用** | executeWorkflow节点 | ❌ 缺失 | 无法动态调用子流程 |

### 1.3 架构定位明确

**工作流（Workflow）** vs **插件（Plugin）**：

| 维度 | 工作流 | 插件（小说转视频） |
|------|-------|-----------------|
| **定位** | 用户自由组装的流程 | 开发者预定义的完整产品 |
| **用途** | 快速原型、实验、一次性任务 | 固定流程、可重复使用、可分发 |
| **编辑能力** | 可视化编辑器（@xyflow/react） | 固定步骤，参数可配置 |
| **执行方式** | 图形化编辑器界面 | 专用执行器（WorkflowExecutor） |
| **分发方式** | 导出JSON（可选） | ZIP打包 + 插件市场 |
| **目标用户** | 技术用户（会用编辑器） | 普通用户（向导式） |
| **示例** | N8N工作流、ComfyUI工作流 | Photoshop插件、VSCode扩展 |

**当前决策**: "小说转视频"为**插件**，后期可支持工作流→插件转换

---

## 1.4 Provider抽象层架构 ⚠️ 核心设计原则

**MATRIX定位**: **逻辑 + 调度 + 编排 + 路由**，而非具体执行层

**设计原则**: 所有外部API调用必须通过Provider抽象层，禁止硬编码具体API URL

### 架构图

```
用户请求："文生图"
  ↓
Panel组件（UI层，与Provider解耦）
  ↓ 调用抽象Operation接口
ProviderRouter（路由层）
  ├── 读取配置：使用哪个Provider？
  └── 路由到具体Provider
  ↓
Provider实现（可插拔、可配置）
  ├── JiekouProvider（接口AI，在线）
  ├── ComfyUIProvider（本地ComfyUI）
  ├── OpenAIProvider（DALL-E，在线）
  └── CustomProvider（用户插件）
  ↓
统一结果格式返回
```

### 核心接口（精简版）

```typescript
// Operation类型枚举
export enum OperationType {
  TEXT_TO_IMAGE = 'text-to-image',
  IMAGE_TO_IMAGE = 'image-to-image',
  IMAGE_TO_VIDEO = 'image-to-video'
}

// Provider接口
export interface IProvider {
  readonly id: string;
  readonly name: string;
  checkAvailability(): Promise<boolean>;
}

// ProviderRouter（核心路由逻辑）
export class ProviderRouter {
  async executeTextToImage(params: {
    prompt: string;
    width: number;
    height: number;
    providerId?: string; // 可选指定Provider
  }): Promise<TextToImageResult>
}
```

### 配置策略

- **全局默认**: Settings中配置每个Operation的默认Provider
- **插件覆盖**: manifest.json可指定插件专用Provider
- **运行时切换**: 生成时可临时切换Provider

### 实施位置

- **类型定义**: `src/shared/types/provider.ts`
- **核心服务**: `src/main/services/ProviderRegistry.ts`, `ProviderRouter.ts`
- **第一个Provider**: `src/main/providers/JiekouProvider.ts`
- **IPC处理器**: `src/main/ipc/provider-handlers.ts`

---

## 二、短期目标：小说转视频插件完整实现（0-12周）

### 2.1 核心目标

实现**从Mock数据到真实API调用**的完整流程：

```
用户上传小说.txt
  ↓
【ChapterSplitPanel】AI提取场景+角色（真实DeepSeek API）
  ↓
【StoryboardPanel】批量生成分镜图片（异步文生图API，支持并行）
  ↓
【VoiceoverPanel】批量生成视频片段（异步图生视频API，支持并行）
  ↓
【ExportPanel】合成最终视频
  ↓
输出：完整的短视频作品
```

### 2.2 实施路线图（12周）

#### Phase 0: Provider抽象层实现（Week 0，预备工作）⚠️ 架构基础

**目标**: 建立Provider抽象层，确保所有API调用解耦

**关键文件**:
- `src/shared/types/provider.ts` - Operation接口定义
- `src/main/services/ProviderRegistry.ts` - Provider注册表
- `src/main/services/ProviderRouter.ts` - 路由逻辑
- `src/main/providers/JiekouProvider.ts` - 第一个Provider实现
- `src/main/ipc/provider-handlers.ts` - IPC处理器

**检查清单**:
- [ ] 定义OperationType枚举（TEXT_TO_IMAGE, IMAGE_TO_IMAGE, IMAGE_TO_VIDEO）
- [ ] 实现ProviderRegistry（注册/查询Provider）
- [ ] 实现ProviderRouter（路由到具体Provider）
- [ ] 实现JiekouProvider（封装接口AI API）
- [ ] 注册IPC通道（provider:text-to-image, provider:image-to-video）
- [ ] 更新预加载脚本（暴露window.electronAPI.provider API）

**验收标准**: ✅ Panel组件可通过抽象接口调用Provider，无硬编码API

---

#### Phase 1: 异步任务处理（Week 1-4）⚡ 最高优先级

**目标**: 实现AsyncTaskManager，支持长时间运行的AI任务

**Week 1-2: 核心服务实现**

**新建文件**: `src/main/services/AsyncTaskManager.ts`

```typescript
/**
 * AsyncTaskManager - 异步任务管理器
 *
 * 功能：
 * - 异步任务轮询（文生图、图生视频）
 * - 超时重试（10分钟超时）
 * - 错误重试（指数退避）
 */
export class AsyncTaskManager {
  /**
   * 执行异步任务并轮询等待
   * @param apiCall API调用函数
   * @param pollInterval 轮询间隔（毫秒，默认10秒）
   * @param timeout 超时时间（毫秒，默认10分钟）
   */
  async executeWithPolling<T>(
    apiCall: () => Promise<{ task_id?: string; result?: T }>,
    pollInterval: number = 10000,
    timeout: number = 600000
  ): Promise<T> {
    // 1. 发起异步任务
    const response = await apiCall();

    // 如果返回同步结果
    if (response.result && !response.task_id) {
      return response.result;
    }

    if (!response.task_id) {
      throw new Error('API返回格式错误：既无task_id也无result');
    }

    // 2. 轮询等待
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      await this.sleep(pollInterval);

      const status = await this.checkTaskStatus(response.task_id);

      if (status.status === 'TASK_STATUS_SUCCEED') {
        return status.result;
      }

      if (status.status === 'TASK_STATUS_FAILED') {
        throw new Error(`任务失败: ${status.error}`);
      }

      // QUEUED/PROCESSING -> 继续等待
    }

    // 超时
    throw new TimeoutError(`任务超时（${timeout}ms），task_id: ${response.task_id}`);
  }

  /**
   * 执行操作并重试
   * @param operation 操作函数
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试延迟（毫秒）
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 3000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        logger.warn(
          `操作失败（尝试 ${attempt + 1}/${maxRetries}），${retryDelay}ms后重试`,
          'AsyncTaskManager',
          { error }
        );

        await this.sleep(retryDelay);
        // 指数退避
        retryDelay *= 2;
      }
    }

    throw new Error('不应到达此处');
  }

  /**
   * 检查任务状态
   * 注意：此方法应由具体的Provider实现，而不是在AsyncTaskManager中硬编码
   */
  private async checkTaskStatus(taskId: string): Promise<TaskStatus> {
    // ❌ 错误示例（已移除）：直接调用外部API
    // const response = await fetch('https://api.jiekou.ai/...')

    // ✅ 正确做法：由调用方传入状态查询函数
    throw new Error('此方法应由Provider实现，不应在AsyncTaskManager中调用');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getApiToken(): string {
    // 从ConfigManager或APIManager获取token
    return configManager.get('api.jiekou.token');
  }
}

interface TaskStatus {
  status: 'TASK_STATUS_QUEUED' | 'TASK_STATUS_PROCESSING' | 'TASK_STATUS_SUCCEED' | 'TASK_STATUS_FAILED';
  result?: any;
  error?: string;
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
```

**单元测试**: `tests/unit/services/AsyncTaskManager.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AsyncTaskManager } from '@/main/services/AsyncTaskManager';

describe('AsyncTaskManager', () => {
  it('应该处理同步返回的结果', async () => {
    const manager = new AsyncTaskManager();
    const apiCall = vi.fn().mockResolvedValue({ result: 'success' });

    const result = await manager.executeWithPolling(apiCall);

    expect(result).toBe('success');
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('应该轮询异步任务直到成功', async () => {
    const manager = new AsyncTaskManager();
    const apiCall = vi.fn().mockResolvedValue({ task_id: '123' });

    // Mock checkTaskStatus
    vi.spyOn(manager as any, 'checkTaskStatus')
      .mockResolvedValueOnce({ status: 'TASK_STATUS_QUEUED' })
      .mockResolvedValueOnce({ status: 'TASK_STATUS_PROCESSING' })
      .mockResolvedValueOnce({ status: 'TASK_STATUS_SUCCEED', result: 'done' });

    const result = await manager.executeWithPolling(apiCall, 100); // 100ms轮询间隔

    expect(result).toBe('done');
  });

  it('应该在超时后抛出错误', async () => {
    const manager = new AsyncTaskManager();
    const apiCall = vi.fn().mockResolvedValue({ task_id: '123' });

    vi.spyOn(manager as any, 'checkTaskStatus')
      .mockResolvedValue({ status: 'TASK_STATUS_PROCESSING' });

    await expect(
      manager.executeWithPolling(apiCall, 100, 500) // 500ms超时
    ).rejects.toThrow(TimeoutError);
  });

  it('应该重试失败的操作', async () => {
    const manager = new AsyncTaskManager();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce('success');

    const result = await manager.executeWithRetry(operation, 3, 100);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
```

**Week 3: IPC集成**

**新建文件**: `src/main/ipc/async-task-handlers.ts`

```typescript
import { ipcMain } from 'electron';
import { asyncTaskManager } from '../services/AsyncTaskManager';

/**
 * 异步任务IPC处理器
 */
export function registerAsyncTaskHandlers() {
  /**
   * 文生图（异步）
   * ✅ 使用Provider抽象层，而不是硬编码API
   */
  ipcMain.handle('provider:text-to-image', async (_, params: {
    prompt: string;
    width: number;
    height: number;
    providerId?: string; // 可选指定Provider
  }) => {
    // 使用ProviderRouter路由到具体Provider
    return await providerRouter.executeTextToImage(params);
  });

  /**
   * 图生视频（异步）
   * ✅ 使用Provider抽象层，而不是硬编码API
   */
  ipcMain.handle('provider:image-to-video', async (_, params: {
    prompt: string;
    inputImage: string;
    duration: number;
    providerId?: string; // 可选指定Provider
  }) => {
    // 使用ProviderRouter路由到具体Provider
    return await providerRouter.executeImageToVideo(params);
  });
}
```

**更新文件**: `src/preload/index.ts`

```typescript
// 新增异步任务API
contextBridge.exposeInMainWorld('electronAPI', {
  // ...现有API
  asyncTask: {
    textToImage: (params: {
      prompt: string;
      width: number;
      height: number;
    }) => ipcRenderer.invoke('async-task:text-to-image', params),

    imageToVideo: (params: {
      prompt: string;
      imageUrl: string;
      videoRatio: string;
    }) => ipcRenderer.invoke('async-task:image-to-video', params)
  }
});
```

**更新文件**: `src/shared/types/electron-api.d.ts`

```typescript
interface ElectronAPI {
  // ...现有接口
  asyncTask: {
    textToImage: (params: {
      prompt: string;
      width: number;
      height: number;
    }) => Promise<{
      imageUrl: string;
      imageFilePath: string;
    }>;

    imageToVideo: (params: {
      prompt: string;
      imageUrl: string;
      videoRatio: string;
    }) => Promise<{
      videoUrl: string;
      videoFilePath: string;
    }>;
  };
}
```

**Week 4: Panel集成**

**更新文件**: `src/renderer/pages/workflows/panels/StoryboardPanel.tsx`

```typescript
// 删除Mock数据，使用真实API
const handleGenerateStoryboard = async (storyboard: Storyboard) => {
  setGenerating(true);
  try {
    // 调用异步文生图API
    const result = await window.electronAPI.asyncTask.textToImage({
      prompt: storyboard.prompt,
      width: 1280,
      height: 720
    });

    // 更新状态
    setStoryboards(prev => prev.map(s =>
      s.id === storyboard.id
        ? { ...s, imageUrl: result.imageUrl, status: 'completed' }
        : s
    ));

    setToast({
      type: 'success',
      message: `分镜 ${storyboard.id} 生成成功`
    });
  } catch (error) {
    setToast({
      type: 'error',
      message: `生成失败: ${error.message}`
    });
  } finally {
    setGenerating(false);
  }
};
```

**验收标准**:
- ✅ 可处理10分钟以上的异步任务
- ✅ 支持轮询间隔10s，超时自动重试
- ✅ UI实时显示任务状态（使用ProgressOrb）

#### Phase 2: 批量处理（Week 5-8）

**目标**: 扩展TaskScheduler，支持批量并行生成（优于n8n的串行）

**Week 5-6: 批量处理实现**

**扩展文件**: `src/main/services/TaskScheduler.ts`

```typescript
/**
 * 批量执行结果
 */
interface BatchResult<R> {
  success: R[];
  failed: Array<{ item: any; error: Error }>;
  total: number;
  successCount: number;
  failedCount: number;
  successRate: number;
}

/**
 * TaskScheduler扩展：批量处理
 */
export class TaskScheduler {
  // ...现有代码

  /**
   * 批量执行任务（串行，与n8n一致）
   * @param items 待处理项数组
   * @param processor 处理函数
   * @param onProgress 进度回调
   */
  async executeBatchSerial<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (completed: number, total: number, current: T) => void
  ): Promise<BatchResult<R>> {
    const success: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const result = await processor(item);
        success.push(result);
      } catch (error) {
        failed.push({ item, error: error as Error });
      }

      onProgress?.(i + 1, items.length, item);
    }

    return {
      success,
      failed,
      total: items.length,
      successCount: success.length,
      failedCount: failed.length,
      successRate: success.length / items.length
    };
  }

  /**
   * 批量执行任务（并行，优于n8n）
   * @param items 待处理项数组
   * @param processor 处理函数
   * @param maxConcurrency 最大并发数（默认5）
   * @param onProgress 进度回调
   */
  async executeBatchParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    maxConcurrency: number = 5,
    onProgress?: (completed: number, total: number, current: T) => void
  ): Promise<BatchResult<R>> {
    const success: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];
    const taskQueue = [...items];
    const executing: Promise<void>[] = [];
    let completed = 0;

    while (taskQueue.length > 0 || executing.length > 0) {
      // 控制并发数
      while (executing.length < maxConcurrency && taskQueue.length > 0) {
        const item = taskQueue.shift()!;

        const promise = processor(item)
          .then(result => {
            success.push(result);
          })
          .catch(error => {
            failed.push({ item, error });
          })
          .finally(() => {
            completed++;
            onProgress?.(completed, items.length, item);

            const index = executing.indexOf(promise);
            executing.splice(index, 1);
          });

        executing.push(promise);
      }

      // 等待至少一个任务完成
      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }

    return {
      success,
      failed,
      total: items.length,
      successCount: success.length,
      failedCount: failed.length,
      successRate: success.length / items.length
    };
  }

  /**
   * 重试失败的任务
   * @param failedItems 失败的项数组
   * @param processor 处理函数
   */
  async retryFailedTasks<T, R>(
    failedItems: Array<{ item: T; error: Error }>,
    processor: (item: T) => Promise<R>
  ): Promise<BatchResult<R>> {
    const items = failedItems.map(f => f.item);
    return await this.executeBatchParallel(items, processor);
  }
}
```

**单元测试**: `tests/unit/services/TaskScheduler.test.ts`（扩展）

```typescript
describe('TaskScheduler - 批量处理', () => {
  it('应该串行执行批量任务', async () => {
    const scheduler = new TaskScheduler();
    const items = [1, 2, 3, 4, 5];
    const processor = vi.fn(async (n: number) => n * 2);

    const result = await scheduler.executeBatchSerial(items, processor);

    expect(result.success).toEqual([2, 4, 6, 8, 10]);
    expect(result.successCount).toBe(5);
    expect(result.failedCount).toBe(0);
  });

  it('应该并行执行批量任务', async () => {
    const scheduler = new TaskScheduler();
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const processor = vi.fn(async (n: number) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return n * 2;
    });

    const startTime = Date.now();
    const result = await scheduler.executeBatchParallel(items, processor, 5);
    const duration = Date.now() - startTime;

    expect(result.success).toHaveLength(10);
    // 并发执行应该快于串行（10 * 100ms = 1000ms）
    expect(duration).toBeLessThan(500); // 5个并发约200ms
  });

  it('应该处理失败的任务', async () => {
    const scheduler = new TaskScheduler();
    const items = [1, 2, 3, 4, 5];
    const processor = vi.fn(async (n: number) => {
      if (n === 3) throw new Error('失败');
      return n * 2;
    });

    const result = await scheduler.executeBatchParallel(items, processor);

    expect(result.successCount).toBe(4);
    expect(result.failedCount).toBe(1);
    expect(result.failed[0].item).toBe(3);
  });

  it('应该支持进度回调', async () => {
    const scheduler = new TaskScheduler();
    const items = [1, 2, 3];
    const processor = vi.fn(async (n: number) => n * 2);
    const onProgress = vi.fn();

    await scheduler.executeBatchParallel(items, processor, 2, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenCalledWith(1, 3, expect.any(Number));
    expect(onProgress).toHaveBeenCalledWith(3, 3, expect.any(Number));
  });
});
```

**Week 7: Panel集成**

**更新文件**: `src/renderer/pages/workflows/panels/StoryboardPanel.tsx`

```typescript
const [batchProgress, setBatchProgress] = useState({
  total: 0,
  completed: 0,
  current: null as Storyboard | null
});

/**
 * 批量生成分镜
 */
const handleBatchGenerate = async () => {
  setBatchGenerating(true);
  const pendingStoryboards = storyboards.filter(s => s.status === 'pending');

  try {
    // 调用批量生成API（并行）
    const result = await window.electronAPI.storyboard.batchGenerate(
      pendingStoryboards,
      (completed, total, current) => {
        setBatchProgress({ total, completed, current });
      }
    );

    // 更新状态
    setStoryboards(prev => prev.map(s => {
      const generated = result.success.find(g => g.id === s.id);
      return generated ? { ...s, ...generated, status: 'completed' } : s;
    }));

    // 显示结果
    setToast({
      type: result.failedCount > 0 ? 'warning' : 'success',
      message: `批量生成完成：成功${result.successCount}个，失败${result.failedCount}个`
    });
  } catch (error) {
    setToast({
      type: 'error',
      message: `批量生成失败: ${error.message}`
    });
  } finally {
    setBatchGenerating(false);
  }
};

// UI
<div className="batch-section">
  <Button onClick={handleBatchGenerate} disabled={batchGenerating}>
    {batchGenerating ? '生成中...' : '🚀 批量生成'}
  </Button>

  {batchGenerating && (
    <div className="progress-section">
      <ProgressOrb progress={(batchProgress.completed / batchProgress.total) * 100} />
      <p>正在生成: {batchProgress.current?.prompt.substring(0, 50)}...</p>
      <p>{batchProgress.completed} / {batchProgress.total} 已完成</p>
    </div>
  )}
</div>
```

**Week 8: 性能优化**

- 控制并发数（避免API限流）：maxConcurrency=5-10
- 失败重试按钮：允许单独重试失败项
- 结果缓存机制（后期优化）：相同Prompt复用结果

**验收标准**:
- ✅ 可同时处理10个分镜生成任务
- ✅ 失败任务可单独重试
- ✅ 进度实时更新，UI友好

#### Phase 3: AI调用封装（Week 9-12）

**目标**: 实现AIService，替换所有Mock数据

**Week 9-10: AI服务实现**

**新建文件**: `src/main/services/AIService.ts`

```typescript
/**
 * AIService - AI调用封装服务
 *
 * 功能：
 * - 场景角色提取（DeepSeek）
 * - Prompt生成（角色、场景、分镜）
 * - Structured Output（JSON Schema验证）
 */
export class AIService {
  /**
   * 场景+角色提取
   * @param novelText 小说文本
   * @returns 结构化场景和角色列表
   */
  async extractScenesAndCharacters(novelText: string): Promise<{
    scenes: string[];
    characters: string[];
    details: Array<{ scene: string; characters: string[] }>;
  }> {
    const prompt = `
你是一位经验丰富的影视制片人和资源管理专家，擅长分析剧本并识别制作所需的关键物料。
现在你需要将可视化的影视文本进行场景分解，并识别出需要固定形象的物料。

## 你的任务目标

将可视化文本按"场景+时间段"的维度进行结构化分解，识别出需要跨章节保持视觉一致性的关键物料（主要角色、场景）。

## 核心理解

**为什么要识别物料？**
- 识别出的角色、场景会生成固定的基础图片
- 这些图片会在后续章节中复用，确保整部作品的**视觉一致性**
- 非主要角色不需要固定形象，可以随场景动态生成

**识别标准**：只识别需要跨章节保持一致性的关键物料。

**角色识别规则**：
1. 主要角色：出现2次以上，跨场景出现
2. 次要角色：仅在单个场景出现，无需固定形象

**场景识别规则**：
1. 主要场景：反复出现的地点（如"办公室"、"家"）
2. 临时场景：仅出现一次的地点（如"咖啡厅"）

## 输入文本

${novelText}

## 输出格式

请以JSON格式输出，每个场景单独一条记录：

{
  "data": [
    {
      "scene": "场景名称（如'办公室-白天'）",
      "characters": ["角色1", "角色2"]
    }
  ]
}
`;

    // 调用DeepSeek API
    const response = await this.callLLM(prompt, {
      model: 'deepseek-chat',
      responseFormat: 'json_object'
    });

    // 解析并去重
    const data = JSON.parse(response);
    const scenes = [...new Set(data.data.map((item: any) => item.scene))];
    const characters = [...new Set(data.data.flatMap((item: any) => item.characters))];

    return {
      scenes,
      characters,
      details: data.data
    };
  }

  /**
   * 生成角色详细Prompt
   */
  async generateCharacterPrompt(
    characterName: string,
    context: string
  ): Promise<string> {
    const prompt = `
你是一位专业的角色设计师。请为以下角色生成详细的视觉描述Prompt，用于AI绘图生成角色基础图片。

**角色名称**: ${characterName}

**上下文**: ${context}

**要求**：
1. 描述外貌特征（年龄、发型、服饰、身材）
2. 描述表情和气质
3. 指定画风（卡通风格、写实风格等）
4. 指定背景（白底、简单背景）

**输出格式**: 直接返回Prompt文本（不要JSON），长度50-100字。

**示例**: "一位25岁的年轻女性，长发披肩，穿着职业装，面带微笑，卡通风格，白底背景"
`;

    return await this.callLLM(prompt, {
      model: 'deepseek-chat',
      temperature: 0.7
    });
  }

  /**
   * 生成场景详细Prompt
   */
  async generateScenePrompt(
    sceneName: string,
    context: string
  ): Promise<string> {
    const prompt = `
你是一位专业的场景设计师。请为以下场景生成详细的视觉描述Prompt，用于AI绘图生成场景基础图片。

**场景名称**: ${sceneName}

**上下文**: ${context}

**要求**：
1. 描述场景的空间布局
2. 描述光线和氛围
3. 描述关键物体和细节
4. 指定画风（卡通风格、写实风格等）

**输出格式**: 直接返回Prompt文本（不要JSON），长度50-100字。

**示例**: "现代办公室，明亮的自然光，办公桌、电脑、书架，简约风格，卡通风格"
`;

    return await this.callLLM(prompt, {
      model: 'deepseek-chat',
      temperature: 0.7
    });
  }

  /**
   * 生成分镜Prompt（融合角色+场景）
   */
  async generateStoryboardPrompt(
    sceneDescription: string,
    characters: string[],
    characterImages: Map<string, string>,
    sceneImage: string
  ): Promise<string> {
    const prompt = `
你是一位专业的分镜设计师。请为以下场景生成详细的分镜Prompt，用于AI图生图生成分镜图片。

**场景描述**: ${sceneDescription}

**角色**: ${characters.join(', ')}

**要求**：
1. 融合角色和场景元素
2. 描述镜头构图（远景、中景、特写）
3. 描述角色动作和表情
4. 保持角色和场景的视觉一致性

**输出格式**: 直接返回Prompt文本（不要JSON），长度50-100字。

**示例**: "办公室内，女主角坐在办公桌前，面带微笑地看着电脑屏幕，中景镜头，明亮的自然光，卡通风格"
`;

    return await this.callLLM(prompt, {
      model: 'deepseek-chat',
      temperature: 0.7
    });
  }

  /**
   * 调用LLM
   */
  private async callLLM(
    prompt: string,
    options: {
      model: string;
      responseFormat?: 'json_object' | 'text';
      temperature?: number;
    }
  ): Promise<string> {
    // 通过APIManager调用DeepSeek
    const apiKey = apiManager.getApiKey('deepseek');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || 0.7,
        response_format: options.responseFormat === 'json_object'
          ? { type: 'json_object' }
          : undefined
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

**Prompt工程注意事项**（基于n8n分析）：
- ✅ 明确角色定位（"你是..."）
- ✅ 详细任务说明（"你的任务目标"）
- ✅ 核心理解解释（"为什么要..."）
- ✅ 具体规则（"识别规则"）
- ✅ 输出格式示例（JSON Schema或文本示例）

**Week 11: ChapterSplitPanel集成**

**更新文件**: `src/renderer/pages/workflows/panels/ChapterSplitPanel.tsx`

```typescript
// 删除Mock数据（line 93-99）
const handleSplit = async () => {
  if (!novelPath) {
    setToast({
      type: 'warning',
      message: '请先选择小说文件'
    });
    return;
  }

  setLoading(true);
  try {
    // 读取小说文本
    const novelText = await window.electronAPI.file.readText(novelPath);

    // 调用AI提取场景和角色（真实API）
    const result = await window.electronAPI.ai.extractScenesAndCharacters(novelText);

    // 转换为Chapter格式
    const extractedChapters: Chapter[] = result.details.map((detail, index) => ({
      id: `chapter-${index + 1}`,
      title: detail.scene,
      index,
      content: `场景：${detail.scene}\n角色：${detail.characters.join(', ')}`,
      wordCount: Math.floor(Math.random() * 1000) + 500 // 临时估算
    }));

    setChapters(extractedChapters);
    setToast({
      type: 'success',
      message: `拆分成功！识别${result.scenes.length}个场景，${result.characters.length}个角色`
    });

    // 自动标记步骤完成
    onComplete({
      novelPath,
      fileName,
      chapters: extractedChapters,
      scenes: result.scenes,
      characters: result.characters
    });
  } catch (error) {
    console.error('拆分章节失败:', error);
    setToast({
      type: 'error',
      message: `拆分章节失败: ${error.message}`
    });
  } finally {
    setLoading(false);
  }
};
```

**Week 12: 其他Panel集成**

- 更新 `StoryboardPanel.tsx`：调用AI生成分镜Prompt
- 更新 `VoiceoverPanel.tsx`：调用AI生成视频Prompt
- 端到端测试（从上传小说到生成视频）

**验收标准**:
- ✅ 无Mock数据
- ✅ AI调用成功率>95%
- ✅ 输出符合JSON Schema（场景角色提取）
- ✅ 全流程可运行（小说 → 章节 → 场景角色 → 分镜 → 视频）

---

## 三、中期目标：通用插件平台能力（3-6个月）

### 3.1 模板化组件系统

**目标**: 抽象5个Panel为可复用的模板组件

**模板分类**：

| 模板类型 | 当前实现 | 其他插件可能用途 | 抽象关键 |
|---------|---------|-----------------|---------|
| **文生图模板** | ChapterSplitPanel（虽然不只是文生图） | PromptToImagePanel、ConceptArtPanel | Prompt输入 + 异步轮询 + 图片展示 |
| **图生图模板** | 无（分镜生成用的是图生图） | ImageVariationPanel、StyleTransferPanel | 图片上传 + Prompt输入 + 同步API |
| **图生视频模板** | VoiceoverPanel（实际是图生视频） | Image2VideoPanel、AnimationPanel | 图片输入 + Prompt + 异步轮询 + 视频播放 |
| **文生音频模板** | 无（待实现） | Text2SpeechPanel、MusicGenerationPanel | 文本输入 + 音频播放 |
| **批量处理模板** | 所有涉及批量的Panel | 通用批量操作 | 任务列表 + 进度追踪 + 失败重试 |

**实现示例**：

**新建文件**: `src/renderer/components/templates/AsyncImageGenerationTemplate.tsx`

```typescript
/**
 * 异步图片生成模板（文生图/图生图通用）
 *
 * 功能：
 * - Prompt输入或图片上传
 * - 调用异步API
 * - 轮询等待
 * - 进度显示
 * - 结果展示
 */
interface AsyncImageGenerationTemplateProps {
  mode: 'text-to-image' | 'image-to-image';
  onGenerate: (params: {
    prompt: string;
    inputImage?: string;
    width?: number;
    height?: number;
  }) => Promise<{ imageUrl: string }>;
  onComplete?: (imageUrl: string) => void;
}

export const AsyncImageGenerationTemplate: React.FC<AsyncImageGenerationTemplateProps> = ({
  mode,
  onGenerate,
  onComplete
}) => {
  const [prompt, setPrompt] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);

    try {
      // 模拟进度更新（实际应该从API获取）
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const result = await onGenerate({
        prompt,
        inputImage: mode === 'image-to-image' ? inputImage : undefined,
        width: 1280,
        height: 720
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(result.imageUrl);

      onComplete?.(result.imageUrl);
    } catch (error) {
      // 错误处理
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="async-image-generation-template">
      {/* Prompt输入 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="输入Prompt描述..."
      />

      {/* 图片上传（仅图生图） */}
      {mode === 'image-to-image' && (
        <ImageUploader onUpload={setInputImage} />
      )}

      {/* 生成按钮 */}
      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? '生成中...' : '生成图片'}
      </Button>

      {/* 进度显示 */}
      {generating && (
        <ProgressOrb progress={progress} />
      )}

      {/* 结果显示 */}
      {result && (
        <img src={result} alt="生成结果" />
      )}
    </div>
  );
};
```

**使用示例**：

```typescript
// 在插件中使用模板
import { AsyncImageGenerationTemplate } from '@/renderer/components/templates';

export const MyCustomPanel: React.FC = () => {
  return (
    <AsyncImageGenerationTemplate
      mode="text-to-image"
      onGenerate={async (params) => {
        return await window.electronAPI.asyncTask.textToImage(params);
      }}
      onComplete={(imageUrl) => {
        console.log('生成完成:', imageUrl);
      }}
    />
  );
};
```

### 3.2 工作流适配器（保留扩展性）

**目标**: 支持N8N、ComfyUI工作流导入（后期实现）

**架构设计**：

```
N8N工作流JSON
  ↓
【N8NWorkflowAdapter】解析器
  ├── 识别节点类型（agent, httpRequest, code...）
  ├── 提取数据流（节点连接关系）
  ├── 转换为WorkflowDefinition
  └── 生成Panel组件配置
  ↓
WorkflowDefinition（MATRIX标准格式）
  ↓
【WorkflowToPluginConverter】打包工具
  ├── 生成manifest.json
  ├── 生成IPC处理器
  ├── 生成Panel组件（使用模板）
  └── 打包为ZIP
  ↓
插件（Plugin）
```

**新建文件**（后期实现）: `src/main/adapters/N8NWorkflowAdapter.ts`

```typescript
/**
 * N8N工作流适配器
 *
 * 功能：
 * - 解析N8N工作流JSON
 * - 转换为MATRIX WorkflowDefinition
 * - 映射节点类型
 */
export class N8NWorkflowAdapter {
  /**
   * 解析N8N工作流
   */
  parse(n8nWorkflow: N8NWorkflow): WorkflowDefinition {
    // 1. 提取节点
    const nodes = n8nWorkflow.nodes;

    // 2. 映射节点类型
    const steps = nodes
      .filter(node => this.isMappableNode(node.type))
      .map(node => this.mapNodeToStep(node));

    // 3. 创建WorkflowDefinition
    return {
      id: `imported-${Date.now()}`,
      name: n8nWorkflow.name,
      type: 'imported-n8n',
      description: `从N8N导入：${n8nWorkflow.name}`,
      version: '1.0.0',
      icon: '📥',
      steps,
      defaultState: {}
    };
  }

  /**
   * 映射节点类型
   */
  private mapNodeToStep(node: N8NNode): WorkflowStep {
    const typeMapping: Record<string, string> = {
      '@n8n/n8n-nodes-langchain.agent': 'AIPromptPanel',
      'n8n-nodes-base.httpRequest': 'APICallPanel',
      'n8n-nodes-base.executeWorkflow': 'SubWorkflowPanel',
      // ...更多映射
    };

    return {
      id: node.id,
      name: node.name,
      description: node.parameters.description || '',
      status: 'pending',
      componentType: typeMapping[node.type] || 'GenericPanel',
      config: node.parameters
    };
  }
}
```

**同理实现**（后期）: `ComfyUIWorkflowAdapter.ts`

### 3.3 动态组件注册（P2优先级）

**新建文件**: `src/renderer/utils/ComponentRegistry.ts`

```typescript
/**
 * 动态组件注册表
 * 解决componentMap硬编码问题
 */
export class ComponentRegistry {
  private components: Map<string, React.ComponentType<any>> = new Map()

  /**
   * 注册组件
   */
  register(type: string, component: React.ComponentType<any>): void {
    if (this.components.has(type)) {
      console.warn(`组件 ${type} 已注册，覆盖中`)
    }
    this.components.set(type, component)
  }

  /**
   * 获取组件
   */
  get(type: string): React.ComponentType<any> | undefined {
    return this.components.get(type)
  }

  /**
   * 批量注册（插件激活时调用）
   */
  registerBatch(components: Record<string, React.ComponentType<any>>): void {
    Object.entries(components).forEach(([type, component]) => {
      this.register(type, component)
    })
  }

  /**
   * 卸载组件（插件卸载时调用）
   */
  unregister(type: string): void {
    this.components.delete(type)
  }
}

// 全局单例
export const componentRegistry = new ComponentRegistry()

// 初始化时注册内置组件
componentRegistry.registerBatch({
  ChapterSplitPanel,
  StoryboardPanel,
  VoiceoverPanel,
  ExportPanel,
  RemoteControlPanel
})
```

**更新文件**: `src/renderer/pages/workflows/WorkflowExecutor.tsx`

```typescript
// 删除硬编码的componentMap
// const componentMap: Record<string, React.ComponentType<any>> = { ... };

// 使用ComponentRegistry
import { componentRegistry } from '../../utils/ComponentRegistry'

const workflow: WorkflowState = {
  steps: definition.steps.map((step: any) => ({
    component: componentRegistry.get(step.componentType) ||
               (() => <div>组件未找到: {step.componentType}</div>)
  }))
}
```

---

## 四、架构原则与技术选型

### 4.1 轻量化原则

**核心理念**: 避免引入重资产依赖，保持系统轻量灵活

#### 数据持久化：文件系统 vs 数据库

**当前方案**: 文件系统（JSON文件）✅

**理由**：
- ✅ **无额外依赖**: 无需安装数据库（SQLite、PostgreSQL等）
- ✅ **跨平台兼容**: JSON文件可在Windows/Mac/Linux通用
- ✅ **易于备份**: 用户可直接复制数据目录
- ✅ **开发简单**: 无需ORM、迁移脚本
- ✅ **已完整实现**: WorkflowStateManager、AssetManager均使用JSON

**限制**：
- ⚠️ 不适合大量数据查询（如数千个工作流实例）
- ⚠️ 不支持复杂关系查询（如多表JOIN）

**应对策略**：
- 短期：保持JSON文件方案
- 中期：如需在线协作，可集成在线文档平台（Notion、语雀）作为过渡
- 长期：如数据量增长，可选引入轻量级数据库（SQLite）

#### 在线文档平台集成（可选，后期考虑）

**用途**：作为数据库的轻量替代

**方案**：
- Notion API：存储工作流定义、执行历史
- 语雀 API：存储Prompt模板库、最佳实践文档
- Google Sheets API：存储统计数据、用户配置

**优势**：
- ✅ 无需自建数据库
- ✅ 支持多人协作
- ✅ 自带版本历史

**实现示例**（后期）：

```typescript
// src/main/services/NotionIntegration.ts
export class NotionIntegration {
  async saveWorkflowToNotion(workflow: WorkflowInstance) {
    // 调用Notion API创建页面
    await notion.pages.create({
      parent: { database_id: WORKFLOW_DATABASE_ID },
      properties: {
        '名称': { title: [{ text: { content: workflow.name } }] },
        '类型': { select: { name: workflow.type } },
        '状态': { select: { name: workflow.state.steps[0].status } }
      }
    });
  }
}
```

### 4.2 本地缓存机制（后期优化）

**目标**: 避免重复API调用，节省成本和时间

#### 缓存策略

**新建文件**（后期实现）: `src/main/services/CacheManager.ts`

```typescript
/**
 * CacheManager - 本地缓存管理器
 *
 * 功能：
 * - API响应缓存（避免重复调用）
 * - 生成结果缓存（相同Prompt复用）
 * - LRU淘汰策略（限制缓存大小）
 */
export class CacheManager {
  private cacheDir: string;

  /**
   * 缓存API响应
   * @param key 缓存键（如Prompt的hash）
   * @param data 响应数据
   * @param ttl 过期时间（秒）
   */
  async cacheAPIResponse(key: string, data: any, ttl: number = 86400) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(cacheFile, JSON.stringify({
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000
    }));
  }

  /**
   * 获取缓存
   */
  async getCache(key: string): Promise<any | null> {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);

    if (!await fs.pathExists(cacheFile)) {
      return null;
    }

    const cache = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));

    // 检查是否过期
    if (Date.now() > cache.expiresAt) {
      await fs.remove(cacheFile);
      return null;
    }

    return cache.data;
  }

  /**
   * 生成缓存键（Prompt hash）
   */
  generateCacheKey(prompt: string, model: string): string {
    return crypto.createHash('md5').update(`${model}:${prompt}`).digest('hex');
  }
}
```

**使用示例**：

```typescript
// AIService中集成缓存
async extractScenesAndCharacters(novelText: string) {
  // 生成缓存键
  const cacheKey = cacheManager.generateCacheKey(novelText, 'deepseek-chat');

  // 尝试从缓存获取
  const cached = await cacheManager.getCache(cacheKey);
  if (cached) {
    logger.info('使用缓存结果', 'AIService');
    return cached;
  }

  // 调用API
  const result = await this.callLLM(...);

  // 缓存结果
  await cacheManager.cacheAPIResponse(cacheKey, result, 86400);

  return result;
}
```

**缓存清理策略**：
- LRU淘汰（最近最少使用）
- 磁盘空间限制（如最多1GB）
- 手动清理按钮（在Settings页面）

### 4.3 扩展性设计

**核心思想**: 为未来功能预留接口，但不过度设计

#### 插件注册机制（已实现）

- ✅ `PluginManager`：加载、激活、卸载插件
- ✅ `manifest.json`：插件元数据
- ✅ 生命周期钩子：activate、deactivate

#### 组件注册机制（待实现）

- ⚠️ `ComponentRegistry`：动态注册React组件
- ⚠️ 插件可注册自定义Panel组件

#### 工作流定义抽象（已实现）

- ✅ `WorkflowDefinition`：统一工作流描述格式
- ✅ `WorkflowStateManager`：状态管理和持久化

#### API扩展点

**新建文件**（后期）: `src/main/services/APIProviderRegistry.ts`

```typescript
/**
 * API Provider注册表
 * 支持多个AI服务商（OpenAI、Anthropic、DeepSeek等）
 */
export class APIProviderRegistry {
  private providers: Map<string, APIProvider> = new Map();

  registerProvider(name: string, provider: APIProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name: string): APIProvider | undefined {
    return this.providers.get(name);
  }
}

interface APIProvider {
  textToImage(params: any): Promise<any>;
  imageToVideo(params: any): Promise<any>;
  chat(params: any): Promise<any>;
}
```

---

## 五、实施时间表与资源分配

### 5.1 短期实施（0-12周）

| 阶段 | 时间 | 任务 | 负责人 | 产出 |
|------|------|------|--------|------|
| **Phase 1** | Week 1-4 | 异步任务处理 | 后端开发 | AsyncTaskManager + IPC + Panel集成 |
| **Phase 2** | Week 5-8 | 批量处理 | 后端+前端 | TaskScheduler扩展 + 批量UI |
| **Phase 3** | Week 9-12 | AI调用封装 | AI工程师+全栈 | AIService + 删除Mock数据 |

**Milestone**：
- Week 4：异步任务处理验收（可生成单个分镜）
- Week 8：批量处理验收（可批量生成10个分镜）
- Week 12：全流程打通（小说 → 视频）

### 5.2 中期实施（3-6个月）

| 阶段 | 时间 | 任务 | 产出 |
|------|------|------|------|
| **Phase 4** | Month 4 | 模板化组件系统 | 5个通用模板组件 |
| **Phase 5** | Month 5 | 动态组件注册 | ComponentRegistry |
| **Phase 6** | Month 6 | 性能优化+缓存 | CacheManager + 性能提升 |

**Milestone**：
- Month 4：可基于模板快速创建新插件
- Month 6：系统性能提升50%（通过缓存）

### 5.3 长期实施（6-12个月）

| 阶段 | 时间 | 任务 | 产出 |
|------|------|------|------|
| **Phase 7** | Month 7-9 | N8N工作流适配器 | N8NWorkflowAdapter |
| **Phase 8** | Month 10-12 | ComfyUI工作流适配器 | ComfyUIWorkflowAdapter |

**Milestone**：
- Month 9：可导入N8N工作流并转换为插件
- Month 12：支持多种工作流类型（N8N、ComfyUI）

---

## 六、技术风险与缓解措施

### 6.1 核心风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **AI API不稳定**（超时、限流） | 高 | 高 | AsyncTaskManager重试机制 + 多API Provider备份 |
| **批量并发导致内存溢出** | 中 | 中 | 控制并发数（maxConcurrency=5-10） + 流式处理 |
| **轮询占用资源** | 中 | 低 | 后期考虑Webhook替代轮询 |
| **DeepSeek API成本** | 中 | 中 | Prompt优化 + 结果缓存 + 使用更便宜的模型 |
| **JSON Schema验证失败** | 低 | 中 | Fallback到文本输出 + 手动修正 |
| **文件系统性能瓶颈** | 低 | 低 | 索引优化 + 后期引入SQLite |

### 6.2 技术选型决策

#### 决策1：串行 vs 并行批量处理

**n8n方案**: Loop Over Items（串行）
- ✅ 简单可靠
- ❌ 性能差（10个任务需要10倍时间）

**MATRIX方案**: 并行处理（受控并发）
- ✅ 性能提升10倍
- ✅ 可控制并发数（避免API限流）
- ⚠️ 复杂度增加

**最终决策**: 采用并行方案，默认并发数5-10

#### 决策2：轮询 vs Webhook

**n8n方案**: Wait节点 + 轮询
- ✅ 简单易实现
- ❌ 资源浪费（持续占用进程）

**替代方案**: Webhook回调
- ✅ 资源高效（任务完成后回调）
- ❌ 需要暴露HTTP端点
- ❌ 复杂度增加

**最终决策**: 短期使用轮询，长期考虑Webhook

#### 决策3：LangChain vs 直接调用API

**n8n方案**: LangChain Agent
- ✅ 统一接口
- ✅ 支持多模型切换
- ❌ 依赖重（需要LangChain库）

**MATRIX方案**: 直接调用API
- ✅ 轻量级
- ✅ 更灵活
- ❌ 需要手动管理Prompt

**最终决策**: 使用APIManager统一管理（已存在），不引入LangChain依赖

#### 决策4：数据库 vs 文件系统

**数据库方案**（SQLite、PostgreSQL）
- ✅ 支持复杂查询
- ✅ 事务支持
- ❌ 需要额外依赖
- ❌ 增加复杂度

**文件系统方案**（JSON文件）
- ✅ 轻量级
- ✅ 无额外依赖
- ✅ 易于备份
- ❌ 不适合大量数据查询

**最终决策**: 短期使用文件系统，数据量增长后可选引入SQLite

---

## 七、成功验收标准

### 7.1 Phase 1验收（Week 4）

- ✅ AsyncTaskManager单元测试通过率100%
- ✅ 可处理10分钟以上的异步任务
- ✅ 超时自动重试，成功率>95%
- ✅ StoryboardPanel可生成单个分镜图片
- ✅ UI实时显示任务状态

### 7.2 Phase 2验收（Week 8）

- ✅ TaskScheduler批量处理单元测试通过
- ✅ 可同时处理10个分镜生成任务
- ✅ 并发控制有效（不超过maxConcurrency）
- ✅ 失败任务可单独重试
- ✅ 批量生成进度实时更新

### 7.3 Phase 3验收（Week 12）

- ✅ AIService单元测试通过
- ✅ 无Mock数据，所有Panel使用真实API
- ✅ AI调用成功率>95%
- ✅ 场景角色提取符合JSON Schema
- ✅ **全流程可运行**：
  - 用户上传小说.txt
  - AI提取场景和角色
  - 批量生成分镜图片
  - 批量生成视频片段
  - 导出最终视频
- ✅ 端到端测试通过

### 7.4 中期验收（Month 6）

- ✅ 模板化组件系统完成（5个模板）
- ✅ 可基于模板快速创建新插件（如"漫画生成"插件）
- ✅ CacheManager实现，API重复调用率降低50%
- ✅ 系统性能提升50%

### 7.5 长期验收（Month 12）

- ✅ N8NWorkflowAdapter可成功导入n8n工作流
- ✅ ComfyUIWorkflowAdapter可成功导入ComfyUI工作流
- ✅ 至少支持3种工作流类型（MATRIX原生、N8N、ComfyUI）
- ✅ 插件市场有至少10个社区插件

---

## 八、关键资源与参考文档

### 8.1 项目文档

- **架构设计**: `docs/plan/universal-plugin-platform-refactor.md`
- **n8n分析报告**: `docs/plan/n8n-workflow-comparison-analysis.md`
- **本文档**: `docs/plan/novel-to-video-plugin-implementation-plan.md`
- **全局要求**: `docs/00-global-requirements-v1.0.0.md`
- **服务设计**: `docs/06-core-services-design-v1.0.1.md`

### 8.2 n8n工作流文件

- `docs/n8n/AI漫剧-主工作流.json`（35+ 节点，主流程编排）
- `docs/n8n/AI漫剧-文生图.json`（异步轮询模式）
- `docs/n8n/AI漫剧-生成分镜图片.json`（图生图）
- `docs/n8n/AI漫剧-生成视频片段.json`（异步轮询+超时重试）
- `docs/n8n/AI漫剧-生成视频片段-批量.json`（批量处理）

### 8.3 当前代码

**服务层**:
- `src/main/services/WorkflowStateManager.ts`（状态管理）
- `src/main/services/TaskScheduler.ts`（任务调度，需扩展）
- `src/main/services/FileSystemService.ts`（文件系统）
- `src/main/services/APIManager.ts`（API管理）

**Panel组件**:
- `src/renderer/pages/workflows/panels/ChapterSplitPanel.tsx`（Mock数据）
- `src/renderer/pages/workflows/panels/StoryboardPanel.tsx`（Mock数据）
- `src/renderer/pages/workflows/panels/VoiceoverPanel.tsx`（Mock数据）

**工作流定义**:
- `src/main/workflows/novel-to-video-definition.ts`（参考定义）

### 8.4 外部API文档

- **DeepSeek API**: https://platform.deepseek.com/api-docs
- **接口AI（图片/视频生成）**: https://api.jiekou.ai/docs
  - 文生图: `/v3/async/z-image-turbo`
  - 图生图: `/v3/nano-banana-pro-light-i2i`
  - 图生视频: `/v3/async/sora-2-video-reverse`
  - 任务查询: `/v3/async/task-result`

---

## 九、下一步行动（立即执行）

### 9.1 审查与决策（Week 0）

- [ ] **阅读本文档**：团队全员阅读并理解
- [ ] **审查n8n分析报告**：`docs/plan/n8n-workflow-comparison-analysis.md`
- [ ] **代码审查**：特别是 `ChapterSplitPanel.tsx`、`WorkflowStateManager.ts`
- [ ] **决策确认**：批准12周路线图，分配开发资源
- [ ] **API Key准备**：获取DeepSeek和接口AI的API密钥

### 9.2 启动Phase 1（Week 1）

- [ ] **创建分支**: `git checkout -b feature/async-task-manager`
- [ ] **创建文件**: `src/main/services/AsyncTaskManager.ts`
- [ ] **编写单元测试**: `tests/unit/services/AsyncTaskManager.test.ts`
- [ ] **实现核心逻辑**: `executeWithPolling`、`executeWithRetry`
- [ ] **提交PR**: 请求Code Review

### 9.3 环境配置

- [ ] **安装依赖**: 确认无需新增npm包（使用原生fetch）
- [ ] **配置API Key**: 在 `.env` 或ConfigManager中添加：
  ```
  DEEPSEEK_API_KEY=sk-xxx
  JIEKOU_API_KEY=sk-yyy
  ```
- [ ] **配置IPC**: 注册新的IPC处理器
- [ ] **配置预加载**: 更新 `src/preload/index.ts`

---

**文档版本**: v1.0.0
**创建时间**: 2026-01-01
**下次更新**: Week 4（Phase 1验收后）
**维护者**: Claude Code (Sonnet 4.5)

---

**附录**: 关键决策记录（ADR）

| 决策编号 | 决策内容 | 理由 | 日期 |
|---------|---------|------|------|
| ADR-001 | 采用并行批量处理（优于n8n串行） | 性能提升10倍 | 2026-01-01 |
| ADR-002 | 短期使用轮询，长期考虑Webhook | 平衡开发复杂度和资源效率 | 2026-01-01 |
| ADR-003 | 不引入LangChain，直接调用API | 保持轻量化 | 2026-01-01 |
| ADR-004 | 使用文件系统（JSON），不引入数据库 | 符合轻量化原则 | 2026-01-01 |
| ADR-005 | 小说转视频作为插件，不注册到WorkflowRegistry | 明确插件vs工作流定位 | 2026-01-01 |

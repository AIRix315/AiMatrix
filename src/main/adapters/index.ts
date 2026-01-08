/**
 * Adapters - 统一导出所有适配器
 *
 * 适配器架构：
 * - BaseAdapter: 抽象基类，定义统一接口
 * - OpenAICompatibleAdapter: OpenAI 兼容格式（同步调用）
 * - AsyncPollingAdapter: 异步轮询格式（提交任务后轮询）
 * - ComfyUIWorkflowAdapter: ComfyUI 工作流格式
 *
 * 使用示例：
 * ```typescript
 * import { OpenAICompatibleAdapter } from './adapters';
 *
 * const adapter = new OpenAICompatibleAdapter(logger);
 * const result = await adapter.callAPI(provider, request);
 * ```
 */

export { BaseAdapter } from './BaseAdapter';
export { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';
export { AsyncPollingAdapter } from './AsyncPollingAdapter';
export { ComfyUIWorkflowAdapter } from './ComfyUIWorkflowAdapter';

export type { APICallRequest, APICallResponse } from './BaseAdapter';

/**
 * ComfyUIWorkflowAdapter - ComfyUI 工作流适配器
 *
 * 用于调用 ComfyUI 工作流引擎（本地或远程）
 *
 * 支持的服务：
 * - ComfyUI 本地实例
 * - RunningHub ComfyUI 云端服务
 * - N8N 工作流引擎
 *
 * 调用流程：
 * 1. 构建 ComfyUI 工作流 JSON
 * 2. 提交工作流到 ComfyUI API
 * 3. 使用 WebSocket 或轮询获取执行结果
 * 4. 下载生成的资产
 *
 * 注意：
 * - ComfyUI 工作流格式较为复杂，需要根据具体工作流模板构建
 * - 本实现提供基础框架，实际使用需要根据工作流定义调整
 */

import { BaseAdapter, APICallRequest, APICallResponse } from './BaseAdapter';
import { Logger } from '../services/Logger';
import { APIFormat } from '@/shared/types';
import type { APIProviderConfig } from '@/shared/types';

export class ComfyUIWorkflowAdapter extends BaseAdapter {
  constructor(logger: Logger) {
    super(logger);
  }

  get supportedFormat(): string {
    return APIFormat.COMFYUI_WORKFLOW;
  }

  async callAPI(
    provider: APIProviderConfig,
    request: APICallRequest
  ): Promise<APICallResponse> {
    const startTime = Date.now();

    try {
      await this.logger.info(
        `ComfyUI工作流调用: ${provider.name}`,
        'ComfyUIWorkflowAdapter',
        { workflowId: provider.workflowId }
      );

      // 检查工作流ID
      if (!provider.workflowId) {
        throw new Error('ComfyUI Provider 需要配置 workflowId');
      }

      // 1. 构建工作流参数
      const workflowParams = this.buildWorkflowParams(provider, request);

      // 2. 提交工作流
      const promptId = await this.submitWorkflow(provider, workflowParams);

      await this.logger.info(
        `工作流已提交: ${promptId}`,
        'ComfyUIWorkflowAdapter',
        { providerId: provider.id, promptId }
      );

      // 3. 获取执行结果（轮询或 WebSocket）
      const result = await this.getWorkflowResult(provider, promptId);

      const duration = Date.now() - startTime;

      await this.logger.info(
        `工作流完成 (${duration}ms)`,
        'ComfyUIWorkflowAdapter',
        { providerId: provider.id, promptId, duration }
      );

      return {
        success: true,
        data: result,
        taskId: promptId,
        duration,
      };
    } catch (error) {
      return this.handleError(error, provider);
    }
  }

  /**
   * 构建工作流参数
   */
  private buildWorkflowParams(
    provider: APIProviderConfig,
    request: APICallRequest
  ): Record<string, unknown> {
    // 基础参数
    const inputs: Record<string, unknown> = {
      prompt: request.input.prompt || '',
      seed: Math.floor(Math.random() * 1000000),
    };

    // 根据功能类型添加特定参数
    switch (request.category) {
      case 'image-generation':
        inputs.width = this.parseResolution(request.input.aspectRatio).width;
        inputs.height = this.parseResolution(request.input.aspectRatio).height;
        break;

      case 'video-generation':
        inputs.init_image = request.input.imageUrl;
        inputs.frames = 120; // 默认120帧（5秒@24fps）
        break;
    }

    return {
      workflow_id: provider.workflowId,
      inputs,
    };
  }

  /**
   * 提交工作流
   */
  private async submitWorkflow(
    provider: APIProviderConfig,
    params: Record<string, unknown>
  ): Promise<string> {
    const response = await this.fetch(
      `${provider.baseUrl}/prompt`,
      {
        method: 'POST',
        headers: this.buildHeaders(provider),
        body: JSON.stringify(params),
      },
      provider.timeout || 60000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`工作流提交失败: HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // ComfyUI 返回 prompt_id
    const promptId = data.prompt_id || data.id;
    if (!promptId) {
      throw new Error('工作流提交响应中缺少 prompt_id');
    }

    return promptId;
  }

  /**
   * 获取工作流执行结果（轮询方式）
   */
  private async getWorkflowResult(
    provider: APIProviderConfig,
    promptId: string
  ): Promise<unknown> {
    const maxAttempts = 120; // 最多轮询2分钟（每秒1次）
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      await this.sleep(1000); // 每秒轮询一次

      const response = await this.fetch(
        `${provider.baseUrl}/history/${promptId}`,
        {
          method: 'GET',
          headers: this.buildHeaders(provider),
        },
        provider.timeout || 30000
      );

      if (!response.ok) {
        continue; // 继续轮询
      }

      const data = await response.json();

      // 检查工作流是否完成
      if (data[promptId] && data[promptId].status?.completed) {
        return this.extractOutputs(data[promptId].outputs);
      }

      // 检查是否有错误
      if (data[promptId] && data[promptId].status?.status_str === 'error') {
        throw new Error('工作流执行失败');
      }
    }

    throw new Error(`工作流超时: 轮询次数超过 ${maxAttempts} 次`);
  }

  /**
   * 提取工作流输出
   */
  private extractOutputs(outputs: any): unknown {
    if (!outputs) return null;

    // ComfyUI 输出通常包含多个节点的结果
    // 这里简化处理，返回第一个有文件的输出
    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput.images && nodeOutput.images.length > 0) {
        return {
          type: 'image',
          files: nodeOutput.images.map((img: any) => ({
            filename: img.filename,
            subfolder: img.subfolder,
            type: img.type,
          })),
        };
      }
      if (nodeOutput.videos && nodeOutput.videos.length > 0) {
        return {
          type: 'video',
          files: nodeOutput.videos.map((vid: any) => ({
            filename: vid.filename,
            subfolder: vid.subfolder,
            type: vid.type,
          })),
        };
      }
    }

    return outputs;
  }

  /**
   * 解析宽高比为分辨率
   */
  private parseResolution(aspectRatio?: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '1:1':
        return { width: 1024, height: 1024 };
      case '16:9':
        return { width: 1920, height: 1080 };
      case '9:16':
        return { width: 1080, height: 1920 };
      case '4:3':
        return { width: 1024, height: 768 };
      default:
        return { width: 1024, height: 1024 };
    }
  }

  /**
   * 休眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

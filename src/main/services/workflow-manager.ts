import { WorkflowConfig, WorkflowResult, JobStatus } from '../models/workflow';
import { ComfyUIAdapter } from '../adapters/comfyui-adapter';
import { N8NAdapter } from '../adapters/n8n-adapter';
import { MCPAdapter } from '../adapters/mcp-adapter';

export class WorkflowManager {
  private comfyUIAdapter: ComfyUIAdapter;
  private n8nAdapter: N8NAdapter;
  private mcpAdapter: MCPAdapter;
  private activeJobs: Map<string, WorkflowConfig> = new Map();

  constructor() {
    this.comfyUIAdapter = new ComfyUIAdapter('http://localhost:8188');
    this.n8nAdapter = new N8NAdapter('http://localhost:5678');
    this.mcpAdapter = new MCPAdapter();
  }

  public async initialize(): Promise<void> {
    try {
      // 初始化各个适配器
      await this.comfyUIAdapter.initialize();
      await this.n8nAdapter.initialize();
      await this.mcpAdapter.initialize();
      
      console.log('工作流管理器初始化完成');
    } catch (error) {
      console.error('工作流管理器初始化失败:', error);
      throw error;
    }
  }

  public async execute(config: WorkflowConfig): Promise<string> {
    try {
      const jobId = this.generateJobId();
      this.activeJobs.set(jobId, config);

      let result: WorkflowResult;

      switch (config.type) {
        case 'comfyui':
          result = await this.comfyUIAdapter.execute(config);
          break;
        case 'n8n':
          result = await this.n8nAdapter.execute(config);
          break;
        case 'mcp':
          result = await this.mcpAdapter.execute(config);
          break;
        default:
          throw new Error(`不支持的工作流类型: ${config.type}`);
      }

      if (result.success) {
        console.log(`工作流 ${config.name} 执行成功，作业ID: ${jobId}`);
      } else {
        console.error(`工作流 ${config.name} 执行失败:`, result.error);
      }

      return jobId;
    } catch (error) {
      console.error(`执行工作流 ${config.name} 失败:`, error);
      throw error;
    }
  }

  public async getStatus(jobId: string): Promise<JobStatus> {
    try {
      const config = this.activeJobs.get(jobId);
      if (!config) {
        throw new Error(`未找到作业 ${jobId}`);
      }

      let status: JobStatus;

      switch (config.type) {
        case 'comfyui':
          status = await this.comfyUIAdapter.getStatus(jobId);
          break;
        case 'n8n':
          status = await this.n8nAdapter.getStatus(jobId);
          break;
        case 'mcp':
          status = await this.mcpAdapter.getStatus(jobId);
          break;
        default:
          throw new Error(`不支持的工作流类型: ${config.type}`);
      }

      return status;
    } catch (error) {
      console.error(`获取作业 ${jobId} 状态失败:`, error);
      throw error;
    }
  }

  public async cancel(jobId: string): Promise<void> {
    try {
      const config = this.activeJobs.get(jobId);
      if (!config) {
        throw new Error(`未找到作业 ${jobId}`);
      }

      switch (config.type) {
        case 'comfyui':
          await this.comfyUIAdapter.cancel(jobId);
          break;
        case 'n8n':
          await this.n8nAdapter.cancel(jobId);
          break;
        case 'mcp':
          await this.mcpAdapter.cancel(jobId);
          break;
        default:
          throw new Error(`不支持的工作流类型: ${config.type}`);
      }

      this.activeJobs.delete(jobId);
      console.log(`作业 ${jobId} 已取消`);
    } catch (error) {
      console.error(`取消作业 ${jobId} 失败:`, error);
      throw error;
    }
  }

  public async listWorkflows(projectPath: string): Promise<WorkflowConfig[]> {
    try {
      // 这里应该从项目配置中读取工作流列表
      // 暂时返回空数组
      return [];
    } catch (error) {
      console.error('列出工作流失败:', error);
      throw error;
    }
  }

  public async saveWorkflow(projectPath: string, config: WorkflowConfig): Promise<void> {
    try {
      // 这里应该将工作流配置保存到项目中
      console.log(`工作流 ${config.name} 保存成功`);
    } catch (error) {
      console.error(`保存工作流 ${config.name} 失败:`, error);
      throw error;
    }
  }

  public async loadWorkflow(projectPath: string, workflowId: string): Promise<WorkflowConfig> {
    try {
      // 这里应该从项目中加载工作流配置
      throw new Error(`未找到工作流 ${workflowId}`);
    } catch (error) {
      console.error(`加载工作流 ${workflowId} 失败:`, error);
      throw error;
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async cleanup(): Promise<void> {
    // 取消所有活动作业
    for (const [jobId] of this.activeJobs) {
      try {
        await this.cancel(jobId);
      } catch (error) {
        console.warn(`取消作业 ${jobId} 失败:`, error);
      }
    }

    // 清理适配器
    await this.comfyUIAdapter.cleanup();
    await this.n8nAdapter.cleanup();
    await this.mcpAdapter.cleanup();

    console.log('工作流管理器清理完成');
  }
}
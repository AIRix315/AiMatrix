import { BaseAdapter } from './base-adapter';
import { WorkflowConfig, WorkflowResult, JobStatus } from '../models/workflow';

export class ComfyUIAdapter extends BaseAdapter {
  private activeJobs: Map<string, JobStatus> = new Map();

  constructor(endpoint: string) {
    super(endpoint);
  }

  public async initialize(): Promise<void> {
    try {
      // 检查ComfyUI服务是否可用
      console.log('ComfyUI适配器初始化完成');
    } catch (error) {
      console.error('ComfyUI适配器初始化失败:', error);
      throw error;
    }
  }

  public async execute(config: WorkflowConfig): Promise<WorkflowResult> {
    try {
      const startTime = Date.now();
      const jobId = this.generateJobId();

      // 创建初始作业状态
      const jobStatus: JobStatus = {
        id: jobId,
        status: 'pending',
        startTime: new Date()
      };
      this.activeJobs.set(jobId, jobStatus);

      // 模拟ComfyUI API调用
      console.log(`执行ComfyUI工作流: ${config.name}`);

      // 更新状态为运行中
      jobStatus.status = 'running';
      jobStatus.message = '工作流正在执行';

      // 模拟异步执行
      setTimeout(() => {
        const finalStatus = this.activeJobs.get(jobId);
        if (finalStatus) {
          finalStatus.status = 'completed';
          finalStatus.endTime = new Date();
          finalStatus.message = '工作流执行完成';
        }
      }, 2000);

      const executionTime = Date.now() - startTime;

      return this.createSuccessResult(
        {
          jobId,
          message: 'ComfyUI工作流已提交执行',
          workflowType: 'comfyui'
        },
        executionTime
      );
    } catch (error) {
      console.error(`执行ComfyUI工作流失败:`, error);
      return this.createErrorResult(`ComfyUI工作流执行失败: ${error}`);
    }
  }

  public async getStatus(jobId: string): Promise<JobStatus> {
    const jobStatus = this.activeJobs.get(jobId);
    if (!jobStatus) {
      throw new Error(`未找到作业: ${jobId}`);
    }

    // 模拟进度更新
    if (jobStatus.status === 'running') {
      jobStatus.progress = Math.floor(Math.random() * 100);
    }

    return jobStatus;
  }

  public async cancel(jobId: string): Promise<void> {
    const jobStatus = this.activeJobs.get(jobId);
    if (!jobStatus) {
      throw new Error(`未找到作业: ${jobId}`);
    }

    jobStatus.status = 'cancelled';
    jobStatus.endTime = new Date();
    jobStatus.message = '工作流已取消';

    console.log(`ComfyUI作业 ${jobId} 已取消`);
  }

  public async cleanup(): Promise<void> {
    // 取消所有活动作业
    for (const [jobId, jobStatus] of this.activeJobs) {
      if (jobStatus.status === 'running' || jobStatus.status === 'pending') {
        jobStatus.status = 'cancelled';
        jobStatus.endTime = new Date();
        jobStatus.message = '应用关闭时取消';
      }
    }

    this.activeJobs.clear();
    console.log('ComfyUI适配器清理完成');
  }
}
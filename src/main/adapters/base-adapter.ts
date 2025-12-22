import { WorkflowConfig, WorkflowResult, JobStatus } from '../models/workflow';

export abstract class BaseAdapter {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  public abstract initialize(): Promise<void>;
  public abstract execute(config: WorkflowConfig): Promise<WorkflowResult>;
  public abstract getStatus(jobId: string): Promise<JobStatus>;
  public abstract cancel(jobId: string): Promise<void>;
  public abstract cleanup(): Promise<void>;

  protected generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createErrorResult(error: string): WorkflowResult {
    return {
      success: false,
      error,
      executionTime: 0
    };
  }

  protected createSuccessResult(result: any, executionTime: number): WorkflowResult {
    return {
      success: true,
      result,
      executionTime
    };
  }
}
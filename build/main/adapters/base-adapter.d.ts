import { WorkflowConfig, WorkflowResult, JobStatus } from '../models/workflow';
export declare abstract class BaseAdapter {
    protected endpoint: string;
    constructor(endpoint: string);
    abstract initialize(): Promise<void>;
    abstract execute(config: WorkflowConfig): Promise<WorkflowResult>;
    abstract getStatus(jobId: string): Promise<JobStatus>;
    abstract cancel(jobId: string): Promise<void>;
    abstract cleanup(): Promise<void>;
    protected generateJobId(): string;
    protected createErrorResult(error: string): WorkflowResult;
    protected createSuccessResult(result: any, executionTime: number): WorkflowResult;
}

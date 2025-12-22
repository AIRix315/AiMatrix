import { BaseAdapter } from './base-adapter';
import { WorkflowConfig, WorkflowResult, JobStatus } from '../models/workflow';
export declare class MCPAdapter extends BaseAdapter {
    private activeJobs;
    constructor();
    initialize(): Promise<void>;
    execute(config: WorkflowConfig): Promise<WorkflowResult>;
    getStatus(jobId: string): Promise<JobStatus>;
    cancel(jobId: string): Promise<void>;
    cleanup(): Promise<void>;
}

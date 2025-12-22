import { BaseAdapter } from './base-adapter';
import { WorkflowConfig, WorkflowResult, JobStatus } from '../models/workflow';
export declare class ComfyUIAdapter extends BaseAdapter {
    private activeJobs;
    constructor(endpoint: string);
    initialize(): Promise<void>;
    execute(config: WorkflowConfig): Promise<WorkflowResult>;
    getStatus(jobId: string): Promise<JobStatus>;
    cancel(jobId: string): Promise<void>;
    cleanup(): Promise<void>;
}

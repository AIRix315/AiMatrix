import { WorkflowConfig, JobStatus } from '../models/workflow';
export declare class WorkflowManager {
    private comfyUIAdapter;
    private n8nAdapter;
    private mcpAdapter;
    private activeJobs;
    constructor();
    initialize(): Promise<void>;
    execute(config: WorkflowConfig): Promise<string>;
    getStatus(jobId: string): Promise<JobStatus>;
    cancel(jobId: string): Promise<void>;
    listWorkflows(projectPath: string): Promise<WorkflowConfig[]>;
    saveWorkflow(projectPath: string, config: WorkflowConfig): Promise<void>;
    loadWorkflow(projectPath: string, workflowId: string): Promise<WorkflowConfig>;
    private generateJobId;
    cleanup(): Promise<void>;
}

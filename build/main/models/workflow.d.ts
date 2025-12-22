export interface WorkflowInput {
    id: string;
    name: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file';
    required: boolean;
    description?: string;
    defaultValue?: any;
}
export interface WorkflowOutput {
    id: string;
    name: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file';
    description?: string;
}
export interface WorkflowConfig {
    id: string;
    name: string;
    type: 'comfyui' | 'n8n' | 'mcp';
    config: Record<string, any>;
    inputs: WorkflowInput[];
    outputs: WorkflowOutput[];
    createdAt: Date;
    updatedAt: Date;
}
export interface WorkflowResult {
    success: boolean;
    result?: any;
    error?: string;
    executionTime?: number;
    outputs?: Record<string, any>;
}
export interface JobStatus {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    message?: string;
    startTime?: Date;
    endTime?: Date;
    result?: WorkflowResult;
}

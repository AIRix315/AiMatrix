import { ProjectConfig, AssetConfig } from '../models/project';
interface WorkflowConfig {
    name: string;
    type: 'comfyui' | 'n8n' | 'mcp';
    inputs: Array<{
        name: string;
        type: string;
    }>;
    outputs: Array<{
        name: string;
        type: string;
    }>;
}
interface MCPConfig {
    name: string;
    type: string;
    endpoint: string;
}
interface LocalServiceConfig {
    type: string;
    name: string;
    command: string;
    workingDirectory: string;
    port?: number;
}
export declare class ValidationUtils {
    static validateProject(config: ProjectConfig): ValidationResult;
    static validateAsset(config: AssetConfig): ValidationResult;
    static validateWorkflow(config: WorkflowConfig): ValidationResult;
    static validateMCPConfig(config: MCPConfig): ValidationResult;
    static validateLocalServiceConfig(config: LocalServiceConfig): ValidationResult;
    static validateFileName(fileName: string): ValidationResult;
    static validatePath(path: string): ValidationResult;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export {};

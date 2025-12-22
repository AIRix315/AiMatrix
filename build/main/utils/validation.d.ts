import { ProjectConfig, AssetConfig } from '../models/project';
import { WorkflowConfig } from '../models/workflow';
import { MCPConfig } from '../models/mcp';
import { LocalServiceConfig } from '../models/service';
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

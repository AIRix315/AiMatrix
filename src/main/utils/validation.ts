import { ProjectConfig, AssetConfig } from '../models/project';
import { WorkflowConfig } from '../models/workflow';
import { MCPConfig } from '../models/mcp';
import { LocalServiceConfig } from '../models/service';

export class ValidationUtils {
  // 项目验证
  public static validateProject(config: ProjectConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('项目名称不能为空');
    }

    if (!config.path || config.path.trim().length === 0) {
      errors.push('项目路径不能为空');
    }

    if (!config.settings) {
      errors.push('项目设置不能为空');
    } else {
      if (!config.settings.outputFormat) {
        errors.push('输出格式不能为空');
      }

      if (config.settings.quality < 1 || config.settings.quality > 4320) {
        errors.push('质量设置必须在1-4320之间');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 资产验证
  public static validateAsset(config: AssetConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('资产名称不能为空');
    }

    if (!config.path || config.path.trim().length === 0) {
      errors.push('资产路径不能为空');
    }

    const validTypes = ['text', 'image', 'video'];
    if (!validTypes.includes(config.type)) {
      errors.push('资产类型必须是 text、image 或 video');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 工作流验证
  public static validateWorkflow(config: WorkflowConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('工作流名称不能为空');
    }

    const validTypes = ['comfyui', 'n8n', 'mcp'];
    if (!validTypes.includes(config.type)) {
      errors.push('工作流类型必须是 comfyui、n8n 或 mcp');
    }

    if (!config.inputs || config.inputs.length === 0) {
      errors.push('工作流至少需要一个输入');
    }

    if (!config.outputs || config.outputs.length === 0) {
      errors.push('工作流至少需要一个输出');
    }

    // 验证输入
    config.inputs.forEach((input, index) => {
      if (!input.name || input.name.trim().length === 0) {
        errors.push(`输入 ${index + 1} 名称不能为空`);
      }

      const validInputTypes = ['text', 'image', 'video', 'audio', 'file'];
      if (!validInputTypes.includes(input.type)) {
        errors.push(`输入 ${index + 1} 类型无效`);
      }
    });

    // 验证输出
    config.outputs.forEach((output, index) => {
      if (!output.name || output.name.trim().length === 0) {
        errors.push(`输出 ${index + 1} 名称不能为空`);
      }

      const validOutputTypes = ['text', 'image', 'video', 'audio', 'file'];
      if (!validOutputTypes.includes(output.type)) {
        errors.push(`输出 ${index + 1} 类型无效`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // MCP配置验证
  public static validateMCPConfig(config: MCPConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('MCP服务名称不能为空');
    }

    if (!config.type || config.type.trim().length === 0) {
      errors.push('MCP服务类型不能为空');
    }

    if (!config.endpoint || config.endpoint.trim().length === 0) {
      errors.push('MCP服务端点不能为空');
    }

    // 验证端点格式
    try {
      new URL(config.endpoint);
    } catch {
      errors.push('MCP服务端点格式无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 本地服务配置验证
  public static validateLocalServiceConfig(config: LocalServiceConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.type || config.type.trim().length === 0) {
      errors.push('服务类型不能为空');
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push('服务名称不能为空');
    }

    if (!config.command || config.command.trim().length === 0) {
      errors.push('服务命令不能为空');
    }

    if (!config.workingDirectory || config.workingDirectory.trim().length === 0) {
      errors.push('工作目录不能为空');
    }

    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('端口号必须在1-65535之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 文件名验证
  public static validateFileName(fileName: string): ValidationResult {
    const errors: string[] = [];

    if (!fileName || fileName.trim().length === 0) {
      errors.push('文件名不能为空');
    }

    // 检查非法字符
    const illegalChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (illegalChars.test(fileName)) {
      errors.push('文件名包含非法字符');
    }

    // 检查长度
    if (fileName.length > 255) {
      errors.push('文件名长度不能超过255个字符');
    }

    // 检查保留名称
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const nameWithoutExt = fileName.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      errors.push('文件名不能使用系统保留名称');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 路径验证
  public static validatePath(path: string): ValidationResult {
    const errors: string[] = [];

    if (!path || path.trim().length === 0) {
      errors.push('路径不能为空');
    }

    // 检查路径长度（Windows限制）
    if (path.length > 260) {
      errors.push('路径长度不能超过260个字符');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
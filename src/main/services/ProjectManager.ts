/**
 * 项目管理器实现
 * 
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 * 
 * 参考：docs/06-core-services-design-v1.0.1.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { timeService } from './TimeService';
import { 
  ProjectManager as IProjectManager,
  ProjectConfig,
  ProjectSettings,
  AssetConfig,
  ServiceError,
  LogEntry
} from '../../common/types';

/**
 * 项目管理器实现类
 */
export class ProjectManager implements IProjectManager {
  private projects: Map<string, ProjectConfig> = new Map();
  private projectsPath: string;
  private isInitialized = false;

  constructor() {
    // 设置项目存储路径
    this.projectsPath = path.join(process.cwd(), 'projects');
  }

  /**
   * 初始化项目管理器
   */
  public async initialize(): Promise<void> {
    try {
      // 确保项目目录存在
      await fs.mkdir(this.projectsPath, { recursive: true });
      
      // 加载现有项目
      await this.loadAllProjects();
      
      this.isInitialized = true;
      this.log('info', '项目管理器初始化完成');
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_MANAGER_INIT_FAILED',
        message: `项目管理器初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'initialize'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 清理项目管理器
   */
  public async cleanup(): Promise<void> {
    try {
      // 保存所有项目
      await this.saveAllProjects();
      
      this.projects.clear();
      this.isInitialized = false;
      this.log('info', '项目管理器清理完成');
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_MANAGER_CLEANUP_FAILED',
        message: `项目管理器清理失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'cleanup'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 创建新项目
   */
  public async createProject(name: string, template?: string): Promise<ProjectConfig> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: createProject');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const projectId = uuidv4();
      const projectPath = path.join(this.projectsPath, projectId);
      
      // 创建项目目录
      await fs.mkdir(projectPath, { recursive: true });
      
      // 创建项目配置
      const currentTime = await timeService.getCurrentTime();
      const defaultSettings: ProjectSettings = {
        defaultWorkflow: template || 'default',
        outputFormat: 'mp4',
        quality: 80
      };

      const projectConfig: ProjectConfig = {
        id: projectId,
        name,
        path: projectPath,
        createdAt: currentTime,
        updatedAt: currentTime,
        settings: defaultSettings,
        workflows: [],
        assets: []
      };

      // 如果有模板，复制模板文件
      if (template) {
        await this.applyTemplate(projectPath, template);
      }

      // 保存项目配置
      await this.saveProjectConfig(projectConfig);
      
      // 添加到内存
      this.projects.set(projectId, projectConfig);
      
      this.log('info', `项目创建成功: ${name} (${projectId})`);
      return projectConfig;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_CREATE_FAILED',
        message: `创建项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'createProject'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 加载项目
   */
  public async loadProject(projectId: string): Promise<ProjectConfig> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: loadProject');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      // 检查内存中是否已存在
      if (this.projects.has(projectId)) {
        return this.projects.get(projectId)!;
      }

      // 从文件加载
      const configPath = path.join(this.projectsPath, projectId, 'project.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const projectConfig: ProjectConfig = JSON.parse(configData);
      
      // 转换日期字符串为Date对象
      projectConfig.createdAt = new Date(projectConfig.createdAt);
      projectConfig.updatedAt = new Date(projectConfig.updatedAt);
      
      // 添加到内存
      this.projects.set(projectId, projectConfig);
      
      this.log('info', `项目加载成功: ${projectId}`);
      return projectConfig;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_LOAD_FAILED',
        message: `加载项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'loadProject'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 保存项目
   */
  public async saveProject(projectId: string, config: ProjectConfig): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: saveProject');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      // 更新时间戳
      config.updatedAt = await timeService.getCurrentTime();
      
      // 保存到文件
      await this.saveProjectConfig(config);
      
      // 更新内存
      this.projects.set(projectId, config);
      
      this.log('info', `项目保存成功: ${projectId}`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_SAVE_FAILED',
        message: `保存项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'saveProject'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 删除项目
   */
  public async deleteProject(projectId: string): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: deleteProject');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`项目不存在: ${projectId}`);
      }

      // 删除项目目录
      await fs.rm(project.path, { recursive: true, force: true });
      
      // 从内存中移除
      this.projects.delete(projectId);
      
      this.log('info', `项目删除成功: ${projectId}`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_DELETE_FAILED',
        message: `删除项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'deleteProject'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 列出所有项目
   */
  public async listProjects(): Promise<ProjectConfig[]> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: listProjects');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const projectList = Array.from(this.projects.values());
      this.log('info', `列出项目: ${projectList.length} 个项目`);
      return projectList;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_LIST_FAILED',
        message: `列出项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'listProjects'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 链接全局资产到项目
   */
  public async linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: linkGlobalAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`项目不存在: ${projectId}`);
      }

      // 这里应该调用AssetManager获取全局资产信息
      // 暂时创建一个简单的引用记录
      const linkPath = path.join(project.path, 'links', `${globalAssetId}.json`);
      await fs.mkdir(path.dirname(linkPath), { recursive: true });
      await fs.writeFile(linkPath, JSON.stringify({
        globalAssetId,
        linkedAt: (await timeService.getCurrentTime()).toISOString()
      }), 'utf-8');

      this.log('info', `全局资产链接成功: ${globalAssetId} -> ${projectId}`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_LINK_ASSET_FAILED',
        message: `链接全局资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'linkGlobalAsset'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 获取项目链接的全局资产
   */
  public async getLinkedAssets(projectId: string): Promise<AssetConfig[]> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: getLinkedAssets');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`项目不存在: ${projectId}`);
      }

      // 读取链接目录
      const linksPath = path.join(project.path, 'links');
      const linkedAssets: AssetConfig[] = [];

      try {
        const linkFiles = await fs.readdir(linksPath);
        
        for (const file of linkFiles) {
          if (file.endsWith('.json')) {
            const linkData = JSON.parse(
              await fs.readFile(path.join(linksPath, file), 'utf-8')
            );
            
            // 这里应该调用AssetManager获取实际资产信息
            // 暂时返回空数组
            linkedAssets.push({} as AssetConfig);
          }
        }
      } catch {
        // 链接目录不存在，返回空数组
      }

      this.log('info', `获取链接资产: ${projectId}, 数量: ${linkedAssets.length}`);
      return linkedAssets;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_GET_LINKED_ASSETS_FAILED',
        message: `获取链接资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getCurrentTime(),
        service: 'ProjectManager',
        operation: 'getLinkedAssets'
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 加载所有项目
   * @private
   */
  private async loadAllProjects(): Promise<void> {
    try {
      const projectDirs = await fs.readdir(this.projectsPath, { withFileTypes: true });
      
      for (const dir of projectDirs) {
        if (dir.isDirectory()) {
          try {
            await this.loadProject(dir.name);
          } catch (error) {
            this.log('warn', `跳过无效项目目录: ${dir.name}, 错误: ${error}`);
          }
        }
      }
    } catch (error) {
      this.log('warn', `加载项目目录失败: ${error}`);
    }
  }

  /**
   * 保存所有项目
   * @private
   */
  private async saveAllProjects(): Promise<void> {
    try {
      const savePromises = Array.from(this.projects.values()).map(
        config => this.saveProjectConfig(config)
      );
      await Promise.all(savePromises);
    } catch (error) {
      this.log('error', `批量保存项目失败: ${error}`);
    }
  }

  /**
   * 保存项目配置
   * @private
   */
  private async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const configPath = path.join(config.path, 'project.json');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * 应用项目模板
   * @private
   */
  private async applyTemplate(projectPath: string, template: string): Promise<void> {
    // 这里应该实现模板应用逻辑
    // 暂时创建一个模板目录
    const templatePath = path.join(projectPath, 'templates', template);
    await fs.mkdir(templatePath, { recursive: true });
    
    this.log('info', `应用项目模板: ${template} -> ${projectPath}`);
  }

  /**
   * 记录日志
   * @private
   */
  private log(level: LogEntry['level'], message: string, data?: any): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      service: 'ProjectManager',
      data
    };
    
    console.log(`[ProjectManager] ${level.toUpperCase()}: ${message}`, data || '');
  }
}

// 导出单例实例
export const projectManager = new ProjectManager();
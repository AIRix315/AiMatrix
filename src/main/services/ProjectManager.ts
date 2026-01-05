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
import { configManager } from './ConfigManager';
import {
  ProjectManager as IProjectManager,
  ProjectConfig,
  ProjectSettings,
  ServiceError,
  LogEntry,
} from '../../common/types';
import type { AssetMetadata } from '../../shared/types';

/**
 * 项目管理器实现类
 */
export class ProjectManager implements IProjectManager {
  private projects: Map<string, ProjectConfig> = new Map();
  private projectsPath: string;
  private isInitialized = false;

  // 写操作队列，保证project.json的串行写入，防止并发竞争
  private writeQueue: Promise<void> = Promise.resolve();

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
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'initialize',
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
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'cleanup',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 创建新项目
   */
  public async createProject(
    name: string,
    template?: string
  ): Promise<ProjectConfig> {
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

      // 创建工作流JSON文件
      const workflowId = uuidv4();
      await this.createWorkflowFile(workflowId, name, template || 'workflow');

      // 创建项目配置
      const currentTime = await timeService.getISOString();
      const defaultSettings: ProjectSettings = {
        defaultWorkflow: template || 'default',
        outputFormat: 'mp4',
        quality: 80,
      };

      const projectConfig: ProjectConfig = {
        id: projectId,
        name,
        path: projectPath,
        createdAt: currentTime,
        updatedAt: currentTime,
        settings: defaultSettings,
        workflows: [workflowId],
        workflowType: template,
        inputAssets: [],
        outputAssets: [],
        immutable: false,
      };

      // 如果有模板，复制模板文件
      if (template) {
        await this.applyTemplate(projectPath, template);
      }

      // 自动注入插件配置（如果template对应插件）
      if (template && template !== 'workflow') {
        try {
          // 动态导入PluginManager以避免循环依赖
          const { pluginManager } = await import('./PluginManager');

          // 尝试加载插件(如果未加载)
          try {
            await pluginManager.loadPlugin(template);
          } catch (error) {
            this.log('warn', `Plugin ${template} not found or failed to load`, error);
          }

          // 注入插件配置
          const updatedConfig = await pluginManager.injectPluginConfig(
            template,
            projectConfig
          );

          // 更新projectConfig
          Object.assign(projectConfig, updatedConfig);

          this.log('info', `Plugin config injected for template ${template}`);
        } catch (error) {
          this.log('warn', `Failed to inject plugin config for ${template}`, error);
        }
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
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'createProject',
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
      const configPath = path.join(
        this.projectsPath,
        projectId,
        'project.json'
      );
      const configData = await fs.readFile(configPath, 'utf-8');
      const projectConfig: ProjectConfig = JSON.parse(configData);

      // 保持 ISO 8601 字符串格式，无需转换

      // 添加到内存
      this.projects.set(projectId, projectConfig);

      this.log('info', `项目加载成功: ${projectId}`);
      return projectConfig;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_LOAD_FAILED',
        message: `加载项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'loadProject',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 保存项目
   */
  public async saveProject(
    projectId: string,
    config: ProjectConfig
  ): Promise<void> {
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
      config.updatedAt = await timeService.getISOString();

      // 保存到文件
      await this.saveProjectConfig(config);

      // 更新内存
      this.projects.set(projectId, config);

      this.log('info', `项目保存成功: ${projectId}`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_SAVE_FAILED',
        message: `保存项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'saveProject',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 添加输入资源引用
   * @param projectId 项目ID
   * @param assetId 资源ID
   */
  public async addInputAsset(
    projectId: string,
    assetId: string
  ): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: addInputAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const project = await this.loadProject(projectId);

      // 检查项目是否不可修改
      if (project.immutable) {
        throw new Error('项目已完成，不可修改');
      }

      // 检查是否已存在
      if (!project.inputAssets.includes(assetId)) {
        project.inputAssets.push(assetId);
        await this.saveProject(projectId, project);
        this.log('info', `添加输入资源: ${assetId} -> ${projectId}`);
      }
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_ADD_INPUT_ASSET_FAILED',
        message: `添加输入资源失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'addInputAsset',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 添加输出资源
   * @param projectId 项目ID
   * @param assetId 资源ID（项目生成的资源）
   */
  public async addOutputAsset(
    projectId: string,
    assetId: string
  ): Promise<void> {
    // 验证时间有效性
    const isTimeValid = await timeService.validateTimeIntegrity();
    if (!isTimeValid) {
      const syncSuccess = await timeService.syncWithNTP();
      if (!syncSuccess) {
        throw new Error('时间验证失败，无法执行操作: addOutputAsset');
      }
    }

    if (!this.isInitialized) {
      throw new Error('项目管理器未初始化');
    }

    try {
      const project = await this.loadProject(projectId);

      // 检查项目是否不可修改
      if (project.immutable) {
        throw new Error('项目已完成，不可修改');
      }

      // 检查是否已存在
      if (!project.outputAssets.includes(assetId)) {
        project.outputAssets.push(assetId);
        await this.saveProject(projectId, project);
        this.log('info', `添加输出资源: ${assetId} -> ${projectId}`);
      }
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_ADD_OUTPUT_ASSET_FAILED',
        message: `添加输出资源失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'addOutputAsset',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 安全删除项目
   * @param projectId 项目ID
   * @param deleteOutputs 是否删除输出资源（默认false）
   */
  public async deleteProject(
    projectId: string,
    deleteOutputs: boolean = false
  ): Promise<void> {
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
      const project = await this.loadProject(projectId);
      if (!project) {
        throw new Error(`项目不存在: ${projectId}`);
      }

      if (deleteOutputs && project.outputAssets.length > 0) {
        this.log(
          'info',
          `准备删除项目输出资源，共 ${project.outputAssets.length} 个`
        );
        for (const assetId of project.outputAssets) {
          this.log('info', `需要删除输出资源: ${assetId}`);
        }
      }

      // 删除项目目录
      await fs.rm(project.path, { recursive: true, force: true });

      // 从内存中移除
      this.projects.delete(projectId);

      this.log(
        'info',
        `项目删除成功: ${projectId}, 删除输出资源: ${deleteOutputs}`
      );
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_DELETE_FAILED',
        message: `删除项目失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'deleteProject',
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
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'listProjects',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 链接全局资产到项目
   */
  public async linkGlobalAsset(
    projectId: string,
    globalAssetId: string
  ): Promise<void> {
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
      const linkPath = path.join(
        project.path,
        'links',
        `${globalAssetId}.json`
      );
      await fs.mkdir(path.dirname(linkPath), { recursive: true });
      await fs.writeFile(
        linkPath,
        JSON.stringify({
          globalAssetId,
          linkedAt: await timeService.getISOString(),
        }),
        'utf-8'
      );

      this.log('info', `全局资产链接成功: ${globalAssetId} -> ${projectId}`);
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_LINK_ASSET_FAILED',
        message: `链接全局资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'linkGlobalAsset',
      };
      this.log('error', serviceError.message, serviceError);
      throw serviceError;
    }
  }

  /**
   * 获取项目链接的全局资产
   */
  public async getLinkedAssets(projectId: string): Promise<AssetMetadata[]> {
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
      const linkedAssets: AssetMetadata[] = [];

      try {
        const linkFiles = await fs.readdir(linksPath);

        for (const file of linkFiles) {
          if (file.endsWith('.json')) {
            // 读取链接文件
            await fs.readFile(path.join(linksPath, file), 'utf-8');

            // 这里应该调用AssetManager获取实际资产信息
            // 暂时返回空数组
            linkedAssets.push({} as AssetMetadata);
          }
        }
      } catch {
        // 链接目录不存在，返回空数组
      }

      this.log(
        'info',
        `获取链接资产: ${projectId}, 数量: ${linkedAssets.length}`
      );
      return linkedAssets;
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'PROJECT_GET_LINKED_ASSETS_FAILED',
        message: `获取链接资产失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: await timeService.getISOString(),
        service: 'ProjectManager',
        operation: 'getLinkedAssets',
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
      const projectDirs = await fs.readdir(this.projectsPath, {
        withFileTypes: true,
      });

      for (const dir of projectDirs) {
        if (dir.isDirectory()) {
          try {
            const configPath = path.join(
              this.projectsPath,
              dir.name,
              'project.json'
            );

            // 检查文件是否存在
            try {
              await fs.access(configPath);
            } catch {
              this.log(
                'warn',
                `跳过无效项目目录: ${dir.name} (缺少 project.json)`
              );
              continue;
            }

            // 读取文件内容
            const configData = await fs.readFile(configPath, 'utf-8');

            // 检查文件是否为空
            if (!configData || configData.trim().length === 0) {
              this.log(
                'warn',
                `跳过无效项目目录: ${dir.name} (project.json 为空，可能是测试残留)`
              );
              // 可选：自动清理空项目目录
              // await fs.rm(path.join(this.projectsPath, dir.name), { recursive: true, force: true });
              continue;
            }

            // 解析 JSON
            const projectConfig: ProjectConfig = JSON.parse(configData);

            // 验证必要字段
            if (!projectConfig.id || !projectConfig.name) {
              this.log('warn', `跳过无效项目目录: ${dir.name} (缺少必要字段)`);
              continue;
            }

            // 保持 ISO 8601 字符串格式，无需转换
            this.projects.set(projectConfig.id, projectConfig);
            this.log('info', `项目加载成功: ${projectConfig.id}`);
          } catch (error) {
            if (error instanceof SyntaxError) {
              this.log(
                'warn',
                `跳过无效项目目录: ${dir.name} (JSON 格式错误，可能是测试残留)`
              );
            } else {
              this.log('warn', `跳过无效项目目录: ${dir.name}, 错误: ${error}`);
            }
          }
        }
      }

      this.log('info', `项目加载完成，共 ${this.projects.size} 个有效项目`);
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
      const savePromises = Array.from(this.projects.values()).map(config =>
        this.saveProjectConfig(config)
      );
      await Promise.all(savePromises);
    } catch (error) {
      this.log('error', `批量保存项目失败: ${error}`);
    }
  }

  /**
   * 队列化写操作，确保串行执行，防止并发写入冲突
   * @private
   */
  private async queuedWrite<T>(operation: () => Promise<T>): Promise<T> {
    // 将操作加入队列
    const previousWrite = this.writeQueue;

    // 创建新的Promise链
    let resolveWrite: () => void;
    this.writeQueue = new Promise<void>(resolve => {
      resolveWrite = resolve;
    });

    try {
      // 等待前一个写操作完成
      await previousWrite;

      // 执行当前操作
      const result = await operation();

      // 标记当前操作完成
      resolveWrite!();

      return result;
    } catch (error) {
      // 即使失败也要标记完成,避免阻塞队列
      resolveWrite!();
      throw error;
    }
  }

  /**
   * 保存项目配置到project.json
   * @private
   */
  private async saveProjectConfig(config: ProjectConfig): Promise<void> {
    // 使用队列化写入防止并发竞争
    await this.queuedWrite(async () => {
      const configPath = path.join(config.path, 'project.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    });
  }

  /**
   * 创建工作流JSON文件
   * @param workflowId 工作流ID
   * @param projectName 项目名称
   * @param template 模板类型
   * @private
   */
  private async createWorkflowFile(
    workflowId: string,
    projectName: string,
    template: string
  ): Promise<void> {
    // 从配置管理器获取正确的工作区路径
    const workspacePath = configManager.getGeneralSettings().workspacePath;
    const workflowsDir = path.join(workspacePath, 'workflows');
    await fs.mkdir(workflowsDir, { recursive: true });

    const timestamp = await timeService.getCurrentTime();

    const workflowType =
      template === 'novel-to-video' ? 'novel-to-video' : 'custom';

    const workflow = {
      id: workflowId,
      name: projectName, // 直接使用项目名称
      type: workflowType,
      nodes: [],
      edges: [],
      config: {},
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    };

    const filePath = path.join(workflowsDir, `${workflowId}.json`);
    await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');

    await this.log('info', `工作流文件创建: ${filePath}`);
  }

  /**
   * 应用项目模板
   * @private
   */
  private async applyTemplate(
    projectPath: string,
    template: string
  ): Promise<void> {
    this.log('info', `应用项目模板: ${template} -> ${projectPath}`);

    switch (template) {
      case 'workflow':
        // 默认工作流：创建空的工作流配置
        await this.createWorkflowTemplate(projectPath);
        break;

      case 'novel-to-video':
        // 小说转视频：创建插件所需的子文件夹结构
        await this.createNovelToVideoTemplate(projectPath);
        break;

      default:
        // 未知模板：尝试从插件获取模板
        await this.applyPluginTemplate(projectPath, template);
    }
  }

  /**
   * 创建默认工作流模板
   * @private
   */
  private async createWorkflowTemplate(projectPath: string): Promise<void> {
    // 创建基础工作流目录
    const dirs = ['workflows', 'assets', 'output'];

    for (const dir of dirs) {
      await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }

    this.log('info', `创建工作流模板完成: ${projectPath}`);
  }

  /**
   * 创建小说转视频模板
   * @private
   */
  private async createNovelToVideoTemplate(projectPath: string): Promise<void> {
    // 创建小说转视频插件所需的目录结构
    const dirs = [
      'chapters', // 章节文本
      'scenes', // 场景分析
      'characters', // 角色设定
      'storyboards', // 分镜脚本
      'voiceovers', // 配音文件
      'video_clips', // 视频片段
      'output', // 最终输出
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }

    // 使用TimeService获取时间
    const timestamp = await timeService.getCurrentTime();

    // 创建初始配置文件
    const config = {
      template: 'novel-to-video',
      pluginId: 'novel-to-video',
      folders: dirs,
      createdAt: timestamp.toISOString(),
    };

    await fs.writeFile(
      path.join(projectPath, 'template.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    this.log('info', `创建小说转视频模板完成: ${projectPath}`);
  }

  /**
   * 应用插件模板
   * @private
   */
  private async applyPluginTemplate(
    projectPath: string,
    pluginId: string
  ): Promise<void> {
    // 未来扩展：调用插件 API 获取模板
    // 目前创建一个基础的插件目录结构
    const baseDir = path.join(projectPath, 'plugin_data');
    await fs.mkdir(baseDir, { recursive: true });

    this.log('warn', `使用默认插件模板: ${pluginId}`);
  }

  /**
   * 记录日志
   * @private
   */
  private log(level: LogEntry['level'], message: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.log(
      `[ProjectManager] ${level.toUpperCase()}: ${message}`,
      data || ''
    );
  }
}

// 导出单例实例
export const projectManager = new ProjectManager();

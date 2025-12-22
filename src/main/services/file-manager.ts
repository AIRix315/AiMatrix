import * as fs from 'fs/promises';
import * as path from 'path';
import { watch, FSWatcher } from 'fs';
import { ProjectConfig, AssetConfig } from '../models/project';

export interface FileChangeCallback {
  (eventType: string, filename: string): void;
}

export class FileManager {
  private watchers: Map<string, FSWatcher> = new Map();
  private projectsRoot: string = './projects';

  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.projectsRoot, { recursive: true });
      console.log('文件管理器初始化完成');
    } catch (error) {
      console.error('文件管理器初始化失败:', error);
      throw error;
    }
  }

  public async createProject(name: string): Promise<string> {
    const projectPath = path.join(this.projectsRoot, name);
    
    try {
      // 创建项目目录结构
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, 'materials', 'texts'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'materials', 'images'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'materials', 'videos'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'workflows', 'comfyui'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'workflows', 'n8n'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'config'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'cache'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'exports'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'logs'), { recursive: true });

      // 创建默认项目配置
      const projectConfig: ProjectConfig = {
        name,
        path: projectPath,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          defaultWorkflow: '',
          outputFormat: 'mp4',
          quality: 1080
        },
        workflows: [],
        assets: []
      };

      await this.saveProjectConfig(projectPath, projectConfig);
      
      console.log(`项目 ${name} 创建成功`);
      return projectPath;
    } catch (error) {
      console.error(`创建项目 ${name} 失败:`, error);
      throw error;
    }
  }

  public async loadProject(projectPath: string): Promise<ProjectConfig> {
    try {
      const configPath = path.join(projectPath, 'config', 'project.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config: ProjectConfig = JSON.parse(configData);
      
      // 更新路径信息
      config.path = projectPath;
      
      return config;
    } catch (error) {
      console.error(`加载项目 ${projectPath} 失败:`, error);
      throw error;
    }
  }

  public async saveProject(config: ProjectConfig): Promise<void> {
    try {
      config.updatedAt = new Date();
      await this.saveProjectConfig(config.path, config);
      console.log(`项目 ${config.name} 保存成功`);
    } catch (error) {
      console.error(`保存项目 ${config.name} 失败:`, error);
      throw error;
    }
  }

  public async deleteProject(projectPath: string): Promise<void> {
    try {
      await fs.rmdir(projectPath, { recursive: true });
      console.log(`项目 ${projectPath} 删除成功`);
    } catch (error) {
      console.error(`删除项目 ${projectPath} 失败:`, error);
      throw error;
    }
  }

  public async listProjects(): Promise<ProjectConfig[]> {
    try {
      const projects = await fs.readdir(this.projectsRoot, { withFileTypes: true });
      const projectConfigs: ProjectConfig[] = [];

      for (const project of projects) {
        if (project.isDirectory()) {
          const projectPath = path.join(this.projectsRoot, project.name);
          try {
            const config = await this.loadProject(projectPath);
            projectConfigs.push(config);
          } catch (error) {
            console.warn(`跳过无效项目 ${project.name}:`, error);
          }
        }
      }

      return projectConfigs;
    } catch (error) {
      console.error('列出项目失败:', error);
      throw error;
    }
  }

  public watchProject(projectPath: string, callback: FileChangeCallback): void {
    if (this.watchers.has(projectPath)) {
      return;
    }

    const watcher = watch(projectPath, { recursive: true }, (eventType, filename) => {
      callback(eventType, filename || '');
    });

    this.watchers.set(projectPath, watcher);
  }

  public unwatchProject(projectPath: string): void {
    const watcher = this.watchers.get(projectPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectPath);
    }
  }

  public async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`读取文件 ${filePath} 失败:`, error);
      throw error;
    }
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`写入文件 ${filePath} 失败:`, error);
      throw error;
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`删除文件 ${filePath} 失败:`, error);
      throw error;
    }
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public async listFiles(directoryPath: string): Promise<string[]> {
    try {
      return await fs.readdir(directoryPath);
    } catch (error) {
      console.error(`列出目录 ${directoryPath} 失败:`, error);
      throw error;
    }
  }

  private async saveProjectConfig(projectPath: string, config: ProjectConfig): Promise<void> {
    const configPath = path.join(projectPath, 'config', 'project.json');
    const configData = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, configData, 'utf-8');
  }

  public async cleanup(): Promise<void> {
    // 关闭所有文件监听器
    for (const [projectPath, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    console.log('文件管理器清理完成');
  }
}
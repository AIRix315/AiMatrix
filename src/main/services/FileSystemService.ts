/**
 * 文件系统服务
 *
 * 提供统一的文件系统操作、路径管理和文件信息获取功能
 *
 * 功能：
 * - 路径管理：统一管理数据目录、资产目录等
 * - 文件操作：复制、移动、删除文件和目录
 * - JSON操作：读写JSON文件
 * - 文件信息：获取文件元数据（大小、MIME类型、时间等）
 *
 * 参考：docs/06-core-services-design-v1.0.1.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import * as mime from 'mime-types';
import { Logger } from './Logger';

/**
 * 资产类型枚举
 */
export type AssetType = 'image' | 'video' | 'audio' | 'text' | 'other';

/**
 * 文件系统服务类
 */
export class FileSystemService {
  private dataDir: string;
  private logger: Logger;
  private isInitialized = false;

  constructor() {
    // 默认数据目录为用户数据目录
    this.dataDir = app.getPath('userData');
    this.logger = new Logger();
  }

  /**
   * 初始化文件系统服务
   * @param customDataDirectory 可选的自定义数据目录路径
   */
  async initialize(customDataDirectory?: string): Promise<void> {
    try {
      // 使用自定义数据目录（如果提供）
      if (customDataDirectory) {
        this.dataDir = this.normalizePath(customDataDirectory);
      }

      await this.logger.info('初始化文件系统服务', 'FileSystemService', { dataDir: this.dataDir });

      // 确保核心目录结构存在
      await this.ensureDir(this.dataDir);
      await this.ensureDir(this.getGlobalAssetDir());
      await this.ensureDir(path.join(this.dataDir, 'projects'));
      await this.ensureDir(path.join(this.dataDir, 'logs'));
      await this.ensureDir(path.join(this.dataDir, 'temp'));

      this.isInitialized = true;
      this.logger.info('文件系统服务初始化完成');
    } catch (error) {
      await this.logger.error('文件系统服务初始化失败', 'FileSystemService', { error });
      throw error;
    }
  }

  /**
   * 获取数据目录路径
   */
  getDataDir(): string {
    return this.dataDir;
  }

  /**
   * 获取全局资产目录路径
   * @param type 可选的资产类型（images/videos/audio等）
   */
  getGlobalAssetDir(type?: AssetType): string {
    const baseDir = path.join(this.dataDir, 'assets');
    if (type) {
      // 返回特定类型的目录（复数形式）
      const typeDirMap: Record<AssetType, string> = {
        image: 'images',
        video: 'videos',
        audio: 'audio',
        text: 'text',
        other: 'other'
      };
      return path.join(baseDir, typeDirMap[type]);
    }
    return baseDir;
  }

  /**
   * 获取项目资产目录路径
   * @param projectId 项目ID
   * @param category 可选的资产分类（scenes/characters/images等）
   */
  getProjectAssetDir(projectId: string, category?: string): string {
    const baseDir = path.join(this.dataDir, 'projects', projectId, 'assets');
    if (category) {
      return path.join(baseDir, category);
    }
    return baseDir;
  }

  /**
   * 获取资产元数据文件路径（Sidecar）
   * @param filePath 资产文件路径
   */
  getAssetMetadataPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  /**
   * 获取资产索引文件路径
   * @param projectId 可选的项目ID（不提供则返回全局索引路径）
   */
  getAssetIndexPath(projectId?: string): string {
    if (projectId) {
      return path.join(this.getProjectAssetDir(projectId), 'index.json');
    }
    return path.join(this.getGlobalAssetDir(), 'index.json');
  }

  /**
   * 路径标准化处理
   * @param inputPath 输入路径
   */
  normalizePath(inputPath: string): string {
    // 解析相对路径为绝对路径
    const absolutePath = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(inputPath);

    // 统一路径分隔符为平台标准
    return path.normalize(absolutePath);
  }

  /**
   * 复制文件
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const normalizedSource = this.normalizePath(sourcePath);
      const normalizedTarget = this.normalizePath(targetPath);

      // 确保目标目录存在
      await this.ensureDir(path.dirname(normalizedTarget));

      // 复制文件
      await fs.copyFile(normalizedSource, normalizedTarget);

      await this.logger.debug('文件复制成功', 'FileSystemService', {
        from: normalizedSource,
        to: normalizedTarget
      });
    } catch (error) {
      await this.logger.error('文件复制失败', 'FileSystemService', { sourcePath, targetPath, error });
      throw error;
    }
  }

  /**
   * 移动文件
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const normalizedSource = this.normalizePath(sourcePath);
      const normalizedTarget = this.normalizePath(targetPath);

      // 确保目标目录存在
      await this.ensureDir(path.dirname(normalizedTarget));

      // 移动文件（重命名）
      await fs.rename(normalizedSource, normalizedTarget);

      await this.logger.debug('文件移动成功', 'FileSystemService', {
        from: normalizedSource,
        to: normalizedTarget
      });
    } catch (error) {
      await this.logger.error('文件移动失败', 'FileSystemService', { sourcePath, targetPath, error });
      throw error;
    }
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      await fs.unlink(normalizedPath);
      await this.logger.debug('文件删除成功', 'FileSystemService', { path: normalizedPath });
    } catch (error) {
      await this.logger.error('文件删除失败', 'FileSystemService', { filePath, error });
      throw error;
    }
  }

  /**
   * 删除目录
   * @param dirPath 目录路径
   */
  async deleteDir(dirPath: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(dirPath);
      await fs.rm(normalizedPath, { recursive: true, force: true });
      await this.logger.debug('目录删除成功', 'FileSystemService', { path: normalizedPath });
    } catch (error) {
      await this.logger.error('目录删除失败', 'FileSystemService', { dirPath, error });
      throw error;
    }
  }

  /**
   * 检查路径是否存在
   * @param targetPath 路径
   */
  async exists(targetPath: string): Promise<boolean> {
    try {
      const normalizedPath = this.normalizePath(targetPath);
      await fs.access(normalizedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确保目录存在（不存在则创建）
   * @param dirPath 目录路径
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(dirPath);
      await fs.mkdir(normalizedPath, { recursive: true });
    } catch (error) {
      await this.logger.error('创建目录失败', 'FileSystemService', { dirPath, error });
      throw error;
    }
  }

  /**
   * 保存JSON数据到文件
   * @param filePath 文件路径
   * @param data 要保存的数据
   */
  async saveJSON<T>(filePath: string, data: T): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(filePath);

      // 确保目录存在
      await this.ensureDir(path.dirname(normalizedPath));

      // 写入JSON文件（格式化输出）
      await fs.writeFile(
        normalizedPath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      await this.logger.debug('JSON文件保存成功', 'FileSystemService', { path: normalizedPath });
    } catch (error) {
      await this.logger.error('JSON文件保存失败', 'FileSystemService', { filePath, error });
      throw error;
    }
  }

  /**
   * 从文件读取JSON数据
   * @param filePath 文件路径
   * @returns JSON数据，如果文件不存在或解析失败则返回null
   */
  async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const normalizedPath = this.normalizePath(filePath);

      // 检查文件是否存在
      if (!(await this.exists(normalizedPath))) {
        return null;
      }

      // 读取并解析JSON文件
      const content = await fs.readFile(normalizedPath, 'utf-8');
      const data = JSON.parse(content) as T;

      await this.logger.debug('JSON文件读取成功', 'FileSystemService', { path: normalizedPath });
      return data;
    } catch (error) {
      await this.logger.error('JSON文件读取失败', 'FileSystemService', { filePath, error });
      return null;
    }
  }

  /**
   * 获取文件信息
   * @param filePath 文件路径
   */
  async getFileInfo(filePath: string): Promise<{
    size: number;
    mimeType: string;
    extension: string;
    createdAt: string;
    modifiedAt: string;
  }> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const stats = await fs.stat(normalizedPath);
      const ext = path.extname(normalizedPath).toLowerCase();

      // 获取MIME类型
      const mimeType = mime.lookup(normalizedPath) || 'application/octet-stream';

      return {
        size: stats.size,
        mimeType,
        extension: ext,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };
    } catch (error) {
      await this.logger.error('获取文件信息失败', 'FileSystemService', { filePath, error });
      throw error;
    }
  }

  /**
   * 读取目录内容
   * @param dirPath 目录路径
   */
  async readDir(dirPath: string): Promise<string[]> {
    try {
      const normalizedPath = this.normalizePath(dirPath);
      const files = await fs.readdir(normalizedPath);
      return files;
    } catch (error) {
      await this.logger.error('读取目录失败', 'FileSystemService', { dirPath, error });
      throw error;
    }
  }

  /**
   * 读取目录内容（包含详细信息）
   * @param dirPath 目录路径
   */
  async readDirWithFileTypes(dirPath: string): Promise<{
    name: string;
    isDirectory: boolean;
    isFile: boolean;
  }[]> {
    try {
      const normalizedPath = this.normalizePath(dirPath);
      const entries = await fs.readdir(normalizedPath, { withFileTypes: true });

      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }));
    } catch (error) {
      await this.logger.error('读取目录详细信息失败', 'FileSystemService', { dirPath, error });
      throw error;
    }
  }
}

// 导出单例实例
export const fileSystemService = new FileSystemService();

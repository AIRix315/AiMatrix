import * as fs from 'fs/promises';
import * as path from 'path';

export class FileUtils {
  public static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`创建目录 ${dirPath} 失败:`, error);
      throw error;
    }
  }

  public static async copyFile(source: string, destination: string): Promise<void> {
    try {
      await FileUtils.ensureDirectory(path.dirname(destination));
      await fs.copyFile(source, destination);
    } catch (error) {
      console.error(`复制文件 ${source} 到 ${destination} 失败:`, error);
      throw error;
    }
  }

  public static async moveFile(source: string, destination: string): Promise<void> {
    try {
      await FileUtils.ensureDirectory(path.dirname(destination));
      await fs.rename(source, destination);
    } catch (error) {
      console.error(`移动文件 ${source} 到 ${destination} 失败:`, error);
      throw error;
    }
  }

  public static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`删除文件 ${filePath} 失败:`, error);
      throw error;
    }
  }

  public static async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rmdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`删除目录 ${dirPath} 失败:`, error);
      throw error;
    }
  }

  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error(`获取文件大小 ${filePath} 失败:`, error);
      throw error;
    }
  }

  public static async getFileStats(filePath: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
    isFile: boolean;
    isDirectory: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      console.error(`获取文件统计信息 ${filePath} 失败:`, error);
      throw error;
    }
  }

  public static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  public static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  public static getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  public static getFileNameWithoutExtension(filePath: string): string {
    const fileName = path.basename(filePath);
    const extension = path.extname(fileName);
    return fileName.slice(0, -extension.length);
  }

  public static getFileDirectory(filePath: string): string {
    return path.dirname(filePath);
  }

  public static joinPaths(...paths: string[]): string {
    return path.join(...paths);
  }

  public static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  public static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  public static resolvePath(...paths: string[]): string {
    return path.resolve(...paths);
  }
}
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileUtils {
  public static async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  public static async copyFile(source: string, destination: string): Promise<void> {
    await FileUtils.ensureDirectory(path.dirname(destination));
    await fs.copyFile(source, destination);
  }

  public static async moveFile(source: string, destination: string): Promise<void> {
    await FileUtils.ensureDirectory(path.dirname(destination));
    await fs.rename(source, destination);
  }

  public static async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  public static async deleteDirectory(dirPath: string): Promise<void> {
    await fs.rmdir(dirPath, { recursive: true });
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
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  public static async getFileStats(filePath: string): Promise<{
    size: number;
    created: string; // ISO 8601
    modified: string; // ISO 8601
    isFile: boolean;
    isDirectory: boolean;
  }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
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
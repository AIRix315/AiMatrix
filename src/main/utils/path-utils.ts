import * as path from 'path';
import * as os from 'os';

export class PathUtils {
  public static getAppDataDir(): string {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'MatrixAIWorkflow');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'MatrixAIWorkflow');
      case 'linux':
        return path.join(homeDir, '.config', 'matrix-ai-workflow');
      default:
        return path.join(homeDir, '.matrix-ai-workflow');
    }
  }

  public static getTempDir(): string {
    return path.join(os.tmpdir(), 'matrix-ai-workflow');
  }

  public static getLogsDir(): string {
    return path.join(PathUtils.getAppDataDir(), 'logs');
  }

  public static getConfigDir(): string {
    return path.join(PathUtils.getAppDataDir(), 'config');
  }

  public static getCacheDir(): string {
    return path.join(PathUtils.getAppDataDir(), 'cache');
  }

  public static getProjectsDir(): string {
    return path.join(PathUtils.getAppDataDir(), 'projects');
  }

  public static getResourcesDir(): string {
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'resources');
    } else {
      return path.join(process.resourcesPath, 'resources');
    }
  }

  public static relativeToAppData(relativePath: string): string {
    return path.join(PathUtils.getAppDataDir(), relativePath);
  }

  public static relativeToResources(relativePath: string): string {
    return path.join(PathUtils.getResourcesDir(), relativePath);
  }

  public static ensureAppDataDirs(): void {
    const dirs = [
      PathUtils.getAppDataDir(),
      PathUtils.getTempDir(),
      PathUtils.getLogsDir(),
      PathUtils.getConfigDir(),
      PathUtils.getCacheDir(),
      PathUtils.getProjectsDir()
    ];

    dirs.forEach(dir => {
      // 这里应该确保目录存在，但由于在主进程中，需要使用文件系统API
      console.log(`确保目录存在: ${dir}`);
    });
  }

  public static sanitizeFileName(fileName: string): string {
    // 移除或替换非法字符
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static getFileIconPath(extension: string): string {
    const iconMap: Record<string, string> = {
      '.txt': 'text.png',
      '.md': 'markdown.png',
      '.json': 'json.png',
      '.jpg': 'image.png',
      '.jpeg': 'image.png',
      '.png': 'image.png',
      '.gif': 'image.png',
      '.bmp': 'image.png',
      '.svg': 'image.png',
      '.mp4': 'video.png',
      '.avi': 'video.png',
      '.mov': 'video.png',
      '.wmv': 'video.png',
      '.flv': 'video.png',
      '.webm': 'video.png',
      '.mp3': 'audio.png',
      '.wav': 'audio.png',
      '.flac': 'audio.png',
      '.aac': 'audio.png',
      '.ogg': 'audio.png',
      '.pdf': 'pdf.png',
      '.doc': 'word.png',
      '.docx': 'word.png',
      '.xls': 'excel.png',
      '.xlsx': 'excel.png',
      '.ppt': 'powerpoint.png',
      '.pptx': 'powerpoint.png'
    };

    const iconFile = iconMap[extension.toLowerCase()] || 'file.png';
    return PathUtils.relativeToResources(path.join('icons', iconFile));
  }

  public static isImageFile(extension: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
    return imageExtensions.includes(extension.toLowerCase());
  }

  public static isVideoFile(extension: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
    return videoExtensions.includes(extension.toLowerCase());
  }

  public static isAudioFile(extension: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
    return audioExtensions.includes(extension.toLowerCase());
  }

  public static isTextFile(extension: string): boolean {
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log'];
    return textExtensions.includes(extension.toLowerCase());
  }
}
import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  public createMainWindow(): BrowserWindow {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: Math.min(1200, width - 100),
      height: Math.min(800, height - 100),
      minWidth: 800,
      minHeight: 600,
      frame: false, // 使用自定义标题栏
      webPreferences: {
        nodeIntegration: false, // 关闭 Node 集成（更安全），通过 preload 脚本暴露 API
        contextIsolation: true, // 开启上下文隔离（Electron 官方推荐的安全做法）
        preload: path.join(__dirname, '../preload/index.js'),
        devTools: true // 启用开发者工具
      },
      icon: path.join(__dirname, '../../resources/icons/icon.ico'), // 窗口图标
      show: false
    });

    // 加载应用
    // 开发和生产模式都使用 loadFile，避免 webpack-dev-server 的兼容性问题
    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 开发者工具默认不自动打开，可通过 F12 快捷键手动打开

    // 窗口准备显示时才显示，避免视觉闪烁
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    // 窗口关闭时清理引用
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  public minimizeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.minimize();
    }
  }

  public maximizeMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    }
  }

  public isMainWindowMaximized(): boolean {
    return this.mainWindow ? this.mainWindow.isMaximized() : false;
  }
}
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
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        devTools: true // 启用开发者工具
      },
      // icon: path.join(__dirname, '../../resources/icons/icon.png'), // 图标文件暂不存在，注释掉
      show: false
    });

    // 加载应用
    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 开发模式下打开开发者工具
    if (process.env.ELECTRON_IS_DEV === 'true') {
      this.mainWindow.webContents.openDevTools();
    }

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
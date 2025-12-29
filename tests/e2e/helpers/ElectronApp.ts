/**
 * ElectronApp 辅助类
 * 封装 Electron 应用的启动、控制和关闭逻辑
 */
import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

export class ElectronApp {
  private app: ElectronApplication | null = null;
  private mainWindow: Page | null = null;
  private readonly executablePath: string;
  private readonly mainScriptPath: string;

  constructor() {
    // Electron 可执行文件路径
    this.executablePath = require('electron') as unknown as string;

    // 主进程入口文件路径
    this.mainScriptPath = path.join(__dirname, '../../../build/main/index.js');
  }

  /**
   * 启动 Electron 应用
   * @param options 启动选项
   */
  async launch(options: {
    timeout?: number;
    env?: Record<string, string>;
    args?: string[];
  } = {}) {
    const { timeout = 30000, env = {}, args = [] } = options;

    console.log('🚀 启动 Electron 应用...');
    console.log('  可执行文件:', this.executablePath);
    console.log('  主脚本:', this.mainScriptPath);

    try {
      // 启动 Electron 应用
      this.app = await electron.launch({
        executablePath: this.executablePath,
        args: [this.mainScriptPath, ...args],
        env: {
          ...process.env,
          ELECTRON_IS_DEV: 'false', // E2E 测试使用生产模式
          NODE_ENV: 'test',
          ...env,
        },
        timeout,
      });

      // 等待第一个窗口
      this.mainWindow = await this.app.firstWindow({ timeout });

      console.log('✅ Electron 应用启动成功');

      // 等待应用完全加载
      await this.waitForReady();

      return this.app;
    } catch (error) {
      console.error('❌ Electron 应用启动失败:', error);
      throw error;
    }
  }

  /**
   * 等待应用完全加载
   */
  private async waitForReady(timeout: number = 10000) {
    if (!this.mainWindow) {
      throw new Error('主窗口未初始化');
    }

    try {
      // 等待 body 元素出现（表示 React 已挂载）
      await this.mainWindow.waitForSelector('body', { timeout });

      // 等待全局导航出现（表示应用已完全加载）
      await this.mainWindow.waitForSelector('[data-testid="global-nav"]', {
        timeout,
        state: 'visible',
      }).catch(() => {
        // 如果没有 testid，则等待导航元素
        return this.mainWindow!.waitForSelector('nav', { timeout, state: 'visible' });
      });

      console.log('✅ 应用已完全加载');
    } catch (error) {
      console.error('⚠️ 等待应用加载超时，继续执行测试');
    }
  }

  /**
   * 获取主窗口
   */
  getMainWindow(): Page {
    if (!this.mainWindow) {
      throw new Error('主窗口未初始化，请先调用 launch()');
    }
    return this.mainWindow;
  }

  /**
   * 获取应用实例
   */
  getApp(): ElectronApplication {
    if (!this.app) {
      throw new Error('应用未启动，请先调用 launch()');
    }
    return this.app;
  }

  /**
   * 执行主进程代码
   * @param fn 要执行的函数
   */
  async evaluateInMain<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.app) {
      throw new Error('应用未启动');
    }
    return this.app.evaluate(fn);
  }

  /**
   * 获取应用路径信息
   */
  async getAppPaths() {
    return this.evaluateInMain(() => {
      const { app } = require('electron');
      return {
        appData: app.getPath('appData'),
        userData: app.getPath('userData'),
        temp: app.getPath('temp'),
        exe: app.getPath('exe'),
      };
    });
  }

  /**
   * 获取应用版本
   */
  async getAppVersion(): Promise<string> {
    return this.evaluateInMain(() => {
      const { app } = require('electron');
      return app.getVersion();
    });
  }

  /**
   * 截图（用于调试）
   * @param filename 文件名
   */
  async screenshot(filename: string) {
    if (!this.mainWindow) {
      throw new Error('主窗口未初始化');
    }

    const screenshotPath = path.join(__dirname, '../../../test-results/screenshots', filename);
    await this.mainWindow.screenshot({ path: screenshotPath });
    console.log(`📸 截图已保存: ${screenshotPath}`);
  }

  /**
   * 等待导航到指定路由
   * @param route 路由路径（如 '/dashboard', '/assets'）
   */
  async waitForRoute(route: string, timeout: number = 5000) {
    if (!this.mainWindow) {
      throw new Error('主窗口未初始化');
    }

    await this.mainWindow.waitForFunction(
      (expectedRoute) => {
        return window.location.hash === `#${expectedRoute}` ||
               window.location.pathname === expectedRoute;
      },
      route,
      { timeout }
    );
  }

  /**
   * 点击导航菜单项
   * @param label 菜单项文本（如 'Dashboard', 'Assets'）
   */
  async clickNavItem(label: string) {
    if (!this.mainWindow) {
      throw new Error('主窗口未初始化');
    }

    // 尝试多种选择器策略
    const selectors = [
      `nav a:has-text("${label}")`,
      `[data-testid="nav-${label.toLowerCase()}"]`,
      `nav >> text=${label}`,
    ];

    for (const selector of selectors) {
      try {
        await this.mainWindow.click(selector, { timeout: 3000 });
        console.log(`✅ 点击导航项: ${label}`);
        return;
      } catch (error) {
        // 尝试下一个选择器
        continue;
      }
    }

    throw new Error(`无法找到导航项: ${label}`);
  }

  /**
   * 等待加载完成（没有加载指示器）
   */
  async waitForLoadComplete(timeout: number = 10000) {
    if (!this.mainWindow) {
      throw new Error('主窗口未初始化');
    }

    try {
      // 等待所有可能的加载指示器消失
      await this.mainWindow.waitForSelector('[data-testid="loading"]', {
        state: 'hidden',
        timeout,
      }).catch(() => {
        // 如果没有 loading 元素，忽略错误
      });

      // 等待网络空闲
      await this.mainWindow.waitForLoadState('networkidle', { timeout });

      console.log('✅ 页面加载完成');
    } catch (error) {
      console.warn('⚠️ 等待加载完成超时，继续执行');
    }
  }

  /**
   * 关闭应用
   */
  async close() {
    console.log('🛑 关闭 Electron 应用...');

    try {
      if (this.app) {
        await this.app.close();
        console.log('✅ Electron 应用已关闭');
      }
    } catch (error) {
      console.error('❌ 关闭应用时出错:', error);
      throw error;
    } finally {
      this.app = null;
      this.mainWindow = null;
    }
  }

  /**
   * 重启应用
   */
  async restart(options?: Parameters<typeof this.launch>[0]) {
    await this.close();
    await this.launch(options);
  }
}

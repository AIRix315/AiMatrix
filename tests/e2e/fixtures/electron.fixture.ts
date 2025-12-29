/**
 * Electron 测试固件
 * 提供统一的 Electron 应用测试环境
 */
import { test as base, Page } from '@playwright/test';
import { ElectronApp } from '../helpers/ElectronApp';

type ElectronFixtures = {
  electronApp: ElectronApp;
  mainWindow: Page;
};

/**
 * Electron 测试固件
 * 自动启动和关闭 Electron 应用
 */
export const test = base.extend<ElectronFixtures>({
  // ElectronApp 实例（每个测试独立）
  electronApp: async ({}, use) => {
    const app = new ElectronApp();
    await app.launch();
    await use(app);
    await app.close();
  },

  // 主窗口（从 electronApp 派生）
  mainWindow: async ({ electronApp }, use) => {
    const window = electronApp.getMainWindow();
    await use(window);
  },
});

export { expect } from '@playwright/test';

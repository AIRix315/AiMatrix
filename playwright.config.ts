import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E 测试配置 - Electron 应用
 * 参考文档: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',

  // 测试超时时间（Electron 应用启动较慢）
  timeout: 60000,

  // 失败后重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行执行的工作进程数（Electron 应用建议单进程）
  workers: 1,

  // 完整的测试输出
  fullyParallel: false,

  // CI 环境下如果测试失败则退出
  forbidOnly: !!process.env.CI,

  // 报告器配置
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  // 使用配置
  use: {
    // 基础 URL（Electron 应用不需要）
    // baseURL: 'http://localhost:3000',

    // 追踪配置（仅失败时保留）
    trace: 'retain-on-failure',

    // 截图配置
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'retain-on-failure',

    // 操作超时
    actionTimeout: 15000,

    // 导航超时
    navigationTimeout: 30000,
  },

  // 项目配置（跨平台测试）
  projects: [
    {
      name: 'electron-windows',
      use: {
        ...devices['Desktop Chrome'],
        // Windows 特定配置
      },
      testMatch: /.*\.e2e\.ts/,
    },
    {
      name: 'electron-mac',
      use: {
        ...devices['Desktop Chrome'],
        // macOS 特定配置
      },
      testMatch: /.*\.e2e\.ts/,
    },
    {
      name: 'electron-linux',
      use: {
        ...devices['Desktop Chrome'],
        // Linux 特定配置
      },
      testMatch: /.*\.e2e\.ts/,
    },
  ],

  // 输出目录
  outputDir: 'test-results/e2e-artifacts',

  // 全局设置
  globalSetup: path.join(__dirname, 'tests/e2e/setup/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'tests/e2e/setup/global-teardown.ts'),
});

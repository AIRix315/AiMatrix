/**
 * Playwright E2E 全局设置
 * 在所有测试开始前运行
 */
import path from 'path';
import { existsSync } from 'fs';

export default async function globalSetup() {
  console.log('🚀 开始 E2E 测试环境设置...');

  // 检查构建产物是否存在
  const mainBuildPath = path.join(__dirname, '../../../build/main/index.js');
  const rendererBuildPath = path.join(__dirname, '../../../build/renderer');
  const preloadBuildPath = path.join(__dirname, '../../../build/preload/index.js');

  if (!existsSync(mainBuildPath)) {
    throw new Error(
      `主进程构建产物不存在: ${mainBuildPath}\n请先运行 npm run build:main`
    );
  }

  if (!existsSync(rendererBuildPath)) {
    throw new Error(
      `渲染进程构建产物不存在: ${rendererBuildPath}\n请先运行 npm run build:renderer`
    );
  }

  if (!existsSync(preloadBuildPath)) {
    throw new Error(
      `预加载脚本构建产物不存在: ${preloadBuildPath}\n请先运行 npm run build:preload`
    );
  }

  console.log('✅ 构建产物检查通过');
  console.log('✅ E2E 测试环境设置完成');
}

/**
 * PluginManagerV2 单元测试
 *
 * 测试内容：
 * - 插件加载和卸载
 * - 沙箱执行
 * - 权限检查
 * - 资源清理
 * - 生命周期管理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { PluginManagerV2 } from '../../../../src/main/services/plugin/PluginManagerV2';

describe('PluginManagerV2', () => {
  let pluginManager: PluginManagerV2;
  const testPluginsDir = path.join(__dirname, '../../../fixtures');

  beforeEach(async () => {
    // 创建测试用的插件管理器
    pluginManager = new PluginManagerV2(testPluginsDir, {
      enableSandbox: true, // 启用沙箱进行测试
      sandboxTimeout: 10000
    });

    await pluginManager.initialize();
  });

  afterEach(async () => {
    // 清理
    await pluginManager.cleanup();
  });

  it('should initialize successfully', async () => {
    expect(pluginManager).toBeDefined();
  });

  it('should load plugin with sandbox', async () => {
    const info = await pluginManager.loadPlugin('test-plugin', {
      enableSandbox: true
    });

    expect(info).toBeDefined();
    expect(info.id).toBe('test-plugin');
    expect(info.isSandboxed).toBe(true);
  });

  it('should execute plugin action', async () => {
    await pluginManager.loadPlugin('test-plugin');

    const result = await pluginManager.executePlugin('test-plugin', 'echo', {
      message: 'Hello, World!'
    });

    expect(result).toEqual({
      message: 'Echo: Hello, World!'
    });
  });

  it('should track plugin resources', async () => {
    await pluginManager.loadPlugin('test-plugin');

    // 执行注册定时器的动作
    await pluginManager.executePlugin('test-plugin', 'register-timer', {});

    const stats = await pluginManager.getPluginStats('test-plugin');
    expect(stats.resourceCount).toBeGreaterThan(0);
  });

  it('should enforce permissions', async () => {
    await pluginManager.loadPlugin('test-plugin');

    // 测试权限检查
    const result = await pluginManager.executePlugin('test-plugin', 'test-permissions', {});

    // 应该返回成功（因为权限错误被捕获）
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('error');
  });

  it('should unload plugin and cleanup resources', async () => {
    await pluginManager.loadPlugin('test-plugin');

    // 注册一些资源
    await pluginManager.executePlugin('test-plugin', 'register-timer', {});

    const statsBefore = await pluginManager.getPluginStats('test-plugin');
    expect(statsBefore.resourceCount).toBeGreaterThan(0);

    // 卸载插件
    await pluginManager.unloadPlugin('test-plugin');

    // 尝试获取统计（应该抛出错误）
    await expect(
      pluginManager.getPluginStats('test-plugin')
    ).rejects.toThrow('Plugin not loaded');
  });

  it('should list plugins', async () => {
    await pluginManager.loadPlugin('test-plugin');

    const plugins = await pluginManager.listPlugins();
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins[0].id).toBe('test-plugin');
  });

  it('should toggle plugin enabled state', async () => {
    await pluginManager.loadPlugin('test-plugin');

    // 禁用插件
    await pluginManager.togglePlugin('test-plugin', false);

    // 尝试执行（应该失败）
    await expect(
      pluginManager.executePlugin('test-plugin', 'echo', { message: 'test' })
    ).rejects.toThrow('Plugin is disabled');

    // 重新启用
    await pluginManager.togglePlugin('test-plugin', true);

    // 现在应该可以执行
    const result = await pluginManager.executePlugin('test-plugin', 'echo', { message: 'test' });
    expect(result).toBeDefined();
  });
});

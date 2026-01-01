/**
 * 测试插件 - 用于验证PluginManagerV2功能
 */

module.exports = {
  /**
   * 插件激活时调用
   */
  async activate() {
    console.log('Test plugin activated');

    // 使用context注册一个服务
    if (typeof context !== 'undefined') {
      context.registerService('test-service', async () => {
        console.log('Cleaning up test service');
      });

      // 使用context记录日志
      await context.log.info('Test plugin initialized');
    }
  },

  /**
   * 插件停用时调用
   */
  async deactivate() {
    console.log('Test plugin deactivated');

    if (typeof context !== 'undefined') {
      await context.log.info('Test plugin cleanup complete');
    }
  },

  /**
   * 执行插件动作
   */
  async execute(action, params) {
    if (typeof context !== 'undefined') {
      await context.log.info(`Executing action: ${action}`, params);
    }

    switch (action) {
      case 'echo':
        return { message: `Echo: ${params.message}` };

      case 'register-timer':
        // 测试定时器注册
        if (typeof context !== 'undefined') {
          const timer = setTimeout(() => {
            console.log('Timer executed');
          }, 1000);
          context.registerTimer(timer);
        }
        return { success: true };

      case 'test-permissions':
        // 测试权限检查
        try {
          // 这个应该失败（没有fs:write权限）
          await context.fs.writeFile('/test.txt', 'test');
          return { error: 'Should have thrown permission error' };
        } catch (error) {
          return { success: true, error: error.message };
        }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
};

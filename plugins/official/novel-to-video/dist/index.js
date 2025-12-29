/**
 * Novel-to-Video Plugin (Placeholder)
 *
 * 这是一个占位实现，完整的插件系统尚在开发中
 * 当前版本仅用于展示插件在界面中的显示效果
 */

module.exports = {
  metadata: {
    id: 'novel-to-video',
    name: '小说转视频',
    version: '1.0.0',
    description: '将小说文本转换为AI生成的视频内容',
    author: 'Matrix Team',
    type: 'official'
  },

  /**
   * 插件激活
   */
  async activate(context) {
    console.log('[novel-to-video] Plugin activated (placeholder mode)');

    // TODO: 实现完整的插件逻辑
    // - Schema 注册
    // - MCP 工具注册
    // - 服务初始化

    return {
      success: true,
      message: '插件已激活（占位模式）'
    };
  },

  /**
   * 插件停用
   */
  async deactivate() {
    console.log('[novel-to-video] Plugin deactivated');
    return {
      success: true,
      message: '插件已停用'
    };
  }
};

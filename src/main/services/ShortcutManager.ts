/**
 * 快捷方式管理器
 *
 * 功能：
 * - 管理菜单栏快捷方式的增删改查
 * - 支持拖拽排序
 * - 自动初始化默认快捷方式（首次启动）
 *
 * 参考：plans/code-references-phase9.md (REF-010)
 */

import { ShortcutItem, ShortcutType, IAppSettings } from '../../common/types';
import { TimeService } from './TimeService';
import { Logger } from './Logger';

export class ShortcutManager {
  private static instance: ShortcutManager;
  private timeService: TimeService;
  private logger: Logger;
  private configManager: any; // ConfigManager实例，暂用any避免循环依赖

  private constructor(timeService: TimeService, logger: Logger, configManager: any) {
    this.timeService = timeService;
    this.logger = logger;
    this.configManager = configManager;
  }

  /**
   * 获取单例实例
   */
  static getInstance(timeService: TimeService, logger: Logger, configManager: any): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager(timeService, logger, configManager);
    }
    return ShortcutManager.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('[ShortcutManager] 初始化快捷方式管理器');

      // 检查是否首次启动（shortcuts字段不存在或为空）
      const settings = await this.configManager.getSettings();
      if (!settings.shortcuts || settings.shortcuts.length === 0) {
        this.logger.info('[ShortcutManager] 首次启动，初始化默认快捷方式');
        await this.initializeDefaultShortcuts();
      } else {
        this.logger.info(`[ShortcutManager] 加载了 ${settings.shortcuts.length} 个快捷方式`);
      }

      this.logger.info('[ShortcutManager] 初始化完成');
    } catch (error) {
      this.logger.error('[ShortcutManager] 初始化失败', 'ShortcutManager', { error });
      // 初始化失败不应该阻塞应用启动，记录错误后继续
    }
  }

  /**
   * 添加快捷方式
   */
  async addShortcut(item: Omit<ShortcutItem, 'id' | 'order' | 'createdAt'>): Promise<ShortcutItem> {
    const settings: IAppSettings = await this.configManager.getSettings();
    const shortcuts = settings.shortcuts || [];

    // 生成唯一ID
    const id = `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 获取当前最大order值
    const maxOrder = shortcuts.length > 0
      ? Math.max(...shortcuts.map(s => s.order))
      : 0;

    // 获取时间服务的当前时间
    const currentTime = await this.timeService.getCurrentTime();

    // 创建新快捷方式
    const newShortcut: ShortcutItem = {
      id,
      type: item.type,
      targetId: item.targetId,
      name: item.name,
      icon: item.icon,
      order: maxOrder + 1,
      createdAt: currentTime.toISOString()
    };

    // 保存到配置
    shortcuts.push(newShortcut);
    await this.configManager.saveSettings({
      ...settings,
      shortcuts
    });

    this.logger.info(`[ShortcutManager] 添加快捷方式: ${item.name} (${item.type})`);
    return newShortcut;
  }

  /**
   * 删除快捷方式
   */
  async removeShortcut(id: string): Promise<void> {
    const settings: IAppSettings = await this.configManager.getSettings();
    const shortcuts = settings.shortcuts || [];

    const index = shortcuts.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`快捷方式不存在: ${id}`);
    }

    const removedName = shortcuts[index].name;
    shortcuts.splice(index, 1);

    await this.configManager.saveSettings({
      ...settings,
      shortcuts
    });

    this.logger.info(`[ShortcutManager] 删除快捷方式: ${removedName}`);
  }

  /**
   * 重新排序快捷方式
   * @param ids 新的ID顺序数组
   */
  async reorderShortcuts(ids: string[]): Promise<void> {
    const settings: IAppSettings = await this.configManager.getSettings();
    const shortcuts = settings.shortcuts || [];

    // 验证所有ID都存在
    const existingIds = new Set(shortcuts.map(s => s.id));
    for (const id of ids) {
      if (!existingIds.has(id)) {
        throw new Error(`快捷方式不存在: ${id}`);
      }
    }

    // 创建ID到快捷方式的映射
    const idMap = new Map(shortcuts.map(s => [s.id, s]));

    // 按新顺序重新分配order值
    const reorderedShortcuts = ids.map((id, index) => {
      const shortcut = idMap.get(id)!;
      return {
        ...shortcut,
        order: index + 1
      };
    });

    await this.configManager.saveSettings({
      ...settings,
      shortcuts: reorderedShortcuts
    });

    this.logger.info(`[ShortcutManager] 重新排序快捷方式，新顺序: ${ids.length}个`);
  }

  /**
   * 获取快捷方式列表
   * @returns 按order排序的快捷方式列表
   */
  async listShortcuts(): Promise<ShortcutItem[]> {
    const settings: IAppSettings = await this.configManager.getSettings();
    const shortcuts = settings.shortcuts || [];

    // 按order字段升序排序
    return shortcuts.sort((a, b) => a.order - b.order);
  }

  /**
   * 初始化默认快捷方式（首次启动）
   */
  async initializeDefaultShortcuts(): Promise<void> {
    try {
      // 默认添加"小说转视频"插件快捷方式
      await this.addShortcut({
        type: ShortcutType.PLUGIN,
        targetId: 'novel-to-video',
        name: '小说转视频',
        icon: '📖'
      });

      this.logger.info('[ShortcutManager] 默认快捷方式初始化完成');
    } catch (error) {
      this.logger.error('[ShortcutManager] 默认快捷方式初始化失败', 'ShortcutManager', { error });
      throw error;
    }
  }
}

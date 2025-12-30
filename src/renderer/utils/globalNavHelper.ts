/**
 * 全局菜单栏刷新辅助工具
 * 用于在任何组件中触发 GlobalNav 的刷新
 */

let globalNavRefreshFn: (() => Promise<void>) | null = null;

/**
 * 注册 GlobalNav 的刷新函数
 * @param fn 刷新函数
 */
export const setGlobalNavRefresh = (fn: () => Promise<void>) => {
  globalNavRefreshFn = fn;
};

/**
 * 触发 GlobalNav 刷新
 */
export const refreshGlobalNav = async () => {
  if (globalNavRefreshFn) {
    await globalNavRefreshFn();
  }
};

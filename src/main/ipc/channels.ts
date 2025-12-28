export const IPC_CHANNELS = {
  // 项目相关
  PROJECT_CREATE: 'project:create',
  PROJECT_LOAD: 'project:load',
  PROJECT_SAVE: 'project:save',
  PROJECT_DELETE: 'project:delete',
  PROJECT_LIST: 'project:list',

  // 工作流相关
  WORKFLOW_EXECUTE: 'workflow:execute',
  WORKFLOW_STATUS: 'workflow:status',
  WORKFLOW_CANCEL: 'workflow:cancel',
  WORKFLOW_LIST: 'workflow:list',
  WORKFLOW_SAVE: 'workflow:save',
  WORKFLOW_LOAD: 'workflow:load',

  // 资产相关
  ASSET_UPLOAD: 'asset:upload',
  ASSET_DELETE: 'asset:delete',
  ASSET_LIST: 'asset:list',
  ASSET_METADATA: 'asset:metadata',

  // MCP服务相关
  MCP_CONNECT: 'mcp:connect',
  MCP_DISCONNECT: 'mcp:disconnect',
  MCP_CALL: 'mcp:call',
  MCP_STATUS: 'mcp:status',
  MCP_LIST: 'mcp:list',

  // 本地服务相关
  LOCAL_START: 'local:start',
  LOCAL_STOP: 'local:stop',
  LOCAL_STATUS: 'local:status',
  LOCAL_RESTART: 'local:restart',

  // 文件系统相关
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_EXISTS: 'file:exists',
  FILE_LIST: 'file:list',
  FILE_WATCH: 'file:watch',
  FILE_UNWATCH: 'file:unwatch',

  // 窗口相关
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',

  // 应用相关
  APP_VERSION: 'app:version',
  APP_QUIT: 'app:quit',
  APP_RESTART: 'app:restart',

  // 快捷方式相关
  SHORTCUT_ADD: 'shortcut:add',
  SHORTCUT_REMOVE: 'shortcut:remove',
  SHORTCUT_REORDER: 'shortcut:reorder',
  SHORTCUT_LIST: 'shortcut:list',

  // 事件通知
  EVENT_WORKFLOW_PROGRESS: 'event:workflow:progress',
  EVENT_WORKFLOW_COMPLETED: 'event:workflow:completed',
  EVENT_WORKFLOW_ERROR: 'event:workflow:error',
  EVENT_FILE_CHANGED: 'event:file:changed',
  EVENT_SERVICE_STATUS: 'event:service:status'
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

type IPCHandler = (...args: unknown[]) => unknown;

export class IPCManager {
  private channels: Map<string, IPCHandler[]> = new Map();

  public register(channel: IPCChannel, handler: IPCHandler): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, []);
    }
    this.channels.get(channel)!.push(handler);
  }

  public unregister(channel: IPCChannel, handler: IPCHandler): void {
    const handlers = this.channels.get(channel);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public getHandlers(channel: IPCChannel): IPCHandler[] {
    return this.channels.get(channel) || [];
  }

  public clear(): void {
    this.channels.clear();
  }
}
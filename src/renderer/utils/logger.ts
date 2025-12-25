/**
 * 渲染进程日志工具
 *
 * 通过 IPC 调用主进程的 Logger 服务
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class RendererLogger {
  private async log(level: LogLevel, message: string, context?: string, data?: unknown): Promise<void> {
    try {
      // 通过 electronAPI 调用主进程的日志服务
      if (window.electronAPI?.log) {
        await window.electronAPI.log(level, message, context || 'Renderer', data);
      } else {
        // Fallback: 如果 electronAPI 不可用，使用 console
        const prefix = `[${context || 'Renderer'}]`;
        switch (level) {
          case 'debug':
            // eslint-disable-next-line no-console
            console.debug(prefix, message, data);
            break;
          case 'info':
            // eslint-disable-next-line no-console
            console.info(prefix, message, data);
            break;
          case 'warn':
            // eslint-disable-next-line no-console
            console.warn(prefix, message, data);
            break;
          case 'error':
            // eslint-disable-next-line no-console
            console.error(prefix, message, data);
            break;
        }
      }
    } catch (err) {
      // 日志失败时使用 console 作为最后的 fallback
      // eslint-disable-next-line no-console
      console.error('[RendererLogger] Failed to log:', err);
    }
  }

  async debug(message: string, context?: string, data?: unknown): Promise<void> {
    await this.log('debug', message, context, data);
  }

  async info(message: string, context?: string, data?: unknown): Promise<void> {
    await this.log('info', message, context, data);
  }

  async warn(message: string, context?: string, data?: unknown): Promise<void> {
    await this.log('warn', message, context, data);
  }

  async error(message: string, context?: string, data?: unknown): Promise<void> {
    await this.log('error', message, context, data);
  }
}

export const logger = new RendererLogger();

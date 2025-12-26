/**
 * ConfigManager 服务 - 应用配置管理
 *
 * 功能：
 * - 读写配置文件（config.json）
 * - API Key 加密存储（使用 Electron safeStorage）
 * - 配置变更事件通知
 * - 默认配置生成
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { app, safeStorage } from 'electron';
import { EventEmitter } from 'events';
import type { IAppSettings, IProviderConfig, IGeneralSettings, ILogSettings } from '../../common/types';
import { logger } from './Logger';

/**
 * 配置文件名称
 */
const CONFIG_FILE_NAME = 'config.json';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: IAppSettings = {
  general: {
    language: 'zh-CN',
    theme: 'dark',
    workspacePath: path.join(app.getPath('documents'), 'Matrix_Projects'),
    logging: {
      enabled: true,
      savePath: path.join(app.getPath('userData'), 'logs'),
      retentionDays: 7
    }
  },
  providers: [
    {
      id: 'ollama',
      name: 'Ollama',
      type: 'local',
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      models: []
    },
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'cloud',
      enabled: false,
      baseUrl: 'https://api.openai.com/v1',
      models: []
    },
    {
      id: 'siliconflow',
      name: 'SiliconFlow',
      type: 'relay',
      enabled: false,
      baseUrl: 'https://api.siliconflow.cn/v1',
      models: []
    }
  ],
  mcpServers: []
};

/**
 * ConfigManager 服务类
 */
export class ConfigManager extends EventEmitter {
  private configPath: string;
  private config: IAppSettings;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.configPath = path.join(app.getPath('userData'), CONFIG_FILE_NAME);
    this.config = DEFAULT_CONFIG;
  }

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 尝试读取现有配置
      await this.loadConfig();
    } catch (error) {
      // 配置文件不存在或无效，使用默认配置并保存
      await logger.info('Config file not found, creating default config', 'ConfigManager');
      this.config = DEFAULT_CONFIG;
      await this.saveConfig(this.config);
    }

    this.isInitialized = true;
    await logger.info('Initialized successfully', 'ConfigManager');
  }

  /**
   * 加载配置文件
   */
  private async loadConfig(): Promise<void> {
    const data = await fs.readFile(this.configPath, 'utf-8');
    const rawConfig = JSON.parse(data);

    // 解密 API Keys
    this.config = this.decryptConfig(rawConfig);
  }

  /**
   * 保存配置文件
   */
  async saveConfig(config: IAppSettings): Promise<void> {
    // 加密 API Keys
    const encryptedConfig = this.encryptConfig(config);

    // 写入文件
    await fs.writeFile(
      this.configPath,
      JSON.stringify(encryptedConfig, null, 2),
      'utf-8'
    );

    // 更新内存中的配置
    const oldConfig = this.config;
    this.config = config;

    // 发出配置变更事件
    this.emit('config-changed', this.config, oldConfig);

    await logger.debug('Config saved successfully', 'ConfigManager');
  }

  /**
   * 获取完整配置
   */
  getConfig(): IAppSettings {
    return JSON.parse(JSON.stringify(this.config)); // 深拷贝，防止外部修改
  }

  /**
   * 获取通用设置
   */
  getGeneralSettings(): IGeneralSettings {
    return JSON.parse(JSON.stringify(this.config.general));
  }

  /**
   * 获取日志设置
   */
  getLogSettings(): ILogSettings {
    return JSON.parse(JSON.stringify(this.config.general.logging));
  }

  /**
   * 获取服务商配置
   */
  getProviders(): IProviderConfig[] {
    return JSON.parse(JSON.stringify(this.config.providers));
  }

  /**
   * 获取指定服务商配置
   */
  getProvider(providerId: string): IProviderConfig | undefined {
    return this.config.providers.find(p => p.id === providerId);
  }

  /**
   * 部分更新配置
   */
  async updateConfig(updates: Partial<IAppSettings>): Promise<void> {
    const newConfig: IAppSettings = {
      ...this.config,
      ...updates,
      general: {
        ...this.config.general,
        ...(updates.general || {})
      },
      providers: updates.providers || this.config.providers,
      mcpServers: updates.mcpServers || this.config.mcpServers
    };

    await this.saveConfig(newConfig);
  }

  /**
   * 更新服务商配置
   */
  async updateProvider(providerId: string, updates: Partial<IProviderConfig>): Promise<void> {
    const providers = this.config.providers.map(p => {
      if (p.id === providerId) {
        return { ...p, ...updates };
      }
      return p;
    });

    await this.updateConfig({ providers });
  }

  /**
   * 监听配置变更
   */
  onConfigChange(callback: (newConfig: IAppSettings, oldConfig: IAppSettings) => void): void {
    this.on('config-changed', callback);
  }

  /**
   * 取消监听配置变更
   */
  offConfigChange(callback: (newConfig: IAppSettings, oldConfig: IAppSettings) => void): void {
    this.off('config-changed', callback);
  }

  /**
   * 加密配置（主要加密 API Keys）
   */
  private encryptConfig(config: IAppSettings): IAppSettings {
    const encrypted = JSON.parse(JSON.stringify(config));

    // 加密所有服务商的 API Key
    if (safeStorage.isEncryptionAvailable()) {
      encrypted.providers = encrypted.providers.map((provider: IProviderConfig) => {
        if (provider.apiKey) {
          const buffer = safeStorage.encryptString(provider.apiKey);
          return {
            ...provider,
            apiKey: buffer.toString('base64'),
            _encrypted: true
          };
        }
        return provider;
      });
    }

    return encrypted;
  }

  /**
   * 解密配置
   */
  private decryptConfig(rawConfig: IAppSettings): IAppSettings {
    const decrypted = JSON.parse(JSON.stringify(rawConfig));

    // 解密所有服务商的 API Key
    if (safeStorage.isEncryptionAvailable()) {
      decrypted.providers = decrypted.providers.map((provider: IProviderConfig & { _encrypted?: boolean }) => {
        if (provider.apiKey && provider._encrypted) {
          try {
            const buffer = Buffer.from(provider.apiKey, 'base64');
            const decryptedKey = safeStorage.decryptString(buffer);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _encrypted, ...rest } = provider;
            return {
              ...rest,
              apiKey: decryptedKey
            };
          } catch (error) {
            // 解密失败，使用空密钥
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _encrypted, ...rest } = provider;
            return {
              ...rest,
              apiKey: ''
            };
          }
        }
        return provider;
      });
    }

    return decrypted as IAppSettings;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    await logger.debug('Cleaned up', 'ConfigManager');
  }
}

// 导出单例实例
export const configManager = new ConfigManager();

/**
 * ConfigManager 服务 - 应用配置管理
 *
 * 功能：
 * - 读写配置文件（config.json）
 * - API Key 加密存储（使用 AES-256-GCM 算法）
 * - 配置变更事件通知
 * - 默认配置生成
 * - 自动迁移明文配置到加密存储
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间
 *
 * 参考: plans/code-references-phase9.md (REF-016)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app, safeStorage } from 'electron';
import { EventEmitter } from 'events';
import { machineIdSync } from 'node-machine-id';
import type { IAppSettings, IProviderConfig, IGeneralSettings, ILogSettings } from '../../common/types';
import { logger } from './Logger';

/**
 * API 密钥加密工具类（使用 AES-256-GCM 算法）
 *
 * 设计特点：
 * - 使用 AES-256-GCM 算法提供强加密
 * - 使用机器 ID 作为密钥种子（确保密钥在同一台机器上保持一致）
 * - 支持加密和解密操作
 * - 返回格式: iv:authTag:encrypted（便于存储和解析）
 */
export class APIKeyEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor() {
    try {
      // 使用机器ID作为密钥种子（确保密钥在同一台机器上保持一致）
      const machineId = machineIdSync();
      this.key = crypto.scryptSync(machineId, 'matrix-salt', 32);
    } catch (error) {
      // 如果无法获取机器ID，使用随机密钥（仅用于开发/测试环境）
      logger.warn('Failed to get machine ID, using random key', 'APIKeyEncryption', { error }).catch(() => {});
      this.key = crypto.randomBytes(32);
    }
  }

  /**
   * 加密 API 密钥
   * @param plaintext 明文密钥
   * @returns 加密后的字符串（格式: iv:authTag:encrypted）
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 使用类型断言来访问 GCM 模式特有的方法
      const authTag = (cipher as crypto.CipherGCM).getAuthTag();

      // 返回格式: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Failed to encrypt API key', 'APIKeyEncryption', { error }).catch(() => {});
      throw error;
    }
  }

  /**
   * 解密 API 密钥
   * @param ciphertext 加密的字符串
   * @returns 明文密钥
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return '';
    }

    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      // 使用类型断言来访问 GCM 模式特有的方法
      (decipher as crypto.DecipherGCM).setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt API key', 'APIKeyEncryption', { error }).catch(() => {});
      throw error;
    }
  }

  /**
   * 判断字符串是否已加密
   * @param str 待检查的字符串
   * @returns 是否已加密
   */
  isEncrypted(str: string): boolean {
    if (!str) {
      return false;
    }

    // 加密格式: iv:authTag:encrypted (3个部分，每部分都是hex)
    const parts = str.split(':');
    if (parts.length !== 3) {
      return false;
    }

    return parts.every((part) => /^[0-9a-f]+$/i.test(part));
  }
}

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
  private encryption: APIKeyEncryption; // 新增：API 密钥加密工具

  constructor() {
    super();
    this.configPath = path.join(app.getPath('userData'), CONFIG_FILE_NAME);
    this.config = DEFAULT_CONFIG;
    this.encryption = new APIKeyEncryption(); // 初始化加密工具
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

      // 自动迁移明文配置到加密存储
      await this.migrateToEncryptedKeys();
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
   * 加密配置（使用 AES-256-GCM 加密 API Keys）
   */
  private encryptConfig(config: IAppSettings): IAppSettings {
    const encrypted = JSON.parse(JSON.stringify(config));

    // 使用 AES-256-GCM 加密所有服务商的 API Key
    encrypted.providers = encrypted.providers.map((provider: IProviderConfig) => {
      if (provider.apiKey && !this.encryption.isEncrypted(provider.apiKey)) {
        try {
          return {
            ...provider,
            apiKey: this.encryption.encrypt(provider.apiKey),
            _encrypted: 'aes-256-gcm' // 标记加密算法
          };
        } catch (error) {
          logger.warn(`Failed to encrypt API key for provider ${provider.id}`, 'ConfigManager', { error }).catch(() => {});
          return provider;
        }
      }
      return provider;
    });

    return encrypted;
  }

  /**
   * 解密配置（兼容新旧加密方式）
   */
  private decryptConfig(rawConfig: IAppSettings): IAppSettings {
    const decrypted = JSON.parse(JSON.stringify(rawConfig));

    // 解密所有服务商的 API Key
    decrypted.providers = decrypted.providers.map((provider: IProviderConfig & { _encrypted?: boolean | string }) => {
      if (provider.apiKey && provider._encrypted) {
        try {
          if (provider._encrypted === 'aes-256-gcm') {
            // 新的 AES-256-GCM 加密
            const decryptedKey = this.encryption.decrypt(provider.apiKey);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _encrypted, ...rest } = provider;
            return {
              ...rest,
              apiKey: decryptedKey
            };
          } else if (provider._encrypted === true && safeStorage.isEncryptionAvailable()) {
            // 旧的 safeStorage 加密（向后兼容）
            const buffer = Buffer.from(provider.apiKey, 'base64');
            const decryptedKey = safeStorage.decryptString(buffer);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _encrypted, ...rest } = provider;
            return {
              ...rest,
              apiKey: decryptedKey
            };
          }
        } catch (error) {
          // 解密失败，可能是明文配置
          logger.warn(`Failed to decrypt API key for provider ${provider.id}, treating as plaintext`, 'ConfigManager', { error }).catch(() => {});
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _encrypted, ...rest } = provider;
          return rest;
        }
      }
      return provider;
    });

    return decrypted as IAppSettings;
  }

  /**
   * 自动迁移明文配置到加密存储
   *
   * 功能：
   * - 检测所有 Provider 的 API Key
   * - 如果是明文或旧的 safeStorage 加密，重新加密并保存
   * - 使用新的 AES-256-GCM 加密算法
   */
  async migrateToEncryptedKeys(): Promise<void> {
    let needsMigration = false;

    // 检查是否有需要迁移的 API Key
    for (const provider of this.config.providers) {
      if (provider.apiKey) {
        // 检查是否已经使用新的加密算法
        const isNewEncryption = this.encryption.isEncrypted(provider.apiKey);

        if (!isNewEncryption) {
          needsMigration = true;
          break;
        }
      }
    }

    if (needsMigration) {
      await logger.info('Detected plaintext or old encrypted API keys, migrating to AES-256-GCM encryption', 'ConfigManager');

      // 重新保存配置，会自动使用新的加密算法
      await this.saveConfig(this.config);

      await logger.info('API keys migrated to encrypted storage successfully', 'ConfigManager');
    }
  }

  /**
   * 获取完整设置（别名方法，为了兼容 ShortcutManager）
   */
  getSettings(): IAppSettings {
    return this.getConfig();
  }

  /**
   * 保存设置（别名方法，为了兼容 ShortcutManager）
   */
  async saveSettings(settings: IAppSettings): Promise<void> {
    return this.saveConfig(settings);
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

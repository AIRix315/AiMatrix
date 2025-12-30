/**
 * APIManager 单元测试
 *
 * 测试策略：使用真实文件系统
 * 原因：APIManager涉及配置文件持久化、API密钥加密等文件操作
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { APIManager } from '../../../src/main/services/APIManager';
import { APIProviderConfig, APICategory, AuthType } from '@/shared/types';

describe('APIManager 单元测试', () => {
  let apiManager: APIManager;
  let testConfigDir: string;

  beforeEach(async () => {
    testConfigDir = path.join(process.cwd(), 'test-data', `api-test-${Date.now()}`);
    await fs.mkdir(testConfigDir, { recursive: true });

    apiManager = new APIManager(testConfigDir);
    await apiManager.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('initialize', () => {
    it('应该成功初始化APIManager', async () => {
      const providers = await apiManager.listProviders();

      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('应该创建配置目录', async () => {
      const configExists = await fs.access(testConfigDir)
        .then(() => true)
        .catch(() => false);

      expect(configExists).toBe(true);
    });

    it('应该注册默认Providers', async () => {
      const providers = await apiManager.listProviders();

      const hasLLM = providers.some(p => p.category === 'llm');
      const hasImageGen = providers.some(p => p.category === 'image-generation');

      expect(hasLLM).toBe(true);
      expect(hasImageGen).toBe(true);
    });
  });

  describe('addProvider', () => {
    it('应该成功添加新Provider', async () => {
      const provider: APIProviderConfig = {
        id: 'custom-llm',
        name: 'Custom LLM',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'test-key-123',
        baseUrl: 'https://api.custom.com/v1',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const retrieved = await apiManager.getProvider('custom-llm');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('custom-llm');
      expect(retrieved?.name).toBe('Custom LLM');
    });

    it('应该加密保存API Key到文件', async () => {
      const provider: APIProviderConfig = {
        id: 'secure-api',
        name: 'Secure API',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'plain-secret-key',
        baseUrl: 'https://secure.api.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const configPath = path.join(testConfigDir, 'providers.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const savedConfigs = JSON.parse(content);

      const savedProvider = savedConfigs.find((p: any) => p.id === 'secure-api');
      expect(savedProvider).toBeDefined();
      expect(savedProvider.apiKey).not.toBe('plain-secret-key');
      expect(savedProvider._encrypted).toBe('aes-256-gcm');
    });

    it('应该支持同类型多Provider', async () => {
      const comfy1: APIProviderConfig = {
        id: 'comfyui-local',
        name: 'ComfyUI Local',
        category: 'workflow',
        authType: 'none',
        baseUrl: 'http://localhost:8188',
        enabled: true,
      };

      const comfy2: APIProviderConfig = {
        id: 'comfyui-cloud',
        name: 'ComfyUI Cloud',
        category: 'workflow',
        authType: 'api-key',
        apiKey: 'cloud-key',
        baseUrl: 'https://cloud.comfyui.com',
        enabled: true,
      };

      await apiManager.addProvider(comfy1);
      await apiManager.addProvider(comfy2);

      const workflowProviders = await apiManager.listProviders({ category: 'workflow' });
      expect(workflowProviders.length).toBeGreaterThanOrEqual(2);

      const ids = workflowProviders.map(p => p.id);
      expect(ids).toContain('comfyui-local');
      expect(ids).toContain('comfyui-cloud');
    });

    it('应该支持更新已存在的Provider', async () => {
      const provider: APIProviderConfig = {
        id: 'update-test',
        name: 'First',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://api1.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const updated: APIProviderConfig = {
        id: 'update-test',
        name: 'Updated Name',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://api2.com',
        enabled: true,
      };

      await apiManager.addProvider(updated);

      const retrieved = await apiManager.getProvider('update-test');
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.baseUrl).toBe('https://api2.com');
    });

    it('应该持久化Provider到文件', async () => {
      const provider: APIProviderConfig = {
        id: 'persistent',
        name: 'Persistent Provider',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'persist-key',
        baseUrl: 'https://persist.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const newManager = new APIManager(testConfigDir);
      await newManager.initialize();

      const loaded = await newManager.getProvider('persistent');
      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('Persistent Provider');
      expect(loaded?.apiKey).toBe('persist-key');
    });
  });

  describe('removeProvider', () => {
    it('应该成功删除Provider', async () => {
      const provider: APIProviderConfig = {
        id: 'to-remove',
        name: 'To Remove',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://remove.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      let retrieved = await apiManager.getProvider('to-remove');
      expect(retrieved).not.toBeNull();

      await apiManager.removeProvider('to-remove');

      retrieved = await apiManager.getProvider('to-remove');
      expect(retrieved).toBeNull();
    });

    it('应该在Provider不存在时抛出错误', async () => {
      await expect(
        apiManager.removeProvider('non-existent')
      ).rejects.toThrow();
    });

    it('应该从文件中删除Provider', async () => {
      const provider: APIProviderConfig = {
        id: 'file-remove',
        name: 'File Remove',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://file.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);
      await apiManager.removeProvider('file-remove');

      const newManager = new APIManager(testConfigDir);
      await newManager.initialize();

      const loaded = await newManager.getProvider('file-remove');
      expect(loaded).toBeNull();
    });
  });

  describe('getProvider', () => {
    it('应该成功获取Provider', async () => {
      const provider: APIProviderConfig = {
        id: 'get-test',
        name: 'Get Test',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'get-key',
        baseUrl: 'https://get.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);
      const retrieved = await apiManager.getProvider('get-test');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('get-test');
      expect(retrieved?.name).toBe('Get Test');
      expect(retrieved?.apiKey).toBe('get-key');
    });

    it('应该自动解密API Key', async () => {
      const provider: APIProviderConfig = {
        id: 'decrypt-test',
        name: 'Decrypt Test',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'secret-to-decrypt',
        baseUrl: 'https://decrypt.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const newManager = new APIManager(testConfigDir);
      await newManager.initialize();

      const loaded = await newManager.getProvider('decrypt-test');
      expect(loaded?.apiKey).toBe('secret-to-decrypt');
    });

    it('应该在Provider不存在时返回null', async () => {
      const provider = await apiManager.getProvider('non-existent');
      expect(provider).toBeNull();
    });
  });

  describe('listProviders', () => {
    it('应该列出所有Providers', async () => {
      const providers = await apiManager.listProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('应该按category过滤', async () => {
      const llmProvider: APIProviderConfig = {
        id: 'filter-llm',
        name: 'Filter LLM',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://llm.com',
        enabled: true,
      };

      const imageProvider: APIProviderConfig = {
        id: 'filter-image',
        name: 'Filter Image',
        category: 'image-generation',
        authType: 'none',
        baseUrl: 'https://image.com',
        enabled: true,
      };

      await apiManager.addProvider(llmProvider);
      await apiManager.addProvider(imageProvider);

      const llmProviders = await apiManager.listProviders({ category: 'llm' });
      const allLLM = llmProviders.every(p => p.category === 'llm');

      expect(allLLM).toBe(true);
      expect(llmProviders.some(p => p.id === 'filter-llm')).toBe(true);
    });

    it('应该只显示已启用的Providers', async () => {
      const enabled: APIProviderConfig = {
        id: 'enabled-provider',
        name: 'Enabled',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://enabled.com',
        enabled: true,
      };

      const disabled: APIProviderConfig = {
        id: 'disabled-provider',
        name: 'Disabled',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://disabled.com',
        enabled: false,
      };

      await apiManager.addProvider(enabled);
      await apiManager.addProvider(disabled);

      const enabledOnly = await apiManager.listProviders({ enabledOnly: true });
      const allEnabled = enabledOnly.every(p => p.enabled === true);

      expect(allEnabled).toBe(true);
      expect(enabledOnly.some(p => p.id === 'disabled-provider')).toBe(false);
    });
  });

  describe('getProviderStatus', () => {
    it('应该返回Provider状态', async () => {
      const provider: APIProviderConfig = {
        id: 'status-test',
        name: 'Status Test',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'status-key',
        baseUrl: 'https://status.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);
      const status = await apiManager.getProviderStatus('status-test');

      expect(status).toBeDefined();
      expect(status.id).toBe('status-test');
      expect(status.status).toBeDefined();
    });

    it('应该在Provider不存在时抛出错误', async () => {
      await expect(
        apiManager.getProviderStatus('non-existent')
      ).rejects.toThrow();
    });
  });

  describe('testProviderConnection', () => {
    it('应该测试Provider连接', async () => {
      const provider: APIProviderConfig = {
        id: 'connection-test',
        name: 'Connection Test',
        category: 'llm',
        authType: 'api-key',
        apiKey: 'conn-key',
        baseUrl: 'https://connection.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);
      const result = await apiManager.testProviderConnection({ providerId: 'connection-test' });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
    });

    it('应该在Provider不存在时抛出错误', async () => {
      await expect(
        apiManager.testProviderConnection({ providerId: 'non-existent' })
      ).rejects.toThrow();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理大量Providers', async () => {
      const providers: APIProviderConfig[] = [];
      for (let i = 0; i < 50; i++) {
        providers.push({
          id: `bulk-provider-${i}`,
          name: `Bulk Provider ${i}`,
          category: 'llm' as APICategory,
          authType: 'api-key' as AuthType,
          apiKey: `key-${i}`,
          baseUrl: `https://bulk${i}.com`,
          enabled: i % 2 === 0,
        });
      }

      for (const provider of providers) {
        await apiManager.addProvider(provider);
      }

      const all = await apiManager.listProviders();
      expect(all.length).toBeGreaterThanOrEqual(50);
    });

    it('应该处理空API Key', async () => {
      const provider: APIProviderConfig = {
        id: 'no-key',
        name: 'No Key',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://nokey.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);
      const retrieved = await apiManager.getProvider('no-key');

      expect(retrieved?.apiKey).toBeUndefined();
    });

    it('应该处理特殊字符API Key', async () => {
      const specialKey = 'key!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const provider: APIProviderConfig = {
        id: 'special-key',
        name: 'Special Key',
        category: 'llm',
        authType: 'api-key',
        apiKey: specialKey,
        baseUrl: 'https://special.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const newManager = new APIManager(testConfigDir);
      await newManager.initialize();

      const loaded = await newManager.getProvider('special-key');
      expect(loaded?.apiKey).toBe(specialKey);
    });

    it('应该处理Provider启用/禁用切换', async () => {
      const provider: APIProviderConfig = {
        id: 'toggle-test-unique',
        name: 'Toggle Test',
        category: 'llm',
        authType: 'none',
        baseUrl: 'https://toggle.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const updated: APIProviderConfig = {
        ...provider,
        enabled: false,
      };
      await apiManager.addProvider(updated);

      const retrieved = await apiManager.getProvider('toggle-test-unique');
      expect(retrieved?.enabled).toBe(false);
    });

    it('应该处理配置文件损坏', async () => {
      const configPath = path.join(testConfigDir, 'providers.json');
      await fs.writeFile(configPath, 'invalid json {{{');

      const newManager = new APIManager(testConfigDir);
      await newManager.initialize();

      const providers = await newManager.listProviders();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('应该处理并发Provider操作', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        operations.push(
          apiManager.addProvider({
            id: `concurrent-${i}`,
            name: `Concurrent ${i}`,
            category: 'llm',
            authType: 'api-key',
            apiKey: `key-${i}`,
            baseUrl: `https://concurrent${i}.com`,
            enabled: true,
          })
        );
      }

      await Promise.all(operations);

      const providers = await apiManager.listProviders();
      expect(providers.length).toBeGreaterThanOrEqual(10);
    });

    it('应该处理长API Key', async () => {
      const longKey = 'sk-' + 'a'.repeat(1000);
      const provider: APIProviderConfig = {
        id: 'long-key',
        name: 'Long Key',
        category: 'llm',
        authType: 'api-key',
        apiKey: longKey,
        baseUrl: 'https://long.com',
        enabled: true,
      };

      await apiManager.addProvider(provider);

      const newManager = new APIManager(testConfigDir);
      await newManager.initialize();

      const loaded = await newManager.getProvider('long-key');
      expect(loaded?.apiKey).toBe(longKey);
    });

    it('应该处理URL编码的baseUrl', async () => {
      const encodedUrl = 'https://api.com/v1?param=value&other=test';
      const provider: APIProviderConfig = {
        id: 'encoded-url',
        name: 'Encoded URL',
        category: 'llm',
        authType: 'none',
        baseUrl: encodedUrl,
        enabled: true,
      };

      await apiManager.addProvider(provider);
      const retrieved = await apiManager.getProvider('encoded-url');

      expect(retrieved?.baseUrl).toBe(encodedUrl);
    });
  });
});

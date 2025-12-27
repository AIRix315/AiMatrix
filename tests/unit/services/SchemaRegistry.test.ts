/**
 * SchemaRegistry单元测试
 *
 * Phase 7 H01: 验证Schema注册、查询和验证功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemService } from '../../../src/main/services/FileSystemService';
import { SchemaRegistry } from '../../../src/main/services/SchemaRegistry';
import type { AssetSchemaDefinition } from '../../../src/shared/types/schema';

describe('SchemaRegistry单元测试', () => {
  let fsService: FileSystemService;
  let registry: SchemaRegistry;
  let testDataDir: string;

  beforeEach(async () => {
    // 创建测试目录
    testDataDir = path.join(process.cwd(), 'test-data', `schema-test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // 初始化服务
    fsService = new FileSystemService();
    await fsService.initialize(testDataDir);

    registry = new SchemaRegistry(fsService);
    await registry.initialize(testDataDir);
  });

  afterEach(async () => {
    // 清理
    await registry.cleanup();

    // 删除测试目录
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理测试目录失败:', error);
    }
  });

  describe('Schema注册', () => {
    it('应该成功注册Schema', async () => {
      const schemaId = await registry.registerSchema('test-plugin', {
        id: 'test-schema',
        name: '测试Schema',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            testField: { type: 'string' }
          }
        }
      });

      expect(schemaId).toBe('test-plugin.test-schema');

      // 验证Schema已注册
      const schema = registry.getSchema(schemaId);
      expect(schema).not.toBeNull();
      expect(schema?.name).toBe('测试Schema');
      expect(schema?.pluginId).toBe('test-plugin');
    });

    it('应该拒绝重复的Schema ID', async () => {
      await registry.registerSchema('test-plugin', {
        id: 'test-schema',
        name: '测试Schema',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {}
        }
      });

      // 尝试注册相同的Schema
      await expect(async () => {
        await registry.registerSchema('test-plugin', {
          id: 'test-schema',
          name: '测试Schema2',
          version: '1.0.0',
          schema: {
            type: 'object',
            properties: {}
          }
        });
      }).rejects.toThrow('Schema已存在');
    });

    it('应该持久化Schema到文件', async () => {
      await registry.registerSchema('test-plugin', {
        id: 'test-schema',
        name: '测试Schema',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {}
        }
      });

      // 验证文件存在
      const schemaFilePath = path.join(testDataDir, 'schema-registry.json');
      const exists = await fs.access(schemaFilePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // 验证文件内容
      const content = await fs.readFile(schemaFilePath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.schemas).toHaveLength(1);
      expect(data.schemas[0].id).toBe('test-plugin.test-schema');
    });
  });

  describe('Schema查询', () => {
    beforeEach(async () => {
      // 注册多个Schema
      await registry.registerSchema('plugin-a', {
        id: 'schema-1',
        name: 'Schema A1',
        version: '1.0.0',
        tags: ['tag1', 'tag2'],
        schema: {
          type: 'object',
          properties: {}
        }
      });

      await registry.registerSchema('plugin-a', {
        id: 'schema-2',
        name: 'Schema A2',
        version: '1.0.0',
        tags: ['tag2', 'tag3'],
        schema: {
          type: 'object',
          properties: {}
        }
      });

      await registry.registerSchema('plugin-b', {
        id: 'schema-1',
        name: 'Schema B1',
        version: '1.0.0',
        tags: ['tag1'],
        schema: {
          type: 'object',
          properties: {}
        }
      });
    });

    it('应该查询所有Schema', () => {
      const schemas = registry.querySchemas({});
      expect(schemas).toHaveLength(3);
    });

    it('应该按插件ID过滤', () => {
      const schemas = registry.querySchemas({ pluginId: 'plugin-a' });
      expect(schemas).toHaveLength(2);
      expect(schemas.every(s => s.pluginId === 'plugin-a')).toBe(true);
    });

    it('应该按Schema ID过滤', () => {
      const schemas = registry.querySchemas({ schemaId: 'plugin-a.schema-1' });
      expect(schemas).toHaveLength(1);
      expect(schemas[0].id).toBe('plugin-a.schema-1');
    });

    it('应该按标签过滤', () => {
      const schemas = registry.querySchemas({ tags: ['tag1'] });
      expect(schemas).toHaveLength(2);
      expect(schemas.every(s => s.tags?.includes('tag1'))).toBe(true);
    });

    it('应该按名称模糊匹配', () => {
      const schemas = registry.querySchemas({ name: 'Schema A' });
      expect(schemas).toHaveLength(2);
      expect(schemas.every(s => s.name.includes('Schema A'))).toBe(true);
    });
  });

  describe('Schema验证', () => {
    beforeEach(async () => {
      await registry.registerSchema('test-plugin', {
        id: 'user',
        name: '用户Schema',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 50
            },
            age: {
              type: 'integer',
              minimum: 0,
              maximum: 150
            },
            email: {
              type: 'string',
              format: 'email'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'guest']
            }
          },
          required: ['name', 'age']
        }
      });
    });

    it('应该验证有效的数据', () => {
      const data = {
        name: '张三',
        age: 25,
        email: 'zhangsan@example.com',
        role: 'user'
      };

      const result = registry.validateData('test-plugin.user', data);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('应该拒绝缺少必填字段的数据', () => {
      const data = {
        name: '张三'
        // 缺少 age 字段
      };

      const result = registry.validateData('test-plugin.user', data);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.message.includes('缺少必填字段'))).toBe(true);
    });

    it('应该拒绝类型不匹配的数据', () => {
      const data = {
        name: '张三',
        age: '25' // 应该是number，但提供了string
      };

      const result = registry.validateData('test-plugin.user', data);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.message.includes('类型不匹配'))).toBe(true);
    });

    it('应该拒绝超出范围的数值', () => {
      const data = {
        name: '张三',
        age: 200 // 超过最大值150
      };

      const result = registry.validateData('test-plugin.user', data);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.message.includes('数值大于最大值'))).toBe(true);
    });

    it('应该拒绝不在枚举范围内的值', () => {
      const data = {
        name: '张三',
        age: 25,
        role: 'superuser' // 不在枚举范围内
      };

      const result = registry.validateData('test-plugin.user', data);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.message.includes('值不在枚举范围内'))).toBe(true);
    });

    it('应该拒绝长度不符合要求的字符串', () => {
      const data = {
        name: '', // 长度为0，小于minLength 1
        age: 25
      };

      const result = registry.validateData('test-plugin.user', data);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.message.includes('字符串长度小于最小值'))).toBe(true);
    });
  });

  describe('Schema注销', () => {
    it('应该成功注销Schema', async () => {
      const schemaId = await registry.registerSchema('test-plugin', {
        id: 'test-schema',
        name: '测试Schema',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {}
        }
      });

      // 验证Schema存在
      expect(registry.getSchema(schemaId)).not.toBeNull();

      // 注销Schema
      await registry.unregisterSchema(schemaId);

      // 验证Schema已删除
      expect(registry.getSchema(schemaId)).toBeNull();
    });

    it('应该拒绝注销不存在的Schema', async () => {
      await expect(async () => {
        await registry.unregisterSchema('non-existent.schema');
      }).rejects.toThrow('Schema不存在');
    });
  });

  describe('注册表状态', () => {
    it('应该返回正确的状态信息', async () => {
      await registry.registerSchema('plugin-a', {
        id: 'schema-1',
        name: 'Schema 1',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {}
        }
      });

      await registry.registerSchema('plugin-a', {
        id: 'schema-2',
        name: 'Schema 2',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {}
        }
      });

      await registry.registerSchema('plugin-b', {
        id: 'schema-1',
        name: 'Schema 1',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {}
        }
      });

      const state = registry.getState();

      expect(state.totalSchemas).toBe(3);
      expect(state.activeSchemas).toBe(3);
      expect(state.schemasByPlugin['plugin-a']).toBe(2);
      expect(state.schemasByPlugin['plugin-b']).toBe(1);
    });
  });
});

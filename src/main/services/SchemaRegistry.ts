/**
 * SchemaRegistry服务 - Schema注册表
 *
 * Phase 7 H01: 数据结构泛化的核心组件
 * 负责：
 * - Schema的注册和注销
 * - Schema的查询和验证
 * - Schema的持久化存储
 *
 * 参考：docs/00-global-requirements-v1.0.0.md
 * 遵循全局时间处理要求
 */

import * as path from 'path';
import { FileSystemService } from './FileSystemService';
import { Logger } from './Logger';
import { timeService } from './TimeService';
import type {
  AssetSchemaDefinition,
  SchemaFilter,
  SchemaValidationResult,
  SchemaRegistryState,
  JSONSchemaProperty
} from '@/shared/types';

/**
 * SchemaRegistry服务类
 */
export class SchemaRegistry {
  private fsService: FileSystemService;
  private logger: Logger;
  private schemas: Map<string, AssetSchemaDefinition> = new Map();
  private schemaFilePath?: string;
  private isInitialized = false;

  constructor(fsService: FileSystemService) {
    this.fsService = fsService;
    this.logger = new Logger();
  }

  /**
   * 初始化Schema注册表
   */
  async initialize(dataDir: string): Promise<void> {
    try {
      await this.logger.info('初始化Schema注册表', 'SchemaRegistry');

      this.schemaFilePath = path.join(dataDir, 'schema-registry.json');

      // 加载已保存的Schema
      if (await this.fsService.exists(this.schemaFilePath)) {
        const data = await this.fsService.readJSON<{ schemas: AssetSchemaDefinition[] }>(this.schemaFilePath);
        if (data && Array.isArray(data.schemas)) {
          for (const schema of data.schemas) {
            this.schemas.set(schema.id, schema);
          }
          await this.logger.info(`加载了${data.schemas.length}个Schema`, 'SchemaRegistry');
        }
      }

      this.isInitialized = true;
      await this.logger.info('Schema注册表初始化完成', 'SchemaRegistry');
    } catch (error) {
      await this.logger.error('Schema注册表初始化失败', 'SchemaRegistry', { error });
      throw error;
    }
  }

  /**
   * 注册Schema
   * @param pluginId 插件ID
   * @param schemaDefinition Schema定义
   */
  async registerSchema(
    pluginId: string,
    schemaDefinition: Omit<AssetSchemaDefinition, 'registeredAt' | 'active' | 'pluginId'>
  ): Promise<string> {
    try {
      this.ensureInitialized();

      const schemaId = `${pluginId}.${schemaDefinition.id}`;

      // 检查Schema ID是否已存在
      if (this.schemas.has(schemaId)) {
        throw new Error(`Schema已存在: ${schemaId}`);
      }

      // 获取当前时间
      const currentTime = await timeService.getCurrentTime();

      // 创建完整的Schema定义
      const fullSchema: AssetSchemaDefinition = {
        ...schemaDefinition,
        id: schemaId,
        pluginId,
        registeredAt: currentTime.toISOString(),
        active: true
      };

      // 验证Schema结构
      this.validateSchemaDefinition(fullSchema);

      // 保存到内存
      this.schemas.set(schemaId, fullSchema);

      // 持久化到文件
      await this.saveToFile();

      await this.logger.info(`Schema注册成功: ${schemaId}`, 'SchemaRegistry', {
        pluginId,
        schemaName: schemaDefinition.name,
        version: schemaDefinition.version
      });

      return schemaId;
    } catch (error) {
      await this.logger.error('Schema注册失败', 'SchemaRegistry', { pluginId, error });
      throw error;
    }
  }

  /**
   * 注销Schema
   * @param schemaId Schema ID
   */
  async unregisterSchema(schemaId: string): Promise<void> {
    try {
      this.ensureInitialized();

      if (!this.schemas.has(schemaId)) {
        throw new Error(`Schema不存在: ${schemaId}`);
      }

      // 从内存中移除
      this.schemas.delete(schemaId);

      // 持久化到文件
      await this.saveToFile();

      await this.logger.info(`Schema注销成功: ${schemaId}`, 'SchemaRegistry');
    } catch (error) {
      await this.logger.error('Schema注销失败', 'SchemaRegistry', { schemaId, error });
      throw error;
    }
  }

  /**
   * 获取Schema
   * @param schemaId Schema ID
   * @returns Schema定义，如果不存在返回null
   */
  getSchema(schemaId: string): AssetSchemaDefinition | null {
    this.ensureInitialized();
    return this.schemas.get(schemaId) || null;
  }

  /**
   * 查询Schema
   * @param filter 过滤条件
   * @returns 符合条件的Schema列表
   */
  querySchemas(filter: SchemaFilter = {}): AssetSchemaDefinition[] {
    this.ensureInitialized();

    let results = Array.from(this.schemas.values());

    // 按插件ID过滤
    if (filter.pluginId) {
      results = results.filter(s => s.pluginId === filter.pluginId);
    }

    // 按Schema ID过滤
    if (filter.schemaId) {
      results = results.filter(s => s.id === filter.schemaId);
    }

    // 按名称过滤（模糊匹配）
    if (filter.name) {
      const nameLower = filter.name.toLowerCase();
      results = results.filter(s => s.name.toLowerCase().includes(nameLower));
    }

    // 按标签过滤
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(s => {
        if (!s.tags) return false;
        return filter.tags!.some(tag => s.tags!.includes(tag));
      });
    }

    // 按活跃状态过滤
    if (filter.activeOnly) {
      results = results.filter(s => s.active === true);
    }

    return results;
  }

  /**
   * 验证数据是否符合Schema
   * @param schemaId Schema ID
   * @param data 待验证的数据
   * @returns 验证结果
   */
  validateData(schemaId: string, data: unknown): SchemaValidationResult {
    this.ensureInitialized();

    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: `Schema不存在: ${schemaId}`,
          expected: 'valid schema',
          actual: 'undefined'
        }]
      };
    }

    // 执行JSON Schema验证
    return this.validateAgainstSchema(data, schema.schema, 'root');
  }

  /**
   * 获取注册表状态
   */
  getState(): SchemaRegistryState {
    this.ensureInitialized();

    const schemasByPlugin: Record<string, number> = {};
    let activeCount = 0;

    for (const schema of this.schemas.values()) {
      // 统计按插件分组的Schema数量
      if (!schemasByPlugin[schema.pluginId]) {
        schemasByPlugin[schema.pluginId] = 0;
      }
      schemasByPlugin[schema.pluginId]++;

      // 统计活跃Schema数量
      if (schema.active) {
        activeCount++;
      }
    }

    return {
      totalSchemas: this.schemas.size,
      activeSchemas: activeCount,
      schemasByPlugin
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      await this.logger.info('清理Schema注册表', 'SchemaRegistry');

      // 保存到文件
      await this.saveToFile();

      this.schemas.clear();
      this.isInitialized = false;

      await this.logger.info('Schema注册表清理完成', 'SchemaRegistry');
    } catch (error) {
      await this.logger.error('Schema注册表清理失败', 'SchemaRegistry', { error });
      throw error;
    }
  }

  // ========================================
  // 私有辅助方法
  // ========================================

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('SchemaRegistry尚未初始化');
    }
  }

  /**
   * 验证Schema定义的结构
   */
  private validateSchemaDefinition(schema: AssetSchemaDefinition): void {
    if (!schema.id || schema.id.trim().length === 0) {
      throw new Error('Schema ID不能为空');
    }

    if (!schema.pluginId || schema.pluginId.trim().length === 0) {
      throw new Error('插件ID不能为空');
    }

    if (!schema.name || schema.name.trim().length === 0) {
      throw new Error('Schema名称不能为空');
    }

    if (!schema.version || schema.version.trim().length === 0) {
      throw new Error('Schema版本号不能为空');
    }

    if (!schema.schema || typeof schema.schema !== 'object') {
      throw new Error('Schema定义必须是一个有效的JSON Schema对象');
    }
  }

  /**
   * 根据JSON Schema验证数据
   * 简化版验证器，支持基本类型验证
   */
  private validateAgainstSchema(
    data: unknown,
    schema: JSONSchemaProperty,
    path: string
  ): SchemaValidationResult {
    const errors: SchemaValidationResult['errors'] = [];

    // 验证类型
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const dataType = this.getDataType(data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!types.includes(dataType as any)) {
        errors.push({
          path,
          message: `类型不匹配`,
          expected: types.join(' | '),
          actual: dataType
        });
      }
    }

    // 验证对象属性
    if (schema.type === 'object' && schema.properties && typeof data === 'object' && data !== null) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = `${path}.${key}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propData = (data as any)[key];

        // 检查必填字段
        if (schema.required?.includes(key) && propData === undefined) {
          errors.push({
            path: propPath,
            message: `缺少必填字段`,
            expected: 'defined value',
            actual: 'undefined'
          });
          continue;
        }

        // 递归验证属性
        if (propData !== undefined) {
          const result = this.validateAgainstSchema(propData, propSchema, propPath);
          if (!result.valid && result.errors) {
            errors.push(...result.errors);
          }
        }
      }
    }

    // 验证数组项
    if (schema.type === 'array' && Array.isArray(data) && schema.items) {
      data.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const result = this.validateAgainstSchema(item, schema.items!, itemPath);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
      });
    }

    // 验证枚举
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path,
        message: `值不在枚举范围内`,
        expected: schema.enum.join(', '),
        actual: String(data)
      });
    }

    // 验证字符串长度
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path,
          message: `字符串长度小于最小值`,
          expected: `>= ${schema.minLength}`,
          actual: String(data.length)
        });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path,
          message: `字符串长度大于最大值`,
          expected: `<= ${schema.maxLength}`,
          actual: String(data.length)
        });
      }
    }

    // 验证数值范围
    if ((schema.type === 'number' || schema.type === 'integer') && typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path,
          message: `数值小于最小值`,
          expected: `>= ${schema.minimum}`,
          actual: String(data)
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path,
          message: `数值大于最大值`,
          expected: `<= ${schema.maximum}`,
          actual: String(data)
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 获取数据的类型
   */
  private getDataType(data: unknown): string {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'number') {
      return Number.isInteger(data) ? 'integer' : 'number';
    }
    return typeof data;
  }

  /**
   * 持久化Schema到文件
   */
  private async saveToFile(): Promise<void> {
    if (!this.schemaFilePath) {
      throw new Error('Schema文件路径未设置');
    }

    const data = {
      version: '1.0.0',
      schemas: Array.from(this.schemas.values())
    };

    await this.fsService.saveJSON(this.schemaFilePath, data);
    await this.logger.debug('Schema注册表已保存到文件', 'SchemaRegistry');
  }
}

// 导出单例实例（延迟初始化）
let schemaRegistry: SchemaRegistry | null = null;

export function getSchemaRegistry(fsService: FileSystemService): SchemaRegistry {
  if (!schemaRegistry) {
    schemaRegistry = new SchemaRegistry(fsService);
  }
  return schemaRegistry;
}

/**
 * NeDB 类型定义
 *
 * NeDB 是一个纯 JavaScript 实现的嵌入式数据库
 * 提供类似 MongoDB 的 API
 *
 * 参考：https://github.com/louischatriot/nedb
 */

declare module 'nedb' {
  /**
   * NeDB 查询选项
   */
  export interface FindOptions {
    /** 限制返回结果数量 */
    limit?: number;
    /** 跳过指定数量的文档 */
    skip?: number;
    /** 排序规则 */
    sort?: Record<string, 1 | -1>;
    /** 投影（选择返回的字段） */
    projection?: Record<string, 0 | 1>;
  }

  /**
   * NeDB 更新选项
   */
  export interface UpdateOptions {
    /** 如果文档不存在则插入 */
    upsert?: boolean;
    /** 更新多个文档 */
    multi?: boolean;
    /** 返回更新后的文档 */
    returnUpdatedDocs?: boolean;
  }

  /**
   * NeDB 索引选项
   */
  export interface IndexOptions {
    /** 索引字段名 */
    fieldName: string;
    /** 是否唯一索引 */
    unique?: boolean;
    /** 是否稀疏索引 */
    sparse?: boolean;
    /** 过期时间（秒） */
    expireAfterSeconds?: number;
  }

  /**
   * NeDB Datastore 配置
   */
  export interface DatastoreOptions {
    /** 数据文件路径（如果未指定则为内存数据库） */
    filename?: string;
    /** 是否在创建时自动加载数据 */
    autoload?: boolean;
    /** 自动加载时的回调 */
    onload?: (error: Error | null) => void;
    /** 是否自动压缩数据文件 */
    autoCompactionInterval?: number;
    /** 是否在字段中自动添加 createdAt 和 updatedAt */
    timestampData?: boolean;
    /** 数据在内存中的索引 */
    inMemoryOnly?: boolean;
    /** Node.js 的文件系统模块（用于测试） */
    nodeWebkitAppName?: string;
  }

  /**
   * NeDB 错误回调
   */
  export type ErrorCallback = (error: Error | null) => void;

  /**
   * NeDB 查询回调
   */
  export type FindCallback<T> = (error: Error | null, documents: T[]) => void;

  /**
   * NeDB 单文档查询回调
   */
  export type FindOneCallback<T> = (error: Error | null, document: T | null) => void;

  /**
   * NeDB 插入回调
   */
  export type InsertCallback<T> = (error: Error | null, document: T) => void;

  /**
   * NeDB 更新回调
   */
  export type UpdateCallback = (
    error: Error | null,
    numAffected: number,
    affectedDocuments: unknown,
    upsert: boolean
  ) => void;

  /**
   * NeDB 删除回调
   */
  export type RemoveCallback = (error: Error | null, numRemoved: number) => void;

  /**
   * NeDB 计数回调
   */
  export type CountCallback = (error: Error | null, count: number) => void;

  /**
   * NeDB Datastore 类
   */
  export default class Datastore<T = unknown> {
    persistence: {
      compactDatafile(): void;
      setAutocompactionInterval(interval: number): void;
      stopAutocompaction(): void;
    };
    /**
     * 创建 Datastore 实例
     * @param options 配置选项
     */
    constructor(options?: DatastoreOptions | string);

    /**
     * 加载数据库
     * @param callback 加载完成的回调
     */
    loadDatabase(callback?: ErrorCallback): void;

    /**
     * 创建索引
     * @param options 索引选项
     * @param callback 创建完成的回调
     */
    ensureIndex(options: IndexOptions, callback?: ErrorCallback): void;

    /**
     * 移除索引
     * @param fieldName 字段名
     * @param callback 移除完成的回调
     */
    removeIndex(fieldName: string, callback?: ErrorCallback): void;

    /**
     * 插入文档
     * @param document 要插入的文档或文档数组
     * @param callback 插入完成的回调
     */
    insert<U extends T>(document: U | U[], callback?: InsertCallback<U>): void;

    /**
     * 查找文档
     * @param query 查询条件
     * @param callback 查询完成的回调
     */
    find<U extends T>(query: Partial<U> | Record<string, unknown>, callback?: FindCallback<U>): Cursor<U>;

    /**
     * 查找文档（带投影）
     * @param query 查询条件
     * @param projection 投影
     * @param callback 查询完成的回调
     */
    find<U extends T>(
      query: Partial<U> | Record<string, unknown>,
      projection: Record<string, 0 | 1>,
      callback?: FindCallback<U>
    ): Cursor<U>;

    /**
     * 查找单个文档
     * @param query 查询条件
     * @param callback 查询完成的回调
     */
    findOne<U extends T>(query: Partial<U> | Record<string, unknown>, callback?: FindOneCallback<U>): void;

    /**
     * 查找单个文档（带投影）
     * @param query 查询条件
     * @param projection 投影
     * @param callback 查询完成的回调
     */
    findOne<U extends T>(
      query: Partial<U> | Record<string, unknown>,
      projection: Record<string, 0 | 1>,
      callback?: FindOneCallback<U>
    ): void;

    /**
     * 更新文档
     * @param query 查询条件
     * @param update 更新操作
     * @param options 更新选项
     * @param callback 更新完成的回调
     */
    update(
      query: Partial<T> | Record<string, unknown>,
      update: Partial<T> | Record<string, unknown>,
      options?: UpdateOptions,
      callback?: UpdateCallback
    ): void;

    /**
     * 删除文档
     * @param query 查询条件
     * @param options 删除选项
     * @param callback 删除完成的回调
     */
    remove(
      query: Partial<T> | Record<string, unknown>,
      options?: { multi?: boolean },
      callback?: RemoveCallback
    ): void;

    /**
     * 统计文档数量
     * @param query 查询条件
     * @param callback 统计完成的回调
     */
    count(query: Partial<T> | Record<string, unknown>, callback?: CountCallback): void;
  }

  /**
   * NeDB 查询游标
   */
  export class Cursor<T = unknown> {
    /**
     * 排序
     * @param sort 排序规则
     */
    sort(sort: Record<string, 1 | -1>): this;

    /**
     * 跳过
     * @param n 跳过的数量
     */
    skip(n: number): this;

    /**
     * 限制
     * @param n 限制的数量
     */
    limit(n: number): this;

    /**
     * 投影
     * @param projection 投影规则
     */
    projection(projection: Record<string, 0 | 1>): this;

    /**
     * 执行查询
     * @param callback 查询完成的回调
     */
    exec(callback: FindCallback<T>): void;
  }
}

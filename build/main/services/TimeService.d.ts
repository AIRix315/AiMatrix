/**
 * 时间服务与合规层
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 *
 * 参考：docs/00-global-requirements-v1.0.0.md
 */
export interface TimeService {
    getCurrentTime(): Promise<Date>;
    getUTCTime(): Promise<string>;
    getLocalTime(): Promise<string>;
    syncWithNTP(): Promise<boolean>;
    validateTimeIntegrity(): Promise<boolean>;
}
export declare class TimeServiceImpl implements TimeService {
    private static instance;
    private lastSyncTime;
    private timeDriftThreshold;
    private ntpServers;
    static getInstance(): TimeServiceImpl;
    /**
     * 获取当前系统时间
     * @returns Promise<Date> 当前时间
     */
    getCurrentTime(): Promise<Date>;
    /**
     * 获取UTC时间字符串（ISO 8601格式）
     * @returns Promise<string> UTC时间字符串
     */
    getUTCTime(): Promise<string>;
    /**
     * 获取本地时间字符串
     * @returns Promise<string> 本地时间字符串
     */
    getLocalTime(): Promise<string>;
    /**
     * 与NTP服务器同步时间
     * @returns Promise<boolean> 同步是否成功
     */
    syncWithNTP(): Promise<boolean>;
    /**
     * 验证时间完整性
     * @returns Promise<boolean> 时间是否有效
     */
    validateTimeIntegrity(): Promise<boolean>;
    /**
     * 与特定NTP服务器同步
     * @private
     */
    private syncWithNTPServer;
    /**
     * 记录时间操作
     * @private
     */
    private logTimeOperation;
    /**
     * 强制时间查询装饰器
     * 确保被装饰的方法在执行前验证时间有效性
     */
    static requireValidTime(): (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor | undefined) => PropertyDescriptor | undefined;
}
/**
 * 时间监控服务
 * 监控时间操作的合规性
 */
export declare class TimeMonitor {
    private static instance;
    static getInstance(): TimeMonitor;
    /**
     * 验证时间操作
     */
    validateTimeOperation(operation: string): Promise<boolean>;
    /**
     * 记录时间操作
     * @private
     */
    private logTimeOperation;
}
export declare const timeService: TimeServiceImpl;
export declare const timeMonitor: TimeMonitor;

/**
 * 资产管理器实现
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 *
 * 参考：docs/06-core-services-design-v1.0.1.md
 */
import { AssetManager as IAssetManager, AssetConfig, AssetScope, AssetSearchQuery } from '../../common/types';
/**
 * 资产管理器实现类
 */
export declare class AssetManager implements IAssetManager {
    private projectAssets;
    private globalAssets;
    private projectsPath;
    private globalAssetsPath;
    private isInitialized;
    constructor();
    /**
     * 初始化资产管理器
     */
    initialize(): Promise<void>;
    /**
     * 清理资产管理器
     */
    cleanup(): Promise<void>;
    /**
     * 添加资产
     */
    addAsset(target: {
        scope: AssetScope;
        id: string;
    }, assetData: Partial<AssetConfig>): Promise<AssetConfig>;
    /**
     * 获取资产
     */
    getAsset(scope: AssetScope, containerId: string, assetId: string): Promise<AssetConfig>;
    /**
     * 提升项目资产为全局资产
     */
    promoteAssetToGlobal(projectId: string, assetId: string, category: string): Promise<AssetConfig>;
    /**
     * 移除资产
     */
    removeAsset(scope: AssetScope, containerId: string, assetId: string): Promise<void>;
    /**
     * 更新资产
     */
    updateAsset(scope: AssetScope, containerId: string, assetId: string, updates: Partial<AssetConfig>): Promise<void>;
    /**
     * 搜索资产
     */
    searchAssets(scope: AssetScope, containerId: string, query: AssetSearchQuery): Promise<AssetConfig[]>;
    /**
     * 获取资产预览
     */
    getAssetPreview(scope: AssetScope, containerId: string, assetId: string): Promise<string>;
    /**
     * 加载所有资产
     * @private
     */
    private loadAllAssets;
    /**
     * 保存所有资产
     * @private
     */
    private saveAllAssets;
    /**
     * 保存资产配置
     * @private
     */
    private saveAssetConfig;
    /**
     * 加载资产配置
     * @private
     */
    private loadAssetConfig;
    /**
     * 记录日志
     * @private
     */
    private log;
}
export declare const assetManager: AssetManager;

/**
 * ResourceService - 资源生成服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */
import { NovelVideoAPIService } from './NovelVideoAPIService';
import { PluginContext, TaskScheduler } from '@matrix/sdk';
/**
 * ResourceService服务类
 */
export declare class ResourceService {
    private apiService;
    private taskScheduler;
    private logger;
    constructor(apiService: NovelVideoAPIService, taskScheduler: TaskScheduler, context: PluginContext);
    /**
     * 生成场景图片（异步任务）
     * @param projectId 项目ID
     * @param sceneAssetPath 场景资产文件路径
     * @returns 任务ID
     */
    generateSceneImage(projectId: string, sceneAssetPath: string): Promise<string>;
    /**
     * 执行场景图片生成任务
     */
    private executeSceneImageTask;
    /**
     * 生成角色图片（异步任务）
     * @param projectId 项目ID
     * @param characterAssetPath 角色资产文件路径
     * @returns 任务ID
     */
    generateCharacterImage(projectId: string, characterAssetPath: string): Promise<string>;
    /**
     * 执行角色图片生成任务
     */
    private executeCharacterImageTask;
    /**
     * 批量生成场景图片（并发控制）
     * @param projectId 项目ID
     * @param sceneAssetPaths 场景资产路径列表
     * @returns 任务ID列表
     */
    generateSceneImages(projectId: string, sceneAssetPaths: string[]): Promise<string[]>;
    /**
     * 批量生成角色图片（并发控制）
     * @param projectId 项目ID
     * @param characterAssetPaths 角色资产路径列表
     * @returns 任务ID列表
     */
    generateCharacterImages(projectId: string, characterAssetPaths: string[]): Promise<string[]>;
    /**
     * 等待任务完成
     * @param taskId 任务ID
     * @param timeout 超时时间（毫秒）
     * @returns 任务结果
     */
    waitForTask(taskId: string, timeout?: number): Promise<any>;
    /**
     * 批量等待任务完成
     * @param taskIds 任务ID列表
     * @param timeout 超时时间（毫秒）
     * @returns 任务结果列表
     */
    waitForTasks(taskIds: string[], timeout?: number): Promise<any[]>;
}

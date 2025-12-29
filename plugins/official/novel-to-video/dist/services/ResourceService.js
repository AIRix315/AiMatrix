"use strict";
/**
 * ResourceService - 资源生成服务
 *
 * Phase 7 H03: 插件包体隔离
 * 重构为只使用 Matrix SDK 公共API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceService = void 0;
/**
 * ResourceService服务类
 */
class ResourceService {
    constructor(apiService, taskScheduler, context) {
        this.apiService = apiService;
        this.taskScheduler = taskScheduler;
        this.logger = context.logger;
    }
    /**
     * 生成场景图片（异步任务）
     * @param projectId 项目ID
     * @param sceneAssetPath 场景资产文件路径
     * @returns 任务ID
     */
    async generateSceneImage(projectId, sceneAssetPath) {
        try {
            await this.logger.info('创建场景图片生成任务', 'ResourceService', {
                projectId,
                sceneAssetPath
            });
            // 创建异步任务
            const taskId = await this.taskScheduler.createTask({
                type: 'API_CALL',
                name: `生成场景图片: ${sceneAssetPath}`,
                metadata: {
                    taskType: 'novel-video:generate-scene-image',
                    projectId,
                    sceneAssetPath
                }
            });
            // 执行任务（在后台运行）
            this.executeSceneImageTask(taskId, projectId, sceneAssetPath).catch(error => {
                this.logger.error('场景图片生成任务执行失败', 'ResourceService', {
                    taskId,
                    error
                }).catch(() => { });
            });
            return taskId;
        }
        catch (error) {
            await this.logger.error('创建场景图片生成任务失败', 'ResourceService', {
                projectId,
                sceneAssetPath,
                error
            });
            throw error;
        }
    }
    /**
     * 执行场景图片生成任务
     */
    async executeSceneImageTask(taskId, projectId, sceneAssetPath) {
        try {
            // 调用API服务生成图片
            const imagePath = await this.apiService.generateSceneImage(projectId, sceneAssetPath);
            await this.logger.info('场景图片生成任务完成', 'ResourceService', {
                taskId,
                imagePath
            });
        }
        catch (error) {
            await this.logger.error('场景图片生成任务失败', 'ResourceService', {
                taskId,
                error
            });
        }
    }
    /**
     * 生成角色图片（异步任务）
     * @param projectId 项目ID
     * @param characterAssetPath 角色资产文件路径
     * @returns 任务ID
     */
    async generateCharacterImage(projectId, characterAssetPath) {
        try {
            await this.logger.info('创建角色图片生成任务', 'ResourceService', {
                projectId,
                characterAssetPath
            });
            // 创建异步任务
            const taskId = await this.taskScheduler.createTask({
                type: 'API_CALL',
                name: `生成角色图片: ${characterAssetPath}`,
                metadata: {
                    taskType: 'novel-video:generate-character-image',
                    projectId,
                    characterAssetPath
                }
            });
            // 执行任务（在后台运行）
            this.executeCharacterImageTask(taskId, projectId, characterAssetPath).catch(error => {
                this.logger.error('角色图片生成任务执行失败', 'ResourceService', {
                    taskId,
                    error
                }).catch(() => { });
            });
            return taskId;
        }
        catch (error) {
            await this.logger.error('创建角色图片生成任务失败', 'ResourceService', {
                projectId,
                characterAssetPath,
                error
            });
            throw error;
        }
    }
    /**
     * 执行角色图片生成任务
     */
    async executeCharacterImageTask(taskId, projectId, characterAssetPath) {
        try {
            // 调用API服务生成图片
            const imagePath = await this.apiService.generateCharacterImage(projectId, characterAssetPath);
            await this.logger.info('角色图片生成任务完成', 'ResourceService', {
                taskId,
                imagePath
            });
        }
        catch (error) {
            await this.logger.error('角色图片生成任务失败', 'ResourceService', {
                taskId,
                error
            });
        }
    }
    /**
     * 批量生成场景图片（并发控制）
     * @param projectId 项目ID
     * @param sceneAssetPaths 场景资产路径列表
     * @returns 任务ID列表
     */
    async generateSceneImages(projectId, sceneAssetPaths) {
        try {
            await this.logger.info('批量创建场景图片生成任务', 'ResourceService', {
                projectId,
                count: sceneAssetPaths.length
            });
            const taskIds = [];
            // 使用TaskScheduler的并发控制（最多3个）
            for (const sceneAssetPath of sceneAssetPaths) {
                const taskId = await this.generateSceneImage(projectId, sceneAssetPath);
                taskIds.push(taskId);
            }
            await this.logger.info('批量场景图片生成任务创建完成', 'ResourceService', {
                projectId,
                taskCount: taskIds.length
            });
            return taskIds;
        }
        catch (error) {
            await this.logger.error('批量创建场景图片生成任务失败', 'ResourceService', {
                projectId,
                error
            });
            throw error;
        }
    }
    /**
     * 批量生成角色图片（并发控制）
     * @param projectId 项目ID
     * @param characterAssetPaths 角色资产路径列表
     * @returns 任务ID列表
     */
    async generateCharacterImages(projectId, characterAssetPaths) {
        try {
            await this.logger.info('批量创建角色图片生成任务', 'ResourceService', {
                projectId,
                count: characterAssetPaths.length
            });
            const taskIds = [];
            for (const characterAssetPath of characterAssetPaths) {
                const taskId = await this.generateCharacterImage(projectId, characterAssetPath);
                taskIds.push(taskId);
            }
            await this.logger.info('批量角色图片生成任务创建完成', 'ResourceService', {
                projectId,
                taskCount: taskIds.length
            });
            return taskIds;
        }
        catch (error) {
            await this.logger.error('批量创建角色图片生成任务失败', 'ResourceService', {
                projectId,
                error
            });
            throw error;
        }
    }
    /**
     * 等待任务完成
     * @param taskId 任务ID
     * @param timeout 超时时间（毫秒）
     * @returns 任务结果
     */
    async waitForTask(taskId, timeout = 300000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const task = await this.taskScheduler.getTaskStatus(taskId);
            if (task.status === 'completed') {
                return task.result;
            }
            else if (task.status === 'failed') {
                const errorInfo = task.result;
                throw new Error(`任务失败: ${errorInfo?.error || '未知错误'}`);
            }
            // 等待1秒后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error(`任务超时: ${taskId}`);
    }
    /**
     * 批量等待任务完成
     * @param taskIds 任务ID列表
     * @param timeout 超时时间（毫秒）
     * @returns 任务结果列表
     */
    async waitForTasks(taskIds, timeout = 300000) {
        const results = [];
        for (const taskId of taskIds) {
            const result = await this.waitForTask(taskId, timeout);
            results.push(result);
        }
        return results;
    }
}
exports.ResourceService = ResourceService;

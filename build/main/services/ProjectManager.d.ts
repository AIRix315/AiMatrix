/**
 * 项目管理器实现
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 *
 * 参考：docs/06-core-services-design-v1.0.1.md
 */
import { ProjectManager as IProjectManager, ProjectConfig, AssetConfig } from '../../common/types';
/**
 * 项目管理器实现类
 */
export declare class ProjectManager implements IProjectManager {
    private projects;
    private projectsPath;
    private isInitialized;
    constructor();
    /**
     * 初始化项目管理器
     */
    initialize(): Promise<void>;
    /**
     * 清理项目管理器
     */
    cleanup(): Promise<void>;
    /**
     * 创建新项目
     */
    createProject(name: string, template?: string): Promise<ProjectConfig>;
    /**
     * 加载项目
     */
    loadProject(projectId: string): Promise<ProjectConfig>;
    /**
     * 保存项目
     */
    saveProject(projectId: string, config: ProjectConfig): Promise<void>;
    /**
     * 删除项目
     */
    deleteProject(projectId: string): Promise<void>;
    /**
     * 列出所有项目
     */
    listProjects(): Promise<ProjectConfig[]>;
    /**
     * 链接全局资产到项目
     */
    linkGlobalAsset(projectId: string, globalAssetId: string): Promise<void>;
    /**
     * 获取项目链接的全局资产
     */
    getLinkedAssets(projectId: string): Promise<AssetConfig[]>;
    /**
     * 加载所有项目
     * @private
     */
    private loadAllProjects;
    /**
     * 保存所有项目
     * @private
     */
    private saveAllProjects;
    /**
     * 保存项目配置
     * @private
     */
    private saveProjectConfig;
    /**
     * 应用项目模板
     * @private
     */
    private applyTemplate;
    /**
     * 记录日志
     * @private
     */
    private log;
}
export declare const projectManager: ProjectManager;

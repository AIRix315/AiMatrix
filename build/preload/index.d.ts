/**
 * Preload脚本 - 主进程与渲染进程之间的安全桥梁
 *
 * 遵循全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 *
 * 参考：docs/02-technical-blueprint-v1.0.0.md
 */
/**
 * 扩展Window接口，添加electronAPI属性
 */
declare global {
    interface Window {
        electronAPI: {
            getAppVersion: () => Promise<string>;
            quitApp: () => Promise<void>;
            restartApp: () => Promise<void>;
            minimizeWindow: () => Promise<void>;
            maximizeWindow: () => Promise<void>;
            closeWindow: () => Promise<void>;
            isWindowMaximized: () => Promise<boolean>;
            createProject: (name: string, template?: string) => Promise<any>;
            loadProject: (projectId: string) => Promise<any>;
            saveProject: (projectId: string, config: any) => Promise<void>;
            deleteProject: (projectId: string) => Promise<void>;
            listProjects: () => Promise<any[]>;
            addAsset: (scope: string, containerId: string, assetData: any) => Promise<any>;
            removeAsset: (scope: string, containerId: string, assetId: string) => Promise<void>;
            updateAsset: (scope: string, containerId: string, assetId: string, updates: any) => Promise<void>;
            searchAssets: (scope: string, containerId: string, query: any) => Promise<any[]>;
            getAssetPreview: (scope: string, containerId: string, assetId: string) => Promise<string>;
            executeWorkflow: (config: any) => Promise<string>;
            getWorkflowStatus: (jobId: string) => Promise<any>;
            cancelWorkflow: (jobId: string) => Promise<void>;
            listWorkflows: () => Promise<any[]>;
            saveWorkflow: (workflowId: string, config: any) => Promise<void>;
            loadWorkflow: (workflowId: string) => Promise<any>;
            installPlugin: (pluginPackage: any) => Promise<void>;
            uninstallPlugin: (pluginId: string) => Promise<void>;
            loadPlugin: (pluginId: string) => Promise<any>;
            executePluginAction: (pluginId: string, action: string, params: any) => Promise<any>;
            listPlugins: () => Promise<any[]>;
            createTask: (config: any) => Promise<string>;
            executeTask: (taskId: string, inputs: any) => Promise<string>;
            getTaskStatus: (executionId: string) => Promise<any>;
            cancelTask: (executionId: string) => Promise<void>;
            getTaskResults: (executionId: string) => Promise<any>;
            callAPI: (name: string, params: any) => Promise<any>;
            setAPIKey: (name: string, key: string) => Promise<void>;
            getAPIStatus: (name: string) => Promise<any>;
            getAPIUsage: (name: string) => Promise<any>;
            readFile: (filePath: string) => Promise<any>;
            writeFile: (filePath: string, content: any) => Promise<void>;
            deleteFile: (filePath: string) => Promise<void>;
            fileExists: (filePath: string) => Promise<boolean>;
            listFiles: (dirPath: string) => Promise<any[]>;
            watchFile: (filePath: string) => Promise<void>;
            unwatchFile: (filePath: string) => Promise<void>;
            connectMCP: (config: any) => Promise<void>;
            disconnectMCP: (serviceId: string) => Promise<void>;
            callMCP: (serviceId: string, method: string, params: any) => Promise<any>;
            getMCPStatus: (serviceId: string) => Promise<any>;
            listMCP: () => Promise<any[]>;
            startLocal: (serviceId: string, config: any) => Promise<void>;
            stopLocal: (serviceId: string) => Promise<void>;
            getLocalStatus: (serviceId: string) => Promise<any>;
            restartLocal: (serviceId: string) => Promise<void>;
            onWorkflowProgress: (callback: (data: any) => void) => void;
            onWorkflowCompleted: (callback: (data: any) => void) => void;
            onWorkflowError: (callback: (data: any) => void) => void;
            onFileChanged: (callback: (data: any) => void) => void;
            onServiceStatus: (callback: (data: any) => void) => void;
            removeAllListeners: (channel: string) => void;
        };
    }
}
export {};

import { ProjectConfig } from '../models/project';
export interface FileChangeCallback {
    (eventType: string, filename: string): void;
}
export declare class FileManager {
    private watchers;
    private projectsRoot;
    initialize(): Promise<void>;
    createProject(name: string): Promise<string>;
    loadProject(projectPath: string): Promise<ProjectConfig>;
    saveProject(config: ProjectConfig): Promise<void>;
    deleteProject(projectPath: string): Promise<void>;
    listProjects(): Promise<ProjectConfig[]>;
    watchProject(projectPath: string, callback: FileChangeCallback): void;
    unwatchProject(projectPath: string): void;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    listFiles(directoryPath: string): Promise<string[]>;
    private saveProjectConfig;
    cleanup(): Promise<void>;
}

export declare class FileUtils {
    static ensureDirectory(dirPath: string): Promise<void>;
    static copyFile(source: string, destination: string): Promise<void>;
    static moveFile(source: string, destination: string): Promise<void>;
    static deleteFile(filePath: string): Promise<void>;
    static deleteDirectory(dirPath: string): Promise<void>;
    static fileExists(filePath: string): Promise<boolean>;
    static getFileSize(filePath: string): Promise<number>;
    static getFileStats(filePath: string): Promise<{
        size: number;
        created: Date;
        modified: Date;
        isFile: boolean;
        isDirectory: boolean;
    }>;
    static formatFileSize(bytes: number): string;
    static getFileExtension(filePath: string): string;
    static getFileName(filePath: string): string;
    static getFileNameWithoutExtension(filePath: string): string;
    static getFileDirectory(filePath: string): string;
    static joinPaths(...paths: string[]): string;
    static normalizePath(filePath: string): string;
    static isAbsolutePath(filePath: string): boolean;
    static resolvePath(...paths: string[]): string;
}

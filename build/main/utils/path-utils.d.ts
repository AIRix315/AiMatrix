export declare class PathUtils {
    static getAppDataDir(): string;
    static getTempDir(): string;
    static getLogsDir(): string;
    static getConfigDir(): string;
    static getCacheDir(): string;
    static getProjectsDir(): string;
    static getResourcesDir(): string;
    static relativeToAppData(relativePath: string): string;
    static relativeToResources(relativePath: string): string;
    static ensureAppDataDirs(): void;
    static sanitizeFileName(fileName: string): string;
    static getFileIconPath(extension: string): string;
    static isImageFile(extension: string): boolean;
    static isVideoFile(extension: string): boolean;
    static isAudioFile(extension: string): boolean;
    static isTextFile(extension: string): boolean;
}

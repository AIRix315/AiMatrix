import { BrowserWindow } from 'electron';
export declare class WindowManager {
    private mainWindow;
    createMainWindow(): BrowserWindow;
    getMainWindow(): BrowserWindow | null;
    closeMainWindow(): void;
    minimizeMainWindow(): void;
    maximizeMainWindow(): void;
    isMainWindowMaximized(): boolean;
}

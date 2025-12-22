export interface LocalServiceConfig {
    type: string;
    name: string;
    command: string;
    args: string[];
    workingDirectory: string;
    autoStart: boolean;
    port?: number;
    env?: Record<string, string>;
}
export interface ServiceStatus {
    type: string;
    status: 'running' | 'stopped' | 'error' | 'unknown';
    message: string;
    timestamp?: Date;
    pid?: number;
    port?: number;
}

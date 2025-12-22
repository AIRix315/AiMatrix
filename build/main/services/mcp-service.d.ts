import { MCPConfig, MCPServiceConfig } from '../models/mcp';
export declare class MCPService {
    private connections;
    private services;
    initialize(): Promise<void>;
    connect(config: MCPConfig): Promise<void>;
    disconnect(): Promise<void>;
    call(method: string, params: any): Promise<any>;
    getStatus(): Promise<any>;
    listServices(): Promise<MCPServiceConfig[]>;
    addService(config: MCPServiceConfig): Promise<void>;
    removeService(serviceId: string): Promise<void>;
    private loadServices;
    private saveServices;
    private generateConnectionId;
    cleanup(): Promise<void>;
}

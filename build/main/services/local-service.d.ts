import { ServiceStatus } from '../models/service';
export declare class LocalServiceManager {
    private services;
    private processes;
    private status;
    initialize(): Promise<void>;
    startService(serviceType: string): Promise<void>;
    stopService(serviceType: string): Promise<void>;
    restartService(serviceType: string): Promise<void>;
    getServiceStatus(serviceType: string): ServiceStatus;
    getAllServicesStatus(): ServiceStatus[];
    stopAllServices(): Promise<void>;
    private loadServices;
    private updateStatus;
    cleanup(): Promise<void>;
}

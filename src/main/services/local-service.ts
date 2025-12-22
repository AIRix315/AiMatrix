import { spawn, ChildProcess } from 'child_process';
import { ServiceStatus, LocalServiceConfig } from '../models/service';

export class LocalServiceManager {
  private services: Map<string, LocalServiceConfig> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private status: Map<string, ServiceStatus> = new Map();

  public async initialize(): Promise<void> {
    try {
      // 加载本地服务配置
      await this.loadServices();
      console.log('本地服务管理器初始化完成');
    } catch (error) {
      console.error('本地服务管理器初始化失败:', error);
      throw error;
    }
  }

  public async startService(serviceType: string): Promise<void> {
    try {
      const service = this.services.get(serviceType);
      if (!service) {
        throw new Error(`未找到服务类型: ${serviceType}`);
      }

      if (this.processes.has(serviceType)) {
        console.log(`服务 ${serviceType} 已经在运行`);
        return;
      }

      const process = spawn(service.command, service.args, {
        cwd: service.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 设置进程事件处理
      process.on('error', (error) => {
        console.error(`服务 ${serviceType} 启动失败:`, error);
        this.updateStatus(serviceType, 'error', error.message);
      });

      process.on('exit', (code, signal) => {
        console.log(`服务 ${serviceType} 退出，代码: ${code}, 信号: ${signal}`);
        this.processes.delete(serviceType);
        this.updateStatus(serviceType, 'stopped', `退出代码: ${code}`);
      });

      // 处理输出
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          console.log(`[${serviceType}] ${data.toString().trim()}`);
        });
      }

      if (process.stderr) {
        process.stderr.on('data', (data) => {
          console.error(`[${serviceType}] ${data.toString().trim()}`);
        });
      }

      this.processes.set(serviceType, process);
      this.updateStatus(serviceType, 'running', '服务正在运行');

      console.log(`服务 ${serviceType} 启动成功`);
    } catch (error) {
      console.error(`启动服务 ${serviceType} 失败:`, error);
      throw error;
    }
  }

  public async stopService(serviceType: string): Promise<void> {
    try {
      const process = this.processes.get(serviceType);
      if (!process) {
        console.log(`服务 ${serviceType} 未在运行`);
        return;
      }

      // 尝试优雅关闭
      process.kill('SIGTERM');

      // 等待一段时间后强制关闭
      setTimeout(() => {
        if (this.processes.has(serviceType)) {
          process.kill('SIGKILL');
        }
      }, 5000);

      this.processes.delete(serviceType);
      this.updateStatus(serviceType, 'stopped', '服务已停止');

      console.log(`服务 ${serviceType} 停止成功`);
    } catch (error) {
      console.error(`停止服务 ${serviceType} 失败:`, error);
      throw error;
    }
  }

  public async restartService(serviceType: string): Promise<void> {
    try {
      await this.stopService(serviceType);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      await this.startService(serviceType);
      console.log(`服务 ${serviceType} 重启成功`);
    } catch (error) {
      console.error(`重启服务 ${serviceType} 失败:`, error);
      throw error;
    }
  }

  public getServiceStatus(serviceType: string): ServiceStatus {
    return this.status.get(serviceType) || {
      type: serviceType,
      status: 'unknown',
      message: '未知状态'
    };
  }

  public getAllServicesStatus(): ServiceStatus[] {
    return Array.from(this.status.values());
  }

  public async stopAllServices(): Promise<void> {
    try {
      const services = Array.from(this.processes.keys());
      for (const serviceType of services) {
        await this.stopService(serviceType);
      }
      console.log('所有本地服务已停止');
    } catch (error) {
      console.error('停止所有服务失败:', error);
      throw error;
    }
  }

  private async loadServices(): Promise<void> {
    try {
      // 这里应该从配置文件加载本地服务配置
      // 暂时添加一些示例服务
      const exampleServices: LocalServiceConfig[] = [
        {
          type: 'comfyui',
          name: 'ComfyUI',
          command: 'python',
          args: ['main.py'],
          workingDirectory: './comfyui',
          autoStart: false,
          port: 8188
        },
        {
          type: 'n8n',
          name: 'N8N',
          command: 'npx',
          args: ['n8n'],
          workingDirectory: './n8n',
          autoStart: false,
          port: 5678
        }
      ];

      for (const service of exampleServices) {
        this.services.set(service.type, service);
        this.status.set(service.type, {
          type: service.type,
          status: 'stopped',
          message: '服务已停止'
        });
      }
    } catch (error) {
      console.error('加载本地服务配置失败:', error);
      throw error;
    }
  }

  private updateStatus(serviceType: string, status: 'running' | 'stopped' | 'error', message: string): void {
    this.status.set(serviceType, {
      type: serviceType,
      status,
      message,
      timestamp: new Date()
    });
  }

  public async cleanup(): Promise<void> {
    await this.stopAllServices();
    console.log('本地服务管理器清理完成');
  }
}
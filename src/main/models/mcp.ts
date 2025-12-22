export interface MCPConfig {
  name: string;
  type: string;
  endpoint: string;
  credentials?: Record<string, string>;
  settings?: Record<string, any>;
}

export interface MCPServiceConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  endpoint: string;
  enabled: boolean;
  settings?: Record<string, any>;
}
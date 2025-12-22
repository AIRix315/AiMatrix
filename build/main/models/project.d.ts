export interface ProjectSettings {
    defaultWorkflow: string;
    outputFormat: string;
    quality: number;
}
export interface AssetConfig {
    id: string;
    name: string;
    type: 'text' | 'image' | 'video';
    path: string;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProjectConfig {
    name: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    settings: ProjectSettings;
    workflows: string[];
    assets: AssetConfig[];
}

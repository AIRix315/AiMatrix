export type StageStatus = 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'blocked';

export type AssetStatus = 'success' | 'failed' | 'missing';

export interface AssetVersion {
  assetId: string;
  status: AssetStatus;
  createdAt: string;
  isDefault: boolean;
}

export interface StageOutputItem {
  id: string;
  required: boolean;
  versions: AssetVersion[];
  status?: AssetStatus;
  lastError?: string;
  failedAt?: string;
}

export interface StageOutput {
  status: StageStatus;
  canProceedToNext: boolean;
  outputs: {
    [outputType: string]: StageOutputItem[];
  };
}

export interface MissingItem {
  stage: string;
  type: string;
  id: string;
  reason: string;
  required: boolean;
}

export interface GateCondition {
  requiredOutputs: string[];
  actualOutputs: string[];
  canProceed: boolean;
}

export interface WorkflowProgress {
  workflowId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  stages: {
    [stageId: string]: StageOutput;
  };
  missingItems: MissingItem[];
  gateConditions: {
    [stageId: string]: GateCondition;
  };
}

export interface WorkflowContext {
  workflowId: string;
  projectId: string;
  novelPath: string;
  artStyle: string;
  currentStage?: string;
  progress: WorkflowProgress;
}

export interface SceneSummary {
  sceneId: string;
  summary: string;
}

export interface StageExecutionResult {
  success: boolean;
  outputs: {
    [key: string]: unknown;
  };
  errors?: string[];
}

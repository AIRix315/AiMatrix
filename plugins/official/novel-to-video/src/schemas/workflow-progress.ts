import { z } from 'zod';

export const AssetVersionSchema = z.object({
  assetId: z.string(),
  status: z.enum(['success', 'failed', 'missing']),
  createdAt: z.string(),
  isDefault: z.boolean()
});

export const StageOutputItemSchema = z.object({
  id: z.string(),
  required: z.boolean(),
  versions: z.array(AssetVersionSchema),
  status: z.enum(['success', 'failed', 'missing']).optional(),
  lastError: z.string().optional(),
  failedAt: z.string().optional()
});

export const StageOutputSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'partial', 'failed', 'blocked']),
  canProceedToNext: z.boolean(),
  outputs: z.record(z.array(StageOutputItemSchema))
});

export const MissingItemSchema = z.object({
  stage: z.string(),
  type: z.string(),
  id: z.string(),
  reason: z.string(),
  required: z.boolean()
});

export const GateConditionSchema = z.object({
  requiredOutputs: z.array(z.string()),
  actualOutputs: z.array(z.string()),
  canProceed: z.boolean()
});

export const WorkflowProgressSchema = z.object({
  workflowId: z.string(),
  projectId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stages: z.record(StageOutputSchema),
  missingItems: z.array(MissingItemSchema),
  gateConditions: z.record(GateConditionSchema)
});

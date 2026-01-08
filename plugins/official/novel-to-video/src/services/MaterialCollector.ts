import { promises as fs } from 'fs';
import * as path from 'path';
import { PluginContext, Logger } from '@matrix/sdk';
import type { WorkflowProgress, StageOutput, MissingItem } from '../types/workflow';

export class MaterialCollector {
  private logger: Logger;
  private projectBasePath: string;
  private collectedOutputs: Map<string, any> = new Map();

  constructor(context: PluginContext, projectBasePath: string) {
    this.logger = context.logger;
    this.projectBasePath = projectBasePath;
  }

  async collectStageOutput(stageId: string, outputs: { [key: string]: unknown }): Promise<void> {
    try {
      await this.logger.info(`收集阶段 ${stageId} 的产出`, 'MaterialCollector', {
        stageId,
        outputKeys: Object.keys(outputs)
      });

      this.collectedOutputs.set(stageId, outputs);

      await this.logger.info(`阶段 ${stageId} 产出收集完成`, 'MaterialCollector', {
        stageId
      });
    } catch (error) {
      await this.logger.error(`收集阶段 ${stageId} 产出失败`, 'MaterialCollector', {
        stageId,
        error
      });
      throw error;
    }
  }

  async generateProgressFile(workflowId: string): Promise<string> {
    try {
      await this.logger.info('生成工作流进度文件', 'MaterialCollector', {
        workflowId
      });

      const progress: WorkflowProgress = {
        workflowId,
        projectId: path.basename(this.projectBasePath),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stages: {},
        missingItems: [],
        gateConditions: {}
      };

      for (const [stageId, outputs] of this.collectedOutputs.entries()) {
        const stageOutput: StageOutput = {
          status: 'completed',
          canProceedToNext: true,
          outputs: this.transformOutputs(outputs)
        };

        progress.stages[stageId] = stageOutput;
      }

      progress.missingItems = this.getMissingItems();
      progress.gateConditions = this.calculateGateConditions(progress);

      const filePath = path.join(
        this.projectBasePath,
        `workflow-progress-${workflowId}.json`
      );

      await fs.writeFile(filePath, JSON.stringify(progress, null, 2), 'utf-8');

      await this.logger.info('工作流进度文件生成成功', 'MaterialCollector', {
        filePath
      });

      return filePath;
    } catch (error) {
      await this.logger.error('生成工作流进度文件失败', 'MaterialCollector', {
        workflowId,
        error
      });
      throw error;
    }
  }

  getMissingItems(): MissingItem[] {
    const missingItems: MissingItem[] = [];

    for (const [stageId, outputs] of this.collectedOutputs.entries()) {
      const requiredOutputs = this.getRequiredOutputKeys(stageId);

      for (const required of requiredOutputs) {
        if (!outputs[required] || (Array.isArray(outputs[required]) && outputs[required].length === 0)) {
          missingItems.push({
            stage: stageId,
            type: required,
            id: `${stageId}-${required}`,
            reason: 'missing',
            required: true
          });
        }
      }
    }

    return missingItems;
  }

  private transformOutputs(outputs: { [key: string]: unknown }): { [key: string]: any[] } {
    const transformed: { [key: string]: any[] } = {};

    for (const [key, value] of Object.entries(outputs)) {
      if (Array.isArray(value)) {
        transformed[key] = value.map((item, index) => ({
          id: `${key}-${index}`,
          required: true,
          versions: [
            {
              assetId: item.id || `asset-${Date.now()}-${index}`,
              status: 'success' as const,
              createdAt: new Date().toISOString(),
              isDefault: true
            }
          ]
        }));
      }
    }

    return transformed;
  }

  private calculateGateConditions(progress: WorkflowProgress): { [stageId: string]: any } {
    const gateConditions: { [stageId: string]: any } = {};

    for (const stageId of Object.keys(progress.stages)) {
      const requiredOutputs = this.getRequiredOutputKeys(stageId);
      const actualOutputs = Object.keys(progress.stages[stageId].outputs);

      gateConditions[stageId] = {
        requiredOutputs,
        actualOutputs,
        canProceed: requiredOutputs.every(req => actualOutputs.includes(req))
      };
    }

    return gateConditions;
  }

  private getRequiredOutputKeys(stageId: string): string[] {
    const requirements: Record<string, string[]> = {
      'stage1': ['chapters', 'scenes', 'characters'],
      'stage2': ['sceneImages', 'characterImages'],
      'stage2.5': ['sceneSummaries'],
      'stage3': ['storyboards'],
      'stage4': ['storyboardImages']
    };

    return requirements[stageId] || [];
  }
}

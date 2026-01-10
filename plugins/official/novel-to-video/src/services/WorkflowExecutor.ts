import { PluginContext, Logger } from '@matrix/sdk';
import { ChapterService } from './ChapterService';
import { StoryboardService } from './StoryboardService';
import { ResourceService } from './ResourceService';
import { MaterialCollector } from './MaterialCollector';
import type { WorkflowContext, StageExecutionResult, SceneSummary } from '../types/workflow';

export class WorkflowExecutor {
  private chapterService: ChapterService;
  private storyboardService: StoryboardService;
  private resourceService: ResourceService;
  private materialCollector: MaterialCollector;
  private logger: Logger;

  constructor(
    chapterService: ChapterService,
    storyboardService: StoryboardService,
    resourceService: ResourceService,
    materialCollector: MaterialCollector,
    context: PluginContext
  ) {
    this.chapterService = chapterService;
    this.storyboardService = storyboardService;
    this.resourceService = resourceService;
    this.materialCollector = materialCollector;
    this.logger = context.logger;
  }

  async executeFullWorkflow(params: {
    novelPath: string;
    artStyle: string;
    projectId: string;
  }): Promise<WorkflowContext> {
    try {
      const context: WorkflowContext = {
        workflowId: `workflow-${Date.now()}`,
        projectId: params.projectId,
        novelPath: params.novelPath,
        artStyle: params.artStyle,
        progress: {
          workflowId: `workflow-${Date.now()}`,
          projectId: params.projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stages: {},
          missingItems: [],
          gateConditions: {}
        }
      };

      await this.logger.info('开始执行完整工作流', 'WorkflowExecutor', {
        workflowId: context.workflowId,
        projectId: params.projectId
      });

      await this.executeStage('stage1', context);

      if (!this.checkGateCondition('stage1', context)) {
        throw new Error('Stage 1阀门检查失败');
      }

      await this.executeStage('stage2', context);

      if (!this.checkGateCondition('stage2', context)) {
        throw new Error('Stage 2阀门检查失败');
      }

      await this.executeStage('stage2.5', context);

      await this.executeStage('stage3', context);

      if (!this.checkGateCondition('stage3', context)) {
        throw new Error('Stage 3阀门检查失败');
      }

      await this.executeStage('stage4', context);

      await this.materialCollector.generateProgressFile(context.workflowId);

      await this.logger.info('工作流执行完成', 'WorkflowExecutor', {
        workflowId: context.workflowId
      });

      return context;
    } catch (error) {
      await this.logger.error('工作流执行失败', 'WorkflowExecutor', { error });
      throw error;
    }
  }

  async executeStage(stageId: string, context: WorkflowContext): Promise<StageExecutionResult> {
    try {
      context.currentStage = stageId;

      await this.logger.info(`开始执行阶段: ${stageId}`, 'WorkflowExecutor', {
        workflowId: context.workflowId
      });

      let result: StageExecutionResult;

      switch (stageId) {
        case 'stage1':
          result = await this.executeSceneExtraction(context);
          break;
        case 'stage2':
          result = await this.executeT2I(context);
          break;
        case 'stage2.5':
          result = await this.executeSceneSummary(context);
          break;
        case 'stage3':
          result = await this.executeStoryboardScript(context);
          break;
        case 'stage4':
          result = await this.executeT2V(context);
          break;
        default:
          throw new Error(`未知阶段: ${stageId}`);
      }

      await this.materialCollector.collectStageOutput(stageId, result.outputs);

      // 更新context.progress.stages
      context.progress.stages[stageId] = {
        status: result.success ? 'completed' : 'failed',
        canProceedToNext: result.success,
        outputs: this.transformOutputsForStage(result.outputs)
      };
      context.progress.updatedAt = new Date().toISOString();

      await this.logger.info(`阶段 ${stageId} 执行完成`, 'WorkflowExecutor', {
        success: result.success
      });

      return result;
    } catch (error) {
      await this.logger.error(`阶段 ${stageId} 执行失败`, 'WorkflowExecutor', { error });
      throw error;
    }
  }

  private async executeSceneExtraction(context: WorkflowContext): Promise<StageExecutionResult> {
    const chapters = await this.chapterService.splitChapters(
      context.projectId,
      context.novelPath
    );

    const scenesAndCharacters = await this.chapterService.extractScenesAndCharacters(
      context.projectId,
      chapters[0].filePath
    );

    return {
      success: true,
      outputs: {
        chapters,
        scenes: scenesAndCharacters.scenes,
        characters: scenesAndCharacters.characters
      }
    };
  }

  private async executeT2I(context: WorkflowContext): Promise<StageExecutionResult> {
    const stage1Output = context.progress.stages['stage1'];
    if (!stage1Output) {
      throw new Error('Stage 1输出不存在');
    }

    const scenes = stage1Output.outputs.scenes;
    const characters = stage1Output.outputs.characters;

    const [sceneImages, characterImages] = await Promise.all([
      this.resourceService.generateSceneImages(
        context.projectId,
        scenes.map((s: any) => s.filePath)
      ),
      this.resourceService.generateCharacterImages(
        context.projectId,
        characters.map((c: any) => c.filePath)
      )
    ]);

    return {
      success: true,
      outputs: {
        sceneImages,
        characterImages
      }
    };
  }

  private async executeSceneSummary(context: WorkflowContext): Promise<StageExecutionResult> {
    const stage1Output = context.progress.stages['stage1'];
    if (!stage1Output) {
      throw new Error('Stage 1输出不存在');
    }

    const scenes = stage1Output.outputs.scenes;

    const sceneSummaries: SceneSummary[] = await this.storyboardService.generateSceneSummaries(
      context.projectId,
      scenes
    );

    return {
      success: true,
      outputs: {
        sceneSummaries
      }
    };
  }

  private async executeStoryboardScript(context: WorkflowContext): Promise<StageExecutionResult> {
    const stage1Output = context.progress.stages['stage1'];
    const stage2_5Output = context.progress.stages['stage2.5'];

    if (!stage1Output || !stage2_5Output) {
      throw new Error('前置阶段输出不存在');
    }

    const scenes = stage1Output.outputs.scenes;
    const sceneSummaries = stage2_5Output.outputs.sceneSummaries;

    const storyboards = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const previousSummary = i > 0 ? sceneSummaries[i - 1].summary : undefined;
      const nextSummary = i < scenes.length - 1 ? sceneSummaries[i + 1].summary : undefined;

      const storyboard = await this.storyboardService.generateContextualScript(
        context.projectId,
        scene.filePath,
        context.artStyle,
        previousSummary,
        nextSummary
      );

      storyboards.push(storyboard);
    }

    return {
      success: true,
      outputs: {
        storyboards
      }
    };
  }

  private async executeT2V(context: WorkflowContext): Promise<StageExecutionResult> {
    const stage3Output = context.progress.stages['stage3'];
    if (!stage3Output) {
      throw new Error('Stage 3输出不存在');
    }

    const storyboards = stage3Output.outputs.storyboards;

    const imageStoryboards = storyboards
      .map((s: any) => ({
        prompt: s.customFields?.imagePrompts?.[0] || '',
        referenceImages: []
      }))
      .filter((s: any) => s.prompt);

    const storyboardImages = await this.resourceService.generateI2IImages(
      imageStoryboards,
      '9x16'
    );

    await this.logger.info('分镜图片生成完成', 'WorkflowExecutor', {
      count: storyboardImages.length
    });

    const storyboardAssetPaths = storyboards
      .map((s: any) => s.filePath)
      .filter((path: string) => path);

    const videoSegments = await this.resourceService.generateStoryboardVideos(
      context.projectId,
      storyboardAssetPaths
    );

    await this.logger.info('分镜视频生成完成', 'WorkflowExecutor', {
      count: videoSegments.length
    });

    return {
      success: true,
      outputs: {
        storyboardImages,
        videoSegments
      }
    };
  }

  checkGateCondition(stageId: string, context: WorkflowContext): boolean {
    const stageOutput = context.progress.stages[stageId];

    if (!stageOutput) {
      return false;
    }

    const requiredOutputs = this.getRequiredOutputs(stageId);
    const actualOutputs = Object.keys(stageOutput.outputs);

    for (const required of requiredOutputs) {
      if (!actualOutputs.includes(required)) {
        return false;
      }
    }

    return true;
  }

  private getRequiredOutputs(stageId: string): string[] {
    const requirements: Record<string, string[]> = {
      'stage1': ['chapters', 'scenes', 'characters'],
      'stage2': ['sceneImages', 'characterImages'],
      'stage2.5': ['sceneSummaries'],
      'stage3': ['storyboards'],
      'stage4': ['storyboardImages', 'videoSegments'] // V0.4.0: 添加 videoSegments
    };

    return requirements[stageId] || [];
  }

  private transformOutputsForStage(outputs: { [key: string]: unknown }): { [key: string]: any[] } {
    const transformed: { [key: string]: any[] } = {};

    for (const [key, value] of Object.entries(outputs)) {
      if (Array.isArray(value)) {
        transformed[key] = value.map((item, index) => ({
          id: item.id || `${key}-${index}`,
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
      } else {
        transformed[key] = [];
      }
    }

    return transformed;
  }
}

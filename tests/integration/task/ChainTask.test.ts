/**
 * ChainTask集成测试
 *
 * Phase 7 H02: 验证任务模板、链式任务和断点续传功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskScheduler, TaskStatus, TaskType } from '../../../src/main/services/TaskScheduler';
import {
  taskTemplateRegistry,
  ImageGenerationTemplate,
  TTSTemplate,
  ImageGenerationInput,
  TTSInput
} from '../../../src/main/services/task/TaskTemplate';
import {
  ChainTaskExecutor,
  ChainTaskDefinition,
  ChainTaskNode
} from '../../../src/main/services/task/ChainTask';
import { TaskPriority } from '../../../src/main/services/task/ConcurrencyManager';

describe('ChainTask集成测试', () => {
  let scheduler: TaskScheduler;
  let chainExecutor: ChainTaskExecutor;

  beforeEach(async () => {
    scheduler = new TaskScheduler();
    await scheduler.initialize();
    chainExecutor = new ChainTaskExecutor(scheduler);
  });

  describe('任务模板', () => {
    it('应该成功注册和获取模板', () => {
      const template = taskTemplateRegistry.getTemplate('image-generation');
      expect(template).not.toBeNull();
      expect(template?.name).toBe('图片生成');
    });

    it('应该验证图片生成输入', async () => {
      const template = new ImageGenerationTemplate();

      // 有效输入
      const validInput: ImageGenerationInput = {
        prompt: '一个美丽的风景',
        outputPath: '/path/to/output.png'
      };

      const validResult = await template.validateInput(validInput);
      expect(validResult.valid).toBe(true);

      // 无效输入 - 缺少prompt
      const invalidInput1: ImageGenerationInput = {
        prompt: '',
        outputPath: '/path/to/output.png'
      };

      const invalidResult1 = await template.validateInput(invalidInput1);
      expect(invalidResult1.valid).toBe(false);
      expect(invalidResult1.errors?.some(e => e.includes('prompt'))).toBe(true);

      // 无效输入 - 缺少outputPath
      const invalidInput2: ImageGenerationInput = {
        prompt: '测试',
        outputPath: ''
      };

      const invalidResult2 = await template.validateInput(invalidInput2);
      expect(invalidResult2.valid).toBe(false);
      expect(invalidResult2.errors?.some(e => e.includes('outputPath'))).toBe(true);
    });

    it('应该构建正确的TaskConfig', () => {
      const template = new ImageGenerationTemplate();
      const input: ImageGenerationInput = {
        prompt: '一个美丽的风景',
        width: 1024,
        height: 768,
        outputPath: '/path/to/output.png'
      };

      const taskConfig = template.buildTaskConfig(input);

      expect(taskConfig.type).toBe(TaskType.API_CALL);
      expect(taskConfig.apiName).toBe('image-generation');
      expect(taskConfig.apiParams?.prompt).toBe(input.prompt);
      expect(taskConfig.apiParams?.width).toBe(1024);
      expect(taskConfig.apiParams?.height).toBe(768);
      expect(taskConfig.metadata?.template).toBe('image-generation');
    });

    it('应该验证TTS输入', async () => {
      const template = new TTSTemplate();

      // 有效输入
      const validInput: TTSInput = {
        text: '这是一段测试文本',
        voiceId: 'voice-001',
        outputPath: '/path/to/output.mp3'
      };

      const validResult = await template.validateInput(validInput);
      expect(validResult.valid).toBe(true);

      // 无效输入 - emotion维度错误
      const invalidInput: TTSInput = {
        text: '测试',
        voiceId: 'voice-001',
        outputPath: '/path/to/output.mp3',
        emotion: [0.5, 0.1] // 应该是8维
      };

      const invalidResult = await template.validateInput(invalidInput);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors?.some(e => e.includes('emotion'))).toBe(true);
    });
  });

  describe('链式任务', () => {
    it('应该执行简单的链式任务', async () => {
      // 创建一个简单的2节点链
      const chainDef: ChainTaskDefinition = {
        id: 'test-chain-1',
        name: '测试链1',
        nodes: [
          {
            id: 'node-1',
            name: '节点1',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务1',
              customHandler: async (input) => {
                return { value: 'result-1' };
              }
            }
          },
          {
            id: 'node-2',
            name: '节点2',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务2',
              customHandler: async (input) => {
                return { value: 'result-2' };
              }
            },
            dependencies: ['node-1'],
            inputTransform: (results) => {
              // 使用node-1的结果
              return { previous: results.get('node-1') };
            }
          }
        ]
      };

      const executionId = await chainExecutor.executeChain(chainDef);
      expect(executionId).toBeDefined();

      // 等待链完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      const execution = chainExecutor.getExecution(executionId);
      expect(execution).not.toBeNull();
      expect(execution?.status).toBe('completed');
      expect(execution?.results.size).toBe(2);
      expect(execution?.results.get('node-1')).toEqual({ value: 'result-1' });
      expect(execution?.results.get('node-2')).toEqual({ value: 'result-2' });
    });

    it('应该支持条件分支', async () => {
      let conditionChecked = false;

      const chainDef: ChainTaskDefinition = {
        id: 'test-chain-2',
        name: '测试链2 - 条件分支',
        nodes: [
          {
            id: 'node-1',
            name: '节点1',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务1',
              customHandler: async () => {
                return { shouldProceed: true };
              }
            }
          },
          {
            id: 'node-2',
            name: '节点2（条件执行）',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务2',
              customHandler: async () => {
                return { value: 'executed' };
              }
            },
            dependencies: ['node-1'],
            condition: (results) => {
              conditionChecked = true;
              const node1Result = results.get('node-1') as { shouldProceed: boolean };
              return node1Result.shouldProceed;
            }
          }
        ]
      };

      const executionId = await chainExecutor.executeChain(chainDef);

      // 等待链完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      const execution = chainExecutor.getExecution(executionId);
      expect(execution?.status).toBe('completed');
      expect(conditionChecked).toBe(true);
      expect(execution?.results.has('node-2')).toBe(true);
    });

    it('应该检测循环依赖', async () => {
      const chainDef: ChainTaskDefinition = {
        id: 'test-chain-3',
        name: '测试链3 - 循环依赖',
        nodes: [
          {
            id: 'node-1',
            name: '节点1',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务1',
              customHandler: async () => ({ value: '1' })
            },
            dependencies: ['node-2'] // 依赖node-2
          },
          {
            id: 'node-2',
            name: '节点2',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务2',
              customHandler: async () => ({ value: '2' })
            },
            dependencies: ['node-1'] // 依赖node-1，形成循环
          }
        ]
      };

      const executionId = await chainExecutor.executeChain(chainDef);

      // 等待链执行
      await new Promise(resolve => setTimeout(resolve, 2000));

      const execution = chainExecutor.getExecution(executionId);
      expect(execution?.status).toBe('failed');
    });

    it('应该调用节点完成回调', async () => {
      let node1Completed = false;
      let node2Completed = false;

      const chainDef: ChainTaskDefinition = {
        id: 'test-chain-4',
        name: '测试链4 - 回调',
        nodes: [
          {
            id: 'node-1',
            name: '节点1',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务1',
              customHandler: async () => ({ value: '1' })
            },
            onComplete: async (result, results) => {
              node1Completed = true;
            }
          },
          {
            id: 'node-2',
            name: '节点2',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务2',
              customHandler: async () => ({ value: '2' })
            },
            dependencies: ['node-1'],
            onComplete: async (result, results) => {
              node2Completed = true;
            }
          }
        ]
      };

      await chainExecutor.executeChain(chainDef);

      // 等待链完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(node1Completed).toBe(true);
      expect(node2Completed).toBe(true);
    });
  });

  describe('任务模板与链式任务集成', () => {
    it('应该使用模板创建链式任务', async () => {
      const imageTemplate = taskTemplateRegistry.getTemplate<ImageGenerationInput>('image-generation')!;
      const ttsTemplate = taskTemplateRegistry.getTemplate<TTSInput>('tts')!;

      const chainDef: ChainTaskDefinition = {
        id: 'test-chain-5',
        name: '测试链5 - 模板集成',
        description: '先生成图片，再生成配音',
        nodes: [
          {
            id: 'generate-image',
            name: '生成图片',
            taskConfig: imageTemplate.buildTaskConfig({
              prompt: '一个美丽的风景',
              outputPath: '/test/image.png'
            })
          },
          {
            id: 'generate-voice',
            name: '生成配音',
            taskConfig: ttsTemplate.buildTaskConfig({
              text: '这是图片的描述',
              voiceId: 'voice-001',
              outputPath: '/test/voice.mp3'
            }),
            dependencies: ['generate-image']
          }
        ]
      };

      const executionId = await chainExecutor.executeChain(chainDef);
      expect(executionId).toBeDefined();

      // 验证执行状态
      const execution = chainExecutor.getExecution(executionId);
      expect(execution).not.toBeNull();
      expect(execution?.chainId).toBe('test-chain-5');
    });
  });

  describe('错误处理', () => {
    it('应该处理节点执行失败', async () => {
      let errorHandled = false;

      const chainDef: ChainTaskDefinition = {
        id: 'test-chain-6',
        name: '测试链6 - 错误处理',
        nodes: [
          {
            id: 'node-1',
            name: '节点1（会失败）',
            taskConfig: {
              type: TaskType.CUSTOM,
              name: '测试任务1',
              customHandler: async () => {
                throw new Error('模拟失败');
              }
            },
            onError: async (error, results) => {
              errorHandled = true;
            }
          }
        ]
      };

      const executionId = await chainExecutor.executeChain(chainDef);

      // 等待链执行
      await new Promise(resolve => setTimeout(resolve, 2000));

      const execution = chainExecutor.getExecution(executionId);
      expect(execution?.status).toBe('failed');
      expect(errorHandled).toBe(true);

      const node1Status = execution?.nodeStatus.get('node-1');
      expect(node1Status?.status).toBe(TaskStatus.FAILED);
      expect(node1Status?.error).toBeDefined();
    });
  });
});

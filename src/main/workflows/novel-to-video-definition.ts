/**
 * 小说转视频工作流定义（仅作参考/文档用途）
 *
 * ⚠️ 重要说明：
 * "小说转视频"是系统插件（WorkflowExecutor），不是普通的 Workflow 模板
 *
 * - 实际实现位于：plugins/official/novel-to-video/
 * - 通过 PluginManager 加载和管理
 * - 不应该注册到 WorkflowRegistry
 * - 快捷方式类型为 PLUGIN，跳转到插件页面
 *
 * 此文件保留作为工作流步骤的参考定义，不会被直接使用
 *
 * 功能：将小说文本转换为短视频作品
 */

import { WorkflowDefinition } from '@/shared/types'

/**
 * 小说转视频工作流步骤定义（参考）
 * @deprecated 实际使用插件版本（plugins/official/novel-to-video/）
 */
export const novelToVideoWorkflow: WorkflowDefinition = {
  id: 'novel-to-video-v1',
  name: '小说转视频',
  type: 'novel-to-video',
  description: '将小说文本转换为短视频作品，支持自动章节拆分、场景角色提取、分镜生成、配音生成',
  version: '1.0.0',
  icon: '📖',

  steps: [
    {
      id: 'split-chapters',
      name: '剧本分析',
      description: '上传小说文件，自动拆分为章节',
      status: 'pending',
      componentType: 'ChapterSplitPanel',
      supportsViewSwitch: false
    },
    {
      id: 'extract-scenes',
      name: '场景角色',
      description: '使用AI从章节中提取场景和角色信息',
      status: 'pending',
      componentType: 'SceneCharacterPanel',
      supportsViewSwitch: false
    },
    {
      id: 'generate-storyboard',
      name: '分镜生成',
      description: '为场景生成分镜脚本和图片/视频资源',
      status: 'pending',
      componentType: 'StoryboardPanel',
      supportsViewSwitch: true,
      subSteps: [
        {
          id: 'generate-storyboard.local',
          name: '分镜生成',
          description: '本地生成分镜脚本和资源',
          componentType: 'StoryboardPanel',
          status: 'pending',
          config: {
            mode: 'local'
          }
        },
        {
          id: 'generate-storyboard.remote',
          name: '远端控制',
          description: '通过远端API控制分镜生成',
          componentType: 'RemoteControlPanel',
          status: 'pending',
          config: {
            mode: 'remote'
          }
        }
      ]
    },
    {
      id: 'generate-voiceover',
      name: '配音合成',
      description: '为分镜生成AI配音音频',
      status: 'pending',
      componentType: 'VoiceoverPanel',
      supportsViewSwitch: false
    },
    {
      id: 'export',
      name: '导出',
      description: '合成并导出最终视频文件',
      status: 'pending',
      componentType: 'ExportPanel',
      supportsViewSwitch: false
    }
  ],

  defaultState: {
    chapters: [],
    scenes: [],
    characters: [],
    storyboards: [],
    voiceovers: [],
    exportPath: ''
  },

  metadata: {
    author: 'Matrix Studio',
    category: 'AI创作',
    tags: ['小说', '视频', 'AI', '自动化'],
    estimatedTime: '根据章节数量和场景复杂度，约10-60分钟'
  }
}

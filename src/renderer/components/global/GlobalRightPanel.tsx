/**
 * GlobalRightPanel - 全局右侧边栏（推挤式布局版本）
 * 3个主TAB：属性/工具/队列
 * 属性/工具TAB有下部生成模式/参数TAB和生成按钮
 * 队列TAB占据全部高度
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../common';
import { useSelection } from '../../contexts/SelectionContext';
import { useTask } from '../../contexts/TaskContext';
import {
  PropertiesTab,
  ToolsTab,
  QueueTab,
  GenerationModeTab,
  GenerationMode,
  ParametersTab,
  PluginConfigTab,
} from './tabs';
import './GlobalRightPanel.css';

type MainTab = 'properties' | 'tools' | 'queue';
type LowerTab = 'generation-mode' | 'parameters' | 'plugin-config';

interface GenerationSettings {
  model: string;
  steps: number;
  cfg: number;
  seed: number;
}

interface ProviderParams {
  aspectRatio?: string;
  workflow?: string;
  [key: string]: unknown;
}

interface LinkedAsset {
  id: string;
  name: string;
  type: 'style' | 'character' | 'prop' | 'other';
}

interface GlobalRightPanelProps {
  // 从TaskContext获取任务数据
}

export const GlobalRightPanel: React.FC<GlobalRightPanelProps> = () => {
  // 从Context获取选中项数据
  const { selectedItem, selectedCount } = useSelection();

  // 从TaskContext获取任务数据和操作函数
  const { tasks, onCancelTask, onRetryTask, onClearCompleted } = useTask();

  const linkedAssets: LinkedAsset[] = [];
  const isGenerating = tasks.some((t) => t.status === 'running');
  // TAB状态（使用localStorage持久化）
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    const saved = localStorage.getItem('global-panel-main-tab');
    return (saved as MainTab) || 'properties';
  });

  const [lowerTab, setLowerTab] = useState<LowerTab>(() => {
    const saved = localStorage.getItem('global-panel-lower-tab');
    return (saved as LowerTab) || 'generation-mode';
  });

  // 生成模式
  const [generationMode, setGenerationMode] = useState<GenerationMode>('current');

  // Prompt和设置
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'Sora v2 (Cloud)',
    steps: 30,
    cfg: 7.0,
    seed: -1,
  });

  const [providerParams, setProviderParams] = useState<ProviderParams>({
    aspectRatio: '16:9',
  });

  // 持久化TAB选择
  useEffect(() => {
    localStorage.setItem('global-panel-main-tab', mainTab);
  }, [mainTab]);

  useEffect(() => {
    localStorage.setItem('global-panel-lower-tab', lowerTab);
  }, [lowerTab]);

  // 同步selectedItem的prompt
  useEffect(() => {
    if (selectedItem?.prompt !== undefined) {
      setPrompt(selectedItem.prompt);
    }
  }, [selectedItem?.id, selectedItem?.prompt]);

  // 生成按钮处理
  const handleGenerate = async () => {
    try {
      // 调用真实的生成逻辑（通过IPC）
      await window.electronAPI.executeWorkflow({
        mode: generationMode,
        prompt,
        settings,
        providerParams,
        selectedItem,
      } as any);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('生成失败:', error);
    }
  };

  return (
    <div className="global-right-panel">
            {/* 主TAB切换器 */}
            <div className="main-tabs">
              <button
                className={`tab-button ${mainTab === 'properties' ? 'active' : ''}`}
                onClick={() => setMainTab('properties')}
              >
                属性
              </button>
              <button
                className={`tab-button ${mainTab === 'tools' ? 'active' : ''}`}
                onClick={() => setMainTab('tools')}
              >
                工具
              </button>
              <button
                className={`tab-button ${mainTab === 'queue' ? 'active' : ''}`}
                onClick={() => setMainTab('queue')}
              >
                队列
                {tasks.filter((t) => t.status === 'running').length > 0 && (
                  <span className="tab-badge">
                    {tasks.filter((t) => t.status === 'running').length}
                  </span>
                )}
              </button>
            </div>

            {/* 队列TAB：占据全部高度 */}
            {mainTab === 'queue' && (
              <div className="full-height-content">
                <QueueTab />
              </div>
            )}

            {/* 属性/工具TAB：有上下分区和生成按钮 */}
            {mainTab !== 'queue' && (
              <>
                {/* 上部内容区 */}
                <div className="upper-content">
                  {mainTab === 'properties' && (
                    <PropertiesTab selectedItem={selectedItem || null} selectedCount={selectedCount} />
                  )}
                  {mainTab === 'tools' && (
                    <ToolsTab
                      linkedAssets={linkedAssets}
                      // eslint-disable-next-line no-console
                      onRemoveAsset={(assetId) => console.log('移除资产', assetId)}
                      // eslint-disable-next-line no-console
                      onAddAsset={() => console.log('添加资产')}
                    />
                  )}
                </div>

                {/* 下部TAB切换器 */}
                <div className="lower-tabs">
                  <button
                    className={`tab-button ${lowerTab === 'generation-mode' ? 'active' : ''}`}
                    onClick={() => setLowerTab('generation-mode')}
                  >
                    生成模式
                  </button>
                  <button
                    className={`tab-button ${lowerTab === 'parameters' ? 'active' : ''}`}
                    onClick={() => setLowerTab('parameters')}
                  >
                    参数
                  </button>
                  <button
                    className={`tab-button ${lowerTab === 'plugin-config' ? 'active' : ''}`}
                    onClick={() => setLowerTab('plugin-config')}
                  >
                    配置
                  </button>
                </div>

                {/* 下部内容区 */}
                <div className="lower-content">
                  {lowerTab === 'generation-mode' && (
                    <GenerationModeTab
                      mode={generationMode}
                      onModeChange={setGenerationMode}
                      selectedItem={selectedItem}
                    />
                  )}
                  {lowerTab === 'parameters' && (
                    <ParametersTab
                      prompt={prompt}
                      onPromptChange={setPrompt}
                      settings={settings}
                      onSettingsChange={setSettings}
                      providerParams={providerParams}
                      onProviderParamsChange={setProviderParams}
                      selectedItem={selectedItem || null}
                      selectedCount={selectedCount}
                    />
                  )}
                  {lowerTab === 'plugin-config' && (
                    <PluginConfigTab />
                  )}
                </div>

                {/* 底部固定按钮 */}
                <div className="panel-footer">
                  <Button
                    variant="primary"
                    size="lg"
                    className="generate-button"
                    onClick={handleGenerate}
                    disabled={(generationMode !== 'full-flow' && !selectedItem) || isGenerating}
                  >
                    <Sparkles className="button-icon" size={16} />
                    {isGenerating ? '生成中...' : '生成 (GENERATE)'}
                  </Button>
                </div>
              </>
            )}
    </div>
  );
};

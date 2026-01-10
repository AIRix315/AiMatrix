/**
 * RightSettingsPanel - 工作流右侧属性面板
 * H2.2增强：队列Tab、生成模式、Provider参数、可折叠区域
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  RotateCw,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button, Collapsible } from '../common';
import type { Task } from '../common/TaskQueueSheet';
import './RightSettingsPanel.css';

interface GenerationSettings {
  model: string;
  steps: number;
  cfg: number;
  seed: number;
}

interface LinkedAsset {
  id: string;
  name: string;
  type: 'style' | 'character' | 'prop';
}

type GenerationMode = 'current' | 'auto-complete' | 'full-flow';

interface RightSettingsPanelProps {
  selectedItem?: {
    id: string;
    name: string;
    type: string;
    prompt?: string;
    provider?: string;
  } | null;
  selectedCount?: number;
  onPromptChange?: (prompt: string) => void;
  onSettingsChange?: (settings: GenerationSettings) => void;
  onGenerate?: (mode: GenerationMode) => void;
  linkedAssets?: LinkedAsset[];
  onRemoveAsset?: (assetId: string) => void;
  isGenerating?: boolean;
  tasks?: Task[];
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
}

export const RightSettingsPanel: React.FC<RightSettingsPanelProps> = ({
  selectedItem,
  selectedCount = 0,
  onPromptChange,
  onSettingsChange,
  onGenerate,
  linkedAssets = [],
  onRemoveAsset,
  isGenerating = false,
  tasks = [],
  onCancelTask,
  onRetryTask,
  onPauseTask,
  onResumeTask
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'tools' | 'queue'>('properties');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('current');
  const [prompt, setPrompt] = useState(selectedItem?.prompt || '');
  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'Sora v2 (Cloud)',
    steps: 30,
    cfg: 7.0,
    seed: -1
  });

  const [providerParams, setProviderParams] = useState({
    aspectRatio: '16:9'
  });

  // 同步prompt到selectedItem
  useEffect(() => {
    if (selectedItem?.prompt !== undefined) {
      setPrompt(selectedItem.prompt);
    }
  }, [selectedItem?.id, selectedItem?.prompt]);

  // 处理Prompt变化
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (onPromptChange) {
      onPromptChange(value);
    }
  };

  // 处理设置变化
  const handleSettingChange = (key: keyof GenerationSettings, value: number | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  // 处理Provider参数变化
  const handleProviderParamChange = (key: string, value: string) => {
    setProviderParams({ ...providerParams, [key]: value });
  };

  // 处理生成按钮点击
  const handleGenerate = () => {
    if (onGenerate && !isGenerating) {
      onGenerate(generationMode);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}分${secs}秒`;
  };

  // 渲染任务状态图标
  const renderTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="task-icon task-icon-pending" />;
      case 'running':
        return <Play size={14} className="task-icon task-icon-running" />;
      case 'completed':
        return <CheckCircle2 size={14} className="task-icon task-icon-completed" />;
      case 'failed':
        return <AlertCircle size={14} className="task-icon task-icon-failed" />;
      case 'paused':
        return <Pause size={14} className="task-icon task-icon-paused" />;
      default:
        return null;
    }
  };

  return (
    <div className="right-settings-panel">
      {/* Tab切换 */}
      <div className="panel-tabs">
        <button
          className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          属性
        </button>
        <button
          className={`tab-button ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          工具
        </button>
        <button
          className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          队列
          {tasks.filter((t) => t.status === 'running').length > 0 && (
            <span className="tab-badge">{tasks.filter((t) => t.status === 'running').length}</span>
          )}
        </button>
      </div>

      {/* 内容区 */}
      <div className="panel-content">
        {activeTab === 'properties' ? (
          <>
            {/* 检查器区域 */}
            <Collapsible title="检查器" storageKey="panel-inspector" defaultExpanded={true}>
              {selectedItem ? (
                <div className="inspector-info">
                  <h3 className="selected-item-name">{selectedItem.name}</h3>
                  <span className="selected-item-type">{selectedItem.type}</span>
                  {selectedCount > 1 && (
                    <div className="batch-indicator">已选中 {selectedCount} 项（批量编辑）</div>
                  )}
                  {selectedItem.provider && (
                    <div className="inspector-field">
                      <span className="field-label">Provider:</span>
                      <span className="field-value">{selectedItem.provider}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="empty-text">未选中任何项目</p>
              )}
            </Collapsible>

            {/* Prompt编辑器 */}
            <Collapsible title="Prompt" storageKey="panel-prompt" defaultExpanded={true}>
              <textarea
                className="prompt-textarea"
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder={
                  selectedCount > 1
                    ? '批量编辑：修改将应用到所有选中项...'
                    : '输入生成提示词...'
                }
                rows={6}
                disabled={!selectedItem}
              />
              <div className="textarea-hint">
                <span className="char-count">{prompt.length} 字符</span>
              </div>
            </Collapsible>

            {/* 中间模块：生成模式 */}
            <Collapsible title="生成模式" storageKey="panel-generation-mode" defaultExpanded={true}>
              <div className="generation-mode">
                <button
                  className={`mode-btn ${generationMode === 'current' ? 'active' : ''}`}
                  onClick={() => setGenerationMode('current')}
                  disabled={!selectedItem}
                >
                  当前选择
                </button>
                <button
                  className={`mode-btn ${generationMode === 'auto-complete' ? 'active' : ''}`}
                  onClick={() => setGenerationMode('auto-complete')}
                  disabled={!selectedItem}
                >
                  自动补全
                </button>
                <button
                  className={`mode-btn ${generationMode === 'full-flow' ? 'active' : ''}`}
                  onClick={() => setGenerationMode('full-flow')}
                >
                  全流程
                </button>
              </div>
              <div className="mode-hint">
                {generationMode === 'current' && '生成单个选中项（独立任务）'}
                {generationMode === 'auto-complete' && '补齐缺失项（需项目+插件支持）'}
                {generationMode === 'full-flow' && '串联执行完整流程（需特定插件）'}
              </div>
            </Collapsible>

            {/* 生成设置 */}
            <Collapsible title="生成设置" storageKey="panel-settings" defaultExpanded={true}>
              {/* 模型选择 */}
              <div className="form-field">
                <label htmlFor="model-select">模型</label>
                <select
                  id="model-select"
                  className="form-select"
                  value={settings.model}
                  onChange={(e) => handleSettingChange('model', e.target.value)}
                  disabled={!selectedItem}
                >
                  <option value="Sora v2 (Cloud)">Sora v2 (Cloud)</option>
                  <option value="Runway Gen-3">Runway Gen-3</option>
                  <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                  <option value="ComfyUI Local">ComfyUI Local</option>
                </select>
              </div>

              {/* 步数 */}
              <div className="form-field">
                <label htmlFor="steps-input">步数 (Steps)</label>
                <input
                  id="steps-input"
                  type="number"
                  className="form-input"
                  value={settings.steps}
                  onChange={(e) => handleSettingChange('steps', parseInt(e.target.value, 10))}
                  min={1}
                  max={100}
                  disabled={!selectedItem}
                />
              </div>

              {/* CFG */}
              <div className="form-field">
                <label htmlFor="cfg-input">CFG Scale</label>
                <input
                  id="cfg-input"
                  type="number"
                  className="form-input"
                  value={settings.cfg}
                  onChange={(e) => handleSettingChange('cfg', parseFloat(e.target.value))}
                  min={1}
                  max={20}
                  step={0.5}
                  disabled={!selectedItem}
                />
              </div>

              {/* 种子 */}
              <div className="form-field">
                <label htmlFor="seed-input">种子 (Seed)</label>
                <input
                  id="seed-input"
                  type="number"
                  className="form-input"
                  value={settings.seed}
                  onChange={(e) => handleSettingChange('seed', parseInt(e.target.value, 10))}
                  disabled={!selectedItem}
                />
                <span className="field-hint">-1 表示随机</span>
              </div>
            </Collapsible>

            {/* 下分栏：Provider特定参数 */}
            <Collapsible
              title="Provider参数"
              storageKey="panel-provider-params"
              defaultExpanded={false}
            >
              {settings.model.includes('Sora') && (
                <div className="form-field">
                  <label>宽高比</label>
                  <div className="aspect-ratio-grid">
                    {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                      <button
                        key={ratio}
                        className={`aspect-btn ${providerParams.aspectRatio === ratio ? 'active' : ''}`}
                        onClick={() => handleProviderParamChange('aspectRatio', ratio)}
                        disabled={!selectedItem}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {settings.model.includes('ComfyUI') && (
                <div className="form-field">
                  <label htmlFor="workflow-select">工作流</label>
                  <select
                    id="workflow-select"
                    className="form-select"
                    disabled={!selectedItem}
                  >
                    <option value="default">默认工作流</option>
                    <option value="hires-fix">高清修复</option>
                    <option value="controlnet">ControlNet</option>
                  </select>
                </div>
              )}
            </Collapsible>

            {/* 关联资产 */}
            <Collapsible title="关联资产" storageKey="panel-linked-assets" defaultExpanded={false}>
              {linkedAssets.length > 0 ? (
                <div className="asset-tags">
                  {linkedAssets.map((asset) => (
                    <div key={asset.id} className="asset-tag">
                      <span className="tag-name">{asset.name}</span>
                      {onRemoveAsset && (
                        <button
                          className="tag-remove"
                          onClick={() => onRemoveAsset(asset.id)}
                          title="移除关联"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text">无关联资产</p>
              )}
            </Collapsible>
          </>
        ) : activeTab === 'tools' ? (
          // 工具Tab内容
          <div className="panel-section">
            <p className="empty-text">工具面板功能待实现</p>
          </div>
        ) : (
          // 队列Tab内容
          <div className="queue-content">
            {tasks.length === 0 ? (
              <p className="empty-text">暂无任务</p>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <div key={task.id} className={`task-item task-${task.status}`}>
                    <div className="task-header">
                      {renderTaskStatusIcon(task.status)}
                      <span className="task-name">{task.name}</span>
                    </div>
                    <div className="task-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{task.progress}%</span>
                    </div>
                    {task.estimatedTime && task.status === 'running' && (
                      <div className="task-time">预计剩余: {formatTime(task.estimatedTime)}</div>
                    )}
                    {task.error && (
                      <div className="task-error">{task.error}</div>
                    )}
                    <div className="task-actions">
                      {task.status === 'running' && onPauseTask && (
                        <button
                          className="task-action-btn"
                          onClick={() => onPauseTask(task.id)}
                          title="暂停"
                        >
                          <Pause size={14} />
                        </button>
                      )}
                      {task.status === 'paused' && onResumeTask && (
                        <button
                          className="task-action-btn"
                          onClick={() => onResumeTask(task.id)}
                          title="继续"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      {task.status === 'failed' && onRetryTask && (
                        <button
                          className="task-action-btn"
                          onClick={() => onRetryTask(task.id)}
                          title="重试"
                        >
                          <RotateCw size={14} />
                        </button>
                      )}
                      {(task.status === 'pending' || task.status === 'running') && onCancelTask && (
                        <button
                          className="task-action-btn task-action-cancel"
                          onClick={() => onCancelTask(task.id)}
                          title="取消"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部生成按钮 */}
      <div className="panel-footer">
        <Button
          variant="primary"
          size="lg"
          className="generate-button"
          onClick={handleGenerate}
          disabled={
            (generationMode !== 'full-flow' && !selectedItem) ||
            isGenerating
          }
        >
          <Sparkles className="button-icon" size={16} />
          {isGenerating ? '生成中...' : '生成 (GENERATE)'}
        </Button>
      </div>
    </div>
  );
};

/**
 * ParametersTab - 参数TAB
 * 包含Prompt编辑器和生成参数设置
 */

import React from 'react';
import { Collapsible } from '../../common';

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

interface ParametersTabProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  providerParams: ProviderParams;
  onProviderParamsChange: (params: ProviderParams) => void;
  selectedItem: any | null;
  selectedCount: number;
}

export const ParametersTab: React.FC<ParametersTabProps> = ({
  prompt,
  onPromptChange,
  settings,
  onSettingsChange,
  providerParams,
  onProviderParamsChange,
  selectedItem,
  selectedCount,
}) => {
  const handleSettingChange = (key: keyof GenerationSettings, value: number | string) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleProviderParamChange = (key: string, value: string) => {
    onProviderParamsChange({ ...providerParams, [key]: value });
  };

  return (
    <div className="parameters-tab">
      {/* Prompt编辑器 */}
      <Collapsible title="Prompt" storageKey="global-panel-prompt" defaultExpanded={true}>
        <textarea
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
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

      {/* 生成设置 */}
      <Collapsible title="生成设置" storageKey="global-panel-settings" defaultExpanded={true}>
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

      {/* Provider特定参数 */}
      <Collapsible
        title="Provider参数"
        storageKey="global-panel-provider"
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
              value={providerParams.workflow || 'default'}
              onChange={(e) => handleProviderParamChange('workflow', e.target.value)}
              disabled={!selectedItem}
            >
              <option value="default">默认工作流</option>
              <option value="hires-fix">高清修复</option>
              <option value="controlnet">ControlNet</option>
            </select>
          </div>
        )}
      </Collapsible>
    </div>
  );
};

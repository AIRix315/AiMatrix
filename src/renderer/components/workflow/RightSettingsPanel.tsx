/**
 * RightSettingsPanel - 工作流右侧属性面板
 * H02: 实现完整的属性编辑、Prompt编辑、生成设置功能
 */

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '../common';
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

interface RightSettingsPanelProps {
  selectedItem?: {
    id: string;
    name: string;
    type: string;
    prompt?: string;
  } | null;
  onPromptChange?: (prompt: string) => void;
  onSettingsChange?: (settings: GenerationSettings) => void;
  onGenerate?: () => void;
  linkedAssets?: LinkedAsset[];
  onRemoveAsset?: (assetId: string) => void;
  isGenerating?: boolean;
}

export const RightSettingsPanel: React.FC<RightSettingsPanelProps> = ({
  selectedItem,
  onPromptChange,
  onSettingsChange,
  onGenerate,
  linkedAssets = [],
  onRemoveAsset,
  isGenerating = false
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'tools'>('properties');
  const [prompt, setPrompt] = useState(selectedItem?.prompt || '');
  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'Sora v2 (Cloud)',
    steps: 30,
    cfg: 7.0,
    seed: -1
  });

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

  // 处理生成按钮点击
  const handleGenerate = () => {
    if (onGenerate && !isGenerating) {
      onGenerate();
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
      </div>

      {/* 内容区 */}
      <div className="panel-content">
        {activeTab === 'properties' ? (
          <>
            {/* 检查器区域 */}
            <div className="panel-section">
              <label className="section-label">检查器</label>
              {selectedItem ? (
                <div className="inspector-info">
                  <h3 className="selected-item-name">{selectedItem.name}</h3>
                  <span className="selected-item-type">{selectedItem.type}</span>
                </div>
              ) : (
                <p className="empty-text">未选中任何项目</p>
              )}
            </div>

            {/* Prompt编辑器 */}
            <div className="panel-section">
              <label className="section-label" htmlFor="prompt-textarea">
                Prompt
              </label>
              <textarea
                id="prompt-textarea"
                className="prompt-textarea"
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="输入生成提示词..."
                rows={6}
                disabled={!selectedItem}
              />
              <div className="textarea-hint">
                <span className="char-count">{prompt.length} 字符</span>
              </div>
            </div>

            {/* 生成设置 */}
            <div className="panel-section">
              <label className="section-label">生成设置</label>

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
            </div>

            {/* 关联资产 */}
            <div className="panel-section">
              <label className="section-label">关联资产</label>
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
            </div>

            {/* 内部参数（占位符） */}
            <div className="panel-section">
              <label className="section-label">内部参数</label>
              <span className="param-count">10 / 34</span>
            </div>
          </>
        ) : (
          // 工具Tab内容
          <div className="panel-section">
            <p className="empty-text">工具面板功能待实现</p>
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
          disabled={!selectedItem || isGenerating}
        >
          <Sparkles className="button-icon" size={16} />
          {isGenerating ? '生成中...' : '生成 (GENERATE)'}
        </Button>
      </div>
    </div>
  );
};

/**
 * GenerationModeTab - 生成模式TAB
 * 选择生成模式：当前选择/自动补全/全流程
 */

import React from 'react';

export type GenerationMode = 'current' | 'auto-complete' | 'full-flow';

interface GenerationModeTabProps {
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  selectedItem: any | null;
}

const getModeHint = (mode: GenerationMode): string => {
  switch (mode) {
    case 'current':
      return '生成单个选中项（独立任务）';
    case 'auto-complete':
      return '补齐缺失项（需项目+插件支持）';
    case 'full-flow':
      return '串联执行完整流程（需特定插件）';
    default:
      return '';
  }
};

export const GenerationModeTab: React.FC<GenerationModeTabProps> = ({
  mode,
  onModeChange,
  selectedItem,
}) => {
  return (
    <div className="generation-mode-tab">
      <div className="mode-buttons">
        <button
          className={`mode-btn ${mode === 'current' ? 'active' : ''}`}
          onClick={() => onModeChange('current')}
          disabled={!selectedItem}
        >
          当前选择
        </button>
        <button
          className={`mode-btn ${mode === 'auto-complete' ? 'active' : ''}`}
          onClick={() => onModeChange('auto-complete')}
          disabled={!selectedItem}
        >
          自动补全
        </button>
        <button
          className={`mode-btn ${mode === 'full-flow' ? 'active' : ''}`}
          onClick={() => onModeChange('full-flow')}
        >
          全流程
        </button>
      </div>
      <div className="mode-hint">{getModeHint(mode)}</div>
    </div>
  );
};

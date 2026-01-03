/**
 * ModelGroup 组件
 *
 * 功能：
 * - 按分组展示模型列表
 * - 支持折叠/展开
 * - 模型操作图标（可见性、收藏、别名、设置）
 */

import React, { useState } from 'react';
import { ChevronRight, Eye, EyeOff, Star, Edit2, Settings } from 'lucide-react';
import './ModelGroup.css';

export interface ModelInfo {
  id: string;
  name: string;
  group?: string;
  category: string;
  hidden: boolean;
  favorite: boolean;
  alias?: string;
  contextWindow?: number;
  costPerMillionInput?: number;
  costPerMillionOutput?: number;
}

interface ModelGroupProps {
  groupName: string;
  models: ModelInfo[];
  defaultExpanded?: boolean;
  onToggleVisibility: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSetAlias: (id: string, alias: string) => void;
  onEditModel?: (id: string) => void;
}

export const ModelGroup: React.FC<ModelGroupProps> = ({
  groupName,
  models,
  defaultExpanded = true,
  onToggleVisibility,
  onToggleFavorite,
  onSetAlias,
  onEditModel
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 切换展开/折叠
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 处理别名设置
  const handleSetAlias = (modelId: string, currentAlias?: string) => {
    const newAlias = prompt('请输入模型别名:', currentAlias || '');
    if (newAlias !== null) {
      onSetAlias(modelId, newAlias);
    }
  };

  return (
    <div className={`model-group ${isExpanded ? 'expanded' : ''}`}>
      {/* 分组标题 */}
      <div className="model-group-header" onClick={toggleExpanded}>
        <ChevronRight className={`expand-icon ${isExpanded ? 'expanded' : ''}`} />
        <span className="model-group-title">{groupName}</span>
        <span className="model-count-badge">{models.length}</span>
      </div>

      {/* 模型列表 */}
      {isExpanded && (
        <div className="model-list">
          {models.length === 0 ? (
            <div className="model-empty">该分组暂无模型</div>
          ) : (
            models.map(model => (
              <div key={model.id} className="model-row">
                {/* 模型图标 */}
                <div className="model-icon">
                  {model.name.charAt(0).toUpperCase()}
                </div>

                {/* 模型名称 */}
                <div className="model-info">
                  <div className="model-name">
                    {model.alias || model.name}
                    {model.alias && (
                      <span className="model-id-hint">({model.id})</span>
                    )}
                  </div>
                  {model.contextWindow && (
                    <div className="model-meta">
                      上下文: {model.contextWindow.toLocaleString()} tokens
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="model-actions">
                  {/* 可见性切换 */}
                  <button
                    className={`model-action-icon ${model.hidden ? '' : 'active'}`}
                    onClick={() => onToggleVisibility(model.id)}
                    title={model.hidden ? '显示模型' : '隐藏模型'}
                  >
                    {model.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>

                  {/* 收藏切换 */}
                  <button
                    className={`model-action-icon ${model.favorite ? 'active' : ''}`}
                    onClick={() => onToggleFavorite(model.id)}
                    title={model.favorite ? '取消收藏' : '添加收藏'}
                  >
                    <Star className="h-4 w-4" />
                  </button>

                  {/* 别名设置 */}
                  <button
                    className="model-action-icon"
                    onClick={() => handleSetAlias(model.id, model.alias)}
                    title="设置别名"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {/* 编辑设置 */}
                  {onEditModel && (
                    <button
                      className="model-action-icon"
                      onClick={() => onEditModel(model.id)}
                      title="编辑模型"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

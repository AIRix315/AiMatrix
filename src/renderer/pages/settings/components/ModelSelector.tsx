/**
 * ModelSelector 组件
 *
 * 功能：
 * - 显示模型列表（支持分类过滤）
 * - 隐藏/显示模型切换
 * - 收藏模型功能
 * - 设置模型别名
 * - 标签过滤
 * - 添加/删除自定义模型
 */

import React, { useState, useEffect } from 'react';
import { Button, Toast } from '../../../components/common';
import './ModelSelector.css';

interface ModelDefinition {
  id: string;
  name: string;
  provider: string;
  category: string;
  official: boolean;
  parameters: Record<string, unknown>;
  description?: string;
  tags?: string[];
  costPerUnit?: number;
  currency?: string;
  deprecated?: boolean;
  version?: string;
  hidden?: boolean;
  favorite?: boolean;
  alias?: string;
}

interface ModelSelectorProps {
  category?: string;
  enabledProvidersOnly?: boolean;
  onModelSelect?: (model: ModelDefinition) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  category,
  enabledProvidersOnly = true,
  onModelSelect
}) => {
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [filteredModels, setFilteredModels] = useState<ModelDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // 加载模型列表
  useEffect(() => {
    loadModels();
  }, [category, enabledProvidersOnly, showHidden]);

  // 过滤模型
  useEffect(() => {
    filterModels();
  }, [models, searchQuery, showFavoritesOnly, selectedTags]);

  const loadModels = async () => {
    try {
      const options: {
        category?: string;
        enabledProvidersOnly?: boolean;
        includeHidden?: boolean;
      } = {
        enabledProvidersOnly,
        includeHidden: showHidden
      };

      if (category) {
        options.category = category;
      }

      const loadedModels = await window.electronAPI.listModels(options);

      setModels(loadedModels as any);

      // 提取所有标签
      const tags = new Set<string>();
      loadedModels.forEach(model => {
        model.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAvailableTags(Array.from(tags).sort());
    } catch (error) {
      displayToast('error', `加载模型失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const filterModels = () => {
    let filtered = [...models];

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        model =>
          model.name.toLowerCase().includes(query) ||
          model.id.toLowerCase().includes(query) ||
          model.description?.toLowerCase().includes(query) ||
          model.alias?.toLowerCase().includes(query)
      );
    }

    // 收藏过滤
    if (showFavoritesOnly) {
      filtered = filtered.filter(model => model.favorite);
    }

    // 标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter(model =>
        model.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    setFilteredModels(filtered);
  };

  // 切换模型可见性
  const handleToggleVisibility = async (modelId: string, currentHidden: boolean) => {
    try {
      await window.electronAPI.toggleModelVisibility(modelId, !currentHidden);
      await loadModels();
      displayToast('success', `模型已${currentHidden ? '显示' : '隐藏'}`);
    } catch (error) {
      displayToast('error', `操作失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 切换收藏状态
  const handleToggleFavorite = async (modelId: string, currentFavorite: boolean) => {
    try {
      await window.electronAPI.toggleModelFavorite(modelId, !currentFavorite);
      await loadModels();
      displayToast('success', `${currentFavorite ? '已取消收藏' : '已收藏'}`);
    } catch (error) {
      displayToast('error', `操作失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 保存别名
  const handleSaveAlias = async (modelId: string) => {
    try {
      await window.electronAPI.setModelAlias(modelId, aliasInput);
      await loadModels();
      setEditingAlias(null);
      setAliasInput('');
      displayToast('success', '别名已保存');
    } catch (error) {
      displayToast('error', `保存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 开始编辑别名
  const handleStartEditAlias = (model: ModelDefinition) => {
    setEditingAlias(model.id);
    setAliasInput(model.alias || '');
  };

  // 取消编辑别名
  const handleCancelEditAlias = () => {
    setEditingAlias(null);
    setAliasInput('');
  };

  // 切换标签选择
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 显示 Toast
  const displayToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 获取分类显示名称
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'image-generation': '图像生成',
      'video-generation': '视频生成',
      'audio-generation': '音频生成',
      'llm': '大语言模型',
      'workflow': '工作流',
      'tts': '语音合成',
      'stt': '语音识别',
      'embedding': '向量嵌入',
      'translation': '翻译'
    };
    return labels[category] || category;
  };

  return (
    <>
      <div className="model-selector">
        {/* 搜索和过滤栏 */}
        <div className="model-filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="搜索模型（名称、ID、描述）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="filter-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
              />
              仅显示收藏
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              显示隐藏模型
            </label>
          </div>
        </div>

        {/* 标签过滤 */}
        {availableTags.length > 0 && (
          <div className="tag-filter">
            <span className="tag-filter-label">标签过滤:</span>
            <div className="tag-list">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-button ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => handleToggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 模型列表 */}
        <div className="model-list">
          {filteredModels.length === 0 ? (
            <div className="empty-state">
              <p>未找到匹配的模型</p>
            </div>
          ) : (
            filteredModels.map(model => (
              <div key={model.id} className="model-card">
                <div className="model-header">
                  <div className="model-info">
                    <div className="model-title-row">
                      <h4 className="model-name">
                        {model.alias || model.name}
                        {model.alias && (
                          <span className="model-original-name"> ({model.name})</span>
                        )}
                      </h4>
                      {model.official && (
                        <span className="official-badge">官方</span>
                      )}
                      {model.deprecated && (
                        <span className="deprecated-badge">已弃用</span>
                      )}
                    </div>

                    <div className="model-meta">
                      <span className="model-id">{model.id}</span>
                      <span className="model-category">
                        {getCategoryLabel(model.category)}
                      </span>
                      {model.version && (
                        <span className="model-version">v{model.version}</span>
                      )}
                    </div>

                    {model.description && (
                      <p className="model-description">{model.description}</p>
                    )}

                    {model.tags && model.tags.length > 0 && (
                      <div className="model-tags">
                        {model.tags.map(tag => (
                          <span key={tag} className="model-tag">{tag}</span>
                        ))}
                      </div>
                    )}

                    {model.costPerUnit !== undefined && (
                      <div className="model-cost">
                        单价: {model.costPerUnit} {model.currency || 'USD'}
                      </div>
                    )}
                  </div>

                  <div className="model-actions">
                    <button
                      className={`icon-button ${model.favorite ? 'favorite-active' : ''}`}
                      onClick={() => handleToggleFavorite(model.id, model.favorite || false)}
                      title={model.favorite ? '取消收藏' : '收藏'}
                    >
                      ★
                    </button>

                    <button
                      className="icon-button"
                      onClick={() => handleToggleVisibility(model.id, model.hidden || false)}
                      title={model.hidden ? '显示' : '隐藏'}
                    >
                      {model.hidden ? '👁️' : '🙈'}
                    </button>

                    {editingAlias === model.id ? (
                      <div className="alias-edit">
                        <input
                          type="text"
                          value={aliasInput}
                          onChange={(e) => setAliasInput(e.target.value)}
                          placeholder="输入别名"
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveAlias(model.id)}
                        >
                          保存
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCancelEditAlias}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="icon-button"
                        onClick={() => handleStartEditAlias(model)}
                        title="设置别名"
                      >
                        ✏️
                      </button>
                    )}

                    {onModelSelect && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onModelSelect(model)}
                      >
                        选择
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
};

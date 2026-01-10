/**
 * PluginConfigTab - 插件配置TAB
 * 显示和编辑当前项目的插件Provider配置
 */

import React, { useState, useEffect } from 'react';
import { useProject } from '../../../contexts/ProjectContext';
import { Button } from '../../common';
import type { PluginConfig, ProviderConfigItem } from '@/shared/types';
import type { APIProviderConfig } from '@/shared/types';
import './PluginConfigTab.css';

interface PluginConfigTabProps {
  className?: string;
}

export const PluginConfigTab: React.FC<PluginConfigTabProps> = ({ className }) => {
  const { currentProject } = useProject();
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [providers, setProviders] = useState<APIProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载插件配置和Provider列表
   */
  useEffect(() => {
    if (!currentProject || !currentProject.pluginId) {
      setConfig(null);
      return;
    }

    loadConfig();
    loadProviders();
  }, [currentProject]);

  const loadConfig = async () => {
    if (!currentProject) return;

    try {
      setLoading(true);
      setError(null);
      const cfg = await window.electronAPI.getProjectPluginConfig(
        currentProject.id,
        currentProject.pluginId!
      ) as PluginConfig;
      setConfig(cfg);
    } catch (err) {
      setError('加载配置失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const allProviders = await window.electronAPI.listProviders() as APIProviderConfig[];
      setProviders(allProviders);
    } catch (err) {
      console.error('加载Provider列表失败:', err);
    }
  };

  /**
   * 保存配置
   */
  const handleSave = async () => {
    if (!currentProject || !config) return;

    try {
      setSaving(true);
      setError(null);
      await window.electronAPI.saveProjectPluginConfig(
        currentProject.id,
        currentProject.pluginId!,
        config
      );
    } catch (err) {
      setError('保存配置失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  /**
   * 重置为默认配置
   */
  const handleReset = async () => {
    if (!currentProject) return;

    if (!confirm('确定要重置为默认配置吗？此操作不可撤销。')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const resetConfig = await window.electronAPI.resetProjectPluginConfig(
        currentProject.id,
        currentProject.pluginId!
      ) as PluginConfig;
      setConfig(resetConfig);
    } catch (err) {
      setError('重置配置失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新Provider选择
   */
  const handleProviderChange = (key: string, providerId: string) => {
    if (!config) return;

    const provider = providers.find(p => p.id === providerId);
    const newConfig: PluginConfig = {
      ...config,
      providers: {
        ...config.providers,
        [key]: {
          ...config.providers[key],
          providerId,
          model: provider?.selectedModels?.[0] || null, // 使用 selectedModels 而不是 models
        },
      },
    };
    setConfig(newConfig);
  };

  /**
   * 更新模型选择
   */
  const handleModelChange = (key: string, model: string) => {
    if (!config) return;

    const newConfig: PluginConfig = {
      ...config,
      providers: {
        ...config.providers,
        [key]: {
          ...config.providers[key],
          model,
        },
      },
    };
    setConfig(newConfig);
  };

  /**
   * 根据key获取对应的category
   */
  const getCategoryForKey = (key: string): string => {
    const categoryMap: Record<string, string> = {
      llm: 'llm',
      imageGeneration: 'image-generation',
      videoGeneration: 'video-generation',
      tts: 'tts',
    };
    return categoryMap[key] || '';
  };

  /**
   * 获取Provider的模型列表
   */
  const getModelsForProvider = (providerId: string | null): string[] => {
    if (!providerId) return [];
    const provider = providers.find(p => p.id === providerId);
    return provider?.selectedModels || []; // 使用 selectedModels 而不是 models
  };

  // 如果没有项目或插件，显示提示
  if (!currentProject || !currentProject.pluginId) {
    return (
      <div className={`plugin-config-tab ${className || ''}`}>
        <div className="config-empty">
          <p className="hint">请先选择一个插件项目</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`plugin-config-tab ${className || ''}`}>
        <div className="config-loading">加载配置中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`plugin-config-tab ${className || ''}`}>
        <div className="config-error">
          <p>{error}</p>
          <Button onClick={loadConfig} size="sm">重试</Button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`plugin-config-tab ${className || ''}`}>
        <div className="config-empty">
          <p className="hint">配置加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`plugin-config-tab ${className || ''}`}>
      <div className="config-header">
        <h4>生成模式配置</h4>
        <p className="hint">当前项目专用配置</p>
      </div>

      <div className="config-list">
        {Object.entries(config.providers).map(([key, providerConfig]: [string, ProviderConfigItem]) => {
          const category = getCategoryForKey(key);
          const filteredProviders = providers.filter(p => p.category === category);
          const models = getModelsForProvider(providerConfig.providerId);

          return (
            <div key={key} className="config-item">
              <label className="config-label">{providerConfig.purpose}</label>

              <select
                className="config-select"
                value={providerConfig.providerId || ''}
                onChange={(e) => handleProviderChange(key, e.target.value)}
              >
                <option value="">请选择Provider</option>
                {filteredProviders.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {!p.enabled && '(未启用)'}
                  </option>
                ))}
              </select>

              <select
                className="config-select"
                value={providerConfig.model || ''}
                onChange={(e) => handleModelChange(key, e.target.value)}
                disabled={!providerConfig.providerId || models.length === 0}
              >
                <option value="">请选择模型</option>
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <div className="config-status">
                {providerConfig.providerId ? (
                  <span className="status-ok">✓ 已配置</span>
                ) : providerConfig.optional ? (
                  <span className="status-optional">可选</span>
                ) : (
                  <span className="status-missing">⚠️ 未配置</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="config-actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          disabled={loading || saving}
        >
          恢复默认
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </div>
    </div>
  );
};

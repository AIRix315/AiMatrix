/**
 * ProviderDetailPanel 组件
 *
 * 功能：
 * - 显示 Provider 详细配置信息
 * - Provider 头部（名称 + 启用开关）
 * - API 配置区（密钥、地址、测试）
 * - 模型列表区（分组展示）
 * - 删除和操作按钮
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '../../../components/common';
import { ModelGroup, type ModelInfo } from './ModelGroup';
import './ProviderDetailPanel.css';

interface ProviderConfig {
  id: string;
  name: string;
  category: string;
  baseUrl: string;
  authType: 'bearer' | 'apikey' | 'basic' | 'none';
  apiKey?: string;
  enabled: boolean;
  costPerUnit?: number;
  currency?: string;
  description?: string;
  workflowId?: string; // 工作流ID（用于N8N、ComfyUI等）
}

interface ProviderDetailPanelProps {
  providerId: string;
  onUpdate: (config: ProviderConfig) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onTestConnection: (id: string) => Promise<void>;
}

export const ProviderDetailPanel: React.FC<ProviderDetailPanelProps> = ({
  providerId,
  onUpdate,
  onRemove,
  onTestConnection,
}) => {
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // 编辑状态
  const [localBaseUrl, setLocalBaseUrl] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  const [localWorkflowId, setLocalWorkflowId] = useState('');
  const [localName, setLocalName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // 模型列表状态
  const [models, setModels] = useState<ModelInfo[]>([]);

  // 加载 Provider 数据和模型列表
  useEffect(() => {
    loadProvider();
    loadModels();
  }, [providerId]);

  const loadProvider = async () => {
    try {
      setIsLoading(true);
      const providerData = await window.electronAPI.getProvider(providerId);
      setProvider(providerData as ProviderConfig);

      // 初始化本地编辑状态
      const config = providerData as ProviderConfig;
      setLocalBaseUrl(config.baseUrl || '');
      setLocalApiKey(config.apiKey || '');
      setLocalWorkflowId(config.workflowId || '');
      setLocalName(config.name || '');
    } catch (error) {
      // 加载失败时保持 loading 状态
    } finally {
      setIsLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      // 优先从 Provider 配置中获取模型列表（特别是本地服务如 Ollama）
      const providerConfig = await window.electronAPI.getProvider(providerId);

      if (
        providerConfig &&
        (providerConfig as any).models &&
        Array.isArray((providerConfig as any).models)
      ) {
        // 如果 Provider 配置中有模型列表，直接使用（这是连接测试时获取的）
        const providerModels = (providerConfig as any).models.map(
          (modelName: string) => ({
            id: `${providerId}-${modelName}`,
            name: modelName,
            provider: providerId,
            providerId: providerId,
            hidden: false,
            favorite: false,
            alias: modelName,
          })
        );
        setModels(providerModels as ModelInfo[]);
      } else {
        // 否则从 ModelRegistry 加载
        const allModels = await window.electronAPI.listModels({
          includeHidden: true,
        });
        // 过滤出属于当前Provider的模型
        const providerModels = allModels.filter(
          (m: any) => m.providerId === providerId || m.provider === providerId
        );
        setModels(providerModels as ModelInfo[]);
      }
    } catch (error) {
      // 模型加载失败时使用空数组
      setModels([]);
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async () => {
    if (!provider) return;

    const updated = { ...provider, enabled: !provider.enabled };
    try {
      await onUpdate(updated);
      setProvider(updated);
    } catch (error) {
      // 错误通过 onUpdate 的异常处理
    }
  };

  // 保存 API 配置
  const handleSaveConfig = async () => {
    if (!provider) return;

    const updated: ProviderConfig = {
      ...provider,
      baseUrl: localBaseUrl,
      apiKey: localApiKey,
      workflowId: localWorkflowId,
      name: localName,
    };

    await onUpdate(updated);
    setProvider(updated);
  };

  // 保存 Provider 名称
  const handleSaveName = async () => {
    if (!provider || !localName.trim()) return;

    const updated: ProviderConfig = {
      ...provider,
      name: localName.trim(),
    };

    await onUpdate(updated);
    setProvider(updated);
    setIsEditingName(false);
  };

  // 处理名称编辑的键盘事件
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setLocalName(provider?.name || '');
      setIsEditingName(false);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!provider) return;

    setIsTesting(true);
    try {
      // 先保存当前配置
      await handleSaveConfig();
      // 再测试连接
      await onTestConnection(provider.id);
      // 重新加载 Provider 配置（包含更新后的模型列表）
      await loadProvider();
      // 刷新模型列表（以显示新检测到的模型）
      await loadModels();
    } finally {
      setIsTesting(false);
    }
  };

  // 删除 Provider
  const handleRemove = async () => {
    if (!provider) return;

    if (
      !confirm(`确定要删除 Provider "${provider.name}" 吗？此操作不可撤销。`)
    ) {
      return;
    }

    await onRemove(provider.id);
  };

  // 获取分类显示名称
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'image-generation': '图像生成',
      'video-generation': '视频生成',
      'audio-generation': '音频生成',
      llm: '大语言模型',
      workflow: '工作流',
      tts: '语音合成',
      stt: '语音识别',
      embedding: '向量嵌入',
      translation: '翻译',
    };
    return labels[category] || category;
  };

  if (isLoading || !provider) {
    return (
      <div className="provider-detail-panel">
        <div className="provider-detail-loading">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="provider-detail-panel">
      {/* Provider 头部 */}
      <div className="provider-detail-header">
        <div className="provider-detail-title">
          {isEditingName ? (
            <input
              type="text"
              className="provider-name-input"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleNameKeyDown}
              autoFocus
              placeholder="请输入 Provider 名称"
            />
          ) : (
            <h2
              onClick={() => setIsEditingName(true)}
              style={{ cursor: 'pointer' }}
              title="点击编辑名称"
            >
              {provider.name}
            </h2>
          )}
          <span className="provider-category-label">
            {getCategoryLabel(provider.category)}
          </span>
        </div>

        {/* 启用开关 */}
        <label className="provider-enable-toggle">
          <input
            type="checkbox"
            checked={provider.enabled}
            onChange={handleToggleEnabled}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">
            {provider.enabled ? '已启用' : '已禁用'}
          </span>
        </label>
      </div>

      {/* API 配置区 */}
      <div className="api-config-section">
        <h3>API 配置</h3>

        {/* API 密钥 */}
        {provider.authType !== 'none' && (
          <div className="form-field">
            <label>API 密钥</label>
            <div className="api-key-input-group">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="input-field"
                value={localApiKey}
                onChange={e => setLocalApiKey(e.target.value)}
                onBlur={handleSaveConfig}
                placeholder="请输入 API 密钥"
              />
              <button
                className="icon-button"
                onClick={() => setShowApiKey(!showApiKey)}
                type="button"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !localApiKey}
              >
                {isTesting ? '检测中...' : '检测'}
              </Button>
            </div>
          </div>
        )}

        {/* API 地址 */}
        <div className="form-field">
          <label>API 地址</label>
          <div
            style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}
          >
            <div style={{ flex: 1 }}>
              <input
                type="text"
                className="input-field"
                value={localBaseUrl}
                onChange={e => setLocalBaseUrl(e.target.value)}
                onBlur={handleSaveConfig}
                placeholder="https://api.example.com"
              />
              {localBaseUrl && (
                <div className="api-url-preview">预览: {localBaseUrl}</div>
              )}
            </div>
            {/* 本地服务（无需API密钥）显示测试连接按钮 */}
            {provider.authType === 'none' && (
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !localBaseUrl}
              >
                {isTesting ? '检测中...' : '测试连接'}
              </Button>
            )}
          </div>
        </div>

        {/* 工作流 ID（仅 N8N 和 ComfyUI 显示） */}
        {(provider.id === 'n8n-local' || provider.id === 'comfyui-local') && (
          <div className="form-field">
            <label>
              工作流 ID
              <span className="field-hint">
                （可选）指定默认使用的工作流 ID
              </span>
            </label>
            <input
              type="text"
              className="input-field"
              value={localWorkflowId}
              onChange={e => setLocalWorkflowId(e.target.value)}
              onBlur={handleSaveConfig}
              placeholder={
                provider.id === 'n8n-local'
                  ? '例如: 1234'
                  : '例如: workflow_abc123'
              }
            />
            {localWorkflowId && (
              <div className="api-url-preview">
                当前工作流: {localWorkflowId}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 模型列表区 */}
      <div className="models-section">
        <div className="models-section-header">
          <h3>模型列表</h3>
        </div>

        {/* 实际集成 ModelGroup 组件 */}
        {provider && models.length > 0 && (
          <ModelGroup
            groupName={`${provider.name} 模型`}
            models={models}
            defaultExpanded={true}
            onToggleVisibility={async id => {
              try {
                const model = models.find(m => m.id === id);
                if (!model) return;

                await window.electronAPI.toggleModelVisibility(
                  id,
                  !model.hidden
                );
                // 刷新模型列表
                await loadModels();
              } catch (error) {
                console.error('Toggle visibility failed:', error);
              }
            }}
            onToggleFavorite={async id => {
              try {
                const model = models.find(m => m.id === id);
                if (!model) return;

                await window.electronAPI.toggleModelFavorite(
                  id,
                  !model.favorite
                );
                // 刷新模型列表
                await loadModels();
              } catch (error) {
                console.error('Toggle favorite failed:', error);
              }
            }}
            onSetAlias={async (id, alias) => {
              try {
                await window.electronAPI.setModelAlias(id, alias);
                // 刷新模型列表
                await loadModels();
              } catch (error) {
                console.error('Set alias failed:', error);
              }
            }}
          />
        )}
        {models.length === 0 && (
          <div className="models-placeholder">
            <p>该Provider暂无模型</p>
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <div className="provider-detail-footer">
        <button className="delete-button" onClick={handleRemove}>
          <Trash2 className="h-4 w-4" />
          删除 Provider
        </button>
      </div>
    </div>
  );
};

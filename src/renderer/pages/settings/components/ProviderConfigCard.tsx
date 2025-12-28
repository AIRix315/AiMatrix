/**
 * ProviderConfigCard 组件
 *
 * 功能：
 * - 显示单个 Provider 配置信息
 * - 支持启用/禁用切换
 * - API Key 和 Base URL 配置
 * - 连接测试功能
 * - 状态指示器
 */

import React, { useState } from 'react';
import { Button, Toast } from '../../../components/common';
import './ProviderConfigCard.css';

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
}

interface ProviderStatus {
  isOnline: boolean;
  lastChecked?: string;
  error?: string;
}

interface ProviderConfigCardProps {
  provider: ProviderConfig;
  status?: ProviderStatus;
  onUpdate?: (config: ProviderConfig) => Promise<void>;
  onRemove?: (providerId: string) => Promise<void>;
  onTestConnection?: (providerId: string) => Promise<void>;
}

export const ProviderConfigCard: React.FC<ProviderConfigCardProps> = ({
  provider,
  status,
  onUpdate,
  onRemove,
  onTestConnection
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<ProviderConfig>(provider);
  const [isTesting, setIsTesting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // 切换启用/禁用
  const handleToggleEnabled = async () => {
    const updated = { ...editedConfig, enabled: !editedConfig.enabled };
    setEditedConfig(updated);

    if (onUpdate) {
      try {
        await onUpdate(updated);
        displayToast('success', `Provider ${updated.enabled ? '已启用' : '已禁用'}`);
      } catch (error) {
        displayToast('error', `操作失败: ${error instanceof Error ? error.message : String(error)}`);
        // 回滚
        setEditedConfig(editedConfig);
      }
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    setIsTesting(true);
    try {
      await onTestConnection(provider.id);
      displayToast('success', '连接测试成功');
    } catch (error) {
      displayToast('error', `连接失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!onUpdate) return;

    try {
      await onUpdate(editedConfig);
      setIsEditing(false);
      displayToast('success', '配置已保存');
    } catch (error) {
      displayToast('error', `保存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditedConfig(provider);
    setIsEditing(false);
  };

  // 删除 Provider
  const handleRemove = async () => {
    if (!onRemove) return;

    if (!confirm(`确定要删除 Provider "${provider.name}" 吗？`)) {
      return;
    }

    try {
      await onRemove(provider.id);
      displayToast('success', 'Provider 已删除');
    } catch (error) {
      displayToast('error', `删除失败: ${error instanceof Error ? error.message : String(error)}`);
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

  // 获取状态指示器
  const getStatusIndicator = () => {
    if (!status) {
      return <span className="status-indicator unknown">未知</span>;
    }

    if (status.isOnline) {
      return <span className="status-indicator online">在线</span>;
    } else {
      return (
        <span className="status-indicator offline" title={status.error}>
          离线
        </span>
      );
    }
  };

  return (
    <>
      <div className="provider-config-card">
        <div className="provider-header">
          <div className="provider-info">
            <h3 className="provider-name">{provider.name}</h3>
            <span className="provider-category">{getCategoryLabel(provider.category)}</span>
            {getStatusIndicator()}
          </div>

          <div className="provider-actions">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={editedConfig.enabled}
                onChange={handleToggleEnabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {provider.description && (
          <p className="provider-description">{provider.description}</p>
        )}

        <div className="provider-details">
          {isEditing ? (
            <>
              {/* 编辑模式 */}
              <div className="form-group">
                <label>Base URL</label>
                <input
                  type="text"
                  value={editedConfig.baseUrl}
                  onChange={(e) => setEditedConfig({ ...editedConfig, baseUrl: e.target.value })}
                  placeholder="http://localhost:8188"
                />
              </div>

              {editedConfig.authType !== 'none' && (
                <div className="form-group">
                  <label>
                    {editedConfig.authType === 'apikey' ? 'API Key' :
                     editedConfig.authType === 'bearer' ? 'Bearer Token' :
                     'API Key'}
                  </label>
                  <input
                    type="password"
                    value={editedConfig.apiKey || ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>
              )}

              {editedConfig.costPerUnit !== undefined && (
                <div className="form-group">
                  <label>单价</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editedConfig.costPerUnit}
                    onChange={(e) => setEditedConfig({
                      ...editedConfig,
                      costPerUnit: parseFloat(e.target.value)
                    })}
                  />
                  <span className="currency-label">{editedConfig.currency || 'USD'}</span>
                </div>
              )}

              <div className="form-actions">
                <Button variant="secondary" onClick={handleCancel}>
                  取消
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  保存
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* 查看模式 */}
              <div className="detail-row">
                <span className="detail-label">Base URL:</span>
                <span className="detail-value">{provider.baseUrl}</span>
              </div>

              {provider.authType !== 'none' && (
                <div className="detail-row">
                  <span className="detail-label">认证类型:</span>
                  <span className="detail-value">{provider.authType.toUpperCase()}</span>
                </div>
              )}

              {provider.apiKey && (
                <div className="detail-row">
                  <span className="detail-label">API Key:</span>
                  <span className="detail-value api-key-masked">
                    {provider.apiKey.substring(0, 8)}...
                  </span>
                </div>
              )}

              {provider.costPerUnit !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">单价:</span>
                  <span className="detail-value">
                    {provider.costPerUnit} {provider.currency || 'USD'}
                  </span>
                </div>
              )}

              <div className="card-actions">
                <Button
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={!provider.enabled || isTesting}
                >
                  {isTesting ? '测试中...' : '测试连接'}
                </Button>
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  编辑
                </Button>
                <Button variant="secondary" onClick={handleRemove}>
                  删除
                </Button>
              </div>
            </>
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

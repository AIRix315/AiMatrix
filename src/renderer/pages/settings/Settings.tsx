/**
 * Settings 页面 - 重构版
 *
 * 功能：
 * - 按分类组织 Provider（9个功能分类）
 * - 使用 ProviderConfigCard 组件管理 Provider
 * - 使用 ModelSelector 组件管理模型
 * - 全局配置管理
 */

import React, { useState, useEffect } from 'react';
import {
  Palette, Film, Music, Bot, Workflow, Speech, Ear, Binary, Globe,
  Settings as SettingsIcon, Package
} from 'lucide-react';
import { Button, Toast } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import { ProviderConfigCard } from './components/ProviderConfigCard';
import { ModelSelector } from './components/ModelSelector';
import './Settings.css';

// API 分类定义
const API_CATEGORIES = [
  { id: 'image-generation', name: '图像生成', Icon: Palette },
  { id: 'video-generation', name: '视频生成', Icon: Film },
  { id: 'audio-generation', name: '音频生成', Icon: Music },
  { id: 'llm', name: '大语言模型', Icon: Bot },
  { id: 'workflow', name: '工作流', Icon: Workflow },
  { id: 'tts', name: '语音合成', Icon: Speech },
  { id: 'stt', name: '语音识别', Icon: Ear },
  { id: 'embedding', name: '向量嵌入', Icon: Binary },
  { id: 'translation', name: '翻译', Icon: Globe }
];

interface LoggingConfig {
  savePath: string;
  retentionDays: number;
}

interface GeneralConfig {
  workspacePath: string;
  logging: LoggingConfig;
}

interface AppConfig {
  general: GeneralConfig;
  providers: unknown[];
}

const Settings: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('global');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  // TODO: [中期改进] 定义准确的ProviderStatus类型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [providerStatuses, setProviderStatuses] = useState<Map<string, any>>(new Map());

  // 加载配置
  useEffect(() => {
    loadSettings();
  }, []);

  // 切换分类时加载对应的 Provider
  useEffect(() => {
    if (currentCategory) {
      loadProvidersForCategory(currentCategory);
    }
  }, [currentCategory]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // TODO: [中期改进] 定义准确的getAllSettings返回类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = await window.electronAPI.getAllSettings() as any;
      setConfig(settings);
    } catch (error) {
      setToast({
        type: 'error',
        message: `加载配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProvidersForCategory = async (category: string) => {
    try {
      const categoryProviders = await window.electronAPI.listProviders({
        category,
        enabledOnly: false
      });
      setProviders(categoryProviders);

      // 加载每个 Provider 的状态
      const statusMap = new Map();
      for (const provider of categoryProviders) {
        try {
          const status = await window.electronAPI.getProviderStatus(provider.id);
          statusMap.set(provider.id, status);
        } catch (error) {
          // 状态加载失败时使用默认值
          statusMap.set(provider.id, { isOnline: false, error: 'Status unavailable' });
        }
      }
      setProviderStatuses(statusMap);
    } catch (error) {
      setToast({
        type: 'error',
        message: `加载 Provider 失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    if (tabId !== 'global' && tabId !== 'models') {
      setCurrentCategory(tabId);
    } else {
      setCurrentCategory(null);
    }
  };

  const handleSelectDirectory = async (field: 'workspacePath' | 'logPath') => {
    try {
      const path = await window.electronAPI.openDirectoryDialog();
      if (path && config) {
        if (field === 'workspacePath') {
          setConfig({
            ...config,
            general: {
              ...config.general,
              workspacePath: path
            }
          });
        } else if (field === 'logPath') {
          setConfig({
            ...config,
            general: {
              ...config.general,
              logging: {
                ...config.general.logging,
                savePath: path
              }
            }
          });
        }
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: `选择目录失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      if (!config) return;
      await window.electronAPI.saveSettings(config as any);
      setToast({
        type: 'success',
        message: '配置保存成功'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `保存配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderUpdate = async (providerConfig: unknown) => {
    try {
      await window.electronAPI.addProvider(providerConfig as any);
      await loadProvidersForCategory(currentCategory!);
      setToast({
        type: 'success',
        message: 'Provider 配置已更新'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `更新失败: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  };

  const handleProviderRemove = async (providerId: string) => {
    try {
      await window.electronAPI.removeProvider(providerId);
      await loadProvidersForCategory(currentCategory!);
      setToast({
        type: 'success',
        message: 'Provider 已删除'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `删除失败: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  };

  const handleTestConnection = async (providerId: string) => {
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const result = await window.electronAPI.testProviderConnection({
        type: provider.category || '',
        baseUrl: provider.baseUrl || '',
        apiKey: provider.apiKey,
        providerId,
        authType: provider.authType
      } as any);

      // TODO: [中期改进] 定义准确的testProviderConnection返回类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((result as any).success) {
        setToast({
          type: 'success',
          message: '连接测试成功'
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((result as any).error || '连接失败');
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: `连接测试失败: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  };

  if (isLoading || !config) {
    return (
      <div className="settings-layout">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div>加载配置中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-layout">
      {/* 侧边栏 */}
      <div className="settings-sidebar">
        <div className="settings-search-box">
          <input
            type="text"
            className="search-input"
            placeholder="搜索配置项..."
          />
        </div>
        <div className="provider-list">
          {/* 全局配置 */}
          <div
            className={`provider-item ${currentTab === 'global' ? 'active' : ''}`}
            onClick={() => handleTabChange('global')}
          >
            <div className="provider-icon">
              <SettingsIcon className="h-5 w-5 text-foreground" />
            </div>
            <span>全局配置</span>
          </div>

          <div className="settings-divider-sidebar"></div>

          {/* 模型管理 */}
          <div
            className={`provider-item ${currentTab === 'models' ? 'active' : ''}`}
            onClick={() => handleTabChange('models')}
          >
            <div className="provider-icon">
              <Package className="h-5 w-5 text-foreground" />
            </div>
            <span>模型管理</span>
          </div>

          <div className="settings-divider-sidebar"></div>

          {/* API 分类 */}
          {API_CATEGORIES.map(category => (
            <div
              key={category.id}
              className={`provider-item ${currentTab === category.id ? 'active' : ''}`}
              onClick={() => handleTabChange(category.id)}
            >
              <div className="provider-icon">
                <category.Icon className="h-5 w-5 text-foreground" />
              </div>
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="settings-content">
        {/* 全局配置 */}
        {currentTab === 'global' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">全局配置</div>
            </div>
            <div className="settings-scroll-area">
              <div className="config-section">
                <div className="config-label">本地存储 (Storage)</div>
                <div className="input-group">
                  <label className="input-label">工作区路径 (Workspace Path)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="input-field"
                      value={config.general.workspacePath}
                      readOnly
                    />
                    <Button onClick={() => handleSelectDirectory('workspacePath')}>浏览...</Button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">日志路径 (Log Path)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="input-field"
                      value={config.general.logging.savePath}
                      readOnly
                    />
                    <Button onClick={() => handleSelectDirectory('logPath')}>浏览...</Button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">日志保留天数 (Log Retention Days)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={config.general.logging.retentionDays}
                    onChange={(e) => setConfig({
                      ...config,
                      general: {
                        ...config.general,
                        logging: {
                          ...config.general.logging,
                          retentionDays: parseInt(e.target.value) || 7
                        }
                      }
                    })}
                  />
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <Button variant="primary" onClick={handleSaveConfig} disabled={isSaving}>
                  {isSaving ? '保存中...' : '保存设置'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 模型管理 */}
        {currentTab === 'models' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">模型管理</div>
            </div>
            <div className="settings-scroll-area">
              <ModelSelector enabledProvidersOnly={false} />
            </div>
          </div>
        )}

        {/* Provider 分类页面 */}
        {currentCategory && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">
                {API_CATEGORIES.find(c => c.id === currentCategory)?.name || currentCategory}
              </div>
              <Button variant="primary" onClick={() => {
                // TODO: 实现添加 Provider 对话框
                setToast({
                  type: 'info',
                  message: '添加 Provider 功能开发中...'
                });
              }}>
                添加 Provider
              </Button>
            </div>
            <div className="settings-scroll-area">
              {providers.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <p>该分类下暂无 Provider</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    点击"添加 Provider"按钮添加新的 Provider
                  </p>
                </div>
              ) : (
                <div className="provider-cards-container">
                  {providers.map(provider => (
                    <ProviderConfigCard
                      key={provider.id}
                      provider={provider}
                      status={providerStatuses.get(provider.id)}
                      onUpdate={handleProviderUpdate}
                      onRemove={handleProviderRemove}
                      onTestConnection={handleTestConnection}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast 通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Settings;

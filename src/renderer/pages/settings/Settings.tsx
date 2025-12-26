import React, { useState, useEffect } from 'react';
import { Button, Toast } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import './Settings.css';

interface Provider {
  id: string;
  icon: string;
  name: string;
  status?: 'on' | 'off';
}

interface LoggingConfig {
  savePath: string;
  retentionDays: number;
}

interface GeneralConfig {
  workspacePath: string;
  logging: LoggingConfig;
}

interface Model {
  id: string;
  name: string;
  ctx?: string;
}

interface ProviderConfig {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'relay';
  enabled: boolean;
  apiKey?: string;
  baseUrl: string;
  models?: Model[];
}

interface AppConfig {
  general: GeneralConfig;
  providers: ProviderConfig[];
}

const providers: Provider[] = [
  {
    id: 'global',
    icon: 'G',
    name: 'Global Defaults',
  },
  {
    id: 'ollama',
    icon: '🦙',
    name: 'Ollama',
    status: 'on',
  },
  {
    id: 'openai',
    icon: 'OA',
    name: 'OpenAI',
    status: 'off',
  },
  {
    id: 'siliconflow',
    icon: 'SF',
    name: 'SiliconFlow',
    status: 'on',
  },
];

const Settings: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('global');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载配置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await window.electronAPI.getAllSettings();
      setConfig(settings);
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to load settings:', error);
      setToast({
        type: 'error',
        message: `加载配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
  };

  const handleConfigChange = (section: string, field: string, value: string | boolean | number) => {
    setConfig((prev: AppConfig | null) => {
      if (!prev) return prev;
      if (section === 'general') {
        return {
          ...prev,
          general: {
            ...prev.general,
            [field]: value
          }
        };
      } else if (section === 'logging') {
        return {
          ...prev,
          general: {
            ...prev.general,
            logging: {
              ...prev.general.logging,
              [field]: value
            }
          }
        };
      } else {
        // Provider 配置
        return {
          ...prev,
          providers: prev.providers.map((p: ProviderConfig) => {
            if (p.id === section) {
              return { ...p, [field]: value };
            }
            return p;
          })
        };
      }
    });
  };

  const handleSelectDirectory = async (field: 'workspacePath' | 'logPath') => {
    try {
      const path = await window.electronAPI.openDirectoryDialog();
      if (path) {
        if (field === 'workspacePath') {
          handleConfigChange('general', 'workspacePath', path);
        } else if (field === 'logPath') {
          handleConfigChange('logging', 'savePath', path);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to select directory:', error);
      setToast({
        type: 'error',
        message: `选择目录失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      await window.electronAPI.saveSettings(config);
      setToast({
        type: 'success',
        message: '配置保存成功'
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to save config:', error);
      setToast({
        type: 'error',
        message: `保存配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    try {
      setIsTesting(true);
      if (!config) {
        throw new Error('Config not loaded');
      }
      const provider = config.providers.find((p: ProviderConfig) => p.id === providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const result = await window.electronAPI.testAPIConnection({
        type: providerId,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey
      });

      if (result.success) {
        // 更新模型列表
        setConfig((prev: AppConfig | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            providers: prev.providers.map((p: ProviderConfig) => {
            if (p.id === providerId) {
              return {
                ...p,
                models: result.models?.map((modelId: string) => ({
                  id: modelId,
                  name: modelId,
                  ctx: 'Available'
                })) || []
              };
            }
            return p;
          })
          };
        });

        setToast({
          type: 'success',
          message: `${provider.name} 连接成功！找到 ${result.models?.length || 0} 个模型`
        });
      } else {
        setToast({
          type: 'error',
          message: `${provider.name} 连接失败: ${result.error || '未知错误'}`
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to test connection:', error);
      setToast({
        type: 'error',
        message: `测试连接失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsTesting(false);
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

  const currentProvider = config.providers.find((p: ProviderConfig) => p.id === currentTab);

  return (
    <div className="settings-layout">
      {/* 侧边栏 */}
      <div className="settings-sidebar">
        <div className="settings-search-box">
          <input
            type="text"
            className="search-input"
            placeholder="搜索模型平台..."
          />
        </div>
        <div className="provider-list">
          {providers.map((provider) => {
            const providerConfig = config.providers.find((p: ProviderConfig) => p.id === provider.id);
            const isEnabled = providerConfig?.enabled ?? true;
            return (
              <div
                key={provider.id}
                className={`provider-item ${currentTab === provider.id ? 'active' : ''}`}
                onClick={() => handleTabChange(provider.id)}
              >
                <div className="provider-icon">{provider.icon}</div>
                <span>{provider.name}</span>
                {provider.id !== 'global' && (
                  <div className={`provider-status ${isEnabled ? 'on' : 'off'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="settings-content">
        {/* Global Defaults */}
        {currentTab === 'global' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">Global Defaults</div>
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
              </div>

              <div className="config-section">
                <div className="config-label">日志设置 (Logging)</div>
                <div className="input-group">
                  <label className="input-label">日志路径 (Log Directory)</label>
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
                  <label className="input-label">保留天数 (Retention Days)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={config.general.logging.retentionDays}
                    onChange={(e) => handleConfigChange('logging', 'retentionDays', parseInt(e.target.value))}
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

        {/* Provider Tabs */}
        {currentTab !== 'global' && currentProvider && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">
                {currentProvider.name}
                <span style={{ fontSize: '12px', fontWeight: 'normal', background: '#222', padding: '2px 8px', borderRadius: '10px', border: '1px solid #333', marginLeft: '10px' }}>
                  {currentProvider.type === 'local' ? 'Local' : currentProvider.type === 'cloud' ? 'Cloud' : 'Relay'}
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={currentProvider.enabled}
                  onChange={(e) => handleConfigChange(currentTab, 'enabled', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settings-scroll-area">
              <div className="config-section">
                <div className="config-label">{currentProvider.type === 'local' ? '连接设置 (Connection)' : '鉴权 (Authentication)'}</div>

                {currentProvider.apiKey !== undefined && (
                  <div className="input-group">
                    <label className="input-label">API Key</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder={`输入 ${currentProvider.name} API Key`}
                      value={currentProvider.apiKey || ''}
                      onChange={(e) => handleConfigChange(currentTab, 'apiKey', e.target.value)}
                    />
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Base URL</label>
                  <input
                    type="text"
                    className="input-field"
                    value={currentProvider.baseUrl}
                    onChange={(e) => handleConfigChange(currentTab, 'baseUrl', e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button onClick={() => handleTestConnection(currentTab)} disabled={isTesting}>
                    {isTesting ? '测试中...' : '测试连接 (Ping)'}
                  </Button>
                  <Button variant="primary" onClick={handleSaveConfig} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>

              {currentProvider.models && currentProvider.models.length > 0 && (
                <div className="config-section">
                  <div className="config-label">已添加模型 (Model Library)</div>
                  <div className="model-list-grid">
                    {currentProvider.models.map((model: Model) => (
                      <div key={model.id} className="model-item-card">
                        <div className="model-icon">{model.name.substring(0, 2).toUpperCase()}</div>
                        <div className="model-info">
                          <div className="model-id">{model.id}</div>
                          <div className="model-ctx">{model.ctx || 'Available'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
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

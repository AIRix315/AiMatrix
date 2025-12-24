import React, { useState, useEffect } from 'react';
import { Button, Loading, Toast } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import './Settings.css';

interface Provider {
  id: string;
  icon: string;
  name: string;
  status?: 'on' | 'off';
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
    id: 'silicon',
    icon: 'SF',
    name: 'SiliconFlow',
    status: 'on',
  },
];

const Settings: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('ollama');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [config, setConfig] = useState({
    global: {
      workspacePath: 'D:/Work/Matrix_Projects',
    },
    ollama: {
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      models: [
        { id: 'llama3:8b', name: 'llama3:8b', ctx: 'Chat / 8k' },
        { id: 'mistral:latest', name: 'mistral:latest', ctx: 'Chat / 32k' },
      ],
    },
    openai: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
    },
    silicon: {
      enabled: true,
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1',
    },
  });

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
  };

  const handleConfigChange = (provider: string, field: string, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSaveConfig = async (provider: string) => {
    try {
      setIsSaving(true);
      const providerConfig = config[provider as keyof typeof config];

      if ('apiKey' in providerConfig && providerConfig.apiKey && window.electronAPI?.setAPIKey) {
        await window.electronAPI.setAPIKey(provider, providerConfig.apiKey);
        setToast({
          type: 'success',
          message: `${provider} 配置保存成功`
        });
      } else {
        setToast({
          type: 'info',
          message: '配置已更新（本地）'
        });
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setToast({
        type: 'error',
        message: `保存配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    try {
      setIsTesting(true);
      if (window.electronAPI?.getAPIStatus) {
        const status = await window.electronAPI.getAPIStatus(provider);
        if (status.status === 'available') {
          setToast({
            type: 'success',
            message: `${provider} 连接成功`
          });
        } else {
          setToast({
            type: 'error',
            message: `${provider} 连接失败: ${status.error || '未知错误'}`
          });
        }
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      setToast({
        type: 'error',
        message: `测试连接失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsTesting(false);
    }
  };

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
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`provider-item ${currentTab === provider.id ? 'active' : ''}`}
              onClick={() => handleTabChange(provider.id)}
            >
              <div className="provider-icon">{provider.icon}</div>
              <span>{provider.name}</span>
              {provider.status && <div className={`provider-status ${provider.status}`}></div>}
            </div>
          ))}
          <div
            className={`provider-item ${currentTab === 'add' ? 'active' : ''}`}
            onClick={() => handleTabChange('add')}
          >
            <div className="provider-icon" style={{ color: 'var(--accent-color)' }}>+</div>
            <span style={{ color: 'var(--accent-color)' }}>添加服务商</span>
          </div>
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
                      value={config.global.workspacePath}
                      onChange={(e) => handleConfigChange('global', 'workspacePath', e.target.value)}
                      readOnly
                    />
                    <Button>浏览...</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ollama */}
        {currentTab === 'ollama' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">🦙 Ollama <span style={{ fontSize: '12px', fontWeight: 'normal', background: '#222', padding: '2px 8px', borderRadius: '10px', border: '1px solid #333' }}>Local</span></div>
              <label className="switch">
                <input type="checkbox" checked={config.ollama.enabled !== false} onChange={() => {}} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settings-scroll-area">
              <div className="config-section">
                <div className="config-label">连接设置 (Connection)</div>
                <div className="input-group">
                  <label className="input-label">API 域名 (Base URL)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.ollama.baseUrl}
                    onChange={(e) => handleConfigChange('ollama', 'baseUrl', e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button onClick={() => handleTestConnection('ollama')} disabled={isTesting}>
                    {isTesting ? '测试中...' : '测试连接 (Ping)'}
                  </Button>
                  <Button variant="primary" onClick={() => handleSaveConfig('ollama')} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
              <div className="config-section">
                <div className="config-label">已添加模型 (Model Library)</div>
                <div className="model-list-grid">
                  {config.ollama.models?.map((model) => (
                    <div key={model.id} className="model-item-card">
                      <div className="model-icon">{model.name.substring(0, 2)}</div>
                      <div className="model-info">
                        <div className="model-id">{model.id}</div>
                        <div className="model-ctx">{model.ctx}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OpenAI */}
        {currentTab === 'openai' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">OA OpenAI <span style={{ fontSize: '12px', fontWeight: 'normal', background: '#222', padding: '2px 8px', borderRadius: '10px', border: '1px solid #333' }}>Cloud</span></div>
              <label className="switch">
                <input type="checkbox" checked={config.openai.enabled !== false} onChange={() => {}} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settings-scroll-area">
              <div className="config-section">
                <div className="config-label">鉴权 (Authentication)</div>
                <div className="input-group">
                  <label className="input-label">API Key (sk-...)</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Paste your OpenAI key here"
                    value={config.openai.apiKey}
                    onChange={(e) => handleConfigChange('openai', 'apiKey', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Base URL (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://api.openai.com/v1"
                    value={config.openai.baseUrl}
                    onChange={(e) => handleConfigChange('openai', 'baseUrl', e.target.value)}
                  />
                </div>
                <Button variant="primary" onClick={() => handleSaveConfig('openai')} disabled={isSaving}>
                  {isSaving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SiliconFlow */}
        {currentTab === 'silicon' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg">SF SiliconFlow <span style={{ fontSize: '12px', fontWeight: 'normal', background: '#222', padding: '2px 8px', borderRadius: '10px', border: '1px solid #333' }}>Cloud / Relay</span></div>
              <label className="switch">
                <input type="checkbox" checked={config.silicon.enabled !== false} onChange={() => {}} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settings-scroll-area">
              <div className="config-section">
                <div className="config-label">配置 (Configuration)</div>
                <div className="input-group">
                  <label className="input-label">API Key</label>
                  <input
                    type="password"
                    className="input-field"
                    value={config.silicon.apiKey}
                    onChange={(e) => handleConfigChange('silicon', 'apiKey', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Base URL</label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.silicon.baseUrl}
                    onChange={(e) => handleConfigChange('silicon', 'baseUrl', e.target.value)}
                  />
                </div>
                <Button variant="primary" onClick={() => handleSaveConfig('silicon')} disabled={isSaving}>
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add New */}
        {currentTab === 'add' && (
          <div className="settings-tab-content active">
            <div className="settings-content-header">
              <div className="settings-title-lg" style={{ color: 'var(--accent-color)' }}>+ 添加新服务商 (Add Provider)</div>
            </div>
            <div className="settings-scroll-area">
              <div className="config-section">
                <div className="config-label">自定义接入 (Custom Endpoint)</div>
                <div className="input-group">
                  <label className="input-label">服务名称 (Display Name)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例如: My Private LLM"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">接口类型 (Protocol)</label>
                  <select className="input-field">
                    <option>OpenAI Compatible (Standard)</option>
                    <option>Anthropic</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Base URL</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
                <Button variant="primary">确认添加</Button>
              </div>
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
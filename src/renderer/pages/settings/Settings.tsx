/**
 * Settings 页面
 *
 * 功能：
 * - 基础设置：工作目录、日志地址、语言等
 * - 模型管理：Provider列表+详情（双面板布局）
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Package } from 'lucide-react';
import { Button, Toast } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import { ProviderListPanel } from './components/ProviderListPanel';
import { ProviderDetailPanel } from './components/ProviderDetailPanel';
import { AddProviderDialog } from './components/AddProviderDialog';
import './Settings.css';

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

// Provider 列表项接口
interface ProviderListItem {
  id: string;
  name: string;
  category: string;
  type?: 'official' | 'local' | 'relay';
  enabled: boolean;
  status?: 'online' | 'offline' | 'unknown';
}

// Provider 配置接口
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

const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab切换状态
  const [currentTab, setCurrentTab] = useState('models'); // 'general' | 'models'

  // 基础设置
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 模型管理（Provider管理）
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  );

  // Toast 通知
  const [toast, setToast] = useState<{
    type: ToastType;
    message: string;
  } | null>(null);

  // AddProviderDialog 状态
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);

  // 初始化：加载基础配置
  useEffect(() => {
    loadSettings();
  }, []);

  // 初始化：加载所有 Providers
  useEffect(() => {
    if (currentTab === 'models') {
      loadAllProviders();
    }
  }, [currentTab]);

  // URL 参数同步
  useEffect(() => {
    const providerId = searchParams.get('id');
    if (providerId && providers.some(p => p.id === providerId)) {
      setSelectedProviderId(providerId);
    } else if (providers.length > 0 && !selectedProviderId) {
      // 如果没有选中任何Provider，默认选中第一个
      setSelectedProviderId(providers[0].id);
      setSearchParams({ id: providers[0].id });
    }
  }, [searchParams, providers, selectedProviderId]);

  // 加载基础设置
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = (await window.electronAPI.getAllSettings()) as any;
      setConfig(settings);
    } catch (error) {
      showToast(
        'error',
        `加载配置失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 保存基础设置
  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      if (!config) return;
      await window.electronAPI.saveSettings(config as any);
      showToast('success', '配置保存成功');
    } catch (error) {
      showToast(
        'error',
        `保存配置失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 选择目录
  const handleSelectDirectory = async (field: 'workspacePath' | 'logPath') => {
    try {
      const path = await window.electronAPI.openDirectoryDialog();
      if (path && config) {
        if (field === 'workspacePath') {
          setConfig({
            ...config,
            general: {
              ...config.general,
              workspacePath: path,
            },
          });
        } else if (field === 'logPath') {
          setConfig({
            ...config,
            general: {
              ...config.general,
              logging: {
                ...config.general.logging,
                savePath: path,
              },
            },
          });
        }
      }
    } catch (error) {
      showToast(
        'error',
        `选择目录失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // 加载所有 Providers（不分类）
  const loadAllProviders = async () => {
    try {
      setIsLoading(true);

      // 调用 IPC 获取所有 Providers
      const allProviders = await window.electronAPI.listProviders({
        enabledOnly: false,
      });

      // 转换为列表项格式，直接从配置文件读取状态
      const providerList: ProviderListItem[] = allProviders.map((p: any) => {
        // 映射持久化状态：'available' -> 'online', 'unavailable' -> 'offline'
        let displayStatus: 'online' | 'offline' | 'unknown' = 'unknown';
        if (p.lastStatus === 'available') {
          displayStatus = 'online';
        } else if (p.lastStatus === 'unavailable') {
          displayStatus = 'offline';
        }

        return {
          id: p.id,
          name: p.name,
          category: p.category || 'unknown',
          type: p.type as 'official' | 'local' | 'relay' | undefined,
          enabled: p.enabled || false,
          status: displayStatus,
        };
      });

      setProviders(providerList);
    } catch (error) {
      showToast(
        'error',
        `加载失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 更新 Provider 状态
  const updateProviderStatus = (
    providerId: string,
    status: 'online' | 'offline' | 'unknown'
  ) => {
    setProviders(prev =>
      prev.map(p => (p.id === providerId ? { ...p, status } : p))
    );
  };

  // 选中 Provider
  const handleSelectProvider = (id: string) => {
    setSelectedProviderId(id);
    setSearchParams({ id });
  };

  // 添加 Provider
  const handleAddProvider = () => {
    setShowAddProviderDialog(true);
  };

  // Provider 配置更新
  const handleProviderUpdate = async (providerConfig: ProviderConfig) => {
    try {
      await window.electronAPI.addProvider(providerConfig);

      // 只更新对应的 Provider，保持其他 Provider 的状态
      setProviders(prev =>
        prev.map(p =>
          p.id === providerConfig.id
            ? {
                ...p,
                name: providerConfig.name,
                enabled: providerConfig.enabled,
                category: providerConfig.category,
              }
            : p
        )
      );

      showToast('success', 'Provider 配置已更新');
    } catch (error) {
      showToast(
        'error',
        `更新失败: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  };

  // Provider 删除
  const handleProviderRemove = async (providerId: string) => {
    try {
      await window.electronAPI.removeProvider(providerId);

      // 重新加载 Providers
      await loadAllProviders();

      // 如果删除的是当前选中的，清空选择
      if (selectedProviderId === providerId) {
        setSelectedProviderId(null);
        setSearchParams({});
      }

      showToast('success', 'Provider 已删除');
    } catch (error) {
      showToast(
        'error',
        `删除失败: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  };

  // Provider 连接测试
  const handleTestConnection = async (providerId: string) => {
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // 获取完整的 Provider 配置
      const providerConfig = (await window.electronAPI.getProvider(
        providerId
      )) as any;

      const result = await window.electronAPI.testProviderConnection({
        providerId,
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey,
      });

      if ((result as any).success) {
        // 连接成功：启用Provider，设置状态为online
        updateProviderStatus(providerId, 'online');
        await window.electronAPI.addProvider({
          ...providerConfig,
          enabled: true,
          // 不保存 models 字段，检测结果只是临时数据
        });

        // 更新UI状态
        setProviders(prev =>
          prev.map(p =>
            p.id === providerId
              ? { ...p, enabled: true, status: 'online' }
              : p
          )
        );

        const successMsg = (result as any).message || '连接测试成功';
        showToast('success', successMsg);

        // 返回检测结果（包含 models 列表）
        return result;
      } else {
        // 连接失败：禁用Provider，设置状态为offline
        updateProviderStatus(providerId, 'offline');
        await window.electronAPI.addProvider({
          ...providerConfig,
          enabled: false,
        });

        // 更新UI状态
        setProviders(prev =>
          prev.map(p =>
            p.id === providerId
              ? { ...p, enabled: false, status: 'offline' }
              : p
          )
        );

        const errorMsg = (result as any).error || '连接失败';
        showToast('warning', `${provider.name} 连接失败，已自动禁用: ${errorMsg}`);
      }
    } catch (error) {
      // 连接异常：禁用Provider，设置状态为offline
      updateProviderStatus(providerId, 'offline');
      const providerConfig = (await window.electronAPI.getProvider(
        providerId
      )) as any;
      await window.electronAPI.addProvider({
        ...providerConfig,
        enabled: false,
      });

      // 更新UI状态
      setProviders(prev =>
        prev.map(p =>
          p.id === providerId
            ? { ...p, enabled: false, status: 'offline' }
            : p
        )
      );

      const errorMsg = error instanceof Error ? error.message : String(error);
      showToast('error', `连接测试失败，已自动禁用: ${errorMsg}`);
    }
  };

  // 显示 Toast
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  if (isLoading || !config) {
    return (
      <div className="settings-layout">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <div>加载配置中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-layout">
      {/* 左侧：Tab导航 */}
      <div className="settings-sidebar">
        <div className="settings-search-box">
          <input
            type="text"
            className="search-input"
            placeholder="搜索配置项..."
          />
        </div>
        <div className="provider-list">
          {/* 基础设置 */}
          <div
            className={`provider-item ${currentTab === 'general' ? 'active' : ''}`}
            onClick={() => setCurrentTab('general')}
          >
            <div className="provider-icon">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <span>基础设置</span>
          </div>

          <div className="settings-divider-sidebar"></div>

          {/* 模型管理 */}
          <div
            className={`provider-item ${currentTab === 'models' ? 'active' : ''}`}
            onClick={() => setCurrentTab('models')}
          >
            <div className="provider-icon">
              <Package className="h-5 w-5" />
            </div>
            <span>模型管理</span>
          </div>
        </div>
      </div>

      {/* 右侧：内容区域 */}
      <div className="settings-content">
        {/* 基础设置Tab */}
        {currentTab === 'general' && (
          <div className="settings-scroll-area">
            <h2 className="settings-title-lg">基础设置</h2>

            <div className="config-section">
              <h3 className="config-label">工作空间</h3>
              <div className="input-group">
                <label>工作目录</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={config.general.workspacePath}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                  <Button
                    onClick={() => handleSelectDirectory('workspacePath')}
                  >
                    选择
                  </Button>
                </div>
              </div>
            </div>

            <div className="config-section">
              <h3 className="config-label">日志设置</h3>
              <div className="input-group">
                <label>日志保存路径</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={config.general.logging.savePath}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                  <Button onClick={() => handleSelectDirectory('logPath')}>
                    选择
                  </Button>
                </div>
              </div>
              <div className="input-group">
                <label>日志保留天数</label>
                <input
                  type="number"
                  value={config.general.logging.retentionDays}
                  onChange={e =>
                    setConfig({
                      ...config,
                      general: {
                        ...config.general,
                        logging: {
                          ...config.general.logging,
                          retentionDays: parseInt(e.target.value) || 7,
                        },
                      },
                    })
                  }
                  style={{
                    width: '200px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存设置'}
              </Button>
            </div>
          </div>
        )}

        {/* 模型管理Tab（双面板布局） */}
        {currentTab === 'models' && (
          <div style={{ display: 'flex', flex: 1, height: '100%' }}>
            {/* 左侧：Provider 列表 */}
            <ProviderListPanel
              providers={providers}
              selectedProviderId={selectedProviderId}
              onSelectProvider={handleSelectProvider}
              onAddProvider={handleAddProvider}
            />

            {/* 右侧：Provider 详情 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {selectedProviderId ? (
                <ProviderDetailPanel
                  key={selectedProviderId}
                  providerId={selectedProviderId}
                  onUpdate={handleProviderUpdate}
                  onRemove={handleProviderRemove}
                  onTestConnection={handleTestConnection}
                />
              ) : (
                <div className="provider-detail-empty">
                  <p>请从左侧列表选择一个 Provider</p>
                  <p
                    style={{
                      fontSize: '12px',
                      marginTop: '8px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    或点击"添加"按钮添加新的 Provider
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AddProviderDialog 对话框 */}
      {showAddProviderDialog && (
        <AddProviderDialog
          isOpen={showAddProviderDialog}
          onSave={async config => {
            // 保存 Provider
            await handleProviderUpdate(config as ProviderConfig);

            // 刷新 Provider 列表
            await loadAllProviders();

            // 关闭对话框
            setShowAddProviderDialog(false);

            // 选中新创建的 Provider
            if (config && typeof config === 'object' && 'id' in config) {
              handleSelectProvider(config.id as string);
            }
          }}
          onClose={() => setShowAddProviderDialog(false)}
        />
      )}

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

import React, { useState, useEffect } from 'react';
import { Card, Button, Loading, Toast, ConfirmDialog, Modal } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
import './Plugins.css';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string;
  type: 'official' | 'community';
  isEnabled: boolean;
  permissions: string[];
  path: string;
}

const Plugins: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [uninstallConfirm, setUninstallConfirm] = useState<{ pluginId: string; pluginName: string } | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.listPlugins) {
        const pluginList = await window.electronAPI.listPlugins();
        setPlugins(pluginList || []);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
      setToast({
        type: 'error',
        message: `加载插件列表失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPlugin = (plugin: PluginInfo) => {
    setSelectedPlugin(plugin);
  };

  const handleInstallPlugin = async () => {
    try {
      if (!window.electronAPI?.selectFiles) return;

      // 打开文件选择对话框
      const result = await window.electronAPI.selectFiles({
        filters: [{ name: '插件包', extensions: ['zip'] }]
      });

      if (result.canceled || !result.filePaths.length) return;

      setIsInstalling(true);

      // 安装插件（默认为社区插件）
      if (window.electronAPI?.installPluginFromZip) {
        const pluginInfo = await window.electronAPI.installPluginFromZip(
          result.filePaths[0],
          'community'
        );

        setToast({
          type: 'success',
          message: `插件 "${pluginInfo.name}" 安装成功`
        });

        // 重新加载插件列表
        await loadPlugins();

        // 切换到已安装视图
        setShowInstallModal(false);
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      setToast({
        type: 'error',
        message: `插件安装失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      if (window.electronAPI?.uninstallPlugin) {
        await window.electronAPI.uninstallPlugin(pluginId);
        setToast({
          type: 'success',
          message: '插件卸载成功'
        });
        await loadPlugins();
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      setToast({
        type: 'error',
        message: `卸载插件失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setUninstallConfirm(null);
    }
  };

  const officialPlugins = plugins.filter(p => p.type === 'official');
  const communityPlugins = plugins.filter(p => p.type === 'community');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">插件 <small>| 插件市场 (Plugin Market)</small></div>
        <div className="view-actions">
          <div className="view-switch-container">
            <div
              className={`view-switch-btn ${!showInstallModal ? 'active' : ''}`}
              onClick={() => setShowInstallModal(false)}
            >
              已安装
            </div>
            <div
              className={`view-switch-btn ${showInstallModal ? 'active' : ''}`}
              onClick={() => setShowInstallModal(true)}
            >
              插件市场
            </div>
          </div>
          <Button variant="primary" onClick={handleInstallPlugin} disabled={isInstalling}>
            {isInstalling ? '安装中...' : '+ 从ZIP安装'}
          </Button>
        </div>
      </div>

      <div className="dashboard-content">
        {isLoading ? (
          <Loading size="lg" message="加载插件列表..." fullscreen={false} />
        ) : showInstallModal ? (
          <div className="empty-state">
            <div className="empty-icon">🧩</div>
            <h2>插件市场</h2>
            <p>浏览和安装社区插件（功能开发中）</p>
            <Button variant="primary" onClick={handleInstallPlugin} disabled={isInstalling}>
              {isInstalling ? '安装中...' : '从ZIP文件安装插件'}
            </Button>
          </div>
        ) : (
          <>
            {/* 官方插件 */}
            {officialPlugins.length > 0 && (
              <div className="plugin-section">
                <h3 className="section-title">官方插件</h3>
                <div className="card-grid">
                  {officialPlugins.map((plugin) => (
                    <div key={plugin.id} className="plugin-card-wrapper">
                      <Card
                        tag="Official"
                        image={plugin.icon || '🧩'}
                        title={plugin.name}
                        info={`v${plugin.version} | ${plugin.author}`}
                        hoverable
                        onClick={() => handleOpenPlugin(plugin)}
                      />
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUninstallConfirm({ pluginId: plugin.id, pluginName: plugin.name });
                        }}
                        title="卸载插件"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 社区插件 */}
            {communityPlugins.length > 0 && (
              <div className="plugin-section">
                <h3 className="section-title">社区插件</h3>
                <div className="card-grid">
                  {communityPlugins.map((plugin) => (
                    <div key={plugin.id} className="plugin-card-wrapper">
                      <Card
                        tag="Community"
                        image={plugin.icon || '🧩'}
                        title={plugin.name}
                        info={plugin.description}
                        hoverable
                        onClick={() => handleOpenPlugin(plugin)}
                      />
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUninstallConfirm({ pluginId: plugin.id, pluginName: plugin.name });
                        }}
                        title="卸载插件"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plugins.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🧩</div>
                <h2>暂无插件</h2>
                <p>浏览插件市场以扩展功能</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 插件详情模态框 */}
      {selectedPlugin && (
        <Modal
          isOpen={true}
          title={selectedPlugin.name}
          onClose={() => setSelectedPlugin(null)}
          width="600px"
        >
          <div className="plugin-details">
            <div className="plugin-icon">{selectedPlugin.icon || '🧩'}</div>
            <div className="plugin-info-group">
              <label>版本:</label>
              <span>{selectedPlugin.version}</span>
            </div>
            <div className="plugin-info-group">
              <label>作者:</label>
              <span>{selectedPlugin.author}</span>
            </div>
            <div className="plugin-info-group">
              <label>描述:</label>
              <span>{selectedPlugin.description}</span>
            </div>
            <div className="plugin-info-group">
              <label>类型:</label>
              <span>{selectedPlugin.type === 'official' ? '官方' : '社区'}</span>
            </div>
            <div className="plugin-info-group">
              <label>状态:</label>
              <span>{selectedPlugin.isEnabled ? '已启用' : '已禁用'}</span>
            </div>
            <div className="plugin-info-group">
              <label>权限:</label>
              <span>{selectedPlugin.permissions.join(', ') || '无'}</span>
            </div>
            <div className="plugin-info-group">
              <label>路径:</label>
              <span className="path-text">{selectedPlugin.path}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 卸载确认对话框 */}
      {uninstallConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="卸载插件"
          message={`确定要卸载插件 "${uninstallConfirm.pluginName}" 吗？`}
          type="warning"
          confirmText="卸载"
          cancelText="取消"
          onConfirm={() => handleUninstallPlugin(uninstallConfirm.pluginId)}
          onCancel={() => setUninstallConfirm(null)}
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

export default Plugins;
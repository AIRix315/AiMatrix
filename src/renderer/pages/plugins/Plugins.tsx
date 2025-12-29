import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Pin, Trash2 } from 'lucide-react';
import { Card, Button, Loading, Toast, ConfirmDialog, Modal, ViewSwitcher } from '../../components/common';
import type { ToastType } from '../../components/common/Toast';
// import MarketPluginCard from './components/MarketPluginCard';
// import { MarketPluginInfo, POPULAR_TAGS } from '../../../shared/types/plugin-market';
import { ShortcutType } from '../../../common/types';
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
  const location = useLocation();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [uninstallConfirm, setUninstallConfirm] = useState<{ pluginId: string; pluginName: string } | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 市场相关状态（暂时保留，未来开发使用）
  // const [marketPlugins, setMarketPlugins] = useState<MarketPluginInfo[]>([]);
  // const [marketLoading, setMarketLoading] = useState(false);
  // const [searchKeyword, setSearchKeyword] = useState('');
  // const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'updated'>('downloads');

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.listPlugins) {
        const pluginList = await window.electronAPI.listPlugins();
        setPlugins(pluginList || []);

        // 检查是否从快捷方式跳转过来，自动选中对应插件
        const state = location.state as { selectedPluginId?: string } | null;
        if (state?.selectedPluginId) {
          const targetPlugin = pluginList.find(p => p.id === state.selectedPluginId);
          if (targetPlugin) {
            setSelectedPlugin(targetPlugin);
            setToast({
              type: 'info',
              message: `已选中插件: ${targetPlugin.name}`
            });
          } else {
            setToast({
              type: 'warning',
              message: `插件 "${state.selectedPluginId}" 未安装或未找到`
            });
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Failed to load plugins:', error);
      setToast({
        type: 'error',
        message: `加载插件列表失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 加载市场插件列表（暂时禁用，市场开发中）
  // const loadMarketPlugins = async () => {
  //   try {
  //     setMarketLoading(true);
  //     if (window.electronAPI?.getMarketPlugins) {
  //       const plugins = await window.electronAPI.getMarketPlugins({
  //         tag: selectedTag || undefined,
  //         search: searchKeyword || undefined,
  //         sortBy
  //       });
  //       setMarketPlugins(plugins || []);
  //     }
  //   } catch (error) {
  //     setToast({
  //       type: 'error',
  //       message: `加载市场插件失败: ${error instanceof Error ? error.message : String(error)}`
  //     });
  //   } finally {
  //     setMarketLoading(false);
  //   }
  // };

  // 当切换到市场视图或筛选条件改变时，加载市场数据（暂时禁用）
  // useEffect(() => {
  //   if (showInstallModal) {
  //     loadMarketPlugins();
  //   }
  // }, [showInstallModal, selectedTag, searchKeyword, sortBy]);

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
      // eslint-disable-next-line no-console
      // console.error('Failed to install plugin:', error);
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
      // eslint-disable-next-line no-console
      // console.error('Failed to uninstall plugin:', error);
      setToast({
        type: 'error',
        message: `卸载插件失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setUninstallConfirm(null);
    }
  };

  const handlePinPlugin = async (e: React.MouseEvent, plugin: PluginInfo) => {
    e.stopPropagation();
    try {
      await window.electronAPI.addShortcut({
        type: ShortcutType.PLUGIN,
        targetId: plugin.id,
        name: plugin.name,
        icon: plugin.icon || '🧩'
      });
      setToast({
        type: 'success',
        message: `插件 "${plugin.name}" 已添加到菜单栏`
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `添加快捷方式失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // 查看市场插件详情（暂时禁用，市场开发中）
  // const handleViewPluginDetails = (plugin: MarketPluginInfo) => {
  //   if (!plugin.downloadUrl) {
  //     setToast({
  //       type: 'info',
  //       message: `${plugin.name} 是系统内置插件，已预装在 plugins/${plugin.type}/ 目录`
  //     });
  //     return;
  //   }
  //   if (plugin.repository) {
  //     setToast({
  //       type: 'info',
  //       message: `插件仓库: ${plugin.repository}。请访问仓库页面下载ZIP文件，然后使用"从ZIP安装"功能安装。`
  //     });
  //   } else {
  //     setToast({
  //       type: 'info',
  //       message: '该插件暂无仓库信息。请从开发者处获取ZIP文件后使用"从ZIP安装"功能。'
  //     });
  //   }
  // };

  const officialPlugins = plugins.filter(p => p.type === 'official');
  const communityPlugins = plugins.filter(p => p.type === 'community');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">插件 <small>| 插件市场 (Plugin Market)</small></div>
        <div className="view-actions">
          <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="dashboard-content">
        {/* Tab 切换 */}
        <div className="content-tab-switcher">
          <div className="tab-buttons">
            <button
              className={`content-tab-btn ${!showInstallModal ? 'active' : ''}`}
              onClick={() => setShowInstallModal(false)}
            >
              已安装
            </button>
            <button
              className={`content-tab-btn ${showInstallModal ? 'active' : ''}`}
              onClick={() => setShowInstallModal(true)}
            >
              插件市场
            </button>
          </div>
          <Button variant="primary" onClick={handleInstallPlugin} disabled={isInstalling}>
            {isInstalling ? '安装中...' : '+ 从ZIP安装'}
          </Button>
        </div>
        {isLoading ? (
          <Loading size="lg" message="加载插件列表..." fullscreen={false} />
        ) : showInstallModal ? (
          <div className="market-view">
            {/* 插件市场 - 开发中 */}
            <div className="empty-state">
              <div className="empty-icon">🚧</div>
              <h2>插件市场开发中</h2>
              <p>插件市场功能正在开发中，敬请期待</p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                当前请使用"从ZIP安装"功能手动安装插件
              </p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          // 列表视图
          <>
            {/* 官方插件 */}
            {officialPlugins.length > 0 && (
              <div className="plugin-section">
                <h3 className="section-title">官方插件</h3>
                <div className="plugin-list">
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
                      <div className="card-actions">
                        <button
                          className="pin-btn"
                          onClick={(e) => handlePinPlugin(e, plugin)}
                          title="添加到菜单栏"
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUninstallConfirm({ pluginId: plugin.id, pluginName: plugin.name });
                          }}
                          title="卸载插件"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 社区插件 */}
            {communityPlugins.length > 0 && (
              <div className="plugin-section">
                <h3 className="section-title">社区插件</h3>
                <div className="plugin-list">
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
                      <div className="card-actions">
                        <button
                          className="pin-btn"
                          onClick={(e) => handlePinPlugin(e, plugin)}
                          title="添加到菜单栏"
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUninstallConfirm({ pluginId: plugin.id, pluginName: plugin.name });
                          }}
                          title="卸载插件"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
        ) : (
          // 网格视图
          <>
            {/* 官方插件 */}
            {officialPlugins.length > 0 && (
              <div className="plugin-section">
                <h3 className="section-title">官方插件</h3>
                <div className="project-grid">
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
                      <div className="card-actions">
                        <button
                          className="pin-btn"
                          onClick={(e) => handlePinPlugin(e, plugin)}
                          title="添加到菜单栏"
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUninstallConfirm({ pluginId: plugin.id, pluginName: plugin.name });
                          }}
                          title="卸载插件"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 社区插件 */}
            {communityPlugins.length > 0 && (
              <div className="plugin-section">
                <h3 className="section-title">社区插件</h3>
                <div className="project-grid">
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
                      <div className="card-actions">
                        <button
                          className="pin-btn"
                          onClick={(e) => handlePinPlugin(e, plugin)}
                          title="添加到菜单栏"
                        >
                          <Pin size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUninstallConfirm({ pluginId: plugin.id, pluginName: plugin.name });
                          }}
                          title="卸载插件"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
              <label>启用状态:</label>
              <label className="plugin-toggle">
                <input
                  type="checkbox"
                  checked={selectedPlugin.isEnabled}
                  onChange={async (e) => {
                    try {
                      await window.electronAPI?.togglePlugin(selectedPlugin.id, e.target.checked);
                      // 更新本地状态
                      setSelectedPlugin({
                        ...selectedPlugin,
                        isEnabled: e.target.checked
                      });
                      // 刷新插件列表
                      await loadPlugins();
                      setToast({
                        type: 'success',
                        message: `插件已${e.target.checked ? '启用' : '禁用'}`
                      });
                    } catch (error) {
                      setToast({
                        type: 'error',
                        message: `切换失败: ${error instanceof Error ? error.message : String(error)}`
                      });
                    }
                  }}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
              </label>
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
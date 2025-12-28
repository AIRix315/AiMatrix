import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, ChevronDown } from 'lucide-react';
import type { APIProviderConfig, APICategory } from '../../../../shared/types/api';
import './ExecuteNode.css';

export interface ExecuteNodeData {
  label?: string;
  providerId?: string;
  category?: APICategory;
  parameters?: Record<string, unknown>;
  onSettingsClick?: (nodeId: string, data: ExecuteNodeData) => void;
}

/**
 * Execute节点组件
 * - 有左右端口
 * - Provider选择下拉框
 * - 参数配置
 * - 右侧面板联动
 */
const ExecuteNode: React.FC<NodeProps<ExecuteNodeData>> = ({ id, data, selected }) => {
  const [providers, setProviders] = useState<APIProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>(data.providerId || '');
  const [showDropdown, setShowDropdown] = useState(false);

  // 加载可用的Provider列表
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      if (window.electronAPI?.listProviders) {
        const providerList = await window.electronAPI.listProviders({ enabledOnly: true });
        // 根据节点指定的category过滤Provider（如果有）
        const filteredProviders = data.category
          ? providerList.filter((p: APIProviderConfig) => p.category === data.category && p.enabled)
          : providerList.filter((p: APIProviderConfig) => p.enabled);
        setProviders(filteredProviders);
      }
    } catch (error) {
      console.error('加载Provider列表失败:', error);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setShowDropdown(false);
    // 更新节点数据
    data.providerId = providerId;
  };

  const handleSettingsClick = () => {
    // 触发右侧面板联动
    if (data.onSettingsClick) {
      data.onSettingsClick(id, data);
    }
  };

  const selectedProviderObj = providers.find((p) => p.id === selectedProvider);

  return (
    <div className={`custom-node execute-node ${selected ? 'selected' : ''}`}>
      {/* 左侧输入端口 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="node-handle node-handle-input"
      />

      {/* 节点标题 */}
      <div className="node-header">
        <span className="node-icon">⚙️</span>
        <span className="node-title">{data.label || 'Execute'}</span>
        <button
          className="settings-btn"
          onClick={handleSettingsClick}
          title="配置参数"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* 节点内容 */}
      <div className="node-body">
        {/* Provider选择下拉框 */}
        <div className="provider-selector">
          <label className="provider-label">Provider:</label>
          <div className="dropdown-wrapper">
            <button
              className="dropdown-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="dropdown-text">
                {selectedProviderObj ? selectedProviderObj.name : '选择Provider'}
              </span>
              <ChevronDown
                size={14}
                className={`dropdown-icon ${showDropdown ? 'rotated' : ''}`}
              />
            </button>

            {showDropdown && (
              <div className="dropdown-menu">
                {providers.length === 0 ? (
                  <div className="dropdown-item disabled">无可用Provider</div>
                ) : (
                  providers.map((provider) => (
                    <div
                      key={provider.id}
                      className={`dropdown-item ${
                        selectedProvider === provider.id ? 'active' : ''
                      }`}
                      onClick={() => handleProviderSelect(provider.id)}
                    >
                      {provider.name}
                      <span className="provider-category">{provider.category}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 参数预览 */}
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="parameters-preview">
            <div className="parameters-count">
              {Object.keys(data.parameters).length} 个参数已配置
            </div>
          </div>
        )}
      </div>

      {/* 右侧输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="node-handle node-handle-output"
      />
    </div>
  );
};

export default memo(ExecuteNode);

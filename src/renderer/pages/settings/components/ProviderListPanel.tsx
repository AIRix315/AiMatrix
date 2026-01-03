/**
 * ProviderListPanel 组件
 *
 * 功能：
 * - 显示所有 Provider 的扁平列表
 * - 顶部搜索框支持实时过滤
 * - Provider 项包含：图标、名称、分类标签、状态徽章
 * - 点击选中高亮
 * - 底部"添加"按钮
 */

import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/common';
import './ProviderListPanel.css';

interface ProviderListItem {
  id: string;
  name: string;
  category: string;
  type?: 'official' | 'local' | 'relay';
  enabled: boolean;
  status?: 'online' | 'offline' | 'unknown';
}

interface ProviderListPanelProps {
  providers: ProviderListItem[];
  selectedProviderId: string | null;
  onSelectProvider: (id: string) => void;
  onAddProvider: () => void;
}

// Provider 类型显示名称映射
const TYPE_LABELS: Record<string, string> = {
  'official': '官方',
  'local': '本地',
  'relay': '中转'
};

export const ProviderListPanel: React.FC<ProviderListPanelProps> = ({
  providers,
  selectedProviderId,
  onSelectProvider,
  onAddProvider
}) => {
  const [searchText, setSearchText] = useState('');

  // 过滤 Provider
  const filteredProviders = useMemo(() => {
    if (!searchText.trim()) {
      return providers;
    }

    const lowerSearch = searchText.toLowerCase();
    return providers.filter(provider =>
      provider.name.toLowerCase().includes(lowerSearch) ||
      provider.id.toLowerCase().includes(lowerSearch) ||
      provider.category.toLowerCase().includes(lowerSearch)
    );
  }, [providers, searchText]);

  // 获取状态徽章类名
  const getStatusBadgeClass = (status?: string) => {
    if (!status || status === 'unknown') return 'provider-status-badge unknown';
    return status === 'online'
      ? 'provider-status-badge online'
      : 'provider-status-badge offline';
  };

  return (
    <div className="provider-list-panel">
      {/* 搜索框 */}
      <div className="provider-search">
        <input
          type="text"
          className="search-input"
          placeholder="搜索模型平台..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* Provider 列表 */}
      <div className="provider-list-scroll">
        {filteredProviders.length === 0 ? (
          <div className="provider-empty-state">
            <p>未找到匹配的 Provider</p>
          </div>
        ) : (
          filteredProviders.map(provider => (
            <div
              key={provider.id}
              className={`provider-item ${selectedProviderId === provider.id ? 'active' : ''}`}
              onClick={() => onSelectProvider(provider.id)}
            >
              {/* Provider 图标（首字母） */}
              <div className="provider-icon">
                {provider.name.charAt(0).toUpperCase()}
              </div>

              {/* Provider 名称 */}
              <span className="provider-name">{provider.name}</span>

              {/* Provider 类型标签 */}
              {provider.type && (
                <span className="provider-type-tag">
                  {TYPE_LABELS[provider.type] || provider.type}
                </span>
              )}

              {/* 状态徽章 */}
              <div className={getStatusBadgeClass(provider.status)} />
            </div>
          ))
        )}
      </div>

      {/* 添加按钮 */}
      <div className="provider-add-button-wrapper">
        <Button
          variant="primary"
          onClick={onAddProvider}
          className="provider-add-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          添加
        </Button>
      </div>
    </div>
  );
};

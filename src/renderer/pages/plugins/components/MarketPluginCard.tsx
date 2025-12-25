/**
 * 插件市场卡片组件
 * 用于展示插件市场中的单个插件信息
 */

import React from 'react';
import { MarketPluginInfo } from '../../../../shared/types/plugin-market';
import { Button } from '../../../components/common';

interface MarketPluginCardProps {
  plugin: MarketPluginInfo;
  onViewDetails: (plugin: MarketPluginInfo) => void;
}

const MarketPluginCard: React.FC<MarketPluginCardProps> = ({ plugin, onViewDetails }) => {
  // 检查是否为内置插件（downloadUrl为空）
  const isBuiltin = !plugin.downloadUrl;

  return (
    <div className="market-plugin-card">
      <div className="plugin-header">
        <span className="plugin-icon">{plugin.icon || '🧩'}</span>
        <div className="plugin-badges">
          {plugin.verified && <span className="verified-badge">✓ 官方认证</span>}
          {isBuiltin && <span className="builtin-badge">内置</span>}
        </div>
      </div>

      <h3 className="plugin-title">{plugin.name}</h3>
      <p className="plugin-version">v{plugin.version}</p>
      <p className="plugin-description">{plugin.description}</p>

      <div className="plugin-stats">
        <span className="stat-item" title="评分">
          ⭐ {plugin.rating.toFixed(1)}
          <span className="stat-label">({plugin.reviewCount})</span>
        </span>
        <span className="stat-item" title="下载量">
          ⬇️ {plugin.downloads.toLocaleString()}
        </span>
      </div>

      <div className="plugin-tags">
        {plugin.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
        {plugin.tags.length > 3 && <span className="tag more-tags">+{plugin.tags.length - 3}</span>}
      </div>

      <div className="plugin-footer">
        <span className="plugin-author">by {plugin.author}</span>
        <Button
          variant={isBuiltin ? 'ghost' : 'primary'}
          onClick={() => onViewDetails(plugin)}
        >
          {isBuiltin ? '查看详情' : '查看仓库'}
        </Button>
      </div>
    </div>
  );
};

export default MarketPluginCard;

/**
 * ToolsTab - 工具TAB
 * 显示关联资产和快捷操作
 */

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../common';

interface LinkedAsset {
  id: string;
  name: string;
  type: 'style' | 'character' | 'prop' | 'other';
}

interface ToolsTabProps {
  linkedAssets?: LinkedAsset[];
  onRemoveAsset?: (assetId: string) => void;
  onAddAsset?: () => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  linkedAssets = [],
  onRemoveAsset,
  onAddAsset,
}) => {
  return (
    <div className="tools-tab">
      <h4 className="text-sm font-medium mb-3">关联资产</h4>
      {linkedAssets.length > 0 ? (
        <div className="asset-tags space-y-2 mb-4">
          {linkedAssets.map((asset) => (
            <div key={asset.id} className="asset-tag">
              <span className="tag-name">{asset.name}</span>
              <span className="tag-type text-xs text-muted-foreground">({asset.type})</span>
              {onRemoveAsset && (
                <button
                  className="tag-remove"
                  onClick={() => onRemoveAsset(asset.id)}
                  title="移除关联"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-text mb-4">无关联资产</p>
      )}

      {onAddAsset && (
        <Button variant="ghost" size="sm" onClick={onAddAsset} className="w-full">
          添加资产
        </Button>
      )}
    </div>
  );
};

/**
 * PropertiesTab - 属性TAB
 * 显示当前选中项的基本信息
 */

import React from 'react';
import { SelectedItem } from '../../../contexts/SelectionContext';

interface PropertiesTabProps {
  selectedItem: SelectedItem | null;
  selectedCount: number;
}

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  selectedItem,
  selectedCount,
}) => {
  return (
    <div className="properties-tab">
      <h4 className="text-sm font-medium mb-3">选中项信息</h4>
      {selectedItem ? (
        <div className="space-y-2">
          <div className="property-row">
            <span className="property-label">名称:</span>
            <span className="property-value">{selectedItem.name}</span>
          </div>
          <div className="property-row">
            <span className="property-label">类型:</span>
            <span className="property-value">{selectedItem.type}</span>
          </div>
          {selectedItem.provider && (
            <div className="property-row">
              <span className="property-label">Provider:</span>
              <span className="property-value">{selectedItem.provider}</span>
            </div>
          )}
          {selectedCount > 1 && (
            <div className="batch-indicator">
              已选中 {selectedCount} 项（批量编辑）
            </div>
          )}
        </div>
      ) : (
        <p className="empty-text">未选中任何项目</p>
      )}
    </div>
  );
};

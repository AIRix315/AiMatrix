import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Search, FileImage, FileVideo, FileAudio, FileText, File } from 'lucide-react';
import type { AssetType, AssetMetadata } from '../../../../shared/types/asset';
import './InputNode.css';

export interface InputNodeData {
  label?: string;
  assetType?: AssetType;
  selectedAssets?: AssetMetadata[];
  searchQuery?: string;
}

/**
 * Input节点组件
 * - 无左端口，有右端口
 * - 资源类型选择
 * - 拖拽资产
 * - 搜索框
 */
const InputNode: React.FC<NodeProps<InputNodeData>> = ({ data, selected }) => {
  const [assetType, setAssetType] = useState<AssetType>(data.assetType || 'image');
  const [searchQuery, setSearchQuery] = useState(data.searchQuery || '');
  const [selectedAssets, setSelectedAssets] = useState<AssetMetadata[]>(data.selectedAssets || []);

  const assetTypeIcons: Record<AssetType, React.ReactNode> = {
    image: <FileImage size={16} />,
    video: <FileVideo size={16} />,
    audio: <FileAudio size={16} />,
    text: <FileText size={16} />,
    other: <File size={16} />
  };

  const assetTypeLabels: Record<AssetType, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
    text: '文本',
    other: '其他'
  };

  const handleAssetTypeChange = (type: AssetType) => {
    setAssetType(type);
    // 更新节点数据
    if (data.assetType !== type) {
      data.assetType = type;
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    data.searchQuery = query;
  };

  // 拖拽处理（预留接口，后续集成资产管理器）
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // TODO: 从资产管理器拖拽资产到此处
    console.log('资产拖拽功能待实现');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={`custom-node input-node ${selected ? 'selected' : ''}`}>
      {/* 节点标题 */}
      <div className="node-header">
        <span className="node-icon">📥</span>
        <span className="node-title">{data.label || 'Input'}</span>
      </div>

      {/* 节点内容 */}
      <div className="node-body">
        {/* 资源类型选择 */}
        <div className="asset-type-selector">
          {(Object.keys(assetTypeIcons) as AssetType[]).map((type) => (
            <button
              key={type}
              className={`asset-type-btn ${assetType === type ? 'active' : ''}`}
              onClick={() => handleAssetTypeChange(type)}
              title={assetTypeLabels[type]}
            >
              {assetTypeIcons[type]}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="搜索资产..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>

        {/* 资产拖拽区域 */}
        <div
          className="asset-drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {selectedAssets.length > 0 ? (
            <div className="selected-assets">
              {selectedAssets.map((asset) => (
                <div key={asset.id} className="asset-item">
                  {asset.name}
                </div>
              ))}
            </div>
          ) : (
            <div className="drop-placeholder">
              拖拽资产至此
            </div>
          )}
        </div>
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

export default memo(InputNode);
